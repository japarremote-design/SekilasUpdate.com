import React, { useState, useEffect } from 'react';
import { ChevronRight, Calendar, Eye, Heart, Bookmark, BookmarkCheck, ArrowLeft, Clock, Pencil, EyeOff } from 'lucide-react';
import { doc, updateDoc, increment, collection, addDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Article, UserProfile } from '../types';
import { KilatMark } from './KilatMark';
import { ShareButtons } from './ShareButtons';
import { readingMinutes } from '../lib/slug';
import { renderTeks, renderParagraf, pecahDateline } from '../lib/teks';
import { isAdmin } from '../lib/admin';
import { Comments } from './Comments';
import { AdBanner } from './AdBanner';

interface ArticleDetailProps {
  article: Article;
  allArticles: Article[];
  user: UserProfile | null;
  onBack: () => void;
  onSelectArticle: (article: Article) => void;
  /** Membuka halaman kumpulan berita bertag sama. */
  onSelectTag: (tag: string) => void;
  onOpenAuth: () => void;
  onBookmarkChanged: () => void;
  onEdit: (article: Article) => void;
}

export const ArticleDetail: React.FC<ArticleDetailProps> = ({
  article,
  allArticles,
  user,
  onBack,
  onSelectArticle,
  onSelectTag,
  onOpenAuth,
  onBookmarkChanged,
  onEdit
}) => {
  const [likesCount, setLikesCount] = useState(article.likes || 0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkDocId, setBookmarkDocId] = useState<string | null>(null);

  /*
   * Hitung pembaca — sekali per artikel per sesi browser.
   *
   * Sebelumnya setiap kali halaman dibuka menghasilkan satu PENULISAN ke
   * Firestore. Menyegarkan halaman, menekan tombol kembali lalu masuk lagi,
   * atau membuka artikel yang sama dua kali semuanya ikut terhitung dan ikut
   * menagih.
   *
   * Itu penting karena jatah gratis Firestore untuk penulisan (20.000/hari)
   * jauh lebih sempit daripada jatah pembacaan (50.000/hari). Kalau penghitung
   * view menghabiskannya, redaksi jadi tidak bisa menerbitkan berita.
   *
   * sessionStorage dipakai, bukan localStorage: hitungannya kembali nol saat
   * pembaca membuka tab baru esok hari, jadi kunjungan berulang yang wajar
   * tetap tercatat — yang ditekan hanya pengulangan dalam satu sesi.
   */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const kunci = `sekilasupdate-view-${article.id}`;
    let sudahDihitung = false;
    try {
      sudahDihitung = sessionStorage.getItem(kunci) === '1';
    } catch {
      // Mode penyamaran atau penyimpanan diblokir — biarkan terhitung seperti
      // biasa. Lebih baik sedikit berlebih daripada tidak terhitung sama sekali.
    }

    if (sudahDihitung) return;

    updateDoc(doc(db, 'articles', article.id), { views: increment(1) })
      .then(() => {
        try { sessionStorage.setItem(kunci, '1'); } catch { /* diabaikan */ }
      })
      .catch(err => console.error('Error incrementing view count:', err));
  }, [article.id]);

  // Check if article is bookmarked by user
  useEffect(() => {
    if (!user) {
      setIsBookmarked(false);
      setBookmarkDocId(null);
      return;
    }

    const q = query(
      collection(db, 'bookmarks'),
      where('userId', '==', user.uid),
      where('articleId', '==', article.id)
    );

    getDocs(q).then((snapshot) => {
      if (!snapshot.empty) {
        setIsBookmarked(true);
        setBookmarkDocId(snapshot.docs[0].id);
      } else {
        setIsBookmarked(false);
        setBookmarkDocId(null);
      }
    }).catch(err => console.error('Error checking bookmark:', err));
  }, [article.id, user]);

  const handleLike = async () => {
    if (hasLiked) return;
    setLikesCount(prev => prev + 1);
    setHasLiked(true);

    try {
      const articleRef = doc(db, 'articles', article.id);
      await updateDoc(articleRef, {
        likes: increment(1)
      });
    } catch (err) {
      console.error('Error liking article:', err);
    }
  };

  const handleToggleBookmark = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    try {
      if (isBookmarked && bookmarkDocId) {
        await deleteDoc(doc(db, 'bookmarks', bookmarkDocId));
        setIsBookmarked(false);
        setBookmarkDocId(null);
      } else {
        const docRef = await addDoc(collection(db, 'bookmarks'), {
          userId: user.uid,
          articleId: article.id,
          createdAt: new Date().toISOString()
        });
        setIsBookmarked(true);
        setBookmarkDocId(docRef.id);
      }
      onBookmarkChanged();
    } catch (err) {
      console.error('Error toggling bookmark:', err);
    }
  };

  // Alamat yang dibagikan. Diambil dari alamat halaman yang sedang dibuka,
  // jadi otomatis ikut bentuk /berita/{judul}-{id} yang ramah mesin pencari.
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const isArticleActive = article.isActive !== false;

  const handleToggleActive = async () => {
    if (!user || !isAdmin(user.email)) {
      onOpenAuth();
      return;
    }
    try {
      await updateDoc(doc(db, 'articles', article.id), {
        isActive: !isArticleActive,
      });
    } catch (err) {
      console.error('Error toggling article status:', err);
      alert('Gagal mengubah status berita. Coba lagi.');
    }
  };

  /*
   * Structured data NewsArticle.
   *
   * Ini yang dibaca Google untuk menampilkan berita sebagai kartu di hasil
   * pencarian dan sebagai syarat masuk Google News. Disuntikkan lewat efek,
   * bukan ditulis di index.html, karena isinya berbeda tiap artikel.
   */
  useEffect(() => {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: article.title.slice(0, 110),   // Google memotong di 110 karakter
      description: article.excerpt,
      image: article.imageUrl ? [article.imageUrl] : undefined,
      datePublished: article.createdAt,
      dateModified: article.createdAt,
      author: { '@type': 'Person', name: article.author },
      publisher: {
        '@type': 'Organization',
        name: 'SekilasUpdate.com',
        logo: { '@type': 'ImageObject', url: `${window.location.origin}/logo-icon-512.png` },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': window.location.href },
      articleSection: article.category,
      keywords: (article.tags || []).join(', '),
    };

    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.text = JSON.stringify(data);
    document.head.appendChild(el);

    // Judul tab ikut judul berita, penting untuk riwayat & bookmark browser.
    const judulSebelumnya = document.title;
    document.title = `${article.title} - SekilasUpdate.com`;

    return () => {
      el.remove();
      document.title = judulSebelumnya;
    };
  }, [article]);

  const relatedArticles = allArticles
    .filter(a => a.id !== article.id && a.category === article.category)
    .slice(0, 3);

  // Baris tempat hanya dicari di paragraf pertama, bukan di seluruh naskah.
  const paragraf = article.content.split('\n\n');
  const dateline = pecahDateline((paragraf[0] ?? '').trimStart());

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button + Edit/Toggle controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-[#141B34] hover:text-[#E30F2A] bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 rounded-full transition-all cursor-pointer w-fit shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </button>

        {isAdmin(user?.email) && (
          <div className="flex items-center gap-2">
            {!isArticleActive && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                Nonaktif (hanya lo yang bisa lihat)
              </span>
            )}
            <button
              onClick={() => onEdit(article)}
              className="flex items-center gap-1.5 text-xs font-bold text-[#141B34] hover:text-white bg-slate-100 hover:bg-[#141B34] px-3.5 py-1.5 rounded-full transition-all cursor-pointer shadow-xs"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              onClick={handleToggleActive}
              className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full transition-all cursor-pointer shadow-xs ${
                isArticleActive
                  ? 'text-amber-600 hover:text-white bg-amber-50 hover:bg-amber-500'
                  : 'text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-600'
              }`}
            >
              {isArticleActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{isArticleActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#E30F2A]">
        <span className="hover:underline cursor-pointer" onClick={onBack}>BERITA</span>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-bold">{article.category}</span>
      </div>

      {/* Header */}
      <header className="space-y-4">
        <h1 className="font-extrabold text-2xl sm:text-3xl md:text-4xl text-[#141B34] leading-tight font-display tracking-tight">
          {article.title}
        </h1>

        <div className="flex flex-wrap items-center justify-between text-xs text-gray-600 font-mono border-b border-gray-200 pb-3 gap-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 font-semibold text-gray-800">
              {/* Tanda kilat proporsinya tinggi, jadi ukurannya diatur lewat
                  tinggi supaya sejajar dengan tinggi huruf di sebelahnya. */}
              <KilatMark className="h-4 w-auto" /> Oleh: {article.author}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#E30F2A]" /> 
              {new Date(article.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}, {new Date(article.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#141B34]" /> {readingMinutes(article.content)} menit baca
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-amber-600" /> {article.views + 1} Pembaca
            </span>
          </div>
        </div>
      </header>

      {/* Featured Image */}
      <figure className="w-full">
        <div className="relative rounded-xl overflow-hidden shadow-md bg-slate-900">
          <img
            /* Gambar utama artikel: tampil di layar pertama, jadi dimuat
               lebih dulu — bukan ditunda seperti gambar lain di bawahnya. */
            fetchPriority="high"
            decoding="async"
            src={article.imageUrl}
            alt={article.title}
            className="w-full h-auto max-h-[480px] object-cover"
          />
        </div>
        {article.imageCaption && (
          <figcaption className="mt-2 text-xs text-gray-500 font-mono text-right italic">
            {article.imageCaption}
          </figcaption>
        )}
      </figure>

      {/* Article Content */}
      <article className="prose prose-slate max-w-none text-gray-800 text-base md:text-lg leading-relaxed space-y-5 font-sans">
        {paragraf.map((paragraph, index) => {
          // Check for quote formatting
          if (paragraph.startsWith('"') || paragraph.startsWith('“')) {
            return (
              <blockquote key={index} className="border-l-4 border-[#E30F2A] pl-4 my-6 italic text-[#141B34] font-bold text-lg md:text-xl bg-amber-50/50 py-3 rounded-r-lg">
                {renderTeks(paragraph, `q${index}`)}
              </blockquote>
            );
          }
          return (
            <p key={index} className="text-gray-800 leading-relaxed">
              {index === 0 && dateline ? (
                <>
                  <strong className="font-bold text-gray-900">{dateline.kota}</strong>
                  {', '}
                  <strong className="font-bold text-[#E30F2A]">SekilasUpdate.com</strong>
                  {` ${dateline.pisah} `}
                  {renderParagraf(dateline.sisa, `p${index}`)}
                </>
              ) : (
                renderParagraf(paragraph, `p${index}`)
              )}
            </p>
          );
        })}
      </article>

      {/* Tags and Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 border-y border-gray-200 my-8 bg-slate-50 p-4 rounded-xl">
        <div className="flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onSelectTag(tag)}
              className="font-mono text-xs font-semibold text-gray-700 bg-white border border-gray-200 px-3 py-1 rounded-full shadow-2xs hover:border-[#E30F2A] hover:text-[#E30F2A] transition-colors cursor-pointer"
            >
              #{tag}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
              hasLiked 
                ? 'bg-rose-50 text-rose-600 border-rose-200' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-rose-50 hover:text-rose-600'
            }`}
          >
            <Heart className={`w-4 h-4 ${hasLiked ? 'fill-rose-600' : ''}`} />
            <span>{likesCount} Suka</span>
          </button>

          <button
            onClick={handleToggleBookmark}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
              isBookmarked
                ? 'bg-[#E30F2A]/10 text-[#E30F2A] border-[#E30F2A]/30'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-amber-50 hover:text-[#E30F2A]'
            }`}
          >
            {isBookmarked ? <BookmarkCheck className="w-4 h-4 text-[#E30F2A]" /> : <Bookmark className="w-4 h-4" />}
            <span>{isBookmarked ? 'Tersimpan' : 'Simpan'}</span>
          </button>

          <ShareButtons url={shareUrl} title={article.title} />
        </div>
      </div>

      {/* Ad Banner Billboard */}
      <AdBanner type="billboard" />

      {/*
        Iklan kotak TIDAK dipasang di sini — tempatnya di kolom kanan halaman
        artikel, diatur dari App.tsx. Kalau dipasang di sini juga, iklan yang
        sama akan muncul dua kali dalam satu halaman.
      */}

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-lg text-[#141B34] font-display mb-4 border-b-2 border-[#E30F2A] pb-1.5 inline-block">
            Berita Terkait
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {relatedArticles.map((rel) => (
              <div 
                key={rel.id}
                onClick={() => onSelectArticle(rel)}
                className="group cursor-pointer border border-slate-100 p-2.5 rounded-lg hover:shadow-md transition-all bg-slate-50/50"
              >
                <img
            loading="lazy"
            decoding="async" 
                  src={rel.imageUrl} 
                  alt={rel.title}
                  className="w-full h-28 object-cover rounded-md mb-2 bg-slate-200 group-hover:scale-105 transition-transform" 
                />
                <h4 className="font-bold text-xs text-gray-900 group-hover:text-[#141B34] line-clamp-2 leading-snug">
                  {rel.title}
                </h4>
                <span className="text-[10px] text-gray-400 font-mono mt-1 block">
                  {new Date(rel.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Comments Section */}
      <Comments 
        articleId={article.id} 
        user={user} 
        onOpenAuth={onOpenAuth} 
      />
    </div>
  );
};
