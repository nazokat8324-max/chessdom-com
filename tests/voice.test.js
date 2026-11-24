// 🎙️ Ovoz bilan yurish: aytilgan matn → qonuniy yurish (voice.js tahlil qismi)
const test = require('node:test');
const assert = require('node:assert/strict');
const { Chess } = require('chess.js');
const Shatranj = require('../shatranj');
const { parseSpoken, matchMove, moveToWords } = require('../voice');

function pick(text, fen, Engine) {
  const chess = Engine ? new Engine() : (fen ? new Chess(fen) : new Chess());
  if (Engine && fen) chess.load(fen);
  const r = matchMove(parseSpoken(text), chess.moves({ verbose: true }));
  return r.move ? r.move.from + r.move.to + (r.move.promotion || '') : r.ambiguous ? 'ambiguous' : 'none';
}

test('Oddiy yurishlar 6 tilda va turli shakllarda', () => {
  const cases = {
    'e4': 'e2e4', 'E4': 'e2e4', 'e2 e4': 'e2e4', 'e2-e4': 'e2e4', 'e2e4': 'e2e4',
    "e to'rt": 'e2e4', 'e four': 'e2e4', 'e for': 'e2e4', 'е4': 'e2e4', 'е четыре': 'e2e4',
    'ot f3': 'g1f3', 'Otni f3 ga': 'g1f3', 'knight f3': 'g1f3', 'Nf3': 'g1f3', 'конь f3': 'g1f3', 'конь эф три': 'g1f3',
    'caballo f3': 'g1f3', 'Springer f3': 'g1f3', 'cavalier f3': 'g1f3',
    'f3': 'f2f3', 'pawn d4': 'd2d4', 'piyoda d4': 'd2d4'
  };
  for (const [text, want] of Object.entries(cases)) assert.equal(pick(text), want, text);
  assert.equal(pick('salom'), 'none');
  assert.equal(pick('ot e5'), 'none');
});

test('Rokirovka, olish, aylanish va noaniqlik', () => {
  const castle = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1';
  assert.equal(pick('rokirovka', castle), 'ambiguous', "ikkala rokirovka mumkin — aniqlashtirish so'raladi");
  assert.equal(pick('qisqa rokirovka', castle), 'e1g1');
  assert.equal(pick('uzun rokirovka', castle), 'e1c1');
  assert.equal(pick('O-O-O', castle), 'e1c1');
  assert.equal(pick('длинная рокировка', castle), 'e1c1');
  assert.equal(pick('short castle', castle), 'e1g1');
  // Olish
  const cap = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
  assert.equal(pick('e takes d5', cap), 'e4d5');
  assert.equal(pick('exd5', cap), 'e4d5');
  // Aylanish: aytilmasa farzin, aytilsa o'sha dona
  const promo = '8/4P3/8/8/8/8/k7/4K3 w - - 0 1';
  assert.equal(pick('e8', promo), 'e7e8q');
  assert.equal(pick('e8 ot', promo), 'e7e8n');
  assert.equal(pick('e8 knight', promo), 'e7e8n');
  // Ikki ot bir katakka — noaniq; qayerdan yurishi aytilsa — aniq
  const two = '4k3/8/8/8/8/8/8/1N2KN2 w - - 0 1';
  assert.equal(pick('ot d2', two), 'ambiguous');
  assert.equal(pick('b1 d2', two), 'b1d2');
});

test('Shatranj: fil 2 katak sakraydi, farzin 1 katak', () => {
  assert.equal(pick('fil e3', null, Shatranj), 'c1e3');
  assert.equal(pick('e3', null, Shatranj), 'e2e3');
  assert.equal(pick('e4', null, Shatranj), 'none', "Shatranj'da piyoda 2 qadam yurmaydi");
});

test("Raqib yurishi so'z bilan o'qiladi", () => {
  const c = new Chess();
  c.move('e4'); c.move('d5');
  const m = c.move('exd5');
  assert.equal(moveToWords(m, 'en'), 'e takes d 5');
  const n = c.move('Nf6');
  assert.equal(moveToWords(n, 'uz'), 'ot f 6');
  assert.equal(moveToWords({ san: 'O-O+', from: 'e1', to: 'g1', piece: 'k' }, 'ru'), 'короткая рокировка, шах');
});

// 2026-11-24: yaxshilangan ovozli yurish — buyruqlar, «qaysi biri?», ko'proq so'z variantlari
const KN = [{ from: 'b1', to: 'd2', piece: 'n', san: 'Nbd2' }, { from: 'f3', to: 'd2', piece: 'n', san: 'Nfd2' }, { from: 'e2', to: 'e4', piece: 'p', san: 'e4' }];

test("Ovozli buyruqlar: 14 tilda taslim, durrang, qaytar, aylantir, vaqt, takrorla, yordam; yurish gapi buyruq emas", () => {
  const V = require('../voice.js');
  const cases = { taslim: 'resign', "men taslim bo'laman": 'resign', сдаюсь: 'resign', 'i resign': 'resign', 'me rindo': 'resign', teslim: 'resign', 认输: 'resign',
    durrang: 'draw', дурранг: 'draw', 'offer a draw': 'draw', ничья: 'draw', remis: 'draw', patta: 'draw',
    qaytar: 'undo', undo: 'undo', отмена: 'undo', 'geri al': 'undo', 悔棋: 'undo',
    aylantir: 'flip', 'flip the board': 'flip', переверни: 'flip', çevir: 'flip',
    vaqt: 'time', 'qancha vaqt qoldi': 'time', 'how much time': 'time', время: 'time', zeit: 'time',
    takrorla: 'repeat', repeat: 'repeat', повтори: 'repeat', yordam: 'help', help: 'help', помощь: 'help' };
  for (const [text, cmd] of Object.entries(cases)) assert.equal(V.parseCommand(text), cmd, text);
  for (const text of ['e4', 'ot f3', 'rokirovka', 'конь f3', 'salom', '']) assert.equal(V.parseCommand(text), null, text);
});

test("Ovozli yurish: bir xil yurish ikkita bo'lsa — «qaysi biri?»; javob katak, harf yoki raqam bilan; aytilgan harf darhol aniqlaydi", () => {
  const V = require('../voice.js');
  const amb = V.matchMove(V.parseSpoken('ot d2'), KN);
  assert.deepEqual(amb.ambiguous.map((m) => m.san), ['Nbd2', 'Nfd2']);
  const pick = (text) => (V.pickAmbiguous(text, amb.ambiguous) || {}).san;
  assert.equal(pick('b1'), 'Nbd2');
  assert.equal(pick('f3 dan'), 'Nfd2');
  assert.equal(pick('be'), 'Nbd2');
  assert.equal(pick('ef'), 'Nfd2');
  assert.equal(pick('эф'), 'Nfd2');
  assert.equal(pick('salom'), undefined);
  assert.equal(V.matchMove(V.parseSpoken('ot be d2'), KN).move.san, 'Nbd2');
  assert.equal(V.matchMove(V.parseSpoken('knight f d2'), KN).move.san, 'Nfd2');
  // «to» — raqam emas: inglizcha «knight to d2» hali ham «qaysi biri?»
  assert.equal(V.matchMove(V.parseSpoken('knight to d2'), KN).ambiguous.length, 2);
});

test("Ovozli yurish: tez-tez noto'g'ri eshitiladigan so'zlar va qo'shilib eshitilgan katak nomlari tushuniladi", () => {
  const V = require('../voice.js');
  const sq = (t) => V.parseSpoken(t).squares[0];
  assert.equal(sq('ef3'), 'f3');
  assert.equal(sq('se5'), 'c5'); // «be5» esa SAN — fil e5 (Be5)
  assert.equal(V.parseSpoken('be5').piece, 'b');
  assert.equal(sq('аш7'), 'h7');
  assert.equal(sq('e fore'), 'e4');
  assert.equal(sq('see tree'), 'c3');
  assert.equal(sq('de sakiz'), 'd8');
  assert.equal(V.parseSpoken('ruh a1').piece, 'r');
  assert.equal(V.parseSpoken('rock a1').piece, 'r');
  assert.equal(V.parseSpoken("o't f3").piece, 'n');
  assert.equal(V.parseSpoken('от f3').piece, 'n');
  assert.equal(V.parseSpoken('nite f3').piece, 'n');
  assert.equal(V.parseSpoken('farzim d1').piece, 'q');
  assert.equal(V.parseSpoken('shox e2').piece, 'k');
});
