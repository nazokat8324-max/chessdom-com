# Just Chess (Shaxmat sayti) — loyiha xaritasi

Onlayn shaxmat sayti: Node.js + Express + Socket.io backend, framework'siz vanilla JS SPA frontend.
Foydalanuvchi bilan **o'zbek tilida** gaplashiladi; koddagi foydalanuvchiga ko'rinadigan matnlar ham asosan o'zbekcha.

## Ishga tushirish / tekshirish
- `npm start` → `node server.js`, port `3000` (`PORT` env). Brauzer: http://localhost:3000
- `npm test` — faqat `node --check` (sintaksis tekshiruvi), haqiqiy testlar yo'q.
- Env: `DATABASE_URL` (PostgreSQL, ixtiyoriy), `JWT_SECRET` (default `justchess_secret_key_2024`), `PORT`. `.env` fayli kod tomonidan yuklanmaydi (dotenv yo'q).

## Baza: ikki rejim (README eskirgan)
- `DATABASE_URL` berilsa → **PostgreSQL** (`pg` Pool; production — Render + Neon). SSL sertifikat tekshiruvi bilan; `localhost` yoki `sslmode=disable` bo'lsa SSL'siz.
- Berilmasa → **SQLite** (`database.sqlite` loyiha papkasida) — lokal ishlash uchun.
- Render'da SQLite fayli har deployda o'chib ketadi — production'da albatta `DATABASE_URL` bo'lishi kerak.
- `schema.sql` / `schema-extended.sql` ishlatilmaydi; jadvallar `database.js` → `initDatabase()` ichida `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN` (try/catch) bilan yaratiladi.
- SQL ikkala bazada ishlashi kerak: `?` placeholder (Postgres uchun avtomatik `$n`), jadval tartibi FK bo'yicha, har INSERT'da `id` (uuidv4) va vaqt ISO string sifatida, camelCase aliaslar qo'shtirnoqda (`as "userId"`).
- README PostgreSQL+Redis+PeerJS deydi — Redis/PeerJS ishlatilmaydi.

## Fayllar
### Backend
- [server.js](server.js) — hamma narsa bitta `start()` ichida: REST routelar, Socket.io handlerlar, `setInterval(closeStaleArenas, 60s)`.
  - Xotiradagi holat: `rooms` (Map: roomId → `{players:[{socketId,color}], turn, colorMap}`), `matchmakingQueue` (massiv).
  - `authMiddleware` — `Authorization: Bearer <JWT>`, `req.user = {userId, username}`. Token 7 kun.
  - Rate limit: `apiLimiter` 100/15min, `authLimiter` 5/15min (register/login).
  - `validateMove` — faqat kvadrat formati tekshiriladi, shaxmat qoidalari serverda TEKSHIRILMAYDI (chess.js faqat klientda).
  - `make-move`: xona, 2 o'yinchi borligi, `player.color === room.turn` tekshiriladi, keyin `opponent-move` raqibga yuboriladi; aks holda `move-rejected {reason}`.
- [database.js](database.js) — ikki rejimli wrapperlar (`dbGet/dbAll/dbRun/dbExec`, parametrlar `(sql, a, b)` yoki `(sql, [a, b])`), JSON ustunlar TEXT sifatida saqlanadi (`parseJson`). Server bazaga faqat export qilingan funksiyalar orqali murojaat qiladi (`usePostgres` flag ham export qilinadi).
  - `users` jadvalida `stats`, `stats_by_mode`, `history` — JSON TEXT. O'yin tarixi `users.history` ichida (+ alohida `games` jadvali ham yoziladi).
  - `getDailyWinners` — oxirgi 24 soatdagi g'alabalar bo'yicha top 5 (`history[].timestamp`).
  - Elo: K=32, min reyting 100 (`updateUserRatingByResult`). Umumiy `rating` + rejim bo'yicha `ratings_by_mode` (JSON: rapid/blitz/bullet; hammasi 1500 dan boshlanadi; `migrateRatingsByMode()` har startda o'yini yo'q rejimni 1500 ga qaytaradi). Klient `timeControl` va `opponentModeRating` yuboradi; profil `refreshCurrentUserRatings()` (`/api/stats/:username`) orqali yangilanadi.
- [server-helpers.js](server-helpers.js) — `swissPairings`, `teamPairings`.

### Frontend (oddiy `<script>` teglar, modul yo'q, hamma narsa `window.*` global)
[index.html](index.html) yuklash tartibi: jQuery 3.5.1, howler, chess.js 0.10.3, chessboard.js 1.0.0, socket.io 4.7.2, Chart.js, confetti, i18next (CDN) →
`script.js, sound.js, board.js, social.js, languages.js, profil.js, online.js, views.js, rating.js`.
- [index.html](index.html) — barcha "view"lar bitta sahifada: `<div id="xxxView" class="view-section">`; faol view `active-view` klassi bilan. Modallar: login/signup/language/info/profile/leagueDetail.
  Viewlar: home, game, login, register, profile, leaderboard, history, tournaments, tournamentDetail, friends, clubs, leagues, champions, clubDetail, clubLeaderboard, clubTournaments, clubHistory, clubChat, settings, chat.
- [script.js](script.js) — global holat (`window.currentUser`, `window.authToken`, `window.stats`, `window.statsByMode` — localStorage `justChess*` kalitlari), `switchView(name)`, auth (handleLogin/handleRegister/modal variantlari), top players (`/api/daily-winners`), streak, info modal, liglar, til modal, settings, profil modal.
- [board.js](board.js) — o'yin yakuni faqat `window.finishGame(winnerColor|null, msg)` orqali (rangga qarab win/loss, `gameFinished` ikki marta yozishdan saqlaydi), `recordResult('win'|'loss'|'draw')`; `game` (chess.js), `board` (chessboard.js), taymerlar, `onDragStart/onDrop`, `recordResult`, `saveGameHistory` (`POST /api/games`), PGN eksport, `showToast`, o'yin holatini saqlash/tiklash, `window.myColor`/`applyMyColor` (onlaynda faqat o'z donalari va o'z navbatida yuriladi), `opponentFound` (raqib topilmaguncha yurish mumkin emas), `updateGameStatusText`.
- O'yin sahifasining o'ng paneli: `window.setGamePanelMode('pre'|'in'|'over')` — `pre`: vaqt tanlash + "O'yinni boshlash" (`#preGameControls`); `in`: yurishlar tarixi + Durrang/Taslim/PGN (`#inGameControls`); `over`: tarix + PGN + "Yangi o'yin" (`resetToPreGame()`). `setOpponentFound` va `finishGame`/`abortGame` uni avtomatik almashtiradi.
- Davlat/bayroq: Sozlamalardagi davlat (`justChessSettings.country`) `syncMyCountry()` orqali `users.country` ga yoziladi (`POST /api/users/me/country`); matchmaking ham `country` yuboradi va raqibga `match-found.opponent.country` bo'lib boradi. `updateGameFlags` bayroqlarni `myColor` bo'yicha qo'yadi.
- Auth: barcha login/register yo'llari `window.applyAuthSession(user, token)` dan o'tadi ([script.js](script.js)); faqat-brauzer (`local_`) akkauntlar olib tashlangan.
- [online.js](online.js) — `socket` (global), `window.currentRoomId` (yagona manba), `isOnlineMode`, `lastSentMove`; matchmaking (`startMatchmaking` → `POST /api/matchmaking/join {socketId}` → server ikkala socketni xonaga qo'shib `match-found` yuboradi), `sendMove`, `move-rejected` da `game.undo()`, durrang taklifi (`confirm`).
- [rating.js](rating.js) — klientdagi Elo hisobi + `POST /api/ratings/update`, `updateRatingDisplay`.
- [views.js](views.js) — leaderboard (o'yinchilar / klublar), `/api/leaderboard`, `/api/clubs/leaderboard`.
- [profil.js](profil.js) — profil sahifasi, Chart.js grafik.
- [social.js](social.js) (~2400 qator, eng kattasi) — turnirlar/arenalar, do'stlar, chat, **mamlakat-asosidagi klublar** (klub = davlat; a'zolik asosan localStorage'da), davlatlar ro'yxati va kirill→lotin, bayroqlar, klub chat/turnir/tarix/leaderboard.
- [languages.js](languages.js) — `translations` obyekti: `uz, en, ru, es, de, fr`; i18next bilan; `setLanguage/changeLanguage`. Keyingi qo'shilgan kalitlar `translationsExtra` blokida (i18next.init dan oldin, `translations` ga merge qilinadi). Yangi matn qo'shilsa — 6 tilning hammasiga kalit qo'shish kerak.
  - Tarjima usullari: HTML'da `data-i18n="kalit"` (textContent) va `data-i18n-placeholder="kalit"` — `updateUI()` avtomatik qo'llaydi (element ichida faqat matn bo'lsin); JS'da `tx('kalit', "o'zbekcha fallback", { name })` ([script.js](script.js) boshida; qiymatlar escape qilinmaydi — innerHTML'ga `escapeHtml` bilan); eski kod `updateUI()` da id bo'yicha `t('kalit')`.
  - `updateUI()` til almashganda ochiq Do'stlar/Chat/Tarix/Klub chati/Turnir tafsiloti sahifalarini qayta chizadi.
  - Server xato matnlari (`data.message`) faqat o'zbekcha — klientda `alert(data.message || tx(...))`.
- [sound.js](sound.js) — Howler, lichess ovozlari.
- [style.css](style.css) — ~3400 qator, bitta fayl.

## REST API (server.js)
auth: `POST /api/auth/register|login|logout` · `GET /api/leaderboard` · `GET /api/daily-winners` · `GET /api/stats/:username` ·
`GET /api/users/:username/games` (faqat o'zi) · `POST /api/games` · `POST /api/ratings/update` · `POST /api/matchmaking/join|leave` ·
turnirlar: `POST/GET /api/tournaments`, `GET /api/tournaments/:id`, `/:id/join`, `/:id/start`, `/:id/standings`, `/:id/matches` (GET/POST), `/:id/participants`, `/:id/pairings` (swiss; team → 501), `/:id/matches/:matchId/result` ·
do'stlar: `POST /api/friends/request|accept`, `GET /api/friends`, `/api/friends/requests` · chat: `GET/POST /api/chat/messages` ·
klublar: `POST/GET /api/clubs`, `GET /api/clubs/leaderboard`, `/api/clubs/:id`, `/:id/join`, `/:id/members`.
Javob formati doim `{ success: bool, message?, ... }`; xato matnlari o'zbekcha.

## Socket.io eventlar
Klient→server: `create-room`, `join-room`, `join-random-room`, `make-move`, `offer-draw`, `accept-draw`, `decline-draw`, `game-over`, `leave-room`, `join-tournament-room`, `join-chat-room`, `join-club-room`, `send-chat-message`.
Klient→server (auth): `authenticate` (JWT) → `user_<id>` xonasiga qo'shiladi; `online.js` connect va login paytida yuboradi.
Server→klient: `match-found {roomId,color,opponent}` (matchmaking; navbatda kutgan = oq), `room-created`, `room-joined {roomId,color}`, `waiting-for-opponent`, `opponent-connected {roomId,color}`, `opponent-move`, `move-rejected {reason}`, `draw-offered/accepted/declined`, `opponent-disconnected`, `game-ended`, `chat-message`, `tournament-*`, `friend-request-received`.

## Ma'lum muammolar / e'tibor beriladigan joylar
Tuzatilgan (2026-10-12): matchmaking ranglari va kutayotgan o'yinchini xabardor qilish (`match-found`), `/api/tournaments/arenas` tiklandi,
`teamPairings` TypeError, `user_<id>` socket xonasi (`authenticate` eventi), reyting faqat serverda, ikki marta durrang listeneri,
modal login/signup soxta `local_` akkaunt o'rniga serverdan foydalanadi, natija o'yinchining o'z rangi bo'yicha hisoblanadi.

Hali qolganlar:
- Shaxmat qoidalari serverda tekshirilmaydi (faqat kvadrat formati va navbat).
- Taymer har klientda alohida va faqat o'zi birinchi yurganda boshlanadi; serverda soat yo'q.
- Shaxsiy chat `roomId = user_<partnerId>` sifatida saqlanadi — ikki tomonning xabarlari turli "xona"larda.
- Statistika ham localStorage, ham serverda saqlanadi; login paytida server qiymati ustun.
- `send-chat-message` socket eventi `senderId: socket.id` yuboradi (autentifikatsiyasiz).
- Team turnirlari 501 qaytaradi (amalga oshirilmagan).
- `JWT_SECRET` Render'da o'rnatilmagan bo'lsa, koddagi default kalit ishlatiladi — xavfsizlik uchun Render env'da o'rnatish kerak.
## Ish uslubi
- Kod uslubiga moslash: global `window.*` funksiyalar, `typeof x === 'function'` tekshiruvlari, o'zbekcha toast/alert matnlari, i18n uchun `i18next.t(key, {defaultValue})`.
- Commit xabarlari inglizcha, qisqa, buyruq shaklida (masalan "Assign colors server-side and validate turn on make-move").
- Katta o'zgarishdan keyin shu faylni yangilab qo'yish.
