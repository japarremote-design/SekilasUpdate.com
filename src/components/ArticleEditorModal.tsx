import React, { useState, useRef } from 'react';
import { X, Plus, Sparkles, Image as ImageIcon, Upload, Loader2 } from 'lucide-react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SeoPanel } from './SeoPanel';
import {
  Article,
  ArticleStatus,
  ARTICLE_STATUS_LABELS,
  CategoryType,
  NewsroomUser,
} from '../types';
import { allowedStatuses, statusOf } from '../lib/roles';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

interface ArticleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleToEdit?: Article | null;
  onSaved: () => void;
  categories: CategoryType[];
  /** Kru redaksi yang sedang login. Menentukan tahapan mana yang boleh dipilih. */
  currentUser: NewsroomUser | null;
}

export const ArticleEditorModal: React.FC<ArticleEditorModalProps> = ({
  isOpen,
  onClose,
  articleToEdit,
  onSaved,
  categories,
  currentUser
}) => {
  const statusOptions = allowedStatuses(currentUser);
  const [title, setTitle] = useState(articleToEdit?.title || '');
  const [category, setCategory] = useState<CategoryType>(articleToEdit?.category || categories[0] || '');
  const [excerpt, setExcerpt] = useState(articleToEdit?.excerpt || '');
  const [content, setContent] = useState(articleToEdit?.content || '');
  const [imageUrl, setImageUrl] = useState(articleToEdit?.imageUrl || '');
  // Berita baru selalu diatasnamakan redaksi, bukan nama kru yang mengetik.
  // Kolomnya tetap bisa diubah kalau tulisan itu memang perlu byline pribadi.
  const [author, setAuthor] = useState(articleToEdit?.author || 'Redaksi SekilasUpdate.com');
  const [city, setCity] = useState(articleToEdit?.city || '');
  const [kataKunci, setKataKunci] = useState(articleToEdit?.focusKeyphrase || '');
  const [tagsInput, setTagsInput] = useState(articleToEdit?.tags ? articleToEdit.tags.join(', ') : 'Nasional, Berita');
  const [isHero, setIsHero] = useState(articleToEdit?.isHero || false);
  const [isTrending, setIsTrending] = useState(articleToEdit?.isTrending || false);
  const [isOpinion, setIsOpinion] = useState(articleToEdit?.isOpinion || false);
  const [isBreaking, setIsBreaking] = useState(articleToEdit?.isBreaking || false);
  const [isActive, setIsActive] = useState(articleToEdit?.isActive !== false);
  const [status, setStatus] = useState<ArticleStatus>(() => {
    if (articleToEdit) return statusOf(articleToEdit);
    // Berita baru selalu mulai dari Draft, apa pun rolenya.
    return 'Draft';
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('File harus berupa gambar (JPG, PNG, WEBP, dll).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran gambar maksimal 5MB.');
      return;
    }

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      alert('Upload gambar belum dikonfigurasi. Set VITE_CLOUDINARY_CLOUD_NAME dan VITE_CLOUDINARY_UPLOAD_PRESET di environment variables.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'articles');

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }

      const data = await res.json();
      setImageUrl(data.secure_url);
    } catch (err) {
      console.error('Gagal upload gambar:', err);
      alert('Gagal upload gambar. Coba lagi atau pakai URL gambar manual.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSaving(true);
    try {
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const defaultImg = imageUrl.trim() || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80";

      if (articleToEdit) {
        // Edit existing article in Firestore
        const ref = doc(db, 'articles', articleToEdit.id);
        await updateDoc(ref, {
          title: title.trim(),
          category,
          excerpt: excerpt.trim() || title.trim(),
          content: content.trim(),
          imageUrl: defaultImg,
          author: author.trim() || 'Redaksi',
          city: city.trim(),
          focusKeyphrase: kataKunci.trim(),
          tags,
          isHero,
          isTrending,
          isOpinion,
          isBreaking,
          isActive,
          status
        });
      } else {
        // Create new article in Firestore
        const newArt: Omit<Article, 'id'> = {
          title: title.trim(),
          category,
          excerpt: excerpt.trim() || title.slice(0, 120),
          content: content.trim(),
          imageUrl: defaultImg,
          author: author.trim() || 'Redaksi',
          authorUid: currentUser?.uid,
          city: city.trim(),
          focusKeyphrase: kataKunci.trim(),
          createdAt: new Date().toISOString(),
          views: 1,
          likes: 0,
          tags,
          isHero,
          isTrending,
          isOpinion,
          isBreaking,
          isActive,
          status
        };
        await addDoc(collection(db, 'articles'), newArt);
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving article to Firestore:', err);
      alert('Gagal menyimpan artikel. Silakan periksa koneksi atau coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl p-6 relative my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#E30F2A]/10 text-[#E30F2A] rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-[#141B34] font-display">
                {articleToEdit ? 'Edit Berita' : 'Tulis Berita Baru (Real-time Firestore)'}
              </h3>
              <p className="text-xs text-gray-500">
                Data akan tersimpan secara dinamis dan langsung tampil di situs portal.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-grow">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Judul Berita *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Gubernur Resmikan Proyek Infrastruktur..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#141B34] focus:ring-1 focus:ring-[#141B34] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Kata Kunci Fokus
              <span className="font-normal text-gray-400 ml-1">— dipakai panel Skor SEO di bawah</span>
            </label>
            <input
              type="text"
              value={kataKunci}
              onChange={(e) => setKataKunci(e.target.value)}
              placeholder="Contoh: ambulans hibah BRI"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#141B34] focus:ring-1 focus:ring-[#141B34] outline-none"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Satu frasa yang paling mewakili berita ini — kira-kira yang diketik
              orang di Google waktu mencari kabar seperti ini.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Kategori *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryType)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#141B34] outline-none bg-white"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Penulis / Redaksi *</label>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Redaksi SekilasUpdate.com / Budi Santoso"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#141B34] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Kota / Dateline</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="SURABAYA"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#141B34] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Tahapan Alur Kerja Berita
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ArticleStatus)}
                disabled={statusOptions.length === 0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#141B34] outline-none bg-white disabled:bg-gray-100"
              >
                {statusOptions.map(s => (
                  <option key={s} value={s}>{ARTICLE_STATUS_LABELS[s]}</option>
                ))}
              </select>
              {!statusOptions.includes('Published') && (
                <p className="text-[11px] text-gray-500 mt-1">
                  Sebagai {currentUser?.role || 'tamu'}, berita diteruskan ke editor untuk diterbitkan.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Gambar Berita *</label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelected}
              className="hidden"
            />

            <div className="flex gap-2 items-center">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-[#141B34] text-white hover:bg-[#141B34]/90 disabled:opacity-60 transition-colors"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Mengunggah...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Upload dari Perangkat
                  </>
                )}
              </button>
              <span className="text-[11px] text-gray-400">Maks 5MB</span>
            </div>

            <details className="mt-2">
              <summary className="text-[11px] text-gray-500 cursor-pointer select-none">
                Atau pakai URL gambar manual (opsional)
              </summary>
              <div className="relative flex-grow mt-2">
                <ImageIcon className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... atau URL gambar"
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-[#141B34] outline-none"
                />
              </div>
            </details>

            {imageUrl && (
              <div className="mt-2 relative w-full h-32 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Ringkasan / Excerpt</label>
            <textarea
              rows={2}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Ringkasan singkat berita..."
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-[#141B34] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Isi Berita Lengkap *</label>
            <textarea
              required
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tuliskan isi berita selengkapnya di sini..."
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:border-[#141B34] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Tag (dipisahkan koma)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Infrastruktur, Ekonomi, Kebijakan"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#141B34] outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-100">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isHero}
                onChange={(e) => setIsHero(e.target.checked)}
                className="rounded text-[#E30F2A] focus:ring-[#E30F2A]"
              />
              Tampilkan sebagai Headline Utama (Hero)
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isTrending}
                onChange={(e) => setIsTrending(e.target.checked)}
                className="rounded text-[#E30F2A] focus:ring-[#E30F2A]"
              />
              Tampilkan di Terpopuler
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isOpinion}
                onChange={(e) => setIsOpinion(e.target.checked)}
                className="rounded text-[#E30F2A] focus:ring-[#E30F2A]"
              />
              Kategori Opini
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isBreaking}
                onChange={(e) => setIsBreaking(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500"
              />
              Masukkan ke Breaking News (running text)
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              Aktifkan tayang (tampil ke pembaca)
            </label>
          </div>

          {/*
            Panel Skor SEO ditaruh tepat sebelum tombol simpan — di titik itulah
            penulis berhenti mengetik dan memutuskan naskahnya sudah siap atau
            belum, jadi di situ pula peringatannya paling mungkin dibaca.
          */}
          <SeoPanel
            judul={title}
            kataKunci={kataKunci}
            ringkasan={excerpt}
            isi={content}
            urlGambar={imageUrl}
            kota={city}
            tag={tagsInput.split(',').map(t => t.trim()).filter(Boolean)}
          />

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-[#141B34] hover:bg-[#26325C] text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : articleToEdit ? 'Perbarui Berita' : 'Terbitkan Berita'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
