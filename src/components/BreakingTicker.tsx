import React from 'react';
import { Zap } from 'lucide-react';
import { Article } from '../types';

interface BreakingTickerProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
}

/**
 * Running text breaking news, dibawa dari sistem lama.
 *
 * Daftar judul digandakan dua kali lalu digeser sejauh -50%, supaya saat
 * animasi mengulang, salinan kedua sudah berada tepat di posisi awal salinan
 * pertama — perpindahannya jadi mulus tanpa kedipan.
 */
export const BreakingTicker: React.FC<BreakingTickerProps> = ({ articles, onSelectArticle }) => {
  const breaking = articles.filter(a => a.isBreaking).slice(0, 8);
  if (breaking.length === 0) return null;

  const items = [...breaking, ...breaking];

  return (
    <div className="bg-[#E30F2A] text-white overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-stretch">
        <div className="flex items-center gap-1.5 bg-[#141B34] px-3 sm:px-4 py-2 flex-shrink-0 z-10">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span className="text-[11px] font-black uppercase tracking-wider whitespace-nowrap">
            Breaking
          </span>
        </div>

        <div className="relative flex-grow overflow-hidden py-2 group">
          <div className="flex gap-8 whitespace-nowrap animate-ticker group-hover:[animation-play-state:paused] w-max">
            {items.map((article, i) => (
              <button
                key={`${article.id}-${i}`}
                onClick={() => onSelectArticle(article)}
                className="text-xs font-bold hover:underline cursor-pointer flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
                {article.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
