# Changelog

Mengikuti [Semantic Versioning](https://semver.org/lang/id/). Tulis tiap rilis dengan bagian
**Backend**, **Frontend** (apakah perlu `vendor:publish --tag=lir-kit-js --force`), dan **Upgrade** (langkah khusus).

## [Belum dirilis] (rencana 0.3.0): starter kit, Fase 1 sampai 3

### Backend
- Baru (Fase 3): pengguna, peran, dan hak akses. Migrasi baru `2026_02_01_000001` membuat `lir_roles`, `lir_role_permissions`, `lir_role_user` (migrasi lama tidak diubah). Rute JSON `/lir-kit/users` (daftar, tambah+undang, ubah, hapus, undang ulang) dan `/lir-kit/roles`, dijaga config baru `users_ability` dan `roles_ability` (null = memakai `ability`). Config baru `permissions`, `register_gate` (Gate::before dari peran), dan tiga nama tabel (semua punya default).
- Baru: kontrak `UserDirectory` (bawaan `EloquentUserDirectory`), layanan `Access`, trait `HasLirRoles`, `LirKit::permissions($user)`, notifikasi undangan, perintah `lir-kit:grant {email} {role=superadmin}`. `LoginHooks` tidak berubah.
- Pengaman: Superadmin terakhir dan akun yang sedang dipakai tidak bisa dihapus atau dinonaktifkan; peran bawaan tidak bisa diubah; peran dipisah per tenant.
- Baru: tag publish `lir-kit-starter` (halaman auth, `layouts/app-layout.tsx`, `config/brand.ts`, `config/nav.ts`, `css/lir-kit-starter.css` dari `stubs/starter`).

### Frontend
- Baru di paket (disalin dengan `--tag=lir-kit-js`): `layouts/auth-split-layout.tsx` (layout masuk berpanel merek), `layouts/app-shell.tsx` (sidebar tiga level yang bisa diciutkan, bilah atas dengan breadcrumb, pencarian Ctrl K, tema, menu akun, tampilan ponsel), `layouts/page-header.tsx`, `shell/*` (sidebar, pencarian, menu akun, tema, logo, dialog konfirmasi), `hooks/use-appearance.ts`, `nav.ts` (breadcrumb dan daftar halaman dari menu).
- Baru di starter (milik proyek): halaman `auth/{login,forgot-password,reset-password,two-factor-challenge,verify-email}`; memakai URL bawaan Fortify.
- Baru di paket (Fase 2): `layouts/settings-layout.tsx` (menu samping pengaturan dari folder menu), `layouts/form-card.tsx` (`FormCard`, `FormGrid`), `shell/appearance-card.tsx` (pilihan tema).
- Baru di starter (Fase 2): `pages/settings/{login-method,mail,menu,profile,security,appearance}.tsx`, `layouts/settings-page.tsx`; menu bawaan kini punya folder Pengaturan dan Akun saya. Profil, keamanan, dan 2FA memakai endpoint akun Fortify dan prop `twoFactor`.
- Baru di paket (Fase 3): `access/users-panel.tsx`, `access/roles-panel.tsx`. Baru di starter: `pages/access/{users,roles}.tsx`; `config/nav.ts` kini menyembunyikan halaman menurut `permissions` (`buildNav(permissions?)`, peta `REQUIRES`).
- Syarat shadcn bertambah: `table`, `checkbox`.
- Komponen lama tidak berubah; `adapters.ts` tidak mendapat ekspor baru. Terjemahan Inggris baru ada di `lang.en.json`.
- Syarat shadcn bertambah: `avatar`, `breadcrumb`, `collapsible`, `dropdown-menu`, `input-group`, `kbd`, `scroll-area`, `sheet`, `sidebar`, `tooltip`.

### Tooling
- Playground memakai starter apa adanya (alias `@/lir-kit`, `@/config`, `@/layouts`); rute demo meniru URL Fortify (Password broker untuk lupa dan atur ulang kata sandi). Halaman pengaturan dan editor menu kini dibungkus `AppLayout`.

### Upgrade
- `php artisan migrate` (tabel peran). Tidak ada langkah wajib lain. Untuk memakai UI baru: `vendor:publish --tag=lir-kit-js --force` (lalu pulihkan `adapters.ts`) dan `vendor:publish --tag=lir-kit-starter`.

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
