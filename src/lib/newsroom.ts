/**
 * Autentikasi & manajemen akun kru redaksi SekilasUpdate.com.
 *
 * Sistem lama menyimpan password apa adanya di database dan
 * membandingkannya di browser, jadi siapa pun yang membuka Developer Tools
 * bisa membaca password seluruh kru. Di sini password ditangani sepenuhnya
 * oleh Firebase Auth — situs tidak pernah menyimpan atau melihatnya.
 *
 * Kru tetap login memakai USERNAME seperti dulu. Caranya: dokumen di koleksi
 * `newsroomUsers` menyimpan pasangan username -> email, lalu email itulah yang
 * dipakai ke Firebase Auth di belakang layar.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  firebaseConfig,
  signInWithEmailAndPassword,
} from './firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { NewsroomUser, UserRole } from '../types';
import { ADMIN_EMAILS } from './admin';

const USERS_COLLECTION = 'newsroomUsers';

/** Ubah username jadi email internal kalau kru tidak mengetik email lengkap. */
function usernameToFallbackEmail(username: string): string {
  const slug = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return `${slug}@redaksi.sekilasupdate.com`;
}

/** Cari email milik sebuah username. */
async function resolveEmail(usernameOrEmail: string): Promise<string> {
  const input = usernameOrEmail.trim();
  if (input.includes('@')) return input;

  const snap = await getDocs(
    query(collection(db, USERS_COLLECTION), where('username', '==', input.toLowerCase()))
  );
  if (!snap.empty) {
    const data = snap.docs[0].data() as NewsroomUser;
    if (data.email) return data.email;
  }
  return usernameToFallbackEmail(input);
}

export class NewsroomAuthError extends Error {}

/** Login "Sistem Redaksi": username (atau email) + password. */
export async function signInNewsroom(usernameOrEmail: string, password: string): Promise<void> {
  const email = await resolveEmail(usernameOrEmail);
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err: any) {
    const code = err?.code || '';
    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      code === 'auth/user-not-found' ||
      code === 'auth/invalid-email'
    ) {
      // Pesan sengaja tidak memberi tahu mana yang salah, supaya tidak bisa
      // dipakai menebak username mana yang terdaftar.
      throw new NewsroomAuthError('Username atau password salah.');
    }
    if (code === 'auth/too-many-requests') {
      throw new NewsroomAuthError('Terlalu banyak percobaan gagal. Coba lagi beberapa menit.');
    }
    throw new NewsroomAuthError('Gagal masuk. Periksa koneksi lalu coba lagi.');
  }
}

/**
 * Ambil profil redaksi milik sebuah uid.
 *
 * Email yang terdaftar di ADMIN_EMAILS otomatis dianggap Super Admin meski
 * dokumennya belum ada — ini pintu masuk pertama supaya om bisa login dan
 * membuatkan akun untuk kru lain.
 */
export async function fetchNewsroomUser(
  uid: string,
  email: string | null,
  displayName?: string | null
): Promise<NewsroomUser | null> {
  try {
    const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (snap.exists()) {
      const data = snap.data() as NewsroomUser;
      return { ...data, uid };
    }
  } catch (err) {
    console.error('Gagal membaca profil redaksi:', err);
  }

  if (email && ADMIN_EMAILS.includes(email.toLowerCase())) {
    return {
      uid,
      username: email.split('@')[0],
      email,
      namaLengkap: displayName || 'Super Admin',
      role: 'Super Admin',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
  }

  return null;
}

export async function listNewsroomUsers(): Promise<NewsroomUser[]> {
  const snap = await getDocs(collection(db, USERS_COLLECTION));
  const users: NewsroomUser[] = [];
  snap.forEach((d) => users.push({ ...(d.data() as NewsroomUser), uid: d.id }));
  users.sort((a, b) => (a.namaLengkap || '').localeCompare(b.namaLengkap || ''));
  return users;
}

export interface CreateNewsroomUserInput {
  username: string;
  email?: string;
  password: string;
  namaLengkap: string;
  role: UserRole;
}

/**
 * Buat akun kru baru.
 *
 * Firebase Auth otomatis memindahkan sesi ke akun yang baru dibuat, sehingga
 * Super Admin akan "terlempar" jadi user baru itu. Untuk mencegahnya, akun
 * dibuat lewat instance Firebase kedua yang terpisah, lalu langsung dibuang.
 */
export async function createNewsroomUser(input: CreateNewsroomUserInput): Promise<NewsroomUser> {
  const username = input.username.trim().toLowerCase();
  const email = (input.email?.trim() || usernameToFallbackEmail(username)).toLowerCase();

  if (!username) throw new NewsroomAuthError('Username wajib diisi.');
  if (input.password.length < 6) {
    throw new NewsroomAuthError('Password minimal 6 karakter.');
  }

  const existing = await getDocs(
    query(collection(db, USERS_COLLECTION), where('username', '==', username))
  );
  if (!existing.empty) {
    throw new NewsroomAuthError(`Username "${username}" sudah dipakai.`);
  }

  const secondaryApp = initializeApp(firebaseConfig, `newsroom-signup-${Date.now()}`);
  try {
    const secondaryAuth = getAuth(secondaryApp);
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, input.password);

    const profile: NewsroomUser = {
      uid: cred.user.uid,
      username,
      email,
      namaLengkap: input.namaLengkap.trim() || username,
      role: input.role,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, USERS_COLLECTION, cred.user.uid), profile);
    await secondaryAuth.signOut();
    return profile;
  } catch (err: any) {
    if (err?.code === 'auth/email-already-in-use') {
      throw new NewsroomAuthError(`Email "${email}" sudah terdaftar di Firebase Auth.`);
    }
    if (err?.code === 'auth/weak-password') {
      throw new NewsroomAuthError('Password terlalu lemah. Minimal 6 karakter.');
    }
    if (err instanceof NewsroomAuthError) throw err;
    throw new NewsroomAuthError('Gagal membuat akun: ' + (err?.message || 'kesalahan tidak diketahui'));
  } finally {
    await deleteApp(secondaryApp).catch(() => {});
  }
}

/** Ubah nama/role kru. Password TIDAK diubah dari sini. */
export async function updateNewsroomUser(
  uid: string,
  patch: Partial<Pick<NewsroomUser, 'namaLengkap' | 'role' | 'isActive'>>
): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), patch);
}

/**
 * Nonaktifkan akun (setara "is_deleted" di sistem lama).
 *
 * Catatan: ini mencabut akses lewat aturan Firestore, tapi akun Firebase Auth
 * miliknya masih ada. Untuk mencabut login sepenuhnya, hapus juga user tersebut
 * dari Firebase Console → Authentication.
 */
export async function setNewsroomUserActive(uid: string, isActive: boolean): Promise<void> {
  await updateNewsroomUser(uid, { isActive });
}
