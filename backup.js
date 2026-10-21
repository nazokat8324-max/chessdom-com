// Baza zaxirasi: JSON → gzip, ixtiyoriy shifrlash (AES-256-GCM, kalit = sha256(BACKUP_TOKEN)).
// Fayl formati (shifrlangan): "CDBK1" + iv(12) + tag(16) + shifrlangan gzip. Serverda va tools/backup.js da ishlatiladi.
const crypto = require('crypto');
const zlib = require('zlib');

const MAGIC = Buffer.from('CDBK1');
const keyOf = (token) => crypto.createHash('sha256').update('chessdom-backup:' + token).digest();

function pack(dump) { return zlib.gzipSync(Buffer.from(JSON.stringify(dump))); }
function unpack(buf) { return JSON.parse(zlib.gunzipSync(buf).toString('utf8')); }

function encrypt(buf, token) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', keyOf(token), iv);
  const body = Buffer.concat([c.update(buf), c.final()]);
  return Buffer.concat([MAGIC, iv, c.getAuthTag(), body]);
}
function isEncrypted(buf) { return buf.length > 33 && buf.subarray(0, 5).equals(MAGIC); }
function decrypt(buf, token) {
  if (!isEncrypted(buf)) throw new Error('Bu shifrlangan zaxira fayli emas');
  const d = crypto.createDecipheriv('aes-256-gcm', keyOf(token), buf.subarray(5, 17));
  d.setAuthTag(buf.subarray(17, 33));
  return Buffer.concat([d.update(buf.subarray(33)), d.final()]);
}
// Faylni o'qish: shifrlangan bo'lsa token kerak; natija — dump obyekti
function readBackup(buf, token) {
  if (isEncrypted(buf)) {
    if (!token) throw new Error('Shifrlangan zaxira: BACKUP_TOKEN kerak');
    return unpack(decrypt(buf, token));
  }
  return unpack(buf);
}
// Vaqt hujumlariga chidamli taqqoslash
function sameToken(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

module.exports = { pack, unpack, encrypt, decrypt, isEncrypted, readBackup, sameToken };
