#!/usr/bin/env python3
"""
Membuat aset ikon SekilasUpdate.com dari nol.

Kenapa digambar ulang, bukan sekadar memperkecil logo:

Memperkecil logo 512px sampai 16px membuat palang geraknya menyusut jadi dua
titik yang terbaca sebagai kotoran, bukan garis kecepatan. Karena itu ukuran
kecil memakai versi SEDERHANA — hanya kilat, dibesarkan sampai hampir memenuhi
ubin — sedangkan 64px ke atas memakai versi lengkap dengan palang gerak, persis
seperti tanda di depan wordmark.

Beda dengan ikon merek sebelumnya, semua ukuran di sini BERLATAR ubin indigo.
Kilat sendirian di atas latar transparan akan hilang di tab browser bertema
gelap, dan iOS memang selalu merender apple-touch-icon sebagai kotak penuh —
latar transparan diisi hitam, bukan dibiarkan tembus.

Berkas wordmark (public/logo-wordmark.png) TIDAK dibuat di sini. Wordmark butuh
huruf Plus Jakarta Sans yang tidak ikut disimpan di repo ini; berkasnya sudah
jadi dan cukup diganti tangan kalau nanti sloganya berubah.

Jalankan: python3 scripts/build-favicon.py
"""
import struct
from io import BytesIO
from PIL import Image, ImageDraw

# Gradasi kilat, sama dengan yang dipakai KilatMark.tsx dan logo.
HENTI = [
    (0.00, (245, 165, 36)),    # #F5A524 — amber di ujung atas
    (0.55, (245, 82, 44)),     # #F5522C — jingga di tengah
    (1.00, (227, 15, 42)),     # #E30F2A — merah kilat di ujung bawah
]
UBIN_ATAS = (27, 36, 69)       # #1B2445 — sudut kiri atas ubin
UBIN_BAWAH = (20, 27, 52)      # #141B34 — indigo tengah malam

AMBER = (245, 165, 36)         # #F5A524 — palang gerak atas
AMBER_PUCAT = (251, 199, 122)  # #FBC77A — palang gerak bawah

SS = 8            # faktor supersampling; digambar besar lalu diperkecil

# Kilat dalam ruang rancangan 100x100, sama persis dengan KilatMark.tsx.
KILAT = [(62.5, 6), (26, 55.5), (47.5, 55.5), (39, 94), (76.5, 43), (54.5, 43)]
PALANG = [(4, 36, 19, 8, AMBER), (10, 51.5, 13, 8, AMBER_PUCAT)]


def _warna_gradasi(t: float) -> tuple:
    """Warna pada posisi t (0..1) di sepanjang gradasi kilat."""
    t = min(max(t, 0.0), 1.0)
    for (t0, c0), (t1, c1) in zip(HENTI, HENTI[1:]):
        if t <= t1:
            f = 0 if t1 == t0 else (t - t0) / (t1 - t0)
            return tuple(round(c0[i] + (c1[i] - c0[i]) * f) for i in range(3))
    return HENTI[-1][1]


def _isi_gradasi(ukuran: int, kotak: tuple) -> Image.Image:
    """
    Gradasi linier yang arahnya mengikuti logo: dari sudut kiri-atas kotak
    kilat ke arah (0.35, 1.0) relatif terhadap ukuran kotak itu — jadi lebih
    banyak turun daripada melebar, sama seperti atribut linearGradient di
    SVG-nya.

    Digambar kecil lalu dibesarkan. Gradasi berubah mulus, jadi menghitungnya
    piksel demi piksel di kanvas supersampled (bisa 4096x4096) hanya membuang
    waktu tanpa beda yang kelihatan.
    """
    x0, y0, x1, y1 = kotak
    kecil = 128
    n = ukuran / kecil
    vx, vy = (x1 - x0) * 0.35, (y1 - y0) * 1.0
    panjang2 = vx * vx + vy * vy or 1.0

    grad = Image.new('RGB', (kecil, kecil))
    piksel = grad.load()
    for y in range(kecil):
        for x in range(kecil):
            # Proyeksi titik ke vektor gradasi, dinormalkan jadi 0..1.
            t = ((x * n - x0) * vx + (y * n - y0) * vy) / panjang2
            piksel[x, y] = _warna_gradasi(t)
    return grad.resize((ukuran, ukuran), Image.BILINEAR)


def _latar_ubin(ukuran: int, radius: float, rata: bool) -> Image.Image:
    """Ubin membulat indigo. `rata` memakai satu warna, tanpa gradasi."""
    ubin = Image.new('RGBA', (ukuran, ukuran), (0, 0, 0, 0))

    if rata:
        isi = Image.new('RGB', (ukuran, ukuran), UBIN_BAWAH)
    else:
        isi = Image.new('RGB', (ukuran, ukuran))
        gd = ImageDraw.Draw(isi)
        # Gradasi diagonal lembut: memberi kedalaman pada ikon berukuran besar.
        for i in range(2 * ukuran):
            t = i / (2 * ukuran - 1)
            gd.line(
                [(i, 0), (0, i)],
                fill=tuple(round(UBIN_ATAS[j] + (UBIN_BAWAH[j] - UBIN_ATAS[j]) * t) for j in range(3)),
            )

    topeng = Image.new('L', (ukuran, ukuran), 0)
    ImageDraw.Draw(topeng).rounded_rectangle(
        [0, 0, ukuran - 1, ukuran - 1], radius=radius * ukuran, fill=255
    )
    ubin.paste(isi, (0, 0), topeng)
    return ubin


def gambar_ikon(ukuran: int, sederhana: bool, penuh: bool = False) -> Image.Image:
    """
    Satu ikon lengkap. Digambar SS kali lebih besar lalu diperkecil dengan
    LANCZOS — kilat punya banyak tepi miring, dan tanpa supersampling tepinya
    berubah jadi tangga yang kasar di ukuran kecil.

    `penuh` menghasilkan bujur sangkar utuh tanpa sudut membulat dan TANPA
    lapisan alfa. Wajib untuk apple-touch-icon: iOS memasang topeng sudutnya
    sendiri dan mengisi piksel transparan dengan HITAM, jadi ikon yang sudah
    dibulatkan di sini akan muncul di layar utama sebagai kotak hitam dengan
    ubin indigo mengambang di tengahnya.
    """
    c = ukuran * SS
    radius = 0.0 if penuh else (0.20 if sederhana else 0.22)
    ikon = _latar_ubin(c, radius, rata=sederhana)

    # Penempatan kilat: versi sederhana digeser ke tengah (palang geraknya
    # dibuang, jadi ruang kirinya diambil alih kilat) dan dibesarkan.
    if sederhana:
        geser_x, geser_y, skala = c * 0.235, c * 0.10, c * 0.80 / 100
        offset_kilat = -26.0
    else:
        geser_x, geser_y, skala = c * 0.145, c * 0.145, c * 0.71 / 100
        offset_kilat = 0.0

    def ke_kanvas(x: float, y: float) -> tuple:
        return (geser_x + x * skala, geser_y + y * skala)

    titik = [ke_kanvas(x + offset_kilat, y) for x, y in KILAT]

    # Kilat digambar ke topeng dulu, lalu diisi gradasi lewat topeng itu.
    topeng = Image.new('L', (c, c), 0)
    ImageDraw.Draw(topeng).polygon(titik, fill=255)

    xs = [p[0] for p in titik]
    ys = [p[1] for p in titik]
    gradasi = _isi_gradasi(c, (min(xs), min(ys), max(xs), max(ys)))
    ikon.paste(gradasi.convert('RGBA'), (0, 0), topeng)

    if not sederhana:
        d = ImageDraw.Draw(ikon)
        for x, y, lebar, tinggi, warna in PALANG:
            kiri, atas = ke_kanvas(x, y)
            kanan, bawah = ke_kanvas(x + lebar, y + tinggi)
            d.rounded_rectangle([kiri, atas, kanan, bawah], radius=(bawah - atas) / 2,
                                fill=warna + (255,))

    ikon = ikon.resize((ukuran, ukuran), Image.LANCZOS)

    # Lapisan alfa dibuang sekalian, bukan cuma sudutnya diluruskan: berkas
    # RGBA yang kebetulan seluruhnya buram pun masih membuat sebagian alat
    # memperlakukannya sebagai gambar bertransparansi.
    if penuh:
        ikon = ikon.convert('RGB')

    return ikon


def tulis_ico(path: str, bingkai: list) -> None:
    """
    Tulis berkas .ico berisi beberapa bingkai, masing-masing gambarnya sendiri.

    Tidak memakai Image.save(format='ICO') karena Pillow mengabaikan
    append_images untuk ICO — yang terjadi, satu gambar dasar diperkecil ulang
    untuk semua ukuran. Padahal justru itu yang ingin dihindari: ukuran kecil
    perlu gambar yang berbeda (versi sederhana), bukan hasil perkecilan yang
    sama.

    Format ICO: ICONDIR 6 byte, lalu ICONDIRENTRY 16 byte per bingkai, lalu
    data tiap bingkai. Data di sini disimpan sebagai PNG, yang didukung semua
    browser modern.
    """
    gumpal = []
    for f in bingkai:
        buf = BytesIO()
        f.save(buf, format='PNG', optimize=True)
        gumpal.append(buf.getvalue())

    offset = 6 + 16 * len(bingkai)
    kepala = struct.pack('<HHH', 0, 1, len(bingkai))   # reserved, tipe 1 = ikon
    entri, data = b'', b''

    for f, blob in zip(bingkai, gumpal):
        # Lebar/tinggi 256 ditulis sebagai 0 sesuai spesifikasi ICO.
        w = 0 if f.width >= 256 else f.width
        h = 0 if f.height >= 256 else f.height
        entri += struct.pack('<BBBBHHII', w, h, 0, 0, 1, 32, len(blob), offset)
        data += blob
        offset += len(blob)

    with open(path, 'wb') as fh:
        fh.write(kepala + entri + data)


def main() -> None:
    # Ambang 48px: di bawah itu palang gerak tidak lagi terbaca sebagai garis.
    def sederhana(n: int) -> bool:
        return n <= 48

    bingkai = [gambar_ikon(n, sederhana(n)) for n in (16, 32, 48, 256)]
    tulis_ico('public/favicon.ico', bingkai)
    print('public/favicon.ico')

    # PNG 32px dirujuk langsung di index.html; sebagian browser lebih memilih
    # ini daripada membaca isi .ico
    ikon32 = gambar_ikon(32, sederhana=True)
    ikon32.save('public/favicon-32.png')
    print('public/favicon-32.png')

    # Salinan bernama lain, disimpan supaya tautan lama tidak putus.
    ikon32.save('public/favicon32.png')
    print('public/favicon32.png')

    # penuh=True: bujur sangkar utuh tanpa alfa — lihat catatan di gambar_ikon.
    gambar_ikon(180, sederhana=False, penuh=True).save('public/apple-touch-icon.png')
    print('public/apple-touch-icon.png')

    gambar_ikon(512, sederhana=False).save('public/logo-icon-512.png')
    print('public/logo-icon-512.png')


if __name__ == '__main__':
    main()
