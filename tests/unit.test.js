// Serversiz testlar: Chess960 qatlami va push matnlari
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Chess960 = require('../chess960.js');
const { pushMessage } = require('../push-texts.js');

test('Chess960: tasodifiy boshlang\'ich pozitsiya qoidalarga mos', () => {
  for (let i = 0; i < 200; i++) {
    const fen = Chess960.randomStartFen();
    const rank = fen.split('/')[7].split(' ')[0];
    assert.equal(rank.length, 8, fen);
    assert.equal(fen.split('/')[0], rank.toLowerCase(), 'qora donalar oqlarning ko\'zgu aksi');
    const b = [...rank].map((c, j) => (c === 'B' ? j : -1)).filter((j) => j >= 0);
    assert.equal(b.length, 2);
    assert.notEqual(b[0] % 2, b[1] % 2, 'fillar turli rangdagi kataklarda');
    const r = [...rank].map((c, j) => (c === 'R' ? j : -1)).filter((j) => j >= 0), k = rank.indexOf('K');
    assert.ok(r[0] < k && k < r[1], 'shoh ikki rux orasida: ' + rank);
  }
});

test('Chess960: boshlang\'ich yurishlar soni, noqonuniy yurish rad etiladi', () => {
  // Klassik joylashuv (518-pozitsiya) — aniq 20 ta yurish
  const classic = new Chess960('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w HAha - 0 1');
  assert.equal(classic.moves().length, 20);
  // Tasodifiy: 16 piyoda yurishi + otlar (chetdagi ot kamroq yuradi) → 18..20, shoh va rux yonma-yon
  // turgan pozitsiyalarda (masalan, shoh f1, rux g1) birinchi yurishdayoq rokirovka mumkin → 21
  for (let i = 0; i < 300; i++) {
    const n = new Chess960(Chess960.randomStartFen()).moves().length;
    assert.ok(n >= 18 && n <= 21, 'yurishlar soni ' + n);
  }
  const kr = new Chess960('rnbbqnkr/pppppppp/8/8/8/8/PPPPPPPP/RNBBQKRN w GAga - 0 1'); // shoh f1, rux g1
  assert.ok(kr.moves().includes('O-O'), 'shoh f1 va rux g1 — darhol O-O');
  const g = new Chess960(Chess960.randomStartFen());
  assert.equal(g.move({ from: 'e2', to: 'e5' }), null);
  assert.ok(g.move({ from: 'e2', to: 'e4' }));
  assert.equal(g.turn(), 'b');
});

test('Push matni: til, havola va turkum', () => {
  const ru = pushMessage('challenge', { from: 'Ali', clock: '3+2' }, 'ru');
  assert.equal(ru.body, 'Ali вызывает вас на партию (3+2)');
  assert.equal(ru.url, '/oyin');
  assert.equal(ru.category, 'challenge');
  assert.equal(pushMessage('message', { from: 'Ali', preview: 'salom' }, 'uz').body, 'Ali: salom');
  assert.equal(pushMessage('message', { from: 'Ali', count: 3 }, 'uz').body, 'Ali dan 3 ta yangi xabar');
  assert.equal(pushMessage('message', { from: 'Ali', preview: '🎨' }, 'en').body, 'Ali: 🎨 Sticker');
  assert.equal(pushMessage('friend_request', { from: 'Ali' }, 'en').url, '/?profile=Ali');
  assert.equal(pushMessage('rank_up', { rating: 1650 }, 'de', 'Me').url, '/?profile=Me');
  const unknown = pushMessage('some_new_type', {}, 'xx');
  assert.equal(unknown.body, 'You have a new notification', "noma'lum til → ingliz");
  assert.equal(unknown.category, 'events');
});
