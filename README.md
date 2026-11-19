# lir-kit

Paket Laravel + Inertia + React yang berisi tiga fitur siap pakai:

1. **Login tanpa kata sandi (email + OTP)** yang bisa diatur: kata sandi saja, kode email saja, atau keduanya.
   Kode disimpan ter-hash, sekali pakai, kedaluwarsa, dibatasi percobaan, dan tidak membocorkan apakah email terdaftar.
2. **Email pengirim dari UI**: server SMTP, alamat pengirim, kata sandi terenkripsi, tombol kirim email uji, dan
   **template email kode** (subjek + isi) yang bisa diubah, dengan layout HTML yang sudah rapi.
3. **Editor menu sidebar**: ganti judul dan ikon, ubah urutan, sembunyikan, tambah tautan atau folder sendiri
   (sampai tiga level), per tenant bila aplikasi Anda multi-tenant.

Di kode kit, teks sumber ditulis Bahasa Indonesia (`__()` dan `t()`); terjemahan Inggris ikut dikirim.

## Isi paket

| Bagian | Lokasi | Cara sampai ke aplikasi |
|---|---|---|
| Backend (rute, controller, model, migrasi, notifikasi, layanan) | `src/`, `routes/`, `database/` | otomatis (service provider + `composer update`) |
| Konfigurasi | `config/lir-kit.php` | `vendor:publish --tag=lir-kit-config` |
| Layout email | `resources/views/mail` | otomatis; salin bila ingin mengubah: `--tag=lir-kit-views` |
| Komponen dan layout React (shell, layout auth, kartu pengaturan) | `resources/js` | disalin ke `resources/js/lir-kit` dengan `--tag=lir-kit-js` (boleh ditimpa saat update) |
| **Starter** (halaman auth, layout aplikasi, menu, merek) | `stubs/starter` | diterbitkan **sekali** dengan `--tag=lir-kit-starter`; setelah itu milik proyek Anda |

## Syarat

PHP 8.3+, Laravel 12/13, Inertia (React), Tailwind v4 + komponen shadcn/ui (gaya base-nova, Base UI) di `@/components/ui`:
`alert`, `avatar`, `badge`, `breadcrumb`, `button`, `card`, `collapsible`, `dialog`, `dropdown-menu`, `field`, `input`, `input-group`, `kbd`, `native-select`, `table`, `checkbox`,
`popover`, `radio-group`, `scroll-area`, `separator`, `sheet`, `sidebar`, `skeleton`, `spinner`, `switch`, `textarea`, `tooltip`.
Tambah yang belum ada dengan `npx shadcn@latest add <nama>` (`sidebar` ikut membawa `@/hooks/use-mobile`). Ikon memakai `lucide-react`.

## 1. Pasang

Paket ada di Packagist, jadi cukup:

```bash
composer require susantokun/lir-kit
php artisan migrate
php artisan vendor:publish --tag=lir-kit-config
php artisan vendor:publish --tag=lir-kit-js
```

`migrate` membuat tabel berawalan `lir_`: `lir_login_codes`, `lir_settings`, `lir_menu_settings`, ditambah `lir_roles`, `lir_role_permissions`, `lir_role_user` (peran).

## 1b. Pasang starter (UI siap pakai, opsional tetapi disarankan)

Starter memberi proyek baru tampilan lengkap seperti aplikasi jadi: halaman masuk berpanel merek, lupa dan atur ulang kata sandi, tantangan 2FA,
verifikasi email, serta kerangka aplikasi (sidebar tiga level yang bisa diciutkan, bilah atas dengan breadcrumb dan pencarian Ctrl K, menu akun, tema terang/gelap, tampilan ponsel).

```bash
php artisan vendor:publish --tag=lir-kit-js        # komponen dan layout inti: resources/js/lir-kit (diperbarui lewat update)
php artisan vendor:publish --tag=lir-kit-starter   # halaman, layout aplikasi, config merek dan menu: milik Anda
```

Tag `lir-kit-starter` menaruh berkas ini (tidak menimpa berkas yang sudah ada kecuali dengan `--force`):

| Berkas | Isi |
|---|---|
| `resources/js/pages/auth/{login,forgot-password,reset-password,two-factor-challenge,verify-email}.tsx` | halaman auth (memanggil URL bawaan Fortify: `/login`, `/forgot-password`, `/reset-password`, `/two-factor-challenge`, `/email/verification-notification`) |
| `resources/js/pages/settings/{login-method,mail,menu,profile,security,appearance}.tsx` | halaman pengaturan: metode masuk, email pengirim dan template, editor menu, profil, keamanan (kata sandi dan 2FA), tema |
| `resources/js/layouts/app-layout.tsx`, `settings-page.tsx` | bingkai halaman: `<AppLayout title="...">`, dan `<SettingsPage title="...">` untuk halaman pengaturan (menu samping dari folder menu yang memuatnya) |
| `resources/js/config/brand.ts` | nama aplikasi dan teks panel kiri halaman masuk |
| `resources/js/config/nav.ts` | menu aplikasi (tiga level); satu baris per halaman |
| `resources/css/lir-kit-starter.css` | animasi panel masuk; `@import` dari `app.css` Anda |

Halaman profil, keamanan, dan 2FA memanggil endpoint akun Fortify (`PUT /user/profile-information`, `PUT /user/password`, `/user/two-factor-*`); bagikan prop `twoFactor: { enabled, pending }` ke halaman (mis. di middleware Inertia). Halaman pengaturan kit (metode masuk, email, menu) tetap memerlukan ability `lir-kit.manage` di server.

Halaman Inertia dipetakan dari `resources/js/pages`, jadi di Laravel Fortify cukup `Fortify::loginView(fn () => Inertia::render('auth/login', LirKit::loginProps(request())))` dan seterusnya.
Pembagian tugasnya: **layout dan komponen inti ada di paket** (`@/lir-kit/layouts/app-shell`, `auth-split-layout`, `shell/*`) dan ikut diperbarui; **halaman dan konfigurasi ada di proyek Anda** dan boleh diubah bebas.
Kerangka menerima merek, menu, pengguna, dan slot (`sidebarHeader`, `headerActions`, `userMenuExtra`, `toaster`, `onSearch`) lewat props, jadi fitur khusus aplikasi (pilih perusahaan, notifikasi) dipasang di `app-layout.tsx` tanpa mengubah kit.

## 1c. Pengguna, peran, dan hak akses (opsional)

Kit membawa layar **Pengguna** (cari, undang, ubah, nonaktifkan, hapus) dan **Peran** (kumpulan hak akses), lengkap dengan komponen `UsersPanel`/`RolesPanel` dan halaman starter `pages/access/{users,roles}.tsx`. Setelah `php artisan migrate` (membuat `lir_roles`, `lir_role_permissions`, `lir_role_user`):

1. **Daftarkan hak akses aplikasi** di `config/lir-kit.php`. Kunci hak akses sama dengan nama ability Gate:
   ```php
   'users_ability' => 'lir-kit.users',
   'roles_ability' => 'lir-kit.roles',
   'permissions' => ['Laporan' => ['laporan.lihat' => 'Melihat laporan']],
   'register_gate' => true,   // pemegang hak akses (atau Superadmin) otomatis lolos ability itu
   ```
   Tanpa `register_gate`, panggil `$user->hasLirPermission('laporan.lihat')` (trait `Lir\Kit\Concerns\HasLirRoles` di model User) dari Gate Anda sendiri.
2. **Buat Superadmin pertama** dari terminal: `php artisan lir-kit:grant email@anda.co.id` (peran `superadmin` bawaan memegang semua hak akses dan tidak bisa diubah).
3. **Bagikan hak akses ke halaman** supaya menu menyembunyikan yang tidak boleh dibuka: `'permissions' => fn () => \Lir\Kit\LirKit::permissions($request->user())` di middleware Inertia (dan `auth.user.id`). `config/nav.ts` starter memetakan halaman ke hak akses lewat `REQUIRES`.

Pengguna tetap milik aplikasi: kit membacanya lewat `Lir\Kit\Contracts\UserDirectory` (bawaan: model Eloquent di `user_model` dengan kolom `name`, `email`, dan `status` bila ada). Ikat implementasi sendiri bila pengguna Anda hidup di tempat lain. Undangan mengirim email berisi tautan masuk; bila masuk dengan kode email aktif, pengguna cukup memakai kode, jika tidak email membawa tautan atur kata sandi (rute `password.reset` milik aplikasi). Peran dipisah per tenant mengikuti `tenant_resolver`; Superadmin terakhir dan akun yang sedang dipakai tidak bisa dihapus atau dinonaktifkan.

## 2. Beri izin (wajib)

Semua layar pengaturan dijaga ability `lir-kit.manage`. **Tanpa definisi, semuanya tertutup (403)**. Di `AppServiceProvider::boot()`:

```php
Gate::define('lir-kit.manage', fn ($user) => $user->isSuperadmin());
```

## 3. Hubungkan ke aturan aplikasi (opsional tapi disarankan)

Kit bekerja apa adanya, tetapi aplikasi Anda mungkin punya aturan sendiri: akun nonaktif, SSO wajib, satu sesi
per orang, 2FA, riwayat login, audit. Buat satu kelas yang mengimplementasikan `Lir\Kit\Contracts\LoginHooks`:

```php
class AppLoginHooks implements LoginHooks
{
    public function canReceiveCode(Authenticatable $user): bool { return $user->isActive() && ! $user->mustUseSso(); }
    public function sessionConflict(Authenticatable $user): ?array { /* ['ip','device','location','last_activity'] atau null */ }
    public function requiresSecondFactor(Authenticatable $user): bool { return $user->two_factor_confirmed_at !== null; }
    public function signedIn(Authenticatable $user): void { /* akhiri sesi lain, catat login terakhir */ }
    public function recordLogin(string $event, ?Authenticatable $user, ?string $identifier, ?string $detail): void { /* riwayat login */ }
    public function audit(string $action, ?Authenticatable $actor, mixed $before = null, mixed $after = null): void { /* log audit */ }
}

// AppServiceProvider::register()
$this->app->bind(\Lir\Kit\Contracts\LoginHooks::class, AppLoginHooks::class);
```

Pengaturan lain di `config/lir-kit.php`: `menu_ability` (izin terpisah untuk editor menu), `user_model`, `guard`, `login_route`, `two_factor_route`, `redirect_after_login`,
`tenant_resolver` (mis. `fn () => app(CurrentCompany::class)->id()`), dan `menu_locked`.

## 4. Pakai login OTP

**Server.** Di tempat Anda merender halaman login, gabungkan props kit; dan tutup form kata sandi saat mode "OTP saja":

```php
Inertia::render('auth/login', [/* props Anda */] + \Lir\Kit\LirKit::loginProps($request));
```

Middleware `lir.password-allowed` (alias dari kit) menutup login kata sandi bila admin memilih "OTP saja". Pasang di rute POST login Anda;
dengan Fortify, tambahkan `Lir\Kit\Http\Middleware\EnsurePasswordLoginAllowed::class` paling awal di `Fortify::authenticateThrough()`.

**React.** Di halaman login Anda:

```tsx
import { OtpLoginForm } from '@/lir-kit/otp-login-form';

const { loginMode, otpEmail, otpLength, resendIn, devCode } = usePage().props;
const showOtp = loginMode === 'otp' || (loginMode === 'both' && (chooseOtp || !!otpEmail));

{showOtp
    ? <OtpLoginForm otpEmail={otpEmail} length={otpLength} resendIn={resendIn} devCode={devCode} />
    : /* form kata sandi Anda */}
{loginMode === 'both' && <Button onClick={() => setChooseOtp(!chooseOtp)}>…</Button>}
```

Rute yang dipakai (sudah terdaftar kit): `POST /login/otp/send|verify|resend|cancel`.
Saat `APP_ENV=local`, kode juga ditampilkan di halaman (matikan dengan `LIR_SHOW_CODE_LOCALLY=false`). Di environment lain tidak pernah.

## 5. Pakai layar pengaturan

Kit hanya menyediakan **komponen**; Anda menaruhnya di halaman pengaturan sendiri:

```tsx
import { LoginMethodCard } from '@/lir-kit/login-method-card';
import { MailSettingsCard } from '@/lir-kit/mail-settings-card';
import { LoginCodeEmailCard } from '@/lir-kit/login-code-email-card';

<LoginMethodCard /> <LoginCodeEmailCard /> <MailSettingsCard />
```

Komponen memanggil `GET/PUT /lir-kit/...` (ubah awalan lewat `routes.api_prefix` dan `KIT_API` di `adapters.ts`).
Email pengirim yang disimpan menimpa `MAIL_*` di `.env` untuk **semua** email aplikasi saat saklarnya menyala.
Menyimpan mode OTP ditolak di server produksi bila email belum bisa terkirim (mailer `log`/`array`), supaya tidak mengunci semua orang.

## 6. Pakai editor menu

1. **Bagikan susunan tersimpan** ke semua halaman (Inertia middleware `share()`):
   ```php
   'menuOverrides' => fn () => $request->user() ? \Lir\Kit\LirKit::menuOverrides() : [],
   ```
2. **Terapkan ke menu Anda.** Beri tiap kelompok dan folder `key` yang tetap (halaman: kuncinya `href`), lalu:
   ```ts
   import { applyMenu, setLockedKeys } from '@/lir-kit/menu';
   setLockedKeys(['/dashboard', '/settings/menu']);            // samakan dengan config 'menu_locked'
   const groups = applyMenu(buildMyNav(permissions), menuOverrides);
   ```
   Tautan buatan sendiri ke situs luar punya `external`/`newTab`; render sebagai `<a target="_blank" rel="noopener noreferrer">`.
3. **Halaman editor**:
   ```tsx
   import { MenuEditor } from '@/lir-kit/menu-editor';
   <MenuEditor base={buildMyNav(ALL_PERMISSIONS)} onSaved={() => router.reload({ only: ['menuOverrides'] })} />
   ```
   `base` adalah menu bawaan **lengkap** (semua izin dianggap ada) supaya editor melihat semua entri.

Menyembunyikan menu hanya soal tampilan; rute dan izin tetap menjadi pagar yang sebenarnya.
Tautan buatan sendiri hanya menerima `https://`, `http://`, atau alamat internal berawalan `/` (tidak `javascript:`, tidak `//host`).

## 7. Sesuaikan tampilan ke aplikasi Anda: `adapters.ts`

`resources/js/lir-kit/adapters.ts` adalah **satu-satunya** file kit yang sebaiknya Anda ubah: isi `t()` dengan sistem terjemahan Anda,
`notify()` dengan toast Anda, dan `KIT_API` bila awalan rute berbeda. Terjemahan Inggris kit ada di `resources/js/lang.en.json` (gabungkan ke kamus Anda).

## Cara update (penting)

Kit memakai **semver** dan `CHANGELOG.md` mencatat tiap rilis. Alurnya:

```bash
composer update susantokun/lir-kit      # backend + migrasi baru ikut otomatis
php artisan migrate                     # selalu jalankan setelah update
php artisan vendor:publish --tag=lir-kit-js --force   # hanya bila CHANGELOG menyebut perubahan komponen React
git diff resources/js/lir-kit           # tinjau; kembalikan perubahan lokal Anda ke adapters.ts bila tertimpa
php artisan test && pnpm run build
```

Aturan supaya update mulus:

- **Backend tidak perlu disalin**; ia hidup di `vendor/` dan diperbarui lewat Composer. Perilaku diubah lewat `config/lir-kit.php` dan `LoginHooks`, bukan dengan mengedit paket.
- **Frontend disalin** (karena memakai komponen UI dan gaya milik aplikasi Anda). Jangan edit file kit selain `adapters.ts`; bila perlu mengubah, bungkus komponennya di file Anda sendiri. Dengan begitu `--force` aman.
- **Migrasi tidak pernah diubah**; perubahan skema datang sebagai file migrasi baru, jadi `migrate` cukup.
- **Versi mayor (2.0)** boleh memecah kompatibilitas; baca bagian "Upgrade" di CHANGELOG.
- Kunci pengaturan yang tersimpan di tabel `lir_settings` (`login_method`, `mail`, `login_code_email`) dijaga kompatibel; kunci baru selalu punya default.

## Rilis (untuk pemilik paket)

```bash
# ubah CHANGELOG.md, lalu
git tag v0.1.1 && git push --tags
```

## Pengembangan paket: playground

Kit punya aplikasi Laravel mini sendiri (**playground**, di folder `workbench/`) untuk melihat dan mencoba perubahan tanpa membuka proyek lain.
Isinya **starter apa adanya**: halaman masuk (kata sandi dan kode OTP, kode tampil di layar), lupa dan atur ulang kata sandi (tautan tampil di halaman saat lokal),
tantangan 2FA (kode demo `123456`), verifikasi email, kerangka aplikasi dengan sidebar, pencarian, dan tema, lalu halaman pengaturan dan editor menu.
Yang tampil adalah **source asli**: komponen di `resources/js` dan halaman starter di `stubs/starter` (alias `@/lir-kit`, `@/config`, `@/layouts`), jadi ubahan langsung terlihat (hot reload)
dan hasilnya persis seperti yang diterima proyek lewat `vendor:publish`. Rute playground meniru URL Fortify (`workbench/routes/web.php`) karena playground tidak memakai Fortify.

Pertama kali:

```bash
composer install
pnpm install
composer build          # buat database SQLite, migrasi, dan isi akun demo
```

Tiap kali bekerja, cukup satu terminal:

```bash
composer run dev        # backend (http://127.0.0.1:8000) dan Vite (hot reload React) sekaligus
```

Atau jalankan terpisah di dua terminal: `composer serve` dan `pnpm dev`.

Masuk dengan `demo@lir-kit.test` (kata sandi `password`), atau pilih mode "kode email" di Pengaturan lalu pakai kode yang tampil di halaman.
Akun `nonaktif@lir-kit.test` dipakai untuk mencoba akun yang tidak boleh masuk. Isi `workbench/` tidak ikut terpasang ke proyek lain (`.gitattributes`).

Memeriksa dan menguji:

```bash
vendor/bin/pest         # tes backend (Orchestra Testbench)
pnpm types:check        # tsc untuk komponen React dan playground
```

Alur merilis: ubah dan coba di playground, perbarui `CHANGELOG.md`, commit, `git tag vX.Y.Z`, `git push --tags`.
Packagist memperbaruinya sendiri; proyek yang memakai kit tinggal `composer update susantokun/lir-kit`.
