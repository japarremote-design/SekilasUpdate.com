/**
 * Mesin analisis SEO & keterbacaan untuk naskah berita berbahasa Indonesia.
 *
 * Kenapa tidak memakai kaidah Yoast apa adanya:
 *
 * Yoast dirancang untuk bahasa Inggris. Rumus keterbacaannya (Flesch), daftar
 * kata transisinya, dan deteksi kalimat pasifnya semua berbasis morfologi
 * Inggris — dan ketiganya meleset di bahasa Indonesia:
 *
 * - Kata Indonesia rata-rata lebih panjang suku katanya, jadi Flesch mentah
 *   menghukum naskah Indonesia yang sebenarnya mudah dibaca.
 * - Kalimat pasif Indonesia ditandai awalan "di-" dan "ter-", bukan "to be +
 *   past participle".
 * - Kata transisi Inggris ("however", "moreover") jelas tidak ada gunanya.
 *
 * Selain itu ada kelompok pemeriksaan yang tidak dimiliki Yoast sama sekali:
 * kaidah jurnalistik. Baris tempat, panjang lead, dan ada tidaknya kutipan
 * narasumber adalah hal yang menentukan mutu berita, tapi tak pernah diperiksa
 * plugin SEO mana pun.
 *
 * Semua ambang di berkas ini adalah heuristik yang disetel untuk berita
 * Indonesia, bukan hukum pasti. Skor hijau berarti naskahnya rapi menurut
 * daftar periksa ini — bukan jaminan peringkat di Google.
 */

export type TingkatSeo = 'buruk' | 'kurang' | 'cukup' | 'baik';
export type KelompokSeo = 'seo' | 'keterbacaan' | 'jurnalistik';

export interface Pemeriksaan {
  id: string;
  kelompok: KelompokSeo;
  judul: string;
  tingkat: TingkatSeo;
  /** Bobot dalam perhitungan skor. Makin besar makin menentukan. */
  bobot: number;
  /** Saran konkret — apa yang harus diperbaiki, bukan sekadar "kurang bagus". */
  pesan: string;
}

export interface RingkasanKelompok {
  skor: number;
  tingkat: TingkatSeo;
}

export interface HasilAnalisis {
  skor: number;
  tingkat: TingkatSeo;
  /**
   * Terisi kalau lampunya ditahan lebih rendah daripada angka skornya.
   * Ditampilkan supaya penulis tahu kenapa skor 85 belum berarti hijau.
   */
  catatanTingkat?: string;
  kelompok: Record<KelompokSeo, RingkasanKelompok>;
  pemeriksaan: Pemeriksaan[];
  /** Angka mentah, ditampilkan sebagai info tambahan di panel. */
  statistik: {
    jumlahKata: number;
    jumlahKalimat: number;
    jumlahParagraf: number;
    kataPerKalimat: number;
    sukuKataPerKata: number;
    kepadatanKunci: number;
    persenPasif: number;
    persenKalimatPanjang: number;
    persenTransisi: number;
  };
}

export interface MasukanAnalisis {
  judul: string;
  kataKunci: string;
  ringkasan: string;
  isi: string;
  urlGambar: string;
  kota: string;
  tag: string[];
}

/* ------------------------------------------------------------------ */
/* Kamus                                                               */
/* ------------------------------------------------------------------ */

/**
 * Kata transisi bahasa Indonesia. Kehadirannya membuat alur berita mengalir —
 * pembaca tahu satu paragraf menyambung, membantah, atau menyimpulkan paragraf
 * sebelumnya.
 */
const KATA_TRANSISI = [
  'namun', 'tetapi', 'akan tetapi', 'sementara itu', 'selain itu',
  'di samping itu', 'oleh karena itu', 'oleh sebab itu', 'dengan demikian',
  'sehingga', 'meskipun', 'walaupun', 'kendati', 'sebaliknya', 'selanjutnya',
  'kemudian', 'akhirnya', 'misalnya', 'contohnya', 'yakni', 'yaitu', 'bahkan',
  'apalagi', 'padahal', 'sedangkan', 'karena itu', 'sebab itu', 'setelah itu',
  'sebelumnya', 'berikutnya', 'singkatnya', 'faktanya', 'menurut',
  'berdasarkan', 'adapun', 'lebih lanjut', 'tak hanya itu', 'di sisi lain',
];

/**
 * Kata berawalan "di" yang BUKAN kalimat pasif — ini kata dasar atau serapan
 * yang kebetulan diawali "di". Tanpa daftar ini, "dinas", "direktur", dan
 * "dia" akan terhitung sebagai pasif dan angkanya melar tidak karuan.
 */
const BUKAN_PASIF = new Set([
  'dia', 'diam', 'diamnya', 'diri', 'dirinya', 'dini', 'dinas', 'dinasnya',
  'dinding', 'dingin', 'diet', 'digital', 'direktur', 'direktorat', 'direksi',
  'diskusi', 'distribusi', 'disiplin', 'dilema', 'dimensi', 'dinamis',
  'dinamika', 'diagram', 'dialog', 'diameter', 'diagnosa', 'diagnosis',
  'diploma', 'diplomasi', 'dinar', 'diesel', 'divisi', 'dividen', 'diktat',
  'diktator', 'dinasti', 'dinihari', 'dilansir', 'dilema',
]);

/** Kata umum yang tidak dihitung saat mencari posisi kata kunci di judul. */
const KATA_TUGAS = new Set([
  'di', 'ke', 'dari', 'dan', 'atau', 'yang', 'untuk', 'pada', 'dengan',
  'dalam', 'ini', 'itu', 'adalah', 'akan', 'telah', 'sudah', 'para', 'oleh',
]);

/* ------------------------------------------------------------------ */
/* Pembantu teks                                                       */
/* ------------------------------------------------------------------ */

/** Huruf kecil, tanda baca dibuang, spasi dirapatkan. */
export function normalkan(teks: string): string {
  return teks
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function pecahKata(teks: string): string[] {
  const n = normalkan(teks);
  return n ? n.split(' ') : [];
}

/**
 * Pecah jadi kalimat. Titik pada singkatan umum ("H.", "SH.", "No.") tidak
 * boleh dianggap akhir kalimat — kalau dibiarkan, satu nama bergelar bisa
 * terhitung sebagai empat kalimat pendek dan skor keterbacaan jadi palsu.
 */
export function pecahKalimat(teks: string): string[] {
  const dilindungi = teks
    .replace(/\b([A-Z]{1,3})\.\s?/g, '$1<TITIK> ')
    .replace(/\b(No|Jl|Drs|Ir|Prof|Dr|Hj|Rp|dkk|dll|tsb)\.\s?/gi, '$1<TITIK> ');

  return dilindungi
    .split(/[.!?]+(?=\s|$)/)
    .map(s => s.replace(/<TITIK>/g, '.').trim())
    .filter(s => pecahKata(s).length > 0);
}

export function pecahParagraf(teks: string): string[] {
  return teks
    .split(/\n\s*\n|\n/)
    .map(p => p.trim())
    .filter(Boolean);
}

/**
 * Hitung suku kata ala bahasa Indonesia: satu gugus vokal = satu suku kata.
 * Pendekatan ini meleset pada diftong ("pantai" dihitung dua), tapi selisihnya
 * kecil dan konsisten — cukup untuk membandingkan naskah, yang memang tujuannya.
 */
export function hitungSukuKata(kata: string): number {
  const gugus = kata.toLowerCase().match(/[aiueo]+/g);
  return gugus ? gugus.length : 1;
}

/** Apakah frasa utuh muncul di dalam teks (setelah dinormalkan). */
function memuatFrasa(teks: string, frasa: string): boolean {
  const t = ` ${normalkan(teks)} `;
  const f = ` ${normalkan(frasa)} `;
  return f.trim().length > 0 && t.includes(f);
}

/** Apakah semua kata kunci muncul, meski tidak berurutan. */
function memuatSemuaKata(teks: string, frasa: string): boolean {
  const t = new Set(pecahKata(teks));
  const k = pecahKata(frasa);
  return k.length > 0 && k.every(w => t.has(w));
}

/** Slug harus sama persis dengan src/lib/slug.ts supaya penilaian tidak bohong. */
function bikinSlug(judul: string): string {
  return judul
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
    .replace(/-$/, '');
}

/* ------------------------------------------------------------------ */
/* Analisis                                                            */
/* ------------------------------------------------------------------ */

const NILAI: Record<TingkatSeo, number> = {
  buruk: 0,
  kurang: 0.35,
  cukup: 0.7,
  baik: 1,
};

function tingkatDariSkor(skor: number): TingkatSeo {
  if (skor >= 80) return 'baik';
  if (skor >= 65) return 'cukup';
  if (skor >= 45) return 'kurang';
  return 'buruk';
}

export function analisisSeo(masukan: MasukanAnalisis): HasilAnalisis {
  const { judul, kataKunci, ringkasan, isi, urlGambar, kota, tag } = masukan;

  const hasil: Pemeriksaan[] = [];
  const tambah = (
    id: string, kelompok: KelompokSeo, judulPeriksa: string,
    tingkat: TingkatSeo, bobot: number, pesan: string,
  ) => hasil.push({ id, kelompok, judul: judulPeriksa, tingkat, bobot, pesan });

  const kata = pecahKata(isi);
  const kalimat = pecahKalimat(isi);
  const paragraf = pecahParagraf(isi);
  const paragrafPertama = paragraf[0] ?? '';
  const jumlahKata = kata.length;
  const adaKunci = normalkan(kataKunci).length > 0;

  /* ---------------- Kelompok SEO ---------------- */

  // 1. Kata kunci di judul — sinyal paling kuat yang masih dikendalikan penulis.
  if (!adaKunci) {
    tambah('kunci-judul', 'seo', 'Kata kunci fokus', 'buruk', 3,
      'Isi dulu kata kunci fokusnya. Tanpa itu sebagian besar pemeriksaan SEO tidak bisa dijalankan.');
  } else if (memuatFrasa(judul, kataKunci)) {
    tambah('kunci-judul', 'seo', 'Kata kunci di judul', 'baik', 3,
      'Kata kunci muncul utuh di judul.');
  } else if (memuatSemuaKata(judul, kataKunci)) {
    tambah('kunci-judul', 'seo', 'Kata kunci di judul', 'cukup', 3,
      'Semua kata kuncinya ada di judul tapi terpisah-pisah. Kalau bisa, rangkai jadi satu frasa utuh.');
  } else {
    tambah('kunci-judul', 'seo', 'Kata kunci di judul', 'buruk', 3,
      `Judul belum memuat "${kataKunci}". Ini yang paling menentukan — usahakan masuk.`);
  }

  // 2. Posisi kata kunci. Makin ke depan makin cepat terbaca pembaca dan mesin.
  if (adaKunci && memuatSemuaKata(judul, kataKunci)) {
    const kataJudul = pecahKata(judul).filter(w => !KATA_TUGAS.has(w));
    const kunciAwal = pecahKata(kataKunci)[0];
    const posisi = kataJudul.indexOf(kunciAwal);
    const rasio = kataJudul.length ? posisi / kataJudul.length : 1;
    if (posisi >= 0 && rasio <= 0.35) {
      tambah('posisi-kunci', 'seo', 'Posisi kata kunci di judul', 'baik', 1,
        'Kata kunci berada di bagian depan judul.');
    } else {
      tambah('posisi-kunci', 'seo', 'Posisi kata kunci di judul', 'cukup', 1,
        'Kata kunci ada tapi agak ke belakang. Judul yang membuka dengan kata kunci lebih cepat ditangkap pembaca.');
    }
  }

  // 3. Panjang judul. Google memotong sekitar 60 karakter di hasil pencarian.
  const panjangJudul = judul.trim().length;
  if (panjangJudul === 0) {
    tambah('panjang-judul', 'seo', 'Panjang judul', 'buruk', 2, 'Judul masih kosong.');
  } else if (panjangJudul < 35) {
    tambah('panjang-judul', 'seo', 'Panjang judul', 'kurang', 2,
      `Judul baru ${panjangJudul} karakter. Terlalu pendek — ruang di hasil pencarian terbuang.`);
  } else if (panjangJudul <= 65) {
    tambah('panjang-judul', 'seo', 'Panjang judul', 'baik', 2,
      `${panjangJudul} karakter — pas, tidak akan terpotong di hasil pencarian.`);
  } else if (panjangJudul <= 75) {
    tambah('panjang-judul', 'seo', 'Panjang judul', 'cukup', 2,
      `${panjangJudul} karakter, sedikit lewat. Ujungnya berisiko terpotong jadi "...".`);
  } else {
    tambah('panjang-judul', 'seo', 'Panjang judul', 'kurang', 2,
      `${panjangJudul} karakter — terlalu panjang, pasti terpotong. Pangkas ke bawah 65.`);
  }

  // 4. Kata kunci di alamat halaman.
  if (adaKunci) {
    const slug = bikinSlug(judul);
    const slugTeks = slug.replace(/-/g, ' ');
    if (memuatFrasa(slugTeks, kataKunci)) {
      tambah('kunci-slug', 'seo', 'Kata kunci di alamat URL', 'baik', 2,
        'Alamat halaman memuat kata kunci.');
    } else if (memuatSemuaKata(slugTeks, kataKunci)) {
      tambah('kunci-slug', 'seo', 'Kata kunci di alamat URL', 'cukup', 2,
        'Kata kunci ada di alamat tapi terpencar. Alamat mengikuti judul, jadi perbaiki judulnya.');
    } else {
      tambah('kunci-slug', 'seo', 'Kata kunci di alamat URL', 'kurang', 2,
        'Alamat halaman belum memuat kata kunci. Alamat dibuat otomatis dari judul.');
    }
  }

  // 5 & 6. Ringkasan: dipakai sebagai meta description dan teks pratinjau WhatsApp.
  const panjangRingkasan = ringkasan.trim().length;
  if (panjangRingkasan === 0) {
    tambah('panjang-ringkasan', 'seo', 'Panjang ringkasan', 'buruk', 2,
      'Ringkasan kosong. Ini yang tampil di hasil Google dan kartu WhatsApp.');
  } else if (panjangRingkasan < 110) {
    tambah('panjang-ringkasan', 'seo', 'Panjang ringkasan', 'kurang', 2,
      `Baru ${panjangRingkasan} karakter. Idealnya 120-158 supaya ruang di hasil pencarian terpakai penuh.`);
  } else if (panjangRingkasan <= 165) {
    tambah('panjang-ringkasan', 'seo', 'Panjang ringkasan', 'baik', 2,
      `${panjangRingkasan} karakter — panjang yang pas.`);
  } else {
    tambah('panjang-ringkasan', 'seo', 'Panjang ringkasan', 'kurang', 2,
      `${panjangRingkasan} karakter, akan terpotong. Pangkas ke bawah 158.`);
  }

  if (adaKunci) {
    tambah('kunci-ringkasan', 'seo', 'Kata kunci di ringkasan',
      memuatFrasa(ringkasan, kataKunci) ? 'baik' : memuatSemuaKata(ringkasan, kataKunci) ? 'cukup' : 'kurang', 2,
      memuatSemuaKata(ringkasan, kataKunci)
        ? 'Ringkasan sudah memuat kata kunci.'
        : 'Selipkan kata kunci di ringkasan — bagian ini yang dibaca calon pengunjung sebelum mengklik.');
  }

  // 7. Kata kunci di paragraf pembuka.
  if (adaKunci) {
    if (memuatFrasa(paragrafPertama, kataKunci)) {
      tambah('kunci-lead', 'seo', 'Kata kunci di paragraf pembuka', 'baik', 3,
        'Paragraf pembuka sudah menyebut kata kunci.');
    } else if (memuatSemuaKata(paragrafPertama, kataKunci)) {
      tambah('kunci-lead', 'seo', 'Kata kunci di paragraf pembuka', 'cukup', 3,
        'Kata kuncinya ada di pembuka tapi terpisah. Sebutkan utuh kalau memungkinkan.');
    } else {
      tambah('kunci-lead', 'seo', 'Kata kunci di paragraf pembuka', 'buruk', 3,
        'Paragraf pertama belum menyebut kata kunci. Pembaca dan mesin sama-sama menilai berita dari paragraf ini.');
    }
  }

  // 8. Kepadatan kata kunci — dua arah: terlalu sedikit lemah, terlalu banyak
  //    terbaca sebagai penjejalan dan justru merugikan.
  let kepadatan = 0;
  if (adaKunci && jumlahKata > 0) {
    // Dihitung per KEMUNCULAN frasa, bukan per kata penyusunnya. Kalau tiap
    // kata ikut dikalikan, kata kunci tiga kata otomatis terbaca tiga kali
    // lebih padat — dan justru frasa panjang begitulah yang lazim dipakai
    // judul berita, jadi naskah yang benar malah tervonis menjejalkan kunci.
    const kunciNorm = normalkan(kataKunci);
    const jumlahKunci = ` ${normalkan(isi)} `.split(` ${kunciNorm} `).length - 1;
    kepadatan = (jumlahKunci / jumlahKata) * 100;

    if (kepadatan === 0) {
      tambah('kepadatan', 'seo', 'Kepadatan kata kunci', 'buruk', 2,
        'Kata kunci tidak muncul sama sekali di badan berita.');
    } else if (kepadatan < 0.4) {
      tambah('kepadatan', 'seo', 'Kepadatan kata kunci', 'kurang', 2,
        `Baru ${kepadatan.toFixed(1)}%. Sebut kata kuncinya beberapa kali lagi secara wajar.`);
    } else if (kepadatan <= 2.5) {
      tambah('kepadatan', 'seo', 'Kepadatan kata kunci', 'baik', 2,
        `${kepadatan.toFixed(1)}% — proporsi yang sehat.`);
    } else if (kepadatan <= 3.5) {
      tambah('kepadatan', 'seo', 'Kepadatan kata kunci', 'cukup', 2,
        `${kepadatan.toFixed(1)}% mulai terlalu sering. Ganti sebagian dengan kata ganti atau padanan.`);
    } else {
      tambah('kepadatan', 'seo', 'Kepadatan kata kunci', 'buruk', 2,
        `${kepadatan.toFixed(1)}% — terlalu padat. Ini terbaca sebagai penjejalan kata kunci dan bisa merugikan.`);
    }
  }

  // 9. Panjang naskah.
  if (jumlahKata < 150) {
    tambah('panjang-naskah', 'seo', 'Panjang naskah', 'buruk', 2,
      `Baru ${jumlahKata} kata. Berita di bawah 150 kata sulit bersaing di hasil pencarian.`);
  } else if (jumlahKata < 300) {
    tambah('panjang-naskah', 'seo', 'Panjang naskah', 'kurang', 2,
      `${jumlahKata} kata. Tambah lagi sampai minimal 300 kata.`);
  } else if (jumlahKata < 500) {
    tambah('panjang-naskah', 'seo', 'Panjang naskah', 'cukup', 2,
      `${jumlahKata} kata — sudah memadai untuk berita harian.`);
  } else {
    tambah('panjang-naskah', 'seo', 'Panjang naskah', 'baik', 2,
      `${jumlahKata} kata — cukup dalam untuk dianggap liputan serius.`);
  }

  // 10. Gambar utama.
  tambah('gambar', 'seo', 'Gambar utama', urlGambar.trim() ? 'baik' : 'buruk', 2,
    urlGambar.trim()
      ? 'Gambar utama sudah terpasang.'
      : 'Belum ada gambar utama. Tanpa ini, kartu pratinjau di WhatsApp dan Facebook tampil polos dan jarang diklik.');

  // 11. Tag.
  const tagBersih = tag.filter(t => t.trim());
  tambah('tag', 'seo', 'Tag berita',
    tagBersih.length >= 3 ? 'baik' : tagBersih.length >= 1 ? 'cukup' : 'kurang', 1,
    tagBersih.length >= 3
      ? `${tagBersih.length} tag terpasang.`
      : 'Tambahkan tag sampai minimal tiga — ini yang menghubungkan berita ini dengan berita sejenis di situs.');

  /* ---------------- Kelompok Keterbacaan ---------------- */

  const jumlahKalimat = kalimat.length;
  const kataPerKalimat = jumlahKalimat ? jumlahKata / jumlahKalimat : 0;
  const sukuKataPerKata = jumlahKata
    ? kata.reduce((t, w) => t + hitungSukuKata(w), 0) / jumlahKata
    : 0;

  // 12. Kalimat panjang. Untuk berita, di atas 20 kata sudah melelahkan.
  const kalimatPanjang = kalimat.filter(k => pecahKata(k).length > 20).length;
  const persenKalimatPanjang = jumlahKalimat ? (kalimatPanjang / jumlahKalimat) * 100 : 0;
  if (jumlahKalimat === 0) {
    tambah('kalimat-panjang', 'keterbacaan', 'Panjang kalimat', 'buruk', 3, 'Isi berita masih kosong.');
  } else if (persenKalimatPanjang <= 20) {
    tambah('kalimat-panjang', 'keterbacaan', 'Panjang kalimat', 'baik', 3,
      `Rata-rata ${kataPerKalimat.toFixed(0)} kata per kalimat — enak dibaca.`);
  } else if (persenKalimatPanjang <= 35) {
    tambah('kalimat-panjang', 'keterbacaan', 'Panjang kalimat', 'cukup', 3,
      `${persenKalimatPanjang.toFixed(0)}% kalimat lebih dari 20 kata. Pecah beberapa yang terpanjang.`);
  } else {
    tambah('kalimat-panjang', 'keterbacaan', 'Panjang kalimat', 'buruk', 3,
      `${persenKalimatPanjang.toFixed(0)}% kalimat kepanjangan. Pecah jadi kalimat-kalimat pendek — ini keluhan pembaca nomor satu.`);
  }

  // 13. Panjang paragraf. Paragraf berita idealnya 2-4 kalimat.
  const paragrafGemuk = paragraf.filter(p => pecahKata(p).length > 80).length;
  if (paragraf.length === 0) {
    tambah('paragraf', 'keterbacaan', 'Panjang paragraf', 'buruk', 2, 'Belum ada paragraf.');
  } else if (paragrafGemuk === 0) {
    tambah('paragraf', 'keterbacaan', 'Panjang paragraf', 'baik', 2,
      `${paragraf.length} paragraf, tidak ada yang menggumpal.`);
  } else {
    tambah('paragraf', 'keterbacaan', 'Panjang paragraf',
      paragrafGemuk <= 1 ? 'cukup' : 'kurang', 2,
      `${paragrafGemuk} paragraf lebih dari 80 kata. Di layar HP itu terlihat seperti dinding teks — pecah jadi beberapa paragraf.`);
  }

  // 14. Kalimat pasif. Bahasa jurnalistik Indonesia lebih kuat dalam bentuk aktif.
  const kataPasif = kata.filter(w =>
    ((/^di[a-z]{3,}/.test(w) && !BUKAN_PASIF.has(w)) || /^ter[a-z]{3,}/.test(w))
  ).length;
  const persenPasif = jumlahKata ? (kataPasif / jumlahKata) * 100 : 0;
  if (persenPasif <= 6) {
    tambah('pasif', 'keterbacaan', 'Kalimat pasif', 'baik', 2,
      `${persenPasif.toFixed(1)}% kata berbentuk pasif — porsi yang wajar.`);
  } else if (persenPasif <= 10) {
    tambah('pasif', 'keterbacaan', 'Kalimat pasif', 'cukup', 2,
      `${persenPasif.toFixed(1)}% pasif. Ubah sebagian jadi aktif supaya kalimatnya lebih bertenaga.`);
  } else {
    tambah('pasif', 'keterbacaan', 'Kalimat pasif', 'kurang', 2,
      `${persenPasif.toFixed(1)}% pasif — terlalu banyak. "Polisi menangkap pelaku" lebih kuat daripada "Pelaku ditangkap polisi".`);
  }

  // 15. Kata transisi.
  const kalimatTransisi = kalimat.filter(k => {
    const n = ` ${normalkan(k)} `;
    return KATA_TRANSISI.some(t => n.includes(` ${t} `));
  }).length;
  const persenTransisi = jumlahKalimat ? (kalimatTransisi / jumlahKalimat) * 100 : 0;
  if (persenTransisi >= 25) {
    tambah('transisi', 'keterbacaan', 'Kata transisi', 'baik', 2,
      `${persenTransisi.toFixed(0)}% kalimat memakai kata penghubung — alurnya mengalir.`);
  } else if (persenTransisi >= 12) {
    tambah('transisi', 'keterbacaan', 'Kata transisi', 'cukup', 2,
      `${persenTransisi.toFixed(0)}%. Tambah kata seperti "namun", "sementara itu", atau "selain itu" untuk menyambung antar paragraf.`);
  } else {
    tambah('transisi', 'keterbacaan', 'Kata transisi', 'kurang', 2,
      `Baru ${persenTransisi.toFixed(0)}%. Antar kalimat terasa melompat — pakai kata penghubung.`);
  }

  // 16. Kalimat berturut-turut yang dibuka kata sama.
  let awalanBerulang = 0;
  for (let i = 2; i < kalimat.length; i++) {
    const a = pecahKata(kalimat[i - 2])[0];
    const b = pecahKata(kalimat[i - 1])[0];
    const c = pecahKata(kalimat[i])[0];
    if (a && a === b && b === c) awalanBerulang++;
  }
  tambah('awalan', 'keterbacaan', 'Variasi awal kalimat',
    awalanBerulang === 0 ? 'baik' : awalanBerulang <= 1 ? 'cukup' : 'kurang', 1,
    awalanBerulang === 0
      ? 'Awal kalimatnya bervariasi.'
      : `Ada ${awalanBerulang} tempat dengan tiga kalimat beruntun berawalan kata sama. Variasikan supaya tidak monoton.`);

  // 17. Indeks kemudahan baca. Bukan Flesch — dua ukuran yang paling menentukan
  //     beban baca (panjang kalimat & panjang kata) diskalakan langsung, dengan
  //     ambang yang disetel untuk berita Indonesia.
  const bebanKalimat = Math.max(0, Math.min(1, (kataPerKalimat - 12) / 16));
  const bebanKata = Math.max(0, Math.min(1, (sukuKataPerKata - 2.1) / 1.1));
  const indeks = Math.round(100 - (bebanKalimat * 60 + bebanKata * 40));
  if (jumlahKata < 30) {
    tambah('kemudahan', 'keterbacaan', 'Kemudahan baca', 'kurang', 2,
      'Naskah terlalu pendek untuk dinilai keterbacaannya.');
  } else if (indeks >= 70) {
    tambah('kemudahan', 'keterbacaan', 'Kemudahan baca', 'baik', 2,
      `Indeks ${indeks}/100 — mudah dibaca pembaca umum.`);
  } else if (indeks >= 50) {
    tambah('kemudahan', 'keterbacaan', 'Kemudahan baca', 'cukup', 2,
      `Indeks ${indeks}/100 — agak berat. Pendekkan kalimat atau pakai kata yang lebih lazim.`);
  } else {
    tambah('kemudahan', 'keterbacaan', 'Kemudahan baca', 'kurang', 2,
      `Indeks ${indeks}/100 — berat. Kalimatnya panjang dan katanya rumit.`);
  }

  /* ---------------- Kelompok Jurnalistik ---------------- */

  // 18. Baris tempat.
  const punyaDateline = /^([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ0-9 .'-]*?),\s*(SekilasUpdate\.com|SEKILASUPDATE\.COM|PASEK\.ID)\s*[-–—]\s*/
    .test(paragrafPertama.trimStart());
  if (punyaDateline) {
    tambah('dateline', 'jurnalistik', 'Baris tempat', 'baik', 2,
      'Baris tempat sudah benar dan akan ditebalkan otomatis saat tayang.');
  } else if (kota.trim()) {
    tambah('dateline', 'jurnalistik', 'Baris tempat', 'cukup', 2,
      `Kolom kota sudah diisi "${kota}", tapi paragraf pertama belum dibuka dengan format "${kota.toUpperCase()}, SekilasUpdate.com - ".`);
  } else {
    tambah('dateline', 'jurnalistik', 'Baris tempat', 'kurang', 2,
      'Belum ada baris tempat. Buka paragraf pertama dengan "KOTA, SekilasUpdate.com - " agar jelas berita ini dari mana.');
  }

  // 19. Panjang lead. Kalimat pembuka berita harus ringkas dan padat 5W1H.
  const kalimatPertama = kalimat[0] ?? '';
  const panjangLead = pecahKata(kalimatPertama).length;
  if (panjangLead === 0) {
    tambah('lead', 'jurnalistik', 'Kalimat pembuka', 'buruk', 2, 'Belum ada kalimat pembuka.');
  } else if (panjangLead <= 30) {
    tambah('lead', 'jurnalistik', 'Kalimat pembuka', 'baik', 2,
      `Lead ${panjangLead} kata — ringkas, sesuai kaidah berita.`);
  } else if (panjangLead <= 40) {
    tambah('lead', 'jurnalistik', 'Kalimat pembuka', 'cukup', 2,
      `Lead ${panjangLead} kata, mulai berat. Kaidah umum: maksimal 30 kata.`);
  } else {
    tambah('lead', 'jurnalistik', 'Kalimat pembuka', 'kurang', 2,
      `Lead ${panjangLead} kata — terlalu panjang. Pembaca memutuskan lanjut atau tidak di kalimat ini.`);
  }

  // 20. Kutipan narasumber — pembeda berita dari siaran pers.
  const adaKutipan = paragraf.some(p => p.trimStart().startsWith('"') || p.trimStart().startsWith('“'));
  tambah('kutipan', 'jurnalistik', 'Kutipan narasumber', adaKutipan ? 'baik' : 'kurang', 2,
    adaKutipan
      ? 'Ada kutipan langsung narasumber.'
      : 'Belum ada kutipan langsung. Paragraf yang diawali tanda kutip akan tampil sebagai blok kutipan yang menonjol.');

  // 21. Judul tidak berteriak.
  const hurufJudul = judul.replace(/[^A-Za-z]/g, '');
  const rasioKapital = hurufJudul ? (judul.replace(/[^A-Z]/g, '').length / hurufJudul.length) : 0;
  const tandaSeru = (judul.match(/[!?]/g) || []).length;
  if (rasioKapital > 0.7 && hurufJudul.length > 10) {
    tambah('judul-tenang', 'jurnalistik', 'Gaya judul', 'kurang', 1,
      'Judul hampir seluruhnya huruf kapital. Terbaca seperti berteriak dan menurunkan kesan kredibel.');
  } else if (tandaSeru >= 2) {
    tambah('judul-tenang', 'jurnalistik', 'Gaya judul', 'cukup', 1,
      'Tanda seru/tanya berlebihan di judul. Berita serius cukup satu, atau tanpa sama sekali.');
  } else {
    tambah('judul-tenang', 'jurnalistik', 'Gaya judul', 'baik', 1,
      'Gaya judulnya tenang dan kredibel.');
  }

  // 22. Ringkasan bukan salinan mentah paragraf pertama.
  if (panjangRingkasan > 0 && paragrafPertama) {
    const sama = normalkan(ringkasan) === normalkan(paragrafPertama).slice(0, normalkan(ringkasan).length);
    tambah('ringkasan-mandiri', 'jurnalistik', 'Ringkasan mandiri', sama ? 'kurang' : 'baik', 1,
      sama
        ? 'Ringkasan disalin mentah dari paragraf pertama. Tulis ulang jadi kalimat penggoda supaya pembaca punya alasan mengklik.'
        : 'Ringkasan ditulis tersendiri, tidak sekadar menyalin pembuka.');
  }

  /* ---------------- Perhitungan skor ---------------- */

  const skorKelompok = (k: KelompokSeo): RingkasanKelompok => {
    const anggota = hasil.filter(p => p.kelompok === k);
    const totalBobot = anggota.reduce((t, p) => t + p.bobot, 0);
    if (!totalBobot) return { skor: 0, tingkat: 'buruk' };
    const nilai = anggota.reduce((t, p) => t + p.bobot * NILAI[p.tingkat], 0);
    const skor = Math.round((nilai / totalBobot) * 100);
    return { skor, tingkat: tingkatDariSkor(skor) };
  };

  const totalBobot = hasil.reduce((t, p) => t + p.bobot, 0);
  const totalNilai = hasil.reduce((t, p) => t + p.bobot * NILAI[p.tingkat], 0);
  const skor = totalBobot ? Math.round((totalNilai / totalBobot) * 100) : 0;

  /*
   * Lampu hijau ditahan kalau masih ada pemeriksaan merah.
   *
   * Rata-rata berbobot punya kelemahan: satu kegagalan penting bisa tenggelam
   * di antara belasan pemeriksaan yang lulus. Naskah tanpa gambar utama pernah
   * menembus skor 85 dan tampil hijau — padahal kartu pratinjaunya polos dan
   * nyaris tidak akan diklik siapa pun. Angka skornya tetap ditampilkan apa
   * adanya supaya jujur, tapi warnanya mengikuti pemeriksaan terburuk.
   */
  const jumlahBuruk = hasil.filter(p => p.tingkat === 'buruk').length;
  let tingkat = tingkatDariSkor(skor);
  let catatanTingkat: string | undefined;

  if (jumlahBuruk >= 3 && (tingkat === 'baik' || tingkat === 'cukup')) {
    tingkat = 'kurang';
    catatanTingkat = `Ditahan di oranye: ada ${jumlahBuruk} pemeriksaan berstatus merah.`;
  } else if (jumlahBuruk > 0 && tingkat === 'baik') {
    tingkat = 'cukup';
    catatanTingkat = jumlahBuruk === 1
      ? 'Ditahan di kuning: masih ada 1 pemeriksaan merah.'
      : `Ditahan di kuning: masih ada ${jumlahBuruk} pemeriksaan merah.`;
  }

  return {
    skor,
    tingkat,
    catatanTingkat,
    kelompok: {
      seo: skorKelompok('seo'),
      keterbacaan: skorKelompok('keterbacaan'),
      jurnalistik: skorKelompok('jurnalistik'),
    },
    pemeriksaan: hasil,
    statistik: {
      jumlahKata,
      jumlahKalimat,
      jumlahParagraf: paragraf.length,
      kataPerKalimat: Number(kataPerKalimat.toFixed(1)),
      sukuKataPerKata: Number(sukuKataPerKata.toFixed(2)),
      kepadatanKunci: Number(kepadatan.toFixed(1)),
      persenPasif: Number(persenPasif.toFixed(1)),
      persenKalimatPanjang: Number(persenKalimatPanjang.toFixed(0)),
      persenTransisi: Number(persenTransisi.toFixed(0)),
    },
  };
}

/** Warna lampu untuk tiap tingkat — dipakai panel dan lencana daftar berita. */
export const WARNA_TINGKAT: Record<TingkatSeo, { bulat: string; teks: string; latar: string; label: string }> = {
  buruk:  { bulat: 'bg-red-500',    teks: 'text-red-700',    latar: 'bg-red-50',    label: 'Buruk' },
  kurang: { bulat: 'bg-orange-500', teks: 'text-orange-700', latar: 'bg-orange-50', label: 'Perlu diperbaiki' },
  cukup:  { bulat: 'bg-yellow-400', teks: 'text-yellow-700', latar: 'bg-yellow-50', label: 'Cukup' },
  baik:   { bulat: 'bg-emerald-500',teks: 'text-emerald-700',latar: 'bg-emerald-50',label: 'Baik' },
};
