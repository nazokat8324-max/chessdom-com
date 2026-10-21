#!/usr/bin/env node
// Zaxira nusxadan bazani tiklash.
//   node tools/backup-restore.js <fayl> [--force] [--dry-run]
// Fayl: admin panelidan olingan .json.gz yoki GitHub Actions dagi shifrlangan .cdbk (BACKUP_TOKEN env kerak).
// Qaysi bazaga: DATABASE_URL (PostgreSQL) yoki SQLITE_FILE / database.sqlite — server bilan bir xil qoida.
// Bo'sh bo'lmagan bazaga faqat --force bilan (mavjud ma'lumot O'CHIRILADI). --dry-run — faylni ochib, tarkibini ko'rsatadi.
const fs = require('fs');
const path = require('path');
const backup = require('../backup');

async function main() {
  const args = process.argv.slice(2);
  const file = args.find(a => !a.startsWith('--'));
  const force = args.includes('--force'), dry = args.includes('--dry-run');
  if (!file) {
    console.log('Foydalanish: node tools/backup-restore.js <fayl> [--force] [--dry-run]');
    process.exit(2);
  }
  const dump = backup.readBackup(fs.readFileSync(path.resolve(file)), process.env.BACKUP_TOKEN);
  if (dump.format !== 'chessdom-backup') throw new Error("Bu ChessDom zaxira fayli emas");
  console.log(`Zaxira: ${dump.createdAt} · ${dump.engine} · ${dump.rows} qator`);
  for (const [name, rows] of Object.entries(dump.tables)) if (rows.length) console.log(`  ${name.padEnd(28)} ${rows.length}`);
  if (dry) return;

  const db = require('../database');
  console.log('Baza: ' + (db.usePostgres ? 'PostgreSQL (DATABASE_URL)' : (process.env.SQLITE_FILE || 'database.sqlite')));
  await db.initDatabase();
  const res = await db.restoreDump(dump, {
    force,
    onTable: (name, ok, total) => console.log(`  ✓ ${name.padEnd(28)} ${ok}/${total}`)
  });
  if (res.failed.length) {
    console.log(`⚠️ ${res.failed.length} ta qator yozilmadi:`);
    for (const f of res.failed.slice(0, 20)) console.log(`  ${f.table}: ${f.error}`);
  }
  console.log('✅ Tiklandi');
  await db.closeDatabase();
}

main().catch((err) => { console.error('❌ ' + err.message); process.exit(1); });
