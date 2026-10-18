// ============================================================================
// FILE INI NGAPAIN?
// Ini PROVIDER-nya: server HTTP kecil (pakai Express) yang melayani artikel.
//
// Ingat analoginya:
// - PROVIDER  = dapur / pelayan yang MENYEDIAKAN data (file ini).
// - CONSUMER  = tamu yang MEMINTA data (libraryClient.ts).
// Kontrak Pact adalah "kesepakatan tertulis" di antara keduanya soal
// bentuk data yang akan disajikan.
//
// Di dunia nyata, provider ini ceritanya adalah API-nya Perpustakaan.
// Di proyek latihan ini provider-nya kita bikin mini dan terpisah,
// datanya diambil dari articles.ts (bukan database beneran).
// ============================================================================

import express from "express";
import { findPublishedArticle } from "./articles.ts";

// PENTING: app di-export TANPA app.listen().
// Kenapa? Supaya test bisa menyalakan server ini di port berapa pun
// (termasuk port acak saat verifikasi Pact) dan mematikannya lagi
// sesudah test selesai. Yang menjalankan listen() beneran cuma:
// - server.ts            -> kalau kita mau menjalankan provider manual
// - test provider        -> dinyalakan sesaat khusus untuk diverifikasi
export const app = express();

// Satu-satunya endpoint di provider ini:
//   GET /articles/:slug      contoh: GET /articles/qad-kafani
// `:slug` adalah parameter — bagian URL yang berubah-ubah sesuai artikel
// yang diminta.
app.get("/articles/:slug", (req, res) => {
  // Cari artikelnya di "database" (articles.ts). Hanya yang PUBLISHED
  // yang ketemu; sisanya dianggap tidak ada.
  const article = findPublishedArticle(req.params.slug);

  // Tidak ketemu -> jawab 404 + pesan error JSON.
  // Bentuk jawaban 404 ini JUGA bagian dari kontrak (sudah dicatat
  // consumer di test-nya), jadi jangan diubah sembarangan.
  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  // Ketemu -> jawab 200 + artikelnya sebagai JSON.
  // JSON inilah yang bentuknya dijaga kontrak: field-fieldnya harus
  // tetap bernama id/title/slug/type/... dan unit-nya harus tetap
  // punya arab/latin/translation/english.
  res.status(200).json(article);
});
