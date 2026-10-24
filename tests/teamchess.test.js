// 🤝 Maslahatli shaxmat (2 ga 2): stol, o'rinlar, jamoa ichida navbat, yashirin jamoa chati, maslahat, taslim, oflayn jamoadosh
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, ack, once, sleep } = require('./helpers');

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv.stop(); });

async function four() {
  const users = [];
  for (const n of ['Tw1', 'Tw2', 'Tb1', 'Tb2']) { const u = await srv.register(n); u.socket = await srv.connect(u); users.push(u); }
  return users;
}
const move = (u, code, from, to) => ack(u.socket, 'team-move', { code, from, to });
// Shart bajarilgan team-state ni kutish (oraliq yangilanishlar o'tkazib yuboriladi)
const waitState = (sock, pred) => new Promise((resolve, reject) => {
  const t = setTimeout(() => { sock.off('team-state', h); reject(new Error('team-state kelmadi')); }, 6000);
  const h = (st) => { if (pred(st)) { clearTimeout(t); sock.off('team-state', h); resolve(st); } };
  sock.on('team-state', h);
});

test("Stol: o'rinlar, to'lganda boshlanadi, jamoa ichida navbat, chat va maslahat faqat jamoaga, taslim", async () => {
  const [w1, w2, b1, b2] = await four();
  const c = await ack(w1.socket, 'team-create', { initial: 600, increment: 5 });
  assert.equal(c.ok, true);
  const code = c.code;
  assert.ok((await ack(b1.socket, 'team-list', {})).tables.some((t) => t.code === code));
  for (const u of [w2, b1, b2]) assert.equal((await ack(u.socket, 'team-watch', { code })).ok, true);
  assert.equal((await ack(w2.socket, 'team-sit', { code, seat: 'w1' })).reason, 'taken');
  assert.equal((await ack(w2.socket, 'team-sit', { code, seat: 'w2' })).ok, true);
  assert.equal((await ack(b1.socket, 'team-sit', { code, seat: 'b1' })).ok, true);
  const started = waitState(w1.socket, (x) => x.status === 'active');
  assert.equal((await ack(b2.socket, 'team-sit', { code, seat: 'b2' })).ok, true);
  const st = await started;
  assert.equal(st.status, 'active');
  assert.equal(st.mover, 'w1');
  assert.equal((await ack(w1.socket, 'team-list', {})).tables.some((t) => t.code === code), false, "boshlangan stol ro'yxatda yo'q");

  // Navbat: oqning 1-yurishi — w1, qoraning 1-si — b1, oqning 2-si — w2
  assert.equal((await move(w2, code, 'e2', 'e4')).reason, 'not_your_turn');
  assert.equal((await move(b1, code, 'e7', 'e5')).reason, 'not_your_turn');
  assert.equal((await move(w1, code, 'e2', 'e4')).ok, true);
  assert.equal((await move(b2, code, 'e7', 'e5')).reason, 'not_your_turn');
  assert.equal((await move(b1, code, 'e7', 'e9')).reason, 'invalid_move');
  assert.equal((await move(b1, code, 'e7', 'e5')).ok, true);
  assert.equal((await move(w1, code, 'g1', 'f3')).reason, 'not_your_turn');

  // Jamoa chati: w2 oladi, qoralar olmaydi
  let leaked = false;
  const spy = () => { leaked = true; };
  b1.socket.on('team-chat', spy); b2.socket.on('team-chat', spy);
  const got = once(w2.socket, 'team-chat');
  assert.equal((await ack(w1.socket, 'team-chat', { code, message: 'Otni f3 ga qo\'y' })).ok, true);
  assert.equal((await got).message, "Otni f3 ga qo'y");
  // Maslahat: w1 taxtada taklif qiladi → w2 ga
  const sug = once(w2.socket, 'team-suggest');
  assert.equal((await ack(w1.socket, 'team-suggest', { code, from: 'g1', to: 'f3' })).ok, true);
  assert.equal((await sug).san, 'Nf3');
  assert.equal((await ack(b1.socket, 'team-suggest', { code, from: 'g8', to: 'f6' })).reason, 'not_your_turn');
  await sleep(200);
  assert.equal(leaked, false, "raqib jamoa chat va maslahatni ko'rmaydi");

  assert.equal((await move(w2, code, 'g1', 'f3')).ok, true);
  // Taslim: qora jamoaning istalgan a'zosi
  const ended = waitState(w1.socket, (x) => x.status === 'over');
  assert.equal((await ack(b2.socket, 'team-resign', { code })).ok, true);
  const fin = await ended;
  assert.equal(fin.status, 'over');
  assert.deepEqual(fin.result, { winner: 'w', reason: 'resign' });
  assert.deepEqual(fin.moves, ['e4', 'e5', 'Nf3']);
  for (const u of [w1, w2, b1, b2]) u.socket.disconnect();
});

test("Jamoadosh oflayn bo'lsa — navbatni ikkinchi a'zo ham yura oladi; mat bilan tugaydi", async () => {
  const [w1, w2, b1, b2] = await four();
  const { code } = await ack(w1.socket, 'team-create', { initial: 300, increment: 0 });
  for (const [u, s] of [[w2, 'w2'], [b1, 'b1'], [b2, 'b2']]) await ack(u.socket, 'team-sit', { code, seat: s });
  // Ahmoqona mat: 1.f3 e5 2.g4 Qh4#  (oq: w1 f3, w2 g4; qora: b1 e5, b2 Qh4#)
  assert.equal((await move(w1, code, 'f2', 'f3')).ok, true);
  b1.socket.disconnect();
  await sleep(300);
  assert.equal((await move(b2, code, 'e7', 'e5')).ok, true, "b1 oflayn — b2 uning o'rniga yuradi");
  assert.equal((await move(w2, code, 'g2', 'g4')).ok, true);
  const ended = waitState(w1.socket, (x) => x.status === 'over');
  assert.equal((await move(b2, code, 'd8', 'h4')).ok, true);
  const fin = await ended;
  assert.deepEqual(fin.result, { winner: 'b', reason: 'checkmate' });
  for (const u of [w1, w2, b2]) u.socket.disconnect();
});
