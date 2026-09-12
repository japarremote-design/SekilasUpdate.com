/**
 * Halaman statis yang tautannya ada di footer.
 *
 * Isi tiap halaman disimpan di Firestore (koleksi "pages", doc id = slug) dan
 * bisa disunting langsung dari halamannya oleh admin — file ini hanya
 * menentukan halaman apa saja yang ada beserta label dan isi awalnya.
 *
 * Empat halaman terakhir (pedoman, privasi, syarat, pengaduan) adalah
 * kelengkapan yang lazim diminta untuk media siber terverifikasi Dewan Pers.
 */
export const STATIC_PAGE_SLUGS = [
  'tentang',
  'redaksi',
  'kontak',
  'iklan',
  'pedoman-media-siber',
  'kebijakan-privasi',
  'syarat-ketentuan',
  'kontak-pengaduan',
] as const;

export type StaticPageSlug = typeof STATIC_PAGE_SLUGS[number];

export const STATIC_PAGE_LABELS: Record<StaticPageSlug, string> = {
  'tentang': 'Tentang Kami',
  'redaksi': 'Info Redaksi',
  'kontak': 'Kontak Kami',
  'iklan': 'Iklan',
  'pedoman-media-siber': 'Pedoman Media Siber',
  'kebijakan-privasi': 'Kebijakan Privasi',
  'syarat-ketentuan': 'Syarat & Ketentuan',
  'kontak-pengaduan': 'Kontak & Pengaduan',
};

export const STATIC_PAGE_DEFAULT_CONTENT: Record<StaticPageSlug, string> = {
  'tentang': 'Halaman ini belum diisi. Ceritakan tentang SekilasUpdate.com di sini.',
  'redaksi': 'Halaman ini belum diisi. Cantumkan susunan redaksi di sini: Pemimpin Redaksi, Redaktur Pelaksana, Reporter, dan alamat kantor.',
  'kontak': 'Halaman ini belum diisi. Cantumkan email, WhatsApp, atau alamat redaksi di sini.',
  'iklan': 'Halaman ini belum diisi. Jelaskan paket & harga pasang iklan di sini.',
  'pedoman-media-siber':
    'Halaman ini belum diisi. Tempelkan naskah Pedoman Pemberitaan Media Siber di sini — ' +
    'teks resminya tersedia di situs Dewan Pers (dewanpers.or.id) dan boleh dikutip utuh.',
  'kebijakan-privasi':
    'Halaman ini belum diisi. Jelaskan data apa yang dikumpulkan SekilasUpdate.com dari pembaca ' +
    '(mis. nama & email pada kolom komentar, data analitik kunjungan), untuk apa dipakai, ' +
    'berapa lama disimpan, dan bagaimana pembaca bisa meminta datanya dihapus.',
  'syarat-ketentuan':
    'Halaman ini belum diisi. Cantumkan aturan penggunaan situs: hak cipta konten, ' +
    'aturan pengutipan, tata tertib kolom komentar, dan batasan tanggung jawab redaksi.',
  'kontak-pengaduan':
    'Halaman ini belum diisi. Cantumkan kanal pengaduan pemberitaan beserta alur dan ' +
    'tenggat tanggapannya, sesuai mekanisme Hak Jawab dan Hak Koreksi.',
};

/** Halaman yang tampil di kolom "Ikuti Kami & Kebijakan" pada footer. */
export const FOOTER_POLICY_PAGES: StaticPageSlug[] = [
  'tentang',
  'redaksi',
  'pedoman-media-siber',
  'kebijakan-privasi',
  'syarat-ketentuan',
  'kontak-pengaduan',
];
