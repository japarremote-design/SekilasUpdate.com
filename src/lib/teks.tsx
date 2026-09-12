import React from 'react';

/**
 * Penanda sederhana untuk naskah berita.
 *
 *   **tebal**   -> tebal
 *   _miring_    -> miring
 *
 * Naskah disimpan sebagai teks biasa, bukan HTML. Penandanya diurai di sini
 * jadi elemen React, jadi tidak ada HTML mentah dari penulis yang ikut
 * dirender — aman dari penyisipan skrip lewat isi artikel.
 *
 * Garis bawah yang menempel pada huruf atau angka sengaja tidak dihitung
 * sebagai penanda miring, supaya nama berkas seperti foto_bupati_2026 tidak
 * ikut berubah bentuk.
 */

const POLA = '\\*\\*([\\s\\S]+?)\\*\\*|_([^_\\n]+?)_';

function huruf(ch: string | undefined): boolean {
  return ch !== undefined && /[\p{L}\p{N}]/u.test(ch);
}

export function renderTeks(teks: string, kunci = 't'): React.ReactNode {
  const hasil: React.ReactNode[] = [];
  let batas = 0;
  let n = 0;

  // Regex dibuat baru tiap panggilan: fungsi ini memanggil dirinya sendiri
  // untuk penanda bersarang, dan lastIndex yang dipakai bersama akan kacau.
  const penanda = new RegExp(POLA, 'g');
  let cocok: RegExpExecArray | null;

  while ((cocok = penanda.exec(teks)) !== null) {
    const tebal = cocok[1] !== undefined;

    // Garis bawah di tengah kata bukan penanda miring — lewati.
    if (!tebal) {
      const sebelum = teks[cocok.index - 1];
      const sesudah = teks[cocok.index + cocok[0].length];
      if (huruf(sebelum) || huruf(sesudah)) continue;
    }

    if (cocok.index > batas) hasil.push(teks.slice(batas, cocok.index));

    const isi = tebal ? cocok[1] : cocok[2];
    hasil.push(
      tebal
        ? <strong key={`${kunci}-b${n}`}>{renderTeks(isi, `${kunci}-b${n}`)}</strong>
        : <em key={`${kunci}-i${n}`}>{renderTeks(isi, `${kunci}-i${n}`)}</em>
    );

    batas = cocok.index + cocok[0].length;
    n++;
  }

  if (batas < teks.length) hasil.push(teks.slice(batas));
  return hasil.length === 1 ? hasil[0] : hasil;
}

/**
 * Baris tempat (dateline) di awal berita:
 *
 *   MOJOKERTO, SekilasUpdate.com - Tersembunyi di bawah ...
 *
 * Nama kota dan nama portal dikenali sendiri lalu ditebalkan — penulis cukup
 * mengetik seperti biasa, tanpa penanda apa pun. Hanya diperiksa pada paragraf
 * pertama; "SekilasUpdate.com" yang muncul di tengah tubuh berita dibiarkan apa adanya.
 *
 * Nama kota harus huruf kapital semua supaya kalimat biasa yang kebetulan
 * berpola sama tidak ikut tertangkap.
 */
const DATELINE =
  /^([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ0-9 .'-]*?),\s*(?:SekilasUpdate\.com|SEKILASUPDATE\.COM|PASEK\.ID)\s*([-–—])\s*/;

export function pecahDateline(teks: string): { kota: string; pisah: string; sisa: string } | null {
  const cocok = DATELINE.exec(teks);
  if (!cocok) return null;
  return { kota: cocok[1], pisah: cocok[2], sisa: teks.slice(cocok[0].length) };
}

/**
 * Paragraf berita: penanda tebal/miring diurai, dan pergantian baris tunggal
 * tetap jadi baris baru. Tanpa ini daftar seperti
 *
 *   * Jam Buka: 07.00
 *   * Tiket: Rp2.000
 *
 * akan menyatu jadi satu baris panjang, karena HTML memampatkan spasi.
 */
export function renderParagraf(teks: string, kunci: string): React.ReactNode {
  const baris = teks.split('\n');
  return baris.map((b, i) => (
    <React.Fragment key={`${kunci}-l${i}`}>
      {i > 0 && <br />}
      {renderTeks(b, `${kunci}-l${i}`)}
    </React.Fragment>
  ));
}
