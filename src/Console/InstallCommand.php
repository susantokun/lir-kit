<?php

namespace Lir\Kit\Console;

use Illuminate\Console\Command;
use Illuminate\Filesystem\Filesystem;
use Lir\Kit\Features;

use function Laravel\Prompts\confirm;
use function Laravel\Prompts\multiselect;

/**
 * Chooses which parts of the kit this application uses, then sets it up: writes `features` into config/lir-kit.php,
 * runs the migrations, copies the React components, and (when asked) the starter pages of the chosen parts.
 * Safe to run again: a file that exists is never overwritten without --force, and the choice can be changed later.
 */
class InstallCommand extends Command
{
    protected $signature = 'lir-kit:install
        {--only= : Bagian yang dipasang, dipisah koma (otp,mail,menu,access,audit,site,license)}
        {--all : Pasang semua bagian}
        {--starter : Terbitkan halaman starter untuk bagian yang dipilih}
        {--no-migrate : Jangan jalankan migrasi}
        {--no-js : Jangan salin komponen React}
        {--force : Timpa berkas yang sudah ada (komponen dan halaman starter)}';

    protected $description = 'Pilih bagian lir-kit yang dipakai, lalu pasang (config, migrasi, komponen, starter).';

    /**
     * The starter pages (relative to stubs/starter/js) every application gets, and the ones that belong to one part.
     *
     * @var array<string, list<string>>
     */
    public const STARTER = [
        '*' => [
            'pages/auth/login.tsx', 'pages/auth/forgot-password.tsx', 'pages/auth/reset-password.tsx',
            'pages/auth/two-factor-challenge.tsx', 'pages/auth/verify-email.tsx',
            'pages/settings/profile.tsx', 'pages/settings/security.tsx', 'pages/settings/appearance.tsx',
            'layouts/app-layout.tsx', 'layouts/settings-page.tsx', 'config/brand.ts', 'config/nav.ts',
        ],
        Features::OTP => ['pages/settings/login-method.tsx'],
        Features::MAIL => ['pages/settings/mail.tsx'],
        Features::MENU => ['pages/settings/menu.tsx'],
        Features::ACCESS => ['pages/access/users.tsx', 'pages/access/roles.tsx'],
        Features::AUDIT => ['pages/access/audit.tsx'],
        Features::SITE => ['pages/settings/site.tsx'],
        Features::LICENSE => ['pages/settings/license.tsx'],
    ];

    public function handle(Filesystem $files): int
    {
        $chosen = $this->chosen();

        if ($chosen === null) {
            return self::FAILURE;
        }

        ['features' => $features, 'added' => $added] = Features::resolve($chosen);

        foreach ($added as $name) {
            $this->components->warn("Bagian \"{$name}\" ikut dipasang karena dibutuhkan bagian lain.");
        }

        if (! $this->writeConfig($files, $features)) {
            return self::FAILURE;
        }

        // The rest of this run sees the choice too.
        config(['lir-kit.features' => $features]);

        $this->table(['Bagian', 'Status'], collect(Features::ALL)->map(
            fn (string $label, string $name) => [$label, $features[$name] ? 'dipasang' : 'dimatikan'],
        )->values()->all());

        if (! $this->option('no-migrate')) {
            $this->call('migrate');
        }

        if (! $this->option('no-js')) {
            $this->call('vendor:publish', array_filter(['--tag' => 'lir-kit-js', '--force' => $this->option('force')]));
        }

        if ($this->wantsStarter()) {
            $this->publishStarter($files, $features);
        }

        $this->nextSteps($features);

        return self::SUCCESS;
    }

    /**
     * The names chosen with --only/--all, or in the question; null when the input is not valid.
     *
     * @return list<string>|null
     */
    private function chosen(): ?array
    {
        if ($this->option('all')) {
            return array_keys(Features::ALL);
        }

        if (($only = $this->option('only')) !== null) {
            $names = array_values(array_filter(array_map('trim', explode(',', (string) $only))));
            $unknown = array_diff($names, array_keys(Features::ALL));

            if ($unknown !== []) {
                $this->components->error('Bagian tidak dikenal: '.implode(', ', $unknown).'. Pilihan: '.implode(', ', array_keys(Features::ALL)).'.');

                return null;
            }

            return $names;
        }

        if (! $this->input->isInteractive()) {
            return array_keys(Features::ALL);
        }

        $current = Features::all();

        return array_values(multiselect(
            label: 'Bagian lir-kit mana yang ingin dipakai?',
            options: Features::ALL,
            default: array_keys(array_filter($current)),
            hint: 'Spasi untuk memilih, Enter untuk lanjut. Bisa diubah lagi dengan menjalankan perintah ini.',
        ));
    }

    private function wantsStarter(): bool
    {
        if ($this->option('starter')) {
            return true;
        }

        return $this->input->isInteractive() && confirm('Terbitkan halaman starter (login, pengaturan, layout) untuk bagian yang dipilih?', default: true);
    }

    /**
     * @param  array<string, bool>  $features
     */
    private function writeConfig(Filesystem $files, array $features): bool
    {
        $path = config_path('lir-kit.php');

        if (! $files->exists($path)) {
            $this->callSilent('vendor:publish', ['--tag' => 'lir-kit-config']);
        }

        if (! $files->exists($path)) {
            $this->components->error('config/lir-kit.php tidak bisa dibuat. Jalankan: php artisan vendor:publish --tag=lir-kit-config');

            return false;
        }

        $updated = self::applyToConfig($files->get($path), $features);

        if ($updated === null) {
            $this->components->error('config/lir-kit.php tidak dikenali. Tambahkan sendiri: '.self::renderBlock($features, false));

            return false;
        }

        $files->put($path, $updated);
        $this->components->info('config/lir-kit.php: bagian yang dipakai disimpan.');

        return true;
    }

    /**
     * The config file's text with the `features` block set to these values (added when the file has none yet); null when
     * the text is not a config array the block can go into.
     *
     * @param  array<string, bool>  $features
     */
    public static function applyToConfig(string $contents, array $features): ?string
    {
        if (preg_match("/'features'\s*=>\s*\[[^\]]*\],/s", $contents) === 1) {
            return preg_replace_callback("/'features'\s*=>\s*\[[^\]]*\],/s", fn () => self::renderBlock($features, false), $contents, 1);
        }

        if (preg_match('/return \[\R/', $contents) === 1) {
            return preg_replace_callback('/return \[\R/', fn (array $m) => $m[0].self::renderBlock($features, true)."\n\n", $contents, 1);
        }

        return null;
    }

    /**
     * @param  array<string, bool>  $features
     */
    public static function renderBlock(array $features, bool $indentFirst): string
    {
        $lines = ["'features' => ["];
        foreach ($features as $name => $on) {
            $lines[] = "        '{$name}' => ".($on ? 'true' : 'false').',';
        }
        $lines[] = '    ],';

        return ($indentFirst ? '    ' : '').implode("\n", $lines);
    }

    /**
     * Copies the starter pages that belong to the chosen parts (the files every application gets, plus one set per part).
     *
     * @param  array<string, bool>  $features
     */
    private function publishStarter(Filesystem $files, array $features): void
    {
        $source = dirname(__DIR__, 2).'/stubs/starter';
        $copied = 0;
        $skipped = 0;

        $list = self::STARTER['*'];
        foreach (self::STARTER as $name => $pages) {
            if ($name !== '*' && ($features[$name] ?? false)) {
                $list = [...$list, ...$pages];
            }
        }

        $copy = function (string $from, string $to) use ($files, &$copied, &$skipped) {
            if ($files->exists($to) && ! $this->option('force')) {
                $skipped++;

                return;
            }

            $files->ensureDirectoryExists(dirname($to));
            $files->copy($from, $to);
            $copied++;
        };

        foreach ($list as $page) {
            $copy("{$source}/js/{$page}", resource_path("js/{$page}"));
        }

        $copy("{$source}/css/lir-kit-starter.css", resource_path('css/lir-kit-starter.css'));

        $this->components->info("Starter: {$copied} berkas disalin, {$skipped} dilewati karena sudah ada (pakai --force untuk menimpa).");
    }

    /**
     * What is left to do by hand, for the parts that were chosen.
     *
     * @param  array<string, bool>  $features
     */
    private function nextSteps(array $features): void
    {
        $steps = [
            "Gate::define('lir-kit.manage', ...) di AppServiceProvider::boot() (tanpa ini pengaturan tertutup, 403).",
            "Bagikan ke halaman (middleware Inertia): 'features' => fn () => \\Lir\\Kit\\LirKit::features(), dan 'permissions' => fn () => \\Lir\\Kit\\LirKit::permissions(\$request->user()).",
        ];

        if ($features[Features::OTP]) {
            $steps[] = 'Login OTP: gabungkan \\Lir\\Kit\\LirKit::loginProps($request) ke halaman login dan pasang EnsurePasswordLoginAllowed (README bagian 4).';
        }

        if ($features[Features::MENU]) {
            $steps[] = "Editor menu: bagikan 'menuOverrides' => fn () => \\Lir\\Kit\\LirKit::menuOverrides() (README bagian 6).";
        }

        if ($features[Features::ACCESS]) {
            $steps[] = 'Pengguna dan peran: pakai trait \\Lir\\Kit\\Concerns\\HasLirRoles di model User, lalu php artisan lir-kit:grant email@anda.co.id.';
        }

        if ($features[Features::AUDIT]) {
            $steps[] = "Log audit: jadwalkan Schedule::command('lir-kit:audit-verify')->dailyAt('03:00').";
        }

        if ($features[Features::SITE]) {
            $steps[] = "Situs: bagikan 'site' => fn () => \\Lir\\Kit\\LirKit::site().";
        }

        if ($features[Features::LICENSE]) {
            $steps[] = 'License: isi LIR_LICENSE_SERVER_URL dan LIR_LICENSE_PUBLIC_KEY di .env bila dipakai (README bagian 6d).';
        }

        $steps[] = 'Bila config di-cache: php artisan config:clear. Lalu build frontend (pnpm run build).';

        $this->newLine();
        $this->components->info('Langkah yang masih perlu Anda kerjakan:');
        foreach ($steps as $i => $step) {
            $this->line('  '.($i + 1).'. '.$step);
        }
    }
}
