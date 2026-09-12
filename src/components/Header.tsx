import React, { useState } from 'react';
import { Share2, Search, Menu, X, User as UserIcon, PlusCircle, LogOut, BookmarkCheck, Newspaper, Megaphone, Tag, LayoutGrid } from 'lucide-react';
import { CategoryType, NewsroomUser, UserProfile } from '../types';
import { canManageAds, canManageCategories, isNewsroomMember } from '../lib/roles';

interface HeaderProps {
  selectedCategory: CategoryType | 'Semua';
  onSelectCategory: (category: CategoryType | 'Semua') => void;
  onOpenSearch: () => void;
  onOpenAuth: () => void;
  onOpenArticleEditor: () => void;
  onOpenAdManager: () => void;
  onOpenCategoryManager: () => void;
  categories: CategoryType[];
  onGoHome: () => void;
  onOpenBookmarks: () => void;
  user: UserProfile | null;
  /** Profil kru redaksi, kalau yang login memang kru. Menentukan tombol admin. */
  newsroomUser: NewsroomUser | null;
  /** Logo aktif — bisa diganti dari panel redaksi. */
  logoUrl: string;
  onOpenNewsroom: () => void;
  onSignOut: () => void;
  bookmarkCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  selectedCategory,
  onSelectCategory,
  onOpenSearch,
  onOpenAuth,
  onOpenArticleEditor,
  onOpenAdManager,
  onOpenCategoryManager,
  categories,
  onGoHome,
  onOpenBookmarks,
  user,
  newsroomUser,
  logoUrl,
  onOpenNewsroom,
  onSignOut,
  bookmarkCount
}) => {
  // null = tertutup. Bilah bawah punya dua panel: daftar kategori dan menu lain.
  const [mobileSheet, setMobileSheet] = useState<null | 'kategori' | 'lainnya'>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userIsAdmin = isNewsroomMember(newsroomUser);
  const showAdsButton = canManageAds(newsroomUser);
  const showCategoryButton = canManageCategories(newsroomUser);

  const handleShareSite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SekilasUpdate.com - Berita Terupdate & Terpercaya',
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share canceled or error:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Tautan portal berhasil disalin ke papan klip!');
    }
  };

  return (
    <header className="font-sans sticky top-0 z-50 border-b-4 border-[#E30F2A] shadow-md">
      {/* Pita atas: latar putih, logo tampil apa adanya tanpa alas tambahan */}
      <div className="bg-white border-b border-gray-200">
      <div className="flex justify-between items-center h-20 px-4 md:px-6 max-w-7xl mx-auto">
        {/* Logo & Brand */}
        <div 
          className="flex items-center gap-3 cursor-pointer select-none flex-shrink-0"
          onClick={() => {
            onSelectCategory('Semua');
            onGoHome();
          }}
        >
          <img
            src={logoUrl}
            alt="SekilasUpdate.com - Berita Terupdate & Terpercaya"
            className="h-11 sm:h-12 md:h-14 w-auto object-contain hover:scale-105 transition-transform"
          />
        </div>

        {/*
          Actions.
          Di HP seluruh baris ini disembunyikan — bagikan, cari, akun, dan menu
          dipindah ke bilah bawah supaya terjangkau jempol. Di layar besar
          tetap di atas seperti biasa.
        */}
        <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
          {/* Create Article Button (admin only) */}
          {userIsAdmin && (
            <button
              onClick={onOpenArticleEditor}
              className="hidden sm:flex items-center gap-1.5 bg-[#E30F2A] hover:bg-[#B00D22] text-white px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Tambah Berita Baru"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tulis Berita</span>
            </button>
          )}

          {/* Manage Ads Button (Super Admin only) */}
          {showAdsButton && (
            <button
              onClick={onOpenAdManager}
              className="hidden lg:flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-[#141B34] px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer"
              title="Kelola Iklan"
            >
              <Megaphone className="w-4 h-4" />
              <span>Iklan</span>
            </button>
          )}

          {/* Manage Categories Button (Super Admin only) */}
          {showCategoryButton && (
            <button
              onClick={onOpenCategoryManager}
              className="hidden lg:flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-[#141B34] px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer"
              title="Kelola Kategori"
            >
              <Tag className="w-4 h-4" />
              <span>Kategori</span>
            </button>
          )}

          {/* Share */}
          <button
            onClick={handleShareSite}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-[#141B34]/70 hover:text-[#141B34]"
            title="Bagikan Situs"
          >
            <Share2 className="w-5 h-5" />
          </button>

          {/* Search */}
          <button
            onClick={onOpenSearch}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-[#141B34]/70 hover:text-[#141B34]"
            title="Cari Berita"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Auth & User Menu */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1 bg-slate-100 hover:bg-slate-200 rounded-full cursor-pointer transition-all border border-gray-200"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#E30F2A] text-white flex items-center justify-center text-xs font-bold">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white text-gray-800 rounded-lg shadow-xl border border-gray-200 py-2 z-50 text-sm animate-fadeIn">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="font-bold truncate">{user.displayName || 'Pengguna'}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email || 'Google Auth User'}</p>
                  </div>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onOpenBookmarks();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between text-gray-700"
                  >
                    <span className="flex items-center gap-2">
                      <BookmarkCheck className="w-4 h-4 text-[#E30F2A]" />
                      Berita Tersimpan
                    </span>
                    <span className="bg-[#E30F2A]/10 text-[#E30F2A] font-bold text-xs px-2 py-0.5 rounded-full">
                      {bookmarkCount}
                    </span>
                  </button>

                  {userIsAdmin && (
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenNewsroom();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                    >
                      <Newspaper className="w-4 h-4 text-[#141B34]" />
                      Ruang Redaksi
                      <span className="ml-auto text-[10px] text-gray-400 italic">
                        {newsroomUser?.role}
                      </span>
                    </button>
                  )}

                  {userIsAdmin && (
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onOpenArticleEditor();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 sm:hidden"
                    >
                      <PlusCircle className="w-4 h-4 text-emerald-600" />
                      Tulis Berita Baru
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      onSignOut();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 border-t border-gray-100 mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    Keluar (Sign Out)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="bg-[#141B34] hover:bg-[#26325C] text-white px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <UserIcon className="w-4 h-4 text-[#FF6B7D]" />
              <span>Masuk Google</span>
            </button>
          )}

        </div>
      </div>
      </div>

      {/* Pita kategori: navy, jadi penanda visual antara identitas dan navigasi */}
      <div className="bg-[#141B34] text-white">
      {/*
        justify-center + flex-wrap: baris kategori selalu di tengah, dan kalau
        kategori baru ditambah dari panel redaksi, barisnya menata ulang
        sendiri (turun ke baris berikutnya, tetap center) tanpa ubah kode.
      */}
      <nav className="hidden lg:flex flex-wrap justify-center gap-x-6 gap-y-2 items-center px-4 md:px-6 py-2.5 max-w-7xl mx-auto">
        <button
          onClick={() => {
            onSelectCategory('Semua');
            onGoHome();
          }}
          className={`text-sm font-semibold text-white transition-colors duration-200 cursor-pointer active:scale-95 ${
            selectedCategory === 'Semua'
              ? 'border-b-2 border-[#E30F2A] pb-0.5'
              : 'hover:text-[#FF6B7D]'
          }`}
        >
          Beranda
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              onSelectCategory(cat);
              onGoHome();
            }}
            className={`text-sm font-semibold text-white transition-colors duration-200 cursor-pointer active:scale-95 ${
              selectedCategory === cat
                ? 'border-b-2 border-[#E30F2A] pb-0.5'
                : 'hover:text-[#FF6B7D]'
            }`}
          >
            {cat}
          </button>
        ))}
      </nav>
      </div>

      {/*
        ===== Tampilan HP: bilah aksi di bawah layar =====

        Di layar HP besar seperti Samsung seri Ultra, bagian atas layar sulit
        dijangkau jempol tanpa memindahkan genggaman. Aksi yang sering dipakai
        — bagikan, cari, kategori — dipindah ke bawah, di zona jempol.
        Bagian atas cukup memuat logo saja.
      */}

      {/* Panel yang muncul dari bawah, di atas bilah aksi */}
      {mobileSheet !== null && (
        <>
          {/* Lapisan gelap: menutup panel saat disentuh di luar area panel */}
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileSheet(null)}
            aria-hidden="true"
          />

          <div className="lg:hidden fixed left-0 right-0 bottom-[64px] z-40 bg-[#141B34] border-t border-white/15 rounded-t-2xl max-h-[65vh] overflow-y-auto px-4 py-4 space-y-3 shadow-2xl">
            {mobileSheet === 'kategori' && (
              <>
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                  Kategori Berita
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onSelectCategory('Semua');
                      onGoHome();
                      setMobileSheet(null);
                    }}
                    className={`p-2.5 rounded-lg text-left text-sm font-semibold ${
                      selectedCategory === 'Semua' ? 'bg-[#E30F2A] text-white' : 'text-white bg-white/5'
                    }`}
                  >
                    Semua Berita
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        onSelectCategory(cat);
                        onGoHome();
                        setMobileSheet(null);
                      }}
                      className={`p-2.5 rounded-lg text-left text-sm font-semibold ${
                        selectedCategory === cat ? 'bg-[#E30F2A] text-white' : 'text-white bg-white/5'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </>
            )}

            {mobileSheet === 'lainnya' && (
              <>
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                  Lainnya
                </p>

                {/* Akun pembaca */}
                {user ? (
                  <>
                    <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName || 'User'} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#E30F2A] text-white flex items-center justify-center text-sm font-bold">
                          {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{user.displayName || 'Pengguna'}</p>
                        <p className="text-[11px] text-white/60 truncate">{user.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => { setMobileSheet(null); onOpenBookmarks(); }}
                      className="w-full bg-white/10 text-white py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2"
                    >
                      <BookmarkCheck className="w-4 h-4" />
                      Berita Tersimpan ({bookmarkCount})
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setMobileSheet(null); onOpenAuth(); }}
                    className="w-full bg-white/10 text-white py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <UserIcon className="w-4 h-4 text-[#FF6B7D]" />
                    Masuk dengan Google
                  </button>
                )}

                {/* Menu kru redaksi */}
                {userIsAdmin && (
                  <button
                    onClick={() => { setMobileSheet(null); onOpenNewsroom(); }}
                    className="w-full bg-white/10 text-white py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Newspaper className="w-4 h-4" />
                    Ruang Redaksi
                  </button>
                )}

                {userIsAdmin && (
                  <button
                    onClick={() => { setMobileSheet(null); onOpenArticleEditor(); }}
                    className="w-full bg-[#E30F2A] text-white py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Tulis Berita Baru
                  </button>
                )}

                {showAdsButton && (
                  <button
                    onClick={() => { setMobileSheet(null); onOpenAdManager(); }}
                    className="w-full bg-white/10 text-white py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Megaphone className="w-4 h-4" />
                    Kelola Iklan
                  </button>
                )}

                {showCategoryButton && (
                  <button
                    onClick={() => { setMobileSheet(null); onOpenCategoryManager(); }}
                    className="w-full bg-white/10 text-white py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Tag className="w-4 h-4" />
                    Kelola Kategori
                  </button>
                )}

                {user && (
                  <button
                    onClick={() => { setMobileSheet(null); onSignOut(); }}
                    className="w-full border border-white/20 text-white/80 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Keluar
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/*
        Bilah aksi bawah. Tingginya 64px — dipakai juga sebagai acuan posisi
        panel di atas (bottom-[64px]) dan jarak bawah isi halaman di App.tsx.
        pb dari safe-area menjaga tombol tidak tertimpa garis gestur di HP
        layar penuh.
      */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-[#141B34] border-t-2 border-[#E30F2A] flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <BottomAction icon={<Share2 className="w-5 h-5" />} label="Bagikan"
          onClick={() => { setMobileSheet(null); handleShareSite(); }} />

        <BottomAction icon={<Search className="w-5 h-5" />} label="Cari"
          onClick={() => { setMobileSheet(null); onOpenSearch(); }} />

        <BottomAction icon={<LayoutGrid className="w-5 h-5" />} label="Kategori"
          active={mobileSheet === 'kategori'}
          onClick={() => setMobileSheet(mobileSheet === 'kategori' ? null : 'kategori')} />

        <BottomAction icon={mobileSheet === 'lainnya' ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />} label="Lainnya"
          active={mobileSheet === 'lainnya'}
          onClick={() => setMobileSheet(mobileSheet === 'lainnya' ? null : 'lainnya')} />
      </nav>

    </header>
  );
};

/** Satu tombol di bilah aksi bawah: ikon di atas, label kecil di bawahnya. */
const BottomAction: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}> = ({ icon, label, onClick, active = false }) => (
  <button
    onClick={onClick}
    aria-label={label}
    className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:bg-white/10 ${
      active ? 'text-[#E30F2A]' : 'text-white'
    }`}
  >
    {icon}
    <span className="text-[10px] font-bold tracking-wide">{label}</span>
  </button>
);
