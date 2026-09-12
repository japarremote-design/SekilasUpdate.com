# SekilasUpdate.com — Berita Terupdate & Terpercaya

Portal berita SekilasUpdate.com. Basis kode diambil dari arsitektur HaloJatimNews
(Vite + React 19 + TypeScript + Tailwind 4 + Firebase Firestore/Auth),
di-rebrand penuh ke identitas SekilasUpdate.com.

## Identitas Brand

| Elemen | Nilai |
|---|---|
| Merah kilat (aksen, tombol, penanda aktif) | `#E30F2A` |
| Merah kilat, keadaan hover | `#B00D22` |
| Merah muda (di atas latar gelap) | `#FF6B7D` |
| Indigo tengah malam (header, teks brand) | `#141B34` |
| Indigo terang, keadaan hover | `#26325C` |
| Amber (ujung atas gradasi kilat, palang gerak) | `#F5A524` |
| Slogan | BERITA TERUPDATE & TERPERCAYA |

Tandanya kilat, bukan huruf: "sekilas" berarti cepat dan sekejap, dan kilat
membacanya tanpa perlu diterjemahkan di bahasa mana pun. Dua palang gerak di
kirinya memberi arah — kilat yang berdiri sendiri terbaca statis.

Wordmark memakai **Plus Jakarta Sans ExtraBold**. Slogan di bawah nama sengaja
direnggangkan sampai persis selebar nama, jadi kedua barisnya rata kiri-kanan;
kalau sloganya nanti diubah, renggangnya harus dihitung ulang.

Aset ada di `public/`:

- `logo-wordmark.png` — wordmark lengkap dengan slogan, latar transparan, dipakai di header
- `logo-wordmark-putih.png` — versi terbalik untuk latar gelap, dipakai di footer
- `logo-icon-512.png` — ikon aplikasi: kilat di atas ubin indigo, versi lengkap dengan palang gerak
- `favicon.ico` (16/32/48/256), `favicon-32.png`, `apple-touch-icon.png`
- `og-default.jpg` — gambar OG default 1200×630

Ukuran 48px ke bawah memakai versi **sederhana**: palang geraknya dibuang dan
kilatnya dibesarkan. Di ukuran segitu palang menyusut jadi dua titik yang
terbaca sebagai kotoran, bukan garis kecepatan.

Semua ikon bisa dibuat ulang dengan `python3 scripts/build-favicon.py`.
Wordmark TIDAK dibuat skrip itu — butuh berkas huruf yang tidak ikut disimpan
di repo ini, jadi berkasnya diganti tangan kalau sloganya berubah.

## Menjalankan Secara Lokal

**Prasyarat:** Node.js 18+

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint     # tsc --noEmit
npm run build    # output ke dist/
```

## Setup Firebase (PROJECT BARU SekilasUpdate.com)

Codebase ini **belum** terhubung ke Firebase mana pun — semua nilai masih
placeholder. Ada dua cara mengisinya (pilih salah satu):

### Cara A — Isi file config (paling cepat)

Buka `firebase-applet-config.json`, ganti semua nilai `GANTI-DENGAN-...`
dengan config dari Firebase Console project SekilasUpdate.com:

> Firebase Console → Project settings → General → Your apps → Web app →
> SDK setup and configuration → **Config**

### Cara B — Environment Variables di Vercel (disarankan untuk produksi)

Set di Vercel → Settings → Environment Variables. Nilai env var akan
**menimpa** isi `firebase-applet-config.json`:

| Variable | Contoh |
|---|---|
| `VITE_FIREBASE_API_KEY` | `AIza...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `sekilasupdate.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `sekilasupdate` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `sekilasupdate.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456789` |
| `VITE_FIREBASE_APP_ID` | `1:123456789:web:abc...` |
| `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | *(kosongkan kalau pakai database default)* |
| `SITE_URL` | `https://sekilasupdate.com` |

### Langkah wajib di Firebase Console

1. **Authentication** → aktifkan provider **Google**, **Anonymous**, dan
   **Email/Password** (yang terakhir untuk login kru redaksi).
2. **Authentication → Settings → Authorized domains** → tambahkan
   `sekilasupdate.com`, `www.sekilasupdate.com`, dan domain `*.vercel.app` milik project.
3. **Firestore Database** → buat database (mode production).
4. **Firestore → Rules** → tempel isi file `firestore.rules` di repo ini,
   lalu Publish.

Saat pertama kali dibuka dan koleksi masih kosong, aplikasi otomatis
melakukan seeding: 8 artikel contoh (`src/lib/seedData.ts`) dan 10 kategori
default (`src/lib/categories.ts`). Hapus/ubah isinya lewat panel admin.
Seeding hanya berhasil kalau yang membuka sudah login sebagai Super Admin,
karena aturan Firestore menolak tulisan dari pengunjung biasa.

### Migrasi data dari situs pendahulu

Situs pendahulu memakai **Realtime Database** (project lama di Firebase
Console, mis. `pasek-com`),
sedangkan yang ini memakai **Firestore** — dua produk berbeda, jadi datanya
tidak berpindah sendiri. Skrip `scripts/migrate-rtdb-to-firestore.mjs`
memindahkannya.

```bash
# 1. Ekspor data lama
#    Firebase Console (project lama) -> Realtime Database -> tiga titik -> Export JSON
#    simpan sebagai situs-lama.json

# 2. Ambil kunci service account project BARU
#    Project settings -> Service accounts -> Generate new private key
#    simpan sebagai service-account.json  (sudah masuk .gitignore)

# 3. Lihat hasil pemetaannya dulu, tanpa menulis apa pun
npm run migrate -- situs-lama.json --dry-run

# 4. Kalau sudah cocok, jalankan sungguhan
npm run migrate -- situs-lama.json --service-account=service-account.json
```

Yang dipetakan:

| Data lama (RTDB) | Jadi (Firestore) | Catatan |
|---|---|---|
| `articles` | `articles` | HTML Quill diubah jadi teks paragraf; tanggal Indonesia ("4 Agustus 2026") diubah ke ISO; `is_deleted` → `isActive:false` |
| `categories` | `categories` | Nama jadi slug. Kategori yang dipakai artikel tapi belum terdaftar ditambahkan otomatis |
| `ads_sidebar` | `ads` | `sidebar` → `square`, `banner_artikel` → `billboard` |
| `users` | `newsroomUsers` + akun Firebase Auth | Password TIDAK dibawa — lihat di bawah |
| `settings/logo_url` | `settings/site` | |

**Soal password kru.** Sistem lama menyimpan password polos di database yang
bisa dibaca siapa saja lewat Developer Tools, jadi semuanya harus dianggap
sudah bocor. Skrip ini membuat password baru yang diacak untuk tiap kru dan
menuliskannya ke `kredensial-redaksi.csv`. Bagikan lewat jalur pribadi ke
masing-masing orang, lalu **hapus berkas itu**.

**Komentar tidak ikut pindah** — sistem lama ternyata tidak pernah menyimpan
komentar ke database; formulirnya ada, tapi isinya tidak tersimpan ke mana pun.

### Kalau memindahkan artikel lama

Setiap artikel **wajib punya field `status`**. Pembaca umum mengambil berita
dengan kueri `where('status', '==', 'Published')` — aturan Firestore menilai
kuerinya, bukan hasilnya, jadi kueri tanpa filter akan ditolak seluruhnya
demi menjaga draft tetap tertutup. Artikel hasil impor yang tidak punya
`status` tidak akan muncul di situs sampai field itu diisi `"Published"`.

## Ruang Redaksi SekilasUpdate (`/redaksi`)

Sistem redaksi berjenjang, dibawa dari sistem lama.

### Jenjang & izin

| Role | Tulis | Terbitkan | Hapus | Kelola user/iklan/kategori/logo |
|---|---|---|---|---|
| Super Admin | ✓ | ✓ | ✓ | ✓ |
| Redaktur | ✓ | ✓ | — | — |
| Editor | ✓ | ✓ | — | — |
| Reporter | ✓ (draft sendiri) | — | draft sendiri | — |

### Alur kerja berita

```
Draft  →  Ready for Editor  →  Published
```

Reporter menulis dan mengajukan; Redaktur/Editor yang menerbitkan. Berita
baru selalu mulai dari Draft. Penghapusan bersifat lunak (`isActive=false`)
sehingga Super Admin masih bisa memulihkannya lewat menu Monitor.

Izin ditegakkan di **dua lapis**: `src/lib/roles.ts` untuk menyembunyikan
tombol, dan `firestore.rules` sebagai penjaga sebenarnya. Kalau salah satu
diubah, ubah keduanya — kalau hanya UI yang dijaga, siapa pun bisa
melewatinya lewat Developer Tools.

### Login

Dua jalur, sesuai perannya:

- **Pembaca** → tombol "Masuk Google" di header. Untuk komentar & bookmark.
- **Kru redaksi** → buka `/redaksi`, isi username + password.

Password ditangani Firebase Auth (di-hash di server Google) — situs tidak
pernah menyimpan atau membacanya. Ini berbeda dari sistem lama yang
menyimpan password apa adanya di database dan mencocokkannya di browser.

Aktifkan **Email/Password** di Firebase Console → Authentication → Sign-in
method, selain Google dan Anonymous.

### Akun pertama (bootstrap)

Sebelum ada satu pun akun kru, tidak ada yang bisa membuat akun. Karena itu
email di `ADMIN_EMAILS` (`src/lib/admin.ts`) selalu dianggap Super Admin.
Daftar yang sama harus ditulis ulang di fungsi `isBootstrapAdmin()` pada
`firestore.rules` — **dua tempat, harus sama**.

Langkahnya: login Google dengan email tersebut → buka `/redaksi` → menu
**User** → buatkan akun untuk kru lain.

### Panel yang tersedia

| Menu | Isi | Akses |
|---|---|---|
| Tulis Berita | Form berita (judul, kota/dateline, kategori, tahapan, breaking) | Semua kru |
| Monitor | Daftar semua berita + tahapannya, edit/hapus/pulihkan | Semua kru |
| Iklan | Kelola banner iklan | Super Admin |
| Kategori | Tambah/nonaktifkan kategori | Super Admin |
| Logo | Ganti logo situs tanpa deploy ulang | Super Admin |
| User | Buat akun kru, ubah role, nonaktifkan | Super Admin |

## Fitur lain

- **Breaking news ticker** — running text di atas header, diisi dari artikel
  yang dicentang "Masukkan ke Breaking News".
- **Komentar tamu** — pembaca bisa berkomentar tanpa akun, cukup isi
  Nama/Email/Situs Web. Email tidak pernah ditampilkan ke publik. Alternatif
  login Google tetap ada.
- **Halaman legal** — Pedoman Media Siber, Kebijakan Privasi, Syarat &
  Ketentuan, Kontak & Pengaduan. Isinya masih placeholder dan disunting
  langsung dari halamannya oleh admin.
- **Media sosial & email redaksi** — tautannya ada di `src/components/Footer.tsx`
  (konstanta `SOCIAL_LINKS` dan `CONTACT_EMAIL`), ganti sesuai akun asli.

## Deploy ke Vercel

1. Push repo ini ke GitHub, lalu Import di Vercel.
2. Framework preset: **Vite**. Build command & output sudah diatur di
   `vercel.json` (`npm run build` → `dist`).
3. Isi Environment Variables (tabel di atas).
4. Deploy.

### Preview link WhatsApp / Facebook / Telegram

`middleware.ts` adalah Vercel Edge Middleware yang mendeteksi user-agent
crawler media sosial. Untuk URL artikel (`/artikel/:id`), middleware
mengambil data artikel langsung dari Firestore REST API dan mengembalikan
HTML kecil berisi `og:title` / `og:description` / `og:image` yang benar —
jadi link yang dishare menampilkan judul & gambar artikel, bukan judul
homepage. Pengunjung manusia tidak tersentuh dan tetap mendapat React app
seperti biasa.

Kalau gambar Cloudinary dipakai, middleware otomatis menyisipkan
transformasi 1200×630 JPG supaya WhatsApp mau menampilkan gambarnya.

> Pastikan `VITE_FIREBASE_PROJECT_ID` dan `SITE_URL` sudah terisi di Vercel,
> karena middleware membaca keduanya.

## Struktur

```
src/
  App.tsx                  # routing + state utama
  types.ts                 # Article, Category, Comment, Ad, Page, UserProfile
  lib/
    firebase.ts            # init Firebase (config file atau env var)
    admin.ts               # allowlist admin
    categories.ts          # kategori default + seeding
    seedData.ts            # artikel contoh + seeding
    staticPages.ts         # halaman Tentang/Redaksi/Kontak/Iklan
  components/
    Header, Footer, HeroSection, CategoryGrid, Sidebar,
    ArticleDetail, Comments, SearchOverlay, AdBanner, StaticPageView,
    AuthModal, ArticleEditorModal, ArticleManagerModal,
    CategoryManagerModal, AdManagerModal
  lib/
    roles.ts               # matriks izin tiap jenjang redaksi
    newsroom.ts            # login & manajemen akun kru
    settings.ts            # pengaturan situs (logo)
  components/
    Newsroom, NewsroomLogin, ArticleMonitor, UserManager,
    LogoManager, BreakingTicker
middleware.ts              # OG tags dinamis untuk crawler
firestore.rules            # security rules
vercel.json                # build config + SPA rewrite
```
