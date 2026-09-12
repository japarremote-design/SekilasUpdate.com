import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Article } from '../types';

export const LOGO_URL = "/logo-icon-512.png";

export const initialArticles: Article[] = [
  {
    id: "art-1",
    title: "Pemerintah Resmikan Proyek Infrastruktur Baru, Akses Daerah Terpencil Kian Terbuka",
    category: "Nasional",
    excerpt: "Pembangunan jalan dan jembatan baru diharapkan mampu mendongkrak perekonomian lokal serta mempermudah akses distribusi barang antar wilayah.",
    content: `JAKARTA, SekilasUpdate.com - Upaya pemerataan pembangunan terus digenjot. Hari ini, pemerintah secara resmi membuka serangkaian proyek infrastruktur krusial yang menghubungkan desa-desa terpencil dengan pusat pertumbuhan ekonomi terdekat.

Dalam sambutannya, ditekankan bahwa pembangunan tidak boleh hanya berpusat di wilayah perkotaan. "Keadilan sosial berarti akses yang sama terhadap jalan yang layak, jembatan yang kokoh, dan fasilitas umum yang memadai bagi seluruh warga, tanpa terkecuali," tegasnya di hadapan ratusan warga yang hadir.

"Jalan ini bukan sekadar aspal dan batu, ini adalah urat nadi ekonomi baru bagi masyarakat desa."

Proyek ini mencakup perbaikan jalan sepanjang 15 kilometer, pembangunan dua jembatan penghubung antar kecamatan, serta instalasi penerangan jalan umum berbasis tenaga surya. Masyarakat setempat yang selama ini kesulitan mengangkut hasil pertanian kini dapat bernapas lega.

Pak Hasan, salah seorang tokoh masyarakat desa setempat, menyampaikan rasa syukurnya. "Dulu kalau musim hujan, jalanan ini lumpur semua. Hasil panen susah dibawa ke pasar, ongkosnya jadi mahal. Sekarang alhamdulillah, jalan mulus, ekonomi desa pasti ikut lancar," ungkapnya.`,
    imageUrl: "https://images.unsplash.com/photo-1545558014-8692077e9b5c?auto=format&fit=crop&w=1200&q=80",
    imageCaption: "Foto: Dok. SekilasUpdate.com",
    author: "Redaksi SekilasUpdate.com",
    authorRole: "Tim Redaksi Utama",
    createdAt: new Date("2026-08-04T14:30:00Z").toISOString(),
    status: 'Published',
    views: 1420,
    likes: 382,
    tags: ["Infrastruktur", "Nasional", "Pembangunan"],
    isHero: true,
    isTrending: true
  },
  {
    id: "art-2",
    title: "Harga Kebutuhan Pokok Mulai Stabil Jelang Akhir Tahun",
    category: "Ekonomi",
    excerpt: "Pantauan dinas perdagangan di pasar-pasar tradisional menunjukkan tren penurunan harga beras premium, gula, dan bumbu dapur.",
    content: `JAKARTA - Pasokan komoditas pangan pokok dipastikan dalam kondisi aman dan harga terpantau stabil menjelang penutupan tahun ini.

Operasi pasar murah yang digelar secara kontinyu di berbagai kabupaten/kota terbukti efektif menekan lonjakan inflasi daerah.

Masyarakat menyambut positif kestabilan harga ini, terutama komoditas beras, gula pasir, dan minyak goreng yang menjadi kebutuhan harian rumah tangga.`,
    imageUrl: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=80",
    author: "Budi Santoso",
    authorRole: "Jurnalis Ekonomi",
    createdAt: new Date("2026-08-05T00:15:00Z").toISOString(),
    status: 'Published',
    views: 890,
    likes: 124,
    tags: ["Pasar", "Sembako", "Inflasi"],
    isTrending: true
  },
  {
    id: "art-3",
    title: "Fasilitas Kesehatan Baru Diresmikan, Warga Pesisir Tak Perlu Lagi ke Kota",
    category: "Kesehatan",
    excerpt: "Rumah sakit pratama berteknologi modern siap melayani ribuan warga pesisir tanpa perlu menempuh jarak jauh ke pusat kota.",
    content: `DAERAH - Warga kawasan pesisir kini tidak perlu lagi menempuh rute berjam-jam untuk mendapatkan akses layanan medis spesialis.

Fasilitas kesehatan lengkap dengan instalasi gawat darurat 24 jam dan ruang rawat inap standar nasional secara resmi mulai beroperasi hari ini.

Proyek ini merupakan komitmen prioritas bidang kesehatan untuk menjamin kesejahteraan warga pelosok daerah.`,
    imageUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80",
    author: "Siti Rahma",
    authorRole: "Kontributor Daerah",
    createdAt: new Date("2026-08-04T22:00:00Z").toISOString(),
    status: 'Published',
    views: 650,
    likes: 98,
    tags: ["Kesehatan", "Layanan Publik", "Daerah"]
  },
  {
    id: "art-4",
    title: "Peta Koalisi Partai Jelang Pemilihan Kepala Daerah Mulai Terlihat",
    category: "Politik",
    excerpt: "Sejumlah pimpinan partai politik intensif menggelar pertemuan tertutup guna mematangkan rekomendasi pasangan calon.",
    content: `JAKARTA - Dinamika politik kian hangat mendekati pesta demokrasi pilkada serentak.

Konsolidasi antar lintas partai politik terus digencarkan untuk merumuskan visi pasangan calon pimpinan daerah yang responsif terhadap aspirasi rakyat.

Para pengamat menilai koalisi yang terbentuk akan ditentukan oleh rekam jejak pembangunan serta program strategis yang berpihak pada kesejahteraan ekonomi kerakyatan.`,
    imageUrl: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80",
    author: "Rizal Prabowo",
    authorRole: "Editor Politik",
    createdAt: new Date("2026-08-04T21:00:00Z").toISOString(),
    status: 'Published',
    views: 1120,
    likes: 210,
    tags: ["Pilkada", "Politik", "Koalisi"],
    isTrending: true
  },
  {
    id: "art-5",
    title: "Polisi Ungkap Sindikat Penipuan Online Lintas Provinsi",
    category: "Hukum",
    excerpt: "Aparat berhasil mengamankan barang bukti kejahatan siber senilai ratusan juta rupiah dari penggerebekan markas rahasia.",
    content: `JAKARTA - Tim siber kepolisian membongkar jaringan tindak pidana penipuan berbasis daring yang menargetkan korban secara acak.

Masyarakat diimbau untuk selalu waspada dan tidak mudah tergiur dengan iming-iming investasi berantai atau pesan singkat mencurigakan.`,
    imageUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80",
    author: "Tim Hukum & Kriminal",
    createdAt: new Date("2026-08-03T18:00:00Z").toISOString(),
    status: 'Published',
    views: 780,
    likes: 145,
    tags: ["Hukum", "Siber", "Kepolisian"]
  },
  {
    id: "art-6",
    title: "Inovasi Pertanian Organik Tingkatkan Pendapatan Warga Desa",
    category: "Daerah",
    excerpt: "Penggunaan pupuk buatan koperasi desa berhasil mendongkrak tonase panen padi hingga 35 persen dibanding musim sebelumnya.",
    content: `DAERAH - Desa Sukamaju menjadi salah satu contoh keberhasilan kemandirian pangan berbasis komunitas.

Dengan beralih ke pola budidaya padi organik terpadu, kualitas beras yang dihasilkan lebih premium dan dipasarkan langsung ke jaringan ritel regional.`,
    imageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
    author: "Ahmad Dahlan",
    authorRole: "Reporter Daerah",
    createdAt: new Date("2026-08-04T12:00:00Z").toISOString(),
    status: 'Published',
    views: 940,
    likes: 310,
    tags: ["Desa", "Pertanian", "Ekonomi Kerakyatan"]
  },
  {
    id: "art-7",
    title: "Masa Depan Pendidikan Vokasi di Era Digitalisasi Industri",
    category: "Opini",
    excerpt: "Transformasi sekolah vokasi berbasis teknologi tinggi menjadi kunci mencetak SDM unggul di kawasan industri modern.",
    content: `Transformasi digital harus diimbangi dengan karakter moral yang kuat dan keterampilan praktis yang sesuai dengan standar industri global.

Kurikulum vokasi perlu disusun bersama pelaku industri agar lulusan tidak lagi menghadapi jurang antara apa yang dipelajari dan apa yang dibutuhkan dunia kerja.`,
    imageUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
    author: "Dr. Ahmad Budiarto",
    authorRole: "Pemerhati Pendidikan",
    createdAt: new Date("2026-08-04T08:00:00Z").toISOString(),
    status: 'Published',
    views: 1250,
    likes: 420,
    tags: ["Opini", "Pendidikan", "Digitalisasi"],
    isOpinion: true,
    opinionAuthor: "Dr. Ahmad Budiarto",
    opinionRole: "Pakar Pendidikan Vokasi"
  },
  {
    id: "art-8",
    title: "Tantangan Ekologi: Menjaga Keseimbangan Pembangunan dan Lingkungan",
    category: "Opini",
    excerpt: "Pembangunan berkelanjutan memerlukan etika pelestarian alam yang terintegrasi dengan kearifan lokal masyarakat.",
    content: `Pembangunan fisik daerah harus selaras dengan daya dukung ekosistem sungai dan hutan pelindung demi mencegah bencana alam tahunan.

Tanpa perencanaan tata ruang yang disiplin, biaya pemulihan lingkungan akan jauh melampaui nilai investasi yang dikejar hari ini.`,
    imageUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
    author: "Siti Rahma, M.Si",
    authorRole: "Peneliti Ekologi",
    createdAt: new Date("2026-08-03T10:00:00Z").toISOString(),
    status: 'Published',
    views: 890,
    likes: 195,
    tags: ["Opini", "Lingkungan"],
    isOpinion: true,
    opinionAuthor: "Siti Rahma, M.Si",
    opinionRole: "Pemerhati Ekologi Sosial"
  }
];

export async function seedInitialArticlesIfEmpty() {
  try {
    const querySnapshot = await getDocs(collection(db, 'articles'));
    if (querySnapshot.empty) {
      console.log('Seeding initial news articles into Firestore...');
      for (const article of initialArticles) {
        await setDoc(doc(db, 'articles', article.id), article);
      }
      console.log('Seeding completed successfully!');
    }
  } catch (error) {
    console.error('Error seeding articles to Firestore:', error);
  }
}
