// Category names now come from Firestore (see Category below) so editors can
// add new ones without a code change. Kept as a string alias for readability
// wherever it's used across the app.
export type CategoryType = string;

export interface Category {
  id: string; // slug, e.g. "pendidikan"
  name: string; // display name, e.g. "Pendidikan"
  isActive: boolean;
  createdAt: string;
}

/**
 * Jenjang redaksi SekilasUpdate.com (dibawa dari sistem lama).
 *
 * - Super Admin : akses penuh, satu-satunya yang boleh kelola user, iklan,
 *                 kategori, dan logo. Boleh hapus & pulihkan artikel.
 * - Redaktur    : boleh edit & menerbitkan semua artikel, tidak boleh hapus.
 * - Editor      : sama seperti Redaktur.
 * - Reporter    : hanya boleh menulis, serta edit/hapus artikel miliknya
 *                 sendiri selama masih berstatus Draft.
 */
export type UserRole = 'Super Admin' | 'Redaktur' | 'Editor' | 'Reporter';

export const USER_ROLES: UserRole[] = ['Super Admin', 'Redaktur', 'Editor', 'Reporter'];

/** Tahapan alur kerja berita. Urutannya: Draft -> Ready for Editor -> Published. */
export type ArticleStatus = 'Draft' | 'Ready for Editor' | 'Published';

export const ARTICLE_STATUSES: ArticleStatus[] = ['Draft', 'Ready for Editor', 'Published'];

export const ARTICLE_STATUS_LABELS: Record<ArticleStatus, string> = {
  'Draft': '✏️ Draft',
  'Ready for Editor': '🔍 Ready for Editor',
  'Published': '🚀 Published',
};

export interface Article {
  id: string;
  title: string;
  category: CategoryType;
  content: string;
  excerpt: string;
  imageUrl: string;
  imageCaption?: string;
  author: string;
  authorRole?: string;
  authorAvatar?: string;
  /** UID penulis. Dipakai untuk cek "artikel milik sendiri" pada Reporter. */
  authorUid?: string;
  /** Kota/dateline berita, mis. "SURABAYA". Dibawa dari sistem lama. */
  city?: string;
  /**
   * Kata kunci fokus untuk panel Skor SEO. Ikut disimpan supaya penilaian
   * naskah tetap sama waktu beritanya dibuka lagi untuk disunting.
   */
  focusKeyphrase?: string;
  createdAt: string; // ISO string
  views: number;
  likes: number;
  tags: string[];
  isHero?: boolean;
  isTrending?: boolean;
  isOpinion?: boolean;
  /** Tampil di running text breaking news paling atas. */
  isBreaking?: boolean;
  opinionAuthor?: string;
  opinionRole?: string;
  isActive?: boolean; // false = hidden from readers (soft-delete)
  /**
   * Tahapan alur kerja. Artikel lama yang belum punya field ini dianggap
   * 'Published' supaya data lama tetap tampil setelah migrasi.
   */
  status?: ArticleStatus;
}

/** Akun kru redaksi. Doc id = uid dari Firebase Auth. */
export interface NewsroomUser {
  uid: string;
  username: string;
  email: string;
  namaLengkap: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

/** Pengaturan situs yang bisa diubah dari panel (koleksi "settings", doc "site"). */
export interface SiteSettings {
  /** Kosong = pakai logo bawaan /logo-wordmark.png */
  logoUrl: string;
  updatedAt: string;
}

export interface CommentItem {
  id: string;
  articleId: string;
  /** Kosong kalau komentar dikirim sebagai tamu (tanpa login). */
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: string;
  /** true = komentar tamu, diisi lewat form Nama/Email/Situs Web. */
  isGuest?: boolean;
  /** Hanya untuk komentar tamu. Tidak pernah ditampilkan ke publik. */
  guestEmail?: string;
  /** Hanya untuk komentar tamu. Ditampilkan sebagai tautan pada nama. */
  guestSite?: string;
}

export interface PageContent {
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface BookmarkItem {
  id: string;
  userId: string;
  articleId: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}

export type AdPosition = 'skyscraper' | 'square' | 'billboard';

export interface Ad {
  id: string;
  position: AdPosition;
  label: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  expiresAt: string; // ISO date string, empty = no expiry
  createdAt: string;
}
