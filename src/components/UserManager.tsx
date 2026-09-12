import React, { useEffect, useState } from 'react';
import { UserPlus, Loader2, Save, RotateCcw, Ban, Users } from 'lucide-react';
import {
  createNewsroomUser,
  listNewsroomUsers,
  setNewsroomUserActive,
  updateNewsroomUser,
  NewsroomAuthError,
} from '../lib/newsroom';
import { NewsroomUser, UserRole, USER_ROLES } from '../types';
import { ROLE_DESCRIPTIONS } from '../lib/roles';

/** Panel "Manajemen User" — hanya dirender untuk Super Admin. */
export const UserManager: React.FC<{ currentUser: NewsroomUser }> = ({ currentUser }) => {
  const [users, setUsers] = useState<NewsroomUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [namaLengkap, setNamaLengkap] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Reporter');

  const refresh = async () => {
    setLoading(true);
    try {
      setUsers(await listNewsroomUsers());
    } catch (err) {
      console.error(err);
      setError('Gagal memuat daftar user.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const resetForm = () => {
    setNamaLengkap('');
    setUsername('');
    setEmail('');
    setPassword('');
    setRole('Reporter');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!namaLengkap.trim() || !username.trim() || !password) {
      setError('Nama lengkap, username, dan password wajib diisi.');
      return;
    }

    setBusy(true);
    try {
      const created = await createNewsroomUser({ namaLengkap, username, email, password, role });
      setNotice(`Akun "${created.username}" (${created.role}) berhasil dibuat.`);
      resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof NewsroomAuthError ? err.message : 'Gagal membuat akun.');
    } finally {
      setBusy(false);
    }
  };

  const handleRoleChange = async (user: NewsroomUser, nextRole: UserRole) => {
    if (user.uid === currentUser.uid && nextRole !== 'Super Admin') {
      setError('Tidak bisa menurunkan role akun sendiri — minta Super Admin lain yang melakukannya.');
      return;
    }
    setError('');
    try {
      await updateNewsroomUser(user.uid, { role: nextRole });
      await refresh();
    } catch (err) {
      console.error(err);
      setError('Gagal mengubah role.');
    }
  };

  const handleToggleActive = async (user: NewsroomUser) => {
    if (user.uid === currentUser.uid) {
      setError('Tidak bisa menonaktifkan akun sendiri.');
      return;
    }
    setError('');
    try {
      await setNewsroomUserActive(user.uid, !user.isActive);
      await refresh();
    } catch (err) {
      console.error(err);
      setError('Gagal mengubah status akun.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Form tambah user */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-[#141B34]/10 text-[#141B34] flex items-center justify-center">
            <UserPlus className="w-4 h-4" />
          </span>
          Tambah Akun Redaksi
        </h3>

        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Lengkap *</label>
            <input
              type="text"
              value={namaLengkap}
              onChange={(e) => setNamaLengkap(e.target.value)}
              placeholder="Budi Santoso"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#141B34] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username *</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="budi"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#141B34] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Email <span className="font-normal normal-case text-gray-400">(opsional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="budi@sekilasupdate.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#141B34] outline-none"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Dikosongkan = dibuatkan otomatis. Isi kalau kru perlu bisa reset password sendiri.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password *</label>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="minimal 6 karakter"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#141B34] outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#141B34] outline-none bg-white"
            >
              {USER_ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">{ROLE_DESCRIPTIONS[role]}</p>
          </div>

          {error && (
            <p className="sm:col-span-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {notice && (
            <p className="sm:col-span-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              {notice}
            </p>
          )}

          <div className="sm:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={busy}
              className="bg-[#141B34] hover:bg-[#26325C] text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {busy ? 'Menyimpan...' : 'Buat Akun'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Daftar user */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b border-gray-100 pb-2 mb-3 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
            <Users className="w-4 h-4 text-gray-600" />
          </span>
          Daftar Kru Redaksi
        </h3>

        {loading ? (
          <p className="text-xs text-gray-400">Memuat list...</p>
        ) : users.length === 0 ? (
          <p className="text-xs text-gray-400">Belum ada data user.</p>
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <div
                key={u.uid}
                className={`flex flex-wrap items-center gap-3 border rounded-lg px-3 py-2.5 ${
                  u.isActive ? 'border-gray-200' : 'border-red-200 bg-red-50/50'
                }`}
              >
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">
                    {u.namaLengkap}
                    {!u.isActive && (
                      <span className="ml-2 text-[10px] font-black text-red-600">[NONAKTIF]</span>
                    )}
                    {u.uid === currentUser.uid && (
                      <span className="ml-2 text-[10px] font-bold text-[#E30F2A]">(Anda)</span>
                    )}
                  </p>
                  <p className="text-[11px] text-gray-500 font-mono truncate">
                    {u.username} · {u.email}
                  </p>
                </div>

                <select
                  value={u.role}
                  onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white"
                >
                  {USER_ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>

                <button
                  onClick={() => handleToggleActive(u)}
                  title={u.isActive ? 'Nonaktifkan akun' : 'Aktifkan lagi'}
                  className={`p-1.5 rounded text-white text-xs ${
                    u.isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'
                  }`}
                >
                  {u.isActive ? <Ban className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
          Menonaktifkan akun mencabut aksesnya ke Ruang Redaksi. Untuk mencabut
          kemampuan login sepenuhnya, hapus juga akunnya di Firebase Console →
          Authentication.
        </p>
      </div>
    </div>
  );
};
