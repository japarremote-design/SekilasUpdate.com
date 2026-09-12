import React, { useState } from 'react';
import {
  Newspaper,
  Megaphone,
  Tag,
  Image as ImageIcon,
  Users,
  LayoutList,
  LogOut,
  PlusCircle,
  ArrowLeft,
} from 'lucide-react';
import { Article, Category, NewsroomUser } from '../types';
import { canManageAds, canManageCategories, canManageLogo, canManageUsers } from '../lib/roles';
import { ArticleMonitor } from './ArticleMonitor';
import { UserManager } from './UserManager';
import { LogoManager } from './LogoManager';

type MenuKey = 'berita' | 'monitor' | 'iklan' | 'kategori' | 'logo' | 'user';

interface NewsroomProps {
  currentUser: NewsroomUser;
  articles: Article[];
  categories: Category[];
  onEditArticle: (article: Article) => void;
  onCreateArticle: () => void;
  onOpenAdManager: () => void;
  onOpenCategoryManager: () => void;
  onSignOut: () => void;
  onGoHome: () => void;
}

/**
 * "Ruang Redaksi SekilasUpdate" — dashboard internal dengan menu samping.
 * Menu yang tidak boleh diakses role tertentu tidak dirender sama sekali.
 */
export const Newsroom: React.FC<NewsroomProps> = ({
  currentUser,
  articles,
  categories,
  onEditArticle,
  onCreateArticle,
  onOpenAdManager,
  onOpenCategoryManager,
  onSignOut,
  onGoHome,
}) => {
  const [menu, setMenu] = useState<MenuKey>('monitor');

  const menus: { key: MenuKey; label: string; icon: React.ReactNode; visible: boolean }[] = [
    { key: 'berita', label: 'Tulis Berita', icon: <Newspaper className="w-4 h-4" />, visible: true },
    { key: 'monitor', label: 'Monitor', icon: <LayoutList className="w-4 h-4" />, visible: true },
    { key: 'iklan', label: 'Iklan', icon: <Megaphone className="w-4 h-4" />, visible: canManageAds(currentUser) },
    { key: 'kategori', label: 'Kategori', icon: <Tag className="w-4 h-4" />, visible: canManageCategories(currentUser) },
    { key: 'logo', label: 'Logo', icon: <ImageIcon className="w-4 h-4" />, visible: canManageLogo(currentUser) },
    { key: 'user', label: 'User', icon: <Users className="w-4 h-4" />, visible: canManageUsers(currentUser) },
  ];

  const handleMenu = (key: MenuKey) => {
    // Menu Berita/Iklan/Kategori memakai modal yang sudah ada, bukan panel.
    if (key === 'berita') return onCreateArticle();
    if (key === 'iklan') return onOpenAdManager();
    if (key === 'kategori') return onOpenCategoryManager();
    setMenu(key);
  };

  return (
    <div className="my-6">
      {/* Bar identitas */}
      <div className="bg-[#141B34] text-white rounded-2xl px-5 py-4 flex flex-wrap items-center gap-4 mb-5">
        <div className="flex-grow min-w-0">
          <h1 className="font-extrabold text-lg font-display leading-tight">Ruang Redaksi SekilasUpdate</h1>
          <p className="text-xs text-blue-100">
            {currentUser.namaLengkap} · <span className="italic">{currentUser.role}</span>
          </p>
        </div>

        <button
          onClick={onGoHome}
          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Lihat Situs
        </button>

        <button
          onClick={onSignOut}
          className="flex items-center gap-1.5 bg-[#E30F2A] hover:bg-[#B00D22] px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Keluar
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-5">
        {/* Menu samping */}
        <nav className="md:w-52 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2">
              Menu Redaksi
            </p>
            {menus.filter(m => m.visible).map(m => (
              <button
                key={m.key}
                onClick={() => handleMenu(m.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                  menu === m.key
                    ? 'bg-[#141B34]/10 text-[#141B34]'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>

          <button
            onClick={onCreateArticle}
            className="w-full mt-3 bg-[#E30F2A] hover:bg-[#B00D22] text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Berita Baru
          </button>
        </nav>

        {/* Panel */}
        <div className="flex-grow min-w-0">
          {menu === 'monitor' && (
            <ArticleMonitor
              articles={articles}
              currentUser={currentUser}
              onEdit={onEditArticle}
            />
          )}

          {menu === 'logo' && canManageLogo(currentUser) && <LogoManager />}

          {menu === 'user' && canManageUsers(currentUser) && (
            <UserManager currentUser={currentUser} />
          )}

          {/* Info kecil supaya panel tidak pernah kosong melompong */}
          {menu !== 'monitor' && menu !== 'logo' && menu !== 'user' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm text-gray-500">
                {categories.length} kategori aktif · {articles.length} berita di database.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
