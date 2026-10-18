// ============================================================================
// FILE INI NGAPAIN?
// Ini CONSUMER-nya: kode di sisi "tamu" yang meminta artikel ke provider
// lewat HTTP.
//
// Di dunia nyata, consumer ini ceritanya adalah kode di halaman reader
// Perpustakaan — seandainya reader mengambil artikel lewat API HTTP.
// (Reader aslinya baca database langsung; di proyek latihan ini kita
// pura-puranya ia lewat HTTP, supaya ada batas consumer <-> provider
// yang bisa dikasih kontrak.)
//
// Fungsi satu-satunya di sini, getArticle(), adalah fungsi yang sama yang
// dipakai test consumer Pact — jadi yang dites itu kode beneran, bukan
// tiruan khusus test.
// ============================================================================

import type { Article } from "../provider/articles.ts";

// Error khusus untuk kasus "artikelnya tidak ada".
// Dibikin kelas sendiri (bukan Error biasa) supaya pemanggil bisa
// membedakan: 404 = artikel tidak ada, error lain = server bermasalah.
// Di test consumer, error inilah yang kita harapkan muncul untuk slug
// yang tidak dikenal.
export class ArticleNotFoundError extends Error {
  constructor(slug: string) {
    super(`Article not found: ${slug}`);
    this.name = "ArticleNotFoundError";
  }
}

// Minta satu artikel ke provider.
// - baseUrl : alamat provider, contoh "http://localhost:8081".
//             Saat test Pact, yang dioper ke sini adalah alamat MOCK
//             SERVER buatan Pact — client ini tidak tahu (dan tidak
//             perlu tahu) bedanya, karena alamatnya cuma parameter.
// - slug    : artikel mana yang diminta, contoh "qad-kafani".
export async function getArticle(baseUrl: string, slug: string): Promise<Article> {
  // Tembak request-nya: GET {baseUrl}/articles/{slug}
  const response = await fetch(`${baseUrl}/articles/${slug}`);

  // Provider menjawab 404 -> lempar error khusus kita.
  if (response.status === 404) {
    throw new ArticleNotFoundError(slug);
  }

  // Jawaban error lain (500, dst) -> lempar Error umum berisi statusnya,
  // supaya ketahuan ini bukan "tidak ada" tapi "servernya yang rusak".
  if (!response.ok) {
    throw new Error(`Unexpected response ${response.status} when fetching article "${slug}"`);
  }

  // Jawaban 200 -> parse JSON-nya dan kembalikan sebagai Article.
  // TypeScript percaya bentuknya sesuai tipe Article — dan justru
  // kepercayaan inilah yang TIDAK cukup di dunia nyata: TypeScript
  // tidak memeriksa jawaban dari server beneran. Pemeriksaan betulan
  // terhadap server aslinya dilakukan oleh kontrak Pact (lihat folder
  // test/), bukan oleh baris ini.
  return (await response.json()) as Article;
}
