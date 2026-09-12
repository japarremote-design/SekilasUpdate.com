import {
  SITE_URL,
  articleUrl,
  escapeXml,
  fetchPublishedArticles,
} from './_firestore.js';

/**
 * sitemap.xml — daftar seluruh alamat yang boleh diindeks Google.
 *
 * Dibuat saat diminta, bukan saat build. Berita terbit sepanjang hari; sitemap
 * yang dibekukan waktu build akan langsung basi dan berita baru harus menunggu
 * ditemukan sendiri oleh perayap — untuk berita, telat sehari sama dengan tidak
 * terbit.
 *
 * Selain alamat berita, disertakan juga tag <news:news> milik Google News yang
 * memuat tanggal terbit — itulah yang membedakan sitemap berita dari sitemap
 * situs biasa.
 */

const HALAMAN_STATIS = [
  '', 'halaman/tentang', 'halaman/redaksi', 'halaman/kontak', 'halaman/iklan',
  'halaman/pedoman-media-siber', 'halaman/kebijakan-privasi',
  'halaman/syarat-ketentuan', 'halaman/kontak-pengaduan',
];

export default async function handler(_req, res) {
  try {
    const articles = await fetchPublishedArticles(1000);
    const sekarang = new Date().toISOString();

    // Google News hanya memperhatikan berita 2 hari terakhir; sisanya cukup
    // sebagai URL biasa.
    const batasNews = Date.now() - 2 * 24 * 60 * 60 * 1000;

    const urlStatis = HALAMAN_STATIS.map(
      p => `  <url>
    <loc>${SITE_URL}/${p}</loc>
    <lastmod>${sekarang}</lastmod>
    <changefreq>${p === '' ? 'hourly' : 'monthly'}</changefreq>
    <priority>${p === '' ? '1.0' : '0.4'}</priority>
  </url>`
    ).join('\n');

    const urlBerita = articles.map(a => {
      const baru = new Date(a.createdAt).getTime() >= batasNews;
      return `  <url>
    <loc>${escapeXml(articleUrl(a))}</loc>
    <lastmod>${escapeXml(a.createdAt)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>${baru ? `
    <news:news>
      <news:publication>
        <news:name>SekilasUpdate.com</news:name>
        <news:language>id</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(a.createdAt)}</news:publication_date>
      <news:title>${escapeXml(a.title)}</news:title>
    </news:news>` : ''}
  </url>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urlStatis}
${urlBerita}
</urlset>`;

    res.setHeader('content-type', 'application/xml; charset=utf-8');
    // Disimpan sebentar di tepi jaringan supaya perayap yang datang beruntun
    // tidak memicu pembacaan Firestore berulang-ulang.
    res.setHeader('cache-control', 'public, max-age=300, s-maxage=900');
    res.status(200).send(xml);
  } catch (err) {
    console.error('Gagal membuat sitemap:', err);
    res.status(500).send('Gagal membuat sitemap.');
  }
}
