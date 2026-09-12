import React, { useEffect, useState } from 'react';
import { ImageIcon, Loader2, Save, RotateCcw } from 'lucide-react';
import { DEFAULT_LOGO_URL, fetchSiteSettings, saveLogoUrl } from '../lib/settings';

/** Panel "Pengaturan Logo" — Super Admin bisa ganti logo tanpa menyentuh kode. */
export const LogoManager: React.FC = () => {
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSiteSettings()
      .then(s => setLogoUrl(s?.logoUrl || ''))
      .finally(() => setLoading(false));
  }, []);

  const save = async (value: string) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await saveLogoUrl(value);
      setLogoUrl(value);
      setNotice(value ? 'Logo berhasil diperbarui.' : 'Kembali memakai logo bawaan.');
    } catch (err) {
      console.error(err);
      setError('Gagal menyimpan logo.');
    } finally {
      setBusy(false);
    }
  };

  const preview = logoUrl.trim() || DEFAULT_LOGO_URL;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-[#E30F2A]/10 text-[#E30F2A] flex items-center justify-center">
          <ImageIcon className="w-4 h-4" />
        </span>
        Pengaturan Logo
      </h3>

      {loading ? (
        <p className="text-xs text-gray-400">Memuat...</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL Logo</label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder={DEFAULT_LOGO_URL}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#141B34] outline-none"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Kosongkan untuk memakai logo bawaan. Pakai PNG latar transparan
              dengan tinggi minimal 200px supaya tajam di layar beresolusi tinggi.
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Pratinjau di Header</p>
            <div className="bg-[#141B34] rounded-lg p-4 flex items-center">
              <img
                src={preview}
                alt="Pratinjau logo"
                className="h-14 w-auto object-contain bg-white px-3 py-1.5 rounded-lg"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_LOGO_URL; }}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}
          {notice && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{notice}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => save(logoUrl)}
              disabled={busy}
              className="bg-[#141B34] hover:bg-[#26325C] text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Logo
            </button>
            <button
              onClick={() => save('')}
              disabled={busy}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center gap-2 disabled:opacity-60"
            >
              <RotateCcw className="w-4 h-4" />
              Pakai Logo Bawaan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
