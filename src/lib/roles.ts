/**
 * Matriks izin jenjang redaksi SekilasUpdate.com.
 *
 * Semua aturan di sini dipakai untuk MENYEMBUNYIKAN tombol di UI. Itu saja
 * tidak cukup — aturan yang sama juga ditegakkan di `firestore.rules`, karena
 * apa pun yang hanya dijaga di browser bisa dilewati lewat Developer Tools.
 * Kalau salah satu diubah, ubah keduanya.
 */
import { Article, ArticleStatus, NewsroomUser, UserRole } from '../types';

/** Status efektif sebuah artikel (artikel lama tanpa field status = Published). */
export function statusOf(article: Article): ArticleStatus {
  return article.status ?? 'Published';
}

/** Hanya artikel terbit & aktif yang boleh dilihat pembaca umum. */
export function isPublicallyVisible(article: Article): boolean {
  return statusOf(article) === 'Published' && article.isActive !== false;
}

export function isSuperAdmin(u: NewsroomUser | null): boolean {
  return u?.role === 'Super Admin' && u.isActive;
}

/** Redaktur & Editor sejajar: boleh menyunting dan menerbitkan apa pun. */
export function isDeskEditor(u: NewsroomUser | null): boolean {
  return !!u && u.isActive && (u.role === 'Redaktur' || u.role === 'Editor');
}

export function isNewsroomMember(u: NewsroomUser | null): boolean {
  return !!u && u.isActive;
}

/** Hanya Super Admin yang boleh mengelola user, iklan, kategori, dan logo. */
export function canManageUsers(u: NewsroomUser | null): boolean {
  return isSuperAdmin(u);
}
export const canManageAds = canManageUsers;
export const canManageCategories = canManageUsers;
export const canManageLogo = canManageUsers;

/** Semua kru redaksi boleh menulis berita baru. */
export function canCreateArticle(u: NewsroomUser | null): boolean {
  return isNewsroomMember(u);
}

/**
 * Reporter hanya boleh menyunting tulisannya sendiri, dan hanya selama masih
 * Draft. Begitu naik ke meja editor, artikel lepas dari tangannya.
 */
export function canEditArticle(u: NewsroomUser | null, article: Article): boolean {
  if (!isNewsroomMember(u)) return false;
  if (isSuperAdmin(u) || isDeskEditor(u)) return true;
  return statusOf(article) === 'Draft' && ownsArticle(u, article);
}

/** Hanya Super Admin yang boleh menghapus; Reporter boleh buang draft-nya sendiri. */
export function canDeleteArticle(u: NewsroomUser | null, article: Article): boolean {
  if (!isNewsroomMember(u)) return false;
  if (isSuperAdmin(u)) return true;
  if (isDeskEditor(u)) return false;
  return statusOf(article) === 'Draft' && ownsArticle(u, article);
}

/** Hanya Super Admin yang boleh memulihkan artikel yang sudah dihapus. */
export function canRestoreArticle(u: NewsroomUser | null): boolean {
  return isSuperAdmin(u);
}

function ownsArticle(u: NewsroomUser | null, article: Article): boolean {
  if (!u) return false;
  if (article.authorUid) return article.authorUid === u.uid;
  // Artikel lama dari sistem lama hanya menyimpan nama penulis.
  return (article.author || '').trim().toLowerCase() === u.namaLengkap.trim().toLowerCase();
}

/**
 * Tahapan yang boleh dipilih tiap role di form berita.
 * Reporter tidak bisa menerbitkan sendiri — maksimal mengajukan ke editor.
 */
export function allowedStatuses(u: NewsroomUser | null): ArticleStatus[] {
  if (isSuperAdmin(u) || isDeskEditor(u)) return ['Draft', 'Ready for Editor', 'Published'];
  if (isNewsroomMember(u)) return ['Draft', 'Ready for Editor'];
  return [];
}

export function canPublish(u: NewsroomUser | null): boolean {
  return allowedStatuses(u).includes('Published');
}

/** Warna badge status di panel Monitor. */
export function statusBadgeClass(status: ArticleStatus): string {
  switch (status) {
    case 'Published': return 'bg-green-100 text-green-800';
    case 'Ready for Editor': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-700';
  }
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  'Super Admin': 'Akses penuh: kelola user, iklan, kategori, logo, hapus & pulihkan berita.',
  'Redaktur': 'Menyunting dan menerbitkan semua berita. Tidak bisa menghapus.',
  'Editor': 'Menyunting dan menerbitkan semua berita. Tidak bisa menghapus.',
  'Reporter': 'Menulis berita dan menyunting draft sendiri. Penerbitan lewat editor.',
};
