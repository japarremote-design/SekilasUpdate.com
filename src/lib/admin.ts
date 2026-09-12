/**
 * Admin allowlist.
 *
 * Anyone who signs in with Google can read the site normally, but only
 * emails listed here get access to "Tulis Berita", "Iklan", and the
 * Edit/Hapus buttons on articles.
 *
 * To make yourself admin: replace the placeholder below with your real
 * Gmail address (the same one you use to sign in to the site). You can
 * list more than one email if more people should have admin access later.
 */
export const ADMIN_EMAILS: string[] = [
  'sekilasupdate.com@gmail.com',
  'sekilasupdate.com@gmail.com',
];

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
