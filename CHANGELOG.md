# Changelog

Mengikuti [Semantic Versioning](https://semver.org/lang/id/). Tulis tiap rilis dengan bagian
**Backend**, **Frontend** (apakah perlu `vendor:publish --tag=lir-kit-js --force`), dan **Upgrade** (langkah khusus).

## [Belum dirilis] (rencana 0.3.0): starter kit, Fase 1 sampai 3

### Backend
- Baru: **pilih bagian yang dipakai.** Config baru `features` (`otp`, `mail`, `menu`, `access`, `audit`, `site`, `license`), **semua aktif secara bawaan** sehingga proyek yang sudah berjalan tidak berubah. Bagian yang dimatikan tidak mendaftarkan rute dan perintah artisan (404), `otp` butuh `mail` (ikut dinyalakan), `LoginMethod` mengabaikan mode OTP tersimpan bila `otp` mati, `MailSettings` tidak menimpa `MAIL_*` bila `mail` mati, `DefaultLoginHooks::audit()` hanya menulis `Log::info` bila `audit` mati, middleware `lir.license-writable` meneruskan semua bila `license` mati. Kelas baru `Lir\Kit\Features`, `LirKit::features()` (bagikan sebagai prop `features`), dan perintah `lir-kit:install` (interaktif atau `--only=otp,audit --starter --all --no-migrate --no-js --force`). Tabel `lir_*` tetap dibuat oleh migrasi. `LoginHooks` tidak berubah.
- Baru (Fase 3): pengguna, peran, dan hak akses. Migrasi baru `2026_02_01_000001` membuat `lir_roles`, `lir_role_permissions`, `lir_role_user` (migrasi lama tidak diubah). Rute JSON `/lir-kit/users` (daftar, tambah+undang, ubah, hapus, undang ulang) dan `/lir-kit/roles`, dijaga config baru `users_ability` dan `roles_ability` (null = memakai `ability`). Config baru `permissions`, `register_gate` (Gate::before dari peran), dan tiga nama tabel (semua punya default).
- Baru: kontrak `UserDirectory` (bawaan `EloquentUserDirectory`), layanan `Access`, trait `HasLirRoles`, `LirKit::permissions($user)`, notifikasi undangan, perintah `lir-kit:grant {email} {role=superadmin}`. `LoginHooks` tidak berubah.
- Pengaman: Superadmin terakhir dan akun yang sedang dipakai tidak bisa dihapus atau dinonaktifkan; peran bawaan tidak bisa diubah; peran dipisah per tenant.
- Baru: tag publish `lir-kit-starter` (halaman auth, `layouts/app-layout.tsx`, `config/brand.ts`, `config/nav.ts`, `css/lir-kit-starter.css` dari `stubs/starter`).
- Baru: **Log Audit** tahan-ubah. Migrasi baru `2026_03_01_000001` membuat `lir_audit_logs` dan `lir_audit_checkpoints`. Tiap entri menyimpan hash entri sebelumnya (rantai SHA-256); model `AuditLog` tambah-saja (ubah/hapus ditolak). `DefaultLoginHooks::audit()` kini menulis ke tabel ini (jatuh ke `Log::info` bila tabel belum ada, jadi tidak ada yang rusak). Nilai bernama `password`, `secret`, `token`, atau `kata_sandi` disamarkan. Rute `GET /lir-kit/audit-log` (cari, filter, halaman), `GET .../export` (CSV, sel berawalan `=`, `+`, `-`, `@` dinetralkan, tercatat), `POST .../verify`, `GET .../checkpoints`; perintah `lir-kit:audit-verify` untuk penjadwal. Config baru `audit_ability` (null = memakai `ability`) dan nama tabel `audit_logs`, `audit_checkpoints` (punya default). Proyek yang mengikat `LoginHooks` sendiri tidak terpengaruh.
- Baru: **Pengaturan Situs** (nama, deskripsi singkat, email kontak, logo, favicon). Data di `lir_settings` kunci `site` (tanpa migrasi). Rute `GET|POST /lir-kit/site` (butuh `ability`) dan `GET /lir-kit/site/{logo|favicon}` (publik, agar halaman masuk bisa menampilkannya). Hanya JPG/PNG/WebP (logo) dan PNG/ICO/JPG/WebP (favicon); SVG ditolak. Config baru `disk` (null = disk bawaan aplikasi). `LirKit::site()` untuk dibagikan sebagai prop Inertia `site`.
- Baru: **License** (aktivasi online ke portal license, berkas `.lic` bertanda tangan Ed25519, status aktif/masa tenggang/habis/dicabut/ditolak, pemeriksaan berkala). Kode di `Support/Licensing`; rute `GET /lir-kit/license`, `POST .../activate`, `.../upload`, `.../check` (butuh `ability`, tercatat di log audit dengan key disamarkan); perintah `lir-kit:license-check {--jitter=}`; middleware `lir.license-writable` (aplikasi baca-saja tanpa license yang berlaku; tambahkan sendiri ke grup rute Anda); `LirKit::license()` untuk prop `license` (strip peringatan). Config baru `license` (`server_url`, `public_key`, `enforce`, `path`, `timeout`, `exempt_routes`), **semuanya mati secara bawaan**: tanpa kunci publik halaman hanya menjelaskan cara memasang, dan tanpa `enforce` license tidak membatasi apa pun (kuota user dan modul dari license ikut berlaku hanya saat `enforce` menyala). Butuh ekstensi PHP `sodium` hanya bila fitur ini dipakai. Berkas license disimpan di `storage/app/private/lir-license`, bukan di database.
- Berubah: `GET /lir-kit/users` kini juga mengirim `stats` (`total`, `active`, `inactive`); kunci lama tidak berubah.

### Frontend
- Berubah (perlu `vendor:publish --tag=lir-kit-js --force`, lalu pulihkan `adapters.ts`): **konfirmasi sebelum aksi yang tidak biasa.** `ImagePicker` (foto profil, logo, favicon) kini bertanya sebelum menghapus gambar tersimpan; kartu Template email kode bertanya sebelum "Kembalikan ke bawaan"; editor menu bertanya sebelum menghapus entri buatan sendiri (folder berisi dikatakan jelas). Yang sudah bertanya tidak berubah: hapus dan nonaktifkan pengguna, hapus peran, ekspor dan verifikasi log audit, kembalikan menu ke bawaan, keluar. Starter `pages/settings/security.tsx` bertanya sebelum menonaktifkan 2FA (milik proyek: salin sendiri bila halaman Anda sudah diubah).
- Berubah di starter (milik proyek, tidak tertimpa): `config/nav.ts` punya parameter kedua `buildNav(permissions?, features?)` dan halaman tiap bagian hilang dari menu bila `features[bagian]` bernilai false; `layouts/app-layout.tsx` dan `pages/settings/menu.tsx` meneruskan prop `features`. Tanpa prop itu semua menu tampil seperti sebelumnya.
- Baru di paket (disalin dengan `--tag=lir-kit-js`): `layouts/auth-split-layout.tsx` (layout masuk berpanel merek), `layouts/app-shell.tsx` (sidebar tiga level yang bisa diciutkan, bilah atas dengan breadcrumb, pencarian Ctrl K, tema, menu akun, tampilan ponsel), `layouts/page-header.tsx`, `shell/*` (sidebar, pencarian, menu akun, tema, logo, dialog konfirmasi), `hooks/use-appearance.ts`, `nav.ts` (breadcrumb dan daftar halaman dari menu).
- Baru di starter (milik proyek): halaman `auth/{login,forgot-password,reset-password,two-factor-challenge,verify-email}`; memakai URL bawaan Fortify.
- Baru di paket (Fase 2): `layouts/settings-layout.tsx` (menu samping pengaturan dari folder menu), `layouts/form-card.tsx` (`FormCard`, `FormGrid`), `shell/appearance-card.tsx` (pilihan tema).
- Baru di starter (Fase 2): `pages/settings/{login-method,mail,menu,profile,security,appearance}.tsx`, `layouts/settings-page.tsx`; menu bawaan kini punya folder Pengaturan dan Akun saya. Profil, keamanan, dan 2FA memakai endpoint akun Fortify dan prop `twoFactor`.
- Baru di paket (Fase 3): `access/users-panel.tsx`, `access/roles-panel.tsx`. Baru di starter: `pages/access/{users,roles}.tsx`; `config/nav.ts` kini menyembunyikan halaman menurut `permissions` (`buildNav(permissions?)`, peta `REQUIRES`).
- Syarat shadcn bertambah: `table`, `checkbox`.
- Baru di paket (perlu `vendor:publish --tag=lir-kit-js --force`, lalu pulihkan `adapters.ts`): `search-select.tsx` (dropdown ber-pencarian; menggantikan `native-select`, yang tidak lagi dipakai kit), `form-drawer.tsx` (form dalam laci kanan; pengguna dan peran memakainya), `image-picker.tsx`, `site-settings-card.tsx`, `layouts/page-actions.tsx` (`PageActions` menaruh tombol utama di header halaman), `access/audit-panel.tsx`, `access/audit-labels.ts`, `license-panel.tsx`, `shell/license-banner.tsx`, `collapsible-card.tsx` (kartu yang bisa dilipat; kartu Titik acuan di Log Audit memakainya, tertutup bawaan), `date-range-picker.tsx` (pemilih periode dua bulan dengan preset, tanpa dependensi baru; Log Audit memakainya).
- Berubah di paket: editor menu (`menu-editor.tsx`) kini bisa **drag and drop** (genggaman di tiap baris dan bagian; urutan saudara satu daftar, HTML5 bawaan tanpa dependensi; tombol naik/turun tetap ada untuk layar sentuh) dan punya tombol **"Tambah menu"** yang jelas di tiap bagian (menggantikan ikon folder-plus di judul bagian). Bagian (grup) baru belum bisa dibuat: bagian berasal dari menu bawaan aplikasi.
- Berubah di paket: halaman Pengguna kini punya kartu statistik, status berwarna, tombol "Tambah pengguna" di header, dan aksi baris berupa dropdown (Ubah profil, Ubah peran, Kirim ulang undangan, Aktifkan/Nonaktifkan, Hapus). `SettingsLayout` punya tempat tombol di sebelah judul, dan folder menu boleh punya `description` (field baru opsional di `KitNavLeaf`). Animasi `slide-in` pada `<main>` di `app-shell.tsx` dihapus (tinggal fade) agar jarak header tidak melompat.
- Berubah di starter (milik proyek, tidak tertimpa): menu bawaan disusun ulang (Utama; Administrasi > Akses; Lainnya > Pengaturan > Situs, Email, Sistem > Menu, License; Akun) dan kunci grup `group.akun` menjadi `group.lainnya`, jadi override menu tersimpan untuk grup Akun tidak terbawa. `layouts/settings-page.tsx` kini memakai header halaman berlebar penuh (tanpa menu samping). Halaman baru: `pages/access/audit.tsx`, `pages/settings/{site,license}.tsx`; halaman Profil punya kartu Foto profil (rute `POST|DELETE /profile/avatar` milik aplikasi, bagikan `auth.user.avatar`); `layouts/app-layout.tsx` memakai prop `site` untuk nama, logo, dan favicon, dan prop `license` untuk strip peringatan.
- Komponen lama tidak berubah; `adapters.ts` tidak mendapat ekspor baru. Terjemahan Inggris baru ada di `lang.en.json`.
- Syarat shadcn bertambah: `avatar`, `breadcrumb`, `collapsible`, `dropdown-menu`, `input-group`, `kbd`, `scroll-area`, `sheet`, `sidebar`, `tooltip`.

### Tooling
- Tes baru: `FeaturesTest`, `FeaturesOffTest`, `FeaturesPartialTest` (semua aktif, semua mati, dan sebagian; `TestCase::$features` mengatur config sebelum aplikasi menyala).
- Berubah di starter: `css/lir-kit-starter.css` punya aturan cetak (tanpa sidebar dan bilah atas, tabel tidak terpotong atau bergulir).
- Playground: Dashboard berwarna (kartu ringkasan, grafik batang, donat, antrean per tahap, aktivitas) dan Laporan (periode tanggal, saringan, tabel, ekspor CSV dengan konfirmasi, cetak semua baris), keduanya memakai data buatan yang tetap untuk tanggal yang sama (`workbench/resources/js/lib/dummy.ts`); hanya untuk playground, tidak ikut terpasang.
- Playground: nama dan judul tab kini `LIR-KIT`, ada favicon, rute foto profil demo (`/profile/avatar`, kolom `users.avatar_path` lewat migrasi playground), dan `site` dibagikan ke semua halaman. Tes baru: `AuditLogTest`, `SiteSettingsTest`, dan `stats` di `AccessTest`.
- Playground memakai starter apa adanya (alias `@/lir-kit`, `@/config`, `@/layouts`); rute demo meniru URL Fortify (Password broker untuk lupa dan atur ulang kata sandi). Halaman pengaturan dan editor menu kini dibungkus `AppLayout`.

### Upgrade
- Tidak ada langkah wajib untuk fitur pilih-bagian: tanpa `features` semuanya tetap aktif. Untuk mematikan sebagian: `php artisan lir-kit:install` (atau ubah `features` di config, lalu `config:clear` bila config di-cache) dan bagikan `'features' => fn () => \Lir\Kit\LirKit::features()` agar menu starter mengikuti.
- `php artisan migrate` (tabel peran dan tabel log audit). Bagikan `site` ke halaman (`'site' => fn () => LirKit::site()`) bila memakai Pengaturan Situs, jadwalkan `Schedule::command('lir-kit:audit-verify')->dailyAt('03:00')` bila ingin pemeriksaan harian, dan lihat README 6d bila memakai License (config `license` mati secara bawaan). Tidak ada langkah wajib lain. Untuk memakai UI baru: `vendor:publish --tag=lir-kit-js --force` (lalu pulihkan `adapters.ts`) dan `vendor:publish --tag=lir-kit-starter`.

## [0.2.2] - 2026-11-19

### Backend
- Tidak ada perubahan.

### Frontend
- `otp-login-form.tsx`: perbaiki impor tipe `SessionConflict` yang masih menunjuk ke `@/components/session-conflict-dialog` (milik aplikasi) menjadi `./session-conflict-dialog`. Tanpa ini proyek yang tidak punya file itu gagal build. Ditemukan lewat playground baru. Perlu `vendor:publish --tag=lir-kit-js --force` (lalu pulihkan `adapters.ts`), atau ubah satu baris impor itu secara manual.

### Tooling
- Playground (`workbench/`) untuk mengembangkan kit; tidak ikut terpasang ke proyek lain.

### Upgrade
- `composer update susantokun/lir-kit`.

## [0.2.1] - 2026-11-19

### Backend
- Tidak ada perubahan.

### Frontend
- `menu-editor.tsx`: bar Simpan menu diberi jarak kiri kanan. Perlu `vendor:publish --tag=lir-kit-js --force` (lalu pulihkan `adapters.ts` Anda), atau tambahkan kelas `mx-3 sm:mx-6` pada bar secara manual.

### Upgrade
- `composer update susantokun/lir-kit`.

## [0.2.0] - 2026-11-18

### Backend
- Baru: config `menu_ability` — ability khusus untuk editor menu (null = memakai `ability`). Berguna bila pengelola menu berbeda dari pengelola login/email.
- Baru: `LirKit::menuOverrides($tenant)` menerima tenant eksplisit, untuk halaman yang dirender sebelum tenant aktif diketahui.

### Frontend
- Tidak ada perubahan; tidak perlu publish ulang.

### Upgrade
- `composer update susantokun/lir-kit`. Tanpa perubahan wajib; perilaku lama tetap.

## [0.1.1] - 2026-11-18

### Backend
- Tambah lisensi MIT (file LICENSE dan composer.json). Tidak ada perubahan perilaku.

### Frontend
- Tidak ada perubahan; tidak perlu publish ulang.

### Upgrade
- `composer update susantokun/lir-kit`.

## [0.1.0] - 2026-11-18

Rilis pertama, diambil dari aplikasi DIVA.

### Backend
- Login email + OTP: kirim, kirim ulang, verifikasi, batal. Kode ter-hash, sekali pakai, kedaluwarsa, dibatasi percobaan dan permintaan, jawaban sama untuk email yang tidak terdaftar.
- Mode masuk (`password` / `otp` / `both`) dan aturan kode (panjang, masa berlaku, batas salah, jeda kirim ulang, batas per jam) yang bisa diubah admin.
- Email pengirim dari UI (SMTP, kata sandi terenkripsi), email uji, template email kode yang bisa diubah dengan layout HTML.
- Editor menu sidebar per tenant: judul, ikon, urutan, sembunyikan, tautan dan folder sendiri sampai tiga level; alamat divalidasi.
- Kontrak `LoginHooks` untuk menyambungkan aturan aplikasi (akun nonaktif, SSO, sesi ganda, 2FA, riwayat, audit).
- Tabel baru: `lir_login_codes`, `lir_settings`, `lir_menu_settings`.

### Frontend
- Komponen React baru di `resources/js` (`adapters.ts` adalah satu-satunya file yang perlu Anda ubah).

### Upgrade
- Pasang pertama kali: lihat README.
