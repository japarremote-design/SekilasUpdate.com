import React, { useState } from 'react';
import { LogIn, Loader2, ShieldCheck } from 'lucide-react';
import { signInNewsroom, NewsroomAuthError } from '../lib/newsroom';

interface NewsroomLoginProps {
  onSignedIn: () => void;
}

/**
 * "Login Sistem Redaksi" — tampilannya mengikuti sistem lama, tapi
 * verifikasi password dilakukan Firebase Auth, bukan dicocokkan di browser.
 */
export const NewsroomLogin: React.FC<NewsroomLoginProps> = ({ onSignedIn }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }

    setBusy(true);
    try {
      await signInNewsroom(username, password);
      onSignedIn();
    } catch (err) {
      setError(err instanceof NewsroomAuthError ? err.message : 'Gagal masuk. Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7">
        <div className="flex items-center gap-3 pb-4 mb-5 border-b border-gray-100">
          <div className="w-11 h-11 rounded-xl bg-[#141B34] text-white flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-lg text-[#141B34] font-display leading-tight">
              Login Sistem Redaksi
            </h2>
            <p className="text-xs text-gray-500">Ruang Redaksi SekilasUpdate.com</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username redaksi"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#141B34] focus:ring-1 focus:ring-[#141B34] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#141B34] focus:ring-1 focus:ring-[#141B34] outline-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-[#141B34] hover:bg-[#26325C] text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {busy ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>

        <p className="text-[11px] text-gray-400 mt-5 leading-relaxed">
          Akun redaksi dibuatkan oleh Super Admin. Kalau lupa password, minta
          Super Admin mengirim tautan atur ulang lewat Firebase Console.
        </p>
      </div>
    </div>
  );
};
