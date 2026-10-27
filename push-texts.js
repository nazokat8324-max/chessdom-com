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
// Қазақша
const KK_T = {
  challenge: '{{from}} сізді ойынға шақырды ({{clock}})',
  message: '{{from}}: {{preview}}',
  messages: '{{from}} ойыншысынан {{count}} жаңа хабарлама',
  friend_request: '{{from}} сізге достық сұрауын жіберді',
  friend_accepted: '{{from}} енді сіздің досыңыз',
  rival_online: 'Қарсылас-досыңыз {{name}} желіде — бір ойнаймыз ба? ⚔️',
  follow_playing: '{{name}} ойын бастады — көріңіз',
  league_ready: 'Лига ойыны: {{opponent}} сізді күтуде',
  tournament_soon: '«{{name}}» турнирі 1 минуттан кейін басталады',
  prediction_won: 'Болжамыңыз дұрыс шықты! +{{points}} 🔮',
  achievement: 'Жаңа жетістік! 🏅',
  quests_done: '🎯 Апталық тапсырмалар орындалды! Белгілер: {{total}}',
  game_of_day: '🌟 {{opponent}} ойыншысымен ойыныңыз Күн ойыны болды!',
  holiday_badge: '{{icon}} Мереке белгісі: {{name}} {{year}}!',
  duel_end: '⚔️ {{opponent}} ойыншысымен бәсеке аяқталды: {{me}} – {{opp}}',
  caravan_city: '🐪 Керуеніңіз {{city}} қаласына жетті!',
  rank_up: 'Жаңа дәреже! Рейтингіңіз {{rating}} ⭐',
  invite_joined: '{{from}} сіздің шақыруыңызбен ChessCaravan-ға қосылды 🎉',
  invite_waiting: '{{from}} сізбен ойнағысы келеді — сайтқа кіріп, оны шақырыңыз ⚔️',
  server_error: '🐞 Сайтта жаңа қате: {{message}}',
  test: 'Push-хабарландырулар жұмыс істейді! ♞',
  generic: 'Сізге жаңа хабарландыру бар'
};
Object.keys(KK_T).forEach((k) => { T[k].kk = KK_T[k]; });
STICKER.kk = '🎨 Стикер';
// Тоҷикӣ, Кыргызча, Türkmençe, Azərbaycanca — kalit: [tg, ky, tk, az]
const MORE = ['tg', 'ky', 'tk', 'az'];
const MORE_T = {
  challenge: ['{{from}} шуморо ба бозӣ даъват кард ({{clock}})', '{{from}} сизди оюнга чакырды ({{clock}})', '{{from}} sizi oýna çagyrdy ({{clock}})', '{{from}} səni oyuna çağırdı ({{clock}})'],
  message: ['{{from}}: {{preview}}', '{{from}}: {{preview}}', '{{from}}: {{preview}}', '{{from}}: {{preview}}'],
  messages: ['{{count}} паёми нав аз {{from}}', '{{from}} оюнчусунан {{count}} жаңы билдирүү', '{{from}}-dan {{count}} täze habar', '{{from}} adlı oyunçudan {{count}} yeni mesaj'],
  friend_request: ['{{from}} ба шумо дархости дӯстӣ фиристод', '{{from}} сизге достук сурамын жөнөттү', '{{from}} size dostluk haýyşyny iberdi', '{{from}} sənə dostluq sorğusu göndərdi'],
  friend_accepted: ['{{from}} акнун дӯсти шумост', '{{from}} эми сиздин досуңуз', '{{from}} indi siziň dostuňyz', '{{from}} artıq sənin dostundur'],
  rival_online: ['Рақиби доимии шумо {{name}} онлайн аст — бозӣ мекунем? ⚔️', 'Атаандаш-досуңуз {{name}} онлайн — ойнойлубу? ⚔️', 'Garşydaş-dostuňyz {{name}} onlaýn — oýnalymy? ⚔️', 'Rəqib-dostun {{name}} onlayndır — bir oyun? ⚔️'],
  follow_playing: ['{{name}} бозӣ оғоз кард — тамошо кунед', '{{name}} оюн баштады — көрүңүз', '{{name}} oýun başlady — tomaşa ediň', '{{name}} oyuna başladı — izlə'],
  league_ready: ['Бозии лига: {{opponent}} шуморо интизор аст', 'Лига оюну: {{opponent}} сизди күтүүдө', 'Liga oýny: {{opponent}} size garaşýar', 'Liqa oyunu: {{opponent}} səni gözləyir'],
  tournament_soon: ['Мусобиқаи «{{name}}» баъд аз 1 дақиқа оғоз мешавад', '«{{name}}» турнири 1 мүнөттөн кийин башталат', '«{{name}}» ýaryşy 1 minutdan soň başlaýar', '«{{name}}» turniri 1 dəqiqə sonra başlayır'],
  prediction_won: ['Пешгӯии шумо дуруст баромад! +{{points}} 🔮', 'Божомолуңуз туура чыкты! +{{points}} 🔮', 'Çaklamaňyz dogry çykdy! +{{points}} 🔮', 'Proqnozun doğru çıxdı! +{{points}} 🔮'],
  achievement: ['Дастоварди нав! 🏅', 'Жаңы жетишкендик! 🏅', 'Täze üstünlik! 🏅', 'Yeni nailiyyət! 🏅'],
  quests_done: ['🎯 Вазифаҳои ҳафтаина иҷро шуданд! Нишонҳо: {{total}}', '🎯 Апталык тапшырмалар аткарылды! Белгилер: {{total}}', '🎯 Hepdelik tabşyryklar ýerine ýetirildi! Nyşanlar: {{total}}', '🎯 Həftəlik tapşırıqlar tamamlandı! Nişanlar: {{total}}'],
  game_of_day: ['🌟 Бозии шумо бо {{opponent}} Бозии рӯз шуд!', '🌟 {{opponent}} менен оюнуңуз Күндүн оюну болду!', '🌟 {{opponent}} bilen oýnuňyz Günüň oýny boldy!', '🌟 {{opponent}} ilə oyunun Günün oyunu oldu!'],
  holiday_badge: ['{{icon}} Нишони ид: {{name}} {{year}}!', '{{icon}} Майрам белгиси: {{name}} {{year}}!', '{{icon}} Baýramçylyk nyşany: {{name}} {{year}}!', '{{icon}} Bayram nişanı: {{name}} {{year}}!'],
  duel_end: ['⚔️ Баҳси шумо бо {{opponent}} анҷом ёфт: {{me}} – {{opp}}', '⚔️ {{opponent}} менен беттешиңиз бүттү: {{me}} – {{opp}}', '⚔️ {{opponent}} bilen bäsleşigiňiz gutardy: {{me}} – {{opp}}', '⚔️ {{opponent}} ilə matçın bitdi: {{me}} – {{opp}}'],
  caravan_city: ['🐪 Корвони шумо ба {{city}} расид!', '🐪 Кербениңиз {{city}} шаарына жетти!', '🐪 Kerweniňiz {{city}} şäherine ýetdi!', '🐪 Karvanın {{city}} şəhərinə çatdı!'],
  rank_up: ['Дараҷаи нав! Рейтинги шумо {{rating}} ⭐', 'Жаңы даража! Рейтингиңиз {{rating}} ⭐', 'Täze dereje! Reýtingiňiz {{rating}} ⭐', 'Yeni dərəcə! Reytinqin {{rating}} ⭐'],
  invite_joined: ['{{from}} бо даъвати шумо ба ChessCaravan ҳамроҳ шуд 🎉', '{{from}} сиздин чакыруу менен ChessCaravan\'га кошулду 🎉', '{{from}} siziň çakylygyňyz bilen ChessCaravan-a goşuldy 🎉', '{{from}} sənin dəvətinlə ChessCaravan-a qoşuldu 🎉'],
  invite_waiting: ['{{from}} мехоҳад бо шумо бозӣ кунад — ба сайт ворид шуда, ӯро даъват кунед ⚔️', '{{from}} сиз менен ойногусу келет — сайтка кирип, аны чакырыңыз ⚔️', '{{from}} siz bilen oýnamak isleýär — saýta girip, ony çagyryň ⚔️', '{{from}} səninlə oynamaq istəyir — sayta gir və onu çağır ⚔️'],
  server_error: ['🐞 Хатои нав дар сайт: {{message}}', '🐞 Сайттагы жаңы ката: {{message}}', '🐞 Saýtda täze ýalňyşlyk: {{message}}', '🐞 Saytda yeni xəta: {{message}}'],
  test: ['Огоҳиномаҳо кор мекунанд! ♞', 'Билдирмелер иштейт! ♞', 'Bildirişler işleýär! ♞', 'Bildirişlər işləyir! ♞'],
  generic: ['Шумо огоҳиномаи нав доред', 'Сизге жаңы билдирме бар', 'Size täze bildiriş bar', 'Yeni bildirişin var']
};
Object.keys(MORE_T).forEach((k) => MORE.forEach((l, i) => { T[k][l] = MORE_T[k][i]; }));
MORE.forEach((l, i) => { STICKER[l] = ['🎨 Стикер', '🎨 Стикер', '🎨 Stiker', '🎨 Stiker'][i]; });
const LANGS = ['uz', 'en', 'ru', 'es', 'de', 'fr', 'tr', 'kk', 'tg', 'ky', 'tk', 'az'];

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
const KK_BOT = {
  open: '♞ ChessCaravan-ды ашу',
  openShort: 'Ашу ↗',
  share: '📤 Достарға жіберу',
  welcome: "Сәлем! Бұл — ChessCaravan боты ♞\n\nОл ойынға шақыруларды, хабарламаларды және басқа маңызды оқиғаларды осында жібереді.\n\nҚосу үшін сайтта: Баптаулар → Дыбыс және хабарландырулар → Telegram → «Қосу».",
  linked: "✅ Дайын! Telegram {{name}} аккаунтына қосылды.\n\nСайт жабық болғанда шақырулар мен хабарламалар осында келеді.\n/invite — достарға арналған шақыру сілтемесі\n/stop — ажырату",
  already: 'Бұл чат {{name}} аккаунтына қосылған ✅\n/invite — шақыру сілтемесі · /stop — ажырату',
  badCode: 'Сілтеменің мерзімі өткен немесе қате. Сайттағы «Қосу» түймесін қайта басыңыз.',
  stopped: 'Telegram ChessCaravan аккаунтыңыздан ажыратылды. Баптаулар арқылы кез келген уақытта қайта қоса аласыз.',
  notLinked: 'Алдымен аккаунтыңызды қосыңыз: сайтта Баптаулар → Дыбыс және хабарландырулар → Telegram.',
  invite: "Сіздің шақыру сілтемеңіз 👇\nОны достарыңызға жіберіңіз: тіркелген бойда олар сізбен ойнай алады.\n\n{{url}}",
  shareText: '{{name}} сізді ChessCaravan-да шахмат ойнауға шақырады ♞',
  help: "Командалар:\n/invite — достарға арналған шақыру сілтемесі\n/stop — Telegram-ды аккаунттан ажырату\n/help — көмек",
  test: 'Telegram хабарландырулары жұмыс істейді! ♞',
  cmdInvite: 'Достарды шақыру',
  cmdStop: 'Telegram-ды ажырату',
  cmdHelp: 'Көмек'
};
Object.keys(KK_BOT).forEach((k) => { BOT[k].kk = KK_BOT[k]; });
const MORE_BOT = {
  open: ['♞ Кушодани ChessCaravan', '♞ ChessCaravan\'ды ачуу', '♞ ChessCaravan-y aç', '♞ ChessCaravan-ı aç'],
  openShort: ['Кушодан ↗', 'Ачуу ↗', 'Aç ↗', 'Aç ↗'],
  share: ['📤 Ба дӯстон фиристодан', '📤 Досторго жөнөтүү', '📤 Dostlara iber', '📤 Dostlara göndər'],
  welcome: [
    'Салом! Ин боти ChessCaravan аст ♞\n\nВай даъватҳо ба бозӣ, паёмҳо ва дигар рӯйдодҳои муҳимро ба ин ҷо мефиристад.\n\nБарои пайваст кардан дар сайт: Танзимот → Садо ва огоҳиномаҳо → Telegram → «Пайваст кардан».',
    'Салам! Бул — ChessCaravan боту ♞\n\nАл оюнга чакырууларды, билдирүүлөрдү жана башка маанилүү окуяларды ушул жерге жөнөтөт.\n\nТуташтыруу үчүн сайтта: Жөндөөлөр → Үн жана билдирмелер → Telegram → «Туташтыруу».',
    'Salam! Bu — ChessCaravan boty ♞\n\nOl oýna çakylyklary, habarlary we beýleki möhüm wakalary şu ýere iberýär.\n\nBirikdirmek üçin saýtda: Sazlamalar → Ses we bildirişler → Telegram → «Birikdir».',
    'Salam! Bu ChessCaravan botudur ♞\n\nO, oyun çağırışlarını, mesajları və digər vacib hadisələri bura göndərir.\n\nQoşmaq üçün saytda: Ayarlar → Səs və bildirişlər → Telegram → «Qoş».'],
  linked: [
    '✅ Тайёр! Telegram ба ҳисоби {{name}} пайваст шуд.\n\nВақте сайт баста аст, даъватҳо ва паёмҳо ба ин ҷо меоянд.\n/invite — истиноди даъват барои дӯстон\n/stop — ҷудо кардан',
    '✅ Даяр! Telegram {{name}} аккаунтуна туташты.\n\nСайт жабык болгондо чакыруулар жана билдирүүлөр ушул жерге келет.\n/invite — достор үчүн чакыруу шилтемеси\n/stop — ажыратуу',
    '✅ Taýýar! Telegram {{name}} hasabyna birikdirildi.\n\nSaýt ýapyk wagty çakylyklar we habarlar şu ýere geler.\n/invite — dostlar üçin çakylyk salgysy\n/stop — aýyr',
    '✅ Hazırdır! Telegram {{name}} hesabına qoşuldu.\n\nSayt bağlı olanda çağırışlar və mesajlar bura gələcək.\n/invite — dostlar üçün dəvət keçidi\n/stop — ayır'],
  already: ['Ин чат ба ҳисоби {{name}} пайваст аст ✅\n/invite — истиноди даъват · /stop — ҷудо кардан', 'Бул чат {{name}} аккаунтуна туташкан ✅\n/invite — чакыруу шилтемеси · /stop — ажыратуу', 'Bu çat {{name}} hasabyna birikdirilen ✅\n/invite — çakylyk salgysy · /stop — aýyr', 'Bu çat {{name}} hesabına qoşulub ✅\n/invite — dəvət keçidi · /stop — ayır'],
  badCode: ['Истинод кӯҳна ё нодуруст аст. Дар сайт тугмаи «Пайваст кардан»-ро дубора пахш кунед.', 'Шилтеменин мөөнөтү өткөн же туура эмес. Сайттагы «Туташтыруу» баскычын кайра басыңыз.', 'Salgynyň möhleti geçen ýa-da nädogry. Saýtdaky «Birikdir» düwmesine täzeden basyň.', 'Keçidin müddəti bitib və ya yanlışdır. Saytda «Qoş» düyməsini yenidən bas.'],
  stopped: ['Telegram аз ҳисоби ChessCaravan-и шумо ҷудо шуд. Дубора пайваст кардан — тавассути Танзимот.', 'Telegram ChessCaravan аккаунтуңуздан ажыратылды. Кайра туташтыруу — Жөндөөлөр аркылуу.', 'Telegram ChessCaravan hasabyňyzdan aýryldy. Täzeden birikdirmek — Sazlamalar arkaly.', 'Telegram ChessCaravan hesabından ayrıldı. Yenidən qoşmaq — Ayarlar vasitəsilə.'],
  notLinked: ['Аввал ҳисобатонро пайваст кунед: дар сайт Танзимот → Садо ва огоҳиномаҳо → Telegram.', 'Адегенде аккаунтуңузду туташтырыңыз: сайтта Жөндөөлөр → Үн жана билдирмелер → Telegram.', 'Ilki hasabyňyzy birikdiriň: saýtda Sazlamalar → Ses we bildirişler → Telegram.', 'Əvvəlcə hesabını qoş: saytda Ayarlar → Səs və bildirişlər → Telegram.'],
  invite: [
    'Истиноди даъвати шумо 👇\nОнро ба дӯстонатон фиристед: ҳамин ки ба қайд гиранд, бо шумо бозӣ карда метавонанд.\n\n{{url}}',
    'Сиздин чакыруу шилтемеңиз 👇\nАны досторуңузга жөнөтүңүз: катталары менен сиз менен ойной алышат.\n\n{{url}}',
    'Siziň çakylyk salgyňyz 👇\nOny dostlaryňyza iberiň: hasaba alnan badyna siz bilen oýnap bilerler.\n\n{{url}}',
    'Dəvət keçidin 👇\nOnu dostlarına göndər: qeydiyyatdan keçən kimi səninlə oynaya bilərlər.\n\n{{url}}'],
  shareText: ['{{name}} шуморо ба бозии шоҳмот дар ChessCaravan даъват мекунад ♞', '{{name}} сизди ChessCaravan\'да шахмат ойноого чакырат ♞', '{{name}} sizi ChessCaravan-da küşt oýnamaga çagyrýar ♞', '{{name}} səni ChessCaravan-da şahmat oynamağa dəvət edir ♞'],
  help: [
    'Фармонҳо:\n/invite — истиноди даъват барои дӯстон\n/stop — ҷудо кардани Telegram аз ҳисоб\n/help — ёрӣ',
    'Буйруктар:\n/invite — достор үчүн чакыруу шилтемеси\n/stop — Telegram\'ды аккаунттан ажыратуу\n/help — жардам',
    'Buýruklar:\n/invite — dostlar üçin çakylyk salgysy\n/stop — Telegram-y hasapdan aýyr\n/help — kömek',
    'Əmrlər:\n/invite — dostlar üçün dəvət keçidi\n/stop — Telegram-ı hesabdan ayır\n/help — kömək'],
  test: ['Огоҳиномаҳои Telegram кор мекунанд! ♞', 'Telegram билдирмелери иштейт! ♞', 'Telegram bildirişleri işleýär! ♞', 'Telegram bildirişləri işləyir! ♞'],
  cmdInvite: ['Даъвати дӯстон', 'Досторду чакыруу', 'Dostlary çagyr', 'Dostları dəvət et'],
  cmdStop: ['Ҷудо кардани Telegram', 'Telegram\'ды ажыратуу', 'Telegram-y aýyr', 'Telegram-ı ayır'],
  cmdHelp: ['Ёрӣ', 'Жардам', 'Kömek', 'Kömək']
};
Object.keys(MORE_BOT).forEach((k) => MORE.forEach((l, i) => { BOT[k][l] = MORE_BOT[k][i]; }));
// Telegram language_code (masalan "ru", "uz", "en-US") → sayt tili
function langOf(code) { const c = String(code || '').slice(0, 2).toLowerCase(); return LANGS.includes(c) ? c : 'en'; }
function botText(key, lang, vars) {
  if (lang === 'uzc') return UzCyrl.toCyrl(botText(key, 'uz', vars));
  const l = LANGS.includes(lang) ? lang : 'en'; return fill((BOT[key] || BOT.help)[l], vars || {}); }

module.exports = { pushMessage, CATEGORY, botText, langOf, LANGS };
