# Changelog

Mengikuti [Semantic Versioning](https://semver.org/lang/id/). Tulis tiap rilis dengan bagian
**Backend**, **Frontend** (apakah perlu `vendor:publish --tag=lir-kit-js --force`), dan **Upgrade** (langkah khusus).

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
