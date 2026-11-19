# lir-kit

Paket Composer `susantokun/lir-kit` (Laravel + Inertia + React): login email + OTP, email pengirim dan template, editor menu.
Dipakai oleh banyak proyek (DIVA dan lainnya), jadi perubahan di sini harus **kompatibel ke belakang** dan mudah di-update.
Baca `README.md` (pasang, pakai, update) sebelum mengubah apa pun.

## Cara bekerja

- Kembangkan dan lihat hasilnya di **playground** (`workbench/`), bukan di proyek lain:
  `composer serve` + `pnpm dev`, buka `http://127.0.0.1:8000`. Komponen yang tampil adalah source asli di `resources/js` (alias `@lir-kit`).
- Sebelum commit: `vendor/bin/pest` dan `pnpm types:check` harus bersih. Perubahan perilaku wajib ada tesnya (`tests/`, Orchestra Testbench).
  Baca skill `testing-best-practices` sebelum menulis tes.
- Skill di `.claude/skills/` (`git-commit`, `changelog-generator`, `laravel-best-practices`, `testing-best-practices`,
  `tailwindcss-development`, `inertia-react-development`) adalah salinan dari proyek DIVA. `search-docs` (Laravel Boost) **tidak ada** di repo ini:
  baca source di `vendor/` atau dokumentasi resmi untuk memastikan API sesuai versi terpasang.
- Jangan menambah dependensi PHP atau JS tanpa persetujuan. `package.json` dan `workbench/` hanya untuk pengembangan, tidak ikut terpasang ke proyek lain.

## Aturan kompatibilitas (jangan dilanggar)

1. **Migrasi lama tidak pernah diubah.** Perubahan skema = file migrasi baru dengan timestamp baru.
2. **Kunci di tabel `lir_settings`** (`login_method`, `mail`, `login_code_email`) harus tetap terbaca; kunci atau field baru wajib punya default.
3. **Config baru** harus punya nilai bawaan di `config/lir-kit.php` sehingga proyek yang belum menerbitkan config tidak rusak.
4. **Kontrak `LoginHooks`:** menambah method baru = perubahan besar (mayor). Bila perlu, beri default lewat `DefaultLoginHooks` dan dokumentasikan.
5. **Nama rute, nama prop Inertia** (`loginMode`, `otpEmail`, `otpLength`, `resendIn`, `devCode`, `menuOverrides`), dan key session (`lir_otp_email`) adalah API publik: jangan diganti diam-diam.
6. **Keamanan OTP tidak boleh melemah:** kode ter-hash, sekali pakai, kedaluwarsa, dibatasi percobaan, jawaban sama untuk email tak terdaftar, kode hanya tampil saat `APP_ENV=local`.
   Pengaturan tertutup bila ability `lir-kit.manage` belum didefinisikan; alamat menu hanya `http(s)://` atau `/path` (bukan `javascript:` atau `//host`).

## Dua lapis: paket dan starter

- **Lapis paket** (`resources/js`, `--tag=lir-kit-js`): komponen, layout (`layouts/`), dan shell (`shell/`) yang diperbarui lewat update. Generik: merek, menu, pengguna, dan fitur khusus aplikasi masuk lewat **props/slot**, bukan ekspor baru di `adapters.ts` (adapters proyek lama tidak boleh rusak).
- **Lapis starter** (`stubs/starter`, `--tag=lir-kit-starter`): halaman, `layouts/app-layout.tsx`, `config/brand.ts`, `config/nav.ts`, CSS. Diterbitkan sekali dan jadi milik proyek. Berkas starter mengimpor `@/lir-kit/...`, `@/config/...`, `@/layouts/...` (path sebagaimana di proyek). Halaman auth memakai URL bawaan Fortify.
- Playground menjalankan `stubs/starter` apa adanya lewat alias Vite/tsconfig; jangan menyalin berkas starter ke `workbench/`. Rute playground (`workbench/routes/web.php`) meniru URL Fortify.
- Fase berikutnya: Fase 2 halaman pengaturan (profil, keamanan, tampilan), Fase 3 manajemen pengguna dan peran (rancang backend generik dan usulkan ke user dulu).

## Aturan React (`resources/js`)

- Komponen kit disalin ke tiap proyek (`vendor:publish --tag=lir-kit-js`). Satu-satunya file yang boleh disesuaikan proyek adalah `adapters.ts`.
  Karena itu **komponen kit hanya boleh mengimpor**: file lain di folder kit (`./...`), `@/components/ui/*` dan `@/lib/utils` (shadcn standar), serta paket npm.
  Jangan mengimpor apa pun dari `@/lib/api`, `@/lib/i18n`, `@/lib/notify`, atau komponen milik aplikasi: lewat `./adapters`. (Bug v0.2.2 berasal dari ini.)
- Gaya komponen mengikuti **shadcn/ui** (Base UI) yang dipakai playground: `Field`, `FieldLabel`, `Card`, `Button`, dan seterusnya. Pakai skill `shadcn` untuk menambah atau memeriksa komponen,
  dan `tailwindcss-development` untuk kelas Tailwind v4. Jangan menulis gaya sendiri bila komponen shadcn tersedia.
- shadcn: `components.json` di root menunjuk ke playground, dan `.mcp.json` memasang MCP `shadcn`. Menambah komponen: `npx shadcn@latest add <nama>`
  (terpasang ke `workbench/resources/js/components/ui`). Skill `shadcn` ada di `.claude/skills/shadcn`.
  Komponen yang dipakai kit harus ada di daftar syarat README ("Syarat"), karena proyek pemakai harus memilikinya.
- Semua teks UI **Bahasa Indonesia** lewat `t()`; teks sisi server lewat `__()`. Tambahkan terjemahan Inggris di `lang/en.json` (server) dan `resources/js/lang.en.json` (klien).
- Perubahan di komponen React berarti proyek harus `vendor:publish --tag=lir-kit-js --force` (lalu memulihkan `adapters.ts`): **tulis itu di CHANGELOG** pada bagian Frontend.

## Aturan PHP

- PHP 8.3, tipe eksplisit, kurung kurawal selalu, constructor property promotion, PHPDoc ketimbang komentar inline. Ikuti skill `laravel-best-practices`.
- Nama deskriptif; teks sumber `__()` ditulis Bahasa Indonesia.
- Controller memakai `Gate::authorize(config('lir-kit.ability'))` (menu: `menu_ability`), bukan cek peran sendiri.
- Perilaku yang bergantung pada aturan aplikasi (akun nonaktif, SSO, sesi, 2FA, audit) lewat `LoginHooks`, bukan hardcode.

## Commit

Ikuti skill `git-commit`: `Prefix(scope): deskripsi` (Bahasa Indonesia, kata kerja huruf kecil, tanpa titik, maksimal 72 karakter).
**Jangan menambahkan `Co-Authored-By`** pada commit. Scope yang dipakai: `kit`, `auth`, `mail`, `menu`, `playground`, `docs`.

## Changelog dan rilis

- Setiap perubahan yang terpasang ke proyek lain dicatat di `CHANGELOG.md`. **Format kit ini** (menggantikan format bawaan skill `changelog-generator`):
  versi terbaru di atas, `## [X.Y.Z] - YYYY-MM-DD`, lalu bagian **Backend**, **Frontend** (sebut apakah perlu `vendor:publish --tag=lir-kit-js --force`),
  **Tooling** (bila ada), dan **Upgrade** (langkah khusus). Tulis untuk pengguna paket, bukan menyalin subject commit.
- Semver: perubahan yang memecah kompatibilitas = mayor; fitur baru kompatibel = minor; perbaikan = patch. Selama `0.x`, perubahan yang memecah kompatibilitas menaikkan minor dan ditandai jelas di Upgrade.
- Alur rilis: ubah dan coba di playground, jalankan tes, perbarui `CHANGELOG.md`, commit, `git tag vX.Y.Z`, `git push origin main --tags`.
  **Jangan mendorong (push) atau membuat tag tanpa diminta**; tes harus hijau dulu. Jangan memindahkan tag yang sudah terbit; perbaikan = rilis patch baru.
- Packagist memperbarui otomatis dari tag; proyek pemakai cukup `composer update susantokun/lir-kit` (dan publish ulang JS bila CHANGELOG menyebutnya).
- Perubahan hanya di `workbench/`, `tests/`, atau dokumentasi tidak perlu tag baru.
