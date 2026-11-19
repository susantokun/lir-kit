<?php

return [
    /*
    | Bagian kit yang dipakai. Yang dimatikan tidak mendaftarkan rute dan perintah artisan, dan menunya hilang di starter.
    | Semua aktif secara bawaan. Ubah dengan `php artisan lir-kit:install` atau langsung di sini.
    |   otp     : login kode email dan metode masuk       mail   : email pengirim dan template (otp butuh mail)
    |   menu    : editor menu                              access : pengguna, peran, hak akses
    |   audit   : log audit                                site   : pengaturan situs
    |   license : license aplikasi (tetap tidak membatasi apa pun sebelum `license.enforce` dinyalakan)
    | Tabel `lir_*` tetap dibuat oleh migrasi walau bagiannya dimatikan (kosong dan tidak berbahaya).
    */
    'features' => [
        'otp' => true,
        'mail' => true,
        'menu' => true,
        'access' => true,
        'audit' => true,
        'site' => true,
        'license' => true,
    ],

    /*
    | Model pengguna dan nama guard yang dipakai untuk masuk dengan kode email.
    */
    'user_model' => env('LIR_USER_MODEL', 'App\\Models\\User'),
    'guard' => env('LIR_GUARD', 'web'),

    /*
    | Ability Gate yang dibutuhkan untuk membuka pengaturan (metode masuk, email pengirim, template, menu).
    | Definisikan di aplikasi, mis. Gate::define('lir-kit.manage', fn ($user) => $user->isSuperadmin());
    | Tanpa definisi, semua pengaturan tertutup (aman secara bawaan).
    */
    'ability' => 'lir-kit.manage',

    // Ability khusus untuk editor menu. Null = memakai 'ability' di atas.
    'menu_ability' => null,

    /*
    | Pengguna dan peran. Ability untuk layar Pengguna dan layar Peran (null = memakai 'ability').
    | Disarankan: 'lir-kit.users' dan 'lir-kit.roles'.
    */
    'users_ability' => null,
    'roles_ability' => null,

    // Ability untuk layar Log Audit (lihat, ekspor, verifikasi integritas). Null = memakai 'ability'.
    'audit_ability' => null,

    /*
    | Hak akses milik aplikasi Anda, ditampilkan di editor peran: ['Nama kelompok' => ['ability.kunci' => 'Label']].
    | Kunci hak akses sama dengan nama ability Gate.
    */
    'permissions' => [],

    /*
    | Bila true, kit mendaftarkan Gate::before: pengguna yang perannya memegang suatu hak akses (atau Superadmin)
    | otomatis lolos ability itu. Bila false, Anda memanggil $user->hasLirPermission() sendiri.
    */
    'register_gate' => env('LIR_REGISTER_GATE', false),

    /*
    | License aplikasi (Pengaturan > Sistem > License). Semuanya mati secara bawaan: tanpa server dan kunci publik,
    | halaman License hanya menjelaskan cara memasangnya, dan tanpa `enforce` license tidak membatasi apa pun.
    |   server_url : alamat portal license (https://...), memakai POST /api/licenses/activate dan /validate
    |   public_key : kunci publik Ed25519 produk ini (base64), untuk memeriksa tanda tangan berkas license
    |   enforce    : true = tanpa license yang berlaku aplikasi baca-saja (middleware `lir.license-writable`),
    |                kuota user dan modul dari license berlaku
    |   exempt_routes : nama rute milik aplikasi yang tetap terbuka saat baca-saja
    */
    'license' => [
        'server_url' => env('LIR_LICENSE_SERVER_URL'),
        'public_key' => env('LIR_LICENSE_PUBLIC_KEY'),
        'enforce' => env('LIR_LICENSE_ENFORCE', false),
        'path' => storage_path('app/private/lir-license'),
        'timeout' => 10,
        'exempt_routes' => [],
    ],

    // Disk untuk logo dan favicon situs (Pengaturan > Situs). Null = disk bawaan aplikasi. Berkas disajikan lewat rute kit, jadi disk privat pun aman.
    'disk' => null,

    /*
    | Rute. `web` untuk halaman masuk (tamu), `api` untuk layar pengaturan (harus login).
    */
    'routes' => [
        'web_middleware' => ['web', 'guest'],
        'api_prefix' => 'lir-kit',
        'api_middleware' => ['web', 'auth'],
    ],

    /*
    | Nama rute milik aplikasi.
    */
    'login_route' => 'login',
    'two_factor_route' => 'two-factor.login',
    'redirect_after_login' => '/',

    /*
    | Nama tabel (diberi awalan agar tidak bentrok dengan tabel aplikasi).
    */
    'tables' => [
        'codes' => 'lir_login_codes',
        'settings' => 'lir_settings',
        'menu' => 'lir_menu_settings',
        'roles' => 'lir_roles',
        'role_permissions' => 'lir_role_permissions',
        'role_user' => 'lir_role_user',
        'audit_logs' => 'lir_audit_logs',
        'audit_checkpoints' => 'lir_audit_checkpoints',
    ],

    /*
    | Default metode masuk. Admin mengubahnya di layar pengaturan (disimpan di tabel settings).
    | mode: password | otp | both
    */
    'login' => [
        'mode' => env('LIR_LOGIN_MODE', 'password'),
        'length' => 6,
        'ttl_minutes' => 10,
        'max_attempts' => 5,
        'resend_seconds' => 60,
        'max_requests_per_hour' => 5,
        'per_ip_per_hour' => 20,
        // Saat APP_ENV=local, tampilkan kode di halaman login (tanpa perlu membuka email).
        'show_code_locally' => env('LIR_SHOW_CODE_LOCALLY', true),
    ],

    /*
    | Penyedia tenant untuk menu (mis. perusahaan aktif). Callable mengembalikan id atau null.
    | Tanpa ini, satu susunan menu berlaku untuk seluruh aplikasi.
    */
    'tenant_resolver' => null,

    /*
    | Ikon yang boleh dipilih untuk menu (harus ada di resources/js/lir-kit/menu-icons.ts).
    */
    'menu_icons' => [
        'LayoutDashboard', 'Inbox', 'Gauge', 'Store', 'Package', 'ShieldCheck', 'SlidersHorizontal', 'Users',
        'KeyRound', 'History', 'Fingerprint', 'MailCheck', 'Building', 'BellRing', 'FileStack', 'ListChecks',
        'LayoutTemplate', 'Plug', 'BadgeCheck', 'Cog', 'UserRound', 'Palette', 'FileText', 'Folder', 'Link',
        'BookOpen', 'Star', 'Tag', 'Wallet', 'Truck', 'Calculator', 'BarChart3', 'Settings', 'Briefcase',
        'ShoppingCart', 'Globe', 'LifeBuoy', 'Receipt', 'Layers', 'Bell',
    ],

    // Kunci menu yang tidak boleh disembunyikan (supaya layar pengaturan menu tidak terkunci).
    'menu_locked' => [],
];
