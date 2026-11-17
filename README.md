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
| Komponen React | `resources/js` | disalin ke `resources/js/lir-kit` dengan `--tag=lir-kit-js` |

## Syarat

PHP 8.3+, Laravel 12/13, Inertia (React), Tailwind + komponen shadcn/ui (`button`, `input`, `card`, `field`, `dialog`,
`popover`, `switch`, `radio-group`, `native-select`, `skeleton`, `spinner`, `alert`, `textarea`, `badge`) di `@/components/ui`.

## 1. Pasang

Paket ada di Packagist, jadi cukup:

```bash
composer require susantokun/lir-kit
php artisan migrate
php artisan vendor:publish --tag=lir-kit-config
php artisan vendor:publish --tag=lir-kit-js
```

`migrate` membuat tiga tabel berawalan `lir_`: `lir_login_codes`, `lir_settings`, `lir_menu_settings`.

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

## Pengembangan paket

```bash
composer install
vendor/bin/pest
```

Tes memakai Orchestra Testbench (SQLite memori). Komponen React diperiksa dengan menyalinnya ke aplikasi yang memakai shadcn/ui lalu menjalankan `tsc --noEmit`.
