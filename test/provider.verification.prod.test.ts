// ============================================================================
// VERIFIKASI PROVIDER PRODUCTION (bukan provider mini lokal).
// Dijalankan dengan:  npm run test:provider:prod
//
// Bedanya dengan provider.verification.test.ts: test itu menyalakan
// provider Express mini di localhost dan memverifikasi kontrak ke sana
// (bukti mekanisme). Test INI tidak menyalakan apa pun: verifier
// memutar ulang kontrak yang sama ke deployment Perpustakaan yang
// sedang live (default https://perpustakaan-shalawat.vercel.app,
// bisa diubah lewat env PROVIDER_BASE_URL).
//
// CATATAN FIXTURE: qad-kafani adalah fixture production yang
// menahan beban (load-bearing): kalau artikel ini di-unpublish,
// smoke run jadi merah bukan karena kode, melainkan karena state
// kontrak hilang. Jangan unpublish tanpa sadar konsekuensinya.
// State handlers di sini SENGAJA no-op, dan itu jujur, bukan celah:
// di production tidak ada endpoint setup state, dan state kontrak
// memang sudah terpenuhi oleh data live (qad-kafani PUBLISHED,
// does-not-exist tidak ada). Kalau suatu hari qad-kafani di-unpublish,
// verifikasi akan GAGAL pada interaksinya sendiri, dan itulah yang
// diinginkan: gagal berisik, bukan setup diam-diam yang menutupi.
// ============================================================================

import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { Verifier } from "@pact-foundation/pact";

// CATATAN PROXY (temuan 2026-11-04, jangan dihapus tanpa baca ini):
// Test lokal menghapus variabel proxy karena localhost tidak boleh
// lewat proxy, tapi test INI tidak menghapusnya: di runner GitHub
// tidak ada variabel proxy, jadi verifier jalan langsung seperti
// test lokal. Di sandbox Muse, verifikasi ke Vercel publik TIDAK
// BISA jalan dua-duanya: tanpa variabel proxy, TLS langsung gagal
// (EPROTO wrong version number, MITM egress); dengan variabel proxy,
// proxy Pact memakai HttpsProxyAgent dan rantai itu merusak body
// chunked (404 kecil lolos, body 8,7 KB gagal decode/timeout).
// Bukti mekanisme + endpoint tetap ada: test ini LOLOS 129ms melawan
// build Next.js lokal (PROVIDER_BASE_URL=http://localhost:3101,
// variabel proxy dihapus di shell) dengan kedua interaksi OK.
// Jadi run CI adalah pembuktian yang sahih untuk production,
// sementara run sandbox ke URL publik memang tidak didukung.
process.env.PACT_DO_NOT_TRACK = "true";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const providerBaseUrl =
  process.env.PROVIDER_BASE_URL ?? "https://perpustakaan-shalawat.vercel.app";

describe("PerpustakaanArticlesApi production provider verification", () => {
  it("satisfies the ReaderWeb contract on the live deployment", async () => {
    const verifier = new Verifier({
      provider: "PerpustakaanArticlesApi",
      providerBaseUrl,
      pactUrls: [path.resolve(dir, "pacts", "ReaderWeb-PerpustakaanArticlesApi.json")],
      stateHandlers: {
        "a published article with slug qad-kafani exists": async () => {
          // Data live sudah memenuhi state ini; tidak ada setup.
          return "Published qad-kafani article is present in production";
        },
        "no article with slug does-not-exist exists": async () => {
          // Slug ini tidak ada di production; provider akan 404.
          return "No article with that slug exists in production";
        },
      },
      logLevel: "warn",
      timeout: 60000,
      // Verifier Pact gagal mem-decode jawaban production yang
      // terkompresi (Vercel mengirim brotli/gzip + chunked untuk
      // body 8,7 KB ini, sementara interaksi 404 yang kecil lolos):
      // "error decoding response body" sesudah timeout 60 detik.
      // Minta identity encoding lewat request filter proxy, supaya
      // jawaban datang tanpa kompresi dan bisa di-decode apa adanya.
      // Ini bukan pengecualian kontrak: header Accept-Encoding
      // tidak ada di kontrak, dan isi jawaban tidak berubah.
      requestFilter: (req, _res, next) => {
        req.headers["accept-encoding"] = "identity";
        next();
      },
    });
    await verifier.verifyProvider();
  }, 120_000);
});
