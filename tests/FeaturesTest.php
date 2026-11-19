<?php

use Lir\Kit\Console\InstallCommand;
use Lir\Kit\Features;
use Lir\Kit\LirKit;
use Lir\Kit\Tests\TestCase;

const FEATURE_ROUTES = [
    Features::OTP => ['lir.otp.send', 'lir-kit.login-method.show', 'lir-kit.login-code-email.show'],
    Features::MAIL => ['lir-kit.mail-settings.show', 'lir-kit.mail-settings.test'],
    Features::MENU => ['lir-kit.menu.show', 'lir-kit.menu.update'],
    Features::ACCESS => ['lir-kit.users.index', 'lir-kit.roles.index'],
    Features::AUDIT => ['lir-kit.audit-log.index', 'lir-kit.audit-log.verify'],
    Features::SITE => ['lir-kit.site.show', 'lir-kit.site.asset'],
    Features::LICENSE => ['lir-kit.license.show', 'lir-kit.license.activate'],
];

it('has every part on when nothing is configured', function () {
    expect(Features::all())->toBe(array_fill_keys(array_keys(Features::ALL), true));

    foreach (FEATURE_ROUTES as $routes) {
        foreach ($routes as $name) {
            expect(Route::has($name))->toBeTrue("Rute {$name} harus ada.");
        }
    }
});

it('treats a part missing from a published config as on', function () {
    config(['lir-kit.features' => ['audit' => false]]);

    expect(Features::enabled(Features::AUDIT))->toBeFalse()
        ->and(Features::enabled(Features::SITE))->toBeTrue()
        ->and(Features::enabled('tidak-dikenal'))->toBeFalse();
});

it('switches on what a part needs', function () {
    config(['lir-kit.features' => ['otp' => true, 'mail' => false]]);

    expect(Features::enabled(Features::MAIL))->toBeTrue();
});

it('resolves a chosen list to the full map and reports what it added', function () {
    $result = Features::resolve(['otp', 'audit']);

    expect($result['features'])->toBe([
        'otp' => true, 'mail' => true, 'menu' => false, 'access' => false, 'audit' => true, 'site' => false, 'license' => false,
    ])->and($result['added'])->toBe(['mail']);

    expect(Features::resolve(['mail', 'nama-ngawur'])['features']['mail'])->toBeTrue()
        ->and(Features::resolve([])['features'])->each->toBeFalse();
});

it('shares the state with the pages', function () {
    expect(LirKit::features())->toBe(Features::all());
});

it('replaces the features block of an existing config', function () {
    $contents = file_get_contents(__DIR__.'/../config/lir-kit.php');
    $features = ['otp' => true, 'mail' => true, 'menu' => false, 'access' => false, 'audit' => true, 'site' => false, 'license' => false];

    $updated = InstallCommand::applyToConfig($contents, $features);
    $path = tempnam(sys_get_temp_dir(), 'lir');
    file_put_contents($path, $updated);
    $config = include $path;
    unlink($path);

    expect($config['features'])->toBe($features)
        ->and($config['ability'])->toBe('lir-kit.manage')
        ->and(substr_count($updated, "'features'"))->toBe(1);
});

it('adds the features block to a config that predates it', function () {
    $old = "<?php\n\nreturn [\n    'ability' => 'lir-kit.manage',\n];\n";

    $updated = InstallCommand::applyToConfig($old, ['otp' => false, 'mail' => true]);
    $path = tempnam(sys_get_temp_dir(), 'lir');
    file_put_contents($path, $updated);
    $config = include $path;
    unlink($path);

    expect($config)->toBe(['features' => ['otp' => false, 'mail' => true], 'ability' => 'lir-kit.manage']);
});

it('refuses a file that is not a config array', function () {
    expect(InstallCommand::applyToConfig('<?php echo 1;', ['otp' => true]))->toBeNull();
});

it('knows every starter page, and every one it lists exists', function () {
    $root = __DIR__.'/../stubs/starter/js';
    $listed = array_merge(...array_values(InstallCommand::STARTER));

    foreach ($listed as $page) {
        expect(is_file("{$root}/{$page}"))->toBeTrue("Halaman starter tidak ada: {$page}");
    }

    $found = [];
    foreach (['pages', 'layouts', 'config'] as $dir) {
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator("{$root}/{$dir}", FilesystemIterator::SKIP_DOTS)) as $file) {
            $found[] = $dir.str_replace('\\', '/', substr($file->getPathname(), strlen("{$root}/{$dir}")));
        }
    }

    expect(array_diff($found, $listed))->toBe([], 'Ada halaman starter yang belum masuk InstallCommand::STARTER.');
});

it('registers the installer even when every part is off', function () {
    expect(array_key_exists('lir-kit:install', Artisan::all()))->toBeTrue();
});

afterAll(fn () => TestCase::$features = null);
