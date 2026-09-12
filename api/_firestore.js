/**
 * Pembantu bersama untuk sitemap dan RSS.
 *
 * Keduanya perlu daftar berita terbit terbaru. Diambil lewat REST API Firestore
 * dengan runQuery — bukan lewat SDK — supaya fungsi ini tetap ringan dan tidak
 * perlu kredensial: aturan Firestore sudah mengizinkan siapa pun membaca berita
 * yang berstatus Published.
 */

const PROJECT_ID =
  process.env.VITE_FIREBASE_PROJECT_ID || 'GANTI-DENGAN-PROJECT-ID-SEKILASUPDATE';
const DATABASE_ID = '(default)';

export const SITE_URL = (process.env.SITE_URL || 'https://sekilasupdate.com').replace(/\/$/, '');
export const SITE_NAME = 'SekilasUpdate.com';
export const SITE_DESC =
  'SekilasUpdate.com menyajikan berita terupdate dan terpercaya, tajam dan mendalam, seputar politik, daerah, ekonomi, dan pendidikan.';

function nilai(field) {
  if (!field) return undefined;
  return field.stringValue ?? field.integerValue ?? field.timestampValue ?? undefined;
}

/** Ubah judul jadi potongan alamat — harus sama persis dengan src/lib/slug.ts. */
export function slugifyTitle(title) {
  return String(title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
    .replace(/-$/, '');
}

export function articleUrl(article) {
  const slug = slugifyTitle(article.title);
  // Tanda hubung GANDA sebagai pemisah — harus sama dengan src/lib/slug.ts.
  return slug ? `${SITE_URL}/berita/${slug}--${article.id}` : `${SITE_URL}/berita/${article.id}`;
}

export function escapeXml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Ambil berita terbit, terbaru dulu.
 *
 * `limit` dibatasi karena sitemap tidak boleh tak berhingga — Google
 * menganjurkan maksimal 50.000 URL per berkas, dan untuk RSS cukup puluhan
 * terbaru saja.
 */
export async function fetchPublishedArticles(limit = 500) {
  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}` +
    `/databases/${DATABASE_ID}/documents:runQuery`;

  const body = {
    structuredQuery: {
      from: [{ collectionId: 'articles' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'status' },
          op: 'EQUAL',
          value: { stringValue: 'Published' },
        },
      },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Firestore menolak permintaan: ${res.status} ${await res.text()}`);
  }

  const rows = await res.json();

  return rows
    .filter(r => r.document)
    .map(r => {
      const f = r.document.fields ?? {};
      return {
        id: r.document.name.split('/').pop(),
        title: nilai(f.title) ?? '',
        excerpt: nilai(f.excerpt) ?? '',
        imageUrl: nilai(f.imageUrl) ?? '',
        category: nilai(f.category) ?? '',
        author: nilai(f.author) ?? SITE_NAME,
        createdAt: nilai(f.createdAt) ?? new Date().toISOString(),
        // Berita yang dinonaktifkan redaksi tidak boleh ikut disebarkan.
        isActive: f.isActive?.booleanValue !== false,
      };
    })
    .filter(a => a.isActive && a.title);
}
