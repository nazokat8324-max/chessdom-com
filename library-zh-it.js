// 📚 Kutubxona — 中文, Italiano (library-more.js dan KEYIN, library.js dan OLDIN yuklanadi).
// Massivlarga library.js LANGS dagi o'rni bo'yicha element qo'shiladi (zh 12, it 13); maqola/partiya/kitob qo'shilsa — shu yerga ham.
(function () {
  const IDX = { zh: 12, it: 13 };
  const T = {
    zh: {
      articles: {
        start: { title: "国际象棋从哪里开始学", lead: "规则一天就能学会。下好棋则是一生的旅程。", points: [
          "棋盘为 8×8，共 64 格。每位棋手右手边的角格是浅色的。白方先走。",
          "王向任意方向走一格。后可以向任意方向走任意距离，车沿直线走，象沿斜线走。",
          "马走“L”形（先走两格，再向旁边走一格），它是唯一可以越过其他棋子的棋子。",
          "兵向前走一格（第一步可以走两格），斜着吃子。走到最后一排时，它会变成后、车、象或马。",
          "三种特殊着法：王车易位（王和车一步完成）、吃过路兵和升变。我们棋盘上的走法圆点总会显示哪些着法是允许的。",
          "目标是将死：王受到攻击且无处可逃。如果轮到走棋的一方没有合法着法，但王没有被将军，就是逼和——和棋。",
          "提示：先和朋友在“👥 同屏对弈”模式下开始，然后再去下休闲的在线对局。每局结束后打开“📖 对局故事”，弄清自己的错误。"] },
        opening: { title: "开局的五条黄金法则", lead: "你不需要背开局的名字。遵守这五条法则，每盘棋都能以好局面开始。", points: [
          "1. 占领中心：e4 和 d4 兵（黑方为 e5 和 d5）为你的棋子打开道路。",
          "2. 迅速出动马和象——通常先出马，后出象。",
          "3. 尽早易位：你的王会变得安全，车也会加入战斗。",
          "4. 不要过早出后——对手会追赶它，借机抢先出子。",
          "5. 不要无故把同一个棋子走两次，也不要在兵的着法上浪费时间。“歌剧院对局”（图书馆 → 名局）完美地展示了这些法则。"] },
        notation: { title: "国际象棋记谱：e4、Nf3 和 O-O 是什么意思", lead: "对局记录、PGN、分析和故事都使用简短的代数记谱法。读懂它会为你打开很多扇门。", points: [
          "直线用字母 a–h 表示，横线用数字 1–8 表示：e4 就是 e 线与第 4 横线交汇的格子。",
          "棋子用大写字母（英文）表示：K 王、Q 后、R 车、B 象、N 马。兵没有字母：e4 表示兵走到 e4，Nf3 表示马走到 f3。",
          "x 表示吃子（Bxc6——象在 c6 吃子），+ 表示将军，# 表示将死，= 表示升变（e8=Q）。",
          "O-O 是短易位（王翼），O-O-O 是长易位（后翼）。",
          "分析符号：?! 不精确，? 失误，?? 大错。我们的分析会自动标注这些符号。"] },
        shatranj: { title: "沙特兰兹——丝绸之路上的象棋", lead: "现代国际象棋沿着驼队之路从印度传到欧洲——而我们这片土地正处在这条路的中央。", points: [
          "已知最古老的国际象棋祖先是印度的恰图兰卡（约 6 世纪）。它在波斯变成了沙特兰兹。",
          "在撒马尔罕附近的阿夫拉西阿卜出土的象牙棋子，被认为是世界上最古老的棋子之一。",
          "在沙特兰兹中，军师（ferz，意为“大臣”）只能斜走一格，象（alfil）跳两格。这种棋节奏缓慢，充满细致的调动。",
          "在巴格达，苏利等大师写下了关于沙特兰兹的书。之后这种棋经由安达卢西亚和西西里传入欧洲。",
          "15 世纪的欧洲加强了后和象的威力——现代国际象棋由此诞生。你可以在 ChessCaravan 上下沙特兰兹：在对局面板上选择“🏺 沙特兰兹”（逼和对方或让对方只剩光杆王即可获胜！）。"] },
        endgame: { title: "残局基础", lead: "当棋盘上只剩少数棋子时，对局就变了：王不再害怕，兵争相升变为后。", points: [
          "在残局中，王是一枚强大的棋子。把它带到中心，让它帮助你的兵。",
          "通路兵（前方和相邻直线上都没有敌方兵）是你最大的财富。把它往前推。",
          "对王：当两个王隔一格面对面，且轮到对手走棋时，他必须让路。在兵残局中，这决定一切。",
          "正方形法则：从兵到最后一排画一个正方形。如果敌方的王能走进这个正方形，它就能追上这个兵。",
          "在车残局中，把车放在通路兵的后面——无论是自己的还是对方的（塔拉什法则）。",
          "学会用后将死和用车将死——在“👥 同屏对弈”模式下自己练习。"],
          caption: "对王：e3 和 e5 上的两个王隔一格相对。轮到走棋的一方必须让路。" },
        fork: { title: "战术：双重攻击（捉双）", lead: "一步棋同时攻击两个棋子，是最常见的战术武器。", points: [
          "捉双是指一个棋子同时攻击对方的两个或更多棋子。对手只能救下其中一个。",
          "马的捉双最危险：马的攻击无法被阻挡，而且它会跳到意想不到的格子上。",
          "同时将军的捉双尤其厉害——对手必须先救王。",
          "兵和后也能捉双：例如，兵向前推进时可以攻击它前进路线两侧的两个棋子。",
          "怎么找到捉双：敌方的王和没有保护的棋子在哪里？你的某个棋子能否一步同时够到其中两个？"],
          caption: "Nc7+！——马将军，同时攻击 a8 上的车。王只能走开，车就丢了。" },
        pin: { title: "战术：牵制", lead: "被牵制的棋子不能动，或者一动就要付出沉重代价——就像被钉在了棋盘上。", points: [
          "牵制：一个远程棋子（象、车、后）攻击对方的一个棋子，而该棋子身后有一个更有价值的棋子。",
          "绝对牵制：如果身后是王，被牵制的棋子根本不允许移动。",
          "相对牵制：如果身后是后或车，棋子可以移动，但身后的棋子会丢掉。",
          "再次攻击被牵制的棋子（例如用兵）——它无法逃走。",
          "防守方法：把王移出这条线，或者在中间垫上另一个棋子。"],
          caption: "b5 上的象牵制了 c6 上的马：如果马移动，e8 上的王就会被将军——所以它完全不能动。" },
        discovered: { title: "战术：闪击", lead: "一个棋子让开，它身后的棋子发起攻击。一步棋两个威胁！", points: [
          "闪击：你的一个棋子挡住了自己远程棋子（车、象、后）的线路。它一移开，线路就打开了。",
          "闪将：身后的棋子将军，前面的棋子可以走到任何地方——甚至去吃一个有保护的后。",
          "双将：两个棋子同时将军。只有走王才能解围——参见列蒂对塔塔科维尔的对局。",
          "如何布置：把你的车或象瞄准敌方的王或后，并在它前面放上你的另一个棋子。"],
          caption: "Bxa8+！——象离开 e 线，吃掉 a8 上的后，同时 e1 上的车对 e8 上的王闪将。" }
      },
      games: {
        legall: { title: "莱加尔陷阱", story: "一盘来自著名的摄政咖啡馆的短局。白方故意送后，用三个轻子在七步内将死。直到今天，初学者仍然会掉进这个陷阱。" },
        immortal: { title: "不朽之局", story: "浪漫主义国际象棋的象征。安德森先后弃掉两个车、一个象，最后连后也弃掉，然后用剩下的三个轻子将死。这是伦敦锦标赛休息期间下的一盘友谊赛。" },
        evergreen: { title: "常青之局", story: "埃文斯弃兵中的一次漂亮攻击。就在黑方攻击白王时，安德森弃后，用两个象困住了黑王。这个名字是威廉·斯坦尼茨起的。" },
        opera: { title: "歌剧院对局", story: "莫菲在巴黎歌剧院的包厢里，趁着演出进行，与两位贵族下了这盘棋。快速出子、打开线路和弃子：这是关于开局原则的最好一课。最后的将杀十分漂亮。" },
        reti: { title: "列蒂的短局", story: "一盘十一步就结束的对局。黑方把王留在中心，贪吃子力。列蒂弃后，用双将和将杀结束了战斗。教训是：要及时让你的王转移到安全的地方。" },
        kinghunt: { title: "猎王", story: "拉斯克在 h7 弃后，一将再将，把黑王赶过整个棋盘，一直赶到 g1。最后的将杀由王的一步完成——非常罕见的景象。" },
        century: { title: "世纪之局", story: "13 岁的鲍比·费舍尔面对强大的大师唐纳德·伯恩弃后（17...Be6!）。作为回报，他收获了大量子力，他的棋子协同作战，将死了白王。费舍尔后来成为世界冠军。" },
        rubinstein: { title: "鲁宾斯坦的不朽之局", story: "鲁宾斯坦弃后（22...Rxc3!!），又弃掉两个车。他的两个象瞄准白王，在 25...Rh3 之后将杀已无法阻止，于是白方认输。" },
        marshall: { title: "“金币”对局", story: "马歇尔把后走到 g3，那里有三种方式可以吃掉它（23...Qg3!!）。每一种吃法都会导致被将死或损失惨重。传说观众们把金币撒满了棋盘。" },
        short: { title: "国王行军", story: "在双方的后都还在棋盘上的情况下，肖特把他的王从 h2 一路走到 g5，威胁 Kh6 和 Qg7 将杀。黑方找不到防守办法，只好认输。这是王也能参与进攻的最好证明。" },
        kasparov: { title: "卡斯帕罗夫的不朽之局", story: "24.Rxd4!!——卡斯帕罗夫弃车，黑王被追过整个棋盘，一直逃到 d1。许多大师认为这是有史以来最美的一盘棋。" }
      },
      books: {
        fundamentals: "第三位世界冠军写的著名教科书：从简单的残局到中局计划。是初学者和俱乐部棋手最好的入门书之一。",
        bluebook: "规则、基本思想以及对当时已知所有开局的分析。作者是一位英国大师，标准棋子造型（斯汤顿棋子）就以他的名字命名。",
        morphy: "讲述保罗·莫菲 1858–1859 年的欧洲之行，那时他在伦敦和巴黎击败了最强的大师们。作者是莫菲的秘书，亲眼见证了这些事件。",
        bird: "国际象棋的起源、它在东方和欧洲的历史，以及对 19 世纪大师们的回忆。伯德开局（1.f4）就以作者的名字命名。",
        caxton: "最早用英语印刷的书籍之一（1474 年）。它不是规则书：每个棋子代表一个社会阶层，并借它们讲述中世纪的道德。",
        generalship: "尝试用军事战略的语言解释国际象棋：战线、补给线、力量对比。读起来比较吃力，但充满有趣的想法——适合有经验的读者。"
      }
    },
    it: {
      articles: {
        start: { title: "Da dove cominciare con gli scacchi", lead: "Le regole si imparano in un giorno. Giocare bene è un'avventura che dura tutta la vita.", points: [
          "La scacchiera è 8×8, 64 case. La casa d'angolo alla destra di ogni giocatore è chiara. Muove per primo il Bianco.",
          "Il re si muove di una casa in qualsiasi direzione. La donna si muove di quante case vuole in ogni direzione, la torre in linea retta, l'alfiere in diagonale.",
          "Il cavallo si muove a \"L\" (due case, poi una di lato) ed è l'unico pezzo che può saltare gli altri.",
          "Il pedone avanza di una casa (di due alla prima mossa) e cattura in diagonale. Quando raggiunge l'ultima traversa diventa donna, torre, alfiere o cavallo.",
          "Tre mosse speciali: l'arrocco (re e torre in una sola mossa), la presa en passant e la promozione. I puntini sulla nostra scacchiera mostrano sempre cosa è consentito.",
          "Lo scopo è lo scacco matto: il re è attaccato e non può scappare. Se chi deve muovere non ha mosse legali ma non è sotto scacco, è stallo — patta.",
          "Consiglio: comincia con un amico in modalità \"👥 Gioca in due\", poi passa alle partite online amichevoli. Dopo ogni partita apri \"📖 La storia della partita\" per capire i tuoi errori."] },
        opening: { title: "Le cinque regole d'oro dell'apertura", lead: "Non serve imparare a memoria i nomi delle aperture. Segui queste cinque regole e inizierai ogni partita in una buona posizione.", points: [
          "1. Occupa il centro: i pedoni in e4 e d4 (e5 e d5 per il Nero) aprono la strada ai tuoi pezzi.",
          "2. Sviluppa in fretta cavalli e alfieri — di solito i cavalli prima degli alfieri.",
          "3. Arrocca presto: il re è al sicuro e la torre entra in gioco.",
          "4. Non far uscire la donna troppo presto — l'avversario la inseguirà sviluppandosi con guadagno di tempo.",
          "5. Non muovere lo stesso pezzo due volte senza motivo e non perdere tempo con mosse di pedone. La Partita dell'Opera (Biblioteca → Partite famose) mostra queste regole alla perfezione."] },
        notation: { title: "La notazione scacchistica: cosa significano e4, Nf3 e O-O", lead: "Storico partite, PGN, analisi e storie usano tutti la notazione algebrica abbreviata. Saperla leggere apre molte porte.", points: [
          "Le colonne sono le lettere a–h, le traverse i numeri 1–8: e4 è la casa dove la colonna e incrocia la quarta traversa.",
          "I pezzi si indicano con lettere maiuscole (inglesi): K re, Q donna, R torre, B alfiere, N cavallo. Il pedone non ha lettera: e4 è un pedone in e4, Nf3 un cavallo in f3.",
          "x indica una cattura (Bxc6 — l'alfiere cattura in c6), + scacco, # scacco matto, = promozione (e8=Q).",
          "O-O è l'arrocco corto (lato di re), O-O-O è l'arrocco lungo (lato di donna).",
          "Segni di analisi: ?! imprecisione, ? errore, ?? svista. La nostra analisi li aggiunge automaticamente."] },
        shatranj: { title: "Shatranj — gli scacchi della Via della Seta", lead: "Gli scacchi moderni sono arrivati dall'India all'Europa lungo le vie delle carovane — e la nostra terra stava proprio al centro di quella strada.", points: [
          "Il più antico antenato conosciuto degli scacchi è il chaturanga indiano (intorno al VI secolo). In Persia divenne lo shatranj.",
          "I pezzi d'avorio trovati ad Afrasiyab, vicino a Samarcanda, sono tra i più antichi pezzi degli scacchi al mondo.",
          "Nello shatranj il ferz (\"visir\") si muove di una sola casa in diagonale e l'alfil salta di due case. Il gioco era lento e pieno di manovre attente.",
          "A Baghdad maestri come as-Suli scrissero libri sullo shatranj. Il gioco arrivò poi in Europa attraverso l'Andalusia e la Sicilia.",
          "Nell'Europa del XV secolo la donna e l'alfiere furono resi più forti — e nacquero gli scacchi moderni. Su ChessCaravan puoi giocare a shatranj: scegli \"🏺 Shatranj\" nel pannello di gioco (lo stallo e lasciare spoglio il re avversario danno la vittoria!)."] },
        endgame: { title: "Le basi del finale", lead: "Quando restano pochi pezzi il gioco cambia: il re non ha più paura e i pedoni corrono per diventare donne.", points: [
          "Nel finale il re è un pezzo forte. Portalo al centro e lascia che aiuti i tuoi pedoni.",
          "Un pedone passato (senza pedoni nemici davanti né sulle colonne vicine) è la tua risorsa più grande. Spingilo.",
          "Opposizione: quando i re sono uno di fronte all'altro con una casa in mezzo e tocca all'avversario, lui deve cedere il passo. Nei finali di pedoni questo decide tutto.",
          "Regola del quadrato: disegna un quadrato dal pedone fino all'ultima traversa. Se il re nemico può entrarci, prenderà il pedone.",
          "Nei finali di torre metti la torre dietro ai pedoni passati — i tuoi e quelli dell'avversario (regola di Tarrasch).",
          "Impara a dare matto con donna e con torre — esercitati da solo in modalità “👥 Gioca in due”."],
          caption: "Opposizione: i re in e3 ed e5 sono uno di fronte all'altro con una casa in mezzo. Chi deve muovere deve cedere il passo." },
        fork: { title: "Tattica: la forchetta", lead: "Attaccare due pezzi con una sola mossa è l'arma tattica più comune.", points: [
          "Una forchetta è un pezzo che attacca contemporaneamente due o più pezzi nemici. L'avversario può salvarne solo uno.",
          "La forchetta di cavallo è la più pericolosa: l'attacco del cavallo non si può bloccare e lui salta su case inaspettate.",
          "Una forchetta che dà anche scacco è particolarmente forte — l'avversario deve prima salvare il re.",
          "Anche pedoni e donne fanno forchette: per esempio, un pedone che avanza può attaccare i due pezzi ai lati del suo cammino.",
          "Come trovarla: dove sono il re nemico e i pezzi non difesi? Un tuo pezzo può raggiungerne due con una sola mossa?"],
          caption: "Nc7+! — il cavallo dà scacco e attacca contemporaneamente la torre in a8. Il re si sposta e la torre cade." },
        pin: { title: "Tattica: l'inchiodatura", lead: "Un pezzo inchiodato non può muoversi, oppure muoverlo costa caro — come se fosse inchiodato alla scacchiera.", points: [
          "Inchiodatura: un pezzo a lungo raggio (alfiere, torre, donna) attacca un pezzo nemico che ha dietro di sé un pezzo di maggior valore.",
          "Inchiodatura assoluta: se dietro c'è il re, il pezzo inchiodato non può muoversi affatto.",
          "Inchiodatura relativa: se dietro c'è una donna o una torre, il pezzo può muoversi, ma il pezzo dietro andrà perso.",
          "Attacca di nuovo il pezzo inchiodato (per esempio con un pedone) — non può scappare.",
          "Per difenderti: togli il re dalla linea o metti un altro pezzo in mezzo."],
          caption: "L'alfiere in b5 inchioda il cavallo in c6: se il cavallo si muovesse, il re in e8 sarebbe sotto scacco — quindi non può muoversi affatto." },
        discovered: { title: "Tattica: l'attacco di scoperta", lead: "Un pezzo si sposta e quello dietro di lui attacca. Due minacce con una sola mossa!", points: [
          "Attacco di scoperta: uno dei tuoi pezzi blocca la linea di un tuo pezzo a lungo raggio (torre, alfiere, donna). Quando si sposta, la linea si apre.",
          "Scacco di scoperta: il pezzo dietro dà scacco, mentre quello davanti va dove vuole — perfino a prendere una donna difesa.",
          "Scacco doppio: entrambi i pezzi danno scacco insieme. Si può scappare solo muovendo il re — guarda la partita Réti–Tartakower.",
          "Preparalo: punta la torre o l'alfiere verso il re o la donna nemici, con un altro tuo pezzo davanti."],
          caption: "Bxa8+! — l'alfiere lascia la colonna e e cattura la donna in a8, mentre la torre in e1 dà scacco di scoperta al re in e8." }
      },
      games: {
        legall: { title: "La trappola di Légal", story: "Una partita breve del celebre Café de la Régence. Il Bianco regala la donna di proposito e dà matto in sette mosse con tre pezzi minori. Ancora oggi i principianti ci cascano." },
        immortal: { title: "La Partita Immortale", story: "Il simbolo degli scacchi romantici. Anderssen sacrifica entrambe le torri, un alfiere e infine la donna, poi dà matto con i tre pezzi minori rimasti. Fu una partita amichevole giocata durante una pausa del torneo di Londra." },
        evergreen: { title: "La Partita Sempreverde", story: "Un attacco splendido nel Gambetto Evans. Mentre il Nero attacca il re bianco, Anderssen sacrifica la donna e chiude il re nero con due alfieri. Il nome fu dato da Wilhelm Steinitz." },
        opera: { title: "La Partita dell'Opera", story: "Morphy giocò questa partita in un palco dell'Opéra di Parigi, durante lo spettacolo, contro due nobili. Sviluppo rapido, linee aperte e sacrifici: la miglior lezione sui principi dell'apertura. Il matto finale è una meraviglia." },
        reti: { title: "La miniatura di Réti", story: "Una partita finita in undici mosse. Il Nero lascia il re al centro e fa man bassa di materiale. Réti sacrifica la donna e chiude con uno scacco doppio e matto. La lezione: metti il re al sicuro in tempo." },
        kinghunt: { title: "La caccia al re", story: "Lasker sacrifica la donna in h7 e, scacco dopo scacco, spinge il re nero attraverso tutta la scacchiera fino a g1. Il matto finale arriva con una mossa di re — uno spettacolo rarissimo." },
        century: { title: "La Partita del Secolo", story: "Bobby Fischer, a 13 anni, sacrifica la donna contro il forte maestro Donald Byrne (17...Be6!). In cambio raccoglie un mucchio di materiale e i suoi pezzi lavorano insieme per dare matto al re bianco. Fischer sarebbe poi diventato campione del mondo." },
        rubinstein: { title: "L'Immortale di Rubinstein", story: "Rubinstein sacrifica la donna (22...Rxc3!!) ed entrambe le torri. I suoi due alfieri puntano il re bianco e dopo 25...Rh3 il matto non si può più fermare, così il Bianco abbandona." },
        marshall: { title: "La partita delle “monete d'oro”", story: "Marshall mette la donna in g3, dove può essere catturata in tre modi (23...Qg3!!). Ogni cattura porta al matto o a gravi perdite. Si racconta che gli spettatori ricoprirono la scacchiera di monete d'oro." },
        short: { title: "La marcia del re", story: "Con le donne ancora sulla scacchiera, Short porta il suo re da h2 a g5, minacciando Rh6 e Dg7 matto. Il Nero non trovò difesa e abbandonò. La prova migliore che anche il re può partecipare all'attacco." },
        kasparov: { title: "L'Immortale di Kasparov", story: "24.Rxd4!! — Kasparov sacrifica una torre e il re nero viene inseguito attraverso tutta la scacchiera fino a d1. Molti maestri la considerano la partita più bella mai giocata." }
      },
      books: {
        fundamentals: "Il celebre manuale del terzo campione del mondo: dai finali semplici alla pianificazione del mediogioco. Uno dei migliori primi libri per principianti e giocatori di club.",
        bluebook: "Regole, idee di base e un'analisi di tutte le aperture conosciute all'epoca. Scritto dal maestro inglese il cui nome è legato al disegno standard dei pezzi (il set Staunton).",
        morphy: "Il viaggio europeo di Paul Morphy del 1858–1859, quando batté i maestri più forti a Londra e a Parigi. L'autore era il segretario di Morphy e vide gli eventi di persona.",
        bird: "Le origini degli scacchi, la loro storia in Oriente e in Europa e i ricordi dei maestri dell'Ottocento. L'apertura Bird (1.f4) porta il nome dell'autore.",
        caxton: "Uno dei primissimi libri stampati in inglese (1474). Non è un libro di regole: ogni pezzo rappresenta una classe sociale e attraverso i pezzi si spiega la morale medievale.",
        generalship: "Un tentativo di spiegare gli scacchi con il linguaggio della strategia militare: fronti, linee di rifornimento, rapporti di forza. Lettura impegnativa ma piena di idee curiose — per lettori esperti."
      }
    }
  };
  const put = (arr, i, v) => { if (!Array.isArray(arr) || v == null) return; while (arr.length < i) arr.push(arr[1] || ''); arr[i] = v; };
  const D = window.LibraryData || {};
  Object.keys(T).forEach((l) => {
    const i = IDX[l], t = T[l];
    (window.LibraryArticles || []).forEach((a) => {
      const x = t.articles[a.id];
      if (!x) return;
      put(a.title, i, x.title);
      put(a.lead, i, x.lead);
      (a.points || []).forEach((p, j) => put(p, i, x.points && x.points[j]));
      if (a.example && x.caption) put(a.example.caption, i, x.caption);
    });
    (D.GAMES || []).forEach((g) => { const x = t.games[g.id]; if (x) { put(g.title, i, x.title); put(g.story, i, x.story); } });
    (D.BOOKS || []).forEach((b) => { const x = t.books[b.id]; if (x) put(b.desc, i, x); });
  });
})();
