<?php

return [
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
