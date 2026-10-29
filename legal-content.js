// Maxfiylik siyosati va Foydalanish shartlari matnlari (legal.html ko'rsatadi). 7 til: uz, en, ru, es, de, fr, tr (uzc — legal.html da uz dan avtomatik).
// Har hujjat: title, updated, intro, sections: [[sarlavha, [paragraf yoki ["ro'yxat", ...]] ...]]. {{contact}} — aloqa manzili.
window.LEGAL_TEXT = {
  uz: {
    ui: { credits: "Mualliflar va litsenziyalar", privacy: 'Maxfiylik siyosati', terms: 'Foydalanish shartlari', back: "Saytga qaytish", updated: 'Oxirgi yangilanish', contactNone: "sayt ichidagi «Shikoyat» tugmasi orqali ma'muriyatga yozing" },
    credits: {"intro":"ChessCaravan ochiq kodli kutubxonalar va erkin litsenziyali resurslar asosida qurilgan. Ularning mualliflariga rahmat! Quyida saytda ishlatiladigan har bir begona resurs, muallifi va litsenziyasi.","code":"Dasturiy kutubxonalar (brauzerda)","assets":"Rasmlar, shriftlar va ma'lumotlar","own":"ChessCaravan'ning o'zi yaratgan","server":"Server: Node.js, Express, Socket.IO, PostgreSQL / SQLite va boshqa ochiq kodli paketlar (MIT, BSD, ISC, MPL-2.0 litsenziyalari) — ular foydalanuvchiga uzatilmaydi.","gpl":"GPL litsenziyali qism (Stockfish tahlil dvigateli) o'zgartirilmagan holda ishlatiladi; uning manba kodi yuqoridagi havolada ochiq.","ownText":"11 ta dona to'plami (Karvon, Klassik, Aniq, Atlas, Rishton, Yog'och, Shohona, Neon, Geometrik, Bolajon, Piksel), yurish ovozlari (dastur bilan sintez qilingan), logotip, ikonkalar, atlas naqshi va havola rasmi."},
    privacy: {
      intro: "ChessCaravan — onlayn shaxmat sayti. Bu sahifa qanday ma'lumotlaringizni saqlashimiz, nima uchun va qanday himoya qilishimizni tushuntiradi. Saytdan foydalanib, siz shu siyosatga rozilik bildirasiz.",
      sections: [
        ["Qanday ma'lumotlarni saqlaymiz", [
          ["Hisob: foydalanuvchi nomi, email (ixtiyoriy), parol — faqat shifrlangan ko'rinishda (bcrypt xesh), davlat, profil rasmi, profilga o'zingiz yozgan ma'lumotlar.",
           "O'yinlar: yurishlar, natijalar, reyting tarixi, statistika, yutuqlar, bashoratlar va odob baholari.",
           "Muloqot: shaxsiy xabarlar, klub va o'yin chatlari, tomoshabinlar chati, shikoyatlar.",
           "Texnik: IP manzil (faqat so'rovlar sonini cheklash uchun, server xotirasida vaqtincha), internet kechikishi, o'yin paytida sahifadan chiqishlar va yurish vaqtlari (halol o'yin tekshiruvi uchun).",
           "Brauzeringizda (localStorage): kirish tokeni, sozlamalar va til. Biz cookie, reklama yoki kuzatuv (analitika) skriptlaridan foydalanmaymiz."]
        ]],
        ["Nima uchun ishlatamiz", [
          "O'yinlarni o'tkazish, reyting va statistikani hisoblash, bildirishnomalar yuborish, parolni tiklash xatini jo'natish, firibgarlik va haqoratga qarshi kurash hamda saytni yaxshilash uchun. Ma'lumotlaringizni sotmaymiz va reklama uchun hech kimga bermaymiz."
        ]],
        ["Boshqalar nimani ko'radi", [
          "Ommaviy: foydalanuvchi nomi, davlat, profil rasmi, reytinglar, statistika, o'yinlar va ularning yurishlari, klub, yutuqlar, raqiblar bo'yicha hisob. Email va parol hech kimga ko'rsatilmaydi. Shaxsiy xabarlarni faqat suhbatdagi ikki ishtirokchi ko'radi. Maxfiylik sozlamalarida kim sizga yozishi va o'yinga chaqirishi mumkinligini tanlaysiz."
        ]],
        ["Uchinchi tomon xizmatlari", [
          ["Render — sayt serveri (hosting).", "Neon — PostgreSQL ma'lumotlar bazasi.", "Brevo — parolni tiklash xatlarini yuborish.", "Cloudflare — chesscaravan.com domeni va DNS (manzilni sayt serveriga yo'naltirish).", "Telegram — faqat botni ulasangiz: chat ID va bildirishnoma matnlari yuboriladi.", "Push-bildirishnomalar — faqat yoqsangiz, brauzeringiz xizmati (Google, Apple, Mozilla) orqali.", "Ovoz bilan yurish — faqat yoqsangiz: gapingizni brauzeringizning nutqni aniqlash xizmati (masalan, Chrome'da Google) matnga aylantiradi; biz ovoz yozuvini olmaymiz va saqlamaymiz.",
           "Kutubxona va shriftlar uchun CDN'lar: cdnjs (Cloudflare), jsDelivr, unpkg, code.jquery.com, cdn.socket.io, Google Fonts; bayroqlar — flagcdn.com; stikerlar — Google Noto Emoji.",
           "Bu xizmatlar texnik sabablarga ko'ra IP manzilingizni ko'rishi mumkin. O'yin tahlili (Stockfish) to'liq brauzeringizda ishlaydi."]
        ]],
        ["Saqlash muddati", [
          "Ma'lumotlar akkauntingiz mavjud ekan saqlanadi. Akkauntni o'chirsangiz, profilingiz, o'yinlaringiz, xabarlaringiz, do'stlaringiz, bildirishnomalaringiz va boshqa shaxsiy ma'lumotlaringiz darhol o'chiriladi. Raqiblaringizning o'yinlar tarixida o'sha o'yinlar anonim nom bilan qoladi, klubingizning Bayroqlar bellashuvidagi ochkolari esa nomsiz saqlanadi. Hosting provayderlarining zaxira nusxalarida ma'lumotlar qisqa muddat qolishi mumkin."
        ]],
        ["Huquqlaringiz", [
          ["Profil va Sozlamalarda ma'lumotlaringizni ko'rish va o'zgartirish.", "O'yinlaringizni PGN fayl sifatida yuklab olish.",
           "Akkauntni butunlay o'chirish: Sozlamalar → Hisob → «Akkauntni o'chirish».", "O'yinchilarni bloklash va shikoyat qilish."]
        ]],
        ["Xavfsizlik", [
          "Sayt HTTPS orqali ishlaydi, parollar faqat bcrypt xesh ko'rinishida saqlanadi, kirish tokeni 7 kun amal qiladi. Shunga qaramay, internetda hech bir tizim 100% xavfsiz emas — parolingizni boshqa saytlarda takrorlamang."
        ]],
        ["Bolalar", [
          "13 yoshga to'lmagan bolalar saytdan faqat ota-onasi yoki vasiysi roziligi bilan foydalanishi mumkin."
        ]],
        ["O'zgarishlar va aloqa", [
          "Siyosat o'zgarsa, shu sahifadagi sana yangilanadi. Savollar va ma'lumotlarni o'chirish bo'yicha murojaatlar uchun: {{contact}}."
        ]]
      ]
    },
    terms: {
      intro: "Saytdan foydalanish orqali siz quyidagi shartlarga rozilik bildirasiz. Agar rozi bo'lmasangiz, iltimos, saytdan foydalanmang.",
      sections: [
        ['Hisob', [
          ["Ro'yxatdan o'tishda to'g'ri ma'lumot bering va parolingizni hech kimga bermang — hisobingizdagi harakatlar uchun o'zingiz javobgarsiz.",
           "Reytingni sun'iy oshirish uchun bir nechta hisob ochish taqiqlanadi.",
           "Haqoratli, boshqa odamga taqlid qiluvchi yoki reklama xarakteridagi foydalanuvchi nomlari taqiqlanadi."]
        ]],
        ["Halol o'yin", [
          ["O'yin davomida shaxmat dasturlari (dvigatellar), boshqa odamlarning maslahati yoki har qanday tashqi yordamdan foydalanish taqiqlanadi.",
           "Ataylab yutqazish, natijani kelishib olish va reytingni manipulyatsiya qilish taqiqlanadi.",
           "Sayt o'yinlarni avtomatik tekshiradi. Qoidabuzar deb topilgan o'yinchining hisobi belgilanadi yoki bloklanadi, raqiblariga yo'qotilgan reyting qaytariladi."]
        ]],
        ["Xulq-atvor", [
          ["Haqorat, kamsitish, tahdid, spam, reklama, noqonuniy va odobsiz kontent taqiqlanadi.",
           "Chatda taqiqlangan so'zlar avtomatik yashiriladi; qoidabuzarlarning chatda yozishi vaqtincha cheklanishi mumkin.",
           "Boshqa o'yinchini bloklashingiz va shikoyat qilishingiz mumkin — shikoyatlarni ma'muriyat ko'rib chiqadi."]
        ]],
        ['Choralar', [
          "Qoidalar buzilganda ogohlantirish, chatni cheklash, vaqtincha yoki doimiy bloklash qo'llanishi mumkin. Og'ir qoidabuzarlikda ogohlantirishsiz bloklash mumkin."
        ]],
        ['Kontent', [
          "O'yinlaringiz (yurishlar va natijalar) ommaviy va ularni boshqalar ko'rishi, tahlil qilishi va PGN sifatida yuklab olishi mumkin. Xabarlar va izohlaringiz uchun o'zingiz javobgarsiz. Siz bizga ushbu kontentni xizmatni ko'rsatish uchun saqlash va ko'rsatish huquqini berasiz."
        ]],
        ['Xizmat', [
          "ChessCaravan bepul va «boricha» taqdim etiladi. Biz uzluksiz ishlashni, xatolar yo'qligini yoki ma'lumotlar hech qachon yo'qolmasligini kafolatlamaymiz. Imkoniyatlarni o'zgartirish, to'xtatib turish yoki yopish huquqini saqlab qolamiz. Qonun ruxsat bergan darajada, sayt bilan bog'liq bilvosita zararlar uchun javobgar emasmiz."
        ]],
        ['Hisobni yopish', [
          "Hisobingizni istalgan vaqtda Sozlamalar → Hisob → «Akkauntni o'chirish» orqali butunlay o'chirishingiz mumkin. Qoidalarni buzgan hisoblarni biz yopishimiz mumkin."
        ]],
        ["O'zgarishlar va aloqa", [
          "Shartlar o'zgarsa, shu sahifadagi sana yangilanadi; o'zgarishdan keyin saytdan foydalanish yangi shartlarga rozilikni bildiradi. Savollar uchun: {{contact}}."
        ]]
      ]
    }
  },
  en: {
    ui: { credits: "Credits & licenses", privacy: 'Privacy Policy', terms: 'Terms of Use', back: 'Back to the site', updated: 'Last updated', contactNone: 'write to the administrators using the “Report” button on the site' },
    credits: {"intro":"ChessCaravan is built on open-source libraries and freely licensed resources. Thank you to their authors! Below is every third-party resource the site uses, with its author and license.","code":"Software libraries (in the browser)","assets":"Images, fonts and data","own":"Made by ChessCaravan","server":"Server: Node.js, Express, Socket.IO, PostgreSQL / SQLite and other open-source packages (MIT, BSD, ISC, MPL-2.0 licenses) — these are not delivered to users.","gpl":"The GPL-licensed part (the Stockfish analysis engine) is used unmodified; its source code is available at the link above.","ownText":"All 11 piece sets (Karvon, Classic, Clear, Atlas, Rishton, Wood, Royal, Neon, Geometric, Bolajon, Pixel), move sounds (synthesized in code), the logo, icons, the atlas pattern and the link preview image."},
    privacy: {
      intro: 'ChessCaravan is an online chess site. This page explains what data we store, why, and how we protect it. By using the site you agree to this policy.',
      sections: [
        ['What we store', [
          ['Account: username, email (optional), password — only as an encrypted bcrypt hash, country, profile picture and anything you add to your profile.',
           'Games: moves, results, rating history, statistics, achievements, predictions and sportsmanship votes.',
           'Communication: private messages, club and game chats, spectator chat and reports.',
           'Technical: IP address (only to rate-limit requests, kept temporarily in server memory), connection latency, leaving the page during a game and move times (for fair-play checks).',
           'In your browser (localStorage): your login token, settings and language. We do not use cookies, ads or tracking (analytics) scripts.']
        ]],
        ['Why we use it', [
          'To run games, calculate ratings and statistics, send notifications and password-reset emails, fight cheating and abuse, and improve the site. We never sell your data or share it for advertising.'
        ]],
        ['What others can see', [
          'Public: username, country, profile picture, ratings, statistics, games and their moves, club, achievements and head-to-head scores. Your email and password are never shown. Private messages are visible only to the two people in the conversation. In privacy settings you choose who can message or challenge you.'
        ]],
        ['Third-party services', [
          ['Render — web hosting.', 'Neon — PostgreSQL database.', 'Brevo — sending password-reset emails.', 'Cloudflare — the chesscaravan.com domain and DNS (points the address to the server).', 'Telegram — only if you link the bot: your chat ID and notification texts are sent.', 'Push notifications — only if you enable them, via your browser vendor (Google, Apple, Mozilla).', "Voice moves — only if you turn them on: your speech is turned into text by your browser’s speech recognition service (for example Google in Chrome); we never receive or store recordings.",
           'CDNs for libraries and fonts: cdnjs (Cloudflare), jsDelivr, unpkg, code.jquery.com, cdn.socket.io, Google Fonts; flags — flagcdn.com; stickers — Google Noto Emoji.',
           'For technical reasons these services may see your IP address. Game analysis (Stockfish) runs entirely in your browser.']
        ]],
        ['How long we keep data', [
          'We keep data while your account exists. If you delete your account, your profile, games, messages, friends, notifications and other personal data are deleted immediately. Those games stay in your opponents’ histories under an anonymous name, and your club’s Battle of Flags points remain without your name. Hosting providers’ backups may keep data for a short time.'
        ]],
        ['Your rights', [
          ['View and change your data in your Profile and Settings.', 'Download your games as a PGN file.',
           'Delete your account completely: Settings → Account → “Delete account”.', 'Block and report other players.']
        ]],
        ['Security', [
          'The site uses HTTPS, passwords are stored only as bcrypt hashes and the login token is valid for 7 days. Still, no system on the internet is 100% secure — please don’t reuse your password on other sites.'
        ]],
        ['Children', [
          'Children under 13 may use the site only with the consent of a parent or guardian.'
        ]],
        ['Changes and contact', [
          'If this policy changes, the date on this page is updated. For questions and data-deletion requests: {{contact}}.'
        ]]
      ]
    },
    terms: {
      intro: 'By using the site you agree to the terms below. If you do not agree, please do not use the site.',
      sections: [
        ['Account', [
          ['Give accurate information when you register and never share your password — you are responsible for what happens on your account.',
           'Creating multiple accounts to inflate ratings is not allowed.',
           'Offensive, impersonating or advertising usernames are not allowed.']
        ]],
        ['Fair play', [
          ['Using chess engines, other people’s advice or any outside help during a game is not allowed.',
           'Losing on purpose, arranging results and manipulating ratings are not allowed.',
           'The site checks games automatically. Players found cheating are marked or banned, and their opponents get their lost rating back.']
        ]],
        ['Behaviour', [
          ['Insults, discrimination, threats, spam, advertising, illegal and obscene content are not allowed.',
           'Banned words are hidden automatically in chat; offenders may be temporarily muted.',
           'You can block and report other players — administrators review reports.']
        ]],
        ['Sanctions', [
          'Breaking the rules may lead to a warning, a chat restriction, or a temporary or permanent ban. Serious violations may lead to a ban without warning.'
        ]],
        ['Content', [
          'Your games (moves and results) are public; others may view, analyse and download them as PGN. You are responsible for your messages and notes. You give us the right to store and display this content in order to provide the service.'
        ]],
        ['The service', [
          'ChessCaravan is free and provided “as is”. We do not guarantee uninterrupted operation, the absence of bugs, or that data will never be lost. We may change, suspend or close features. To the extent allowed by law, we are not liable for indirect damages related to the site.'
        ]],
        ['Closing your account', [
          'You can delete your account at any time via Settings → Account → “Delete account”. We may close accounts that break the rules.'
        ]],
        ['Changes and contact', [
          'If these terms change, the date on this page is updated; using the site after a change means you accept the new terms. Questions: {{contact}}.'
        ]]
      ]
    }
  },
  ru: {
    ui: { credits: "Авторы и лицензии", privacy: 'Политика конфиденциальности', terms: 'Условия использования', back: 'Вернуться на сайт', updated: 'Последнее обновление', contactNone: 'напишите администрации через кнопку «Пожаловаться» на сайте' },
    credits: {"intro":"ChessCaravan построен на библиотеках с открытым кодом и ресурсах со свободными лицензиями. Спасибо их авторам! Ниже — каждый сторонний ресурс сайта, его автор и лицензия.","code":"Программные библиотеки (в браузере)","assets":"Изображения, шрифты и данные","own":"Создано ChessCaravan","server":"Сервер: Node.js, Express, Socket.IO, PostgreSQL / SQLite и другие пакеты с открытым кодом (лицензии MIT, BSD, ISC, MPL-2.0) — пользователям не передаются.","gpl":"Часть под лицензией GPL (движок анализа Stockfish) используется без изменений; её исходный код доступен по ссылке выше.","ownText":"Все 11 наборов фигур (Karvon, Классика, Чёткий, Atlas, Rishton, Дерево, Royal, Neon, Геометрия, Bolajon, Пиксели), звуки ходов (синтезированы программно), логотип, иконки, узор атлас и картинка для ссылок."},
    privacy: {
      intro: 'ChessCaravan — сайт для игры в шахматы онлайн. Здесь объясняется, какие данные мы храним, зачем и как защищаем. Пользуясь сайтом, вы соглашаетесь с этой политикой.',
      sections: [
        ['Какие данные мы храним', [
          ['Аккаунт: имя пользователя, email (необязательно), пароль — только в зашифрованном виде (хеш bcrypt), страна, фото профиля и сведения, которые вы добавили в профиль.',
           'Партии: ходы, результаты, история рейтинга, статистика, достижения, прогнозы и оценки вежливости.',
           'Общение: личные сообщения, чаты клубов и партий, чат зрителей, жалобы.',
           'Технические данные: IP-адрес (только для ограничения числа запросов, временно в памяти сервера), задержка соединения, уходы со страницы во время партии и время ходов (для проверки честной игры).',
           'В вашем браузере (localStorage): токен входа, настройки и язык. Мы не используем cookie, рекламу и скрипты слежения (аналитику).']
        ]],
        ['Зачем мы их используем', [
          'Чтобы проводить партии, считать рейтинг и статистику, отправлять уведомления и письма для сброса пароля, бороться с нечестной игрой и оскорблениями и улучшать сайт. Мы не продаём ваши данные и не передаём их для рекламы.'
        ]],
        ['Что видят другие', [
          'Публично: имя пользователя, страна, фото профиля, рейтинги, статистика, партии и их ходы, клуб, достижения, счёт личных встреч. Email и пароль никому не показываются. Личные сообщения видят только два участника переписки. В настройках приватности вы выбираете, кто может писать вам и вызывать на игру.'
        ]],
        ['Сторонние сервисы', [
          ['Render — хостинг сайта.', 'Neon — база данных PostgreSQL.', 'Brevo — отправка писем для сброса пароля.', 'Cloudflare — домен chesscaravan.com и DNS (направляет адрес на сервер).', 'Telegram — только если вы подключите бота: передаются ID чата и тексты уведомлений.', 'Push-уведомления — только если вы их включите, через сервис браузера (Google, Apple, Mozilla).', "Ходы голосом — только если вы их включите: речь распознаёт сервис вашего браузера (например, Google в Chrome); мы не получаем и не храним записи.",
           'CDN для библиотек и шрифтов: cdnjs (Cloudflare), jsDelivr, unpkg, code.jquery.com, cdn.socket.io, Google Fonts; флаги — flagcdn.com; стикеры — Google Noto Emoji.',
           'По техническим причинам эти сервисы могут видеть ваш IP-адрес. Анализ партий (Stockfish) полностью работает в вашем браузере.']
        ]],
        ['Сроки хранения', [
          'Данные хранятся, пока существует ваш аккаунт. При удалении аккаунта профиль, партии, сообщения, друзья, уведомления и другие личные данные удаляются сразу. В истории ваших соперников эти партии остаются под анонимным именем, а очки вашего клуба в Битве флагов сохраняются без вашего имени. В резервных копиях хостинг-провайдеров данные могут храниться недолго.'
        ]],
        ['Ваши права', [
          ['Просматривать и изменять данные в профиле и настройках.', 'Скачивать свои партии в формате PGN.',
           'Полностью удалить аккаунт: Настройки → Аккаунт → «Удалить аккаунт».', 'Блокировать игроков и подавать жалобы.']
        ]],
        ['Безопасность', [
          'Сайт работает по HTTPS, пароли хранятся только в виде хешей bcrypt, токен входа действует 7 дней. Тем не менее ни одна система в интернете не защищена на 100% — не используйте этот пароль на других сайтах.'
        ]],
        ['Дети', [
          'Дети младше 13 лет могут пользоваться сайтом только с согласия родителей или опекунов.'
        ]],
        ['Изменения и контакты', [
          'При изменении политики дата на этой странице обновляется. По вопросам и запросам на удаление данных: {{contact}}.'
        ]]
      ]
    },
    terms: {
      intro: 'Пользуясь сайтом, вы соглашаетесь с условиями ниже. Если вы не согласны, пожалуйста, не пользуйтесь сайтом.',
      sections: [
        ['Аккаунт', [
          ['Указывайте верные данные при регистрации и никому не сообщайте пароль — вы отвечаете за действия в своём аккаунте.',
           'Запрещено создавать несколько аккаунтов для накрутки рейтинга.',
           'Запрещены оскорбительные, выдающие себя за других и рекламные имена пользователей.']
        ]],
        ['Честная игра', [
          ['Во время партии запрещено использовать шахматные программы (движки), советы других людей и любую внешнюю помощь.',
           'Запрещено намеренно проигрывать, договариваться о результате и манипулировать рейтингом.',
           'Сайт автоматически проверяет партии. Нарушители отмечаются или блокируются, а их соперникам возвращается потерянный рейтинг.']
        ]],
        ['Поведение', [
          ['Запрещены оскорбления, дискриминация, угрозы, спам, реклама, незаконный и непристойный контент.',
           'Запрещённые слова в чате скрываются автоматически; нарушителям могут временно ограничить чат.',
           'Вы можете заблокировать игрока и пожаловаться на него — жалобы рассматривает администрация.']
        ]],
        ['Меры', [
          'За нарушения возможны предупреждение, ограничение чата, временная или постоянная блокировка. За серьёзные нарушения возможна блокировка без предупреждения.'
        ]],
        ['Контент', [
          'Ваши партии (ходы и результаты) публичны; другие могут просматривать, анализировать и скачивать их в формате PGN. Вы отвечаете за свои сообщения и комментарии. Вы даёте нам право хранить и показывать этот контент для работы сервиса.'
        ]],
        ['Сервис', [
          'ChessCaravan бесплатен и предоставляется «как есть». Мы не гарантируем бесперебойную работу, отсутствие ошибок и полную сохранность данных. Мы можем изменять, приостанавливать или закрывать функции. В пределах, допустимых законом, мы не несём ответственности за косвенный ущерб, связанный с сайтом.'
        ]],
        ['Закрытие аккаунта', [
          'Вы можете в любой момент удалить аккаунт: Настройки → Аккаунт → «Удалить аккаунт». Мы можем закрывать аккаунты нарушителей.'
        ]],
        ['Изменения и контакты', [
          'При изменении условий дата на этой странице обновляется; пользование сайтом после изменений означает согласие с новыми условиями. Вопросы: {{contact}}.'
        ]]
      ]
    }
  },
  es: {
    ui: { credits: "Créditos y licencias", privacy: 'Política de privacidad', terms: 'Condiciones de uso', back: 'Volver al sitio', updated: 'Última actualización', contactNone: 'escribe a los administradores con el botón «Denunciar» del sitio' },
    credits: {"intro":"ChessCaravan está construido con bibliotecas de código abierto y recursos con licencias libres. ¡Gracias a sus autores! Abajo está cada recurso de terceros que usa el sitio, con su autor y licencia.","code":"Bibliotecas de software (en el navegador)","assets":"Imágenes, fuentes y datos","own":"Creado por ChessCaravan","server":"Servidor: Node.js, Express, Socket.IO, PostgreSQL / SQLite y otros paquetes de código abierto (licencias MIT, BSD, ISC, MPL-2.0); no se envían a los usuarios.","gpl":"La parte con licencia GPL (el motor de análisis Stockfish) se usa sin modificar; su código fuente está disponible en el enlace de arriba.","ownText":"Los 11 juegos de piezas (Karvon, Clásico, Nítido, Atlas, Rishton, Madera, Royal, Neon, Geométrico, Bolajon, Píxel), los sonidos de jugadas (sintetizados por código), el logotipo, los iconos, el patrón atlas y la imagen de vista previa."},
    privacy: {
      intro: 'ChessCaravan es un sitio de ajedrez en línea. Aquí explicamos qué datos guardamos, para qué y cómo los protegemos. Al usar el sitio aceptas esta política.',
      sections: [
        ['Qué datos guardamos', [
          ['Cuenta: nombre de usuario, email (opcional), contraseña — solo como hash cifrado bcrypt, país, foto de perfil y lo que añadas a tu perfil.',
           'Partidas: jugadas, resultados, historial de rating, estadísticas, logros, predicciones y votos de deportividad.',
           'Comunicación: mensajes privados, chats de club y de partida, chat de espectadores y denuncias.',
           'Técnicos: dirección IP (solo para limitar peticiones, temporalmente en la memoria del servidor), latencia, salidas de la página durante la partida y tiempos de jugada (para el control de juego limpio).',
           'En tu navegador (localStorage): token de sesión, ajustes e idioma. No usamos cookies, publicidad ni scripts de seguimiento (analítica).']
        ]],
        ['Para qué los usamos', [
          'Para jugar partidas, calcular rating y estadísticas, enviar notificaciones y emails de restablecimiento de contraseña, combatir trampas y abusos y mejorar el sitio. Nunca vendemos tus datos ni los cedemos para publicidad.'
        ]],
        ['Qué ven los demás', [
          'Público: nombre de usuario, país, foto, ratings, estadísticas, partidas y sus jugadas, club, logros y enfrentamientos directos. Tu email y contraseña nunca se muestran. Los mensajes privados solo los ven las dos personas de la conversación. En los ajustes de privacidad eliges quién puede escribirte o desafiarte.'
        ]],
        ['Servicios de terceros', [
          ['Render — alojamiento web.', 'Neon — base de datos PostgreSQL.', 'Brevo — envío de emails de restablecimiento de contraseña.', 'Cloudflare — el dominio chesscaravan.com y el DNS (dirige la dirección al servidor).', 'Telegram — solo si conectas el bot: se envían tu ID de chat y los textos de las notificaciones.', 'Notificaciones push — solo si las activas, a través del servicio de tu navegador (Google, Apple, Mozilla).', "Jugadas por voz — solo si las activas: el servicio de reconocimiento de voz de tu navegador (p. ej. Google en Chrome) convierte tu voz en texto; no recibimos ni guardamos grabaciones.",
           'CDN de bibliotecas y fuentes: cdnjs (Cloudflare), jsDelivr, unpkg, code.jquery.com, cdn.socket.io, Google Fonts; banderas — flagcdn.com; stickers — Google Noto Emoji.',
           'Por motivos técnicos estos servicios pueden ver tu IP. El análisis de partidas (Stockfish) funciona por completo en tu navegador.']
        ]],
        ['Cuánto tiempo los guardamos', [
          'Guardamos los datos mientras exista tu cuenta. Si eliminas tu cuenta, tu perfil, partidas, mensajes, amigos, notificaciones y demás datos personales se borran de inmediato. Esas partidas siguen en el historial de tus rivales con un nombre anónimo, y los puntos de tu club en la Batalla de banderas se conservan sin tu nombre. Las copias de seguridad de los proveedores pueden conservar datos poco tiempo.'
        ]],
        ['Tus derechos', [
          ['Ver y cambiar tus datos en tu perfil y ajustes.', 'Descargar tus partidas en formato PGN.',
           'Eliminar tu cuenta por completo: Ajustes → Cuenta → «Eliminar cuenta».', 'Bloquear y denunciar a otros jugadores.']
        ]],
        ['Seguridad', [
          'El sitio usa HTTPS, las contraseñas se guardan solo como hash bcrypt y el token de sesión dura 7 días. Aun así, ningún sistema en internet es 100 % seguro: no reutilices tu contraseña en otros sitios.'
        ]],
        ['Menores', [
          'Los menores de 13 años solo pueden usar el sitio con el consentimiento de sus padres o tutores.'
        ]],
        ['Cambios y contacto', [
          'Si esta política cambia, se actualiza la fecha de esta página. Dudas y solicitudes de borrado de datos: {{contact}}.'
        ]]
      ]
    },
    terms: {
      intro: 'Al usar el sitio aceptas las condiciones siguientes. Si no estás de acuerdo, por favor no uses el sitio.',
      sections: [
        ['Cuenta', [
          ['Da datos correctos al registrarte y no compartas tu contraseña: eres responsable de lo que ocurra en tu cuenta.',
           'No se permite crear varias cuentas para inflar el rating.',
           'No se permiten nombres ofensivos, que suplanten a otros o publicitarios.']
        ]],
        ['Juego limpio', [
          ['Durante la partida no se permite usar motores de ajedrez, consejos de otras personas ni ninguna ayuda externa.',
           'No se permite perder a propósito, pactar resultados ni manipular el rating.',
           'El sitio revisa las partidas automáticamente. Los tramposos son marcados o expulsados y sus rivales recuperan el rating perdido.']
        ]],
        ['Comportamiento', [
          ['No se permiten insultos, discriminación, amenazas, spam, publicidad ni contenido ilegal u obsceno.',
           'Las palabras prohibidas se ocultan automáticamente en el chat; los infractores pueden ser silenciados temporalmente.',
           'Puedes bloquear y denunciar a otros jugadores; los administradores revisan las denuncias.']
        ]],
        ['Sanciones', [
          'Incumplir las normas puede suponer un aviso, la restricción del chat o una expulsión temporal o permanente. Las faltas graves pueden sancionarse sin aviso.'
        ]],
        ['Contenido', [
          'Tus partidas (jugadas y resultados) son públicas; otros pueden verlas, analizarlas y descargarlas en PGN. Eres responsable de tus mensajes y notas. Nos das derecho a guardar y mostrar ese contenido para prestar el servicio.'
        ]],
        ['El servicio', [
          'ChessCaravan es gratuito y se ofrece «tal cual». No garantizamos un funcionamiento ininterrumpido, la ausencia de errores ni que nunca se pierdan datos. Podemos cambiar, suspender o cerrar funciones. En la medida permitida por la ley, no respondemos de daños indirectos relacionados con el sitio.'
        ]],
        ['Cierre de la cuenta', [
          'Puedes eliminar tu cuenta en cualquier momento en Ajustes → Cuenta → «Eliminar cuenta». Podemos cerrar cuentas que incumplan las normas.'
        ]],
        ['Cambios y contacto', [
          'Si estas condiciones cambian, se actualiza la fecha de esta página; usar el sitio después supone aceptar las nuevas condiciones. Dudas: {{contact}}.'
        ]]
      ]
    }
  },
  de: {
    ui: { credits: "Mitwirkende & Lizenzen", privacy: 'Datenschutzerklärung', terms: 'Nutzungsbedingungen', back: 'Zurück zur Website', updated: 'Zuletzt aktualisiert', contactNone: 'schreibe den Administratoren über die Schaltfläche „Melden“ auf der Website' },
    credits: {"intro":"ChessCaravan basiert auf Open-Source-Bibliotheken und frei lizenzierten Ressourcen. Danke an ihre Autoren! Unten steht jede fremde Ressource der Seite mit Autor und Lizenz.","code":"Software-Bibliotheken (im Browser)","assets":"Bilder, Schriften und Daten","own":"Von ChessCaravan erstellt","server":"Server: Node.js, Express, Socket.IO, PostgreSQL / SQLite und weitere Open-Source-Pakete (Lizenzen MIT, BSD, ISC, MPL-2.0) — sie werden nicht an Nutzer ausgeliefert.","gpl":"Der GPL-lizenzierte Teil (die Stockfish-Analyse-Engine) wird unverändert verwendet; sein Quellcode ist über den Link oben verfügbar.","ownText":"Alle 11 Figurensätze (Karvon, Klassisch, Deutlich, Atlas, Rishton, Holz, Royal, Neon, Geometrisch, Bolajon, Pixel), Zugklänge (per Code synthetisiert), Logo, Icons, das Atlas-Muster und das Linkvorschaubild."},
    privacy: {
      intro: 'ChessCaravan ist eine Online-Schach-Website. Hier erklären wir, welche Daten wir speichern, wofür und wie wir sie schützen. Mit der Nutzung der Website stimmst du dieser Erklärung zu.',
      sections: [
        ['Welche Daten wir speichern', [
          ['Konto: Benutzername, E-Mail (optional), Passwort — nur als verschlüsselter bcrypt-Hash, Land, Profilbild und deine Profilangaben.',
           'Partien: Züge, Ergebnisse, Wertungsverlauf, Statistiken, Erfolge, Tipps und Fairness-Bewertungen.',
           'Kommunikation: private Nachrichten, Klub- und Partie-Chats, Zuschauer-Chat und Meldungen.',
           'Technisch: IP-Adresse (nur zur Begrenzung von Anfragen, vorübergehend im Serverspeicher), Verbindungslatenz, Verlassen der Seite während einer Partie und Zugzeiten (für Fair-Play-Prüfungen).',
           'In deinem Browser (localStorage): Anmelde-Token, Einstellungen und Sprache. Wir nutzen keine Cookies, keine Werbung und keine Tracking- bzw. Analyse-Skripte.']
        ]],
        ['Wofür wir sie nutzen', [
          'Um Partien durchzuführen, Wertungen und Statistiken zu berechnen, Benachrichtigungen und E-Mails zum Zurücksetzen des Passworts zu senden, Betrug und Missbrauch zu bekämpfen und die Website zu verbessern. Wir verkaufen deine Daten nie und geben sie nicht für Werbung weiter.'
        ]],
        ['Was andere sehen', [
          'Öffentlich: Benutzername, Land, Profilbild, Wertungen, Statistiken, Partien und ihre Züge, Klub, Erfolge und direkte Vergleiche. E-Mail und Passwort werden nie angezeigt. Private Nachrichten sehen nur die beiden Gesprächspartner. In den Datenschutzeinstellungen legst du fest, wer dir schreiben oder dich herausfordern darf.'
        ]],
        ['Dienste von Drittanbietern', [
          ['Render — Webhosting.', 'Neon — PostgreSQL-Datenbank.', 'Brevo — Versand von E-Mails zum Zurücksetzen des Passworts.', 'Cloudflare — die Domain chesscaravan.com und DNS (leitet die Adresse zum Server).', 'Telegram — nur wenn du den Bot verbindest: Chat-ID und Benachrichtigungstexte werden gesendet.', 'Push-Benachrichtigungen — nur wenn du sie aktivierst, über den Dienst deines Browsers (Google, Apple, Mozilla).', "Sprachzüge — nur wenn du sie aktivierst: deine Sprache wird vom Spracherkennungsdienst deines Browsers (z. B. Google in Chrome) in Text umgewandelt; wir erhalten oder speichern keine Aufnahmen.",
           'CDNs für Bibliotheken und Schriften: cdnjs (Cloudflare), jsDelivr, unpkg, code.jquery.com, cdn.socket.io, Google Fonts; Flaggen — flagcdn.com; Sticker — Google Noto Emoji.',
           'Aus technischen Gründen können diese Dienste deine IP-Adresse sehen. Die Partieanalyse (Stockfish) läuft vollständig in deinem Browser.']
        ]],
        ['Speicherdauer', [
          'Wir speichern die Daten, solange dein Konto besteht. Löschst du dein Konto, werden Profil, Partien, Nachrichten, Freunde, Benachrichtigungen und weitere persönliche Daten sofort gelöscht. In den Verläufen deiner Gegner bleiben diese Partien unter einem anonymen Namen, und die Punkte deines Klubs in der Flaggenschlacht bleiben ohne deinen Namen erhalten. Backups der Hosting-Anbieter können Daten kurzzeitig enthalten.'
        ]],
        ['Deine Rechte', [
          ['Deine Daten im Profil und in den Einstellungen ansehen und ändern.', 'Deine Partien als PGN-Datei herunterladen.',
           'Dein Konto vollständig löschen: Einstellungen → Konto → „Konto löschen“.', 'Andere Spieler blockieren und melden.']
        ]],
        ['Sicherheit', [
          'Die Website nutzt HTTPS, Passwörter werden nur als bcrypt-Hash gespeichert und das Anmelde-Token gilt 7 Tage. Dennoch ist kein System im Internet zu 100 % sicher — bitte verwende dein Passwort nicht auf anderen Websites.'
        ]],
        ['Kinder', [
          'Kinder unter 13 Jahren dürfen die Website nur mit Zustimmung eines Elternteils oder Erziehungsberechtigten nutzen.'
        ]],
        ['Änderungen und Kontakt', [
          'Ändert sich diese Erklärung, wird das Datum auf dieser Seite aktualisiert. Fragen und Anträge auf Datenlöschung: {{contact}}.'
        ]]
      ]
    },
    terms: {
      intro: 'Mit der Nutzung der Website akzeptierst du die folgenden Bedingungen. Wenn du nicht einverstanden bist, nutze die Website bitte nicht.',
      sections: [
        ['Konto', [
          ['Gib bei der Registrierung korrekte Angaben an und teile dein Passwort mit niemandem — du bist für alles verantwortlich, was in deinem Konto geschieht.',
           'Mehrere Konten zur künstlichen Steigerung der Wertung sind nicht erlaubt.',
           'Beleidigende, fremde Identitäten vortäuschende oder werbende Benutzernamen sind nicht erlaubt.']
        ]],
        ['Fair Play', [
          ['Während einer Partie sind Schachprogramme (Engines), Ratschläge anderer und jede fremde Hilfe verboten.',
           'Absichtliches Verlieren, abgesprochene Ergebnisse und Wertungsmanipulation sind verboten.',
           'Die Website prüft Partien automatisch. Betrüger werden markiert oder gesperrt, und ihre Gegner erhalten verlorene Wertungspunkte zurück.']
        ]],
        ['Verhalten', [
          ['Beleidigungen, Diskriminierung, Drohungen, Spam, Werbung sowie illegale und obszöne Inhalte sind verboten.',
           'Verbotene Wörter werden im Chat automatisch ausgeblendet; Regelbrecher können vorübergehend stummgeschaltet werden.',
           'Du kannst andere Spieler blockieren und melden — Administratoren prüfen die Meldungen.']
        ]],
        ['Maßnahmen', [
          'Regelverstöße können zu einer Verwarnung, einer Chat-Einschränkung oder einer vorübergehenden bzw. dauerhaften Sperre führen. Schwere Verstöße können ohne Verwarnung zu einer Sperre führen.'
        ]],
        ['Inhalte', [
          'Deine Partien (Züge und Ergebnisse) sind öffentlich; andere können sie ansehen, analysieren und als PGN herunterladen. Für deine Nachrichten und Notizen bist du selbst verantwortlich. Du räumst uns das Recht ein, diese Inhalte zur Bereitstellung des Dienstes zu speichern und anzuzeigen.'
        ]],
        ['Der Dienst', [
          'ChessCaravan ist kostenlos und wird „wie besehen“ bereitgestellt. Wir garantieren keinen unterbrechungsfreien Betrieb, keine Fehlerfreiheit und keinen dauerhaften Datenerhalt. Wir können Funktionen ändern, aussetzen oder einstellen. Soweit gesetzlich zulässig, haften wir nicht für mittelbare Schäden im Zusammenhang mit der Website.'
        ]],
        ['Konto schließen', [
          'Du kannst dein Konto jederzeit unter Einstellungen → Konto → „Konto löschen“ löschen. Wir können Konten schließen, die gegen die Regeln verstoßen.'
        ]],
        ['Änderungen und Kontakt', [
          'Ändern sich diese Bedingungen, wird das Datum auf dieser Seite aktualisiert; die weitere Nutzung bedeutet die Annahme der neuen Bedingungen. Fragen: {{contact}}.'
        ]]
      ]
    }
  },
  fr: {
    ui: { credits: "Crédits et licences", privacy: 'Politique de confidentialité', terms: "Conditions d'utilisation", back: 'Retour au site', updated: 'Dernière mise à jour', contactNone: 'écrivez aux administrateurs avec le bouton « Signaler » du site' },
    credits: {"intro":"ChessCaravan repose sur des bibliothèques open source et des ressources sous licence libre. Merci à leurs auteurs ! Voici chaque ressource tierce utilisée par le site, avec son auteur et sa licence.","code":"Bibliothèques logicielles (dans le navigateur)","assets":"Images, polices et données","own":"Créé par ChessCaravan","server":"Serveur : Node.js, Express, Socket.IO, PostgreSQL / SQLite et d’autres paquets open source (licences MIT, BSD, ISC, MPL-2.0) — ils ne sont pas transmis aux utilisateurs.","gpl":"La partie sous licence GPL (le moteur d’analyse Stockfish) est utilisée sans modification ; son code source est disponible via le lien ci-dessus.","ownText":"Les 11 jeux de pièces (Karvon, Classique, Net, Atlas, Rishton, Bois, Royal, Néon, Géométrique, Bolajon, Pixel), les sons de coups (synthétisés par code), le logo, les icônes, le motif atlas et l’image d’aperçu."},
    privacy: {
      intro: "ChessCaravan est un site d'échecs en ligne. Cette page explique quelles données nous conservons, pourquoi et comment nous les protégeons. En utilisant le site, vous acceptez cette politique.",
      sections: [
        ['Données conservées', [
          ["Compte : nom d'utilisateur, email (facultatif), mot de passe — uniquement sous forme de hachage bcrypt, pays, photo de profil et ce que vous ajoutez à votre profil.",
           'Parties : coups, résultats, historique du classement, statistiques, succès, pronostics et votes de fair-play.',
           'Communication : messages privés, chats de club et de partie, chat des spectateurs et signalements.',
           'Données techniques : adresse IP (uniquement pour limiter les requêtes, temporairement en mémoire du serveur), latence, sorties de la page pendant une partie et temps de jeu (pour le contrôle du fair-play).',
           "Dans votre navigateur (localStorage) : jeton de connexion, réglages et langue. Nous n'utilisons ni cookies, ni publicité, ni scripts de suivi (analytique)."]
        ]],
        ['Pourquoi nous les utilisons', [
          "Pour organiser les parties, calculer classements et statistiques, envoyer des notifications et des emails de réinitialisation du mot de passe, lutter contre la triche et les abus, et améliorer le site. Nous ne vendons jamais vos données et ne les partageons pas à des fins publicitaires."
        ]],
        ['Ce que voient les autres', [
          "Public : nom d'utilisateur, pays, photo, classements, statistiques, parties et leurs coups, club, succès et confrontations directes. Votre email et votre mot de passe ne sont jamais affichés. Les messages privés ne sont visibles que par les deux participants. Dans les réglages de confidentialité, vous choisissez qui peut vous écrire ou vous défier."
        ]],
        ['Services tiers', [
          ['Render — hébergement.', 'Neon — base de données PostgreSQL.', 'Brevo — envoi des emails de réinitialisation du mot de passe.', 'Cloudflare — le domaine chesscaravan.com et le DNS (dirige l’adresse vers le serveur).', 'Telegram — uniquement si vous connectez le bot : votre ID de chat et les textes des notifications sont envoyés.', 'Notifications push — uniquement si vous les activez, via le service de votre navigateur (Google, Apple, Mozilla).', "Coups à la voix — uniquement si vous les activez : votre voix est transcrite par le service de reconnaissance vocale de votre navigateur (par ex. Google dans Chrome) ; nous ne recevons ni ne conservons d’enregistrement.",
           'CDN pour les bibliothèques et les polices : cdnjs (Cloudflare), jsDelivr, unpkg, code.jquery.com, cdn.socket.io, Google Fonts ; drapeaux — flagcdn.com ; stickers — Google Noto Emoji.',
           "Pour des raisons techniques, ces services peuvent voir votre adresse IP. L'analyse des parties (Stockfish) s'exécute entièrement dans votre navigateur."]
        ]],
        ['Durée de conservation', [
          "Nous conservons les données tant que votre compte existe. Si vous supprimez votre compte, votre profil, vos parties, messages, amis, notifications et autres données personnelles sont supprimés immédiatement. Ces parties restent dans l'historique de vos adversaires sous un nom anonyme, et les points de votre club dans la Bataille des drapeaux sont conservés sans votre nom. Les sauvegardes des hébergeurs peuvent conserver des données pendant une courte durée."
        ]],
        ['Vos droits', [
          ['Consulter et modifier vos données dans votre profil et vos réglages.', 'Télécharger vos parties au format PGN.',
           'Supprimer définitivement votre compte : Réglages → Compte → « Supprimer le compte ».', "Bloquer et signaler d'autres joueurs."]
        ]],
        ['Sécurité', [
          "Le site utilise HTTPS, les mots de passe sont stockés uniquement sous forme de hachage bcrypt et le jeton de connexion est valable 7 jours. Aucun système sur internet n'est sûr à 100 % : n'utilisez pas ce mot de passe sur d'autres sites."
        ]],
        ['Enfants', [
          "Les enfants de moins de 13 ans ne peuvent utiliser le site qu'avec l'accord d'un parent ou d'un tuteur."
        ]],
        ['Modifications et contact', [
          'Si cette politique change, la date de cette page est mise à jour. Questions et demandes de suppression de données : {{contact}}.'
        ]]
      ]
    },
    terms: {
      intro: "En utilisant le site, vous acceptez les conditions ci-dessous. Si vous n'êtes pas d'accord, veuillez ne pas utiliser le site.",
      sections: [
        ['Compte', [
          ["Fournissez des informations exactes lors de l'inscription et ne partagez jamais votre mot de passe : vous êtes responsable de ce qui se passe sur votre compte.",
           'Créer plusieurs comptes pour gonfler son classement est interdit.',
           "Les noms d'utilisateur injurieux, usurpant l'identité d'autrui ou publicitaires sont interdits."]
        ]],
        ['Fair-play', [
          ["Pendant une partie, l'utilisation de moteurs d'échecs, des conseils d'autres personnes ou de toute aide extérieure est interdite.",
           'Perdre volontairement, arranger les résultats et manipuler le classement est interdit.',
           'Le site vérifie automatiquement les parties. Les tricheurs sont signalés ou bannis, et leurs adversaires récupèrent les points perdus.']
        ]],
        ['Comportement', [
          ['Insultes, discriminations, menaces, spam, publicité et contenus illégaux ou obscènes sont interdits.',
           "Les mots interdits sont masqués automatiquement dans le chat ; les contrevenants peuvent être réduits au silence temporairement.",
           "Vous pouvez bloquer et signaler d'autres joueurs — les administrateurs examinent les signalements."]
        ]],
        ['Sanctions', [
          "Enfreindre les règles peut entraîner un avertissement, une restriction du chat ou un bannissement temporaire ou définitif. Les infractions graves peuvent être sanctionnées sans avertissement."
        ]],
        ['Contenu', [
          "Vos parties (coups et résultats) sont publiques ; d'autres peuvent les consulter, les analyser et les télécharger en PGN. Vous êtes responsable de vos messages et notes. Vous nous accordez le droit de conserver et d'afficher ce contenu pour fournir le service."
        ]],
        ['Le service', [
          "ChessCaravan est gratuit et fourni « en l'état ». Nous ne garantissons ni un fonctionnement ininterrompu, ni l'absence de bogues, ni la conservation permanente des données. Nous pouvons modifier, suspendre ou fermer des fonctionnalités. Dans les limites permises par la loi, nous ne sommes pas responsables des dommages indirects liés au site."
        ]],
        ['Fermeture du compte', [
          'Vous pouvez supprimer votre compte à tout moment via Réglages → Compte → « Supprimer le compte ». Nous pouvons fermer les comptes qui enfreignent les règles.'
        ]],
        ['Modifications et contact', [
          "Si ces conditions changent, la date de cette page est mise à jour ; utiliser le site après une modification vaut acceptation des nouvelles conditions. Questions : {{contact}}."
        ]]
      ]
    }
  }
};
// Türkçe (inglizcha matndan tarjima)
window.LEGAL_TEXT.tr = {
  ui: { credits: 'Katkıda bulunanlar ve lisanslar', privacy: 'Gizlilik Politikası', terms: 'Kullanım Koşulları', back: 'Siteye dön', updated: 'Son güncelleme', contactNone: 'sitedeki “Şikâyet et” düğmesiyle yöneticilere yaz' },
  credits: {"intro":"ChessCaravan açık kaynak kütüphaneler ve özgür lisanslı kaynaklar üzerine kuruludur. Yazarlarına teşekkürler! Aşağıda sitenin kullandığı tüm üçüncü taraf kaynaklar, yazarları ve lisanslarıyla birlikte yer alıyor.","code":"Yazılım kütüphaneleri (tarayıcıda)","assets":"Resimler, yazı tipleri ve veriler","own":"ChessCaravan yapımı","server":"Sunucu: Node.js, Express, Socket.IO, PostgreSQL / SQLite ve diğer açık kaynak paketler (MIT, BSD, ISC, MPL-2.0 lisansları) — bunlar kullanıcılara gönderilmez.","gpl":"GPL lisanslı kısım (Stockfish analiz motoru) değiştirilmeden kullanılır; kaynak kodu yukarıdaki bağlantıda mevcuttur.","ownText":"11 taş takımının tamamı (Karvon, Klasik, Net, Atlas, Rişton, Ahşap, Royal, Neon, Geometrik, Bolajon, Piksel), hamle sesleri (kodla sentezlenmiş), logo, simgeler, atlas deseni ve bağlantı önizleme resmi."},
  privacy: {
    intro: 'ChessCaravan bir çevrim içi satranç sitesidir. Bu sayfa hangi verileri, neden sakladığımızı ve onları nasıl koruduğumuzu açıklar. Siteyi kullanarak bu politikayı kabul etmiş olursun.',
    sections: [
      ['Ne saklıyoruz', [
        ['Hesap: kullanıcı adı, e-posta (isteğe bağlı), şifre — yalnızca şifrelenmiş bcrypt özeti olarak, ülke, profil fotoğrafı ve profiline eklediğin her şey.',
         'Oyunlar: hamleler, sonuçlar, puan geçmişi, istatistikler, başarılar, tahminler ve centilmenlik oyları.',
         'İletişim: özel mesajlar, kulüp ve oyun sohbetleri, izleyici sohbeti ve şikâyetler.',
         'Teknik: IP adresi (yalnızca istekleri sınırlamak için, sunucu belleğinde geçici olarak), bağlantı gecikmesi, oyun sırasında sayfadan ayrılma ve hamle süreleri (fair-play kontrolü için).',
         'Tarayıcında (localStorage): giriş anahtarın, ayarların ve dilin. Çerez, reklam veya takip (analitik) betikleri kullanmıyoruz.']
      ]],
      ['Neden kullanıyoruz', [
        'Oyunları yürütmek, puanları ve istatistikleri hesaplamak, bildirim ve şifre sıfırlama e-postaları göndermek, hile ve kötüye kullanımla mücadele etmek ve siteyi geliştirmek için. Verilerini asla satmayız ve reklam için paylaşmayız.'
      ]],
      ['Başkaları neyi görebilir', [
        'Herkese açık: kullanıcı adı, ülke, profil fotoğrafı, puanlar, istatistikler, oyunlar ve hamleleri, kulüp, başarılar ve karşılıklı skorlar. E-postan ve şifren asla gösterilmez. Özel mesajları yalnızca sohbetteki iki kişi görür. Gizlilik ayarlarında sana kimin mesaj atabileceğini veya meydan okuyabileceğini seçersin.'
      ]],
      ['Üçüncü taraf hizmetler', [
        ['Render — web barındırma.', 'Neon — PostgreSQL veritabanı.', 'Brevo — şifre sıfırlama e-postalarının gönderimi.', 'Cloudflare — chesscaravan.com alan adı ve DNS (adresi sunucuya yönlendirir).', 'Telegram — yalnızca botu bağlarsan: sohbet kimliğin ve bildirim metinleri gönderilir.', 'Anlık bildirimler — yalnızca açarsan, tarayıcı sağlayıcın (Google, Apple, Mozilla) üzerinden.', 'Sesle hamle — yalnızca açarsan: konuşman tarayıcının konuşma tanıma hizmeti (örneğin Chrome’da Google) tarafından metne çevrilir; kayıtları asla almayız ve saklamayız.',
         'Kütüphaneler ve yazı tipleri için CDN’ler: cdnjs (Cloudflare), jsDelivr, unpkg, code.jquery.com, cdn.socket.io, Google Fonts; bayraklar — flagcdn.com; çıkartmalar — Google Noto Emoji.',
         'Teknik nedenlerle bu hizmetler IP adresini görebilir. Oyun analizi (Stockfish) tamamen tarayıcında çalışır.']
      ]],
      ['Verileri ne kadar saklıyoruz', [
        'Hesabın var olduğu sürece verileri saklarız. Hesabını silersen profilin, oyunların, mesajların, arkadaşların, bildirimlerin ve diğer kişisel verilerin hemen silinir. Bu oyunlar rakiplerinin geçmişinde anonim bir adla kalır ve kulübünün Bayraklar Yarışı puanları adın olmadan korunur. Barındırma sağlayıcılarının yedekleri verileri kısa bir süre tutabilir.'
      ]],
      ['Hakların', [
        ['Verilerini Profil ve Ayarlar’da görüntüle ve değiştir.', 'Oyunlarını PGN dosyası olarak indir.',
         'Hesabını tamamen sil: Ayarlar → Hesap → “Hesabı sil”.', 'Diğer oyuncuları engelle ve şikâyet et.']
      ]],
      ['Güvenlik', [
        'Site HTTPS kullanır, şifreler yalnızca bcrypt özeti olarak saklanır ve giriş anahtarı 7 gün geçerlidir. Yine de internette hiçbir sistem %100 güvenli değildir — lütfen şifreni başka sitelerde kullanma.'
      ]],
      ['Çocuklar', [
        '13 yaşından küçük çocuklar siteyi yalnızca ebeveyn veya vasilerinin izniyle kullanabilir.'
      ]],
      ['Değişiklikler ve iletişim', [
        'Bu politika değişirse bu sayfadaki tarih güncellenir. Sorular ve veri silme talepleri için: {{contact}}.'
      ]]
    ]
  },
  terms: {
    intro: 'Siteyi kullanarak aşağıdaki koşulları kabul etmiş olursun. Kabul etmiyorsan lütfen siteyi kullanma.',
    sections: [
      ['Hesap', [
        ['Kayıt olurken doğru bilgi ver ve şifreni asla paylaşma — hesabında olanlardan sen sorumlusun.',
         'Puanı şişirmek için birden fazla hesap açmak yasaktır.',
         'Hakaret içeren, başkasını taklit eden veya reklam yapan kullanıcı adları yasaktır.']
      ]],
      ['Fair play', [
        ['Oyun sırasında satranç motoru, başkalarının tavsiyesi veya herhangi bir dış yardım kullanmak yasaktır.',
         'Bilerek kaybetmek, sonuç ayarlamak ve puanla oynamak yasaktır.',
         'Site oyunları otomatik olarak kontrol eder. Hile yaptığı tespit edilen oyuncular işaretlenir veya yasaklanır, rakipleri ise kaybettikleri puanı geri alır.']
      ]],
      ['Davranış', [
        ['Hakaret, ayrımcılık, tehdit, spam, reklam, yasa dışı ve müstehcen içerik yasaktır.',
         'Yasaklı kelimeler sohbette otomatik olarak gizlenir; kuralı çiğneyenler geçici olarak susturulabilir.',
         'Diğer oyuncuları engelleyebilir ve şikâyet edebilirsin — şikâyetleri yöneticiler inceler.']
      ]],
      ['Yaptırımlar', [
        'Kuralları çiğnemek uyarıya, sohbet kısıtlamasına veya geçici ya da kalıcı yasağa yol açabilir. Ciddi ihlaller uyarısız yasakla sonuçlanabilir.'
      ]],
      ['İçerik', [
        'Oyunların (hamleler ve sonuçlar) herkese açıktır; başkaları onları görebilir, analiz edebilir ve PGN olarak indirebilir. Mesajlarından ve notlarından sen sorumlusun. Hizmeti sunabilmemiz için bu içeriği saklama ve gösterme hakkını bize vermiş olursun.'
      ]],
      ['Hizmet', [
        'ChessCaravan ücretsizdir ve “olduğu gibi” sunulur. Kesintisiz çalışmayı, hata olmamasını veya verilerin asla kaybolmayacağını garanti etmeyiz. Özellikleri değiştirebilir, askıya alabilir veya kapatabiliriz. Yasanın izin verdiği ölçüde siteyle ilgili dolaylı zararlardan sorumlu değiliz.'
      ]],
      ['Hesabın kapatılması', [
        'Hesabını istediğin zaman Ayarlar → Hesap → “Hesabı sil” yoluyla silebilirsin. Kuralları çiğneyen hesapları kapatabiliriz.'
      ]],
      ['Değişiklikler ve iletişim', [
        'Bu koşullar değişirse bu sayfadaki tarih güncellenir; değişiklikten sonra siteyi kullanmak yeni koşulları kabul ettiğin anlamına gelir. Sorular: {{contact}}.'
      ]]
    ]
  }
};
// Қазақша (inglizcha matndan tarjima)
window.LEGAL_TEXT.kk = {
  ui: { credits: 'Авторлар мен лицензиялар', privacy: 'Құпиялылық саясаты', terms: 'Пайдалану шарттары', back: 'Сайтқа оралу', updated: 'Соңғы жаңарту', contactNone: 'сайттағы «Шағым» түймесі арқылы әкімшілерге жазыңыз' },
  credits: {"intro":"ChessCaravan ашық бастапқы кодты кітапханалар мен еркін лицензиялы ресурстарға негізделген. Олардың авторларына рақмет! Төменде сайт пайдаланатын барлық бөгде ресурс авторы және лицензиясымен көрсетілген.","code":"Бағдарламалық кітапханалар (браузерде)","assets":"Суреттер, қаріптер және деректер","own":"ChessCaravan жасаған","server":"Сервер: Node.js, Express, Socket.IO, PostgreSQL / SQLite және басқа ашық бастапқы кодты пакеттер (MIT, BSD, ISC, MPL-2.0 лицензиялары) — олар пайдаланушыларға жіберілмейді.","gpl":"GPL лицензиялы бөлік (Stockfish талдау қозғалтқышы) өзгеріссіз пайдаланылады; оның бастапқы коды жоғарыдағы сілтемеде қолжетімді.","ownText":"Барлық 11 фигура жиынтығы (Karvon, Классикалық, Анық, Atlas, Rishton, Ағаш, Royal, Neon, Геометриялық, Bolajon, Пиксель), жүріс дыбыстары (кодпен синтезделген), логотип, белгішелер, атлас өрнегі және сілтемені алдын ала қарау суреті."},
  privacy: {
    intro: 'ChessCaravan — онлайн шахмат сайты. Бұл бет біз қандай деректерді, не үшін сақтайтынымызды және оларды қалай қорғайтынымызды түсіндіреді. Сайтты пайдалану арқылы сіз осы саясатпен келісесіз.',
    sections: [
      ['Біз не сақтаймыз', [
        ['Аккаунт: пайдаланушы аты, email (міндетті емес), құпиясөз — тек шифрланған bcrypt хэші түрінде, ел, профиль суреті және профиліңізге қосқан басқа мәліметтер.',
         'Ойындар: жүрістер, нәтижелер, рейтинг тарихы, статистика, жетістіктер, болжамдар және әдеп дауыстары.',
         'Қарым-қатынас: жеке хабарламалар, клуб және ойын чаттары, көрермендер чаты және шағымдар.',
         'Техникалық: IP мекенжайы (тек сұрауларды шектеу үшін, сервер жадында уақытша), байланыс кідірісі, ойын кезінде беттен шығу және жүріс уақыттары (адал ойынды тексеру үшін).',
         'Браузеріңізде (localStorage): кіру токені, баптаулар және тіл. Біз cookie, жарнама немесе бақылау (аналитика) скрипттерін пайдаланбаймыз.']
      ]],
      ['Не үшін пайдаланамыз', [
        'Ойындарды өткізу, рейтинг пен статистиканы есептеу, хабарландырулар мен құпиясөзді қалпына келтіру хаттарын жіберу, алаяқтық пен теріс пайдалануға қарсы күресу және сайтты жақсарту үшін. Деректеріңізді ешқашан сатпаймыз және жарнама үшін бермейміз.'
      ]],
      ['Басқалар нені көре алады', [
        'Жария: пайдаланушы аты, ел, профиль суреті, рейтингтер, статистика, ойындар мен олардың жүрістері, клуб, жетістіктер және өзара есептер. Email мен құпиясөзіңіз ешқашан көрсетілмейді. Жеке хабарламаларды тек әңгімедегі екі адам көреді. Құпиялылық баптауларында сізге кім жаза алатынын немесе ойынға шақыра алатынын таңдайсыз.'
      ]],
      ['Бөгде қызметтер', [
        ['Render — веб-хостинг.', 'Neon — PostgreSQL дерекқоры.', 'Brevo — құпиясөзді қалпына келтіру хаттарын жіберу.', 'Cloudflare — chesscaravan.com домені және DNS (мекенжайды серверге бағыттайды).', 'Telegram — тек ботты қоссаңыз: чат ID-іңіз және хабарландыру мәтіндері жіберіледі.', 'Push-хабарландырулар — тек қоссаңыз, браузер жеткізушісі (Google, Apple, Mozilla) арқылы.', 'Дауыспен жүру — тек қоссаңыз: сөзіңізді браузеріңіздің сөйлеуді тану қызметі (мысалы, Chrome-да Google) мәтінге айналдырады; біз жазбаларды ешқашан алмаймыз және сақтамаймыз.',
         'Кітапханалар мен қаріптерге арналған CDN-дер: cdnjs (Cloudflare), jsDelivr, unpkg, code.jquery.com, cdn.socket.io, Google Fonts; тулар — flagcdn.com; стикерлер — Google Noto Emoji.',
         'Техникалық себептермен бұл қызметтер IP мекенжайыңызды көре алады. Ойын талдауы (Stockfish) толығымен браузеріңізде жұмыс істейді.']
      ]],
      ['Деректерді қанша уақыт сақтаймыз', [
        'Аккаунтыңыз бар болғанша деректерді сақтаймыз. Аккаунтты жойсаңыз, профиль, ойындар, хабарламалар, достар, хабарландырулар және басқа жеке деректер бірден жойылады. Бұл ойындар қарсыластарыңыздың тарихында жасырын атпен қалады, ал клубыңыздың Тулар жарысындағы ұпайлары атыңызсыз сақталады. Хостинг жеткізушілерінің сақтық көшірмелері деректерді қысқа уақыт сақтауы мүмкін.'
      ]],
      ['Сіздің құқықтарыңыз', [
        ['Деректеріңізді Профиль мен Баптауларда қарап, өзгертіңіз.', 'Ойындарыңызды PGN файлы ретінде жүктеп алыңыз.',
         'Аккаунтыңызды толық жойыңыз: Баптаулар → Аккаунт → «Аккаунтты жою».', 'Басқа ойыншыларды бұғаттаңыз және шағымданыңыз.']
      ]],
      ['Қауіпсіздік', [
        'Сайт HTTPS пайдаланады, құпиясөздер тек bcrypt хэші түрінде сақталады, ал кіру токені 7 күн жарамды. Дегенмен интернетте ешбір жүйе 100% қауіпсіз емес — құпиясөзіңізді басқа сайттарда қайталамаңыз.'
      ]],
      ['Балалар', [
        '13 жасқа толмаған балалар сайтты тек ата-анасының немесе қамқоршысының келісімімен пайдалана алады.'
      ]],
      ['Өзгерістер және байланыс', [
        'Бұл саясат өзгерсе, осы беттегі күн жаңартылады. Сұрақтар мен деректерді жою туралы өтініштер үшін: {{contact}}.'
      ]]
    ]
  },
  terms: {
    intro: 'Сайтты пайдалану арқылы сіз төмендегі шарттармен келісесіз. Келіспесеңіз, сайтты пайдаланбаңыз.',
    sections: [
      ['Аккаунт', [
        ['Тіркелу кезінде шынайы мәлімет беріңіз және құпиясөзіңізді ешкімге бермеңіз — аккаунтыңыздағы әрекеттерге өзіңіз жауаптысыз.',
         'Рейтингті көтеру үшін бірнеше аккаунт ашуға тыйым салынады.',
         'Қорлайтын, басқа адамға еліктейтін немесе жарнамалық пайдаланушы аттарына тыйым салынады.']
      ]],
      ['Адал ойын', [
        ['Ойын кезінде шахмат қозғалтқыштарын, басқалардың кеңесін немесе кез келген сыртқы көмекті пайдалануға тыйым салынады.',
         'Әдейі ұтылу, нәтижені алдын ала келісу және рейтингпен айла жасауға тыйым салынады.',
         'Сайт ойындарды автоматты түрде тексереді. Алаяқтығы анықталған ойыншылар белгіленеді немесе бұғатталады, ал олардың қарсыластарына жоғалтқан рейтингі қайтарылады.']
      ]],
      ['Мінез-құлық', [
        ['Қорлау, кемсіту, қорқыту, спам, жарнама, заңсыз және әдепсіз мазмұнға тыйым салынады.',
         'Тыйым салынған сөздер чатта автоматты түрде жасырылады; ережені бұзушылар уақытша дыбыссыз етілуі мүмкін.',
         'Басқа ойыншыларды бұғаттап, шағымдана аласыз — шағымдарды әкімшілер қарайды.']
      ]],
      ['Шаралар', [
        'Ережелерді бұзу ескертуге, чатты шектеуге немесе уақытша не мәңгілік бұғаттауға әкелуі мүмкін. Ауыр бұзушылықтар ескертусіз бұғаттауға әкелуі мүмкін.'
      ]],
      ['Мазмұн', [
        'Ойындарыңыз (жүрістер мен нәтижелер) жария; басқалар оларды көріп, талдап, PGN ретінде жүктеп ала алады. Хабарламаларыңыз бен жазбаларыңызға өзіңіз жауаптысыз. Қызметті ұсыну үшін бізге осы мазмұнды сақтау және көрсету құқығын бересіз.'
      ]],
      ['Қызмет', [
        'ChessCaravan тегін және «сол күйінде» ұсынылады. Біз үздіксіз жұмысқа, қателердің болмауына немесе деректердің ешқашан жоғалмайтынына кепілдік бермейміз. Мүмкіндіктерді өзгертуіміз, тоқтата тұруымыз немесе жабуымыз мүмкін. Заң рұқсат еткен шекте сайтқа байланысты жанама залал үшін жауап бермейміз.'
      ]],
      ['Аккаунтты жабу', [
        'Аккаунтыңызды кез келген уақытта Баптаулар → Аккаунт → «Аккаунтты жою» арқылы жоя аласыз. Ережені бұзған аккаунттарды жабуымыз мүмкін.'
      ]],
      ['Өзгерістер және байланыс', [
        'Бұл шарттар өзгерсе, осы беттегі күн жаңартылады; өзгерістен кейін сайтты пайдалану жаңа шарттарды қабылдағаныңызды білдіреді. Сұрақтар: {{contact}}.'
      ]]
    ]
  }
};
// Тоҷикӣ (inglizcha matndan tarjima)
window.LEGAL_TEXT.tg = {
  ui: { credits: 'Муаллифон ва иҷозатномаҳо', privacy: 'Сиёсати махфият', terms: 'Шартҳои истифода', back: 'Бозгашт ба сайт', updated: 'Навсозии охирин', contactNone: 'тавассути тугмаи «Шикоят» дар сайт ба маъмурон нависед' },
  credits: {"intro":"ChessCaravan ба китобхонаҳои кушодаманбаъ ва захираҳои дорои иҷозатномаи озод такя мекунад. Ба муаллифони онҳо ташаккур! Дар поён ҳамаи захираҳои беруние, ки сайт истифода мебарад, бо муаллиф ва иҷозатномаашон оварда шудаанд.","code":"Китобхонаҳои барномавӣ (дар браузер)","assets":"Тасвирҳо, ҳуруфот ва маълумот","own":"Сохти ChessCaravan","server":"Сервер: Node.js, Express, Socket.IO, PostgreSQL / SQLite ва дигар бастаҳои кушодаманбаъ (иҷозатномаҳои MIT, BSD, ISC, MPL-2.0) — онҳо ба корбарон фиристода намешаванд.","gpl":"Қисми дорои иҷозатномаи GPL (муҳаррики таҳлили Stockfish) бе тағйир истифода мешавад; коди манбаи он дар истиноди боло дастрас аст.","ownText":"Ҳамаи 11 маҷмӯи дона (Karvon, Classic, Равшан, Atlas, Rishton, Wood, Royal, Neon, Geo, Bolajon, Pixel), садоҳои юриш (бо код синтез шудаанд), логотип, нишонаҳо, нақши атлас ва тасвири пешнамоиши истинод."},
  privacy: {
    intro: 'ChessCaravan сайти шоҳмоти онлайн аст. Ин саҳифа шарҳ медиҳад, ки мо кадом маълумотро, барои чӣ нигоҳ медорем ва чӣ гуна онро ҳифз мекунем. Бо истифодаи сайт шумо ба ин сиёсат розӣ мешавед.',
    sections: [
      ['Мо чиро нигоҳ медорем', [
        ['Ҳисоб: номи корбар, email (ихтиёрӣ), парол — танҳо ҳамчун ҳэши рамзгузоришудаи bcrypt, кишвар, акси профил ва ҳар чизе, ки ба профил илова мекунед.',
         'Бозиҳо: юришҳо, натиҷаҳо, таърихи рейтинг, омор, дастовардҳо, пешгӯиҳо ва овозҳои одоб.',
         'Муошират: паёмҳои шахсӣ, чатҳои клуб ва бозӣ, чати тамошобинон ва шикоятҳо.',
         'Техникӣ: суроғаи IP (танҳо барои маҳдуд кардани дархостҳо, муваққатан дар хотираи сервер), таъхири пайваст, тарк кардани саҳифа ҳангоми бозӣ ва вақти юришҳо (барои санҷиши бозии ҳалол).',
         'Дар браузери шумо (localStorage): токени воридшавӣ, танзимот ва забон. Мо cookie, реклама ё скриптҳои пайгирӣ (аналитика) истифода намебарем.']
      ]],
      ['Барои чӣ истифода мебарем', [
        'Барои гузаронидани бозиҳо, ҳисоб кардани рейтинг ва омор, фиристодани огоҳиномаҳо ва мактубҳои барқарорсозии парол, мубориза бо фиреб ва сӯиистифода ва беҳтар кардани сайт. Мо маълумоти шуморо ҳеҷ гоҳ намефурӯшем ва барои реклама намедиҳем.'
      ]],
      ['Дигарон чиро дида метавонанд', [
        'Ошкоро: номи корбар, кишвар, акси профил, рейтингҳо, омор, бозиҳо ва юришҳои онҳо, клуб, дастовардҳо ва ҳисоби мутақобил. Email ва пароли шумо ҳеҷ гоҳ нишон дода намешаванд. Паёмҳои шахсиро танҳо ду нафари суҳбат мебинанд. Дар танзимоти махфият интихоб мекунед, ки кӣ ба шумо навишта ё даъват карда метавонад.'
      ]],
      ['Хидматҳои беруна', [
        ['Render — хостинги веб.', 'Neon — пойгоҳи додаҳои PostgreSQL.', 'Brevo — фиристодани мактубҳои барқарорсозии парол.', 'Cloudflare — домени chesscaravan.com ва DNS (суроғаро ба сервер равона мекунад).', 'Telegram — танҳо агар ботро пайваст кунед: ID-и чат ва матни огоҳиномаҳо фиристода мешаванд.', 'Огоҳиномаҳои push — танҳо агар фаъол кунед, тавассути таъминкунандаи браузер (Google, Apple, Mozilla).', 'Юриш бо овоз — танҳо агар фаъол кунед: нутқи шуморо хидмати шинохти нутқи браузер (масалан, Google дар Chrome) ба матн табдил медиҳад; мо сабтҳоро ҳеҷ гоҳ намегирем ва нигоҳ намедорем.',
         'CDN-ҳо барои китобхонаҳо ва ҳуруфот: cdnjs (Cloudflare), jsDelivr, unpkg, code.jquery.com, cdn.socket.io, Google Fonts; парчамҳо — flagcdn.com; стикерҳо — Google Noto Emoji.',
         'Бо сабабҳои техникӣ ин хидматҳо метавонанд суроғаи IP-и шуморо бинанд. Таҳлили бозӣ (Stockfish) пурра дар браузери шумо кор мекунад.']
      ]],
      ['Маълумотро то кай нигоҳ медорем', [
        'То даме ки ҳисоби шумо вуҷуд дорад, маълумотро нигоҳ медорем. Агар ҳисобро нест кунед, профил, бозиҳо, паёмҳо, дӯстон, огоҳиномаҳо ва дигар маълумоти шахсӣ фавран нест мешаванд. Ин бозиҳо дар таърихи рақибон бо номи номаълум мемонанд ва холҳои клубатон дар Мусобиқаи парчамҳо бе номи шумо боқӣ мемонанд. Нусхаҳои эҳтиётии хостинг метавонанд маълумотро муддати кӯтоҳ нигоҳ доранд.'
      ]],
      ['Ҳуқуқҳои шумо', [
        ['Маълумоти худро дар Профил ва Танзимот бинед ва тағйир диҳед.', 'Бозиҳоятонро ҳамчун файли PGN боргирӣ кунед.',
         'Ҳисобатонро пурра нест кунед: Танзимот → Ҳисоб → «Нест кардани ҳисоб».', 'Бозингарони дигарро манъ кунед ва шикоят кунед.']
      ]],
      ['Амният', [
        'Сайт HTTPS-ро истифода мебарад, паролҳо танҳо ҳамчун ҳэши bcrypt нигоҳ дошта мешаванд ва токени воридшавӣ 7 рӯз эътибор дорад. Бо вуҷуди ин, ҳеҷ системаи интернетӣ 100% бехатар нест — пароли худро дар сайтҳои дигар такрор накунед.'
      ]],
      ['Кӯдакон', [
        'Кӯдакони то 13-сола сайтро танҳо бо розигии волидон ё сарпараст истифода бурда метавонанд.'
      ]],
      ['Тағйирот ва тамос', [
        'Агар ин сиёсат тағйир ёбад, санаи ин саҳифа нав мешавад. Барои саволҳо ва дархостҳои нест кардани маълумот: {{contact}}.'
      ]]
    ]
  },
  terms: {
    intro: 'Бо истифодаи сайт шумо ба шартҳои зерин розӣ мешавед. Агар розӣ набошед, лутфан сайтро истифода набаред.',
    sections: [
      ['Ҳисоб', [
        ['Ҳангоми бақайдгирӣ маълумоти дуруст диҳед ва пароли худро ба касе надиҳед — шумо барои амалҳо дар ҳисобатон масъулед.',
         'Сохтани якчанд ҳисоб барои баланд бардоштани рейтинг манъ аст.',
         'Номҳои корбари таҳқиромез, тақлидкунанда ё рекламавӣ манъ аст.']
      ]],
      ['Бозии ҳалол', [
        ['Ҳангоми бозӣ истифодаи муҳаррикҳои шоҳмот, маслиҳати дигарон ё ҳар гуна кӯмаки беруна манъ аст.',
         'Қасдан бохтан, натиҷаро пешакӣ созиш кардан ва фиреб бо рейтинг манъ аст.',
         'Сайт бозиҳоро худкор тафтиш мекунад. Бозингарони фиребгар қайд ё манъ карда мешаванд ва ба рақибонашон рейтинги аздастрафта баргардонида мешавад.']
      ]],
      ['Рафтор', [
        ['Таҳқир, табъиз, таҳдид, спам, реклама, мундариҷаи ғайриқонунӣ ва қабеҳ манъ аст.',
         'Калимаҳои манъшуда дар чат худкор пӯшонида мешаванд; вайронкунандагон метавонанд муваққатан хомӯш карда шаванд.',
         'Шумо метавонед бозингарони дигарро манъ кунед ва шикоят кунед — шикоятҳоро маъмурон баррасӣ мекунанд.']
      ]],
      ['Чораҳо', [
        'Вайрон кардани қоидаҳо метавонад ба огоҳӣ, маҳдудияти чат ё манъи муваққатӣ ё доимӣ оварда расонад. Вайронкориҳои ҷиддӣ метавонанд бе огоҳӣ ба манъ оварда расонанд.'
      ]],
      ['Мундариҷа', [
        'Бозиҳои шумо (юришҳо ва натиҷаҳо) ошкоранд; дигарон метавонанд онҳоро бинанд, таҳлил кунанд ва ҳамчун PGN боргирӣ кунанд. Шумо барои паёмҳо ва қайдҳои худ масъулед. Барои пешниҳоди хидмат шумо ба мо ҳуқуқи нигоҳ доштан ва нишон додани ин мундариҷаро медиҳед.'
      ]],
      ['Хидмат', [
        'ChessCaravan ройгон ва «ҳамон тавре ки ҳаст» пешниҳод мешавад. Мо кори бефосила, набудани хатоҳо ё ҳеҷ гоҳ гум нашудани маълумотро кафолат намедиҳем. Мо метавонем имкониятҳоро тағйир диҳем, боздорем ё пӯшем. Дар доираи иҷозати қонун мо барои зарари ғайримустақими марбут ба сайт ҷавобгар нестем.'
      ]],
      ['Бастани ҳисоб', [
        'Шумо метавонед ҳисобатонро ҳар вақт тавассути Танзимот → Ҳисоб → «Нест кардани ҳисоб» нест кунед. Мо метавонем ҳисобҳои қоидашиканро бандем.'
      ]],
      ['Тағйирот ва тамос', [
        'Агар ин шартҳо тағйир ёбанд, санаи ин саҳифа нав мешавад; истифодаи сайт пас аз тағйирот маънои қабули шартҳои навро дорад. Саволҳо: {{contact}}.'
      ]]
    ]
  }
};
// Кыргызча (inglizcha matndan tarjima)
window.LEGAL_TEXT.ky = {
  ui: { credits: 'Авторлор жана лицензиялар', privacy: 'Купуялык саясаты', terms: 'Колдонуу шарттары', back: 'Сайтка кайтуу', updated: 'Акыркы жаңыртуу', contactNone: 'сайттагы «Даттануу» баскычы аркылуу администраторлорго жазыңыз' },
  credits: {"intro":"ChessCaravan ачык булактуу китепканаларга жана эркин лицензиялуу ресурстарга таянат. Алардын авторлоруна рахмат! Төмөндө сайт колдонгон бардык тышкы ресурстар автору жана лицензиясы менен көрсөтүлгөн.","code":"Программалык китепканалар (браузерде)","assets":"Сүрөттөр, арип жана маалыматтар","own":"ChessCaravan жасаган","server":"Сервер: Node.js, Express, Socket.IO, PostgreSQL / SQLite жана башка ачык булактуу пакеттер (MIT, BSD, ISC, MPL-2.0 лицензиялары) — алар колдонуучуларга жөнөтүлбөйт.","gpl":"GPL лицензиясындагы бөлүк (Stockfish талдоо кыймылдаткычы) өзгөртүүсүз колдонулат; анын баштапкы коду жогорудагы шилтемеде жеткиликтүү.","ownText":"Бардык 11 фигура топтому (Karvon, Classic, Ачык, Atlas, Rishton, Wood, Royal, Neon, Geo, Bolajon, Pixel), жүрүш үндөрү (код менен синтезделген), логотип, сөлөкөттөр, атлас оймосу жана шилтемени алдын ала көрүү сүрөтү."},
  privacy: {
    intro: 'ChessCaravan — онлайн шахмат сайты. Бул барак кандай маалыматтарды, эмне үчүн сактай турганыбызды жана аларды кантип коргой турганыбызды түшүндүрөт. Сайтты колдонуу менен сиз бул саясатка макул болосуз.',
    sections: [
      ['Биз эмнени сактайбыз', [
        ['Аккаунт: колдонуучу аты, email (милдеттүү эмес), сырсөз — шифрленген bcrypt хэши катары гана, өлкө, профиль сүрөтү жана профилге кошкон башка маалыматтар.',
         'Оюндар: жүрүштөр, жыйынтыктар, рейтинг тарыхы, статистика, жетишкендиктер, божомолдор жана адеп добуштары.',
         'Байланыш: жеке билдирүүлөр, клуб жана оюн чаттары, көрүүчүлөр чаты жана даттануулар.',
         'Техникалык: IP дареги (сурамдарды чектөө үчүн гана, сервердин эсинде убактылуу), байланыштын кечигүүсү, оюн учурунда барактан чыгуу жана жүрүштөрдүн убактысы (адилет оюнду текшерүү үчүн).',
         'Браузериңизде (localStorage): кирүү токени, жөндөөлөр жана тил. Биз cookie, жарнама же көзөмөлдөө (аналитика) скрипттерин колдонбойбуз.']
      ]],
      ['Эмне үчүн колдонобуз', [
        'Оюндарды өткөрүү, рейтинг жана статистиканы эсептөө, билдирмелерди жана сырсөздү калыбына келтирүү каттарын жөнөтүү, алдамчылык жана кыянаттык менен күрөшүү жана сайтты жакшыртуу үчүн. Биз маалыматыңызды эч качан сатпайбыз жана жарнама үчүн бербейбиз.'
      ]],
      ['Башкалар эмнени көрө алат', [
        'Ачык: колдонуучу аты, өлкө, профиль сүрөтү, рейтингдер, статистика, оюндар жана алардын жүрүштөрү, клуб, жетишкендиктер жана өз ара эсептер. Email жана сырсөзүңүз эч качан көрсөтүлбөйт. Жеке билдирүүлөрдү маектеги эки адам гана көрөт. Купуялык жөндөөлөрүндө сизге ким жаза аларын же оюнга чакыра аларын тандайсыз.'
      ]],
      ['Тышкы кызматтар', [
        ['Render — веб-хостинг.', 'Neon — PostgreSQL маалымат базасы.', 'Brevo — сырсөздү калыбына келтирүү каттарын жөнөтүү.', 'Cloudflare — chesscaravan.com домени жана DNS (даректи серверге багыттайт).', 'Telegram — ботту туташтырсаңыз гана: чат ID жана билдирме тексттери жөнөтүлөт.', 'Push-билдирмелер — күйгүзсөңүз гана, браузериңиздин камсыздоочусу (Google, Apple, Mozilla) аркылуу.', 'Үн менен жүрүү — күйгүзсөңүз гана: сөзүңүздү браузериңиздин сүйлөөнү таануу кызматы (мисалы, Chrome’до Google) текстке айлантат; биз жазууларды эч качан албайбыз жана сактабайбыз.',
         'Китепканалар жана арип үчүн CDN’дер: cdnjs (Cloudflare), jsDelivr, unpkg, code.jquery.com, cdn.socket.io, Google Fonts; желектер — flagcdn.com; стикерлер — Google Noto Emoji.',
         'Техникалык себептерден бул кызматтар IP дарегиңизди көрүшү мүмкүн. Оюн талдоосу (Stockfish) толугу менен браузериңизде иштейт.']
      ]],
      ['Маалыматты канча убакыт сактайбыз', [
        'Аккаунтуңуз бар болгонго чейин маалыматты сактайбыз. Аккаунтту өчүрсөңүз, профиль, оюндар, билдирүүлөр, достор, билдирмелер жана башка жеке маалыматтар дароо өчүрүлөт. Бул оюндар атаандаштарыңыздын тарыхында белгисиз ат менен калат, ал эми клубуңуздун Желектер жарышындагы упайлары атыңызсыз сакталат. Хостинг камсыздоочуларынын камдык көчүрмөлөрү маалыматты кыска убакыт сакташы мүмкүн.'
      ]],
      ['Сиздин укуктарыңыз', [
        ['Маалыматтарыңызды Профилде жана Жөндөөлөрдө көрүп, өзгөртүңүз.', 'Оюндарыңызды PGN файлы катары жүктөп алыңыз.',
         'Аккаунтуңузду толугу менен өчүрүңүз: Жөндөөлөр → Аккаунт → «Аккаунтту өчүрүү».', 'Башка оюнчуларды бөгөттөп, даттаныңыз.']
      ]],
      ['Коопсуздук', [
        'Сайт HTTPS колдонот, сырсөздөр bcrypt хэши катары гана сакталат, ал эми кирүү токени 7 күн жарактуу. Ошентсе да интернетте эч бир система 100% коопсуз эмес — сырсөзүңүздү башка сайттарда кайталабаңыз.'
      ]],
      ['Балдар', [
        '13 жашка чейинки балдар сайтты ата-энесинин же камкорчусунун макулдугу менен гана колдоно алат.'
      ]],
      ['Өзгөртүүлөр жана байланыш', [
        'Бул саясат өзгөрсө, ушул барактагы күн жаңыртылат. Суроолор жана маалыматты өчүрүү өтүнүчтөрү үчүн: {{contact}}.'
      ]]
    ]
  },
  terms: {
    intro: 'Сайтты колдонуу менен сиз төмөнкү шарттарга макул болосуз. Макул болбосоңуз, сайтты колдонбоңуз.',
    sections: [
      ['Аккаунт', [
        ['Катталууда туура маалымат бериңиз жана сырсөзүңүздү эч кимге бербеңиз — аккаунтуңуздагы аракеттерге өзүңүз жооптуусуз.',
         'Рейтингди көтөрүү үчүн бир нече аккаунт ачууга тыюу салынат.',
         'Кордогон, башка адамды туурап жасалган же жарнамалык колдонуучу аттарына тыюу салынат.']
      ]],
      ['Адилет оюн', [
        ['Оюн учурунда шахмат кыймылдаткычтарын, башкалардын кеңешин же кандайдыр бир тышкы жардамды колдонууга тыюу салынат.',
         'Атайылап утулуу, жыйынтыкты алдын ала макулдашуу жана рейтинг менен айла кылууга тыюу салынат.',
         'Сайт оюндарды автоматтык түрдө текшерет. Алдамчылыгы аныкталган оюнчулар белгиленет же бөгөттөлөт, ал эми алардын атаандаштарына жоготкон рейтинги кайтарылат.']
      ]],
      ['Жүрүм-турум', [
        ['Кордоо, басмырлоо, коркутуу, спам, жарнама, мыйзамсыз жана уятсыз мазмунга тыюу салынат.',
         'Тыюу салынган сөздөр чатта автоматтык түрдө жашырылат; бузуучулар убактылуу үнсүз кылынышы мүмкүн.',
         'Башка оюнчуларды бөгөттөп, даттана аласыз — даттанууларды администраторлор карайт.']
      ]],
      ['Чаралар', [
        'Эрежелерди бузуу эскертүүгө, чатты чектөөгө же убактылуу же түбөлүк бөгөттөөгө алып келиши мүмкүн. Олуттуу бузуулар эскертүүсүз бөгөттөөгө алып келиши мүмкүн.'
      ]],
      ['Мазмун', [
        'Оюндарыңыз (жүрүштөр жана жыйынтыктар) ачык; башкалар аларды көрүп, талдап, PGN катары жүктөп ала алат. Билдирүүлөрүңүз жана жазууларыңыз үчүн өзүңүз жооптуусуз. Кызматты көрсөтүү үчүн бизге бул мазмунду сактоо жана көрсөтүү укугун бересиз.'
      ]],
      ['Кызмат', [
        'ChessCaravan акысыз жана «кандай болсо ошондой» сунушталат. Биз үзгүлтүксүз иштөөгө, каталардын жоктугуна же маалыматтын эч качан жоголбоосуна кепилдик бербейбиз. Мүмкүнчүлүктөрдү өзгөртүшүбүз, токтотушубуз же жабышыбыз мүмкүн. Мыйзам уруксат берген чекте сайтка байланыштуу кыйыр зыян үчүн жооп бербейбиз.'
      ]],
      ['Аккаунтту жабуу', [
        'Аккаунтуңузду каалаган убакта Жөндөөлөр → Аккаунт → «Аккаунтту өчүрүү» аркылуу өчүрө аласыз. Эрежелерди бузган аккаунттарды жабышыбыз мүмкүн.'
      ]],
      ['Өзгөртүүлөр жана байланыш', [
        'Бул шарттар өзгөрсө, ушул барактагы күн жаңыртылат; өзгөртүүдөн кийин сайтты колдонуу жаңы шарттарды кабыл алганыңызды билдирет. Суроолор: {{contact}}.'
      ]]
    ]
  }
};
// Türkmençe (inglizcha matndan tarjima)
window.LEGAL_TEXT.tk = {
  ui: { credits: 'Awtorlar we ygtyýarnamalar', privacy: 'Gizlinlik syýasaty', terms: 'Ulanyş şertleri', back: 'Saýta dolan', updated: 'Soňky täzelenme', contactNone: 'saýtdaky «Arz» düwmesi arkaly administratorlara ýazyň' },
  credits: {"intro":"ChessCaravan açyk çeşmeli kitaphanalara we erkin ygtyýarnamaly serişdelere esaslanýar. Olaryň awtorlaryna sag bolsun! Aşakda saýtyň ulanýan ähli daşary serişdeleri awtory we ygtyýarnamasy bilen görkezilen.","code":"Programma kitaphanalary (brauzerde)","assets":"Suratlar, şriftler we maglumatlar","own":"ChessCaravan tarapyndan döredilen","server":"Serwer: Node.js, Express, Socket.IO, PostgreSQL / SQLite we beýleki açyk çeşmeli bukjalar (MIT, BSD, ISC, MPL-2.0 ygtyýarnamalary) — olar ulanyjylara iberilmeýär.","gpl":"GPL ygtyýarnamaly bölek (Stockfish derňew hereketlendirijisi) üýtgedilmän ulanylýar; onuň çeşme kody ýokardaky salgyda elýeterli.","ownText":"Ähli 11 daş toplumy (Karvon, Classic, Aýdyň, Atlas, Rishton, Wood, Royal, Neon, Geo, Bolajon, Pixel), ýöriş sesleri (kod bilen sintezlenen), logotip, nyşanlar, atlas nagyşy we salgyny öňünden görkeziş suraty."},
  privacy: {
    intro: 'ChessCaravan — onlaýn küşt saýty. Bu sahypa haýsy maglumatlary, näme üçin saklaýandygymyzy we olary nähili goraýandygymyzy düşündirýär. Saýty ulanmak bilen siz bu syýasata razylaşýarsyňyz.',
    sections: [
      ['Näme saklaýarys', [
        ['Hasap: ulanyjy ady, email (hökmany däl), açar söz — diňe şifrlenen bcrypt heşi görnüşinde, ýurt, profil suraty we profile goşan beýleki maglumatlaryňyz.',
         'Oýunlar: ýörişler, netijeler, reýting taryhy, statistika, üstünlikler, çaklamalar we edep sesleri.',
         'Aragatnaşyk: şahsy habarlar, klub we oýun çatlary, tomaşaçylaryň çaty we arzlar.',
         'Tehniki: IP salgysy (diňe haýyşlary çäklendirmek üçin, serweriň ýadynda wagtlaýyn), birikmäniň gijikmesi, oýun wagtynda sahypadan çykmak we ýöriş wagtlary (dogruçyl oýny barlamak üçin).',
         'Brauzeriňizde (localStorage): giriş tokeni, sazlamalar we dil. Biz cookie, mahabat ýa-da yzarlaýyş (analitika) skriptlerini ulanmaýarys.']
      ]],
      ['Näme üçin ulanýarys', [
        'Oýunlary geçirmek, reýtingi we statistikany hasaplamak, bildirişleri we açar sözi dikeltmek hatlaryny ibermek, aldaw we hyýanatçylyk bilen göreşmek hem-de saýty gowulandyrmak üçin. Maglumatlaryňyzy hiç haçan satmaýarys we mahabat üçin bermeýäris.'
      ]],
      ['Beýlekiler näme görüp biler', [
        'Açyk: ulanyjy ady, ýurt, profil suraty, reýtingler, statistika, oýunlar we olaryň ýörişleri, klub, üstünlikler we özara hasaplar. Email-iňiz we açar sözüňiz hiç haçan görkezilmeýär. Şahsy habarlary diňe söhbetdäki iki adam görýär. Gizlinlik sazlamalarynda size kimiň ýazyp ýa-da oýna çagyryp biljekdigini saýlaýarsyňyz.'
      ]],
      ['Daşary hyzmatlar', [
        ['Render — web hosting.', 'Neon — PostgreSQL maglumatlar binasy.', 'Brevo — açar sözi dikeltmek hatlaryny ibermek.', 'Cloudflare — chesscaravan.com domeni we DNS (salgyny serwere ugrukdyrýar).', 'Telegram — diňe boty birikdirseňiz: çat ID-iňiz we bildiriş tekstleri iberilýär.', 'Push bildirişleri — diňe ýaksaňyz, brauzeriňiziň üpjün edijisi (Google, Apple, Mozilla) arkaly.', 'Ses bilen ýöriş — diňe ýaksaňyz: sözüňizi brauzeriňiziň gürlemäni tanaýyş hyzmaty (meselem, Chrome-da Google) tekste öwürýär; biz ýazgylary hiç haçan almaýarys we saklamaýarys.',
         'Kitaphanalar we şriftler üçin CDN-ler: cdnjs (Cloudflare), jsDelivr, unpkg, code.jquery.com, cdn.socket.io, Google Fonts; baýdaklar — flagcdn.com; stikerler — Google Noto Emoji.',
         'Tehniki sebäplere görä bu hyzmatlar IP salgyňyzy görüp biler. Oýun derňewi (Stockfish) doly brauzeriňizde işleýär.']
      ]],
      ['Maglumatlary näçe wagt saklaýarys', [
        'Hasabyňyz bar wagty maglumatlary saklaýarys. Hasaby pozsaňyz, profil, oýunlar, habarlar, dostlar, bildirişler we beýleki şahsy maglumatlar derrew pozulýar. Bu oýunlar garşydaşlaryňyzyň taryhynda näbelli at bilen galýar, klubuňyzyň Baýdaklar bäsleşigindäki utuklary bolsa adyňyzsyz saklanýar. Hosting üpjün edijileriniň ätiýaçlyk nusgalary maglumatlary gysga wagt saklap biler.'
      ]],
      ['Hukuklaryňyz', [
        ['Maglumatlaryňyzy Profilde we Sazlamalarda görüň we üýtgediň.', 'Oýunlaryňyzy PGN faýly hökmünde ýükläň.',
         'Hasabyňyzy doly pozuň: Sazlamalar → Hasap → «Hasaby poz».', 'Beýleki oýunçylary petikläň we arz ediň.']
      ]],
      ['Howpsuzlyk', [
        'Saýt HTTPS ulanýar, açar sözler diňe bcrypt heşi görnüşinde saklanýar we giriş tokeni 7 gün hereket edýär. Şeýle-de bolsa internetde hiç bir ulgam 100% howpsuz däl — açar sözüňizi başga saýtlarda gaýtalamaň.'
      ]],
      ['Çagalar', [
        '13 ýaşa çenli çagalar saýty diňe ene-atasynyň ýa-da hossarynyň razylygy bilen ulanyp biler.'
      ]],
      ['Üýtgeşmeler we habarlaşmak', [
        'Bu syýasat üýtgese, şu sahypadaky sene täzelenýär. Soraglar we maglumatlary pozmak baradaky haýyşlar üçin: {{contact}}.'
      ]]
    ]
  },
  terms: {
    intro: 'Saýty ulanmak bilen siz aşakdaky şertlere razylaşýarsyňyz. Razy bolmasaňyz, saýty ulanmaň.',
    sections: [
      ['Hasap', [
        ['Hasaba alnanyňyzda dogry maglumat beriň we açar sözüňizi hiç kime bermäň — hasabyňyzdaky hereketler üçin özüňiz jogapkär.',
         'Reýtingi ýokarlandyrmak üçin birnäçe hasap açmak gadagan.',
         'Kemsidiji, başga birine öýkünýän ýa-da mahabat häsiýetli ulanyjy atlary gadagan.']
      ]],
      ['Dogruçyl oýun', [
        ['Oýun wagtynda küşt hereketlendirijilerini, başgalaryň maslahatyny ýa-da islendik daşary kömegi ulanmak gadagan.',
         'Bilkastlaýyn utulmak, netijäni öňünden ylalaşmak we reýting bilen hile etmek gadagan.',
         'Saýt oýunlary awtomatik barlaýar. Aldaw edendigi anyklanan oýunçylar bellenýär ýa-da petiklenýär, olaryň garşydaşlaryna bolsa ýitiren reýtingi gaýtarylýar.']
      ]],
      ['Özüňi alyp barmak', [
        ['Kemsitme, diskriminasiýa, haýbat, spam, mahabat, bikanun we edepsiz mazmun gadagan.',
         'Gadagan sözler çatda awtomatik gizlenýär; düzgün bozujylaryň sesi wagtlaýyn öçürilip bilner.',
         'Beýleki oýunçylary petikläp we arz edip bilersiňiz — arzlara administratorlar seredýär.']
      ]],
      ['Çäreler', [
        'Düzgünleri bozmak duýduryşa, çaty çäklendirmäge ýa-da wagtlaýyn ýa-da hemişelik petiklemäge getirip biler. Agyr bozulmalar duýduryşsyz petiklemäge getirip biler.'
      ]],
      ['Mazmun', [
        'Oýunlaryňyz (ýörişler we netijeler) açyk; beýlekiler olary görüp, derňäp we PGN hökmünde ýükläp biler. Habarlaryňyz we bellikleriňiz üçin özüňiz jogapkär. Hyzmaty bermek üçin bize bu mazmuny saklamak we görkezmek hukugyny berýärsiňiz.'
      ]],
      ['Hyzmat', [
        'ChessCaravan mugt we «bar bolşy ýaly» hödürlenýär. Biz kesgitsiz işlemegi, ýalňyşlyklaryň bolmazlygyny ýa-da maglumatlaryň hiç haçan ýitmejekdigini kepillendirmeýäris. Mümkinçilikleri üýtgedip, togtadyp ýa-da ýapyp bileris. Kanunyň rugsat berýän çäginde saýt bilen bagly gytaklaýyn zyýan üçin jogapkär däldiris.'
      ]],
      ['Hasaby ýapmak', [
        'Hasabyňyzy islendik wagt Sazlamalar → Hasap → «Hasaby poz» arkaly pozup bilersiňiz. Düzgünleri bozýan hasaplary ýapyp bileris.'
      ]],
      ['Üýtgeşmeler we habarlaşmak', [
        'Bu şertler üýtgese, şu sahypadaky sene täzelenýär; üýtgeşmeden soň saýty ulanmak täze şertleri kabul edendigiňizi aňladýar. Soraglar: {{contact}}.'
      ]]
    ]
  }
};
// Azərbaycanca (inglizcha matndan tarjima)
window.LEGAL_TEXT.az = {
  ui: { credits: 'Müəlliflər və lisenziyalar', privacy: 'Məxfilik siyasəti', terms: 'İstifadə şərtləri', back: 'Sayta qayıt', updated: 'Son yenilənmə', contactNone: 'saytdakı «Şikayət» düyməsi ilə adminlərə yaz' },
  credits: {"intro":"ChessCaravan açıq mənbəli kitabxanalar və azad lisenziyalı resurslar üzərində qurulub. Onların müəlliflərinə təşəkkürlər! Aşağıda saytın istifadə etdiyi bütün kənar resurslar müəllifi və lisenziyası ilə göstərilib.","code":"Proqram kitabxanaları (brauzerdə)","assets":"Şəkillər, şriftlər və məlumatlar","own":"ChessCaravan tərəfindən hazırlanıb","server":"Server: Node.js, Express, Socket.IO, PostgreSQL / SQLite və digər açıq mənbəli paketlər (MIT, BSD, ISC, MPL-2.0 lisenziyaları) — onlar istifadəçilərə göndərilmir.","gpl":"GPL lisenziyalı hissə (Stockfish təhlil mühərriki) dəyişdirilmədən istifadə olunur; onun mənbə kodu yuxarıdakı keçiddə mövcuddur.","ownText":"Bütün 11 fiqur dəsti (Karvon, Classic, Aydın, Atlas, Rishton, Wood, Royal, Neon, Geo, Bolajon, Pixel), gediş səsləri (kodla sintez edilib), loqotip, ikonlar, atlas naxışı və keçid önizləmə şəkli."},
  privacy: {
    intro: 'ChessCaravan onlayn şahmat saytıdır. Bu səhifə hansı məlumatları, nə üçün saxladığımızı və onları necə qoruduğumuzu izah edir. Saytdan istifadə etməklə bu siyasətlə razılaşırsan.',
    sections: [
      ['Nə saxlayırıq', [
        ['Hesab: istifadəçi adı, e-poçt (könüllü), şifrə — yalnız şifrələnmiş bcrypt heşi kimi, ölkə, profil şəkli və profilinə əlavə etdiyin hər şey.',
         'Oyunlar: gedişlər, nəticələr, reytinq tarixçəsi, statistika, nailiyyətlər, proqnozlar və ədəb səsləri.',
         'Ünsiyyət: şəxsi mesajlar, klub və oyun çatları, izləyici çatı və şikayətlər.',
         'Texniki: IP ünvanı (yalnız sorğuları məhdudlaşdırmaq üçün, server yaddaşında müvəqqəti), bağlantı gecikməsi, oyun zamanı səhifəni tərk etmə və gediş vaxtları (ədalətli oyun yoxlaması üçün).',
         'Brauzerində (localStorage): giriş tokeni, ayarlar və dil. Biz cookie, reklam və ya izləmə (analitika) skriptlərindən istifadə etmirik.']
      ]],
      ['Nə üçün istifadə edirik', [
        'Oyunları keçirmək, reytinq və statistikanı hesablamaq, bildirişlər və şifrə bərpası məktubları göndərmək, fırıldaq və sui-istifadə ilə mübarizə aparmaq və saytı təkmilləşdirmək üçün. Məlumatlarını heç vaxt satmırıq və reklam üçün paylaşmırıq.'
      ]],
      ['Başqaları nəyi görə bilər', [
        'Açıq: istifadəçi adı, ölkə, profil şəkli, reytinqlər, statistika, oyunlar və onların gedişləri, klub, nailiyyətlər və qarşılıqlı hesablar. E-poçtun və şifrən heç vaxt göstərilmir. Şəxsi mesajları yalnız söhbətdəki iki nəfər görür. Məxfilik ayarlarında sənə kimin yaza və ya oyuna çağıra biləcəyini seçirsən.'
      ]],
      ['Kənar xidmətlər', [
        ['Render — veb hostinq.', 'Neon — PostgreSQL verilənlər bazası.', 'Brevo — şifrə bərpası məktublarının göndərilməsi.', 'Cloudflare — chesscaravan.com domeni və DNS (ünvanı serverə yönləndirir).', 'Telegram — yalnız botu qoşsan: çat ID-n və bildiriş mətnləri göndərilir.', 'Push bildirişləri — yalnız aktiv etsən, brauzer təminatçısı (Google, Apple, Mozilla) vasitəsilə.', 'Səslə gediş — yalnız aktiv etsən: nitqini brauzerinin nitq tanıma xidməti (məsələn, Chrome-da Google) mətnə çevirir; biz səs yazılarını heç vaxt almırıq və saxlamırıq.',
         'Kitabxanalar və şriftlər üçün CDN-lər: cdnjs (Cloudflare), jsDelivr, unpkg, code.jquery.com, cdn.socket.io, Google Fonts; bayraqlar — flagcdn.com; stikerlər — Google Noto Emoji.',
         'Texniki səbəblərdən bu xidmətlər IP ünvanını görə bilər. Oyun təhlili (Stockfish) tamamilə brauzerində işləyir.']
      ]],
      ['Məlumatları nə qədər saxlayırıq', [
        'Hesabın mövcud olduğu müddətdə məlumatları saxlayırıq. Hesabını silsən, profil, oyunlar, mesajlar, dostlar, bildirişlər və digər şəxsi məlumatlar dərhal silinir. Bu oyunlar rəqiblərinin tarixçəsində anonim adla qalır, klubunun Bayraqlar yarışındakı xalları isə adsız qalır. Hostinq təminatçılarının ehtiyat nüsxələri məlumatları qısa müddət saxlaya bilər.'
      ]],
      ['Hüquqların', [
        ['Məlumatlarına Profil və Ayarlarda bax və dəyiş.', 'Oyunlarını PGN faylı kimi yüklə.',
         'Hesabını tamamilə sil: Ayarlar → Hesab → «Hesabı sil».', 'Digər oyunçuları blokla və şikayət et.']
      ]],
      ['Təhlükəsizlik', [
        'Sayt HTTPS istifadə edir, şifrələr yalnız bcrypt heşi kimi saxlanılır və giriş tokeni 7 gün etibarlıdır. Bununla belə, internetdə heç bir sistem 100% təhlükəsiz deyil — şifrəni başqa saytlarda təkrarlama.'
      ]],
      ['Uşaqlar', [
        '13 yaşından kiçik uşaqlar saytdan yalnız valideyn və ya qəyyumun razılığı ilə istifadə edə bilər.'
      ]],
      ['Dəyişikliklər və əlaqə', [
        'Bu siyasət dəyişsə, bu səhifədəki tarix yenilənir. Suallar və məlumatların silinməsi sorğuları üçün: {{contact}}.'
      ]]
    ]
  },
  terms: {
    intro: 'Saytdan istifadə etməklə aşağıdakı şərtlərlə razılaşırsan. Razı deyilsənsə, saytdan istifadə etmə.',
    sections: [
      ['Hesab', [
        ['Qeydiyyat zamanı düzgün məlumat ver və şifrəni heç kimə vermə — hesabında baş verənlərə görə sən məsuliyyət daşıyırsan.',
         'Reytinqi şişirtmək üçün bir neçə hesab yaratmaq qadağandır.',
         'Təhqiramiz, başqasını təqlid edən və ya reklam xarakterli istifadəçi adları qadağandır.']
      ]],
      ['Ədalətli oyun', [
        ['Oyun zamanı şahmat mühərriklərindən, başqalarının məsləhətindən və ya hər hansı kənar köməkdən istifadə qadağandır.',
         'Qəsdən uduzmaq, nəticəni əvvəlcədən razılaşdırmaq və reytinqlə manipulyasiya qadağandır.',
         'Sayt oyunları avtomatik yoxlayır. Fırıldaq etdiyi müəyyən edilən oyunçular işarələnir və ya bloklanır, onların rəqiblərinə isə itirdikləri reytinq qaytarılır.']
      ]],
      ['Davranış', [
        ['Təhqir, ayrı-seçkilik, hədə, spam, reklam, qanunsuz və ədəbsiz məzmun qadağandır.',
         'Qadağan sözlər çatda avtomatik gizlədilir; pozuntu edənlər müvəqqəti səssizləşdirilə bilər.',
         'Digər oyunçuları bloklaya və şikayət edə bilərsən — şikayətlərə adminlər baxır.']
      ]],
      ['Sanksiyalar', [
        'Qaydaların pozulması xəbərdarlığa, çat məhdudiyyətinə və ya müvəqqəti, yaxud daimi bloklanmaya səbəb ola bilər. Ciddi pozuntular xəbərdarlıqsız bloklanmaya səbəb ola bilər.'
      ]],
      ['Məzmun', [
        'Oyunların (gedişlər və nəticələr) açıqdır; başqaları onlara baxa, təhlil edə və PGN kimi yükləyə bilər. Mesajlarına və qeydlərinə görə sən məsuliyyət daşıyırsan. Xidməti göstərmək üçün bizə bu məzmunu saxlamaq və göstərmək hüququ verirsən.'
      ]],
      ['Xidmət', [
        'ChessCaravan pulsuzdur və «olduğu kimi» təqdim olunur. Fasiləsiz işə, xətaların olmamasına və ya məlumatların heç vaxt itməyəcəyinə zəmanət vermirik. İmkanları dəyişə, dayandıra və ya bağlaya bilərik. Qanunun icazə verdiyi həddə saytla bağlı dolayı zərərə görə məsuliyyət daşımırıq.'
      ]],
      ['Hesabın bağlanması', [
        'Hesabını istənilən vaxt Ayarlar → Hesab → «Hesabı sil» vasitəsilə silə bilərsən. Qaydaları pozan hesabları bağlaya bilərik.'
      ]],
      ['Dəyişikliklər və əlaqə', [
        'Bu şərtlər dəyişsə, bu səhifədəki tarix yenilənir; dəyişiklikdən sonra saytdan istifadə yeni şərtləri qəbul etdiyin mənasına gəlir. Suallar: {{contact}}.'
      ]]
    ]
  }
};
window.LEGAL_UPDATED = '2026-10-29';

// 📜 Mualliflar va litsenziyalar (/mualliflar): [nomi, havola, muallif, litsenziya, litsenziya havolasi]
// Yangi begona resurs (kutubxona, rasm, ovoz, shrift) qo'shilsa — shu yerga ham. Litsenziyasi noaniq yoki tijoratni
// taqiqlaydigan (NC, "faqat shaxsiy") resurslarni ishlatmang.
window.LEGAL_CREDITS = {
  code: [
    ['jQuery 3.5.1', 'https://jquery.com', 'OpenJS Foundation', 'MIT', 'https://opensource.org/license/mit'],
    ['chess.js 0.10.3', 'https://github.com/jhlywa/chess.js', 'Jeff Hlywa', 'BSD-2-Clause', 'https://opensource.org/license/bsd-2-clause'],
    ['chessboard.js 1.0.0', 'https://chessboardjs.com', 'Chris Oakman', 'MIT', 'https://opensource.org/license/mit'],
    ['Socket.IO 4.7.2', 'https://socket.io', 'Guillermo Rauch & contributors', 'MIT', 'https://opensource.org/license/mit'],
    ['howler.js 2.2.4', 'https://howlerjs.com', 'James Simpson (GoldFire Studios)', 'MIT', 'https://opensource.org/license/mit'],
    ['Chart.js 4.6.1', 'https://www.chartjs.org', 'Chart.js contributors', 'MIT', 'https://opensource.org/license/mit'],
    ['canvas-confetti 1.9.3', 'https://github.com/catdad/canvas-confetti', 'Kiril Vatev', 'ISC', 'https://opensource.org/license/isc-license-txt'],
    ['i18next 23.11.5', 'https://www.i18next.com', 'Jan Mühlemann & contributors', 'MIT', 'https://opensource.org/license/mit'],
    ['animate.css 4.1.1', 'https://animate.style', 'Daniel Eden & contributors', 'MIT', 'https://opensource.org/license/mit'],
    ['D3 7.9.0', 'https://d3js.org', 'Mike Bostock', 'ISC', 'https://opensource.org/license/isc-license-txt'],
    ['TopoJSON client 3.1.0', 'https://github.com/topojson/topojson-client', 'Mike Bostock', 'ISC', 'https://opensource.org/license/isc-license-txt'],
    ['gifenc 1.0.3', 'https://github.com/mattdesl/gifenc', 'Matt DesLauriers', 'MIT', 'https://opensource.org/license/mit'],
    ['Stockfish.js 10.0.2', 'https://github.com/niklasf/stockfish.js', 'Stockfish developers; port: Niklas Fiekas', 'GPL-3.0', 'https://www.gnu.org/licenses/gpl-3.0.html']
  ],
  assets: [
    ['Noto Emoji Animation', 'https://googlefonts.github.io/noto-emoji-animation/', 'Google', 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/'],
    ['Noto Emoji', 'https://github.com/googlefonts/noto-emoji', 'Google', 'Apache-2.0', 'https://www.apache.org/licenses/LICENSE-2.0'],
    ['Inter font', 'https://rsms.me/inter/', 'Rasmus Andersson & The Inter Project Authors', 'SIL OFL 1.1', 'https://openfontlicense.org'],
    ['Country flags (flagcdn)', 'https://flagcdn.com', 'Flagpedia.net', 'Public domain', 'https://flagpedia.net'],
    ['World map (Natural Earth, world-atlas)', 'https://github.com/topojson/world-atlas', 'Natural Earth; Mike Bostock', 'Public domain / ISC', 'https://www.naturalearthdata.com/about/terms-of-use/'],
    ['Opening names (chess-openings)', 'https://github.com/lichess-org/chess-openings', 'lichess.org contributors', 'CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/']
  ]
};
