/**
 * Pengaturan situs yang bisa diubah dari panel redaksi tanpa menyentuh kode.
 * Disimpan di Firestore: koleksi "settings", dokumen "site".
 */
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { SiteSettings } from '../types';

const SETTINGS_DOC = doc(db, 'settings', 'site');

/** Logo bawaan kalau belum ada yang diunggah lewat panel. */
export const DEFAULT_LOGO_URL = '/logo-wordmark.png';

export function subscribeSiteSettings(cb: (settings: SiteSettings | null) => void): () => void {
  return onSnapshot(
    SETTINGS_DOC,
    (snap) => cb(snap.exists() ? (snap.data() as SiteSettings) : null),
    (err) => {
      console.error('Gagal membaca pengaturan situs:', err);
      cb(null);
    }
  );
}

export async function fetchSiteSettings(): Promise<SiteSettings | null> {
  try {
    const snap = await getDoc(SETTINGS_DOC);
    return snap.exists() ? (snap.data() as SiteSettings) : null;
  } catch (err) {
    console.error('Gagal membaca pengaturan situs:', err);
    return null;
  }
}

export async function saveLogoUrl(logoUrl: string): Promise<void> {
  await setDoc(
    SETTINGS_DOC,
    { logoUrl: logoUrl.trim(), updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

/** URL logo yang benar-benar dipakai header. */
export function resolveLogoUrl(settings: SiteSettings | null): string {
  const url = settings?.logoUrl?.trim();
  return url ? url : DEFAULT_LOGO_URL;
}
