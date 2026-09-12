/**
 * Alamat artikel yang ramah mesin pencari.
 *
 * Bentuknya: /berita/judul-berita-yang-panjang--xK9mPq2Lz8nR4vB
 *
 * ID dokumen sengaja ditempel di ujung, tidak dibuang. Alasannya:
 *
 * - Judul berita bisa diperbaiki setelah terbit (salah ketik, revisi).
 *   Kalau alamat hanya bergantung pada judul, setiap perbaikan judul akan
 *   mematikan semua tautan yang sudah tersebar.
 * - Dua berita bisa berjudul sama persis, dan slug murni akan bentrok.
 * - middleware.ts perlu mengambil artikel langsung dari Firestore untuk
 *   membuat preview WhatsApp. Dengan ID di ujung, cukup satu pengambilan
 *   dokumen — tanpa itu, perlu kueri pencarian yang lebih lambat dan mahal.
 *
 * Pemisahnya TANDA HUBUNG GANDA, bukan tunggal.
 *
 * Asumsi awal saya keliru: saya kira ID Firestore tidak pernah memuat tanda
 * hubung, jadi memotong di tanda hubung terakhir sudah cukup. Itu benar untuk
 * ID yang dibuat otomatis, tapi ID buatan sendiri boleh apa saja — artikel
 * contoh di situs ini ber-ID "art-1" sampai "art-8". Akibatnya
 * "...-akhir-tahun-art-2" terbaca sebagai ID "2", dan artikelnya tidak
 * ketemu.
 *
 * Tanda hubung ganda aman karena slugifyTitle memampatkan setiap rentetan
 * karakter non-alfanumerik jadi SATU tanda hubung — jadi "--" mustahil muncul
 * di dalam slug, dan selalu menandai batas dengan ID.
 */

/** Ubah judul jadi potongan alamat: huruf kecil, spasi jadi tanda hubung. */
export function slugifyTitle(title: string): string {
  return String(title)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // buang tanda diakritik
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)                       // alamat terlalu panjang tidak berguna
    .replace(/-$/, '');
}

/** Alamat lengkap sebuah artikel, mis. /berita/judul-berita-abc123 */
export function articlePath(article: { id: string; title: string }): string {
  const slug = slugifyTitle(article.title);
  return slug ? `/berita/${slug}--${article.id}` : `/berita/${article.id}`;
}

/**
 * Ambil kembali ID dokumen dari potongan alamat.
 * "judul-berita--abc123" -> "abc123"
 *
 * Kalau tidak ada tanda hubung ganda, seluruh potongan dikembalikan apa
 * adanya — itu bentuk alamat lama /artikel/{id}, dan pemanggilnya masih punya
 * cara pencocokan cadangan.
 */
export function idFromSlug(slugWithId: string): string {
  const potong = slugWithId.lastIndexOf('--');
  return potong === -1 ? slugWithId : slugWithId.slice(potong + 2);
}

/** Perkiraan waktu baca. 200 kata per menit — angka lazim untuk teks berita. */
export function readingMinutes(content: string): number {
  const kata = String(content).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(kata / 200));
}
