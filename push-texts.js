// Push-bildirishnomalar matni (server tomonida, foydalanuvchi tilida). Saytdagi bildirishnomalar markazi matnni
// klientda yasaydi (notifications.js, nf* kalitlar); push esa sayt yopiq paytda keladi, shuning uchun matn shu yerda.
// pushMessage(type, data, lang, ownName) → { title, body, url, category } — tur ro'yxatda bo'lmasa umumiy matn.
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
  mentor_request: L("{{from}}: ustoz-shogird taklifi 🎓", '{{from}}: mentorship request 🎓', '{{from}}: предложение наставничества 🎓', '{{from}}: solicitud de mentoría 🎓', '{{from}}: Mentor-Anfrage 🎓', '{{from}} : demande de mentorat 🎓'),
  mentor_accepted: L("{{from}} bilan ustoz-shogirdlik boshlandi 🎓", 'Mentorship with {{from}} has started 🎓', 'Наставничество с {{from}} началось 🎓', 'Comenzó la mentoría con {{from}} 🎓', 'Mentorschaft mit {{from}} gestartet 🎓', 'Mentorat avec {{from}} commencé 🎓'),
  mentor_note: L("{{from}} o'yinga izoh qoldirdi 💬", '{{from}} left a note on a game 💬', '{{from}} прокомментировал партию 💬', '{{from}} dejó una nota en una partida 💬', '{{from}} hat eine Partie kommentiert 💬', '{{from}} a commenté une partie 💬'),
  student_game: L("Shogirdingiz {{student}} o'ynadi — izoh qoldiring", 'Your student {{student}} played — leave a note', 'Ваш ученик {{student}} сыграл — прокомментируйте', 'Tu alumno {{student}} jugó: deja una nota', 'Dein Schüler {{student}} hat gespielt — schreib eine Notiz', 'Votre élève {{student}} a joué — laissez une note'),
  prediction_won: L("Bashoratingiz to'g'ri chiqdi! +{{points}} 🔮", 'Your prediction was right! +{{points}} 🔮', 'Прогноз сбылся! +{{points}} 🔮', '¡Acertaste! +{{points}} 🔮', 'Richtig getippt! +{{points}} 🔮', 'Bon pronostic ! +{{points}} 🔮'),
  achievement: L('Yangi yutuq! 🏅', 'New achievement! 🏅', 'Новое достижение! 🏅', '¡Nuevo logro! 🏅', 'Neuer Erfolg! 🏅', 'Nouveau succès ! 🏅'),
  rank_up: L('Yangi daraja! Reytingingiz {{rating}} ⭐', 'New rank! Your rating is {{rating}} ⭐', 'Новый уровень! Рейтинг {{rating}} ⭐', '¡Nuevo rango! Tu rating es {{rating}} ⭐', 'Neuer Rang! Deine Wertung: {{rating}} ⭐', 'Nouveau rang ! Classement {{rating}} ⭐'),
  server_error: L('🐞 Saytda yangi xato: {{message}}', '🐞 New site error: {{message}}', '🐞 Новая ошибка на сайте: {{message}}', '🐞 Nuevo error en el sitio: {{message}}', '🐞 Neuer Fehler auf der Seite: {{message}}', '🐞 Nouvelle erreur sur le site : {{message}}'),
  test: L("Push-bildirishnomalar ishlayapti! ♞", 'Push notifications are working! ♞', 'Push-уведомления работают! ♞', '¡Las notificaciones push funcionan! ♞', 'Push-Benachrichtigungen funktionieren! ♞', 'Les notifications push fonctionnent ! ♞'),
  generic: L('Sizga yangi bildirishnoma bor', 'You have a new notification', 'У вас новое уведомление', 'Tienes una notificación nueva', 'Du hast eine neue Benachrichtigung', 'Vous avez une nouvelle notification')
};
const STICKER = L('🎨 Stiker', '🎨 Sticker', '🎨 Стикер', '🎨 Sticker', '🎨 Sticker', '🎨 Sticker');
// Turkum — Sozlamalarda alohida yoqiladi/o'chiriladi
const CATEGORY = {
  challenge: 'challenge', message: 'message',
  friend_request: 'social', friend_accepted: 'social', rival_online: 'social', follow_playing: 'social',
  mentor_request: 'social', mentor_accepted: 'social', mentor_note: 'social', student_game: 'social'
};
const LANGS = ['uz', 'en', 'ru', 'es', 'de', 'fr'];

function fill(s, vars) { return String(s).replace(/\{\{(\w+)\}\}/g, (m, k) => (vars[k] == null ? '' : String(vars[k]))); }

function pushMessage(type, data, lang, ownName) {
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
    case 'friend_request': case 'friend_accepted': case 'mentor_accepted': url = prof(d.from); break;
    case 'rival_online': case 'follow_playing': url = type === 'follow_playing' ? '/jonli' : prof(d.name); break;
    case 'league_ready': url = '/ligalar'; break;
    case 'tournament_soon': url = '/turnirlar'; break;
    case 'mentor_request': case 'achievement': case 'rank_up': url = prof(ownName); break;
    case 'mentor_note': url = '/tarix?u=' + encodeURIComponent(d.owner || ''); break;
    case 'student_game': url = '/tarix?u=' + encodeURIComponent(d.student || ''); break;
    case 'prediction_won': url = '/jonli'; break;
    case 'server_error': url = '/admin'; break;
  }
  return { title: 'ChessDom', body: fill(T[key][l], vars).slice(0, 180), url, category: CATEGORY[type] || 'events' };
}

module.exports = { pushMessage, CATEGORY };
