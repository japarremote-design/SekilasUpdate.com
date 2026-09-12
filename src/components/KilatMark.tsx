import React, { useId } from 'react';

/**
 * Tanda kilat SekilasUpdate.com — kilat yang didahului dua palang gerak, sama
 * seperti yang duduk di depan wordmark pada logo.
 *
 * Digambar sebagai SVG, bukan potongan gambar, supaya tetap tajam saat dipakai
 * sekecil 14px dan warnanya bisa mengikuti gradasi asli logo (#F5A524 di ujung
 * atas, #E30F2A di ujung bawah).
 *
 * Kilatnya satu bentuk tertutup, bukan gabungan beberapa potongan: dengan
 * begitu tepinya tidak menyisakan garis rambut saat browser menskalakannya ke
 * ukuran ganjil. Batang tengahnya sengaja dibuat tebal — kilat yang ramping
 * berubah jadi coretan tak terbaca begitu tingginya di bawah 16px.
 *
 * Perhatikan proporsinya tinggi, bukan lebar seperti tanda gelombang yang dulu
 * dipakai. Aturlah ukurannya lewat tinggi (`h-4 w-auto`), bukan lewat lebar.
 */
export const KilatMark: React.FC<{ className?: string; title?: string }> = ({
  className = 'h-4 w-auto',
  title,
}) => {
  // id gradasi harus unik per instance, kalau tidak ikon kedua di halaman yang
  // sama akan ikut memakai gradasi milik yang pertama.
  const gradientId = useId();

  return (
    <svg
      viewBox="0 0 80 100"
      className={className}
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor="#F5A524" />
          <stop offset="55%" stopColor="#F5522C" />
          <stop offset="100%" stopColor="#E30F2A" />
        </linearGradient>
      </defs>

      {/* Palang gerak. Yang bawah dibedakan lewat warna solid yang lebih pucat,
          bukan lewat opacity — amber tembus pandang berubah keruh di atas latar
          gelap, sedangkan tanda ini juga dipakai di bilah navigasi indigo. */}
      <rect x="4" y="36" width="19" height="8" rx="4" fill="#F5A524" />
      <rect x="10" y="51.5" width="13" height="8" rx="4" fill="#FBC77A" />

      <path d="M62.5 6 L26 55.5 L47.5 55.5 L39 94 L76.5 43 L54.5 43 Z" fill={`url(#${gradientId})`} />
    </svg>
  );
};
