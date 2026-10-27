// 📚 Kutubxona — Тоҷикӣ, Кыргызча, Türkmençe, Azərbaycanca (library-kk.js dan KEYIN, library.js dan OLDIN yuklanadi).
// Massivlarga library.js LANGS dagi o'rni bo'yicha element qo'shiladi (tg 8, ky 9, tk 10, az 11); maqola/partiya/kitob qo'shilsa — shu yerga ham.
(function () {
  const IDX = { tg: 8, ky: 9, tk: 10, az: 11 };
  const T = {
    tg: {
      articles: {
        start: { title: "Шоҳмотро аз куҷо оғоз кардан мумкин", lead: "Қоидаҳоро дар як рӯз омӯхтан мумкин аст. Хуб бозӣ кардан — саёҳати тамоми умр.", points: [
          "Тахта 8×8, яъне 64 хона дорад. Хонаи кунҷии тарафи рости ҳар бозингар равшан аст. Аввал сафед юриш мекунад.",
          "Шоҳ ба ҳар тараф як хона меравад. Фарзин ба ҳар тараф ба ҳар масофа, рух бо хатҳои рост, фил бо диагоналҳо ҳаракат мекунад.",
          "Асп шакли «Г» меравад (ду хона, баъд як хона ба паҳлӯ) ва ягона донаест, ки аз болои дигарон ҷаҳида метавонад.",
          "Пиёда як хона пеш меравад (дар юриши аввал ду хона) ва ба тарафи диагонал мегирад. Ба қатори охир расида ба фарзин, рух, фил ё асп табдил меёбад.",
          "Се юриши махсус: қалъабандӣ (шоҳ ва рух дар як юриш), гирифтан дар гузар ва табдилёбӣ. Нуқтаҳои юриш дар тахтаи мо ҳамеша нишон медиҳанд, ки чӣ мумкин аст.",
          "Мақсад — мот: ба шоҳ ҳамла шудааст ва ӯ раҳо шуда наметавонад. Агар тарафи навбатдор юриши қонунӣ надошта бошад, вале кишт набошад, ин пат аст — дуранг.",
          "Маслиҳат: аввал бо дӯстатон дар реҷаи «👥 Дар як дастгоҳ ду нафар» оғоз кунед, баъд ба бозиҳои онлайни бе рейтинг гузаред. Пас аз ҳар бозӣ барои фаҳмидани хатоҳо «📖 Қиссаи бозӣ»-ро кушоед."] },
        opening: { title: "Панҷ қоидаи тиллоии дебют", lead: "Номи дебютҳоро аз ёд кардан лозим нест. Ин панҷ қоидаро риоя кунед ва ҳар бозиро бо мавқеи хуб оғоз мекунед.", points: [
          "1. Марказро гиред: пиёдаҳои e4 ва d4 (барои сиёҳ e5 ва d5) ба донаҳои шумо роҳ мекушоянд.",
          "2. Аспҳо ва филҳоро зуд ба бозӣ дароред — одатан аспҳо пеш аз филҳо.",
          "3. Барвақт қалъабандӣ кунед: шоҳатон бехатар мешавад ва рух ба бозӣ ҳамроҳ мегардад.",
          "4. Фарзинро барвақт набароред — рақиб онро таъқиб карда, бо суръат рушд мекунад.",
          "5. Як донаро бесабаб ду бор ҳаракат надиҳед ва вақтро ба юришҳои пиёда сарф накунед. Бозии Опера (Китобхона → Бозиҳои машҳур) ин қоидаҳоро беҳтарин нишон медиҳад."] },
        notation: { title: "Навиштаҷоти шоҳмот: e4, Nf3 ва O-O чӣ маъно доранд", lead: "Таърихи бозиҳо, PGN, таҳлил ва қиссаҳо навиштаҷоти кӯтоҳи алгебравиро истифода мебаранд. Хондани он бисёр дарҳоро мекушояд.", points: [
          "Амудҳо ҳарфҳои a–h, қаторҳо рақамҳои 1–8 мебошанд: e4 — хонае, ки амуди e бо қатори 4 бурида мешавад.",
          "Донаҳо бо ҳарфи калон (англисӣ) навишта мешаванд: K шоҳ, Q фарзин, R рух, B фил, N асп. Пиёда ҳарф надорад: e4 — пиёда ба e4, Nf3 — асп ба f3.",
          "x гирифтанро нишон медиҳад (Bxc6 — фил дар c6 мегирад), + кишт, # мот, = табдилёбӣ (e8=Q).",
          "O-O — қалъабандии кӯтоҳ (тарафи шоҳ), O-O-O — қалъабандии дароз (тарафи фарзин).",
          "Аломатҳои таҳлил: ?! ғайридақиқӣ, ? хато, ?? хатои ҷиддӣ. Таҳлили мо онҳоро худкор мегузорад."] },
        shatranj: { title: "Шатранҷ — шоҳмоти Роҳи Абрешим", lead: "Шоҳмоти муосир аз Ҳиндустон то Аврупо бо роҳҳои корвонӣ расид — ва сарзамини мо дар маркази ин роҳ буд.", points: [
          "Қадимтарин аҷдоди маълуми шоҳмот — чатурангаи ҳиндӣ (тақрибан асри VI). Дар Форс он ба шатранҷ табдил ёфт.",
          "Донаҳои устухони филе, ки дар Афросиёби назди Самарқанд ёфт шудаанд, аз қадимтарин донаҳои шоҳмоти ҷаҳон ба шумор мераванд.",
          "Дар шатранҷ фарзин танҳо як хона ба диагонал ва фил ду хона ҷаҳида меравад. Бозӣ суст ва пур аз манёврҳои эҳтиёткорона буд.",
          "Дар Бағдод устодоне чун ас-Сулӣ дар бораи шатранҷ китоб навиштанд. Баъдтар бозӣ тавассути Андалусия ва Сицилия ба Аврупо расид.",
          "Дар Аврупои асри XV фарзин ва фил қавитар карда шуданд — ва шоҳмоти муосир ба вуҷуд омад. Дар ChessCaravan шатранҷ бозӣ кардан мумкин аст: дар панели бозӣ «🏺 Шатранҷ»-ро интихоб кунед (пат ва танҳо гузоштани шоҳи рақиб ғалаба меорад!)."] },
        endgame: { title: "Асосҳои эндшпил", lead: "Вақте донаҳо кам мемонанд, бозӣ тағйир меёбад: шоҳ дигар наметарсад ва пиёдаҳо барои фарзин шудан мешитобанд.", points: [
          "Дар эндшпил шоҳ донаи қавӣ аст. Онро ба марказ бароред, то ба пиёдаҳоятон кӯмак кунад.",
          "Пиёдаи гузаранда (дар пеш ва амудҳои ҳамсоя пиёдаи рақиб надорад) бузургтарин сарвати шумост. Онро пеш баред.",
          "Оппозитсия: вақте шоҳон бо як хона фосила рӯ ба рӯ истодаанд ва навбат аз рақиб аст, ӯ маҷбур аст роҳ диҳад. Дар эндшпилҳои пиёдагӣ ин ҳама чизро ҳал мекунад.",
          "Қоидаи мураббаъ: аз пиёда то қатори охир мураббаъ кашед. Агар шоҳи рақиб ба он дохил шуда тавонад, пиёдаро медорад.",
          "Дар эндшпилҳои рухӣ рухро паси пиёдаҳои гузаранда гузоред — ҳам аз они худ, ҳам аз они рақиб (қоидаи Тарраш).",
          "Мот кардан бо фарзин ва бо рухро ҳатман омӯзед — дар реҷаи «👥 Дар як дастгоҳ ду нафар» худатон машқ кунед."], caption: "Оппозитсия: шоҳон дар e3 ва e5 бо як хона фосила рӯ ба рӯянд. Касе ки навбат дорад, маҷбур аст роҳ диҳад." },
        fork: { title: "Тактика: чангак", lead: "Ҳамла ба ду дона бо як юриш — маъмултарин силоҳи тактикӣ.", points: [
          "Чангак — вақте як дона якбора ба ду ё зиёда донаи рақиб ҳамла мекунад. Рақиб танҳо яке аз онҳоро наҷот дода метавонад.",
          "Чангаки асп хатарноктарин аст: ҳамлаи аспро бастан мумкин нест ва он ба хонаҳои ғайричашмдошт меҷаҳад.",
          "Чангаке, ки ҳамзамон кишт медиҳад, махсусан қавист — рақиб аввал бояд шоҳро наҷот диҳад.",
          "Пиёдаҳо ва фарзин низ чангак мезананд: масалан, пиёда пеш рафта ба ду донаи паҳлӯи роҳаш ҳамла карда метавонад.",
          "Чӣ гуна ёфтан: шоҳи рақиб ва донаҳои бепанох куҷоянд? Оё яке аз донаҳои шумо бо як юриш ба ҳардуяшон расида метавонад?"], caption: "Nc7+! — асп кишт медиҳад ва ҳамзамон ба рух дар a8 ҳамла мекунад. Шоҳ мегурезад ва рух меафтад." },
        pin: { title: "Тактика: бастан", lead: "Донаи басташуда ҳаракат карда наметавонад ё ҳаракаташ қимат меафтад — гӯё ба тахта мехкӯб шудааст.", points: [
          "Бастан: донаи дурзан (фил, рух, фарзин) ба донаи рақибе ҳамла мекунад, ки паси он донаи қиматтар ҳаст.",
          "Бастани мутлақ: агар паси он шоҳ бошад, донаи басташуда тамоман ҳаракат карда наметавонад.",
          "Бастани нисбӣ: агар паси он фарзин ё рух бошад, дона ҳаракат карда метавонад, вале донаи пасӣ аз даст меравад.",
          "Ба донаи басташуда бори дигар ҳамла кунед (масалан, бо пиёда) — гурехта наметавонад.",
          "Барои ҳимоя: шоҳро аз хат дур кунед ё дар байн донаи дигар гузоред."], caption: "Фили b5 аспи c6-ро бастааст: агар асп ҳаракат кунад, ба шоҳи e8 кишт мешуд — бинобар ин он тамоман ҳаракат карда наметавонад." },
        discovered: { title: "Тактика: ҳамлаи кушода", lead: "Як дона аз роҳ дур мешавад ва донаи паси он ҳамла мекунад. Ду таҳдид дар як юриш!", points: [
          "Ҳамлаи кушода: яке аз донаҳои шумо хати донаи дурзани худатонро (рух, фил, фарзин) мебандад. Вақте ҳаракат мекунад, хат кушода мешавад.",
          "Кишти кушода: донаи пасӣ кишт медиҳад, донаи пешӣ бошад ба ҳар ҷо меравад — ҳатто фарзини муҳофизатшударо мегирад.",
          "Кишти дукарата: ду дона ҳамзамон кишт медиҳанд. Танҳо бо юриши шоҳ раҳоӣ ёфтан мумкин аст — бозии Рети–Тартаковерро бинед.",
          "Барои омода кардан: рух ё фили худро ба шоҳ ё фарзини рақиб равона кунед ва пеши он донаи дигаратонро гузоред."], caption: "Bxa8+! — фил аз амуди e баромада фарзини a8-ро мегирад, рухи e1 бошад ба шоҳи e8 кишти кушода медиҳад." }
      },
      games: {
        legall: { title: "Доми Легал", story: "Бозии кӯтоҳ аз қаҳвахонаи машҳури Café de la Régence. Сафед қасдан фарзинашро медиҳад ва бо се донаи сабук дар юриши ҳафтум мот мекунад. Навкорон то ҳол ба ин дом меафтанд." },
        immortal: { title: "Бозии ҷовидона", story: "Рамзи шоҳмоти романтикӣ. Андерсен ҳарду рух, як фил ва дар охир фарзинашро қурбон карда, бо се донаи сабуки боқимонда мот мекунад. Ин бозии дӯстона дар танаффуси мусобиқаи Лондон буд." },
        evergreen: { title: "Бозии ҳамешасабз", story: "Ҳамлаи зебо дар гамбити Эванс. Ҳангоме ки сиёҳ ба шоҳи сафед ҳамла мекунад, Андерсен фарзинашро қурбон карда, шоҳи сиёҳро бо ду фил ба дом меандозад. Номро Вилҳелм Стейнитс додааст." },
        opera: { title: "Бозии Опера", story: "Морфи ин бозиро дар ложаи Операи Париж, ҳангоми намоиш, бар зидди ду ашрофзода бозӣ кардааст. Рушди тез, хатҳои кушода ва қурбониҳо — беҳтарин дарси қоидаҳои дебют. Моти охир хеле зебост." },
        reti: { title: "Миниатюраи Рети", story: "Бозӣ дар ёздаҳ юриш анҷом ёфт. Сиёҳ шоҳро дар марказ гузошта, ба гирифтани донаҳо машғул шуд. Рети фарзинашро қурбон карда, бо кишти дукарата мот мекунад. Дарс: шоҳатонро сари вақт ба ҷои бехатар баред." },
        kinghunt: { title: "Шикори шоҳ", story: "Ласкер фарзинашро дар h7 қурбон карда, бо кишт паси кишт шоҳи сиёҳро тамоми тахта то g1 мебарад. Моти охир бо юриши шоҳ эълон мешавад — ҳолати хеле нодир." },
        century: { title: "Бозии аср", story: "Бобби Фишери 13-сола бар зидди устоди қавӣ Доналд Бирн фарзинашро қурбон мекунад (17...Be6!). Дар ивазаш маводи зиёд ҷамъ карда, донаҳояш якҷоя шоҳи сафедро мот мекунанд. Фишер баъдтар қаҳрамони ҷаҳон шуд." },
        rubinstein: { title: "Бозии ҷовидонаи Рубинштейн", story: "Рубинштейн фарзин (22...Rxc3!!) ва ҳарду рухашро қурбон мекунад. Ду филаш ба шоҳи сафед нишон гирифтаанд ва пас аз 25...Rh3 мотро боздоштан ғайриимкон аст, бинобар ин сафед таслим шуд." },
        marshall: { title: "Бозии «Тангаҳои тилло»", story: "Маршалл фарзинашро ба g3 мегузорад, ки онро бо се роҳ гирифтан мумкин аст (23...Qg3!!). Ҳар гирифтан ба мот ё талафоти калон мебарад. Тибқи ривоят, тамошобинон ба тахта тангаи тилло пошидаанд." },
        short: { title: "Сайри шоҳ", story: "Вақте фарзинҳо ҳанӯз дар тахтаанд, Шорт шоҳашро аз h2 то g5 мебарад ва бо Kh6 ва моти Qg7 таҳдид мекунад. Сиёҳ ҳимоя наёфт ва таслим шуд. Беҳтарин далел, ки шоҳ ҳам ба ҳамла ҳамроҳ шуда метавонад." },
        kasparov: { title: "Бозии ҷовидонаи Каспаров", story: "24.Rxd4!! — Каспаров рухро қурбон мекунад ва шоҳи сиёҳ тамоми тахта то d1 таъқиб мешавад. Бисёр устодон онро зеботарин бозии то кунун бозишуда медонанд." }
      },
      books: {
        fundamentals: "Китоби дарсии машҳури қаҳрамони сеюми ҷаҳон: аз эндшпилҳои оддӣ то нақшаҳои миттелшпил. Яке аз беҳтарин китобҳои аввал барои навкорон ва бозингарони клубӣ.",
        bluebook: "Қоидаҳо, ғояҳои асосӣ ва таҳлили ҳамаи дебютҳои он замон маълум. Муаллиф устоди англис аст, ки номаш ба тарҳи стандартии донаҳо (маҷмӯи Стаунтон) вобаста аст.",
        morphy: "Дар бораи сафари аврупоии Пол Морфи дар солҳои 1858–1859, ки дар Лондон ва Париж қавитарин устодонро бурд. Муаллиф котиби Морфи буд ва воқеаҳоро бо чашми худ дидааст.",
        bird: "Пайдоиши шоҳмот, таърихи он дар Шарқ ва Аврупо ва хотираҳо дар бораи устодони асри XIX. Дебюти Бёрд (1.f4) ба номи муаллиф гузошта шудааст.",
        caxton: "Яке аз аввалин китобҳои ба забони англисӣ чопшуда (1474). Ин китоби қоидаҳо нест: ҳар дона як табақаи ҷомеаро ифода мекунад ва ахлоқи асримиёнагӣ тавассути онҳо шарҳ дода мешавад.",
        generalship: "Кӯшиши шарҳ додани шоҳмот бо забони стратегияи ҳарбӣ: ҷабҳаҳо, хатҳои таъминот, таносуби қувваҳо. Хонданаш вазнин, вале пур аз ғояҳои ҷолиб — барои хонандагони таҷрибадор."
      }
    },
    ky: {
      articles: {
        start: { title: "Шахматты эмнеден баштоо керек", lead: "Эрежелерди бир күндө үйрөнсө болот. Ал эми жакшы ойноо — өмүр бою созулган саякат.", points: [
          "Такта 8×8, 64 чарчыдан турат. Ар бир оюнчунун оң жагындагы бурчтагы чарчы ачык түстө болот. Биринчи ак жүрөт.",
          "Падыша каалаган тарапка бир чарчы жүрөт. Ферзь каалаган тарапка каалагандай аралыкка, ладья түз сызыктар боюнча, пил диагоналдар боюнча жүрөт.",
          "Ат «Г» тамгасы сыяктуу жүрөт (эки чарчы, андан кийин бир чарчы капталга) жана башка фигуралардын үстүнөн секире алган жалгыз фигура.",
          "Пешка бир чарчы алдыга жүрөт (биринчи жүрүшүндө эки чарчы) жана кыйгачынан алат. Акыркы катарга жеткенде ферзге, ладьяга, пилге же атка айланат.",
          "Үч өзгөчө жүрүш: рокировка (падыша менен ладья бир жүрүштө), өтүп бара жатканда алуу жана айлануу. Биздин тактадагы жүрүш чекиттери эмне мүмкүн экенин ар дайым көрсөтөт.",
          "Максат — мат: падышага кол салынган жана ал кутула албайт. Кезеги келген тарапта эрежеге ылайык жүрүш жок болсо, бирок шах жок болсо — бул пат, тең.",
          "Кеңеш: адегенде досуңуз менен «👥 Бир түзмөктө экөө» режиминде баштаңыз, андан кийин рейтингсиз онлайн оюндарга өтүңүз. Ар бир оюндан кийин каталарыңызды түшүнүү үчүн «📖 Оюндун окуясын» ачыңыз."] },
        opening: { title: "Дебюттун беш алтын эрежеси", lead: "Дебюттардын аттарын жаттоонун кереги жок. Бул беш эрежени аткарсаңыз, ар бир оюнду жакшы позициядан баштайсыз.", points: [
          "1. Борборду ээлеңиз: e4 жана d4 пешкалары (кара үчүн e5 жана d5) фигураларыңызга жол ачат.",
          "2. Аттарды жана пилдерди тез өнүктүрүңүз — адатта аттар пилдерден мурун.",
          "3. Эрте рокировка жасаңыз: падышаңыз коопсуз болот, ладья оюнга кошулат.",
          "4. Ферзди эрте чыгарбаңыз — атаандаш аны кууп, темп утуп өнүгөт.",
          "5. Бир фигураны себепсиз эки жолу жүрбөңүз жана пешка жүрүштөрүнө убакыт коротпоңуз. Опера оюну (Китепкана → Атактуу оюндар) бул эрежелерди эң сонун көрсөтөт."] },
        notation: { title: "Шахмат жазуусу: e4, Nf3 жана O-O эмнени билдирет", lead: "Оюндар тарыхы, PGN, талдоо жана окуялар кыска алгебралык жазууну колдонот. Аны окуй билүү көп эшиктерди ачат.", points: [
          "Тик катарлар a–h тамгалары, туурасынан катарлар 1–8 сандары: e4 — e тик катары менен 4-катар кесилишкен чарчы.",
          "Фигуралар баш тамга менен (англисче) жазылат: K падыша, Q ферзь, R ладья, B пил, N ат. Пешканын тамгасы жок: e4 — пешка e4кө, Nf3 — ат f3кө.",
          "x алууну билдирет (Bxc6 — пил c6да алат), + шах, # мат, = айлануу (e8=Q).",
          "O-O — кыска рокировка (падыша канаты), O-O-O — узун рокировка (ферзь канаты).",
          "Талдоо белгилери: ?! тактыксыздык, ? ката, ?? орой ката. Биздин талдоо аларды автоматтык түрдө коёт."] },
        shatranj: { title: "Шатранж — Жибек жолунун шахматы", lead: "Азыркы шахмат Индиядан Европага кербен жолдору аркылуу жеткен — ал эми ошол жолдун ортосунда биздин аймак турган.", points: [
          "Шахматтын белгилүү эң байыркы атасы — индиялык чатуранга (болжол менен VI кылым). Персияда ал шатранжга айланган.",
          "Самарканддын жанындагы Афрасиябдан табылган пил сөөгүнөн жасалган фигуралар дүйнөдөгү эң байыркы шахмат фигураларынын катарына кирет.",
          "Шатранжда ферзь диагонал боюнча бир гана чарчы, ал эми пил эки чарчы секирип жүрөт. Оюн жай жана этияттык менен жасалган маневрлерге толгон.",
          "Багдадда ас-Сули сыяктуу чеберлер шатранж жөнүндө китептерди жазышкан. Кийин оюн Андалусия жана Сицилия аркылуу Европага жеткен.",
          "XV кылымдагы Европада ферзь менен пил күчөтүлүп, азыркы шахмат пайда болгон. ChessCaravan'да шатранж ойносо болот: оюн панелинде «🏺 Шатранж» тандаңыз (пат кылуу жана атаандаштын падышасын жалгыз калтыруу жеңиш алып келет!)."] },
        endgame: { title: "Эндшпилдин негиздери", lead: "Фигуралар азайганда оюн өзгөрөт: падыша эми коркпойт, пешкалар ферзь болууга умтулат.", points: [
          "Эндшпилде падыша — күчтүү фигура. Аны борборго чыгарып, пешкаларыңызга жардам берсин.",
          "Өтмө пешка (алдында жана коңшу тик катарларда атаандаштын пешкасы жок) — эң чоң байлыгыңыз. Аны алдыга сүрүңүз.",
          "Оппозиция: падышалар ортосунда бир чарчы калтырып бетме-бет турганда жана кезек атаандашта болсо, ал жол берүүгө аргасыз. Пешкалуу эндшпилдерде бул баарын чечет.",
          "Чарчы эрежеси: пешкадан акыркы катарга чейин чарчы тартыңыз. Атаандаштын падышасы ага кире алса, пешканы кууп жетет.",
          "Ладьялуу эндшпилдерде ладьяңызды өтмө пешкалардын артына коюңуз — өзүңүздүкүнүн да, атаандаштыкынын да (Тарраш эрежеси).",
          "Ферзь жана ладья менен мат коюуну сөзсүз үйрөнүңүз — «👥 Бир түзмөктө экөө» режиминде өзүңүз машыгыңыз."], caption: "Оппозиция: e3 жана e5теги падышалардын ортосунда бир чарчы бар. Кезеги келгени жол берүүгө аргасыз." },
        fork: { title: "Тактика: айры", lead: "Бир жүрүш менен эки фигурага кол салуу — эң көп кездешкен тактикалык курал.", points: [
          "Айры — бир фигура бир эле учурда атаандаштын эки же андан көп фигурасына кол салганы. Атаандаш алардын бирин гана куткара алат.",
          "Аттын айрысы эң коркунучтуу: аттын кол салуусун тосууга болбойт жана ал күтүлбөгөн чарчыларга секирет.",
          "Ошол эле учурда шах берген айры өзгөчө күчтүү — атаандаш адегенде падышасын куткарышы керек.",
          "Пешкалар жана ферзь да айры жасайт: мисалы, пешка алдыга жылып, жолунун эки капталындагы фигураларга кол сала алат.",
          "Кантип табуу керек: атаандаштын падышасы жана корголбогон фигуралар кайда? Фигураларыңыздын бири бир жүрүштө экөөнө тең жете алабы?"], caption: "Nc7+! — ат шах берет жана ошол эле учурда a8деги ладьяга кол салат. Падыша качат, ладья кулайт." },
        pin: { title: "Тактика: байлоо", lead: "Байланган фигура жүрө албайт же анын жүрүшү кымбатка турат — тактага мык менен кагылгандай.", points: [
          "Байлоо: алыстан аракеттенген фигура (пил, ладья, ферзь) артында баалуураак фигура турган атаандаштын фигурасына кол салат.",
          "Толук байлоо: артында падыша болсо, байланган фигура такыр жүрө албайт.",
          "Жарым байлоо: артында ферзь же ладья болсо, фигура жүрө алат, бирок артындагы фигура жоголот.",
          "Байланган фигурага дагы бир жолу кол салыңыз (мисалы, пешка менен) — ал качып кутула албайт.",
          "Коргонуу үчүн: падышаны сызыктан алып кетиңиз же ортосуна башка фигура коюңуз."], caption: "b5теги пил c6дагы атты байлап турат: ат жүрсө, e8деги падышага шах болмок — ошондуктан ал такыр жүрө албайт." },
        discovered: { title: "Тактика: ачык кол салуу", lead: "Бир фигура жолдон чыгат да, анын артындагы фигура кол салат. Бир жүрүштө эки коркунуч!", points: [
          "Ачык кол салуу: фигураларыңыздын бири өзүңүздүн алыстан аракеттенген фигураңыздын (ладья, пил, ферзь) сызыгын жаап турат. Ал жүргөндө сызык ачылат.",
          "Ачык шах: артындагы фигура шах берет, алдыңкысы каалаган жерге барат — ал тургай корголгон ферзди алууга да.",
          "Кош шах: эки фигура бир эле учурда шах берет. Андан падышанын жүрүшү менен гана кутулууга болот — Рети–Тартаковер оюнун караңыз.",
          "Даярдоо үчүн: ладьяңызды же пилиңизди атаандаштын падышасына же ферзине багыттап, алдына өзүңүздүн башка фигураңызды коюңуз."], caption: "Bxa8+! — пил e тик катарынан чыгып, a8деги ферзди алат, ал эми e1деги ладья e8деги падышага ачык шах берет." }
      },
      games: {
        legall: { title: "Легалдын капканы", story: "Атактуу Café de la Régence кафесиндеги кыска оюн. Ак ферзин атайын берип, үч жеңил фигура менен жетинчи жүрүштө мат коёт. Жаңы баштоочулар бул капканга азыр да түшүп калышат." },
        immortal: { title: "Өлбөс оюн", story: "Романтикалык шахматтын символу. Андерсен эки ладьясын, пилин жана акырында ферзин курмандыкка чалып, калган үч жеңил фигурасы менен мат коёт. Бул Лондон турниринин тыныгуусунда ойнолгон достук оюн болчу." },
        evergreen: { title: "Түбөлүк жашыл оюн", story: "Эванс гамбитиндеги кооз чабуул. Кара ак падышага кол салып жатканда Андерсен ферзин курмандыкка чалып, кара падышаны эки пил менен торго түшүрөт. Аталышын Вильгельм Стейниц берген." },
        opera: { title: "Опера оюну", story: "Морфи бул оюнду Париж операсынын ложасында, спектакль учурунда эки ак сөөккө каршы ойногон. Тез өнүгүү, ачык сызыктар жана курмандыктар — дебют эрежелеринин эң мыкты сабагы. Акыркы мат абдан кооз." },
        reti: { title: "Ретинин миниатюрасы", story: "Он бир жүрүштө бүткөн оюн. Кара падышасын борбордо калтырып, фигура жыйноого берилет. Рети ферзин курмандыкка чалып, кош шах менен мат коёт. Сабак: падышаңызды өз убагында коопсуз жерге алып барыңыз." },
        kinghunt: { title: "Падыша аңчылыгы", story: "Ласкер h7де ферзин курмандыкка чалып, шахтан кийин шах берип, кара падышаны бүт такта аркылуу g1ге чейин айдайт. Акыркы мат падышанын жүрүшү менен коюлат — өтө сейрек кездешүүчү учур." },
        century: { title: "Кылымдын оюну", story: "13 жаштагы Бобби Фишер күчтүү чебер Дональд Бернге каршы ферзин курмандыкка чалат (17...Be6!). Анын ордуна көп материал топтоп, фигуралары биргелешип ак падышага мат коёт. Фишер кийин дүйнө чемпиону болгон." },
        rubinstein: { title: "Рубинштейндин өлбөс оюну", story: "Рубинштейн ферзин (22...Rxc3!!) жана эки ладьясын курмандыкка чалат. Эки пили ак падышаны бутага алып, 25...Rh3тен кийин матты токтотуу мүмкүн эмес, ошондуктан ак багынды." },
        marshall: { title: "«Алтын тыйындар» оюну", story: "Маршалл ферзин үч жол менен алууга мүмкүн болгон g3кө коёт (23...Qg3!!). Ар бир алуу матка же чоң жоготууга алып барат. Уламыш боюнча көрүүчүлөр тактага алтын тыйын чачышкан." },
        short: { title: "Падышанын сейили", story: "Ферздер тактада турганда Шорт падышасын h2ден g5ке чейин жүргүзүп, Kh6 жана Qg7 маты менен коркутат. Кара коргонуу таппай багынды. Падыша да чабуулга катыша аларынын эң мыкты далили." },
        kasparov: { title: "Каспаровдун өлбөс оюну", story: "24.Rxd4!! — Каспаров ладьяны курмандыкка чалат, кара падыша бүт такта аркылуу d1ге чейин кубаланат. Көптөгөн чеберлер аны буга чейин ойнолгон эң кооз оюн деп эсептешет." }
      },
      books: {
        fundamentals: "Үчүнчү дүйнө чемпионунун атактуу окуу китеби: жөнөкөй эндшпилдерден орто оюндун пландарына чейин. Жаңы баштоочулар жана клуб оюнчулары үчүн эң мыкты биринчи китептердин бири.",
        bluebook: "Эрежелер, негизги идеялар жана ошол кезде белгилүү болгон бардык дебюттардын талдоосу. Автор — аты стандарт фигуралардын дизайнына (Стаунтон топтому) байланышкан англис чебери.",
        morphy: "Пол Морфинин 1858–1859-жылдардагы Европа сапары жөнүндө — ал Лондон жана Парижде эң күчтүү чеберлерди жеңген. Автор Морфинин катчысы болгон жана окуяларды өз көзү менен көргөн.",
        bird: "Шахматтын келип чыгышы, анын Чыгыштагы жана Европадагы тарыхы жана XIX кылымдын чеберлери жөнүндө эскерүүлөр. Бёрд дебюту (1.f4) автордун атынан аталган.",
        caxton: "Англис тилинде басылып чыккан эң алгачкы китептердин бири (1474). Бул эрежелер китеби эмес: ар бир фигура коомдун бир катмарын билдирет, орто кылымдын адеп-ахлагы алар аркылуу түшүндүрүлөт.",
        generalship: "Шахматты аскердик стратегиянын тили менен түшүндүрүү аракети: фронттор, камсыздоо линиялары, күчтөрдүн катышы. Окууга оор, бирок кызыктуу ойлорго толгон — тажрыйбалуу окурмандар үчүн."
      }
    },
    tk: {
      articles: {
        start: { title: "Küşde nireden başlamaly", lead: "Düzgünleri bir günde öwrenip bolýar. Gowy oýnamak bolsa — ömürlik syýahat.", points: [
          "Tagta 8×8, ýagny 64 öýjükden ybarat. Her oýunçynyň sag tarapyndaky burç öýjügi açyk reňkli. Ilki ak ýöreýär.",
          "Şa islendik tarapa bir öýjük ýöreýär. Ferz islendik tarapa islendik aralyga, ladýa göni çyzyklar boýunça, pil diagonallar boýunça ýöreýär.",
          "At «G» harpy ýaly ýöreýär (iki öýjük, soňra bir öýjük gapdala) we beýleki daşlaryň üstünden böküp bilýän ýeke-täk daş.",
          "Piýada bir öýjük öňe ýöreýär (ilkinji ýörişinde iki öýjük) we gyşyk alýar. Soňky hatara ýetende ferze, ladýa, pile ýa-da ata öwrülýär.",
          "Üç aýratyn ýöriş: rokirowka (şa bilen ladýa bir ýörişde), geçende almak we öwrülmek. Tagtamyzdaky ýöriş nokatlary näme mümkindigini hemişe görkezýär.",
          "Maksat — mat: şa hüjüm astynda we halas bolup bilmeýär. Nobatdaky tarapyň kanuny ýörişi ýok, ýöne şah hem ýok bolsa, bu pat — deňme-deň.",
          "Maslahat: ilki dostuňyz bilen «👥 Bir enjamda iki adam» tertibinde başlaň, soňra reýtingsiz onlaýn oýunlara geçiň. Her oýundan soň ýalňyşlyklaryňyza düşünmek üçin «📖 Oýnuň hekaýasyny» açyň."] },
        opening: { title: "Debýutyň bäş altyn düzgüni", lead: "Debýutlaryň atlaryny ýatlamak hökmany däl. Bu bäş düzgüni berjaý etseňiz, her oýny gowy ýagdaýdan başlarsyňyz.", points: [
          "1. Merkezi eýeläň: e4 we d4 piýadalary (gara üçin e5 we d5) daşlaryňyza ýol açýar.",
          "2. Atlary we pilleri çalt ösdüriň — adatça atlar pillerden öň.",
          "3. Ir rokirowka ediň: şaňyz howpsuz bolar we ladýa oýna goşular.",
          "4. Ferzi ir çykarmaň — garşydaş ony kowalap, temp utup ösýär.",
          "5. Bir daşy sebäpsiz iki gezek ýöremäň we piýada ýörişlerine wagt sarp etmäň. Opera oýny (Kitaphana → Meşhur oýunlar) bu düzgünleri ajaýyp görkezýär."] },
        notation: { title: "Küşt ýazgysy: e4, Nf3 we O-O näme aňladýar", lead: "Oýunlar taryhy, PGN, derňew we hekaýalar gysga algebraik ýazgyny ulanýar. Ony okap bilmek köp gapy açýar.", points: [
          "Dik hatarlar a–h harplary, keseligine hatarlar 1–8 sanlary: e4 — e dik hatarynyň 4-nji hatar bilen kesişýän öýjügi.",
          "Daşlar baş harp bilen (iňlisçe) ýazylýar: K şa, Q ferz, R ladýa, B pil, N at. Piýadanyň harpy ýok: e4 — piýada e4-e, Nf3 — at f3-e.",
          "x almagy aňladýar (Bxc6 — pil c6-da alýar), + şah, # mat, = öwrülmek (e8=Q).",
          "O-O — gysga rokirowka (şa ganaty), O-O-O — uzyn rokirowka (ferz ganaty).",
          "Derňew belgileri: ?! takyk däl, ? ýalňyşlyk, ?? uly ýalňyşlyk. Derňewimiz olary awtomatik goýýar."] },
        shatranj: { title: "Şatranç — Ýüpek ýolunyň küşdi", lead: "Häzirki küşt Hindistandan Ýewropa kerwen ýollary arkaly ýetdi — şol ýoluň ortasynda bolsa biziň topraklarymyz durdy.", points: [
          "Küşdüň belli iň gadymy ata-babasy — hindi çaturangasy (takmynan VI asyr). Parsda ol şatranja öwrüldi.",
          "Samarkandyň golaýyndaky Afrasiýabda tapylan pil süňkünden ýasalan daşlar dünýäniň iň gadymy küşt daşlarynyň hataryna girýär.",
          "Şatrançda ferz diagonal boýunça diňe bir öýjük, pil bolsa iki öýjük böküp ýöreýär. Oýun haýal we seresap manýowrlardan doludy.",
          "Bagdatda as-Suli ýaly ussatlar şatranç barada kitaplar ýazdylar. Soňra oýun Andalusiýa we Sisiliýa arkaly Ýewropa ýetdi.",
          "XV asyr Ýewropasynda ferz bilen pil güýçlendirildi — şeýlelikde häzirki küşt döredi. ChessCaravan-da şatranç oýnap bolýar: oýun panelinde «🏺 Şatranç» saýlaň (pat etmek we garşydaşyň şasyny ýalňyz goýmak ýeňiş getirýär!)."] },
        endgame: { title: "Endşpiliň esaslary", lead: "Daşlar azalanda oýun üýtgeýär: şa indi gorkmaýar, piýadalar ferz bolmaga ymtylýar.", points: [
          "Endşpilde şa güýçli daş. Ony merkeze çykaryň we piýadalaryňyza kömek etsin.",
          "Geçiji piýada (öňünde we goňşy dik hatarlarda garşydaşyň piýadasy ýok) iň uly baýlygyňyz. Ony öňe süýşüriň.",
          "Oppozisiýa: şalar aralarynda bir öýjük galdyryp ýüzbe-ýüz dursa we nobat garşydaşda bolsa, ol ýol bermäge mejbur. Piýadaly endşpillerde bu hemme zady çözýär.",
          "Inedördül düzgüni: piýadadan soňky hatara çenli inedördül çyzyň. Garşydaşyň şasy oňa girip bilse, piýadany kowup ýetýär.",
          "Ladýaly endşpillerde ladýaňyzy geçiji piýadalaryň yzyna goýuň — öz piýadaňyzyň hem, garşydaşyňkynyň hem (Tarraş düzgüni).",
          "Ferz we ladýa bilen mat etmegi hökman öwreniň — «👥 Bir enjamda iki adam» tertibinde özüňiz türgenleşiň."], caption: "Oppozisiýa: e3 we e5-däki şalaryň arasynda bir öýjük bar. Nobaty gelen ýol bermäge mejbur." },
        fork: { title: "Taktika: çeňňek", lead: "Bir ýöriş bilen iki daşa hüjüm etmek — iň köp duşýan taktiki ýarag.", points: [
          "Çeňňek — bir daşyň bir wagtda garşydaşyň iki ýa-da has köp daşyna hüjüm etmegi. Garşydaş olaryň diňe birini halas edip biler.",
          "Atyň çeňňegi iň howply: atyň hüjümini petikläp bolmaýar we ol garaşylmadyk öýjüklere bökýär.",
          "Bir wagtda şah berýän çeňňek aýratyn güýçli — garşydaş ilki şasyny halas etmeli.",
          "Piýadalar we ferz hem çeňňek edýär: meselem, piýada öňe süýşüp, ýolunyň iki gapdalyndaky daşlara hüjüm edip biler.",
          "Nädip tapmaly: garşydaşyň şasy we goralmadyk daşlar nirede? Daşlaryňyzyň biri bir ýörişde ikisine-de ýetip bilermi?"], caption: "Nc7+! — at şah berýär we bir wagtda a8-däki ladýa hüjüm edýär. Şa gaçýar we ladýa düşýär." },
        pin: { title: "Taktika: baglamak", lead: "Baglanan daş ýöräp bilmeýär ýa-da onuň ýörişi gymmata düşýär — tagta çüý bilen kakylan ýaly.", points: [
          "Baglamak: uzakdan täsir edýän daş (pil, ladýa, ferz) yzynda has gymmatly daş bolan garşydaşyň daşyna hüjüm edýär.",
          "Doly baglamak: yzynda şa bolsa, baglanan daş asla ýöräp bilmeýär.",
          "Bölekleýin baglamak: yzynda ferz ýa-da ladýa bolsa, daş ýöräp biler, ýöne yzyndaky daş ýitýär.",
          "Baglanan daşa ýene bir gezek hüjüm ediň (meselem, piýada bilen) — ol gaçyp gutulyp bilmez.",
          "Goramak üçin: şany çyzykdan aýryň ýa-da arasyna başga daş goýuň."], caption: "b5-däki pil c6-daky aty baglaýar: at ýörese, e8-däki şa şah bolardy — şonuň üçin ol asla ýöräp bilmeýär." },
        discovered: { title: "Taktika: açyk hüjüm", lead: "Bir daş ýoldan çekilýär we onuň yzyndaky daş hüjüm edýär. Bir ýörişde iki howp!", points: [
          "Açyk hüjüm: daşlaryňyzyň biri öz uzakdan täsir edýän daşyňyzyň (ladýa, pil, ferz) çyzygyny ýapýar. Ol ýöränden çyzyk açylýar.",
          "Açyk şah: yzdaky daş şah berýär, öňdäki daş bolsa islän ýerine gidýär — hatda goralýan ferzi almaga-da.",
          "Goşa şah: iki daş bir wagtda şah berýär. Ondan diňe şanyň ýörişi bilen gutulyp bolýar — Reti–Tartakower oýnuna serediň.",
          "Taýýarlamak üçin: ladýaňyzy ýa-da piliňizi garşydaşyň şasyna ýa-da ferzine gönükdiriň we öňüne başga daşyňyzy goýuň."], caption: "Bxa8+! — pil e dik hataryndan çykyp a8-däki ferzi alýar, e1-däki ladýa bolsa e8-däki şa açyk şah berýär." }
      },
      games: {
        legall: { title: "Legalyň duzagy", story: "Meşhur Café de la Régence kafesinde oýnalan gysga oýun. Ak ferzini bilkastlaýyn berýär we üç ýeňil daş bilen ýedinji ýörişde mat edýär. Täze başlaýanlar bu duzaga häzir hem düşýärler." },
        immortal: { title: "Ölmez oýun", story: "Romantik küşdüň nyşany. Anderssen iki ladýasyny, pilini we ahyrynda ferzini gurban berip, galan üç ýeňil daşy bilen mat edýär. Bu London ýaryşynyň arakesmesinde oýnalan dostluk oýnydy." },
        evergreen: { title: "Hemişe gök oýun", story: "Ewans gambitindäki owadan hüjüm. Gara ak şa hüjüm edýärkä, Anderssen ferzini gurban berip, gara şany iki pil bilen duzaga salýar. Adyny Wilhelm Steýnis beripdir." },
        opera: { title: "Opera oýny", story: "Morfi bu oýny Pariž operasynyň ložasynda, oýun wagtynda iki aristokrata garşy oýnady. Çalt ösüş, açyk çyzyklar we gurbanlar — debýut düzgünleriniň iň gowy sapagy. Soňky mat örän owadan." },
        reti: { title: "Retiniň miniatýurasy", story: "On bir ýörişde gutaran oýun. Gara şasyny merkezde galdyryp, daş ýygnamaga gyzyklanýar. Reti ferzini gurban berip, goşa şah bilen mat edýär. Sapak: şaňyzy öz wagtynda howpsuz ýere äkidiň." },
        kinghunt: { title: "Şa awy", story: "Lasker h7-de ferzini gurban berip, şahyň yzyndan şah berip, gara şany tutuş tagtanyň üstünden g1-e çenli kowýar. Soňky mat şanyň ýörişi bilen edilýär — gaty seýrek duşýan ýagdaý." },
        century: { title: "Asyryň oýny", story: "13 ýaşly Bobbi Fişer güýçli ussat Donald Berne garşy ferzini gurban berýär (17...Be6!). Onuň deregine köp material ýygnap, daşlary bilelikde ak şany mat edýär. Fişer soňra dünýä çempiony boldy." },
        rubinstein: { title: "Rubinşteýniň ölmez oýny", story: "Rubinşteýn ferzini (22...Rxc3!!) we iki ladýasyny gurban berýär. Iki pili ak şany nyşana alýar we 25...Rh3-den soň maty saklap bolmaýar, şonuň üçin ak boýun egdi." },
        marshall: { title: "«Altyn teňňeler» oýny", story: "Marşall ferzini üç dürli ýol bilen alyp bolýan g3-e goýýar (23...Qg3!!). Her almak mata ýa-da uly ýitgä getirýär. Rowaýata görä, tomaşaçylar tagta altyn teňňe sepipdirler." },
        short: { title: "Şanyň gezelenji", story: "Ferzler tagtada durka Şort şasyny h2-den g5-e çenli ýöredip, Kh6 we Qg7 maty bilen haýbat atýar. Gara gorag tapman boýun egdi. Şanyň hem hüjüme goşulyp bilýändiginiň iň gowy subutnamasy." },
        kasparov: { title: "Kasparowyň ölmez oýny", story: "24.Rxd4!! — Kasparow ladýany gurban berýär we gara şa tutuş tagtanyň üstünden d1-e çenli kowalanýar. Köp ussatlar ony şu wagta çenli oýnalan iň owadan oýun hasaplaýarlar." }
      },
      books: {
        fundamentals: "Üçünji dünýä çempionynyň meşhur okuw kitaby: ýönekeý endşpillerden ortaky oýnuň meýilnamalaryna çenli. Täze başlaýanlar we klub oýunçylary üçin iň gowy ilkinji kitaplaryň biri.",
        bluebook: "Düzgünler, esasy pikirler we şol döwürde belli bolan ähli debýutlaryň derňewi. Awtory — ady standart daş dizaýny (Staunton toplumy) bilen baglanyşykly iňlis ussady.",
        morphy: "Pol Morfiniň 1858–1859-njy ýyllardaky Ýewropa syýahaty barada — ol London we Parižde iň güýçli ussatlary ýeňipdi. Awtor Morfiniň sekretary bolupdyr we wakalary öz gözi bilen görüpdir.",
        bird: "Küşdüň gelip çykyşy, onuň Gündogarda we Ýewropada taryhy hem-de XIX asyryň ussatlary baradaky ýatlamalar. Börd debýuty (1.f4) awtoryň adyny göterýär.",
        caxton: "Iňlis dilinde çap edilen iň ilkinji kitaplaryň biri (1474). Bu düzgünler kitaby däl: her daş jemgyýetiň bir gatlagyny aňladýar we orta asyr ahlagy şolar arkaly düşündirilýär.",
        generalship: "Küşdi harby strategiýanyň dili bilen düşündirmek synanyşygy: frontlar, üpjünçilik ýollary, güýçleriň gatnaşygy. Okamak agyr, ýöne gyzykly pikirlerden doly — tejribeli okyjylar üçin."
      }
    },
    az: {
      articles: {
        start: { title: "Şahmata haradan başlamaq olar", lead: "Qaydaları bir günə öyrənmək olar. Yaxşı oynamaq isə ömürlük səyahətdir.", points: [
          "Taxta 8×8, yəni 64 xanadan ibarətdir. Hər oyunçunun sağ tərəfindəki künc xanası açıq rənglidir. İlk gedişi ağlar edir.",
          "Şah istənilən istiqamətə bir xana gedir. Vəzir istənilən istiqamətə istənilən məsafəyə, top düz xətlər üzrə, fil diaqonallar üzrə hərəkət edir.",
          "At «Г» şəklində gedir (iki xana, sonra bir xana yana) və digər fiqurların üzərindən tullana bilən yeganə fiqurdur.",
          "Piyada bir xana irəli gedir (ilk gedişində iki xana) və çəp vurur. Son cərgəyə çatanda vəzirə, topa, filə və ya ata çevrilir.",
          "Üç xüsusi gediş: qala qurma (şah və top bir gedişdə), yolüstü vurma və çevrilmə. Taxtamızdakı gediş nöqtələri həmişə nəyin mümkün olduğunu göstərir.",
          "Məqsəd matdır: şaha hücum edilib və o qaça bilmir. Növbəsi olan tərəfin qaydalara uyğun gedişi yoxdursa, amma şah da yoxdursa, bu patdır — heç-heçə.",
          "Məsləhət: əvvəlcə dostunla «👥 Bir cihazda iki nəfər» rejimində başla, sonra reytinqsiz onlayn oyunlara keç. Hər oyundan sonra səhvlərini anlamaq üçün «📖 Oyunun hekayəsi»ni aç."] },
        opening: { title: "Debütün beş qızıl qaydası", lead: "Debüt adlarını əzbərləməyə ehtiyac yoxdur. Bu beş qaydaya əməl etsən, hər oyuna yaxşı mövqedən başlayacaqsan.", points: [
          "1. Mərkəzi tut: e4 və d4 piyadaları (qaralar üçün e5 və d5) fiqurlarına yol açır.",
          "2. Atları və filləri tez inkişaf etdir — adətən atlar fillərdən əvvəl.",
          "3. Erkən qala qur: şahın təhlükəsiz olur və top oyuna qoşulur.",
          "4. Vəziri erkən çıxarma — rəqib onu qovalayaraq temp qazanıb inkişaf edəcək.",
          "5. Eyni fiquru səbəbsiz iki dəfə oynama və piyada gedişlərinə vaxt itirmə. Opera oyunu (Kitabxana → Məşhur oyunlar) bu qaydaları mükəmməl göstərir."] },
        notation: { title: "Şahmat yazılışı: e4, Nf3 və O-O nə deməkdir", lead: "Oyun tarixçəsi, PGN, təhlil və hekayələr qısa cəbri yazılışdan istifadə edir. Onu oxumaq bir çox qapını açır.", points: [
          "Şaquli xətlər a–h hərfləri, üfüqi xətlər 1–8 rəqəmləridir: e4 — e şaquli xəttinin 4-cü üfüqi xətt ilə kəsişdiyi xanadır.",
          "Fiqurlar böyük hərflə (ingiliscə) yazılır: K şah, Q vəzir, R top, B fil, N at. Piyadanın hərfi yoxdur: e4 — piyada e4-ə, Nf3 — at f3-ə.",
          "x vurmanı göstərir (Bxc6 — fil c6-da vurur), + şah, # mat, = çevrilmə (e8=Q).",
          "O-O — qısa qala (şah cinahı), O-O-O — uzun qala (vəzir cinahı).",
          "Təhlil işarələri: ?! qeyri-dəqiqlik, ? səhv, ?? kobud səhv. Təhlilimiz onları avtomatik qoyur."] },
        shatranj: { title: "Şətrənc — İpək Yolunun şahmatı", lead: "Müasir şahmat Hindistandan Avropaya karvan yolları ilə gəlib çatdı — bu yolun ortasında isə bizim torpaqlar dururdu.", points: [
          "Şahmatın məlum ən qədim əcdadı Hindistandakı çaturanqadır (təxminən VI əsr). İranda o, şətrəncə çevrildi.",
          "Səmərqənd yaxınlığındakı Əfrasiyabda tapılan fil sümüyündən fiqurlar dünyanın ən qədim şahmat fiqurları sırasındadır.",
          "Şətrəncdə vəzir (fərz) diaqonal üzrə yalnız bir xana, fil isə iki xana tullanaraq gedir. Oyun yavaş və ehtiyatlı manevrlərlə dolu idi.",
          "Bağdadda əs-Suli kimi ustalar şətrənc haqqında kitablar yazdılar. Sonra oyun Əndəlus və Siciliya vasitəsilə Avropaya çatdı.",
          "XV əsr Avropasında vəzir və fil gücləndirildi — və müasir şahmat yarandı. ChessCaravan-da şətrənc oynaya bilərsən: oyun panelində «🏺 Şətrənc»i seç (pat etmək və rəqibin şahını tək qoymaq qələbə gətirir!)."] },
        endgame: { title: "Endşpilin əsasları", lead: "Fiqurlar azaldıqda oyun dəyişir: şah artıq qorxmur, piyadalar isə vəzir olmağa can atır.", points: [
          "Endşpildə şah güclü fiqurdur. Onu mərkəzə çıxar ki, piyadalarına kömək etsin.",
          "Keçid piyadası (qarşısında və qonşu şaquli xətlərdə rəqib piyadası yoxdur) ən böyük sərvətindir. Onu irəli apar.",
          "Opozisiya: şahlar aralarında bir xana olmaqla üz-üzə durduqda və növbə rəqibdə olduqda, o yol verməyə məcburdur. Piyada endşpillərində bu hər şeyi həll edir.",
          "Kvadrat qaydası: piyadadan son cərgəyə qədər kvadrat çək. Rəqibin şahı bu kvadrata girə bilsə, piyadanı tutacaq.",
          "Top endşpillərində topunu keçid piyadalarının arxasına qoy — həm özününkünün, həm də rəqibinkinin (Tarraş qaydası).",
          "Vəzir və topla mat etməyi mütləq öyrən — «👥 Bir cihazda iki nəfər» rejimində özün məşq et."], caption: "Opozisiya: e3 və e5-dəki şahlar aralarında bir xana ilə üz-üzədir. Növbəsi olan yol verməyə məcburdur." },
        fork: { title: "Taktika: çəngəl", lead: "Bir gedişlə iki fiqura hücum etmək ən çox rast gəlinən taktiki silahdır.", points: [
          "Çəngəl — bir fiqurun eyni anda rəqibin iki və ya daha çox fiquruna hücum etməsidir. Rəqib onlardan yalnız birini xilas edə bilər.",
          "At çəngəli ən təhlükəlisidir: atın hücumunu bağlamaq olmur və o, gözlənilməz xanalara tullanır.",
          "Eyni zamanda şah verən çəngəl xüsusilə güclüdür — rəqib əvvəlcə şahını xilas etməlidir.",
          "Piyadalar və vəzir də çəngəl edir: məsələn, piyada irəliləyərək yolunun iki tərəfindəki fiqurlara hücum edə bilər.",
          "Necə tapmalı: rəqibin şahı və müdafiəsiz fiqurlar haradadır? Fiqurlarından biri bir gedişlə hər ikisinə çata bilərmi?"], caption: "Nc7+! — at şah verir və eyni anda a8-dəki topa hücum edir. Şah qaçır və top düşür." },
        pin: { title: "Taktika: bağlama", lead: "Bağlanmış fiqur hərəkət edə bilmir və ya hərəkəti baha başa gəlir — sanki taxtaya mıxlanıb.", points: [
          "Bağlama: uzaqvuran fiqur (fil, top, vəzir) arxasında daha dəyərli fiqur olan rəqib fiquruna hücum edir.",
          "Mütləq bağlama: arxada şah varsa, bağlanmış fiqur ümumiyyətlə hərəkət edə bilməz.",
          "Nisbi bağlama: arxada vəzir və ya top varsa, fiqur hərəkət edə bilər, amma arxadakı fiqur itiriləcək.",
          "Bağlanmış fiqura bir daha hücum et (məsələn, piyada ilə) — qaça bilməyəcək.",
          "Müdafiə üçün: şahı xətdən çıxar və ya araya başqa fiqur qoy."], caption: "b5-dəki fil c6-dakı atı bağlayıb: at hərəkət etsə, e8-dəki şaha şah olardı — buna görə o, ümumiyyətlə hərəkət edə bilməz." },
        discovered: { title: "Taktika: açıq hücum", lead: "Bir fiqur yoldan çəkilir və arxasındakı fiqur hücum edir. Bir gedişdə iki təhlükə!", points: [
          "Açıq hücum: fiqurlarından biri öz uzaqvuran fiqurunun (top, fil, vəzir) xəttini bağlayır. O hərəkət edəndə xətt açılır.",
          "Açıq şah: arxadakı fiqur şah verir, öndəki fiqur isə istədiyi yerə gedir — hətta müdafiə olunan vəziri vurmağa belə.",
          "İkiqat şah: iki fiqur eyni anda şah verir. Ondan yalnız şahın gedişi ilə qurtulmaq olar — Reti–Tartakover oyununa bax.",
          "Hazırlamaq üçün: topunu və ya filini rəqibin şahına və ya vəzirinə yönəlt, qarşısına isə başqa fiqurunu qoy."], caption: "Bxa8+! — fil e şaquli xəttindən çıxıb a8-dəki vəziri vurur, e1-dəki top isə e8-dəki şaha açıq şah verir." }
      },
      games: {
        legall: { title: "Leqal tələsi", story: "Məşhur Café de la Régence kafesindən qısa oyun. Ağlar vəzirini qəsdən verir və üç yüngül fiqurla yeddinci gedişdə mat edir. Yeni başlayanlar bu tələyə bu gün də düşürlər." },
        immortal: { title: "Ölməz oyun", story: "Romantik şahmatın simvolu. Anderssen hər iki topunu, bir filini və sonda vəzirini qurban verir, sonra qalan üç yüngül fiquru ilə mat edir. Bu, London turnirinin fasiləsində oynanılmış dostluq oyunu idi." },
        evergreen: { title: "Həmişəyaşıl oyun", story: "Evans qambitində gözəl hücum. Qaralar ağların şahına hücum edərkən Anderssen vəzirini qurban verir və qara şahı iki fillə tələyə salır. Adı Vilhelm Steynits verib." },
        opera: { title: "Opera oyunu", story: "Morfi bu oyunu Paris Operasının lojasında, tamaşa zamanı iki zadəgana qarşı oynayıb. Sürətli inkişaf, açıq xətlər və qurbanlar — debüt prinsiplərinin ən yaxşı dərsi. Son mat çox gözəldir." },
        reti: { title: "Retinin miniatürü", story: "On bir gedişdə bitən oyun. Qaralar şahı mərkəzdə qoyub material toplamağa başlayır. Reti vəzirini qurban verir və ikiqat şahla mat edir. Dərs: şahını vaxtında təhlükəsiz yerə apar." },
        kinghunt: { title: "Şah ovu", story: "Lasker h7-də vəzirini qurban verir və şah ardınca şah verərək qara şahı bütün taxta boyunca g1-ə qədər qovur. Son mat şahın gedişi ilə edilir — çox nadir hal." },
        century: { title: "Əsrin oyunu", story: "13 yaşlı Bobbi Fişer güclü usta Donald Byrnə qarşı vəzirini qurban verir (17...Be6!). Əvəzində çoxlu material toplayır və fiqurları birlikdə ağ şahı mat edir. Fişer sonradan dünya çempionu oldu." },
        rubinstein: { title: "Rubinşteynin ölməz oyunu", story: "Rubinşteyn vəzirini (22...Rxc3!!) və hər iki topunu qurban verir. İki fili ağ şahı nişan alır və 25...Rh3-dən sonra matın qarşısını almaq mümkün deyil, buna görə ağlar təslim oldu." },
        marshall: { title: "«Qızıl sikkələr» oyunu", story: "Marşall vəzirini üç fərqli yolla vurula bilən g3-ə qoyur (23...Qg3!!). Hər vurma mata və ya böyük itkiyə aparır. Rəvayətə görə, tamaşaçılar taxtaya qızıl sikkələr səpiblər." },
        short: { title: "Şahın gəzintisi", story: "Vəzirlər hələ taxtada ikən Şort şahını h2-dən g5-ə qədər aparır, Kh6 və Qg7 matı ilə hədələyir. Qaralar müdafiə tapmadı və təslim oldu. Şahın da hücuma qoşula biləcəyinin ən yaxşı sübutu." },
        kasparov: { title: "Kasparovun ölməz oyunu", story: "24.Rxd4!! — Kasparov topu qurban verir və qara şah bütün taxta boyunca d1-ə qədər qovulur. Bir çox ustalar onu indiyədək oynanılmış ən gözəl oyun hesab edir." }
      },
      books: {
        fundamentals: "Üçüncü dünya çempionunun məşhur dərsliyi: sadə endşpillərdən orta oyun planlarına qədər. Yeni başlayanlar və klub oyunçuları üçün ən yaxşı ilk kitablardan biri.",
        bluebook: "Qaydalar, əsas ideyalar və o dövrdə məlum olan bütün debütlərin təhlili. Müəllif adı standart fiqur dizaynı (Staunton dəsti) ilə bağlı olan ingilis ustasıdır.",
        morphy: "Pol Morfinin 1858–1859-cu illərdəki Avropa səfəri haqqında — o zaman London və Parisdə ən güclü ustaları məğlub edib. Müəllif Morfinin katibi olub və hadisələri öz gözləri ilə görüb.",
        bird: "Şahmatın mənşəyi, onun Şərqdə və Avropada tarixi və XIX əsr ustaları haqqında xatirələr. Berd debütü (1.f4) müəllifin adını daşıyır.",
        caxton: "İngilis dilində çap olunmuş ilk kitablardan biri (1474). Bu, qaydalar kitabı deyil: hər fiqur cəmiyyətin bir təbəqəsini təmsil edir və orta əsr əxlaqı onların vasitəsilə izah olunur.",
        generalship: "Şahmatı hərbi strategiya dili ilə izah etmək cəhdi: cəbhələr, təchizat xətləri, qüvvələr nisbəti. Oxumaq ağırdır, amma maraqlı ideyalarla doludur — təcrübəli oxucular üçün."
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
