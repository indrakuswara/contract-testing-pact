// ============================================================================
// FILE INI NGAPAIN?  <-- INI FILE PALING PENTING NOMOR 1, BACA PELAN-PELAN
// Ini TEST SISI CONSUMER. Dijalankan dengan:  npm run test:consumer
//
// Yang terjadi saat test ini jalan (alur besarnya):
// 1. Pact menyalakan sebuah MOCK SERVER — server provider PALSU yang
//    jawaban-jawabannya kita atur dari test ini.
// 2. Client ASLI kita (getArticle dari libraryClient.ts) menembak mock
//    server itu, sama persis seperti ia menembak provider beneran.
// 3. Sambil client jalan, Pact MENCATAT setiap permintaan & jawaban yang
//    kita janjikan di sini menjadi sebuah file KONTRAK:
//        pacts/ReaderWeb-PerpustakaanArticlesApi.json
// 4. File kontrak itulah yang nanti dibaca test SISI PROVIDER untuk
//    memeriksa provider beneran: "kamu masih menepati janji ini tidak?"
//
// Jadi test ini menjawab dua hal sekaligus:
// - Client kita beneran bisa membaca jawaban berbentuk seperti ini?
// - Apa persisnya yang consumer BUTUHKAN dari provider? (Itu kontraknya.)
//
// Kenapa consumer yang menulis kontrak, bukan provider?
// Karena filosofi Pact itu consumer-driven: yang tahu persis field apa
// saja yang dipakai adalah si pemakai data. Provider bebas mengubah
// isi dalamannya, asal janji ke consumer tidak dilanggar.
// ============================================================================

import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MatchersV3, PactV3 } from "@pact-foundation/pact";
import { ArticleNotFoundError, getArticle } from "../src/consumer/libraryClient.ts";

// Tiga alat pencocok (matcher) yang akan kita pakai di bawah:
// - string(x)  : "field ini harus ada, tipenya string" (x cuma contoh nilai)
// - like(x)    : "nilainya harus SEJENIS dengan x"
// - eachLike(o): "ini array, dan tiap elemennya berbentuk seperti o"
const { eachLike, like, string } = MatchersV3;

// Folder root proyek (satu tingkat di atas folder test/ ini),
// dipakai untuk menentukan lokasi folder pacts/.
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Daftarkan siapa consumer-nya dan siapa provider-nya.
// Nama-nama ini akan jadi nama file kontraknya:
//   pacts/ReaderWeb-PerpustakaanArticlesApi.json
// Nama ini juga yang dicari test provider nanti — jangan diganti di satu
// sisi saja.
const provider = new PactV3({
  consumer: "ReaderWeb",
  provider: "PerpustakaanArticlesApi",
  dir: path.resolve(dir, "pacts"),
  logLevel: "warn",
});

// Bentuk jawaban artikel yang DIBUTUHKAN consumer.
// Baca baris-barisnya begini: "field `title` HARUS ADA dan tipenya harus
// string — nilai contohnya 'Qad Kafani', tapi nilai aslinya boleh apa
// saja selama string."
//
// Itulah gunanya matcher: kontrak menjaga NAMA FIELD + TIPE, bukan isi
// persisnya. Judul artikel diganti besok -> kontrak tetap lolos.
// Field translation di-rename -> kontrak PUTUS. Field dihapus -> putus.
//
// Untuk `units` kita pakai eachLike: "units itu array, dan setiap unit
// bentuknya seperti ini" — termasuk keempat lapis bacaan yang memang
// dipakai halaman reader: arab, latin, translation, english.
const articleBody = {
  id: string("ae085c4b-3839-4269-a1c0-fcc8aadd37d9"),
  title: string("Qad Kafani"),
  slug: string("qad-kafani"),
  type: string("SHALAWAT"),
  description: string("A classical shalawat attributed to Imam Abdullah bin 'Alawi al-Haddad."),
  status: string("PUBLISHED"),
  publishedAt: string("2026-10-04T00:00:00.000Z"),
  units: eachLike({
    id: string("qad-kafani-1"),
    arab: string("قَدْ كَفَانِيْ عِلْمُ رَبِّيْ"),
    latin: string("Qad kafani 'ilmu Rabbi"),
    translation: string("Sungguh telah cukup bagiku pengetahuan Tuhanku"),
    english: string("The knowledge of my Lord has truly sufficed me"),
  }),
};

describe("ReaderWeb consumer contract", () => {
  // ------------------------------------------------------------------
  // INTERAKSI 1: artikel yang published -> jawaban 200
  // Baca rantai method-nya dari atas ke bawah seperti kalimat:
  // given(...)        = "DENGAN SYARAT dunia sedang begini..."
  // uponReceiving(...)= "...consumer akan menerima interaksi bernama ini"
  // withRequest(...)  = "saat consumer mengirim request seperti ini"
  // willRespondWith() = "provider BERJANJI menjawab seperti ini"
  // executeTest(...)  = "sekarang jalankan client aslinya ke mock server"
  // ------------------------------------------------------------------
  it("gets a published article with all four reader layers", async () => {
    await provider
      // SYARAT DUNIA: artikel qad-kafani ada dan statusnya PUBLISHED.
      // Kalimat syarat ini PENTING: test provider nanti harus menyiapkan
      // dunia yang sama sebelum memutar ulang kontrak (lihat
      // stateHandlers di test/provider.verification.test.ts — kalimatnya
      // harus sama persis dengan yang ditulis di sini).
      .given("a published article with slug qad-kafani exists")
      .uponReceiving("a request for the qad-kafani article")
      .withRequest({
        method: "GET",
        path: "/articles/qad-kafani",
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": like("application/json") },
        // Mock server akan menjawab pakai bentuk articleBody di atas,
        // dan bentuk ini pula yang tercatat ke file kontrak.
        body: articleBody,
      })
      .executeTest(async (mockServer) => {
        // mockServer.url = alamat mock server yang baru dinyalakan Pact.
        // Client kita menembak ke sana — bukan ke provider beneran.
        const article = await getArticle(mockServer.url, "qad-kafani");

        // Pemeriksaan sisi consumer: client berhasil membaca jawabannya
        // dan field-field yang dipakai reader memang terisi.
        expect(article.slug).toBe("qad-kafani");
        expect(article.status).toBe("PUBLISHED");
        expect(article.units.length).toBeGreaterThan(0);
        expect(article.units[0].arab).toBeTruthy();
        expect(article.units[0].latin).toBeTruthy();
        expect(article.units[0].translation).toBeTruthy();
        expect(article.units[0].english).toBeTruthy();
      });
    // Sesudah executeTest selesai, Pact menulis interaksi ini ke file
    // kontrak. Dua test di file ini menghasilkan SATU file kontrak
    // berisi dua interaksi.
  });

  // ------------------------------------------------------------------
  // INTERAKSI 2: slug yang tidak ada -> jawaban 404
  // Kontrak bukan cuma soal jalan sukses — jalan error juga dicatat,
  // supaya provider tidak diam-diam mengganti perilaku 404-nya
  // (misalnya jadi 200 + body kosong) tanpa ketahuan consumer.
  // ------------------------------------------------------------------
  it("gets a 404 for an unknown slug", async () => {
    await provider
      // SYARAT DUNIA versi kebalikannya: slug ini memang TIDAK ada.
      .given("no article with slug does-not-exist exists")
      .uponReceiving("a request for an unknown article")
      .withRequest({
        method: "GET",
        path: "/articles/does-not-exist",
      })
      .willRespondWith({
        status: 404,
        headers: { "Content-Type": like("application/json") },
        body: { error: string("Article not found") },
      })
      .executeTest(async (mockServer) => {
        // Yang diperiksa di sini: client kita menerjemahkan 404 menjadi
        // ArticleNotFoundError — bukan diam-diam mengembalikan artikel
        // kosong atau melempar error acak.
        await expect(getArticle(mockServer.url, "does-not-exist")).rejects.toBeInstanceOf(
          ArticleNotFoundError,
        );
      });
  });
});
