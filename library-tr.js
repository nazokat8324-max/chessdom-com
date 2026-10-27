// 📚 Kutubxona — Türkçe matnlar (library-data.js va library-articles.js dan KEYIN, library.js dan OLDIN yuklanadi).
// Har massivga 7-element (tr) qo'shiladi; maqola/partiya/kitob qo'shilsa — shu yerga ham (bo'lmasa inglizcha ko'rinadi).
(function () {
  const TR = {
    articles: {
      start: {
        title: 'Satranca nereden başlamalı',
        lead: 'Kuralları bir günde öğrenebilirsin. İyi oynamak ise ömür boyu süren bir macera.',
        points: [
          'Tahta 8×8, 64 karedir. Her oyuncunun sağındaki köşe karesi açık renklidir. İlk hamleyi Beyaz yapar.',
          'Şah her yöne bir kare gider. Vezir her yöne istediği kadar, kale düz çizgiler boyunca, fil çaprazlar boyunca gider.',
          'At "L" şeklinde gider (iki kare, sonra bir kare yana) ve diğer taşların üzerinden atlayabilen tek taştır.',
          'Piyon bir kare ileri gider (ilk hamlesinde iki kare) ve çapraz alır. Son sıraya ulaşınca vezir, kale, fil veya ata dönüşür.',
          'Üç özel hamle: rok (şah ve kale tek hamlede), geçerken alma ve terfi. Tahtamızdaki hamle noktaları her zaman neyin mümkün olduğunu gösterir.',
          'Amaç şah mattır: şah tehdit altındadır ve kaçamaz. Sırası gelen tarafın kurallara uygun hamlesi yoksa ama şah çekilmemişse bu pattır — beraberlik.',
          'İpucu: önce bir arkadaşınla "👥 Aynı cihazda iki kişi" modunda başla, sonra puansız çevrim içi oyunlara geç. Her oyundan sonra hatalarını anlamak için "📖 Oyunun hikâyesi"ni aç.'
        ]
      },
      opening: {
        title: 'Açılışın beş altın kuralı',
        lead: 'Açılış adlarını ezberlemen gerekmez. Bu beş kurala uyarsan her oyuna iyi bir pozisyonla başlarsın.',
        points: [
          '1. Merkezi al: e4 ve d4 piyonları (Siyah için e5 ve d5) taşlarına yol açar.',
          '2. Atlarını ve fillerini hızla geliştir — genellikle atlar fillerden önce.',
          '3. Erken rok yap: şahın güvende olur ve kalen oyuna katılır.',
          '4. Veziri erken çıkarma — rakip onu kovalar ve tempo kazanarak gelişir.',
          '5. Aynı taşı sebepsiz iki kez oynama ve piyon hamleleriyle vakit kaybetme. Opera Oyunu (Kütüphane → Ünlü oyunlar) bu kuralları mükemmel gösterir.'
        ]
      },
      notation: {
        title: 'Satranç notasyonu: e4, Nf3 ve O-O ne demek',
        lead: 'Oyun geçmişi, PGN, analiz ve hikâyelerin hepsi kısa cebirsel notasyon kullanır. Onu okumak birçok kapı açar.',
        points: [
          'Sütunlar a–h harfleri, sıralar 1–8 rakamlarıdır: e4, e sütunuyla 4. sıranın kesiştiği karedir.',
          'Taşlar büyük harfle (İngilizce) yazılır: K şah, Q vezir, R kale, B fil, N at. Piyonun harfi yoktur: e4 piyonun e4\'e, Nf3 atın f3\'e gitmesidir.',
          'x almayı gösterir (Bxc6 — fil c6\'da alır), + şah, # şah mat, = terfi (e8=Q).',
          'O-O kısa rok (şah kanadı), O-O-O uzun roktur (vezir kanadı).',
          'Analiz işaretleri: ?! belirsizlik, ? hata, ?? büyük hata. Analizimiz bunları otomatik ekler.'
        ]
      },
      shatranj: {
        title: 'Şatranç — İpek Yolu\'nun satrancı',
        lead: 'Modern satranç Hindistan\'dan Avrupa\'ya kervan yollarıyla geldi — ve bu yolun ortasında bizim topraklarımız vardı.',
        points: [
          'Satrancın bilinen en eski atası Hindistan\'daki çaturangadır (yaklaşık 6. yüzyıl). İran\'da şatranç oldu.',
          'Semerkant yakınlarındaki Afrasiyab\'da bulunan fildişi taşlar dünyanın en eski satranç taşları arasında sayılır.',
          'Şatranç\'ta ferz ("vezir") yalnızca bir kare çapraz gider, fil ise iki kare sıçrar. Oyun yavaştı ve dikkatli manevralarla doluydu.',
          'Bağdat\'ta es-Sûlî gibi ustalar şatranç üzerine kitaplar yazdı. Oyun sonra Endülüs ve Sicilya üzerinden Avrupa\'ya ulaştı.',
          '15. yüzyıl Avrupa\'sında vezir ve fil güçlendirildi — ve modern satranç doğdu. ChessCaravan\'da şatranç oynayabilirsin: oyun panelinde "🏺 Şatranç"ı seç (pat yapmak ve rakip şahı yalnız bırakmak kazandırır!).'
        ]
      },
      endgame: {
        title: 'Oyun sonu temelleri',
        lead: 'Az taş kaldığında oyun değişir: şah artık korkmaz, piyonlar vezir olmak için yarışır.',
        points: [
          'Oyun sonunda şah güçlü bir taştır. Onu merkeze getir ve piyonlarına yardım etsin.',
          'Geçer piyon (önünde ve komşu sütunlarda rakip piyon yok) en büyük servetindir. Onu ilerlet.',
          'Muhalefet: şahlar aralarında bir kare olacak şekilde karşı karşıya durur ve sıra rakipteyse, o yol vermek zorundadır. Piyon oyun sonlarında bu her şeyi belirler.',
          'Kare kuralı: piyondan son sıraya kadar bir kare çiz. Rakip şah bu kareye girebilirse piyonu yakalar.',
          'Kale oyun sonlarında kaleni geçer piyonların arkasına koy — hem kendi piyonunun hem rakibininkinin (Tarrasch kuralı).',
          'Vezirle ve kaleyle mat etmeyi mutlaka öğren — “👥 Aynı cihazda iki kişi” modunda kendin çalış.'
        ],
        caption: 'Muhalefet: e3 ve e5\'teki şahlar aralarında bir kareyle karşı karşıya. Sırası olan yol vermek zorunda.'
      },
      fork: {
        title: 'Taktik: çatal',
        lead: 'Tek hamleyle iki taşa saldırmak en yaygın taktik silahtır.',
        points: [
          'Çatal, bir taşın aynı anda rakibin iki veya daha fazla taşına saldırmasıdır. Rakip yalnızca birini kurtarabilir.',
          'At çatalı en tehlikelisidir: atın saldırısı engellenemez ve beklenmedik karelere sıçrar.',
          'Aynı zamanda şah çeken çatal özellikle güçlüdür — rakip önce şahını kurtarmak zorundadır.',
          'Piyonlar ve vezirler de çatal yapar: örneğin bir piyon ilerleyişi yolunun iki yanındaki taşlara saldırabilir.',
          'Nasıl bulunur: rakip şah ve korumasız taşlar nerede? Taşlarından biri tek hamlede ikisine birden ulaşabilir mi?'
        ],
        caption: 'Nc7+! — at şah çeker ve aynı anda a8\'deki kaleye saldırır. Şah kaçar ve kale düşer.'
      },
      pin: {
        title: 'Taktik: açmaz',
        lead: 'Açmaza alınmış bir taş hareket edemez ya da hareket etmesi pahalıya patlar — tahtaya çakılmış gibi düşün.',
        points: [
          'Açmaz: uzun menzilli bir taş (fil, kale, vezir), arkasında daha değerli bir taş bulunan rakip taşa saldırır.',
          'Mutlak açmaz: arkada şah varsa, açmazdaki taş hiç hareket edemez.',
          'Göreceli açmaz: arkada vezir veya kale varsa taş hareket edebilir, ama arkadaki taş kaybedilir.',
          'Açmazdaki taşa bir kez daha saldır (örneğin bir piyonla) — kaçamaz.',
          'Savunmak için: şahı çizgiden çek veya araya başka bir taş koy.'
        ],
        caption: 'b5\'teki fil c6\'daki atı açmaza alıyor: at hareket etse e8\'deki şaha şah çekilirdi — bu yüzden hiç kıpırdayamaz.'
      },
      discovered: {
        title: 'Taktik: açarak saldırı',
        lead: 'Bir taş kenara çekilir ve arkasındaki taş saldırır. Tek hamlede iki tehdit!',
        points: [
          'Açarak saldırı: taşlarından biri kendi uzun menzilli taşının (kale, fil, vezir) hattını kapatır. O hareket edince hat açılır.',
          'Açarak şah: arkadaki taş şah çeker, öndeki taş ise istediği yere gider — korunan bir veziri almaya bile.',
          'Çifte şah: iki taş aynı anda şah çeker. Yalnızca şah hamlesiyle kurtulunur — Réti–Tartakower oyununa bak.',
          'Kurmak için: kaleni veya filini rakip şaha ya da vezire doğrult, önüne de başka bir taşını koy.'
        ],
        caption: 'Bxa8+! — fil e sütunundan çıkıp a8\'deki veziri alır, e1\'deki kale ise e8\'deki şaha açarak şah çeker.'
      }
    },
    games: {
      legall: { title: 'Légal Tuzağı', story: 'Ünlü Café de la Régence\'tan kısa bir oyun. Beyaz bilerek vezirini verir ve üç hafif taşla yedi hamlede mat eder. Yeni başlayanlar bugün bile bu tuzağa düşer.' },
      immortal: { title: 'Ölümsüz Oyun', story: 'Romantik satrancın simgesi. Anderssen iki kalesini, bir filini ve sonunda vezirini feda eder, ardından kalan üç hafif taşıyla mat eder. Londra turnuvasının bir arasında oynanmış dostluk oyunudur.' },
      evergreen: { title: 'Daima Yeşil Oyun', story: 'Evans Gambiti\'nde güzel bir saldırı. Siyah beyaz şaha saldırırken Anderssen vezirini feda eder ve siyah şahı iki filiyle ağa düşürür. Adını Wilhelm Steinitz koymuştur.' },
      opera: { title: 'Opera Oyunu', story: 'Morphy bu oyunu Paris Operası\'ndaki bir locada, gösteri sırasında iki soyluya karşı oynadı. Hızlı gelişim, açık hatlar ve fedalar: açılış ilkelerinin en iyi dersi. Son mat ise bir şaheser.' },
      reti: { title: 'Réti\'nin minyatürü', story: 'On bir hamlede biten bir oyun. Siyah şahını merkezde bırakır ve taş toplar. Réti vezirini feda eder ve çifte şahla mat eder. Ders: şahını zamanında güvenli yere götür.' },
      kinghunt: { title: 'Şah Avı', story: 'Lasker h7\'de vezirini feda eder ve şah üstüne şah çekerek siyah şahı tüm tahta boyunca g1\'e kadar sürer. Son mat bir şah hamlesiyle gelir — çok nadir görülen bir durum.' },
      century: { title: 'Yüzyılın Oyunu', story: '13 yaşındaki Bobby Fischer güçlü usta Donald Byrne\'a karşı vezirini feda eder (17...Be6!). Karşılığında bir yığın taş toplar ve taşları birlikte çalışarak beyaz şahı mat eder. Fischer sonradan dünya şampiyonu oldu.' },
      rubinstein: { title: 'Rubinstein\'ın Ölümsüzü', story: 'Rubinstein vezirini (22...Rxc3!!) ve iki kalesini feda eder. İki fili beyaz şahı hedef alır ve 25...Rh3\'ten sonra mat önlenemez; Beyaz terk etti.' },
      marshall: { title: '“Altın Paralar” oyunu', story: 'Marshall vezirini üç farklı şekilde alınabileceği g3\'e koyar (23...Qg3!!). Her alış mata veya ağır kayba götürür. Efsaneye göre izleyiciler tahtaya altın para yağdırmış.' },
      short: { title: 'Şahın Yürüyüşü', story: 'Vezirler hâlâ tahtadayken Short şahını h2\'den g5\'e yürütür ve Kh6 ile Qg7 matını tehdit eder. Siyah savunma bulamadı ve terk etti. Şahın da saldırıya katılabileceğinin en iyi kanıtı.' },
      kasparov: { title: 'Kasparov\'un Ölümsüzü', story: '24.Rxd4!! — Kasparov bir kale feda eder ve siyah şah tüm tahta boyunca d1\'e kadar kovalanır. Birçok usta onu şimdiye kadar oynanmış en güzel oyun sayar.' }
    },
    books: {
      fundamentals: 'Üçüncü dünya şampiyonunun ünlü ders kitabı: basit oyun sonlarından orta oyun planlarına kadar. Yeni başlayanlar ve kulüp oyuncuları için en iyi ilk kitaplardan biri.',
      bluebook: 'Kurallar, temel fikirler ve o dönemde bilinen tüm açılışların analizi. Adı standart taş tasarımına (Staunton takımı) verilmiş İngiliz usta tarafından yazılmıştır.',
      morphy: 'Paul Morphy\'nin 1858–1859 Avrupa turu hakkında; o zaman Londra ve Paris\'te en güçlü ustaları yendi. Yazar Morphy\'nin sekreteriydi ve olayları kendi gözüyle gördü.',
      bird: 'Satrancın kökenleri, Doğu\'da ve Avrupa\'daki tarihi ve 19. yüzyıl ustalarına dair anılar. Bird Açılışı (1.f4) yazarın adını taşır.',
      caxton: 'İngilizce basılan ilk kitaplardan biri (1474). Bir kural kitabı değildir: her taş toplumun bir sınıfını temsil eder ve orta çağ ahlakı onlar üzerinden anlatılır.',
      generalship: 'Satrancı askerî strateji diliyle anlatma girişimi: cepheler, ikmal hatları, kuvvet dengesi. Okuması ağır ama ilginç fikirlerle dolu — deneyimli okurlar için.'
    }
  };
  const put = (arr, v) => { if (!Array.isArray(arr) || v == null) return; while (arr.length < 6) arr.push(arr[1] || ''); arr[6] = v; };
  (window.LibraryArticles || []).forEach((a) => {
    const t = TR.articles[a.id];
    if (!t) return;
    put(a.title, t.title);
    put(a.lead, t.lead);
    (a.points || []).forEach((p, i) => put(p, t.points && t.points[i]));
    if (a.example && t.caption) put(a.example.caption, t.caption);
  });
  const D = window.LibraryData || {};
  (D.GAMES || []).forEach((g) => { const t = TR.games[g.id]; if (t) { put(g.title, t.title); put(g.story, t.story); } });
  (D.BOOKS || []).forEach((b) => { const t = TR.books[b.id]; if (t) put(b.desc, t); });
})();
