import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Ad, AdPosition } from '../types';
import { DEFAULT_LOGO_URL } from '../lib/settings';

interface AdBannerProps {
  type: AdPosition;
  className?: string;
  /**
   * 'stack' — bertumpuk ke bawah, cocok untuk sidebar yang sempit.
   * 'grid'  — berjajar 2–3 kolom, dipakai di halaman artikel yang lebar
   *           supaya banyak iklan tidak jadi satu kolom memanjang.
   */
  layout?: 'stack' | 'grid';
}

const DIMS: Record<AdPosition, { w: number; h: number }> = {
  skyscraper: { w: 120, h: 600 },
  square: { w: 300, h: 250 },
  billboard: { w: 728, h: 90 },
};

export const AdBanner: React.FC<AdBannerProps> = ({ type, className = '', layout = 'stack' }) => {
  const [ads, setAds] = useState<Ad[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'ads'),
      where('position', '==', type),
      where('isActive', '==', true)
    );
    const unsub = onSnapshot(q, (snap) => {
      const now = new Date();
      const active = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Ad))
        .filter(a => !a.expiresAt || new Date(a.expiresAt) >= now)
        .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      setAds(active);
    }, () => setAds([]));
    return () => unsub();
  }, [type]);

  const dims = DIMS[type];

  // No active ads for this slot -> show the generic placeholder
  if (ads.length === 0) {
    return <PlaceholderAd type={type} className={className} />;
  }

  const wrapperClass =
    type === 'skyscraper' ? `sticky top-28 flex flex-col gap-4 ${className}` :
    type === 'billboard' ? `flex flex-col gap-4 my-8 ${className}` :
    layout === 'grid' ? `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}` :
    `flex flex-col gap-4 ${className}`;

  return (
    <div className={wrapperClass}>
      {ads.map(ad => (
        <a
          key={ad.id}
          href={ad.linkUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="block overflow-hidden rounded"
          title={ad.label}
        >
          <img
            loading="lazy"
            decoding="async"
            src={ad.imageUrl}
            alt={ad.label}
            className="w-full object-cover rounded"
            style={{ aspectRatio: `${dims.w}/${dims.h}` }}
          />
        </a>
      ))}
    </div>
  );
};

/**
 * Slot iklan yang belum terisi.
 *
 * Ruang kosong ini dipakai untuk menawarkan dirinya sendiri: logo SekilasUpdate.com
 * yang asli (wordmark lengkap dengan slogannya), kata AVAILABLE, dan ukuran
 * desain yang diminta — supaya calon pemasang langsung tahu harus menyiapkan
 * gambar berukuran berapa.
 *
 * Tiap posisi punya susunan sendiri karena bentuknya jauh berbeda: kotak
 * 300x250, vertikal ramping 120x600, dan melintang 728x90. Tinggi tiap slot
 * dijaga sama dengan iklan aslinya, supaya halaman tidak melompat saat iklan
 * sungguhan masuk menggantikan placeholder ini.
 */

const RANGKA =
  'relative overflow-hidden rounded-lg border border-dashed border-[#E30F2A]/35 ' +
  'bg-linear-to-b from-white to-[#FFF3F4] select-none';

/** Nama format iklan sesuai istilah standar IAB, ditampilkan di placeholder. */
const NAMA: Record<AdPosition, string> = {
  skyscraper: 'Skyscraper',
  square: 'Medium Rectangle',
  billboard: 'Billboard',
};

const PlaceholderAd: React.FC<{ type: AdPosition; className?: string }> = ({ type, className = '' }) => {
  const dims = DIMS[type];
  const ukuran = `${dims.w} × ${dims.h} px`;
  const nama = NAMA[type];

  // Logo dimuat malas: slot ini sering ada beberapa di satu halaman dan
  // bukan bagian yang pertama dilihat pembaca.
  const logo = (kelas: string) => (
    <img
      src={DEFAULT_LOGO_URL}
      alt="SekilasUpdate.com - Berita Terupdate & Terpercaya"
      loading="lazy"
      decoding="async"
      className={kelas}
    />
  );

  // ===== Vertikal 120x600 — hanya selebar 120px, jadi logo diputar tegak
  // supaya bisa tampil besar dan slogannya tetap terbaca.
  if (type === 'skyscraper') {
    return (
      <div
        className={`sticky top-28 ${RANGKA} h-[600px] flex flex-col items-center justify-center gap-8 pb-24 ${className}`}
        aria-label={`Ruang iklan ${ukuran} tersedia`}
      >
        {/*
          Rotasi hanya mengubah tampilan, bukan kotak tata letaknya — logo
          selebar 250px tetap dihitung setinggi ~78px. Tanpa pembungkus
          berukuran tetap ini, AVAILABLE di bawahnya akan tertimpa logo.
        */}
        <div className="h-[230px] w-[72px] flex items-center justify-center">
          {logo('w-[230px] max-w-none h-auto -rotate-90')}
        </div>

        <span
          className="font-extrabold text-[#141B34]/85 text-xl tracking-[0.3em] uppercase"
          style={{ writingMode: 'vertical-rl' }}
        >
          Available
        </span>

        <div className="absolute bottom-5 flex flex-col items-center gap-1">
          <span className="w-8 h-px bg-[#E30F2A]/40 mb-1" />
          <span className="font-mono text-[10px] text-[#141B34]/60">{ukuran}</span>
          <span className="font-mono text-[8px] uppercase tracking-wider text-[#141B34]/40">{nama}</span>
        </div>
      </div>
    );
  }

  // ===== Kotak 300x250 — paling lega, semua unsur ditata di tengah.
  if (type === 'square') {
    return (
      <div
        className={`${RANGKA} h-[300px] flex flex-col items-center justify-center text-center gap-4 p-5 ${className}`}
        aria-label={`Ruang iklan ${ukuran} tersedia`}
      >
        {logo('w-[195px] h-auto')}

        <span className="w-10 h-px bg-[#E30F2A]/40" />

        <span className="font-extrabold text-[#141B34] text-3xl tracking-[0.18em] uppercase leading-none">
          Available
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[11px] text-[#141B34]/60">{ukuran}</span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-[#141B34]/40">{nama}</span>
        </div>
      </div>
    );
  }

  // ===== Melintang 728x90 — logo di kiri, penawaran di kanan, dipisah garis
  // tipis. Di HP garis pemisah disembunyikan supaya tidak berdesakan.
  return (
    <div
      className={`w-full ${RANGKA} h-[90px] sm:h-[110px] my-8 flex items-center justify-center gap-5 sm:gap-8 px-4 ${className}`}
      aria-label={`Ruang iklan ${ukuran} tersedia`}
    >
      {logo('h-10 sm:h-14 w-auto')}

      <span className="hidden sm:block w-px h-12 bg-[#E30F2A]/25" />

      <div className="flex flex-col items-center sm:items-start leading-none gap-1.5">
        <span className="font-extrabold text-[#141B34] text-xl sm:text-3xl tracking-[0.18em] uppercase">
          Available
        </span>
        <span className="font-mono text-[10px] sm:text-[11px] text-[#141B34]/60">
          {ukuran}
          <span className="text-[#141B34]/40"> · {nama}</span>
        </span>
      </div>
    </div>
  );
};
