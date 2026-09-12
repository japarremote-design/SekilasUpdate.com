import React, { useState } from 'react';
import { X, LogIn, CheckCircle2, Bookmark, ShieldCheck, User } from 'lucide-react';
import { googleProvider, auth, signInWithPopup, signInAnonymously } from '../lib/firebase';
import { UserProfile, Article } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  bookmarkedArticles: Article[];
  onSelectArticle: (article: Article) => void;
  onSignOut: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  bookmarkedArticles,
  onSelectArticle,
  onSignOut
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        setErrorMessage('Popup login terblokir oleh peramban. Mencoba login cepat...');
      } else {
        setErrorMessage('Gagal masuk dengan Google: ' + (err.message || 'Silakan coba lagi.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      await signInAnonymously(auth);
      onClose();
    } catch (err: any) {
      console.error('Demo login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md p-6 relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {user ? (
          /* User Profile & Bookmarks View */
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              {user.photoURL ? (
                <img
            loading="lazy"
            decoding="async" src={user.photoURL} alt={user.displayName || 'User'} className="w-12 h-12 rounded-full object-cover border-2 border-[#E30F2A]" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#141B34] text-white flex items-center justify-center font-bold text-lg">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div>
                <h3 className="font-bold text-base text-gray-900">{user.displayName || 'Pengguna'}</h3>
                <p className="text-xs text-gray-500">{user.email || 'Akses Google Terverifikasi'}</p>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded mt-1">
                  <ShieldCheck className="w-3 h-3" /> Terautentikasi Real-time
                </span>
              </div>
            </div>

            {/* Saved Bookmarks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-sm text-[#141B34] flex items-center gap-1.5">
                  <Bookmark className="w-4 h-4 text-[#E30F2A]" />
                  Berita Tersimpan ({bookmarkedArticles.length})
                </h4>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {bookmarkedArticles.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-4 text-center bg-gray-50 rounded-lg">
                    Belum ada berita tersimpan. Klik tombol 'Simpan' pada artikel berita untuk membacanya nanti.
                  </p>
                ) : (
                  bookmarkedArticles.map((art) => (
                    <div
                      key={art.id}
                      onClick={() => {
                        onSelectArticle(art);
                        onClose();
                      }}
                      className="flex gap-2.5 p-2 rounded-lg hover:bg-amber-50 cursor-pointer border border-gray-100 transition-colors"
                    >
                      <img
            loading="lazy"
            decoding="async" src={art.imageUrl} alt={art.title} className="w-12 h-12 rounded object-cover flex-shrink-0" />
                      <div className="flex-grow min-w-0">
                        <h5 className="font-bold text-xs text-gray-800 truncate">{art.title}</h5>
                        <p className="text-[10px] text-gray-500">{art.category}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
              <button
                onClick={onSignOut}
                className="text-xs text-red-600 font-bold hover:underline"
              >
                Keluar Akun
              </button>

              <button
                onClick={onClose}
                className="bg-[#141B34] text-white px-4 py-1.5 rounded-lg text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          /* Login Form */
          <div className="text-center space-y-5">
            <div className="w-12 h-12 bg-[#141B34]/10 text-[#141B34] rounded-full flex items-center justify-center mx-auto">
              <LogIn className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-extrabold text-xl text-[#141B34] font-display">
                Masuk ke SekilasUpdate.com
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                Akses fitur simpan berita favorit, beri komentar, dan tulis berita langsung ke database Firestore real-time.
              </p>
            </div>

            {errorMessage && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-2.5 rounded-lg text-left">
                {errorMessage}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-3 text-sm cursor-pointer disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isLoading ? 'Memproses...' : 'Lanjutkan dengan Google'}</span>
              </button>

              <button
                onClick={handleDemoLogin}
                disabled={isLoading}
                className="w-full bg-[#141B34] hover:bg-[#26325C] text-white font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all text-xs cursor-pointer"
              >
                Akses Cepat (Akses Tamu)
              </button>
            </div>

            <div className="pt-2 text-[10px] text-gray-400 space-y-1">
              <p>Autentikasi terenkripsi & aman dengan Firebase Auth.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
