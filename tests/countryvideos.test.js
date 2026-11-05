// 🌍 "190 davlat" Shorts'lari: video nomidagi davlat kodi (ᴜᴢ kabi kichik bosh harflar ham) → klub; lentadan tushib ketsa ham saqlanadi
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { startServer } = require('./helpers');
const { startFakeYoutube } = require('./fixtures/youtube');

// Haqiqiy nom: bayroq emojisi 🇺🇿 (Windows 10 da "ᴜᴢ" bo'lib ko'rinadi)
const UZ = { id: 'GpCDMHR6Exw', title: "O'zbekiston shaxmatda qanchalik kuchli? 🇺🇿 | 190 davlat 1/190 #shorts" };
const KZ = { id: '5S20TMLMYG8', title: "Qozog'istonlik shaxmatchi Guinness rekordida! ᴋᴢ | 190 davlat 2/190 #shorts" };
const TR = { id: '-MZ8pWyMNs4', title: 'Turkiyaning eng katta sport federatsiyasi — shaxmat! TR | 190 davlat 3/190 #shorts' };

let yt, file;
before(async () => {
  yt = await startFakeYoutube({ extra: [UZ, KZ, TR] });
  file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'chesscaravan-cv-')), 'cv.sqlite');
});
after(async () => { await yt.stop(); });

test("190 davlat: video nomidagi kod bo'yicha davlatga ulanadi, server qayta ishga tushsa va video lentadan tushsa ham qoladi", async () => {
  let srv = await startServer({ SQLITE_FILE: file, YOUTUBE_BASE: yt.base, YTIMG_BASE: yt.base });
  try {
    const d = await srv.api(null, '/api/country-videos');
    assert.equal(d.success, true);
    assert.deepEqual(d.videos, { uz: UZ.id, kz: KZ.id, tr: TR.id }, 'bayroq emojisi (🇺🇿), kichik bosh harflar (ᴋᴢ) va oddiy (TR) kod');
    // Seriyaga kirmagan videolar (Shaxmat tarixi, Shaxmat + Futbol) — davlatga ulanmaydi
    assert.equal(Object.keys(d.videos).length, 3);
  } finally { await srv.stop(); }
  // Lentada endi faqat yangi video (Kazakhstan va boshqalar tushib ketgan) — oldingilari bazada saqlangan
  yt.setExtra([{ id: 'abcdefghijk', title: 'Germaniyada shaxmat ᴅᴇ | 190 davlat 4/190 #shorts' }]);
  srv = await startServer({ SQLITE_FILE: file, YOUTUBE_BASE: yt.base, YTIMG_BASE: yt.base });
  try {
    assert.deepEqual((await srv.api(null, '/api/country-videos')).videos, { uz: UZ.id, kz: KZ.id, tr: TR.id, de: 'abcdefghijk' });
  } finally { await srv.stop(); }
});
