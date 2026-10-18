// ============================================================================
// FILE INI NGAPAIN?  <-- FILE PALING PENTING NOMOR 2
// Ini TEST SISI PROVIDER (namanya: provider verification).
// Dijalankan dengan:  npm run test:provider
//
// Pasangan dari test consumer begini alurnya:
// 1. Test consumer SUDAH jalan duluan dan meninggalkan file kontrak di
//    pacts/ReaderWeb-PerpustakaanArticlesApi.json.
// 2. Test INI menyalakan provider BENERAN (app Express dari app.ts)
//    di sebuah port acak.
// 3. Pact Verifier MEMUTAR ULANG (replay) setiap interaksi di kontrak
//    itu ke provider beneran: request yang sama persis dikirim ulang,
//    lalu jawaban aslinya dibandingkan dengan janji di kontrak —
//    status, header, dan bentuk body-nya (nama field + tipe).
// 4. Ada satu interaksi saja yang meleset -> test ini GAGAL.
//
// Di sinilah nilai contract testing terbukti kemarin: waktu field
// `translation` di provider kita rename jadi `terjemahan`, test inilah
// yang gagal dengan pesan "Actual map is missing the following keys:
// translation" — padahal kode provider-nya sendiri jalan baik-baik saja
// dan test consumer juga tetap hijau (ia kan dites lawan mock).
// Yang putus bukan kodenya, tapi JANJINYA ke consumer.
//
// Urutan jalanin: SELALU consumer dulu (bikin kontrak), baru provider
// (memeriksa kontrak). Perintah `npm test` sudah mengurus urutan itu.
// ============================================================================

import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, it } from "vitest";
import { Verifier } from "@pact-foundation/pact";
import { app } from "../src/provider/app.ts";

// --- Catatan environment (bagian ini membosankan tapi nyata) -------------
// Verifier Pact harus ngobrol LANGSUNG ke provider di localhost.
// Di sandbox/CI yang memaksa semua traffic lewat proxy, variabel *_PROXY
// warisan bisa membuat panggilan localhost verifier (dan telemetri
// anonim Pact) ikut tersedot ke proxy, dan verifikasi HANG ber menit-
// menit. Kejadian beneran saat repo ini dibangun — bukan teori.
// Solusinya: untuk proses test ini saja, hapus variabel proxy-nya dan
// matikan tracking Pact. Baris-baris di bawah ini yang melakukan itu;
// sengaja ditaruh PALING ATAS sebelum Verifier dibuat.
// (Detail kejadiannya tercatat di VERIFICATION-NOTES.md.)
for (const key of ["http_proxy", "https_proxy", "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "all_proxy"]) {
  delete process.env[key];
}
process.env.PACT_DO_NOT_TRACK = "true";

// Folder root proyek, untuk menemukan folder pacts/.
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("PerpustakaanArticlesApi provider verification", () => {
  let server: Server;
  let port: number;

  // beforeAll = jalan SEKALI sebelum test-nya: nyalakan provider asli.
  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      // listen(0, ...) artinya "pakai port acak yang sedang kosong" —
      // jadi test ini tidak akan tabrakan port dengan apa pun.
      server = app.listen(0, () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Could not determine provider port");
    }
    // Catat port acak yang tadi didapat; verifier akan menembak ke sini.
    port = address.port;
  });

  // afterAll = jalan SEKALI sesudah test: matikan servernya lagi,
  // supaya proses test bisa selesai bersih.
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("satisfies the ReaderWeb contract", async () => {
    const verifier = new Verifier({
      // Provider beneran yang akan diperiksa, di alamat lokal + port acak
      // yang dinyalakan beforeAll di atas.
      providerBaseUrl: `http://127.0.0.1:${port}`,

      // File kontrak yang akan diputar ulang. File ini HASIL dari test
      // consumer — kalau folder pacts/ kosong, jalankan dulu
      // `npm run test:consumer`.
      pactUrls: [path.resolve(dir, "pacts", "ReaderWeb-PerpustakaanArticlesApi.json")],

      // stateHandlers = "penyiap dunia".
      // Ingat kalimat given(...) di test consumer? Sebelum memutar ulang
      // satu interaksi, verifier memanggil handler yang kalimatnya sama,
      // supaya provider berada di keadaan yang dijanjikan kontrak.
      // Di proyek ini datanya in-memory dan sudah pas dari sananya,
      // jadi kedua handler di bawah cukup melapor tanpa menyiapkan
      // apa-apa. Di proyek beneran, di sinilah tempat mengisi database
      // uji / men-seed data sebelum replay.
      stateHandlers: {
        "a published article with slug qad-kafani exists": async () => {
          // Dataset in-memory memang sudah berisi qad-kafani PUBLISHED,
          // jadi tidak ada setup yang perlu dilakukan untuk state ini.
          return "Published qad-kafani article is present in the dataset";
        },
        "no article with slug does-not-exist exists": async () => {
          // Dataset memang tidak punya slug itu, jadi provider akan 404.
          return "No article with that slug exists in the dataset";
        },
      },
      logLevel: "warn",
      // Waktu ekstra untuk core Pact (Rust) menyala dan memutar kontrak.
      timeout: 60000,
    });

    // Perintah intinya satu baris ini: putar ulang SEMUA interaksi di
    // kontrak ke provider asli dan bandingkan jawabannya. Kalau ada
    // yang meleset, baris ini melempar error dan test-nya gagal.
    await verifier.verifyProvider();
  }, 120_000);
});
