#!/usr/bin/env node
/**
 * Perbaiki artikel lama yang tidak muncul di situs.
 *
 * Sejak beranda dibatasi 20 berita, kuerinya jadi:
 *
 *     where('status', '==', 'Published').orderBy('createdAt', 'desc')
 *
 * Ada DUA cara sebuah artikel bisa hilang karenanya:
 *
 * 1. Tidak punya field `status`. Artikel yang dibuat sebelum sistem alur kerja
 *    redaksi ada, atau hasil impor, tidak punya field ini — jadi tidak lolos
 *    saringan `status == 'Published'`.
 *
 * 2. Tidak punya field `createdAt`. Ini yang lebih licik: Firestore MENGELUARKAN
 *    dokumen yang tidak memiliki field yang dipakai orderBy. Artikel tanpa
 *    `createdAt` akan lenyap tanpa pesan error apa pun — tidak muncul, tapi
 *    juga tidak dilaporkan hilang.
 *
 * Skrip ini mencari keduanya dan mengisinya.
 *
 * CARA PAKAI
 *
 *   # Lihat dulu artikel mana yang bermasalah, tanpa mengubah apa pun
 *   node scripts/perbaiki-artikel-lama.mjs --service-account=service-account.json --dry-run
 *
 *   # Perbaiki sungguhan
 *   node scripts/perbaiki-artikel-lama.mjs --service-account=service-account.json
 *
 * OPSI
 *   --dry-run              Tampilkan temuan, tidak menulis apa pun.
 *   --status=Draft         Status yang diisikan (default: Published).
 *                          Pakai Draft kalau om ingin memeriksanya satu per
 *                          satu dulu lewat menu Monitor sebelum tayang.
 */

import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args.filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);

const dryRun = !!flags['dry-run'];
const statusBaru = typeof flags.status === 'string' ? flags.status : 'Published';

if (!['Draft', 'Ready for Editor', 'Published'].includes(statusBaru)) {
  console.error(`Status "${statusBaru}" tidak dikenal.`);
  process.exit(1);
}

if (!flags['service-account']) {
  console.error('Wajib: --service-account=service-account.json');
  console.error('Ambil dari Firebase Console → Project settings → Service accounts.');
  process.exit(1);
}

const { initializeApp, cert } = await import('firebase-admin/app');
const { getFirestore } = await import('firebase-admin/firestore');

const app = initializeApp({
  credential: cert(JSON.parse(readFileSync(flags['service-account'], 'utf8'))),
});
const db = getFirestore(app);

const snap = await db.collection('articles').get();

const perbaikan = [];
let sehat = 0;

snap.forEach(doc => {
  const d = doc.data();
  const kurang = [];

  if (!d.status) kurang.push('status');
  if (!d.createdAt) kurang.push('createdAt');

  if (kurang.length === 0) {
    sehat++;
    return;
  }

  const patch = {};
  if (!d.status) patch.status = statusBaru;
  if (!d.createdAt) {
    // Tidak ada tanggal asli yang bisa dipulihkan. Dipakai waktu pembuatan
    // dokumen dari metadata Firestore — itu perkiraan terdekat yang tersedia.
    patch.createdAt = (doc.createTime?.toDate() ?? new Date()).toISOString();
  }

  perbaikan.push({ id: doc.id, judul: d.title || '(tanpa judul)', kurang, patch });
});

console.log(`\nTotal artikel   : ${snap.size}`);
console.log(`Sudah lengkap   : ${sehat}`);
console.log(`Perlu diperbaiki: ${perbaikan.length}\n`);

if (perbaikan.length === 0) {
  console.log('Semua artikel sudah punya status dan createdAt. Tidak ada yang perlu dikerjakan.');
  process.exit(0);
}

for (const p of perbaikan) {
  console.log(`  ${p.id}  [kurang: ${p.kurang.join(', ')}]  ${p.judul.slice(0, 60)}`);
}

if (dryRun) {
  console.log(`\n--dry-run aktif: tidak ada yang ditulis.`);
  console.log(`Kalau sudah cocok, jalankan ulang tanpa --dry-run (status akan diisi "${statusBaru}").`);
  process.exit(0);
}

console.log(`\nMenulis perbaikan (status = "${statusBaru}")...`);

// Firestore membatasi 500 operasi per batch.
for (let i = 0; i < perbaikan.length; i += 400) {
  const batch = db.batch();
  for (const p of perbaikan.slice(i, i + 400)) {
    batch.update(db.collection('articles').doc(p.id), p.patch);
  }
  await batch.commit();
  console.log(`  ${Math.min(i + 400, perbaikan.length)}/${perbaikan.length}`);
}

console.log('\nSelesai. Muat ulang situsnya.');
process.exit(0);
