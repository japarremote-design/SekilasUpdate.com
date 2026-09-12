import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ExternalLink, Facebook, Instagram, Twitter } from 'lucide-react';
import { CategoryType } from '../types';
import { STATIC_PAGE_SLUGS, STATIC_PAGE_LABELS } from '../lib/staticPages';

/**
 * Akun media sosial & email redaksi SekilasUpdate.com.
 * Ganti tautannya di sini kalau nanti akunnya pindah.
 */
const SOCIAL_LINKS = [
  { label: 'Facebook', href: 'https://facebook.com/sekilasupdate', Icon: Facebook },
  { label: 'Instagram', href: 'https://instagram.com/sekilasupdate', Icon: Instagram },
  { label: 'Twitter / X', href: 'https://twitter.com/sekilasupdate', Icon: Twitter },
];

const CONTACT_EMAIL = 'redaksi@sekilasupdate.com';

interface FooterProps {
  categories: CategoryType[];
  onSelectCategory: (category: CategoryType | 'Semua') => void;
  onGoHome: () => void;
}

export const Footer: React.FC<FooterProps> = ({ categories, onSelectCategory, onGoHome }) => {
  const navigate = useNavigate();
  return (
    <footer className="bg-[#1e1e1e] text-gray-300 font-sans w-full mt-16 border-t border-gray-800">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 md:px-6 py-10 max-w-7xl mx-auto text-xs md:text-sm">
        {/* Brand & Description */}
        <div className="flex flex-col gap-3">
          {/*
            Versi terbalik dari wordmark. Footer berlatar hampir hitam, jadi
            berkas berwarna gelap yang dipakai header tidak terbaca di sini.
            Sengaja berkas tetap, bukan logo dari panel redaksi: logo unggahan
            om belum tentu punya versi terangnya.
          */}
          <img
            src="/logo-wordmark-putih.png"
            alt="SekilasUpdate.com - Berita Terupdate & Terpercaya"
            className="h-10 w-auto object-contain self-start"
          />
          <p className="text-gray-400 leading-relaxed">
            SekilasUpdate.com menyajikan berita terupdate dan terpercaya, tajam
            dan mendalam, seputar politik, daerah, ekonomi, dan pendidikan —
            disajikan real-time, langsung dari lapangan.
          </p>
          <p className="mt-auto text-gray-500 font-mono text-[11px] pt-4">
            © 2026 SekilasUpdate.com. All Rights Reserved.
            <br />
            Powered by{' '}
            <a
              href="https://qfazdigital.my.id/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-[#E30F2A] underline underline-offset-2 transition-colors"
            >
              QFAZ Digital
            </a>
          </p>
        </div>

        {/* Category Links */}
        <div className="flex flex-col gap-2">
          <h4 className="font-bold text-white text-sm mb-2 uppercase tracking-wider font-display">
            Kategori Berita
          </h4>
          <div className="grid grid-cols-2 gap-2 text-gray-400">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  onSelectCategory(cat as CategoryType);
                  onGoHome();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-left hover:text-[#E30F2A] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ExternalLink className="w-3 h-3 text-gray-600" />
                <span>{cat}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Links & Contact */}
        <div className="flex flex-col gap-3">
          <h4 className="font-bold text-white text-sm mb-1 uppercase tracking-wider font-display">
            Ikuti Kami & Kebijakan
          </h4>
          <div className="flex gap-3 mb-2">
            {SOCIAL_LINKS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title={label}
                aria-label={label}
                className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#E30F2A] transition-colors text-white"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              title="Email Redaksi"
              aria-label="Email Redaksi"
              className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#E30F2A] transition-colors text-white"
            >
              <Mail className="w-4 h-4" />
            </a>
          </div>
          <div className="flex flex-wrap gap-4 text-gray-400 text-xs">
            {STATIC_PAGE_SLUGS.map((slug) => (
              <button
                key={slug}
                onClick={() => {
                  navigate(`/halaman/${slug}`);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="hover:text-white transition-colors underline-offset-4 hover:underline cursor-pointer"
              >
                {STATIC_PAGE_LABELS[slug]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
