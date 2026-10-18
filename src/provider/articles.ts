// ============================================================================
// FILE INI NGAPAIN?
// Ini "database mini" sekaligus definisi bentuk data artikel.
//
// Di Perpustakaan aslinya, artikel disimpan di database beneran (Postgres /
// SQLite) dengan bentuk yang persis seperti tipe di bawah ini. Di proyek
// latihan ini kita TIDAK pakai database — datanya cukup ditulis langsung di
// file ini sebagai array, supaya fokusnya ke contract testing-nya, bukan
// ke urusan database.
//
// Siapa yang pakai file ini?
// - Provider (src/provider/app.ts) mengambil data dari sini untuk dijawab
//   ke siapa pun yang minta lewat HTTP.
// - Consumer (src/consumer/libraryClient.ts) memakai tipe `Article` dari
//   sini sebagai "bentuk jawaban yang ia harapkan".
// ============================================================================

// Dua jenis konten di Perpustakaan: shalawat atau maulid. Tipe union seperti
// ini artinya: nilainya HANYA boleh salah satu dari string ini, tidak boleh
// string bebas lain.
export type ContentType = "SHALAWAT" | "MAULID";

// Status artikel. Hanya yang PUBLISHED yang boleh dibaca publik —
// DRAFT masih di meja admin, ARCHIVED sudah ditarik.
export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

// Satu unit bacaan = satu bait / satu potongan bacaan di halaman reader.
// Semua field-nya OPSIONAL (tanda `?`), karena di Perpustakaan aslinya
// memang tidak semua bait punya keempat lapis ini. Empat lapisnya:
// - arab        : teks Arab
// - latin       : transliterasi latin (cara baca)
// - translation : terjemahan Bahasa Indonesia
// - english     : terjemahan Bahasa Inggris
// (`text` dipakai untuk unit teks polos yang bukan bait berlapis.)
export interface ArticleUnit {
  id: string;
  arab?: string;
  latin?: string;
  translation?: string;
  english?: string;
  text?: string;
}

// Satu artikel utuh: identitas + metadata + daftar unit bacaannya.
// Perhatikan nama-nama field-nya baik-baik (title, slug, translation, dst).
// NAMA FIELD INILAH yang nanti dijaga oleh kontrak Pact — kalau provider
// mengganti `translation` jadi `terjemahan`, kontraknya putus (dan itu
// memang sudah kita buktikan di eksperimen rename).
export interface Article {
  id: string;
  title: string;
  slug: string;
  type: ContentType;
  description: string | null;
  status: ContentStatus;
  publishedAt: string | null;
  units: ArticleUnit[];
}

// Isi "database"-nya: saat ini cuma satu artikel, Qad Kafani, dengan
// 2 unit contoh (aslinya 21 unit — di sini dipotong supaya file tetap
// enak dibaca; jumlah unit tidak ngaruh ke kontraknya).
export const articles: Article[] = [
  {
    id: "ae085c4b-3839-4269-a1c0-fcc8aadd37d9",
    title: "Qad Kafani",
    slug: "qad-kafani",
    type: "SHALAWAT",
    description: "A classical shalawat attributed to Imam Abdullah bin 'Alawi al-Haddad.",
    status: "PUBLISHED",
    publishedAt: "2026-10-04T00:00:00.000Z",
    units: [
      {
        id: "qad-kafani-1",
        arab: "قَدْ كَفَانِيْ عِلْمُ رَبِّيْ",
        latin: "Qad kafani 'ilmu Rabbi",
        translation: "Sungguh telah cukup bagiku pengetahuan Tuhanku",
        english: "The knowledge of my Lord has truly sufficed me",
      },
      {
        id: "qad-kafani-2",
        arab: "مِنْ سُؤَالِيْ وَاخْتِيَارِيْ",
        latin: "Min su'ali wakhtiyari",
        translation: "Tentang permintaanku dan pilihanku",
        english: "Concerning my requests and my choices",
      },
    ],
  },
];

// Fungsi cari artikel berdasarkan slug, TAPI hanya yang statusnya
// PUBLISHED. Kalau slug-nya tidak ada ATAU artikelnya masih DRAFT,
// hasilnya `undefined` — dan provider akan menerjemahkannya jadi
// jawaban HTTP 404 (lihat app.ts).
export function findPublishedArticle(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug && a.status === "PUBLISHED");
}
