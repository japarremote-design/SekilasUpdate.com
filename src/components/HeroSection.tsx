import React from 'react';
import { Eye, Heart, Clock, ChevronRight } from 'lucide-react';
import { Article } from '../types';

interface HeroSectionProps {
  article: Article;
  onSelectArticle: (article: Article) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ article, onSelectArticle }) => {
  return (
    <section className="mb-10">
      <div 
        onClick={() => onSelectArticle(article)}
        className="relative group cursor-pointer overflow-hidden rounded-xl bg-slate-900 border border-slate-200/80 shadow-md hover:shadow-xl transition-all duration-300"
      >
        <div className="relative h-[380px] sm:h-[440px] w-full overflow-hidden">
          <img 
            src={article.imageUrl} 
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent"></div>
        </div>

        <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full text-white space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-block bg-[#E30F2A] text-white font-mono text-xs font-bold px-3 py-1 rounded tracking-wider uppercase shadow-sm">
              Headline {article.category}
            </span>
            <span className="text-xs text-gray-300 flex items-center gap-1 font-mono">
              <Clock className="w-3.5 h-3.5" />
              {new Date(article.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          <h1 className="font-extrabold text-2xl sm:text-3xl md:text-4xl text-white leading-tight font-display tracking-tight group-hover:text-amber-300 transition-colors">
            {article.title}
          </h1>

          <p className="text-gray-200 text-sm sm:text-base line-clamp-2 max-w-4xl font-normal leading-relaxed">
            {article.excerpt}
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-gray-300 font-medium">
            <div className="flex items-center gap-4">
              <span>Oleh: <strong className="text-white">{article.author}</strong></span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-amber-400" /> {article.views} Pembaca
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/20" /> {article.likes} Suka
              </span>
            </div>

            <span className="hidden sm:flex items-center gap-1 text-[#E30F2A] font-bold group-hover:translate-x-1 transition-transform">
              Baca Selengkapnya <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
