// ============================================================================
// FILE INI NGAPAIN?
// Pintu masuk kalau kita mau menjalankan provider-nya SAJA secara manual,
// misalnya buat dicoba-coba pakai browser / curl:
//
//   npm run start:provider
//   lalu buka http://localhost:8081/articles/qad-kafani
//
// File ini TIDAK dipakai oleh test sama sekali. Test menyalakan app-nya
// sendiri lewat app.ts (lihat test/provider.verification.test.ts).
// Sengaja dipisah: app.ts = resep servernya, server.ts = "tombol on"-nya.
// ============================================================================

import { app } from "./app.ts";

// Port bisa diganti lewat environment variable PORT; kalau tidak di-set,
// default-nya 8081.
const port = Number(process.env.PORT ?? 8081);

app.listen(port, () => {
  console.log(`PerpustakaanArticlesApi listening on http://localhost:${port}`);
});
