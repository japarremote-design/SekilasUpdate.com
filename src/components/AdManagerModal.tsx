import React, { useState, useEffect } from 'react';
import { X, Plus, Megaphone, Upload, Loader2, Pencil, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Ad, AdPosition } from '../types';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

interface AdManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const POSITION_LABELS: Record<AdPosition, string> = {
  skyscraper: 'Skyscraper Kiri & Kanan (memanjang ke bawah)',
  square: 'Kotak Sidebar (300x250)',
  billboard: 'Banner Bawah Halaman (728x90)',
};

export const AdManagerModal: React.FC<AdManagerModalProps> = ({ isOpen, onClose }) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const q = query(collection(db, 'ads'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setAds(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ad)));
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleActive = async (ad: Ad) => {
    try {
      await updateDoc(doc(db, 'ads', ad.id), { isActive: !ad.isActive });
    } catch (err) {
      console.error('Gagal mengubah status iklan:', err);
      alert('Gagal mengubah status iklan.');
    }
  };

  const isExpired = (ad: Ad) => ad.expiresAt && new Date(ad.expiresAt) < new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-3xl p-6 relative my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#E30F2A]/10 text-[#E30F2A] rounded-lg">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-[#141B34] font-display">
                Kelola Iklan
              </h3>
              <p className="text-xs text-gray-500">
                Ganti banner iklan tanpa perlu edit kode. Perubahan langsung tampil di situs.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {formOpen ? (
          <AdForm
            adToEdit={editingAd}
            onCancel={() => { setFormOpen(false); setEditingAd(null); }}
            onSaved={() => { setFormOpen(false); setEditingAd(null); }}
          />
        ) : (
          <div className="overflow-y-auto pr-1 flex-grow space-y-4">
            <button
              onClick={() => { setEditingAd(null); setFormOpen(true); }}
              className="flex items-center gap-2 bg-[#141B34] hover:bg-[#26325C] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" /> Tambah Iklan Baru
            </button>

            {ads.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">
                Belum ada iklan. Slot iklan di situs masih nampilin placeholder default.
              </p>
            ) : (
              <div className="space-y-3">
                {ads.map(ad => (
                  <div
                    key={ad.id}
                    className="flex gap-3 items-center border border-gray-200 rounded-xl p-3"
                  >
                    <img
                      src={ad.imageUrl}
                      alt={ad.label}
                      className="w-20 h-20 object-cover rounded-lg bg-gray-100 flex-shrink-0"
                    />
                    <div className="flex-grow min-w-0">
                      <p className="font-bold text-sm text-[#141B34] truncate">{ad.label}</p>
                      <p className="text-[11px] text-gray-500">{POSITION_LABELS[ad.position]}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          !ad.isActive
                            ? 'bg-gray-100 text-gray-500'
                            : isExpired(ad)
                              ? 'bg-red-100 text-red-600'
                              : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {!ad.isActive ? 'Nonaktif' : isExpired(ad) ? 'Kadaluarsa' : 'Aktif Tayang'}
                        </span>
                        {ad.expiresAt && (
                          <span className="text-[10px] text-gray-400">s/d {ad.expiresAt}</span>
                        )}
                        <a
                          href={ad.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5"
                        >
                          <ExternalLink className="w-3 h-3" /> link
                        </a>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => { setEditingAd(ad); setFormOpen(true); }}
                        className="p-1.5 rounded-full bg-slate-100 hover:bg-[#141B34] hover:text-white transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(ad)}
                        className={`p-1.5 rounded-full transition-colors ${
                          ad.isActive
                            ? 'bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                        }`}
                        title={ad.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        {ad.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Inline add/edit form ---

interface AdFormProps {
  adToEdit: Ad | null;
  onCancel: () => void;
  onSaved: () => void;
}

const AdForm: React.FC<AdFormProps> = ({ adToEdit, onCancel, onSaved }) => {
  const [position, setPosition] = useState<AdPosition>(adToEdit?.position || 'skyscraper');
  const [label, setLabel] = useState(adToEdit?.label || '');
  const [imageUrl, setImageUrl] = useState(adToEdit?.imageUrl || '');
  const [linkUrl, setLinkUrl] = useState(adToEdit?.linkUrl || '');
  const [expiresAt, setExpiresAt] = useState(adToEdit?.expiresAt || '');
  const [isActive, setIsActive] = useState(adToEdit?.isActive ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('File harus berupa gambar.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran gambar maksimal 5MB.');
      return;
    }
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      alert('Upload gambar belum dikonfigurasi (Cloudinary env var belum diisi).');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'ads');

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setImageUrl(data.secure_url);
    } catch (err) {
      console.error('Gagal upload banner:', err);
      alert('Gagal upload gambar. Coba lagi.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !imageUrl.trim() || !linkUrl.trim()) return;

    setIsSaving(true);
    try {
      const payload = {
        position,
        label: label.trim(),
        imageUrl: imageUrl.trim(),
        linkUrl: linkUrl.trim(),
        expiresAt: expiresAt || '',
        isActive,
      };

      if (adToEdit) {
        await updateDoc(doc(db, 'ads', adToEdit.id), payload);
      } else {
        await addDoc(collection(db, 'ads'), {
          ...payload,
          createdAt: new Date().toISOString(),
        });
      }
      onSaved();
    } catch (err) {
      console.error('Gagal menyimpan iklan:', err);
      alert('Gagal menyimpan iklan. Coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-grow">
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">Nama Sponsor / Label *</label>
        <input
          type="text"
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Contoh: Toko Baju Sejahtera"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#141B34] outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">Posisi Slot Iklan *</label>
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value as AdPosition)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#141B34] outline-none bg-white"
        >
          {(Object.keys(POSITION_LABELS) as AdPosition[]).map(p => (
            <option key={p} value={p}>{POSITION_LABELS[p]}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">Gambar Banner *</label>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />
        <div className="flex gap-2 items-center">
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-[#141B34] text-white hover:bg-[#141B34]/90 disabled:opacity-60"
          >
            {isUploading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Mengunggah...</>) : (<><Upload className="w-4 h-4" /> Upload Banner</>)}
          </button>
          <span className="text-[11px] text-gray-400">Maks 5MB</span>
        </div>
        {imageUrl && (
          <div className="mt-2 w-full h-28 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
            <img src={imageUrl} alt="Preview banner" className="w-full h-full object-contain" />
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">Link Tujuan (saat banner diklik) *</label>
        <input
          type="url"
          required
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://tokosponsor.com"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#141B34] outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Tayang Sampai Tanggal (opsional)</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#141B34] outline-none"
          />
          <p className="text-[10px] text-gray-400 mt-1">Kosongkan kalau gak ada tanggal expired.</p>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded text-[#E30F2A] focus:ring-[#E30F2A]"
            />
            Aktifkan tayang sekarang
          </label>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="bg-[#141B34] hover:bg-[#26325C] text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-50 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{isSaving ? 'Menyimpan...' : adToEdit ? 'Perbarui Iklan' : 'Simpan Iklan'}</span>
        </button>
      </div>
    </form>
  );
};
