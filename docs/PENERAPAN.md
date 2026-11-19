# Menerapkan lir-kit

Panduan langkah demi langkah. Rujukan lengkap ada di `README.md`; perubahan per versi di `CHANGELOG.md`.

Kit punya dua lapis:

- **Paket**: backend di `vendor/` (diperbarui lewat Composer) dan komponen React yang disalin ke `resources/js/lir-kit` (boleh ditimpa saat update).
- **Starter**: halaman, `app-layout`, `config/brand.ts`, `config/nav.ts`, CSS. Diterbitkan sekali, lalu **milik proyek**.

## Prasyarat

- [ ] PHP 8.3+, Laravel 12/13, Inertia (React), Tailwind v4
- [ ] `lucide-react` terpasang
- [ ] Komponen shadcn (base-nova) ada di `@/components/ui`: `alert`, `avatar`, `badge`, `breadcrumb`, `button`, `card`, `collapsible`, `dialog`, `dropdown-menu`, `field`, `input`, `input-group`, `kbd`, `table`, `checkbox`, `popover`, `radio-group`, `scroll-area`, `separator`, `sheet`, `sidebar`, `skeleton`, `spinner`, `switch`, `textarea`, `tooltip`
  - Yang kurang: `npx shadcn@latest add <nama>` (`sidebar` ikut membawa `@/hooks/use-mobile`)
- [ ] Ekstensi PHP `sodium` bila memakai License
- [ ] Tag versi terbaru sudah terbit di Packagist dan `CHANGELOG.md` mencakup fitur yang ingin dipakai

---

## Cara tercepat: installer

```powershell
composer require susantokun/lir-kit
php artisan lir-kit:install
```

Installer menampilkan daftar bagian (login OTP, email, menu, pengguna dan peran, audit, situs, license), menulis pilihan ke `config/lir-kit.php`,
menjalankan `migrate`, menyalin komponen React, dan (bila Anda setuju) hanya halaman starter milik bagian yang dipilih. Di akhir ia mencetak langkah manual
yang relevan (Gate, `share()`, dan lainnya). Aman diulang untuk mengubah pilihan.

Tanpa pertanyaan (skrip, CI): `php artisan lir-kit:install --only=otp,audit --starter` atau `--all`. Opsi lain: `--no-migrate`, `--no-js`, `--force`.
Bagian yang dimatikan tidak mendaftarkan rute dan perintahnya (404). `otp` otomatis membawa `mail`.

Langkah manual di bawah tetap berlaku; installer hanya menggantikan perintah publish dan pemilihan bagian.

---

## A. Proyek baru

### 1. Pasang paket dan starter

```powershell
composer require susantokun/lir-kit
php artisan migrate
php artisan vendor:publish --tag=lir-kit-config
php artisan vendor:publish --tag=lir-kit-js
php artisan vendor:publish --tag=lir-kit-starter
```

(Atau `php artisan lir-kit:install --starter` untuk memilih bagian dan hanya menyalin halaman yang perlu.)

### 2. Fortify: arahkan view ke halaman starter

```php
Fortify::loginView(fn () => Inertia::render('auth/login', LirKit::loginProps(request())));
// forgot-password, reset-password, two-factor-challenge, verify-email: pola yang sama
Fortify::authenticateThrough(fn () => [
    \Lir\Kit\Http\Middleware\EnsurePasswordLoginAllowed::class, // paling awal
    // ... pipeline Fortify Anda
]);
```

### 3. Izin (wajib, tanpa ini semua layar pengaturan 403)

`AppServiceProvider::boot()`:

```php
Gate::define('lir-kit.manage', fn ($user) => $user->isSuperadmin());
```

Atau pakai peran bawaan kit: set `register_gate => true` di `config/lir-kit.php`.

### 4. Model User

```php
use Lir\Kit\Concerns\HasLirRoles;

class User extends Authenticatable
{
    use HasLirRoles;
}
```

### 5. Middleware Inertia (`share()`)

```php
'auth' => ['user' => $request->user() ? [/* ..., */ 'id' => $request->user()->id] : null],
'menuOverrides' => fn () => $request->user() ? \Lir\Kit\LirKit::menuOverrides() : [],
'permissions'   => fn () => \Lir\Kit\LirKit::permissions($request->user()),
'features'      => fn () => \Lir\Kit\LirKit::features(),   // menu starter mengikuti bagian yang aktif
'site'          => fn () => \Lir\Kit\LirKit::site(),
'license'       => fn () => \Lir\Kit\LirKit::license(),
'twoFactor'     => fn () => ['enabled' => /* ... */ false, 'pending' => /* ... */ false],
```

### 6. Superadmin pertama

```powershell
php artisan lir-kit:grant email@anda.co.id
```

### 7. Sesuaikan

- [ ] `resources/js/config/brand.ts` (nama aplikasi, teks panel masuk)
- [ ] `resources/js/config/nav.ts` (menu, satu baris per halaman; `REQUIRES` memetakan halaman ke hak akses)
- [ ] `resources/js/lir-kit/adapters.ts` (`t()`, `notify()`, `KIT_API`)
- [ ] `app.css`: `@import './lir-kit-starter.css';`
- [ ] `config/lir-kit.php`: `permissions` aplikasi, `redirect_after_login`, `tenant_resolver` bila multi-tenant

### 8. Opsional

- [ ] `LoginHooks` (akun nonaktif, SSO, sesi tunggal, 2FA, audit); lihat bagian "Hubungkan aturan aplikasi" di README
- [ ] Jadwal: `Schedule::command('lir-kit:audit-verify')->dailyAt('03:00');`
- [ ] License: `LIR_LICENSE_SERVER_URL`, `LIR_LICENSE_PUBLIC_KEY`, `LIR_LICENSE_ENFORCE` di `.env`; jadwal `lir-kit:license-check --jitter=300`

### 9. Verifikasi

```powershell
php artisan test
pnpm run build
```

Buka `/login`, masuk sebagai Superadmin, lalu cek halaman Pengaturan (metode masuk, email, menu, pengguna, peran, audit).

---

## B. Proyek yang sudah berjalan

Prinsip: **pasang paket dulu, aktifkan fitur satu per satu**. Jangan langsung menerbitkan starter penuh karena akan menambah halaman auth, `app-layout`, dan nav yang bisa bertabrakan dengan milik Anda (berkas yang sudah ada tidak ditimpa tanpa `--force`).

### 1. Persiapan

- [ ] Backup database
- [ ] Commit/stash perubahan; kerjakan di branch terpisah
- [ ] Migrasi kit hanya **menambah** tabel berawalan `lir_`; tabel Anda tidak diubah

### 2. Pasang paket

```powershell
composer require susantokun/lir-kit
php artisan migrate
php artisan vendor:publish --tag=lir-kit-config
php artisan vendor:publish --tag=lir-kit-js
```

### 3. Izin

Definisikan Gate `lir-kit.manage`. Bila sudah punya sistem peran sendiri, petakan ke Gate Anda; tidak wajib memakai `lir_roles`.

### 4. Hubungkan aturan aplikasi (`LoginHooks`)

Penting untuk proyek lama: akun nonaktif, SSO, sesi tunggal, 2FA, riwayat login, audit. Buat kelas yang mengimplementasikan `Lir\Kit\Contracts\LoginHooks` dan ikat di `AppServiceProvider::register()`. Tanpa ini kit memakai `DefaultLoginHooks`.

### 5. Aktifkan fitur bertahap (dari yang paling aman)

Tanpa `features` di config, semua bagian aktif seperti biasa. Untuk proyek yang hanya butuh sebagian, jalankan `php artisan lir-kit:install --only=...` (lihat atas)
dan bagian lain tidak mendaftarkan rute apa pun.

| Urutan | Fitur | Yang dikerjakan | Catatan |
|---|---|---|---|
| 1 | Email pengirim dan template | `<MailSettingsCard />` + `<LoginCodeEmailCard />` di halaman pengaturan Anda | Saat saklar menyala, `MAIL_*` di `.env` ditimpa untuk **semua** email. Uji dengan tombol kirim email uji |
| 2 | Editor menu | share `menuOverrides`; `applyMenu()` di menu Anda; halaman `<MenuEditor />` | Beri tiap kelompok/folder `key` tetap; samakan `setLockedKeys` dengan `menu_locked` |
| 3 | Login OTP | `OtpLoginForm` di halaman login; middleware `EnsurePasswordLoginAllowed` | **Jangan pilih "OTP saja"** sebelum email terbukti terkirim |
| 4 | Pengguna dan peran | config `permissions`, trait `HasLirRoles`, `lir-kit:grant` | Bila tabel pengguna tidak standar, ikat `UserDirectory` sendiri |
| 5 | Audit, Situs, License | lihat README 6b, 6c, 6d | License mati secara bawaan |

### 6. Starter secara selektif

Salin hanya halaman yang dibutuhkan dari `vendor/susantokun/lir-kit/stubs/starter/js/...`. Berkas starter mengimpor `@/lir-kit/...`, `@/config/...`, `@/layouts/...`, jadi path itu harus ada di proyek. Alternatif: publish `--tag=lir-kit-starter --force` di branch terpisah, lalu tinjau `git diff` dan pertahankan yang berguna.

### 7. Verifikasi

```powershell
php artisan test
pnpm run build
```

Uji manual: login kata sandi tetap jalan, email uji terkirim, akun nonaktif tetap ditolak, menu lama tetap tampil.

---

## Memperbarui kit

```powershell
composer update susantokun/lir-kit
php artisan migrate
php artisan vendor:publish --tag=lir-kit-js --force   # hanya bila CHANGELOG menyebutnya
git diff resources/js/lir-kit                          # pulihkan adapters.ts bila tertimpa
php artisan test; pnpm run build
```

Aturan: hanya ubah `adapters.ts` di folder kit; sisanya dibungkus di berkas Anda sendiri agar `--force` aman. Baca bagian **Upgrade** di `CHANGELOG.md` untuk setiap versi, terutama saat minor di `0.x` atau mayor.

## Masalah umum

| Gejala | Penyebab | Solusi |
|---|---|---|
| Layar pengaturan 403 | Gate `lir-kit.manage` belum didefinisikan | Definisikan Gate (langkah A3/B3) |
| Komponen kit error impor | Komponen shadcn belum ada | `npx shadcn@latest add <nama>` |
| Setelah update, `adapters.ts` kembali bawaan | `--force` menimpanya | Pulihkan dari git |
| Tidak bisa menyimpan mode OTP | Mailer masih `log`/`array` di produksi | Atur SMTP dan kirim email uji dulu |
| Menu tidak ikut hak akses | `permissions` belum dibagikan | Tambah ke `share()` (langkah A5) |
