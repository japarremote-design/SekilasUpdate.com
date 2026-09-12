import {
  SITE_URL,
  SITE_NAME,
  SITE_DESC,
  articleUrl,
  escapeXml,
  fetchPublishedArticles,
} from './_firestore.js';

/**
 * rss.xml — umpan berita untuk pembaca RSS, agregator, dan layanan yang
 * memantau terbitan baru (termasuk sebagian alat monitoring media).
 *
 * Hanya 30 berita terbaru. Umpan RSS memang untuk "apa yang baru", bukan arsip
 * — arsip lengkapnya urusan sitemap.
 */
export default async function handler(_req, res) {
  try {
    const articles = (await fetchPublishedArticles(30)).slice(0, 30);

    const items = articles.map(a => `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${escapeXml(articleUrl(a))}</link>
      <guid isPermaLink="true">${escapeXml(articleUrl(a))}</guid>
      <description>${escapeXml(a.excerpt)}</description>
      <category>${escapeXml(a.category)}</category>
      <dc:creator>${escapeXml(a.author)}</dc:creator>
      <pubDate>${new Date(a.createdAt).toUTCString()}</pubDate>${
        a.imageUrl ? `
      <enclosure url="${escapeXml(a.imageUrl)}" type="image/jpeg" />` : ''
      }
    </item>`).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESC)}</description>
    <language>id-ID</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

    res.setHeader('content-type', 'application/rss+xml; charset=utf-8');
    res.setHeader('cache-control', 'public, max-age=300, s-maxage=900');
    res.status(200).send(xml);
  } catch (err) {
    console.error('Gagal membuat RSS:', err);
    res.status(500).send('Gagal membuat umpan RSS.');
  }
}
