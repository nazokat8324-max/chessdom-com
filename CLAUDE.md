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
  - Xotiradagi holat: `rooms` (Map: roomId → `{players:[{socketId,color,userId,username}], chess (chess.js), clock {w,b (ms), increment}, mode, rated, status 'active'|'over', turnStartedAt, timer, drawOfferBy}`), `matchmakingQueue` (massiv; faqat bir xil `clock` va `rated` juftlanadi).
  - `authMiddleware` — `Authorization: Bearer <JWT>`, `req.user = {userId, username}`. Token 7 kun.
  - Rate limit: `apiLimiter` 100/15min, `authLimiter` 5/15min (register/login).
  - **O'yin to'liq serverda**: `make-move` — format (`validateMove`), navbat (`chess.turn()`), soat, so'ng `room.chess.move()` (noqonuniy yurish → `move-rejected {reason:'invalid_move'}`). Mat/pat/takrorlanish/50 yurish/dona yetishmasligi serverda aniqlanadi.
  - `endGame(roomId, room, winner|null, reason)` — natija, statistika (`updateUserStats`), `games` jadvali va reyting (`updateUserRatingByResult`, faqat `rated`) FAQAT shu yerda yoziladi; keyin har o'yinchiga `game-ended {winner, reason, result, rated, mode, stats, statsByMode, newRating, ratingsByMode, modeChange}`. Sabablar: checkmate, stalemate, threefold, fifty, insufficient, resign, agreement, timeout, abandon, aborted (birinchi yurish 30 s ichida qilinmasa; natija yozilmaydi).
  - Soat: ikkala tomon birinchi yurishini qilgandan keyin yuradi; `scheduleRoomTimer` vaqt tugashini serverda aniqlaydi; har yurishdan keyin `clock-update {w,b,turn,running}`. Ruxsat etilgan vaqtlar `ALLOWED_CLOCKS`; rejim `clockMode` (boshlang'ich + 40×qo'shimcha: <180 bullet, <480 blitz, aks holda rapid) — klientdagi `getGameModeFromTime` bilan bir xil.
  - O'yin davomida chiqib ketish/uzilish (`leave-room`, `disconnect`) → `abandon` (ikkala tomon yurgan bo'lsa) yoki `aborted`. Tugagan xona 5 daqiqadan keyin o'chiriladi.
  - Chat: `resolveChatRoom` — `user_<sherik>` → `dm_<id1>_<id2>` (tartiblangan), `dm_` xonasini faqat ikki ishtirokchi o'qiydi; eski xabarlar `migrateDirectChatRooms()` bilan ko'chiriladi. `isPublicSocketRoom` — socket orqali `user_`/`dm_`/o'yin xonalariga qo'shilib bo'lmaydi.
  - Turnir: `/matches` POST — faqat yaratuvchi; `/pairings` — yaratuvchi (yaratuvchisiz arenada ishtirokchilar, `canManageTournament`); natija — yaratuvchi yoki o'yinning o'yinchilari.
  - Username: faqat harf/raqam/`_ . -` (Unicode harflar ham), 3–30.
- [database.js](database.js) — ikki rejimli wrapperlar (`dbGet/dbAll/dbRun/dbExec`, parametrlar `(sql, a, b)` yoki `(sql, [a, b])`), JSON ustunlar TEXT sifatida saqlanadi (`parseJson`). Server bazaga faqat export qilingan funksiyalar orqali murojaat qiladi (`usePostgres` flag ham export qilinadi).
  - `users` jadvalida `stats`, `stats_by_mode`, `history` — JSON TEXT; davlat klubi a'zoligi `club_country`, `club_code`, `club_joined_at` (bitta ustun = faqat bitta klub). O'yin tarixi `users.history` ichida (+ alohida `games` jadvali ham yoziladi).
  - `getDailyWinners` — oxirgi 24 soatdagi g'alabalar bo'yicha top 5 (`history[].timestamp`).
  - Elo: K=32, min reyting 100 (`updateUserRatingByResult`). Umumiy `rating` + rejim bo'yicha `ratings_by_mode` (JSON: rapid/blitz/bullet; hammasi 1500 dan boshlanadi; `migrateRatingsByMode()` har startda o'yini yo'q rejimni 1500 ga qaytaradi). Klient `timeControl` va `opponentModeRating` yuboradi; profil `refreshCurrentUserRatings()` (`/api/stats/:username`) orqali yangilanadi.
- [server-helpers.js](server-helpers.js) — `swissPairings`, `teamPairings`.

### Frontend (oddiy `<script>` teglar, modul yo'q, hamma narsa `window.*` global)
[index.html](index.html) yuklash tartibi: jQuery 3.5.1, howler, chess.js 0.10.3, chessboard.js 1.0.0, socket.io 4.7.2, Chart.js, confetti, i18next (CDN) →
`script.js, sound.js, board.js, social.js, languages.js, profil.js, online.js, views.js, rating.js`.
- [index.html](index.html) — barcha "view"lar bitta sahifada: `<div id="xxxView" class="view-section">`; faol view `active-view` klassi bilan. Modallar: login/signup/language/info/profile/leagueDetail.
  Viewlar: home, game, login, register, profile, leaderboard, history, tournaments, tournamentDetail, friends, clubs, leagues, champions, clubDetail, clubLeaderboard, clubTournaments, clubHistory, clubChat, settings, chat.
- [script.js](script.js) — global holat (`window.currentUser`, `window.authToken`, `window.stats`, `window.statsByMode` — localStorage `justChess*` kalitlari), `switchView(name)`, auth (handleLogin/handleRegister/modal variantlari), top players (`/api/daily-winners`), streak, info modal, liglar, til modal, settings, profil modal.
- [board.js](board.js) — o'yin yakuni UI'si `window.finishGame(winnerColor|null, msg)` orqali (rangga qarab win/loss, `gameFinished` ikki marta ishlashdan saqlaydi; faqat localStorage'ga yozadi — serverga natija yuborilmaydi), `window.applyServerGameResult(data)` (server `game-ended` dagi reyting/statistikani qo'llaydi + reyting toast), `window.applyClockUpdate` (taymer faqat server `clock-update` bilan yuradi; onlaynda vaqt tugashini klient e'lon qilmaydi), `setGameTime(sec, btn, increment)` / `getSelectedClock()`; `game` (chess.js), `board` (chessboard.js) — `let`, `window`da yo'q; `onDragStart/onDrop`, PGN eksport, `showToast` (xabar `textContent` bilan), onlaynda `undoMove` o'chirilgan, sahifa yangilanganda o'yin tiklanmaydi, `window.myColor`/`applyMyColor` (onlaynda faqat o'z donalari va o'z navbatida yuriladi), `opponentFound` (raqib topilmaguncha yurish mumkin emas), `updateGameStatusText`.
- O'yin sahifasining o'ng paneli: `window.setGamePanelMode('pre'|'in'|'over')` — `pre`: vaqt tanlash + "O'yinni boshlash" (`#preGameControls`); `in`: yurishlar tarixi + Durrang/Taslim/PGN (`#inGameControls`); `over`: tarix + PGN + "Yangi o'yin" (`resetToPreGame()`). `setOpponentFound` va `finishGame`/`abortGame` uni avtomatik almashtiradi.
- Davlat/bayroq: Sozlamalardagi davlat (`justChessSettings.country`) `syncMyCountry()` orqali `users.country` ga yoziladi (`POST /api/users/me/country`); matchmaking ham `country` yuboradi va raqibga `match-found.opponent.country` bo'lib boradi. `updateGameFlags` bayroqlarni `myColor` bo'yicha qo'yadi.
- **Kirish sahifasi** (`#authGate`, index.html; uslub style.css oxirida): tizimga kirilmagan foydalanuvchiga butun ekranli ro'yxatdan o'tish/kirish sahifasi chiqadi (standart — ro'yxatdan o'tish), sayt orqada ko'rinmaydi (`body.auth-locked`), yopib bo'lmaydi. `showAuthGate('signup'|'login')`, `hideAuthGate()`; eski `openLoginModal/openSignupModal/closeLoginModal` va `switchView('login'|'register')` shu sahifani ochadi. Formalar ID'lari (`signupUsername`, `loginModalUsername`...) eski handlerlar (`handleSignupModal`, `handleLoginModal`) bilan ishlaydi. Dizayn: ikki qism — chap `.auth-hero` (sarlavha, statik shaxmat taxtasi Italyan o'yini pozitsiyasi bilan, imkoniyatlar), o'rtada `.auth-atlas-ribbon` (`img/atlas.svg` lentasi), o'ng `.auth-panel` (forma, til tugmasi). 900px dan kichikda faqat forma (tepada ingichka atlas chizig'i).
- Auth: barcha login/register yo'llari `window.applyAuthSession(user, token)` dan o'tadi ([script.js](script.js)); faqat-brauzer (`local_`) akkauntlar olib tashlangan.
- [online.js](online.js) — `socket` (global), `window.currentRoomId` (yagona manba), `isOnlineMode`, `lastSentMove`; matchmaking (`startMatchmaking` → `POST /api/matchmaking/join {socketId, country, initialTime, increment, rated}` → server ikkala socketni xonaga qo'shib `match-found {roomId,color,opponent,clock,rated,mode}` yuboradi), `sendMove`, `move-rejected` da `game.undo()`, durrang taklifi (`confirm` → `accept-draw`), `game-ended` → `gameEndMessage(data)` + `finishGame` + `applyServerGameResult`.
- [rating.js](rating.js) — `refreshCurrentUserRatings()` (`/api/stats/:username`), `updateRatingDisplay`. Klientda reyting hisoblanmaydi.
- [views.js](views.js) — leaderboard (o'yinchilar / klublar), `/api/leaderboard`, `/api/clubs/leaderboard`.
- [profil.js](profil.js) — profil sahifasi, Chart.js grafik.
- [social.js](social.js) (~2400 qator, eng kattasi) — turnirlar/arenalar, do'stlar, chat, **mamlakat-asosidagi klublar** (klub = davlat; a'zolik serverda, `window.currentUser.club = {name, code, joinedAt}`; `getUserClubs()`, `fetchClubData()`, `syncClubDirectory()` — eski localStorage a'zoligi bir marta serverga ko'chiriladi; boshqa klubga o'tishda `confirm` + `switch: true`), davlatlar ro'yxati va kirill→lotin, bayroqlar, klub chat/turnir/tarix/leaderboard.
- [languages.js](languages.js) — `translations` obyekti: `uz, en, ru, es, de, fr`; i18next bilan; `setLanguage/changeLanguage`. Keyingi qo'shilgan kalitlar `translationsExtra` blokida (i18next.init dan oldin, `translations` ga merge qilinadi). Yangi matn qo'shilsa — 6 tilning hammasiga kalit qo'shish kerak.
  - Tarjima usullari: HTML'da `data-i18n="kalit"` (textContent) va `data-i18n-placeholder="kalit"` — `updateUI()` avtomatik qo'llaydi (element ichida faqat matn bo'lsin); JS'da `tx('kalit', "o'zbekcha fallback", { name })` ([script.js](script.js) boshida; qiymatlar escape qilinmaydi — innerHTML'ga `escapeHtml` bilan); eski kod `updateUI()` da id bo'yicha `t('kalit')`.
  - `updateUI()` til almashganda ochiq Do'stlar/Chat/Tarix/Klub chati/Turnir tafsiloti sahifalarini qayta chizadi.
  - Server xato matnlari (`data.message`) faqat o'zbekcha — klientda `alert(data.message || tx(...))`.
- **Zamonaviy mavzu** — [style.css](style.css) oxirida `/* ===== Zamonaviy mavzu` bloki (kirish sahifasi uslubidan oldin): `--cd-*` CSS o'zgaruvchilari, Inter shrifti (index.html'da Google Fonts), kartalar/tugmalar/tablar/maydonlar/jadvallar uchun umumiy ko'rinish. Faqat rang, shrift, burchak, soya o'zgartiriladi — joylashuv (o'lcham, grid, margin) eski qoidalarda. JS ichidagi inline stillar bu qatlamga bo'ysunmaydi.
- [sound.js](sound.js) — Howler, lichess ovozlari.
- [style.css](style.css) — ~3400 qator, bitta fayl.

## REST API (server.js)
auth: `POST /api/auth/register|login|logout` · `GET /api/leaderboard` · `GET /api/daily-winners` · `GET /api/stats/:username` ·
`GET /api/users/:username/games` (faqat o'zi) · `POST /api/matchmaking/join|leave` · `POST /api/users/me/country` (`POST /api/games` va `/api/ratings/update` olib tashlangan — natija faqat serverda) ·
turnirlar: `POST/GET /api/tournaments`, `GET /api/tournaments/:id`, `/:id/join`, `/:id/start`, `/:id/standings`, `/:id/matches` (GET/POST), `/:id/participants`, `/:id/pairings` (swiss; team → 501), `/:id/matches/:matchId/result` ·
do'stlar: `POST /api/friends/request|accept`, `GET /api/friends`, `/api/friends/requests` · chat: `GET/POST /api/chat/messages` ·
davlat klublari: `GET /api/country-clubs` (a'zolar soni), `GET /api/country-clubs/:name/members` (a'zolar + stats {members, events, points}), `POST /api/country-clubs/join {country, code, switch?}` (boshqa klubda bo'lsa 409 `reason:'already_in_club'`), `POST /api/country-clubs/leave`; `GET /api/clubs/leaderboard` — davlat klublari bo'yicha · eski klublar: `POST/GET /api/clubs`, `GET /api/clubs/leaderboard`, `/api/clubs/:id`, `/:id/join`, `/:id/members`.
Javob formati doim `{ success: bool, message?, ... }`; xato matnlari o'zbekcha.

## Socket.io eventlar
Klient→server: `make-move`, `offer-draw`, `accept-draw` (faqat raqib taklif qilgan bo'lsa), `decline-draw`, `game-over {result:{type:'resign'}}`, `leave-room`, `join-tournament-room`, `join-chat-room`, `join-club-room`, `send-chat-message` (faqat autentifikatsiyadan keyin). Eski `create-room/join-room/join-random-room` olib tashlangan.
Klient→server (auth): `authenticate` (JWT) → `user_<id>` xonasiga qo'shiladi; `online.js` connect va login paytida yuboradi.
Server→klient: `match-found {roomId,color,opponent,clock,rated,mode}` (navbatda kutgan = oq), `opponent-move`, `clock-update`, `move-rejected {reason: not_in_room|not_your_turn|invalid_move|game_over}`, `draw-offered/declined`, `game-ended` (yuqoriga qarang), `opponent-disconnected` (faqat tugagan o'yinda), `chat-message`, `tournament-*`, `friend-request-received`.

## Ma'lum muammolar / e'tibor beriladigan joylar
Tuzatilgan (2026-10-12): matchmaking ranglari va kutayotgan o'yinchini xabardor qilish (`match-found`), `/api/tournaments/arenas` tiklandi,
`teamPairings` TypeError, `user_<id>` socket xonasi (`authenticate` eventi), reyting faqat serverda, ikki marta durrang listeneri,
modal login/signup soxta `local_` akkaunt o'rniga serverdan foydalanadi, natija o'yinchining o'z rangi bo'yicha hisoblanadi.

Tuzatilgan (2026-10-13): o'yin to'liq serverda (qoidalar, soat, natija, reyting — klient natija/reyting yubora olmaydi), increment tugmalari (1+1, 2+1, 3+2, 15+10) va "Reytingli/Reytingsiz" tanlovi ishlaydi, matchmaking vaqt nazorati bo'yicha, XSS (username cheklovi + escape), shaxsiy chat (`dm_` xonalar, begona o'qiy olmaydi; `startChatWith` select variantini qo'shadi), turnir endpointlariga ruxsat, server xabarlari klientda `tServer()` bilan tarjima qilinadi (`srv*` kalitlar), o'yin paytida boshqa sahifadan qaytilganda doska tozalanmaydi.

Hali qolganlar:
- Statistika localStorage'da ham saqlanadi, lekin server qiymati ustun (`game-ended`, login, `/api/stats`).
- Internet bir lahza uzilsa ham (socket qayta ulanadi) o'yin `abandon` bilan yutqazilgan hisoblanadi — qayta ulanish (reconnect) yo'q.
- `inviteFriendToClub` hech qayerda ishlatilmaydi. Eski `clubs`/`club_members` jadvallari (foydalanuvchi yaratgan klublar) UI'da ishlatilmaydi.
- Team turnirlari 501 qaytaradi (amalga oshirilmagan).
- `JWT_SECRET` Render'da o'rnatilmagan bo'lsa, koddagi default kalit ishlatiladi (server startda ogohlantiradi) — Render env'da o'rnatish kerak.
## Ish uslubi
- Kod uslubiga moslash: global `window.*` funksiyalar, `typeof x === 'function'` tekshiruvlari, o'zbekcha toast/alert matnlari, i18n uchun `i18next.t(key, {defaultValue})`.
- Commit xabarlari inglizcha, qisqa, buyruq shaklida (masalan "Assign colors server-side and validate turn on make-move").
- Katta o'zgarishdan keyin shu faylni yangilab qo'yish.
