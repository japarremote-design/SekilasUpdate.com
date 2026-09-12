#!/usr/bin/env node
/**
 * Migrasi data situs pendahulu (Realtime Database) ke Firestore.
 *
 * Sumbernya adalah berkas ekspor JSON dari Firebase Console, bukan koneksi
 * langsung ke RTDB — supaya om tidak perlu menyiapkan kredensial untuk dua
 * project sekaligus, dan supaya hasil migrasi bisa diperiksa dulu sebelum
 * ada satu pun tulisan ke database baru.
 *
 * CARA PAKAI
 *
 *   1. Firebase Console (project lama) → Realtime Database → ⋮ → Export JSON
 *      Simpan sebagai situs-lama.json
 *
 *   2. Firebase Console (project BARU) → Project settings → Service accounts
 *      → Generate new private key. Simpan sebagai service-account.json
 *      JANGAN commit berkas ini ke git.
 *
 *   3. Lihat dulu hasilnya tanpa menulis apa pun:
 *        node scripts/migrate-rtdb-to-firestore.mjs situs-lama.json --dry-run
 *
 *   4. Kalau sudah cocok, jalankan sungguhan:
 *        node scripts/migrate-rtdb-to-firestore.mjs situs-lama.json \
 *          --service-account=service-account.json
 *
 * OPSI
 *   --dry-run                 Tampilkan hasil pemetaan, tidak menulis apa pun.
 *   --service-account=FILE    Kunci service account project Firestore baru.
 *   --skip-users              Lewati pembuatan akun kru redaksi.
 *   --out=FILE                Nama berkas kredensial (default kredensial-redaksi.csv).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// Argumen
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args.filter(a => a.startsWith('--')).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const inputFile = args.find(a => !a.startsWith('--'));

if (!inputFile) {
  console.error('Berkas ekspor JSON belum disebutkan.\n');
  console.error('  node scripts/migrate-rtdb-to-firestore.mjs situs-lama.json --dry-run');
  process.exit(1);
}

const dryRun = !!flags['dry-run'];
const skipUsers = !!flags['skip-users'];
const credentialsOut = typeof flags.out === 'string' ? flags.out : 'kredensial-redaksi.csv';

if (!dryRun && !flags['service-account']) {
  console.error('Untuk migrasi sungguhan, --service-account=service-account.json wajib diisi.');
  console.error('Kalau hanya ingin melihat hasil pemetaan, tambahkan --dry-run.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Pembantu
// ---------------------------------------------------------------------------

const BULAN_ID = {
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
};

/**
 * Sistem lama menyimpan tanggal sebagai teks berbahasa Indonesia hasil
 * toLocaleDateString('id-ID'), mis. "4 Agustus 2026" — bukan format yang bisa
 * diurutkan. Di sini diubah jadi ISO supaya pengurutan berita jadi benar.
 * Kalau tidak terbaca, dipakai waktu sekarang sebagai cadangan terakhir.
 */
function toIsoDate(value) {
  if (!value) return new Date().toISOString();

  const parsedIso = Date.parse(value);
  if (!Number.isNaN(parsedIso)) return new Date(parsedIso).toISOString();

  const m = String(value).trim().match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})$/);
  if (m) {
    const bulan = BULAN_ID[m[2].toLowerCase()];
    if (bulan !== undefined) {
      return new Date(Date.UTC(Number(m[3]), bulan, Number(m[1]), 7, 0, 0)).toISOString();
    }
  }

  console.warn(`  ! Tanggal "${value}" tidak terbaca, dipakai waktu sekarang.`);
  return new Date().toISOString();
}

function slugify(name) {
  return String(name).trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Tag di sistem lama berupa satu string dipisah koma. */
function parseTags(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  return String(raw).split(',').map(t => t.trim()).filter(Boolean);
}

function stripHtml(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

const ENTITAS = {
  '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
  '&#39;': "'", '&apos;': "'", '&ldquo;': '“', '&rdquo;': '”',
  '&lsquo;': '‘', '&rsquo;': '’', '&hellip;': '…', '&mdash;': '—', '&ndash;': '–',
};

/**
 * Ubah HTML editor lama (Quill) jadi teks paragraf.
 *
 * Penting: ArticleDetail.tsx merender isi berita sebagai TEKS BIASA yang
 * dipecah per baris kosong — bukan lewat dangerouslySetInnerHTML. Kalau HTML
 * dipindahkan apa adanya, pembaca akan melihat tag "<p>" mentah di halaman.
 *
 * Paragraf sengaja dipisah dua baris kosong supaya pemecahan di komponen itu
 * bekerja, dan kutipan yang diawali tanda petik tetap dirender sebagai blok
 * kutipan seperti seharusnya.
 */
function htmlToParagraphs(html) {
  if (!html) return '';

  let teks = String(html)
    // Tag penutup blok jadi pemisah paragraf.
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr)\s*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Butir daftar diberi penanda supaya tidak menyatu jadi satu kalimat.
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '');

  for (const [entitas, karakter] of Object.entries(ENTITAS)) {
    teks = teks.split(entitas).join(karakter);
  }
  // Entitas numerik, mis. &#8220;
  teks = teks.replace(/&#(\d+);/g, (_, kode) => String.fromCharCode(Number(kode)));

  return teks
    .split('\n')
    .map(baris => baris.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Password acak yang mudah dibacakan lewat telepon, tanpa karakter ambigu. */
function generatePassword() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(14);
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}

const ROLE_SAH = new Set(['Super Admin', 'Redaktur', 'Editor', 'Reporter']);
const STATUS_SAH = new Set(['Draft', 'Ready for Editor', 'Published']);

/** sidebar → square, banner_artikel → billboard (istilah di kode baru). */
const PLACEMENT_MAP = { sidebar: 'square', banner_artikel: 'billboard' };

// ---------------------------------------------------------------------------
// Baca & petakan
// ---------------------------------------------------------------------------

let source;
try {
  source = JSON.parse(readFileSync(inputFile, 'utf8'));
} catch (err) {
  console.error(`Gagal membaca ${inputFile}: ${err.message}`);
  process.exit(1);
}

const laporan = { artikel: 0, kategori: 0, iklan: 0, user: 0, peringatan: [] };

// --- Artikel ---------------------------------------------------------------
const articles = Object.entries(source.articles || {}).map(([key, a]) => {
  const status = STATUS_SAH.has(a.status) ? a.status : 'Published';
  if (!STATUS_SAH.has(a.status)) {
    laporan.peringatan.push(`Artikel "${a.title || key}" status "${a.status}" tidak dikenal → Published.`);
  }

  const excerpt = a.summary?.trim() || stripHtml(a.content).slice(0, 160);

  return {
    id: key,
    data: {
      title: a.title || '(tanpa judul)',
      category: a.category_id || 'Nasional',
      content: htmlToParagraphs(a.content) || a.summary || '',
      excerpt,
      imageUrl: a.thumbnail || '',
      author: a.author_name || 'Redaksi SekilasUpdate.com',
      city: a.city || '',
      createdAt: toIsoDate(a.published_at),
      views: Number(a.views_count) || 0,
      likes: 0,
      tags: parseTags(a.tags),
      isHero: a.is_headline === true,
      isTrending: a.is_headline === true,
      isBreaking: a.is_breaking === true,
      isOpinion: (a.category_id || '').toLowerCase() === 'opini',
      // is_deleted di sistem lama = penghapusan lunak, di sini isActive=false.
      isActive: a.is_deleted !== true,
      status,
    },
  };
});
laporan.artikel = articles.length;

/*
 * Beranda hanya menampilkan SATU berita utama (yang pertama ditemukan dengan
 * isHero). Sistem lama menjaga itu saat penyimpanan, tapi data hasil ekspor
 * bisa saja punya beberapa — jadi ditertibkan di sini: yang terbaru menang,
 * sisanya turun jadi sekadar "Terpopuler".
 */
const kandidatHero = articles
  .filter(a => a.data.isHero && a.data.isActive && a.data.status === 'Published')
  .sort((a, b) => new Date(b.data.createdAt) - new Date(a.data.createdAt));

if (kandidatHero.length > 1) {
  kandidatHero.slice(1).forEach(a => { a.data.isHero = false; });
  laporan.peringatan.push(
    `${kandidatHero.length} berita bertanda headline → hanya "${kandidatHero[0].data.title}" yang dipakai sebagai Hero.`
  );
}

// --- Kategori --------------------------------------------------------------
const categories = Object.values(source.categories || {})
  .filter(c => c && c.name)
  .map(c => ({
    id: slugify(c.name),
    data: {
      id: slugify(c.name),
      name: c.name,
      isActive: c.is_deleted !== true,
      createdAt: new Date().toISOString(),
    },
  }));
laporan.kategori = categories.length;

// --- Iklan -----------------------------------------------------------------
const ads = Object.entries(source.ads_sidebar || {}).map(([key, ad]) => {
  const position = PLACEMENT_MAP[ad.placement] || 'square';
  if (!PLACEMENT_MAP[ad.placement]) {
    laporan.peringatan.push(`Iklan "${ad.title || key}" penempatan "${ad.placement}" tidak dikenal → square.`);
  }
  return {
    id: key,
    data: {
      position,
      label: ad.title || 'Iklan',
      imageUrl: ad.img || '',
      linkUrl: ad.url || '',
      isActive: ad.is_deleted !== true,
      expiresAt: '',
      createdAt: new Date().toISOString(),
    },
  };
});
laporan.iklan = ads.length;

// --- Kru redaksi -----------------------------------------------------------
const users = Object.entries(source.users || {})
  .filter(([, u]) => u && u.username)
  .map(([key, u]) => {
    const role = ROLE_SAH.has(u.role) ? u.role : 'Reporter';
    if (!ROLE_SAH.has(u.role)) {
      laporan.peringatan.push(`User "${u.username}" role "${u.role}" tidak dikenal → Reporter.`);
    }
    const username = String(u.username).trim().toLowerCase();
    return {
      legacyKey: key,
      username,
      email: u.email?.trim().toLowerCase() || `${slugify(username)}@redaksi.sekilasupdate.com`,
      namaLengkap: u.nama_lengkap || u.username,
      role,
      isActive: u.is_deleted !== true,
      // Password lama SENGAJA tidak dibawa. Lihat catatan di bawah.
      password: generatePassword(),
    };
  });
laporan.user = users.length;

const logoUrl = source.settings?.logo_url || '';

/*
 * Artikel menyimpan NAMA kategori, bukan id. Kalau namanya tidak ada di
 * koleksi categories, artikel itu tidak akan muncul di grid kategori mana pun
 * — jadi kategori yang hilang ditambahkan otomatis agar tidak ada berita yang
 * tersembunyi tanpa disadari.
 */
const namaKategoriTerdaftar = new Set(categories.map(c => c.data.name));
const kategoriYatimPiatu = [
  ...new Set(
    articles
      .filter(a => a.data.isActive)
      .map(a => a.data.category)
      .filter(nama => nama && !namaKategoriTerdaftar.has(nama))
  ),
];

for (const nama of kategoriYatimPiatu) {
  categories.push({
    id: slugify(nama),
    data: { id: slugify(nama), name: nama, isActive: true, createdAt: new Date().toISOString() },
  });
  laporan.peringatan.push(`Kategori "${nama}" dipakai artikel tapi tidak terdaftar → ditambahkan otomatis.`);
}
laporan.kategori = categories.length;

// ---------------------------------------------------------------------------
// Ringkasan
// ---------------------------------------------------------------------------

console.log('\n=== HASIL PEMETAAN ===');
console.log(`  Artikel  : ${laporan.artikel}  (${articles.filter(a => a.data.status === 'Published').length} Published, ${articles.filter(a => !a.data.isActive).length} terhapus)`);
console.log(`  Kategori : ${laporan.kategori}`);
console.log(`  Iklan    : ${laporan.iklan}`);
console.log(`  Kru      : ${laporan.user}${skipUsers ? ' (dilewati)' : ''}`);
console.log(`  Logo     : ${logoUrl || '(tidak ada, pakai bawaan)'}`);

if (laporan.peringatan.length) {
  console.log('\n=== PERINGATAN ===');
  laporan.peringatan.forEach(w => console.log('  ! ' + w));
}

if (articles.length) {
  console.log('\n=== CONTOH ARTIKEL PERTAMA ===');
  console.log(JSON.stringify(articles[0], null, 2).split('\n').slice(0, 22).join('\n'));
}

if (dryRun) {
  console.log('\n--dry-run aktif: tidak ada yang ditulis ke Firestore.');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Tulis ke Firestore
// ---------------------------------------------------------------------------

const { initializeApp, cert } = await import('firebase-admin/app');
const { getFirestore } = await import('firebase-admin/firestore');
const { getAuth } = await import('firebase-admin/auth');

const serviceAccount = JSON.parse(readFileSync(flags['service-account'], 'utf8'));
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);
const authAdmin = getAuth(app);

/** Firestore membatasi 500 operasi per batch. */
async function commitInBatches(items, collectionName) {
  for (let i = 0; i < items.length; i += 400) {
    const batch = db.batch();
    for (const item of items.slice(i, i + 400)) {
      batch.set(db.collection(collectionName).doc(item.id), item.data, { merge: true });
    }
    await batch.commit();
    console.log(`  ${collectionName}: ${Math.min(i + 400, items.length)}/${items.length}`);
  }
}

console.log('\n=== MENULIS KE FIRESTORE ===');

await commitInBatches(articles, 'articles');
await commitInBatches(categories, 'categories');
await commitInBatches(ads, 'ads');

if (logoUrl) {
  await db.collection('settings').doc('site').set(
    { logoUrl, updatedAt: new Date().toISOString() },
    { merge: true }
  );
  console.log('  settings/site: logo tersimpan');
}

if (!skipUsers && users.length) {
  console.log('\n=== MEMBUAT AKUN KRU REDAKSI ===');
  const baris = ['nama_lengkap,username,email,role,password_baru'];

  for (const u of users) {
    try {
      let uid;
      try {
        const existing = await authAdmin.getUserByEmail(u.email);
        uid = existing.uid;
        await authAdmin.updateUser(uid, { password: u.password, displayName: u.namaLengkap });
        console.log(`  ~ ${u.username}: akun sudah ada, password disetel ulang`);
      } catch {
        const created = await authAdmin.createUser({
          email: u.email,
          password: u.password,
          displayName: u.namaLengkap,
        });
        uid = created.uid;
        console.log(`  + ${u.username} (${u.role})`);
      }

      await db.collection('newsroomUsers').doc(uid).set({
        uid,
        username: u.username,
        email: u.email,
        namaLengkap: u.namaLengkap,
        role: u.role,
        isActive: u.isActive,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      baris.push([u.namaLengkap, u.username, u.email, u.role, u.password].join(','));
    } catch (err) {
      console.error(`  ! Gagal membuat akun ${u.username}: ${err.message}`);
    }
  }

  writeFileSync(credentialsOut, baris.join('\n') + '\n', 'utf8');
  console.log(`\n  Kredensial ditulis ke ${credentialsOut}`);
  console.log('  Bagikan ke tiap kru lewat jalur pribadi, lalu HAPUS berkasnya.');
}

console.log('\nSelesai.');
process.exit(0);
