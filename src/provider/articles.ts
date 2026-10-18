// Article data that mirrors the real content model of the Perpustakaan
// Shalawat & Maulid digital library: an article plus structured reader
// units, each unit carrying up to four layers (Arabic, Latin transliteration,
// Indonesian translation, English translation).

export type ContentType = "SHALAWAT" | "MAULID";
export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface ArticleUnit {
  id: string;
  arab?: string;
  latin?: string;
  translation?: string;
  english?: string;
  text?: string;
}

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

export function findPublishedArticle(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug && a.status === "PUBLISHED");
}
