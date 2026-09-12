/**
 * Vercel Edge Middleware.
 *
 * This app is a client-side SPA (React, no SSR), so search-engine and
 * social-media crawlers (Facebook, WhatsApp, Telegram, X/Twitter, LinkedIn,
 * Slack, Discord, etc.) never execute the JavaScript that renders an
 * article. They only ever see the static <head> of index.html, which is
 * always the same regardless of which article URL was shared.
 *
 * This middleware detects those crawler user-agents specifically, and for
 * article URLs (/artikel/:id) responds with a small server-rendered HTML
 * document containing the correct og:title / og:description / og:image for
 * that article (fetched live from Firestore's public REST API). Real human
 * visitors are untouched and continue to get the normal React app.
 */

// Project ID Firestore SekilasUpdate.com. Boleh di-override lewat Environment Variable
// di Vercel (VITE_FIREBASE_PROJECT_ID) supaya tidak perlu ubah kode.
const FIRESTORE_PROJECT_ID =
  process.env.VITE_FIREBASE_PROJECT_ID || 'GANTI-DENGAN-PROJECT-ID-SEKILASUPDATE';
const FIRESTORE_DATABASE_ID = '(default)';
const SITE_NAME = 'SekilasUpdate.com';
const SITE_URL = process.env.SITE_URL || 'https://sekilasupdate.com';
const DEFAULT_IMAGE = `${SITE_URL}/og-default.jpg`;

/*
 * Dua jenis perayap, dua kebutuhan yang berbeda.
 *
 * PERAYAP SOSIAL (WhatsApp, Facebook, Telegram) cuma butuh og:title, deskripsi,
 * dan gambar untuk menyusun kartu pratinjau. Isi beritanya tidak dibaca.
 *
 * PERAYAP MESIN PENCARI (Googlebot dkk) butuh ISI BERITA yang sebenarnya. Ini
 * yang selama ini terlewat: Googlebot tidak ada di daftar mana pun, jadi dia
 * menerima kerangka SPA yang kosong dan harus menjalankan JavaScript dulu untuk
 * melihat beritanya. Google memang bisa melakukan itu, tapi antreannya bisa
 * berjam-jam sampai berhari-hari — dan untuk berita, telat sehari sama dengan
 * tidak terbit.
 *
 * Isi yang disajikan ke perayap pencari HARUS sama dengan yang dilihat manusia.
 * Keduanya dibangun dari dokumen Firestore yang sama, jadi tidak ada
 * penyembunyian isi (cloaking) — yang berbeda hanya cara merakitnya.
 */
const SOCIAL_BOT_REGEX =
  /facebookexternalhit|Facebot|WhatsApp|TelegramBot|Twitterbot|LinkedInBot|Slackbot|Discordbot|SkypeUriPreview|Pinterest|redditbot|vkShare/i;

const SEARCH_BOT_REGEX =
  /Googlebot|Google-InspectionTool|Storebot-Google|AdsBot-Google|bingbot|BingPreview|DuckDuckBot|Slurp|Baiduspider|YandexBot|Applebot|SeznamBot/i;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Penanda **tebal** dan _miring_ pada naskah, disamakan dengan yang dilihat
 * pembaca di src/lib/teks.tsx. Wajib dijalankan SETELAH escapeHtml — masukannya
 * teks yang sudah aman, jadi <strong> dan <em> di sini satu-satunya tag yang
 * bisa muncul dari isi artikel.
 *
 * Kalau aturan di teks.tsx berubah, ubah juga di sini. Beda hasil antara yang
 * dilihat mesin pencari dan yang dilihat manusia bisa dianggap cloaking.
 */
function penandaInline(aman: string): string {
  return aman
    .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\p{L}\p{N}])_([^_\n]+?)_(?=$|[^\p{L}\p{N}])/gu, '$1<em>$2</em>');
}

/**
 * Baris tempat "MOJOKERTO, SekilasUpdate.com - ..." di paragraf pertama, disamakan
 * dengan pecahDateline() di src/lib/teks.tsx. Masukannya sudah lolos
 * escapeHtml, jadi aman disisipi tag.
 */
function datelineHtml(aman: string): string {
  return aman.replace(
    /^([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ0-9 .&#39;-]*?),\s*(?:SekilasUpdate\.com|SEKILASUPDATE\.COM|PASEK\.ID)\s*([-–—])\s*/,
    '<strong>$1</strong>, <strong>SekilasUpdate.com</strong> $2 '
  );
}

function stripFirestoreValue(field: any): string | undefined {
  if (!field) return undefined;
  return field.stringValue ?? field.integerValue ?? undefined;
}

// WhatsApp's crawler is notoriously strict about the OG image: it wants a
// modest file size, a standard 1200x630 aspect ratio, and explicit
// width/height meta tags — otherwise it silently shows no image at all
// (other platforms like Telegram are much more lenient). If the image was
// uploaded via Cloudinary, we can ask Cloudinary to serve an already
// resized/compressed JPG at the exact dimensions WhatsApp expects, by
// injecting a transformation segment into the URL.
function toWhatsAppFriendlyImage(url: string): { url: string; width: number; height: number } {
  const width = 1200;
  const height = 630;
  const marker = '/upload/';
  if (url.includes('res.cloudinary.com') && url.includes(marker)) {
    const idx = url.indexOf(marker) + marker.length;
    const transformed =
      url.slice(0, idx) +
      `w_${width},h_${height},c_fill,g_auto,q_auto,f_jpg/` +
      url.slice(idx);
    return { url: transformed, width, height };
  }
  // Not a Cloudinary URL (e.g. manual hotlink or the default logo) - use as-is.
  return { url, width, height };
}

async function fetchArticle(articleId: string) {
  const url =
    `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}` +
    `/databases/${FIRESTORE_DATABASE_ID}/documents/articles/${encodeURIComponent(articleId)}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const doc = await res.json();
  const fields = doc.fields ?? {};

  return {
    title: stripFirestoreValue(fields.title) ?? SITE_NAME,
    excerpt: stripFirestoreValue(fields.excerpt) ?? 'Berita Terupdate & Terpercaya',
    imageUrl: stripFirestoreValue(fields.imageUrl) ?? DEFAULT_IMAGE,
    category: stripFirestoreValue(fields.category) ?? '',
    // Field berikut hanya dipakai untuk halaman versi perayap pencari.
    content: stripFirestoreValue(fields.content) ?? '',
    author: stripFirestoreValue(fields.author) ?? SITE_NAME,
    createdAt: stripFirestoreValue(fields.createdAt) ?? '',
    status: stripFirestoreValue(fields.status) ?? 'Published',
  };
}

function renderHtml(opts: {
  title: string;
  description: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  url: string;
  /** 'article' untuk halaman berita, 'website' untuk beranda & halaman lain. */
  type?: 'article' | 'website';
}): string {
  const { title, description, image, imageWidth, imageHeight, url, type = 'article' } = opts;

  /*
   * <title> lazim diberi akhiran nama situs, tapi og:title TIDAK — itu teks
   * tebal yang ditampilkan WhatsApp dan Facebook apa adanya, dan og:site_name
   * sudah membawa nama mereknya sendiri.
   *
   * Akibatnya judul yang dikirim pemanggil harus sudah lengkap kalau ia ingin
   * mereknya muncul di kartu pratinjau — kartu beranda dulu hanya bertuliskan
   * sloganya saja karena mengandalkan akhiran yang ternyata cuma masuk ke
   * <title>. Pengecekan di bawah membuat nama situs tidak ditempel dua kali
   * untuk judul yang memang sudah memuatnya.
   */
  const fullTitle = title.includes(SITE_NAME)
    ? escapeHtml(title)
    : `${escapeHtml(title)} - ${SITE_NAME}`;

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<title>${fullTitle}</title>
<meta name="description" content="${escapeHtml(description)}" />

<meta property="og:type" content="${type}" />
<meta property="og:site_name" content="${SITE_NAME}" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:image:secure_url" content="${escapeHtml(image)}" />
<meta property="og:image:type" content="image/jpeg" />
<meta property="og:image:width" content="${imageWidth}" />
<meta property="og:image:height" content="${imageHeight}" />
<meta property="og:image:alt" content="${escapeHtml(title)}" />
<meta property="og:url" content="${escapeHtml(url)}" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(image)}" />

<meta http-equiv="refresh" content="0; url=${escapeHtml(url)}" />
</head>
<body></body>
</html>`;
}

/**
 * Halaman versi perayap mesin pencari.
 *
 * Berbeda dari kartu pratinjau sosial, halaman ini memuat ISI BERITA lengkap:
 * judul sebagai <h1>, baris penulis dan tanggal, seluruh paragraf, kategori,
 * dan tag. Itulah yang dibaca Google untuk menilai isi dan memeringkatnya.
 *
 * Tidak ada meta-refresh di sini. Mengalihkan perayap pencari dari halaman yang
 * baru saja disajikan justru merusak — halaman jadi terbaca sebagai perantara
 * kosong, bukan sebagai artikel.
 */
function renderArticleForSearch(opts: {
  article: {
    title: string; excerpt: string; imageUrl: string; category: string;
    content: string; author: string; createdAt: string;
  };
  url: string;
  origin: string;
}): string {
  const { article, url, origin } = opts;

  // Isi berita disimpan sebagai teks biasa dengan baris kosong sebagai pemisah
  // paragraf — dibungkus <p> supaya strukturnya terbaca mesin pencari.
  const paragraf = article.content
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map((p, i) => {
      // Baris tunggal jadi <br/> supaya daftar berpoin tidak menyatu.
      const isi = penandaInline(escapeHtml(p)).replace(/\n/g, '<br/>');
      return `<p>${i === 0 ? datelineHtml(isi) : isi}</p>`;
    })
    .join('\n');

  const tanggal = article.createdAt
    ? new Date(article.createdAt).toISOString()
    : new Date().toISOString();

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title.slice(0, 110),
    description: article.excerpt,
    image: article.imageUrl ? [article.imageUrl] : undefined,
    datePublished: tanggal,
    dateModified: tanggal,
    author: { '@type': 'Person', name: article.author },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: `${origin}/logo-icon-512.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    articleSection: article.category,
  });

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(article.title)} - ${SITE_NAME}</title>
<meta name="description" content="${escapeHtml(article.excerpt)}" />
<link rel="canonical" href="${escapeHtml(url)}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="${SITE_NAME}" />
<meta property="og:title" content="${escapeHtml(article.title)}" />
<meta property="og:description" content="${escapeHtml(article.excerpt)}" />
<meta property="og:image" content="${escapeHtml(article.imageUrl)}" />
<meta property="og:url" content="${escapeHtml(url)}" />
<meta property="article:published_time" content="${escapeHtml(tanggal)}" />
<meta property="article:section" content="${escapeHtml(article.category)}" />
<script type="application/ld+json">${jsonLd}</script>
</head>
<body>
<header><a href="${origin}/">${SITE_NAME}</a> &rsaquo; ${escapeHtml(article.category)}</header>
<article>
<h1>${escapeHtml(article.title)}</h1>
<p><strong>${escapeHtml(article.excerpt)}</strong></p>
<p>Oleh ${escapeHtml(article.author)} &middot; <time datetime="${escapeHtml(tanggal)}">${escapeHtml(tanggal)}</time></p>
${article.imageUrl ? `<img src="${escapeHtml(article.imageUrl)}" alt="${escapeHtml(article.title)}" width="1200" height="630" />` : ''}
${paragraf}
</article>
</body>
</html>`;
}

export const config = {
  /*
   * Selain halaman artikel, BERANDA dan halaman statis ikut dilayani.
   *
   * Sebelumnya beranda tidak tercakup, jadi preview-nya bergantung pada tag
   * og:image statis di index.html — yang alamatnya dipatok ke domain final.
   * Selama domain itu belum aktif, WhatsApp mengambil gambar dari alamat yang
   * tidak bisa dijangkau, dan hasilnya preview tanpa gambar sama sekali.
   */
  matcher: ['/', '/berita/:path*', '/artikel/:path*', '/halaman/:path*', '/tag/:path*'],
};

export default async function middleware(request: Request) {
  const ua = request.headers.get('user-agent') || '';

  const perayapPencari = SEARCH_BOT_REGEX.test(ua);
  const perayapSosial = SOCIAL_BOT_REGEX.test(ua);

  // Pengunjung biasa tidak disentuh — langsung diteruskan ke aplikasi React.
  if (!perayapPencari && !perayapSosial) {
    return; // undefined return = continue to the next handler / static file
  }

  const url = new URL(request.url);

  /*
   * Alamat asal diambil dari permintaan yang masuk, BUKAN dari konstanta.
   *
   * Dengan begitu preview otomatis benar di domain mana pun situs ini
   * dijalankan — sekilasupdate.vercel.app sekarang, sekilasupdate.com nanti — tanpa perlu
   * mengubah kode atau environment variable apa pun saat domain berpindah.
   */
  const origin = url.origin;

  const match = url.pathname.match(/^\/(?:berita|artikel)\/([^/]+)/);

  // Bukan halaman artikel (beranda, halaman statis, halaman tag) — sajikan
  // preview tingkat situs dengan gambar dan alamat yang benar-benar hidup.
  if (!match) {
    const html = renderHtml({
      // Judul ditulis lengkap dengan nama merek: inilah teks tebal yang muncul
      // di kartu WhatsApp. renderHtml tidak akan menempelkan nama situs lagi
      // karena judul ini sudah memuatnya.
      title: `${SITE_NAME} - Berita Terupdate & Terpercaya`,
      type: 'website',
      description:
        'SekilasUpdate.com menyajikan berita terupdate dan terpercaya, tajam dan mendalam, ' +
        'seputar politik, daerah, ekonomi, dan pendidikan.',
      image: `${origin}/og-default.jpg`,
      imageWidth: 1200,
      imageHeight: 630,
      url: url.toString(),
    });

    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300, s-maxage=600',
      },
    });
  }

  const segmen = decodeURIComponent(match[1]);

  /*
   * Pada alamat baru, ID dokumen menempel di ujung slug dan dipisahkan TANDA
   * HUBUNG GANDA:
   *   /berita/judul-berita-panjang--xK9mPq2Lz8nR4vB
   *
   * Pemisah ganda dipakai karena ID buatan sendiri boleh memuat tanda hubung
   * (artikel contoh di situs ini ber-ID "art-1"). Slug sendiri tidak pernah
   * memuat "--" karena setiap rentetan karakter non-alfanumerik dimampatkan
   * jadi satu tanda hubung, jadi batasnya selalu jelas.
   *
   * Alamat lama /artikel/{id} tidak punya "--", jadi dipakai apa adanya.
   */
  const potong = segmen.lastIndexOf('--');
  const articleId = potong === -1 ? segmen : segmen.slice(potong + 2);

  try {
    const article = await fetchArticle(articleId);
    if (!article) return;

    // Draft tidak boleh terindeks. Kalau sampai lolos, berita yang belum siap
    // bisa muncul di hasil pencarian sebelum redaksi menerbitkannya.
    if (article.status !== 'Published') {
      return new Response('Not Found', { status: 404 });
    }

    // Perayap mesin pencari mendapat halaman berisi artikel sungguhan —
    // judul, baris penulis, dan seluruh paragraf beritanya.
    if (perayapPencari) {
      return new Response(
        renderArticleForSearch({ article, url: url.toString(), origin }),
        {
          status: 200,
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'public, max-age=300, s-maxage=600',
          },
        }
      );
    }

    // Sisanya perayap sosial: cukup kartu pratinjau. Kalau artikel tidak punya
    // gambar, pakai gambar bawaan dari domain yang sedang diakses.
    const gambar = article.imageUrl || `${origin}/og-default.jpg`;
    const { url: ogImage, width, height } = toWhatsAppFriendlyImage(gambar);

    const html = renderHtml({
      title: article.title,
      description: article.excerpt,
      image: ogImage,
      imageWidth: width,
      imageHeight: height,
      url: url.toString(),
    });

    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300, s-maxage=600',
      },
    });
  } catch (err) {
    // On any failure, don't break the crawler request — just let it
    // through to the normal SPA shell (generic preview beats a 500).
    return;
  }
}
