// Ўзбекча (кирилл, 'uzc'): o'zbekcha lotin matndan avtomatik o'girish — qoidalar, himoyalangan bo'laklar, server matnlari
const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../uzcyrl');

test("Harf qoidalari: o', g', sh, ch, yo/ya/yu/ye, e (boshida — э), tutuq belgisi — ъ, katta harflar", () => {
  const cases = {
    "O'yinni boshlash": 'Ўйинни бошлаш', "Ma'lumotlar saqlandi": 'Маълумотлар сақланди', "g'alaba qozondi": 'ғалаба қозонди',
    'Choyxona': 'Чойхона', 'Yetti yurish': 'Етти юриш', 'Eshik ochiq': 'Эшик очиқ', "Yo'l xaritasi": 'Йўл харитаси', 'Yoqut': 'Ёқут',
    'Yangi yil': 'Янги йил', "Navro'z muborak!": 'Наврўз муборак!', "Noto'g'ri": 'Нотўғри', 'SHATRANJ REYTING': 'ШАТРАНЖ РЕЙТИНГ', "To'g'ri": 'Тўғри', 'oila': 'оила'
  };
  for (const [lat, cyr] of Object.entries(cases)) assert.equal(U.toCyrl(lat), cyr, lat);
});

test("Himoyalangan bo'laklar: {{o'zgaruvchi}}, HTML, havola, shaxmat yozuvi, brendlar, bot buyruqlari", () => {
  assert.equal(U.toCyrl("{{name}} sizni o'yinga chaqirdi ({{clock}})"), '{{name}} сизни ўйинга чақирди ({{clock}})');
  assert.equal(U.toCyrl('Shaxmat yozuvi: e4, Nf3, O-O, Bxc6+, e8=Q'), 'Шахмат ёзуви: e4, Nf3, O-O, Bxc6+, e8=Q');
  assert.equal(U.toCyrl("<b>Salom</b> https://example.org/kitob"), '<b>Салом</b> https://example.org/kitob');
  assert.equal(U.toCyrl("ChessCaravan'da Telegram'ni ulang"), "ChessCaravan'да Telegram'ни уланг");
  assert.equal(U.toCyrl('/invite — havola'), '/invite — ҳавола');
  assert.equal(U.toCyrl('PGN yuklash · Stockfish · iPhone · 3+2'), 'PGN юклаш · Stockfish · iPhone · 3+2');
  assert.deepEqual(U.deep({ a: ['Salom', { b: 'Xayr' }], n: 5 }), { a: ['Салом', { b: 'Хайр' }], n: 5 });
});

test("Server matnlari: push, bot, shahar va bayram nomlari kirillda", () => {
  const push = require('../push-texts');
  assert.equal(push.pushMessage('caravan_city', { city: 'samarkand' }, 'uzc').body, '🐪 Карвонингиз Самарқандга етиб келди!');
  assert.match(push.botText('help', 'uzc'), /\/invite — дўстларни/);
  assert.equal(require('../caravan').cityName('fergana', 'uzc'), 'Фарғона');
  assert.equal(require('../holidays').name('navruz', 'uzc'), 'Наврўз');
});
