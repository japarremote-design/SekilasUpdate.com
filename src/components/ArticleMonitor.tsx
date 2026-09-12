import React, { useState } from 'react';
import { Pencil, X as XIcon, RotateCcw, FolderOpen } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Article, ArticleStatus, ARTICLE_STATUSES, NewsroomUser } from '../types';
import {
  canDeleteArticle,
  canEditArticle,
  canRestoreArticle,
  statusBadgeClass,
  statusOf,
} from '../lib/roles';

interface ArticleMonitorProps {
  articles: Article[];
  currentUser: NewsroomUser;
  onEdit: (article: Article) => void;
}

/**
 * "Monitor Status Artikel" — daftar semua berita beserta tahapannya, dengan
 * tombol aksi yang muncul sesuai role. Penghapusan bersifat lunak
 * (isActive=false), sama seperti flag is_deleted di sistem lama,
 * jadi Super Admin masih bisa memulihkannya.
 */
export const ArticleMonitor: React.FC<ArticleMonitorProps> = ({ articles, currentUser, onEdit }) => {
  const [filter, setFilter] = useState<ArticleStatus | 'Semua'>('Semua');
  const [busyId, setBusyId] = useState<string | null>(null);

  const shown = articles.filter(a => filter === 'Semua' || statusOf(a) === filter);

  const counts = ARTICLE_STATUSES.map(s => ({
    status: s,
    total: articles.filter(a => statusOf(a) === s).length,
  }));

  const setActive = async (article: Article, isActive: boolean) => {
    setBusyId(article.id);
    try {
      await updateDoc(doc(db, 'articles', article.id), { isActive });
    } catch (err) {
      console.error('Gagal mengubah status artikel:', err);
      alert('Gagal mengubah status artikel. Periksa koneksi lalu coba lagi.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Ringkasan tahapan */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b border-gray-100 pb-2 mb-4">
          Tahapan Alur Kerja Berita
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {counts.map(({ status, total }) => (
            <button
              key={status}
              onClick={() => setFilter(filter === status ? 'Semua' : status)}
              className={`text-left rounded-xl border px-4 py-3 transition-colors cursor-pointer ${
                filter === status
                  ? 'border-[#141B34] bg-[#141B34]/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="text-2xl font-black text-[#141B34] leading-none">{total}</p>
              <p className="text-xs font-bold text-gray-600 mt-1">{status}</p>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 mt-3">
          Draft → Ready for Editor → Published. Reporter menulis dan mengajukan,
          Redaktur/Editor yang menerbitkan.
          {filter !== 'Semua' && (
            <button
              onClick={() => setFilter('Semua')}
              className="ml-2 text-[#E30F2A] font-bold hover:underline cursor-pointer"
            >
              Tampilkan semua
            </button>
          )}
        </p>
      </div>

      {/* Daftar artikel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider border-b border-gray-100 pb-2 mb-3 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
            <FolderOpen className="w-4 h-4 text-gray-600" />
          </span>
          Monitor Status Artikel
        </h3>

        {shown.length === 0 ? (
          <p className="text-xs text-gray-400">Belum ada berita di tahapan ini.</p>
        ) : (
          <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
            {shown.map(article => {
              const status = statusOf(article);
              const isDeleted = article.isActive === false;
              const mayEdit = canEditArticle(currentUser, article);
              const mayDelete = canDeleteArticle(currentUser, article);
              const mayRestore = canRestoreArticle(currentUser);

              return (
                <div
                  key={article.id}
                  className="flex flex-wrap items-center gap-3 border border-gray-200 rounded-lg px-3 py-2.5"
                >
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-bold text-gray-800 line-clamp-1">
                      {isDeleted && <span className="text-red-600 font-black mr-1">[TERHAPUS]</span>}
                      {article.title}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {article.category} · {article.author}
                      {article.city ? ` · ${article.city}` : ''}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${statusBadgeClass(status)}`}
                  >
                    {status}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {mayEdit && (
                      <button
                        onClick={() => onEdit(article)}
                        title="Edit"
                        className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isDeleted
                      ? mayRestore && (
                          <button
                            onClick={() => setActive(article, true)}
                            disabled={busyId === article.id}
                            title="Aktifkan lagi"
                            className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )
                      : mayDelete && (
                          <button
                            onClick={() => setActive(article, false)}
                            disabled={busyId === article.id}
                            title="Hapus (bisa dipulihkan)"
                            className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded disabled:opacity-50"
                          >
                            <XIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
