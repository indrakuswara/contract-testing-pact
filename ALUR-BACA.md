# Panduan Baca — Alur Contract Testing di Repo Ini

Ditulis buat dibaca sebelum / sambil membuka kodenya. Semua file kode
sudah diberi komentar Bahasa Indonesia; file ini peta jalannya.

## Gambaran besar dalam 30 detik

Ada dua pihak:

- **Consumer** = si pemakai data. Di sini namanya `ReaderWeb` — ceritanya
  halaman reader Perpustakaan. Kodenya: `src/consumer/libraryClient.ts`.
- **Provider** = si penyedia data. Di sini namanya
  `PerpustakaanArticlesApi` — ceritanya API Perpustakaan.
  Kodenya: `src/provider/app.ts` + datanya di `src/provider/articles.ts`.

Masalah yang dijaga: provider bisa berubah kapan saja (field di-rename,
lapis bacaan dihapus, tipe diganti). Consumer tidak akan tahu sampai
reader-nya rusak di tangan pembaca. **Contract testing memasang alarm
di tengah**: consumer menuliskan kebutuhannya sebagai file kontrak,
dan provider wajib membuktikan ia masih menepati kontrak itu setiap
kali test jalan.

## Urutan baca kode

1. `src/provider/articles.ts` — bentuk datanya dulu. Perhatikan tipe
   `Article` dan `ArticleUnit` (unit = 1 bait, 4 lapis:
   arab / latin / translation / english). Nama-nama field di sinilah
   yang dijaga kontrak.
2. `src/provider/app.ts` — provider-nya. Cuma 1 endpoint:
   `GET /articles/:slug` → 200 + artikel, atau 404.
   (`src/provider/server.ts` cuma tombol on buat jalan manual,
   boleh dibaca sekilas saja.)
3. `src/consumer/libraryClient.ts` — consumer-nya. Satu fungsi:
   `getArticle(baseUrl, slug)`. Perhatikan: fungsi ini tidak tahu ia
   sedang bicara ke server beneran atau server palsu — alamatnya cuma
   parameter. Sifat itu yang membuat langkah 4 bisa jalan.
4. `test/consumer.pact.test.ts` — **jantung sisi consumer.**
   Pact menyalakan *mock server* (provider palsu yang jawabannya kita
   atur), client asli menembak ke sana, dan Pact mencatat janjinya ke
   `pacts/ReaderWeb-PerpustakaanArticlesApi.json`. Itulah file
   kontraknya — buka file JSON itu sesudah baca test ini, bentuknya
   akan masuk akal.
5. `test/provider.verification.test.ts` — **jantung sisi provider.**
   Provider asli dinyalakan di port acak, lalu Pact *memutar ulang*
   semua request dari file kontrak ke provider asli dan membandingkan
   jawabannya dengan janji. Meleset satu → gagal.

## Cara menjalankan

```bash
npm run test:consumer   # bikin / perbarui file kontrak di pacts/
npm run test:provider   # periksa provider asli terhadap kontrak itu
npm test                # dua-duanya, berurutan — ini yang biasa dipakai
```

Selalu consumer dulu, baru provider: kontraknya harus ada dulu
sebelum bisa diperiksa.

## Eksperimen yang membuktikan gunanya

Sudah pernah dilakukan saat repo ini dibangun (log-nya di
`VERIFICATION-NOTES.md`), dan gampang diulang sendiri:

1. Pastikan `npm test` hijau.
2. Di `src/provider/articles.ts`... sebenarnya cukup di satu tempat:
   ganti nama field `translation` jadi `terjemahan` di data provider.
   (Kodenya tetap jalan. Tidak ada test unit yang marah.)
3. Jalankan `npm run test:provider` → **GAGAL**:
   `Actual map is missing the following keys: translation`.
4. Kembalikan lagi → hijau lagi.

Pelajaran dari eksperimen itu: yang dijaga kontrak bukan "apakah kode
provider jalan", melainkan "apakah provider masih menepati janji
bentuk data ke consumer". Dua hal yang berbeda — test biasa memeriksa
yang pertama, contract test memeriksa yang kedua.

## Kaitan ke karier QA

- Consumer test ≈ menulis ekspektasi dari sudut pandang pemakai API.
- Provider verification ≈ regression test buat API yang memeriksa
  *kesepakatan antar-tim*, bukan cuma fungsi satu tim.
- Di perusahaan dengan banyak service, file kontrak inilah yang
  mencegah satu tim merusak tim lain tanpa ketahuan sebelum deploy.
