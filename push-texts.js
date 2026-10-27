// Push-bildirishnomalar matni (server tomonida, foydalanuvchi tilida). Saytdagi bildirishnomalar markazi matnni
// klientda yasaydi (notifications.js, nf* kalitlar); push esa sayt yopiq paytda keladi, shuning uchun matn shu yerda.
// pushMessage(type, data, lang, ownName) → { title, body, url, category } — tur ro'yxatda bo'lmasa umumiy matn.
// Telegram bot ham shu matnlardan foydalanadi; botning o'z javoblari — botText(key, lang, vars).
const Caravan = require('./caravan');
const Holidays = require('./holidays');
const L = (uz, en, ru, es, de, fr) => ({ uz, en, ru, es, de, fr });
const T = {
  challenge: L("{{from}} sizni o'yinga chaqirdi ({{clock}})", '{{from}} challenged you to a game ({{clock}})', '{{from}} вызывает вас на партию ({{clock}})', '{{from}} te desafía a una partida ({{clock}})', '{{from}} fordert dich zu einer Partie heraus ({{clock}})', '{{from}} vous défie ({{clock}})'),
  message: L('{{from}}: {{preview}}', '{{from}}: {{preview}}', '{{from}}: {{preview}}', '{{from}}: {{preview}}', '{{from}}: {{preview}}', '{{from}} : {{preview}}'),
  messages: L('{{from}} dan {{count}} ta yangi xabar', '{{count}} new messages from {{from}}', 'Новых сообщений от {{from}}: {{count}}', '{{count}} mensajes nuevos de {{from}}', '{{count}} neue Nachrichten von {{from}}', '{{count}} nouveaux messages de {{from}}'),
  friend_request: L("{{from}} sizga do'stlik so'rovi yubordi", '{{from}} sent you a friend request', '{{from}} хочет добавить вас в друзья', '{{from}} te envió una solicitud de amistad', '{{from}} hat dir eine Freundschaftsanfrage geschickt', "{{from}} vous a envoyé une demande d'ami"),
  friend_accepted: L("{{from}} endi sizning do'stingiz", '{{from}} is now your friend', '{{from}} теперь ваш друг', '{{from}} ahora es tu amigo', '{{from}} ist jetzt dein Freund', '{{from}} est maintenant votre ami'),
  rival_online: L("Raqib-do'stingiz {{name}} onlayn — jang qilasizmi? ⚔️", 'Your rival {{name}} is online — up for a battle? ⚔️', 'Ваш соперник {{name}} в сети — сразимся? ⚔️', 'Tu rival {{name}} está en línea, ¿una batalla? ⚔️', 'Dein Rivale {{name}} ist online — Lust auf ein Duell? ⚔️', 'Votre rival {{name}} est en ligne — une bataille ? ⚔️'),
  follow_playing: L("{{name}} o'yin boshladi — tomosha qiling", '{{name}} started a game — watch it', '{{name}} начал партию — смотрите', '{{name}} empezó una partida: mírala', '{{name}} hat eine Partie begonnen — schau zu', '{{name}} a commencé une partie — regardez'),
  league_ready: L("Liga o'yini: {{opponent}} sizni kutmoqda", 'League game: {{opponent}} is waiting for you', 'Матч лиги: {{opponent}} ждёт вас', 'Partida de liga: {{opponent}} te espera', 'Ligapartie: {{opponent}} wartet auf dich', 'Match de ligue : {{opponent}} vous attend'),
  tournament_soon: L('«{{name}}» turniri 1 daqiqadan keyin boshlanadi', 'The “{{name}}” tournament starts in 1 minute', 'Турнир «{{name}}» начнётся через минуту', 'El torneo «{{name}}» empieza en 1 minuto', 'Das Turnier „{{name}}“ beginnt in 1 Minute', 'Le tournoi « {{name}} » commence dans 1 minute'),
  prediction_won: L("Bashoratingiz to'g'ri chiqdi! +{{points}} 🔮", 'Your prediction was right! +{{points}} 🔮', 'Прогноз сбылся! +{{points}} 🔮', '¡Acertaste! +{{points}} 🔮', 'Richtig getippt! +{{points}} 🔮', 'Bon pronostic ! +{{points}} 🔮'),
  achievement: L('Yangi yutuq! 🏅', 'New achievement! 🏅', 'Новое достижение! 🏅', '¡Nuevo logro! 🏅', 'Neuer Erfolg! 🏅', 'Nouveau succès ! 🏅'),
  quests_done: L("🎯 Haftalik vazifalar bajarildi! Nishonlar: {{total}}", '🎯 Weekly quests complete! Badges: {{total}}', '🎯 Недельные задания выполнены! Значков: {{total}}', '🎯 ¡Misiones semanales completadas! Insignias: {{total}}', '🎯 Wochenaufgaben erledigt! Abzeichen: {{total}}', '🎯 Quêtes de la semaine terminées ! Badges : {{total}}'),
  game_of_day: L("🌟 {{opponent}} bilan o'yiningiz Kun o'yini bo'ldi!", '🌟 Your game against {{opponent}} is the Game of the Day!', '🌟 Ваша партия с {{opponent}} — партия дня!', '🌟 ¡Tu partida contra {{opponent}} es la partida del día!', '🌟 Deine Partie gegen {{opponent}} ist die Partie des Tages!', '🌟 Votre partie contre {{opponent}} est la partie du jour !'),
  holiday_badge: L("{{icon}} Bayram nishoni: {{name}} {{year}}!", '{{icon}} Holiday badge: {{name}} {{year}}!', '{{icon}} Праздничный значок: {{name}} {{year}}!', '{{icon}} Insignia festiva: {{name}} {{year}}!', '{{icon}} Feiertagsabzeichen: {{name}} {{year}}!', '{{icon}} Badge de fête : {{name}} {{year}} !'),
  duel_end: L("⚔️ {{opponent}} bilan bahs tugadi: {{me}} – {{opp}}", '⚔️ Your match with {{opponent}} is over: {{me}} – {{opp}}', '⚔️ Матч с {{opponent}} завершён: {{me}} – {{opp}}', '⚔️ Tu duelo con {{opponent}} terminó: {{me}} – {{opp}}', '⚔️ Dein Match gegen {{opponent}} ist vorbei: {{me}} – {{opp}}', '⚔️ Votre duel contre {{opponent}} est terminé : {{me}} – {{opp}}'),
  caravan_city: L("🐪 Karvoningiz {{city}}ga yetib keldi!", '🐪 Your caravan has reached {{city}}!', '🐪 Ваш караван прибыл в {{city}}!', '🐪 ¡Tu caravana ha llegado a {{city}}!', '🐪 Deine Karawane hat {{city}} erreicht!', '🐪 Votre caravane est arrivée à {{city}} !'),
  rank_up: L('Yangi daraja! Reytingingiz {{rating}} ⭐', 'New rank! Your rating is {{rating}} ⭐', 'Новый уровень! Рейтинг {{rating}} ⭐', '¡Nuevo rango! Tu rating es {{rating}} ⭐', 'Neuer Rang! Deine Wertung: {{rating}} ⭐', 'Nouveau rang ! Classement {{rating}} ⭐'),
  invite_joined: L("{{from}} taklifingiz bilan ChessCaravan'ga qo'shildi 🎉", '{{from}} joined ChessCaravan with your invite 🎉', '{{from}} присоединился к ChessCaravan по вашему приглашению 🎉', '{{from}} se unió a ChessCaravan con tu invitación 🎉', '{{from}} ist ChessCaravan über deine Einladung beigetreten 🎉', '{{from}} a rejoint ChessCaravan grâce à votre invitation 🎉'),
  invite_waiting: L("{{from}} siz bilan o'ynamoqchi — saytga kiring va uni chaqiring ⚔️", '{{from}} wants to play you — come online and challenge them ⚔️', '{{from}} хочет сыграть с вами — зайдите и вызовите его ⚔️', '{{from}} quiere jugar contigo: entra y desafíale ⚔️', '{{from}} will gegen dich spielen — komm online und fordere heraus ⚔️', '{{from}} veut jouer contre vous — connectez-vous et défiez-le ⚔️'),
  server_error: L('🐞 Saytda yangi xato: {{message}}', '🐞 New site error: {{message}}', '🐞 Новая ошибка на сайте: {{message}}', '🐞 Nuevo error en el sitio: {{message}}', '🐞 Neuer Fehler auf der Seite: {{message}}', '🐞 Nouvelle erreur sur le site : {{message}}'),
  test: L("Push-bildirishnomalar ishlayapti! ♞", 'Push notifications are working! ♞', 'Push-уведомления работают! ♞', '¡Las notificaciones push funcionan! ♞', 'Push-Benachrichtigungen funktionieren! ♞', 'Les notifications push fonctionnent ! ♞'),
  generic: L('Sizga yangi bildirishnoma bor', 'You have a new notification', 'У вас новое уведомление', 'Tienes una notificación nueva', 'Du hast eine neue Benachrichtigung', 'Vous avez une nouvelle notification')
};
const STICKER = L('🎨 Stiker', '🎨 Sticker', '🎨 Стикер', '🎨 Sticker', '🎨 Sticker', '🎨 Sticker');
// Turkum — Sozlamalarda alohida yoqiladi/o'chiriladi
const CATEGORY = {
  challenge: 'challenge', message: 'message',
  invite_waiting: 'challenge',
  friend_request: 'social', friend_accepted: 'social', invite_joined: 'social', rival_online: 'social', follow_playing: 'social'
};
// Türkçe — alohida blok (L() 6 tilli bo'lib qoladi)
const TR_T = {
  challenge: '{{from}} sana meydan okudu ({{clock}})',
  message: '{{from}}: {{preview}}',
  messages: '{{from}} kişisinden {{count}} yeni mesaj',
  friend_request: '{{from}} sana arkadaşlık isteği gönderdi',
  friend_accepted: '{{from}} artık arkadaşın',
  rival_online: 'Rakibin {{name}} çevrim içi — bir maça var mısın? ⚔️',
  follow_playing: '{{name}} bir oyun başlattı — izle',
  league_ready: 'Lig oyunu: {{opponent}} seni bekliyor',
  tournament_soon: '«{{name}}» turnuvası 1 dakika sonra başlıyor',
  prediction_won: 'Tahminin doğru çıktı! +{{points}} 🔮',
  achievement: 'Yeni başarı! 🏅',
  quests_done: '🎯 Haftalık görevler tamamlandı! Rozetler: {{total}}',
  game_of_day: '🌟 {{opponent}} ile oyunun Günün Oyunu seçildi!',
  holiday_badge: '{{icon}} Bayram rozeti: {{name}} {{year}}!',
  duel_end: '⚔️ {{opponent}} ile maçın bitti: {{me}} – {{opp}}',
  caravan_city: '🐪 Kervanın {{city}} şehrine ulaştı!',
  rank_up: 'Yeni rütbe! Puanın {{rating}} ⭐',
  invite_joined: '{{from}} davetinle ChessCaravan\'a katıldı 🎉',
  invite_waiting: '{{from}} seninle oynamak istiyor — siteye gir ve ona meydan oku ⚔️',
  server_error: '🐞 Sitede yeni hata: {{message}}',
  test: 'Anlık bildirimler çalışıyor! ♞',
  generic: 'Yeni bir bildirimin var'
};
Object.keys(TR_T).forEach((k) => { T[k].tr = TR_T[k]; });
STICKER.tr = '🎨 Çıkartma';
const LANGS = ['uz', 'en', 'ru', 'es', 'de', 'fr', 'tr'];

function fill(s, vars) { return String(s).replace(/\{\{(\w+)\}\}/g, (m, k) => (vars[k] == null ? '' : String(vars[k]))); }

// Ўзбекча (кирилл): o'zbekcha matn tayyorlanib, kirillga o'giriladi
const UzCyrl = require('./uzcyrl');
function pushMessage(type, data, lang, ownName) {
  if (lang === 'uzc') { const m = pushMessage(type, data, 'uz', ownName); return { ...m, title: UzCyrl.toCyrl(m.title), body: UzCyrl.toCyrl(m.body) }; }
  const l = LANGS.includes(lang) ? lang : 'en';
  const d = data || {};
  const prof = (n) => '/?profile=' + encodeURIComponent(n || '');
  let key = T[type] ? type : 'generic', vars = d, url = '/';
  switch (type) {
    case 'challenge': url = '/oyin'; break;
    case 'message':
      if ((d.count || 1) > 1) key = 'messages';
      vars = { ...d, preview: d.preview === '🎨' ? STICKER[l] : d.preview };
      url = '/xabarlar';
      break;
    case 'friend_request': case 'friend_accepted': case 'invite_joined': case 'invite_waiting': url = prof(d.from); break;
    case 'rival_online': case 'follow_playing': url = type === 'follow_playing' ? '/jonli' : prof(d.name); break;
    case 'league_ready': url = '/ligalar'; break;
    case 'tournament_soon': url = '/turnirlar'; break;
    case 'achievement': case 'rank_up': url = prof(ownName); break;
    case 'prediction_won': url = '/jonli'; break;
    case 'game_of_day': url = '/jonli'; break;
    case 'quests_done': url = '/karvon'; break;
    case 'duel_end': url = prof(ownName); break;
    case 'holiday_badge': url = prof(ownName); vars = { ...d, name: Holidays.name(d.holiday, l), icon: Holidays.icon(d.holiday) }; break;
    case 'caravan_city': url = '/karvon'; vars = { ...d, city: Caravan.cityName(d.city, l) }; break;
    case 'server_error': url = '/admin'; break;
  }
  return { title: 'ChessCaravan', body: fill(T[key][l], vars).slice(0, 180), url, category: CATEGORY[type] || 'events' };
}

// --- ✈️ Telegram bot javoblari ---
const BOT = {
  open: L('♞ Saytni ochish', '♞ Open ChessCaravan', '♞ Открыть сайт', '♞ Abrir ChessCaravan', '♞ ChessCaravan öffnen', '♞ Ouvrir ChessCaravan'),
  openShort: L('Ochish ↗', 'Open ↗', 'Открыть ↗', 'Abrir ↗', 'Öffnen ↗', 'Ouvrir ↗'),
  share: L('📤 Do\'stlarga yuborish', '📤 Send to friends', '📤 Отправить друзьям', '📤 Enviar a amigos', '📤 An Freunde senden', '📤 Envoyer à des amis'),
  welcome: L(
    "Salom! Bu — ChessCaravan boti ♞\n\nU o'yinga chaqiruvlar, xabarlar va boshqa muhim voqealarni shu yerga yuboradi.\n\nUlash uchun saytda: Sozlamalar → Ovoz va bildirishnomalar → Telegram → «Ulash».",
    "Hi! This is the ChessCaravan bot ♞\n\nIt sends you game challenges, messages and other important events right here.\n\nTo connect: on the site open Settings → Sound & notifications → Telegram → “Connect”.",
    "Привет! Это бот ChessCaravan ♞\n\nОн присылает сюда вызовы на партию, сообщения и другие важные события.\n\nЧтобы подключить: на сайте Настройки → Звук и уведомления → Telegram → «Подключить».",
    "¡Hola! Este es el bot de ChessCaravan ♞\n\nTe envía aquí desafíos, mensajes y otros eventos importantes.\n\nPara conectarlo: en el sitio, Ajustes → Sonido y notificaciones → Telegram → «Conectar».",
    "Hallo! Das ist der ChessCaravan-Bot ♞\n\nEr schickt dir Herausforderungen, Nachrichten und andere wichtige Ereignisse hierher.\n\nVerbinden: auf der Seite Einstellungen → Ton & Benachrichtigungen → Telegram → „Verbinden“.",
    "Bonjour ! Voici le bot ChessCaravan ♞\n\nIl vous envoie ici les défis, messages et autres événements importants.\n\nPour le connecter : sur le site, Paramètres → Son et notifications → Telegram → « Connecter »."),
  linked: L(
    "✅ Tayyor! Telegram {{name}} akkauntiga ulandi.\n\nSayt yopiq bo'lganda chaqiruvlar va xabarlar shu yerga keladi.\n/invite — do'stlarni taklif qilish havolasi\n/stop — o'chirish",
    "✅ Done! Telegram is now connected to {{name}}.\n\nWhen the site is closed, challenges and messages will arrive here.\n/invite — your invite link for friends\n/stop — disconnect",
    "✅ Готово! Telegram подключён к аккаунту {{name}}.\n\nКогда сайт закрыт, вызовы и сообщения будут приходить сюда.\n/invite — ссылка-приглашение для друзей\n/stop — отключить",
    "✅ ¡Listo! Telegram está conectado a {{name}}.\n\nCuando el sitio esté cerrado, los desafíos y mensajes llegarán aquí.\n/invite — tu enlace de invitación\n/stop — desconectar",
    "✅ Fertig! Telegram ist jetzt mit {{name}} verbunden.\n\nWenn die Seite geschlossen ist, kommen Herausforderungen und Nachrichten hierher.\n/invite — dein Einladungslink\n/stop — trennen",
    "✅ C'est fait ! Telegram est connecté à {{name}}.\n\nQuand le site est fermé, défis et messages arriveront ici.\n/invite — votre lien d'invitation\n/stop — déconnecter"),
  already: L('Bu chat {{name}} akkauntiga ulangan ✅\n/invite — taklif havolasi · /stop — o\'chirish', 'This chat is connected to {{name}} ✅\n/invite — invite link · /stop — disconnect', 'Этот чат подключён к {{name}} ✅\n/invite — приглашение · /stop — отключить', 'Este chat está conectado a {{name}} ✅\n/invite — invitación · /stop — desconectar', 'Dieser Chat ist mit {{name}} verbunden ✅\n/invite — Einladung · /stop — trennen', 'Ce chat est connecté à {{name}} ✅\n/invite — invitation · /stop — déconnecter'),
  badCode: L("Havola eskirgan yoki noto'g'ri. Saytdagi «Ulash» tugmasini qayta bosing.", 'This link has expired or is invalid. Press “Connect” on the site again.', 'Ссылка устарела или неверна. Нажмите «Подключить» на сайте ещё раз.', 'El enlace caducó o no es válido. Pulsa «Conectar» en el sitio de nuevo.', 'Der Link ist abgelaufen oder ungültig. Klicke auf der Seite erneut auf „Verbinden“.', 'Lien expiré ou invalide. Appuyez à nouveau sur « Connecter » sur le site.'),
  stopped: L("Telegram ChessCaravan akkauntingizdan uzildi. Qayta ulash — saytdagi Sozlamalar orqali.", 'Telegram has been disconnected from your ChessCaravan account. Reconnect any time in Settings.', 'Telegram отключён от аккаунта ChessCaravan. Подключить снова можно в Настройках.', 'Telegram se desconectó de tu cuenta de ChessCaravan. Puedes reconectarlo en Ajustes.', 'Telegram wurde von deinem ChessCaravan-Konto getrennt. Jederzeit in den Einstellungen neu verbinden.', 'Telegram est déconnecté de votre compte ChessCaravan. Reconnectez-le dans les Paramètres.'),
  notLinked: L("Avval akkauntingizni ulang: saytda Sozlamalar → Ovoz va bildirishnomalar → Telegram.", 'Connect your account first: on the site, Settings → Sound & notifications → Telegram.', 'Сначала подключите аккаунт: на сайте Настройки → Звук и уведомления → Telegram.', 'Primero conecta tu cuenta: en el sitio, Ajustes → Sonido y notificaciones → Telegram.', 'Verbinde zuerst dein Konto: Einstellungen → Ton & Benachrichtigungen → Telegram.', "Connectez d'abord votre compte : Paramètres → Son et notifications → Telegram."),
  invite: L(
    "Sizning taklif havolangiz 👇\nUni do'stlaringizga yuboring: ular ro'yxatdan o'tishi bilan siz bilan o'yinga tushadi.\n\n{{url}}",
    "Your invite link 👇\nSend it to friends: as soon as they sign up, they can play you.\n\n{{url}}",
    "Ваша ссылка-приглашение 👇\nОтправьте её друзьям: сразу после регистрации они смогут сыграть с вами.\n\n{{url}}",
    "Tu enlace de invitación 👇\nEnvíalo a tus amigos: al registrarse podrán jugar contigo.\n\n{{url}}",
    "Dein Einladungslink 👇\nSchick ihn Freunden: Nach der Anmeldung können sie direkt gegen dich spielen.\n\n{{url}}",
    "Votre lien d'invitation 👇\nEnvoyez-le à vos amis : dès leur inscription, ils pourront jouer contre vous.\n\n{{url}}"),
  shareText: L("{{name}} sizni ChessCaravan'da shaxmat o'yiniga taklif qilyapti ♞", '{{name}} invites you to a game of chess on ChessCaravan ♞', '{{name}} приглашает вас сыграть в шахматы на ChessCaravan ♞', '{{name}} te invita a jugar al ajedrez en ChessCaravan ♞', '{{name}} lädt dich zu einer Schachpartie auf ChessCaravan ein ♞', "{{name}} vous invite à une partie d'échecs sur ChessCaravan ♞"),
  help: L(
    "Buyruqlar:\n/invite — do'stlarni taklif qilish havolasi\n/stop — Telegram'ni akkauntdan uzish\n/help — yordam",
    "Commands:\n/invite — invite link for friends\n/stop — disconnect Telegram from your account\n/help — help",
    "Команды:\n/invite — ссылка-приглашение\n/stop — отключить Telegram от аккаунта\n/help — помощь",
    "Comandos:\n/invite — enlace de invitación\n/stop — desconectar Telegram de tu cuenta\n/help — ayuda",
    "Befehle:\n/invite — Einladungslink\n/stop — Telegram vom Konto trennen\n/help — Hilfe",
    "Commandes :\n/invite — lien d'invitation\n/stop — déconnecter Telegram du compte\n/help — aide"),
  test: L('Telegram bildirishnomalari ishlayapti! ♞', 'Telegram notifications are working! ♞', 'Уведомления в Telegram работают! ♞', '¡Las notificaciones de Telegram funcionan! ♞', 'Telegram-Benachrichtigungen funktionieren! ♞', 'Les notifications Telegram fonctionnent ! ♞'),
  cmdInvite: L("Do'stlarni taklif qilish", 'Invite friends', 'Пригласить друзей', 'Invitar amigos', 'Freunde einladen', 'Inviter des amis'),
  cmdStop: L("Telegram'ni uzish", 'Disconnect Telegram', 'Отключить Telegram', 'Desconectar Telegram', 'Telegram trennen', 'Déconnecter Telegram'),
  cmdHelp: L('Yordam', 'Help', 'Помощь', 'Ayuda', 'Hilfe', 'Aide')
};
const TR_BOT = {
  open: '♞ ChessCaravan\'ı aç',
  openShort: 'Aç ↗',
  share: '📤 Arkadaşlara gönder',
  welcome: "Merhaba! Bu, ChessCaravan botu ♞\n\nOyun davetlerini, mesajları ve diğer önemli olayları buraya gönderir.\n\nBağlamak için sitede: Ayarlar → Ses ve bildirimler → Telegram → «Bağla».",
  linked: "✅ Tamam! Telegram artık {{name}} hesabına bağlı.\n\nSite kapalıyken meydan okumalar ve mesajlar buraya gelecek.\n/invite — arkadaşların için davet bağlantın\n/stop — bağlantıyı kes",
  already: 'Bu sohbet {{name}} hesabına bağlı ✅\n/invite — davet bağlantısı · /stop — bağlantıyı kes',
  badCode: 'Bu bağlantının süresi dolmuş veya geçersiz. Sitede «Bağla» düğmesine tekrar bas.',
  stopped: 'Telegram, ChessCaravan hesabından ayrıldı. İstediğin zaman Ayarlar\'dan yeniden bağlayabilirsin.',
  notLinked: 'Önce hesabını bağla: sitede Ayarlar → Ses ve bildirimler → Telegram.',
  invite: "Davet bağlantın 👇\nArkadaşlarına gönder: kayıt olur olmaz seninle oynayabilirler.\n\n{{url}}",
  shareText: '{{name}} seni ChessCaravan\'da bir satranç oyununa davet ediyor ♞',
  help: "Komutlar:\n/invite — arkadaşlar için davet bağlantısı\n/stop — Telegram'ı hesaptan ayır\n/help — yardım",
  test: 'Telegram bildirimleri çalışıyor! ♞',
  cmdInvite: 'Arkadaşlarını davet et',
  cmdStop: 'Telegram bağlantısını kes',
  cmdHelp: 'Yardım'
};
Object.keys(TR_BOT).forEach((k) => { BOT[k].tr = TR_BOT[k]; });
// Telegram language_code (masalan "ru", "uz", "en-US") → sayt tili
function langOf(code) { const c = String(code || '').slice(0, 2).toLowerCase(); return LANGS.includes(c) ? c : 'en'; }
function botText(key, lang, vars) {
  if (lang === 'uzc') return UzCyrl.toCyrl(botText(key, 'uz', vars));
  const l = LANGS.includes(lang) ? lang : 'en'; return fill((BOT[key] || BOT.help)[l], vars || {}); }

module.exports = { pushMessage, CATEGORY, botText, langOf, LANGS };
