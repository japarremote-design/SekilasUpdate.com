import React, { useEffect, useState } from 'react';
import { ArrowLeft, Pencil, Loader2, Save, X } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PageContent, UserProfile } from '../types';
import { isAdmin } from '../lib/admin';
import {
  StaticPageSlug,
  STATIC_PAGE_LABELS,
  STATIC_PAGE_DEFAULT_CONTENT,
} from '../lib/staticPages';

interface StaticPageViewProps {
  slug: StaticPageSlug;
  user: UserProfile | null;
  onBack: () => void;
}

export const StaticPageView: React.FC<StaticPageViewProps> = ({ slug, user, onBack }) => {
  const [page, setPage] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const label = STATIC_PAGE_LABELS[slug];
  const userIsAdmin = isAdmin(user?.email);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(doc(db, 'pages', slug), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as PageContent;
        setPage(data);
        setTitleInput(data.title);
        setContentInput(data.content);
      } else {
        setPage(null);
        setTitleInput(label);
        setContentInput('');
      }
      setLoading(false);
    });
    return () => unsub();
  }, [slug, label]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'pages', slug), {
        slug,
        title: titleInput.trim() || label,
        content: contentInput.trim(),
        updatedAt: new Date().toISOString(),
      });
      setEditing(false);
    } catch (err) {
      console.error('Gagal menyimpan halaman:', err);
      alert('Gagal menyimpan halaman. Coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const displayTitle = page?.title || label;
  const displayContent = page?.content?.trim() || STATIC_PAGE_DEFAULT_CONTENT[slug];

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-[#141B34] hover:text-[#E30F2A] bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 rounded-full transition-all cursor-pointer w-fit shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </button>

        {userIsAdmin && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#141B34] hover:text-white bg-slate-100 hover:bg-[#141B34] px-3.5 py-1.5 rounded-full transition-all cursor-pointer shadow-xs"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Halaman</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#141B34] border-t-[#E30F2A] rounded-full animate-spin" />
        </div>
      ) : editing ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Judul Halaman</label>
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#141B34] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Isi Konten</label>
            <textarea
              value={contentInput}
              onChange={(e) => setContentInput(e.target.value)}
              rows={12}
              placeholder="Tulis isi halaman di sini. Pisahkan paragraf dengan baris kosong."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#141B34] outline-none resize-y"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={() => {
                setEditing(false);
                setTitleInput(page?.title || label);
                setContentInput(page?.content || '');
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> Batal
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#141B34] hover:bg-[#26325C] text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 disabled:opacity-50 shadow-sm"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#141B34] font-display mb-6">
            {displayTitle}
          </h1>
          <div className="text-gray-700 leading-relaxed space-y-4 text-sm md:text-base">
            {displayContent.split(/\n\s*\n/).map((para, i) => (
              <p key={i} className="whitespace-pre-line">{para}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
