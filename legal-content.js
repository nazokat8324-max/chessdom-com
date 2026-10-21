// Maxfiylik siyosati va Foydalanish shartlari matnlari (legal.html ko'rsatadi). 6 til: uz, en, ru, es, de, fr.
// Har hujjat: title, updated, intro, sections: [[sarlavha, [paragraf yoki ["ro'yxat", ...]] ...]]. {{contact}} — aloqa manzili.
window.LEGAL_TEXT = {
  uz: {
    ui: { privacy: 'Maxfiylik siyosati', terms: 'Foydalanish shartlari', back: "Saytga qaytish", updated: 'Oxirgi yangilanish', contactNone: "sayt ichidagi «Shikoyat» tugmasi orqali ma'muriyatga yozing" },
    privacy: {
      intro: "ChessDom — onlayn shaxmat sayti. Bu sahifa qanday ma'lumotlaringizni saqlashimiz, nima uchun va qanday himoya qilishimizni tushuntiradi. Saytdan foydalanib, siz shu siyosatga rozilik bildirasiz.",
      sections: [
        ["Qanday ma'lumotlarni saqlaymiz", [
          ["Hisob: foydalanuvchi nomi, email (ixtiyoriy), parol — faqat shifrlangan ko'rinishda (bcrypt xesh), davlat, profil rasmi, profilga o'zingiz yozgan ma'lumotlar.",
           "O'yinlar: yurishlar, natijalar, reyting tarixi, statistika, yutuqlar, bashoratlar va odob baholari.",
           "Muloqot: shaxsiy xabarlar, klub va o'yin chatlari, tomoshabinlar chati, o'yinlarga izohlar, shikoyatlar.",
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
          ["Render — sayt serveri (hosting).", "Neon — PostgreSQL ma'lumotlar bazasi.", "Brevo — parolni tiklash xatlarini yuborish.",
           "Kutubxona va shriftlar uchun CDN'lar: cdnjs (Cloudflare), jsDelivr, unpkg, code.jquery.com, cdn.socket.io, Google Fonts; bayroqlar — flagcdn.com; dona rasmlari — lichess1.org; stikerlar — Google Noto Emoji.",
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
          "ChessDom bepul va «boricha» taqdim etiladi. Biz uzluksiz ishlashni, xatolar yo'qligini yoki ma'lumotlar hech qachon yo'qolmasligini kafolatlamaymiz. Imkoniyatlarni o'zgartirish, to'xtatib turish yoki yopish huquqini saqlab qolamiz. Qonun ruxsat bergan darajada, sayt bilan bog'liq bilvosita zararlar uchun javobgar emasmiz."
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
    ui: { privacy: 'Privacy Policy', terms: 'Terms of Use', back: 'Back to the site', updated: 'Last updated', contactNone: 'write to the administrators using the “Report” button on the site' },
    privacy: {
      intro: 'ChessDom is an online chess site. This page explains what data we store, why, and how we protect it. By using the site you agree to this policy.',
      sections: [
        ['What we store', [
          ['Account: username, email (optional), password — only as an encrypted bcrypt hash, country, profile picture and anything you add to your profile.',
           'Games: moves, results, rating history, statistics, achievements, predictions and sportsmanship votes.',
           'Communication: private messages, club and game chats, spectator chat, game notes and reports.',
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
          ['Render — web hosting.', 'Neon — PostgreSQL database.', 'Brevo — sending password-reset emails.',
           'CDNs for libraries and fonts: cdnjs (Cloudflare), jsDelivr, unpkg, code.jquery.com, cdn.socket.io, Google Fonts; flags — flagcdn.com; piece images — lichess1.org; stickers — Google Noto Emoji.',
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
          'ChessDom is free and provided “as is”. We do not guarantee uninterrupted operation, the absence of bugs, or that data will never be lost. We may change, suspend or close features. To the extent allowed by law, we are not liable for indirect damages related to the site.'
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
    ui: { privacy: 'Политика конфиденциальности', terms: 'Условия использования', back: 'Вернуться на сайт', updated: 'Последнее обновление', contactNone: 'напишите администрации через кнопку «Пожаловаться» на сайте' },
    privacy: {
      intro: 'ChessDom — сайт для игры в шахматы онлайн. Здесь объясняется, какие данные мы храним, зачем и как защищаем. Пользуясь сайтом, вы соглашаетесь с этой политикой.',
      sections: [
        ['Какие данные мы храним', [
          ['Аккаунт: имя пользователя, email (необязательно), пароль — только в зашифрованном виде (хеш bcrypt), страна, фото профиля и сведения, которые вы добавили в профиль.',
           'Партии: ходы, результаты, история рейтинга, статистика, достижения, прогнозы и оценки вежливости.',
           'Общение: личные сообщения, чаты клубов и партий, чат зрителей, комментарии к партиям, жалобы.',
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
          ['Render — хостинг сайта.', 'Neon — база данных PostgreSQL.', 'Brevo — отправка писем для сброса пароля.',
           'CDN для библиотек и шрифтов: cdnjs (Cloudflare), jsDelivr, unpkg, code.jquery.com, cdn.socket.io, Google Fonts; флаги — flagcdn.com; изображения фигур — lichess1.org; стикеры — Google Noto Emoji.',
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
          'ChessDom бесплатен и предоставляется «как есть». Мы не гарантируем бесперебойную работу, отсутствие ошибок и полную сохранность данных. Мы можем изменять, приостанавливать или закрывать функции. В пределах, допустимых законом, мы не несём ответственности за косвенный ущерб, связанный с сайтом.'
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
    ui: { privacy: 'Política de privacidad', terms: 'Condiciones de uso', back: 'Volver al sitio', updated: 'Última actualización', contactNone: 'escribe a los administradores con el botón «Denunciar» del sitio' },
    privacy: {
      intro: 'ChessDom es un sitio de ajedrez en línea. Aquí explicamos qué datos guardamos, para qué y cómo los protegemos. Al usar el sitio aceptas esta política.',
      sections: [
        ['Qué datos guardamos', [
          ['Cuenta: nombre de usuario, email (opcional), contraseña — solo como hash cifrado bcrypt, país, foto de perfil y lo que añadas a tu perfil.',
           'Partidas: jugadas, resultados, historial de rating, estadísticas, logros, predicciones y votos de deportividad.',
           'Comunicación: mensajes privados, chats de club y de partida, chat de espectadores, notas de partidas y denuncias.',
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
          ['Render — alojamiento web.', 'Neon — base de datos PostgreSQL.', 'Brevo — envío de emails de restablecimiento de contraseña.',
           'CDN de bibliotecas y fuentes: cdnjs (Cloudflare), jsDelivr, unpkg, code.jquery.com, cdn.socket.io, Google Fonts; banderas — flagcdn.com; imágenes de piezas — lichess1.org; stickers — Google Noto Emoji.',
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
          'ChessDom es gratuito y se ofrece «tal cual». No garantizamos un funcionamiento ininterrumpido, la ausencia de errores ni que nunca se pierdan datos. Podemos cambiar, suspender o cerrar funciones. En la medida permitida por la ley, no respondemos de daños indirectos relacionados con el sitio.'
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
    ui: { privacy: 'Datenschutzerklärung', terms: 'Nutzungsbedingungen', back: 'Zurück zur Website', updated: 'Zuletzt aktualisiert', contactNone: 'schreibe den Administratoren über die Schaltfläche „Melden“ auf der Website' },
    privacy: {
      intro: 'ChessDom ist eine Online-Schach-Website. Hier erklären wir, welche Daten wir speichern, wofür und wie wir sie schützen. Mit der Nutzung der Website stimmst du dieser Erklärung zu.',
      sections: [
        ['Welche Daten wir speichern', [
          ['Konto: Benutzername, E-Mail (optional), Passwort — nur als verschlüsselter bcrypt-Hash, Land, Profilbild und deine Profilangaben.',
           'Partien: Züge, Ergebnisse, Wertungsverlauf, Statistiken, Erfolge, Tipps und Fairness-Bewertungen.',
           'Kommunikation: private Nachrichten, Klub- und Partie-Chats, Zuschauer-Chat, Partie-Notizen und Meldungen.',
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
          ['Render — Webhosting.', 'Neon — PostgreSQL-Datenbank.', 'Brevo — Versand von E-Mails zum Zurücksetzen des Passworts.',
           'CDNs für Bibliotheken und Schriften: cdnjs (Cloudflare), jsDelivr, unpkg, code.jquery.com, cdn.socket.io, Google Fonts; Flaggen — flagcdn.com; Figurenbilder — lichess1.org; Sticker — Google Noto Emoji.',
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
          'ChessDom ist kostenlos und wird „wie besehen“ bereitgestellt. Wir garantieren keinen unterbrechungsfreien Betrieb, keine Fehlerfreiheit und keinen dauerhaften Datenerhalt. Wir können Funktionen ändern, aussetzen oder einstellen. Soweit gesetzlich zulässig, haften wir nicht für mittelbare Schäden im Zusammenhang mit der Website.'
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
    ui: { privacy: 'Politique de confidentialité', terms: "Conditions d'utilisation", back: 'Retour au site', updated: 'Dernière mise à jour', contactNone: 'écrivez aux administrateurs avec le bouton « Signaler » du site' },
    privacy: {
      intro: "ChessDom est un site d'échecs en ligne. Cette page explique quelles données nous conservons, pourquoi et comment nous les protégeons. En utilisant le site, vous acceptez cette politique.",
      sections: [
        ['Données conservées', [
          ["Compte : nom d'utilisateur, email (facultatif), mot de passe — uniquement sous forme de hachage bcrypt, pays, photo de profil et ce que vous ajoutez à votre profil.",
           'Parties : coups, résultats, historique du classement, statistiques, succès, pronostics et votes de fair-play.',
           'Communication : messages privés, chats de club et de partie, chat des spectateurs, notes de parties et signalements.',
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
          ['Render — hébergement.', 'Neon — base de données PostgreSQL.', 'Brevo — envoi des emails de réinitialisation du mot de passe.',
           'CDN pour les bibliothèques et les polices : cdnjs (Cloudflare), jsDelivr, unpkg, code.jquery.com, cdn.socket.io, Google Fonts ; drapeaux — flagcdn.com ; images des pièces — lichess1.org ; stickers — Google Noto Emoji.',
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
          "ChessDom est gratuit et fourni « en l'état ». Nous ne garantissons ni un fonctionnement ininterrompu, ni l'absence de bogues, ni la conservation permanente des données. Nous pouvons modifier, suspendre ou fermer des fonctionnalités. Dans les limites permises par la loi, nous ne sommes pas responsables des dommages indirects liés au site."
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
window.LEGAL_UPDATED = '2026-10-21';
