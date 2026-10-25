// 📝 Kutubxona qo'llanmalari — ChessCaravan'ning o'zi yozgan qisqa maqolalar (mualliflik huquqi loyihaniki).
// Har maqola: id, icon, title[6], lead[6], points — har band [uz, en, ru, es, de, fr]. library.js chizadi.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LibraryArticles = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  return [
    { id: 'start', icon: '🌱',
      title: ['Shaxmatni qayerdan boshlash', 'Where to start with chess', 'С чего начать в шахматах', 'Por dónde empezar en el ajedrez', 'Wie man mit Schach anfängt', 'Par où commencer aux échecs'],
      lead: ["Qoidalarni bir kunda o'rganish mumkin. Ularni yaxshi o'ynash esa butun umrlik qiziq sayohat.", 'You can learn the rules in a day. Playing well is a lifelong adventure.', 'Правила можно выучить за день. А хорошо играть — это увлекательное путешествие на всю жизнь.', 'Las reglas se aprenden en un día. Jugar bien es una aventura de toda la vida.', 'Die Regeln lernt man an einem Tag. Gut spielen ist ein lebenslanges Abenteuer.', 'On apprend les règles en une journée. Bien jouer est une aventure de toute une vie.'],
      points: [
        ["Taxta 8×8, 64 katak. Har o'yinchining o'ng tomonidagi burchak katagi oq bo'ladi. Birinchi bo'lib oq yuradi.", "The board is 8×8, 64 squares. The corner square on each player's right is light. White moves first.", 'Доска 8×8, 64 поля. Угловое поле справа от каждого игрока — белое. Первыми ходят белые.', 'El tablero es de 8×8, 64 casillas. La casilla de la esquina a la derecha de cada jugador es clara. Empiezan las blancas.', 'Das Brett hat 8×8 = 64 Felder. Das Eckfeld rechts von jedem Spieler ist hell. Weiß beginnt.', "L'échiquier fait 8×8, soit 64 cases. La case d'angle à droite de chaque joueur est claire. Les Blancs commencent."],
        ["Shoh har tomonga 1 katak yuradi. Farzin istalgan yo'nalishda istalgancha, rux to'g'ri chiziq bo'ylab, fil diagonal bo'ylab yuradi.", 'The king moves one square in any direction. The queen moves any distance in any direction, the rook along straight lines, the bishop along diagonals.', 'Король ходит на одно поле в любую сторону. Ферзь — на любое расстояние в любом направлении, ладья — по прямым, слон — по диагоналям.', 'El rey se mueve una casilla en cualquier dirección. La dama, cualquier distancia en cualquier dirección; la torre, en línea recta; el alfil, en diagonal.', 'Der König zieht ein Feld in jede Richtung. Die Dame beliebig weit in jede Richtung, der Turm geradeaus, der Läufer diagonal.', "Le roi se déplace d'une case dans toutes les directions. La dame, d'autant de cases qu'elle veut dans toutes les directions ; la tour en ligne droite ; le fou en diagonale."],
        ["Ot \"G\" harfi shaklida yuradi (2 katak + 1 katak yonga) va boshqa donalar ustidan sakray oladigan yagona dona.", 'The knight moves in an "L" shape (two squares, then one to the side) and is the only piece that can jump over others.', 'Конь ходит буквой «Г» (два поля и одно в сторону) и единственный умеет перепрыгивать через другие фигуры.', 'El caballo se mueve en forma de «L» (dos casillas y una al lado) y es la única pieza que salta sobre las demás.', 'Der Springer zieht in L-Form (zwei Felder, dann eins zur Seite) und kann als einzige Figur über andere springen.', "Le cavalier se déplace en « L » (deux cases puis une sur le côté) et c'est la seule pièce qui saute par-dessus les autres."],
        ["Piyoda oldinga 1 katak yuradi (birinchi yurishida 2 katak) va diagonal bo'yicha oladi. Oxirgi qatorga yetganda farzin, rux, fil yoki otga aylanadi.", 'A pawn moves one square forward (two on its first move) and captures diagonally. On reaching the last rank it becomes a queen, rook, bishop or knight.', 'Пешка ходит на одно поле вперёд (первым ходом — на два) и бьёт по диагонали. Дойдя до последней горизонтали, превращается в ферзя, ладью, слона или коня.', 'El peón avanza una casilla (dos en su primera jugada) y captura en diagonal. Al llegar a la última fila se convierte en dama, torre, alfil o caballo.', 'Der Bauer zieht ein Feld vor (beim ersten Zug zwei) und schlägt diagonal. Auf der letzten Reihe wird er zu Dame, Turm, Läufer oder Springer.', "Le pion avance d'une case (deux au premier coup) et prend en diagonale. Arrivé sur la dernière rangée, il devient dame, tour, fou ou cavalier."],
        ["Uchta maxsus yurish: rokirovka (shoh va rux bir yurishda), o'tib ketayotgan piyodani olish va piyodaning aylanishi. O'yin panelidagi yurish nuqtalari qaysi yurish mumkinligini ko'rsatadi.", 'Three special moves: castling (king and rook in one move), en passant and promotion. The move dots on our board always show what is allowed.', 'Три особых хода: рокировка (король и ладья за один ход), взятие на проходе и превращение пешки. Точки на нашей доске всегда показывают допустимые ходы.', 'Tres jugadas especiales: el enroque (rey y torre en una jugada), la captura al paso y la coronación. Los puntos de nuestro tablero muestran siempre lo permitido.', 'Drei Sonderzüge: Rochade (König und Turm in einem Zug), en passant und Umwandlung. Die Punkte auf unserem Brett zeigen immer, was erlaubt ist.', "Trois coups spéciaux : le roque (roi et tour en un coup), la prise en passant et la promotion. Les points sur notre échiquier montrent toujours ce qui est permis."],
        ["Maqsad — mat: shohga hujum qilingan va undan qutulib bo'lmaydi. Agar navbatdagi tomonning qonuniy yurishi qolmasa-yu, shoh hujumda bo'lmasa — bu pat, ya'ni durrang.", 'The goal is checkmate: the king is attacked and cannot escape. If the side to move has no legal move but is not in check, it is stalemate — a draw.', 'Цель — мат: король под ударом и не может спастись. Если у стороны, чей ход, нет ходов, но шаха нет — это пат, ничья.', 'El objetivo es el jaque mate: el rey está atacado y no puede escapar. Si el bando que mueve no tiene jugadas legales y no está en jaque, es ahogado: tablas.', 'Ziel ist das Schachmatt: Der König wird angegriffen und kann nicht entkommen. Hat die Seite am Zug keinen legalen Zug und steht nicht im Schach, ist es Patt — remis.', "Le but est l'échec et mat : le roi est attaqué et ne peut s'échapper. Si le camp au trait n'a aucun coup légal sans être en échec, c'est le pat : partie nulle."],
        ["Maslahat: avval do'stingiz bilan \"👥 Bir qurilmada\" rejimida o'ynang, so'ng reytingsiz onlayn o'yinlarga o'ting. Har o'yindan keyin \"📖 O'yin hikoyasi\"ni oching — xatolaringizni tushunasiz.", 'Tip: start with a friend in "👥 Same device" mode, then move on to casual online games. After each game open "📖 Game story" to understand your mistakes.', 'Совет: начните с другом в режиме «👥 На одном устройстве», затем переходите к онлайн-партиям без рейтинга. После каждой партии открывайте «📖 История партии» — так вы поймёте свои ошибки.', 'Consejo: empieza con un amigo en el modo «👥 En un dispositivo» y luego pasa a partidas en línea amistosas. Tras cada partida abre «📖 Historia de la partida» para entender tus errores.', 'Tipp: Spiel zuerst mit einem Freund im Modus „👥 Ein Gerät“ und dann ungewertete Online-Partien. Öffne nach jeder Partie „📖 Partiegeschichte“, um deine Fehler zu verstehen.', "Conseil : commencez avec un ami en mode « 👥 Même appareil », puis passez aux parties amicales en ligne. Après chaque partie, ouvrez « 📖 Récit de la partie » pour comprendre vos erreurs."]
      ] },
    { id: 'opening', icon: '🏁',
      title: ['Debyutning 5 oltin qoidasi', 'Five golden rules of the opening', 'Пять золотых правил дебюта', 'Cinco reglas de oro de la apertura', 'Fünf goldene Eröffnungsregeln', "Cinq règles d'or de l'ouverture"],
      lead: ["Debyut nomlarini yodlash shart emas. Mana shu besh qoidaga amal qilsangiz, o'yinni yaxshi pozitsiyadan boshlaysiz.", 'You do not need to memorise opening names. Follow these five rules and you will start every game in a good position.', 'Не обязательно заучивать названия дебютов. Следуйте этим пяти правилам — и вы начнёте партию в хорошей позиции.', 'No hace falta memorizar nombres de aperturas. Sigue estas cinco reglas y empezarás cada partida en buena posición.', 'Eröffnungsnamen auswendig zu lernen ist nicht nötig. Halte dich an diese fünf Regeln, und du startest jede Partie in guter Stellung.', "Inutile d'apprendre par cœur les noms d'ouvertures. Suivez ces cinq règles et vous commencerez chaque partie dans une bonne position."],
      points: [
        ["1. Markazni egallang: e4, d4 (qora uchun e5, d5) piyodalari donalaringizga yo'l ochadi.", '1. Take the centre: the e4 and d4 pawns (e5 and d5 for Black) open the way for your pieces.', '1. Займите центр: пешки e4 и d4 (у чёрных e5 и d5) открывают дорогу фигурам.', '1. Ocupa el centro: los peones de e4 y d4 (e5 y d5 para las negras) abren camino a tus piezas.', '1. Besetze das Zentrum: Die Bauern e4 und d4 (für Schwarz e5 und d5) öffnen deinen Figuren den Weg.', '1. Prenez le centre : les pions e4 et d4 (e5 et d5 pour les Noirs) ouvrent la voie à vos pièces.'],
        ["2. Otlar va fillarni tez chiqaring — odatda otlar fillardan oldin.", '2. Develop your knights and bishops quickly — usually knights before bishops.', '2. Быстро развивайте коней и слонов — обычно коней раньше слонов.', '2. Desarrolla rápido caballos y alfiles; normalmente los caballos antes que los alfiles.', '2. Entwickle Springer und Läufer zügig — meist die Springer vor den Läufern.', "2. Développez vite cavaliers et fous — en général les cavaliers avant les fous."],
        ["3. Rokirovkani erta qiling: shoh xavfsiz bo'ladi, rux esa o'yinga qo'shiladi.", '3. Castle early: your king gets safe and your rook joins the game.', '3. Рокируйте пораньше: король в безопасности, а ладья вступает в игру.', '3. Enroca pronto: tu rey estará a salvo y la torre entrará en juego.', '3. Rochiere früh: Dein König ist sicher und der Turm kommt ins Spiel.', '3. Roquez tôt : votre roi est en sécurité et la tour entre en jeu.'],
        ["4. Farzinni erta chiqarmang — raqib uni quvib, bu orada o'z donalarini rivojlantirib oladi.", '4. Do not bring the queen out early — the opponent will chase it and develop with tempo.', '4. Не выводите ферзя рано — соперник будет гоняться за ним и развиваться с темпом.', '4. No saques la dama pronto: el rival la perseguirá y se desarrollará ganando tiempos.', '4. Bring die Dame nicht zu früh heraus — der Gegner jagt sie und entwickelt sich mit Tempo.', "4. Ne sortez pas la dame trop tôt : l'adversaire la chassera en se développant avec gain de temps."],
        ["5. Bir donani ikki marta yurmang (zarurat bo'lmasa) va piyodalar bilan ortiqcha vaqt yo'qotmang. Opera o'yini (Kutubxona → Mashhur partiyalar) — bu qoidalarning eng yaxshi namunasi.", '5. Do not move the same piece twice without a reason and do not waste time on pawn moves. The Opera Game (Library → Famous games) shows these rules perfectly.', '5. Не ходите одной фигурой дважды без причины и не тратьте время на пешечные ходы. «Партия в опере» (Библиотека → Знаменитые партии) — лучший пример этих правил.', '5. No muevas dos veces la misma pieza sin motivo ni pierdas tiempo con jugadas de peón. La partida de la Ópera (Biblioteca → Partidas célebres) lo muestra a la perfección.', '5. Zieh nicht ohne Grund zweimal mit derselben Figur und vertrödle keine Zeit mit Bauernzügen. Die Opernpartie (Bibliothek → Berühmte Partien) zeigt diese Regeln perfekt.', "5. Ne jouez pas deux fois la même pièce sans raison et ne perdez pas de temps avec les pions. La partie de l'Opéra (Bibliothèque → Parties célèbres) illustre parfaitement ces règles."]
      ] },
    { id: 'notation', icon: '✍️',
      title: ["Shaxmat yozuvi: e4, Nf3, O-O nimani anglatadi", 'Chess notation: what e4, Nf3 and O-O mean', 'Шахматная запись: что значат e4, Nf3 и O-O', 'La notación: qué significan e4, Nf3 y O-O', 'Die Notation: Was e4, Nf3 und O-O bedeuten', 'La notation : ce que signifient e4, Nf3 et O-O'],
      lead: ["O'yinlar tarixi, PGN, tahlil va hikoyalarda yurishlar qisqa yozuvda beriladi. Uni o'qishni bilish ko'p narsani ochib beradi.", 'Game history, PGN, analysis and stories all use short algebraic notation. Reading it opens a lot of doors.', 'В истории партий, PGN, анализе и историях ходы записываются кратко. Умение читать запись открывает многое.', 'El historial, el PGN, el análisis y las historias usan la notación algebraica abreviada. Saber leerla abre muchas puertas.', 'Partiegeschichte, PGN, Analyse und Geschichten verwenden die kurze algebraische Notation. Wer sie lesen kann, versteht viel mehr.', "L'historique, le PGN, l'analyse et les récits utilisent la notation algébrique abrégée. Savoir la lire ouvre bien des portes."],
      points: [
        ["Vertikallar a dan h gacha harf, gorizontallar 1 dan 8 gacha raqam: e4 — e vertikal va 4-gorizontal kesishgan katak.", 'Files are letters a–h, ranks are numbers 1–8: e4 is the square where the e-file meets the 4th rank.', 'Вертикали — буквы от a до h, горизонтали — цифры от 1 до 8: e4 — поле на пересечении вертикали e и четвёртой горизонтали.', 'Las columnas son letras de la a a la h y las filas números del 1 al 8: e4 es la casilla donde se cruzan la columna e y la fila 4.', 'Linien sind Buchstaben a–h, Reihen Zahlen 1–8: e4 ist das Feld, wo die e-Linie die 4. Reihe kreuzt.', "Les colonnes sont les lettres a à h, les rangées les chiffres 1 à 8 : e4 est la case au croisement de la colonne e et de la 4e rangée."],
        ["Donalar bosh harf bilan (inglizcha): K — shoh, Q — farzin, R — rux, B — fil, N — ot. Piyoda harfsiz: e4 — piyoda e4 ga, Nf3 — ot f3 ga.", 'Pieces use capital letters: K king, Q queen, R rook, B bishop, N knight. Pawns have no letter: e4 is a pawn to e4, Nf3 a knight to f3.', 'Фигуры обозначаются заглавными латинскими буквами: K — король, Q — ферзь, R — ладья, B — слон, N — конь. Пешка без буквы: e4 — пешка на e4, Nf3 — конь на f3.', 'Las piezas usan letras mayúsculas (en inglés): K rey, Q dama, R torre, B alfil, N caballo. El peón no lleva letra: e4 es peón a e4, Nf3 caballo a f3.', 'Figuren haben englische Großbuchstaben: K König, Q Dame, R Turm, B Läufer, N Springer. Bauern haben keinen Buchstaben: e4 = Bauer nach e4, Nf3 = Springer nach f3.', "Les pièces ont des majuscules anglaises : K roi, Q dame, R tour, B fou, N cavalier. Le pion n'a pas de lettre : e4 = pion en e4, Nf3 = cavalier en f3."],
        ["x — olish (Bxc6 — fil c6 dagi donani oladi), + — shoh, # — mat, = — aylanish (e8=Q).", 'x means a capture (Bxc6 — the bishop takes on c6), + check, # checkmate, = promotion (e8=Q).', 'x — взятие (Bxc6 — слон бьёт на c6), + — шах, # — мат, = — превращение (e8=Q).', 'x indica captura (Bxc6: el alfil captura en c6), + jaque, # mate, = coronación (e8=Q).', 'x bedeutet Schlagen (Bxc6 — der Läufer schlägt auf c6), + Schach, # Matt, = Umwandlung (e8=Q).', "x indique une prise (Bxc6 : le fou prend en c6), + échec, # mat, = promotion (e8=Q)."],
        ["O-O — qisqa rokirovka (shoh tomonga), O-O-O — uzun rokirovka (farzin tomonga).", 'O-O is short castling (king side), O-O-O is long castling (queen side).', 'O-O — короткая рокировка (в сторону короля), O-O-O — длинная (в сторону ферзя).', 'O-O es el enroque corto (flanco de rey) y O-O-O el largo (flanco de dama).', 'O-O ist die kurze Rochade (Königsseite), O-O-O die lange (Damenseite).', 'O-O est le petit roque (côté roi), O-O-O le grand roque (côté dame).'],
        ["Tahlil belgilari: ?! — noaniqlik, ? — xato, ?? — qo'pol xato. Saytdagi tahlil ularni o'zi qo'yadi.", 'Analysis marks: ?! inaccuracy, ? mistake, ?? blunder. Our analysis adds them automatically.', 'Знаки анализа: ?! — неточность, ? — ошибка, ?? — грубая ошибка. Анализ на сайте расставляет их сам.', 'Signos de análisis: ?! imprecisión, ? error, ?? error grave. Nuestro análisis los añade solo.', 'Analysezeichen: ?! Ungenauigkeit, ? Fehler, ?? grober Fehler. Unsere Analyse setzt sie automatisch.', "Signes d'analyse : ?! imprécision, ? erreur, ?? gaffe. Notre analyse les ajoute automatiquement."]
      ] },
    { id: 'shatranj', icon: '🏺',
      title: ["Shatranj — Ipak yo'li shaxmati", 'Shatranj — chess of the Silk Road', 'Шатрандж — шахматы Шёлкового пути', 'Shatranj: el ajedrez de la Ruta de la Seda', 'Shatranj — das Schach der Seidenstraße', 'Le shatranj — les échecs de la route de la soie'],
      lead: ["Bugungi shaxmat karvon yo'llari orqali Hindistondan Yevropaga kelgan. Bu yo'lning markazida bizning yurtimiz turgan.", "Modern chess travelled from India to Europe along the caravan roads — and our land stood in the middle of that road.", 'Современные шахматы пришли из Индии в Европу по караванным путям, и наша земля была в самом центре этого пути.', 'El ajedrez moderno viajó de la India a Europa por las rutas de las caravanas, y nuestra tierra estaba en el centro de ese camino.', 'Das moderne Schach kam über die Karawanenstraßen von Indien nach Europa — und unser Land lag mitten auf diesem Weg.', "Les échecs modernes sont venus d'Inde en Europe par les routes des caravanes, et notre terre se trouvait au milieu de ce chemin."],
      points: [
        ["Shaxmatning eng qadimgi ma'lum ajdodi — Hindistondagi chaturanga (taxminan VI asr). U Eronga o'tib, shatranj nomini oldi.", 'The oldest known ancestor of chess is chaturanga from India (around the 6th century). In Persia it became shatranj.', 'Самый древний известный предок шахмат — индийская чатуранга (примерно VI век). В Персии она стала шатранджем.', 'El antepasado más antiguo conocido del ajedrez es el chaturanga indio (hacia el siglo VI). En Persia se convirtió en shatranj.', 'Der älteste bekannte Vorfahr des Schachs ist das indische Chaturanga (etwa 6. Jahrhundert). In Persien wurde daraus Shatranj.', "Le plus ancien ancêtre connu des échecs est le chaturanga indien (vers le VIe siècle). En Perse, il est devenu le shatranj."],
        ["Samarqand yaqinidagi Afrosiyobda topilgan suyak donalar dunyodagi eng qadimgi shaxmat donalaridan biri hisoblanadi.", 'Ivory pieces found at Afrasiyab near Samarkand are counted among the oldest chess pieces in the world.', 'Фигуры из кости, найденные на Афрасиабе близ Самарканда, считаются одними из древнейших шахматных фигур в мире.', 'Las piezas de marfil halladas en Afrasiyab, cerca de Samarcanda, figuran entre las piezas de ajedrez más antiguas del mundo.', 'Die in Afrasiyab bei Samarkand gefundenen Elfenbeinfiguren gelten als einige der ältesten Schachfiguren der Welt.', "Les pièces en ivoire découvertes à Afrasiab, près de Samarcande, comptent parmi les plus anciennes pièces d'échecs au monde."],
        ["Shatranjda farzin (ferz — \"vazir\") faqat 1 katak diagonal yuradi, fil esa 2 katak sakraydi. Shuning uchun o'yin sekin, mohirona manyovrlar bilan o'tgan.", 'In shatranj the ferz ("vizier") moves only one square diagonally and the alfil jumps two squares. The game was slow and full of careful manoeuvres.', 'В шатрандже ферзь («визирь») ходит лишь на одно поле по диагонали, а слон прыгает через поле. Игра была медленной и полной тонких манёвров.', 'En el shatranj, el alferza («visir») solo se mueve una casilla en diagonal y el alfil salta dos. El juego era lento y lleno de maniobras cuidadosas.', 'Im Shatranj zieht der Fers („Wesir“) nur ein Feld diagonal, und der Alfil springt zwei Felder. Das Spiel war langsam und voller feiner Manöver.', "Au shatranj, le fers (« vizir ») ne se déplace que d'une case en diagonale et l'alfil saute de deux cases. Le jeu était lent et plein de manœuvres subtiles."],
        ["Bag'dodda as-Suliy kabi ustalar shatranj bo'yicha kitoblar yozgan. O'yin keyin Andalusiya va Sitsiliya orqali Yevropaga yetib borgan.", 'In Baghdad, masters such as as-Suli wrote books on shatranj. The game then reached Europe through Andalusia and Sicily.', 'В Багдаде мастера вроде ас-Сули писали книги о шатрандже. Потом игра пришла в Европу через Андалусию и Сицилию.', 'En Bagdad, maestros como as-Suli escribieron libros sobre el shatranj. Después el juego llegó a Europa a través de al-Ándalus y Sicilia.', 'In Bagdad schrieben Meister wie as-Suli Bücher über Shatranj. Über Andalusien und Sizilien gelangte das Spiel dann nach Europa.', "À Bagdad, des maîtres comme as-Suli ont écrit des livres sur le shatranj. Le jeu est ensuite arrivé en Europe par l'Andalousie et la Sicile."],
        ["XV asrda Yevropada farzin va fil kuchaytirildi — bugungi shaxmat shunday tug'ildi. ChessCaravan'da Shatranj'ni o'ynab ko'rishingiz mumkin: o'yin panelida \"🏺 Shatranj\"ni tanlang (pat va raqibning shohini yolg'iz qoldirish — g'alaba!).", 'In 15th-century Europe the queen and bishop were made stronger — and modern chess was born. You can play shatranj on ChessCaravan: choose "🏺 Shatranj" on the game panel (stalemate and baring the enemy king win!).', 'В Европе XV века ферзь и слон стали сильнее — так родились современные шахматы. На ChessCaravan можно сыграть в шатрандж: выберите «🏺 Шатрандж» на игровой панели (пат и голый король соперника — победа!).', 'En la Europa del siglo XV la dama y el alfil se hicieron más fuertes, y así nació el ajedrez moderno. En ChessCaravan puedes jugar al shatranj: elige «🏺 Shatranj» en el panel de juego (¡el ahogado y dejar al rey rival desnudo ganan!).', 'Im Europa des 15. Jahrhunderts wurden Dame und Läufer stärker — so entstand das moderne Schach. Auf ChessCaravan kannst du Shatranj spielen: Wähle „🏺 Shatranj“ im Spielbereich (Patt und nackter gegnerischer König gewinnen!).', "Dans l'Europe du XVe siècle, la dame et le fou sont devenus plus forts : ainsi sont nés les échecs modernes. Sur ChessCaravan, vous pouvez jouer au shatranj : choisissez « 🏺 Shatranj » dans le panneau de jeu (le pat et le roi adverse dépouillé gagnent !)."]
      ] },
    {
      "id": "endgame",
      "icon": "👑",
      "title": [
        "Endshpil asoslari",
        "Endgame basics",
        "Основы эндшпиля",
        "Fundamentos del final",
        "Grundlagen des Endspiels",
        "Les bases de la finale"
      ],
      "lead": [
        "Donalar kamaygach o'yin boshqacha bo'ladi: shoh hujumdan qo'rqmaydi, piyodalar esa farzinga aylanishga intiladi.",
        "When few pieces remain the game changes: the king is no longer afraid, and pawns race to become queens.",
        "Когда фигур остаётся мало, игра меняется: король больше не боится атак, а пешки рвутся в ферзи.",
        "Cuando quedan pocas piezas, el juego cambia: el rey ya no teme ataques y los peones corren para coronar.",
        "Wenn nur noch wenige Figuren übrig sind, ändert sich das Spiel: Der König hat keine Angst mehr, und die Bauern laufen zur Umwandlung.",
        "Quand il reste peu de pièces, le jeu change : le roi ne craint plus les attaques et les pions courent à la promotion."
      ],
      "points": [
        [
          "Endshpilda shoh — kuchli dona. Uni markazga olib chiqing va piyodalaringizga yordam bering.",
          "In the endgame the king is a strong piece. Bring it to the centre and let it help your pawns.",
          "В эндшпиле король — сильная фигура. Ведите его в центр, пусть помогает пешкам.",
          "En el final el rey es una pieza fuerte. Llévalo al centro y que ayude a tus peones.",
          "Im Endspiel ist der König eine starke Figur. Bring ihn ins Zentrum, damit er deinen Bauern hilft.",
          "En finale, le roi est une pièce forte. Amenez-le au centre pour qu'il aide vos pions."
        ],
        [
          "O'tgan piyoda (oldida va yonidagi vertikallarda raqib piyodasi yo'q) — eng katta boylik. Uni oldinga yurgizing.",
          "A passed pawn (no enemy pawns in front of it or on the neighbouring files) is your biggest asset. Push it.",
          "Проходная пешка (перед ней и на соседних вертикалях нет пешек соперника) — главное богатство. Продвигайте её.",
          "Un peón pasado (sin peones rivales delante ni en las columnas vecinas) es tu mayor tesoro. Empújalo.",
          "Ein Freibauer (vor ihm und auf den Nachbarlinien keine gegnerischen Bauern) ist dein größter Trumpf. Schieb ihn vor.",
          "Un pion passé (sans pion adverse devant lui ni sur les colonnes voisines) est votre plus grand atout. Poussez-le."
        ],
        [
          "Oppozitsiya: shohlar bir chiziqda, orasida bitta katak bo'lsa va navbat raqibda bo'lsa — u chekinishga majbur. Piyodali endshpillarda bu hal qiluvchi.",
          "Opposition: when the kings face each other with one square between them and it is the opponent’s move, he must give way. In pawn endgames this decides everything.",
          "Оппозиция: короли стоят друг против друга через одно поле, и ход за соперником — он вынужден уступить. В пешечных эндшпилях это решает всё.",
          "La oposición: cuando los reyes se enfrentan con una casilla entre ellos y le toca al rival, este debe ceder. En los finales de peones lo decide todo.",
          "Opposition: Stehen sich die Könige mit einem Feld Abstand gegenüber und ist der Gegner am Zug, muss er weichen. In Bauernendspielen entscheidet das alles.",
          "L'opposition : quand les rois se font face avec une case entre eux et que l'adversaire est au trait, il doit céder. Dans les finales de pions, c'est décisif."
        ],
        [
          "Kvadrat qoidasi: piyodadan oxirgi qatorgacha kvadrat chizing. Raqib shohi shu kvadratga kira olsa, piyodani ushlaydi.",
          "Rule of the square: draw a square from the pawn to the last rank. If the enemy king can step into it, it will catch the pawn.",
          "Правило квадрата: постройте квадрат от пешки до последней горизонтали. Если король соперника может в него войти, он догонит пешку.",
          "Regla del cuadrado: traza un cuadrado del peón a la última fila. Si el rey rival puede entrar en él, alcanzará al peón.",
          "Quadratregel: Zeichne ein Quadrat vom Bauern bis zur letzten Reihe. Kann der gegnerische König hineintreten, holt er den Bauern ein.",
          "La règle du carré : tracez un carré du pion à la dernière rangée. Si le roi adverse peut y entrer, il rattrapera le pion."
        ],
        [
          "Rux endshpilida rux o'tgan piyodaning orqasida tursin — o'zinikida ham, raqibnikida ham (Tarrash qoidasi).",
          "In rook endgames, put your rook behind passed pawns — your own and the enemy’s (Tarrasch’s rule).",
          "В ладейных эндшпилях ставьте ладью позади проходных пешек — и своих, и чужих (правило Тарраша).",
          "En los finales de torres, coloca la torre detrás de los peones pasados, propios y ajenos (regla de Tarrasch).",
          "Stell im Turmendspiel den Turm hinter Freibauern — eigene wie gegnerische (Tarrasch-Regel).",
          "En finale de tours, placez votre tour derrière les pions passés, les vôtres comme ceux de l'adversaire (règle de Tarrasch)."
        ],
        [
          "Farzin bilan va rux bilan mat qilishni albatta o'rganing — ularni \"👥 Bir qurilmada\" rejimida o'zingiz mashq qilib ko'ring.",
          "Learn to mate with a queen and with a rook — practise them yourself in “👥 Same device” mode.",
          "Обязательно научитесь ставить мат ферзём и ладьёй — потренируйтесь сами в режиме «👥 На одном устройстве».",
          "Aprende a dar mate con dama y con torre; practícalo en el modo «👥 En un dispositivo».",
          "Lerne das Matt mit Dame und mit Turm — üb es selbst im Modus „👥 Ein Gerät“.",
          "Apprenez à mater avec la dame et avec la tour — entraînez-vous en mode « 👥 Même appareil »."
        ]
      ],
      "example": {
        "fen": "8/8/8/4k3/8/4K3/4P3/8 w - - 0 1",
        "marks": [
          "e3",
          "e5"
        ],
        "caption": [
          "Oppozitsiya: shohlar e3 va e5 da, orasida bitta katak. Navbat kimda bo'lsa, o'sha chekinishga majbur.",
          "Opposition: the kings on e3 and e5 face each other with one square between them. Whoever is to move must give way.",
          "Оппозиция: короли на e3 и e5, между ними одно поле. Тот, чей ход, вынужден отступить.",
          "Oposición: los reyes en e3 y e5, con una casilla entre ellos. A quien le toque mover debe ceder.",
          "Opposition: Die Könige auf e3 und e5 mit einem Feld dazwischen. Wer am Zug ist, muss weichen.",
          "Opposition : les rois en e3 et e5, une case entre eux. Celui qui est au trait doit céder."
        ]
      }
    },
    {
      "id": "fork",
      "icon": "🍴",
      "title": [
        "Taktika: vilka",
        "Tactics: the fork",
        "Тактика: вилка",
        "Táctica: el doble ataque",
        "Taktik: die Gabel",
        "Tactique : la fourchette"
      ],
      "lead": [
        "Bitta yurish bilan ikkita donaga hujum qilish — taktikaning eng ko'p uchraydigan quroli.",
        "Attacking two pieces with one move is the most common tactical weapon.",
        "Напасть одним ходом на две фигуры — самое частое тактическое оружие.",
        "Atacar dos piezas con una sola jugada es el arma táctica más común.",
        "Mit einem Zug zwei Figuren angreifen — die häufigste taktische Waffe.",
        "Attaquer deux pièces d'un seul coup : l'arme tactique la plus fréquente."
      ],
      "points": [
        [
          "Vilka — bitta dona bir vaqtda ikki yoki undan ko'p raqib donasiga hujum qiladi. Raqib faqat bittasini qutqara oladi.",
          "A fork is one piece attacking two or more enemy pieces at once. The opponent can save only one.",
          "Вилка — одна фигура нападает сразу на две и более фигуры соперника. Спасти он сможет только одну.",
          "Un doble ataque es una pieza que ataca a la vez dos o más piezas rivales. El rival solo puede salvar una.",
          "Eine Gabel ist eine Figur, die gleichzeitig zwei oder mehr gegnerische Figuren angreift. Der Gegner kann nur eine retten.",
          "Une fourchette, c'est une pièce qui attaque à la fois deux pièces adverses ou plus. L'adversaire ne peut en sauver qu'une."
        ],
        [
          "Ot vilkasi eng xavfli: otning hujumini to'sib bo'lmaydi va u kutilmagan kataklarga sakraydi.",
          "The knight fork is the most dangerous: a knight’s attack cannot be blocked, and it jumps to unexpected squares.",
          "Вилка конём — самая опасная: удар коня нельзя перекрыть, и он прыгает на неожиданные поля.",
          "El doble ataque de caballo es el más peligroso: no se puede interponer nada y salta a casillas inesperadas.",
          "Die Springergabel ist die gefährlichste: Der Angriff eines Springers lässt sich nicht verstellen, und er springt auf unerwartete Felder.",
          "La fourchette de cavalier est la plus dangereuse : on ne peut pas s'interposer et il saute sur des cases inattendues."
        ],
        [
          "Shoh bilan birga qilingan vilka (shoh berib) ayniqsa kuchli — raqib avval shohini qutqarishi shart.",
          "A fork that also gives check is especially strong — the opponent must save the king first.",
          "Вилка с шахом особенно сильна — сопернику сначала нужно спасать короля.",
          "Un doble ataque con jaque es especialmente fuerte: el rival debe salvar primero al rey.",
          "Eine Gabel mit Schach ist besonders stark — der Gegner muss zuerst den König retten.",
          "Une fourchette avec échec est particulièrement forte : l'adversaire doit d'abord sauver son roi."
        ],
        [
          "Piyoda va farzin ham vilka qiladi: masalan, piyoda bir yurishda ikki yonidagi donaga hujum qiladi.",
          "Pawns and queens fork too: for example, a pawn advance can attack the two pieces beside its path.",
          "Вилку делают и пешка, и ферзь: например, пешка одним ходом нападает на две фигуры по сторонам.",
          "Los peones y la dama también hacen dobles ataques: por ejemplo, un peón que avanza ataca dos piezas a sus lados.",
          "Auch Bauer und Dame gabeln: Ein Bauernzug kann etwa die beiden Figuren neben ihm angreifen.",
          "Le pion et la dame font aussi des fourchettes : par exemple, un pion qui avance attaque les deux pièces sur ses côtés."
        ],
        [
          "Qanday topish: raqibning himoyasiz donalari va shohi qayerda? Ularning ikkalasiga bir yurishda yeta oladigan donangiz bormi?",
          "How to find one: where are the enemy king and the undefended pieces? Can one of your pieces reach two of them in one move?",
          "Как найти: где король и незащищённые фигуры соперника? Может ли ваша фигура одним ходом напасть на две из них?",
          "Cómo encontrarlo: ¿dónde están el rey y las piezas sin defensa del rival? ¿Alguna pieza tuya llega a dos de ellas en una jugada?",
          "So findest du sie: Wo stehen der König und ungedeckte Figuren des Gegners? Kann eine deiner Figuren mit einem Zug zwei davon angreifen?",
          "Comment la trouver : où sont le roi et les pièces non défendues de l'adversaire ? Une de vos pièces peut-elle en atteindre deux en un coup ?"
        ]
      ],
      "example": {
        "fen": "r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1",
        "marks": [
          "d5",
          "c7",
          "e8",
          "a8"
        ],
        "caption": [
          "Nc7+! — ot shoh beradi va bir vaqtda a8 dagi ruxga hujum qiladi. Shoh qochadi, rux olinadi.",
          "Nc7+! — the knight gives check and attacks the rook on a8 at the same time. The king moves away and the rook falls.",
          "Nc7+! — конь объявляет шах и одновременно нападает на ладью a8. Король уходит, ладья теряется.",
          "¡Cc7+! — el caballo da jaque y a la vez ataca la torre de a8. El rey se aparta y la torre cae.",
          "Sc7+! — der Springer gibt Schach und greift zugleich den Turm auf a8 an. Der König weicht, der Turm fällt.",
          "Cc7+ ! — le cavalier fait échec et attaque en même temps la tour a8. Le roi s'écarte, la tour tombe."
        ]
      }
    },
    {
      "id": "pin",
      "icon": "📌",
      "title": [
        "Taktika: bog'lash",
        "Tactics: the pin",
        "Тактика: связка",
        "Táctica: la clavada",
        "Taktik: die Fesselung",
        "Tactique : le clouage"
      ],
      "lead": [
        "Bog'langan dona yurolmaydi yoki yursa qimmatga tushadi — uni \"mixlab qo'yilgan\" deb tasavvur qiling.",
        "A pinned piece cannot move, or moving it costs you dearly — think of it as nailed to the board.",
        "Связанная фигура не может ходить или её ход дорого обходится — представьте, что она прибита к доске.",
        "Una pieza clavada no puede moverse, o moverla cuesta caro: imagina que está clavada al tablero.",
        "Eine gefesselte Figur kann nicht ziehen, oder der Zug kostet viel — stell sie dir als festgenagelt vor.",
        "Une pièce clouée ne peut pas bouger, ou cela coûte cher : imaginez-la clouée à l'échiquier."
      ],
      "points": [
        [
          "Bog'lash: uzoq yuruvchi dona (fil, rux, farzin) raqib donasiga hujum qiladi, uning orqasida esa qimmatroq dona turadi.",
          "A pin: a long-range piece (bishop, rook, queen) attacks an enemy piece that has a more valuable piece behind it.",
          "Связка: дальнобойная фигура (слон, ладья, ферзь) нападает на фигуру соперника, за которой стоит более ценная.",
          "Clavada: una pieza de largo alcance (alfil, torre, dama) ataca una pieza rival que tiene otra más valiosa detrás.",
          "Fesselung: Eine langschrittige Figur (Läufer, Turm, Dame) greift eine gegnerische Figur an, hinter der eine wertvollere steht.",
          "Clouage : une pièce à longue portée (fou, tour, dame) attaque une pièce adverse derrière laquelle se trouve une pièce plus précieuse."
        ],
        [
          "To'liq bog'lash: orqada shoh turgan bo'lsa, bog'langan dona qoidaga ko'ra umuman yura olmaydi.",
          "Absolute pin: if the king is behind, the pinned piece is not allowed to move at all.",
          "Полная связка: если сзади король, связанная фигура по правилам вообще не может ходить.",
          "Clavada absoluta: si detrás está el rey, la pieza clavada no puede moverse en absoluto.",
          "Absolute Fesselung: Steht der König dahinter, darf die gefesselte Figur gar nicht ziehen.",
          "Clouage absolu : si le roi est derrière, la pièce clouée n'a pas le droit de bouger."
        ],
        [
          "Qisman bog'lash: orqada farzin yoki rux tursa, yurish mumkin, lekin orqadagi dona yo'qotiladi.",
          "Relative pin: if a queen or rook is behind, the piece may move, but the piece behind will be lost.",
          "Частичная связка: если сзади ферзь или ладья, ходить можно, но стоящая сзади фигура будет потеряна.",
          "Clavada relativa: si detrás hay una dama o una torre, la pieza puede moverse, pero se perderá la de atrás.",
          "Relative Fesselung: Steht dahinter Dame oder Turm, darf die Figur ziehen, aber die Figur dahinter geht verloren.",
          "Clouage relatif : si une dame ou une tour est derrière, la pièce peut bouger, mais celle de derrière sera perdue."
        ],
        [
          "Bog'langan donaga yana hujum qiling (masalan, piyoda bilan) — u qochib qutula olmaydi.",
          "Attack the pinned piece again (for example with a pawn) — it cannot run away.",
          "Атакуйте связанную фигуру ещё раз (например, пешкой) — убежать она не сможет.",
          "Ataca de nuevo la pieza clavada (por ejemplo, con un peón): no puede huir.",
          "Greif die gefesselte Figur noch einmal an (etwa mit einem Bauern) — sie kann nicht fliehen.",
          "Attaquez encore la pièce clouée (par exemple avec un pion) : elle ne peut pas s'enfuir."
        ],
        [
          "O'zingizni himoya qilish: shohni bog'lash chizig'idan chetga oling yoki o'rtaga boshqa dona qo'ying.",
          "To defend: step the king off the line or put another piece in between.",
          "Защита: уведите короля с линии связки или поставьте между ними другую фигуру.",
          "Para defenderte: aparta al rey de la línea o interpón otra pieza.",
          "Zur Verteidigung: Stell den König von der Linie weg oder eine andere Figur dazwischen.",
          "Pour se défendre : écartez le roi de la ligne ou interposez une autre pièce."
        ]
      ],
      "example": {
        "fen": "4k3/8/2n5/1B6/8/8/8/4K3 w - - 0 1",
        "marks": [
          "b5",
          "c6",
          "e8"
        ],
        "caption": [
          "Fil b5 c6 dagi otni bog'lagan: ot yursa, e8 dagi shoh hujumga qoladi — shuning uchun ot umuman yura olmaydi.",
          "The bishop on b5 pins the knight on c6: if the knight moved, the king on e8 would be in check — so it cannot move at all.",
          "Слон b5 связал коня c6: если конь пойдёт, король e8 окажется под шахом — поэтому конь вообще не может ходить.",
          "El alfil de b5 clava el caballo de c6: si el caballo se moviera, el rey de e8 quedaría en jaque, así que no puede moverse.",
          "Der Läufer auf b5 fesselt den Springer auf c6: Würde er ziehen, stünde der König auf e8 im Schach — also darf er gar nicht ziehen.",
          "Le fou b5 cloue le cavalier c6 : s'il bougeait, le roi e8 serait en échec — il ne peut donc pas bouger du tout."
        ]
      }
    },
    {
      "id": "discovered",
      "icon": "💥",
      "title": [
        "Taktika: ochiq hujum",
        "Tactics: the discovered attack",
        "Тактика: вскрытое нападение",
        "Táctica: el ataque a la descubierta",
        "Taktik: der Abzugsangriff",
        "Tactique : l’attaque à la découverte"
      ],
      "lead": [
        "Bir dona yo'ldan chiqadi — orqasidagi dona hujumga o'tadi. Bitta yurishda ikkita tahdid!",
        "One piece steps aside and the piece behind it attacks. Two threats in a single move!",
        "Одна фигура уходит с линии, и стоящая за ней фигура нападает. Две угрозы одним ходом!",
        "Una pieza se aparta y la que está detrás ataca. ¡Dos amenazas en una jugada!",
        "Eine Figur zieht zur Seite, und die Figur dahinter greift an. Zwei Drohungen mit einem Zug!",
        "Une pièce s'écarte et celle qui est derrière attaque. Deux menaces en un seul coup !"
      ],
      "points": [
        [
          "Ochiq hujum: o'z donangiz uzoq yuruvchi donangiz (rux, fil, farzin) chizig'ini to'sib turadi. U yurganda chiziq ochiladi.",
          "A discovered attack: one of your pieces blocks the line of your own long-range piece (rook, bishop, queen). When it moves, the line opens.",
          "Вскрытое нападение: ваша фигура перекрывает линию вашей же дальнобойной фигуры (ладьи, слона, ферзя). Когда она уходит, линия открывается.",
          "Ataque a la descubierta: una pieza tuya tapa la línea de tu propia pieza de largo alcance (torre, alfil, dama). Al moverse, la línea se abre.",
          "Abzugsangriff: Eine eigene Figur verstellt die Linie deiner langschrittigen Figur (Turm, Läufer, Dame). Zieht sie weg, öffnet sich die Linie.",
          "Attaque à la découverte : une de vos pièces bouche la ligne de votre propre pièce à longue portée (tour, fou, dame). Quand elle bouge, la ligne s'ouvre."
        ],
        [
          "Ochiq shoh: orqadagi dona shoh beradi, oldingi dona esa istalgan joyga — hatto himoyalangan farzinni olishga ham boradi.",
          "Discovered check: the piece behind gives check, while the front piece goes anywhere — even to grab a defended queen.",
          "Вскрытый шах: задняя фигура объявляет шах, а передняя идёт куда угодно — даже взять защищённого ферзя.",
          "Jaque a la descubierta: la pieza de atrás da jaque y la de delante va a donde quiera, incluso a capturar una dama defendida.",
          "Abzugsschach: Die hintere Figur gibt Schach, die vordere geht irgendwohin — sogar eine gedeckte Dame schlagen.",
          "Échec à la découverte : la pièce de derrière fait échec, tandis que celle de devant va où elle veut, même prendre une dame défendue."
        ],
        [
          "Qo'sh shoh: ikkala dona bir vaqtda shoh beradi. Undan faqat shoh yurishi bilan qutulish mumkin — Reti–Tartakover partiyasini ko'ring.",
          "Double check: both pieces give check at once. Only a king move can escape it — see the Réti–Tartakower game.",
          "Двойной шах: обе фигуры объявляют шах одновременно. Спастись можно только ходом короля — посмотрите партию Рети — Тартаковер.",
          "Jaque doble: las dos piezas dan jaque a la vez. Solo un movimiento del rey lo evita; mira la partida Réti–Tartakower.",
          "Doppelschach: Beide Figuren geben gleichzeitig Schach. Nur ein Königszug hilft — sieh dir die Partie Réti–Tartakower an.",
          "Échec double : les deux pièces font échec à la fois. Seul un coup du roi peut l'éviter — voyez la partie Réti–Tartakower."
        ],
        [
          "Tayyorlash: raqib shohi yoki farzini turgan chiziqqa o'z rux/filingizni qo'ying, oldiga esa yuradigan donangizni.",
          "Set it up: aim your rook or bishop at the enemy king or queen, with another of your pieces in front of it.",
          "Подготовка: нацельте ладью или слона на короля или ферзя соперника, а перед ней поставьте другую свою фигуру.",
          "Prepáralo: apunta tu torre o alfil al rey o la dama rival, con otra pieza tuya delante.",
          "So bereitest du ihn vor: Richte Turm oder Läufer auf König oder Dame des Gegners und stell eine eigene Figur davor.",
          "Pour la préparer : visez le roi ou la dame adverse avec votre tour ou votre fou, avec une autre de vos pièces devant."
        ]
      ],
      "example": {
        "fen": "q3k3/8/8/8/4B3/8/8/4RK2 w - - 0 1",
        "marks": [
          "e4",
          "a8",
          "e1",
          "e8"
        ],
        "caption": [
          "Bxa8+! — fil e-chiziqdan chiqib, a8 dagi farzinni oladi, e1 dagi rux esa e8 dagi shohga ochiq shoh beradi.",
          "Bxa8+! — the bishop leaves the e-file and takes the queen on a8, while the rook on e1 gives a discovered check to the king on e8.",
          "Bxa8+! — слон уходит с линии «e» и берёт ферзя a8, а ладья e1 объявляет вскрытый шах королю e8.",
          "¡Axa8+! — el alfil sale de la columna e y captura la dama de a8, mientras la torre de e1 da jaque a la descubierta al rey de e8.",
          "Lxa8+! — der Läufer verlässt die e-Linie und schlägt die Dame auf a8, der Turm auf e1 gibt dem König auf e8 Abzugsschach.",
          "Fxa8+ ! — le fou quitte la colonne e et prend la dame a8, tandis que la tour e1 fait échec à la découverte au roi e8."
        ]
      }
    }
  ];
});
