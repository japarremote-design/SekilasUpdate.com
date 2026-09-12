import React, { useState } from 'react';
import { Search, X, Calendar, Eye, ChevronRight } from 'lucide-react';
import { Article } from '../types';

interface SearchOverlayProps {
  /** true selagi kumpulan berita untuk pencarian sedang diambil. */
  isLoading?: boolean;
  /**
   * true kalau arsipnya sudah menyentuh batas yang diambil, jadi hasil
   * pencarian belum tentu lengkap — dan pembaca berhak tahu itu.
   */
  isCapped?: boolean;
  isOpen: boolean;
  onClose: () => void;
  articles: Article[];
  onSelectArticle: (article: Article) => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isLoading = false,
  isCapped = false,
  isOpen,
  onClose,
  articles,
  onSelectArticle
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const filteredArticles = query.trim() === ''
    ? []
    : articles.filter(a => 
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.category.toLowerCase().includes(query.toLowerCase()) ||
        a.excerpt.toLowerCase().includes(query.toLowerCase()) ||
        a.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
      );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Header */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-slate-50">
          <Search className="w-5 h-5 text-[#141B34] flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari berita, topik (misal: Politik, Ekonomi, Pendidikan)..."
            className="w-full bg-transparent text-sm sm:text-base text-gray-900 outline-none font-medium placeholder-gray-400"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 bg-gray-200 rounded"
            >
              Reset
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Results */}
        <div className="p-4 overflow-y-auto flex-grow space-y-3">
          {query.trim() === '' ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-sm text-gray-500 font-medium">
                {isLoading
                  ? 'Menyiapkan arsip berita...'
                  : `Ketikkan kata kunci untuk mencari ${articles.length} berita.`}
              </p>
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                {['Nasional', 'Politik', 'Ekonomi', 'Daerah', 'Pendidikan'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="text-xs bg-slate-100 hover:bg-[#E30F2A] hover:text-white text-gray-700 px-3 py-1 rounded-full transition-colors cursor-pointer"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm space-y-2">
              <p>
                Tidak ditemukan berita dengan kata kunci "<strong className="text-gray-800">{query}</strong>".
              </p>
              {isCapped && (
                /* Jujur pada pembaca: pencarian menjangkau arsip terbaru saja,
                   jadi hasil kosong belum tentu berarti beritanya tidak ada. */
                <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                  Pencarian mencakup {articles.length} berita terbaru. Berita yang lebih lama
                  dari itu belum ikut tercari.
                </p>
              )}
            </div>
          ) : (
            filteredArticles.map((art) => (
              <div
                key={art.id}
                onClick={() => {
                  onSelectArticle(art);
                  onClose();
                }}
                className="flex gap-3.5 p-3 rounded-xl hover:bg-amber-50/60 border border-slate-100 transition-all cursor-pointer group"
              >
                <img
            loading="lazy"
            decoding="async" 
                  src={art.imageUrl} 
                  alt={art.title} 
                  className="w-20 h-20 rounded-lg object-cover flex-shrink-0 bg-slate-200" 
                />
                <div className="flex-grow min-w-0">
                  <span className="text-[10px] font-bold uppercase text-[#E30F2A] bg-amber-100 px-2 py-0.5 rounded inline-block mb-1">
                    {art.category}
                  </span>
                  <h4 className="font-bold text-sm text-gray-900 group-hover:text-[#141B34] line-clamp-2 leading-snug">
                    {art.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-gray-400 font-mono mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(art.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3 text-amber-600" /> {art.views}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#E30F2A] self-center flex-shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
