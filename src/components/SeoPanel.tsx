import React, { useMemo, useState } from 'react';
import { ChevronDown, Gauge, BookOpen, Newspaper, Search } from 'lucide-react';
import {
  analisisSeo, WARNA_TINGKAT,
  type KelompokSeo, type MasukanAnalisis, type Pemeriksaan, type TingkatSeo,
} from '../lib/seo';

/**
 * Panel "Skor SEO" di dalam form Edit Berita.
 *
 * Menampilkan lampu merah/oranye/kuning/hijau seperti plugin SEO WordPress,
 * tapi kriterianya disusun untuk berita berbahasa Indonesia — lihat
 * src/lib/seo.ts untuk alasannya.
 *
 * Pemeriksaan diurutkan dari yang paling buruk ke paling baik, bukan menurut
 * urutan pembuatannya. Penulis yang buru-buru mengejar tenggat hanya sempat
 * melihat baris teratas, jadi baris teratas harus berisi hal yang paling perlu
 * diperbaiki.
 */

const IKON_KELOMPOK: Record<KelompokSeo, React.ReactNode> = {
  seo: <Search className="w-3.5 h-3.5" />,
  keterbacaan: <BookOpen className="w-3.5 h-3.5" />,
  jurnalistik: <Newspaper className="w-3.5 h-3.5" />,
};

const NAMA_KELOMPOK: Record<KelompokSeo, string> = {
  seo: 'SEO',
  keterbacaan: 'Keterbacaan',
  jurnalistik: 'Jurnalistik',
};

/** Urutan tampil: yang paling merah lebih dulu. */
const URUTAN: Record<TingkatSeo, number> = { buruk: 0, kurang: 1, cukup: 2, baik: 3 };

export const SeoPanel: React.FC<MasukanAnalisis> = (masukan) => {
  const [terbuka, setTerbuka] = useState(true);

  // Analisis berjalan tiap ketikan, jadi hasilnya di-cache selama masukannya
  // belum berubah — tanpa ini, mengetik di naskah panjang terasa tersendat.
  const hasil = useMemo(() => analisisSeo(masukan), [
    masukan.judul, masukan.kataKunci, masukan.ringkasan,
    masukan.isi, masukan.urlGambar, masukan.kota, masukan.tag.join('|'),
  ]);

  const warna = WARNA_TINGKAT[hasil.tingkat];
  const terurut = [...hasil.pemeriksaan].sort(
    (a, b) => URUTAN[a.tingkat] - URUTAN[b.tingkat] || b.bobot - a.bobot
  );
  const perluDibenahi = hasil.pemeriksaan.filter(p => p.tingkat === 'buruk' || p.tingkat === 'kurang').length;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Kepala panel: skor besar + tiga skor kelompok */}
      <button
        type="button"
        onClick={() => setTerbuka(!terbuka)}
        className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${warna.latar} hover:brightness-95 cursor-pointer`}
      >
        <div className={`w-11 h-11 rounded-full ${warna.bulat} text-white flex flex-col items-center justify-center flex-none shadow-sm`}>
          <span className="text-sm font-black leading-none">{hasil.skor}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-gray-500" />
            <span className="font-bold text-sm text-gray-800">Skor SEO</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${warna.bulat} text-white`}>
              {warna.label}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 truncate">
            {hasil.catatanTingkat
              ?? (perluDibenahi === 0
                ? 'Semua pemeriksaan aman.'
                : `${perluDibenahi} hal masih bisa diperbaiki.`)}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-3 flex-none">
          {(Object.keys(NAMA_KELOMPOK) as KelompokSeo[]).map(k => (
            <div key={k} className="text-center">
              <div className={`text-xs font-black ${WARNA_TINGKAT[hasil.kelompok[k].tingkat].teks}`}>
                {hasil.kelompok[k].skor}
              </div>
              <div className="text-[9px] text-gray-500 uppercase tracking-wide">{NAMA_KELOMPOK[k]}</div>
            </div>
          ))}
        </div>

        <ChevronDown className={`w-4 h-4 text-gray-500 flex-none transition-transform ${terbuka ? 'rotate-180' : ''}`} />
      </button>

      {terbuka && (
        <div className="border-t border-gray-100">
          <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
            {terurut.map(p => <BarisPemeriksaan key={p.id} pemeriksaan={p} />)}
          </ul>

          {/* Angka mentah — berguna buat editor yang ingin menilai sendiri. */}
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-gray-500">
            <span>{hasil.statistik.jumlahKata} kata</span>
            <span>{hasil.statistik.jumlahKalimat} kalimat</span>
            <span>{hasil.statistik.jumlahParagraf} paragraf</span>
            <span>{hasil.statistik.kataPerKalimat} kata/kalimat</span>
            <span>kepadatan {hasil.statistik.kepadatanKunci}%</span>
            <span>pasif {hasil.statistik.persenPasif}%</span>
          </div>

          <p className="px-3 py-2 text-[10px] text-gray-400 leading-relaxed border-t border-gray-100">
            Skor hijau berarti naskah rapi menurut daftar periksa ini — bukan
            jaminan peringkat di Google. Isi berita yang bermutu tetap yang
            paling menentukan.
          </p>
        </div>
      )}
    </div>
  );
};

const BarisPemeriksaan: React.FC<{ pemeriksaan: Pemeriksaan }> = ({ pemeriksaan }) => {
  const w = WARNA_TINGKAT[pemeriksaan.tingkat];
  return (
    <li className="flex gap-2.5 px-3 py-2 hover:bg-gray-50/70">
      <span className={`w-2.5 h-2.5 rounded-full ${w.bulat} flex-none mt-1.5 ring-2 ring-white shadow-sm`} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-gray-800">{pemeriksaan.judul}</span>
          <span className="text-[9px] uppercase tracking-wide text-gray-400 flex items-center gap-1">
            {IKON_KELOMPOK[pemeriksaan.kelompok]}
            {NAMA_KELOMPOK[pemeriksaan.kelompok]}
          </span>
        </div>
        <p className="text-[11px] text-gray-600 leading-snug mt-0.5">{pemeriksaan.pesan}</p>
      </div>
    </li>
  );
};
