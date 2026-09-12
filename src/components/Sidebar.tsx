import React from 'react';
import { TrendingUp, BookOpen } from 'lucide-react';
import { Article } from '../types';
import { AdBanner } from './AdBanner';

interface SidebarProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ articles, onSelectArticle }) => {
  // Sort by views / trending for Terpopuler list
  const trendingArticles = [...articles]
    .sort((a, b) => b.views - a.views)
    .slice(0, 4);

  const opinionArticles = articles.filter(a => a.isOpinion || a.category === 'Keislaman');

  return (
    <aside className="w-full space-y-8">
      {/* Ad Square */}
      <AdBanner type="square" />

      {/* Terpopuler List */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
          <TrendingUp className="w-5 h-5 text-[#E30F2A]" />
          <h3 className="font-bold text-lg text-[#141B34] font-display">Terpopuler</h3>
        </div>

        <ul className="flex flex-col gap-4">
          {trendingArticles.map((article) => (
            <li 
              key={article.id}
              onClick={() => onSelectArticle(article)}
              className="flex gap-3 items-start group cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                <img
            loading="lazy"
            decoding="async"
                  src={article.imageUrl}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="flex-grow min-w-0">
                <h4 className="font-bold text-sm text-gray-800 group-hover:text-[#141B34] transition-colors line-clamp-2 leading-snug">
                  {article.title}
                </h4>
                <p className="text-[11px] text-gray-500 font-mono mt-1">
                  {article.views} Pembaca • {article.category}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Opini Section */}
      <div className="bg-slate-50 rounded-xl p-5 border-t-4 border-[#141B34] border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-[#141B34]" />
          <h3 className="font-bold text-lg text-[#141B34] font-display">Opini & Kolom</h3>
        </div>

        <div className="flex flex-col gap-4">
          {opinionArticles.slice(0, 3).map((article, idx) => (
            <article 
              key={article.id}
              onClick={() => onSelectArticle(article)}
              className="group cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-full bg-[#141B34] text-white flex items-center justify-center text-xs font-bold font-mono">
                  {article.opinionAuthor ? article.opinionAuthor.charAt(0) : 'A'}
                </div>
                <div>
                  <span className="font-semibold text-xs text-gray-800 block leading-none">
                    {article.opinionAuthor || article.author}
                  </span>
                  <span className="text-[10px] text-gray-500 block">
                    {article.opinionRole || article.authorRole || 'Penulis Opini'}
                  </span>
                </div>
              </div>
              <h4 className="font-bold text-sm text-gray-900 group-hover:text-[#E30F2A] transition-colors line-clamp-2 leading-snug">
                {article.title}
              </h4>
              {idx < opinionArticles.slice(0, 3).length - 1 && (
                <div className="h-px bg-slate-200 w-full my-3"></div>
              )}
            </article>
          ))}
        </div>
      </div>
    </aside>
  );
};
