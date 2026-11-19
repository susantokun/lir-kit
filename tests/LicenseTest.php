<?php

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;
use Lir\Kit\LirKit;
use Lir\Kit\Models\AuditLog;
use Lir\Kit\Tests\TestUser;

/**
 * Sets up a license portal of our own: a fresh Ed25519 key pair, a private folder for the license file, and an
 * admin who may open the License screen. Returns what the tests need to sign license files.
 *
 * @return array{user: TestUser, secret: string}
 */
function licenseSetup(bool $enforce = false, bool $configured = true): array
{
    $pair = sodium_crypto_sign_keypair();
    $dir = sys_get_temp_dir().'/lir-license-'.bin2hex(random_bytes(4));

    config([
        'lir-kit.register_gate' => false,
        'lir-kit.license' => [
            'server_url' => 'https://license.contoh.test',
            'public_key' => $configured ? base64_encode(sodium_crypto_sign_publickey($pair)) : null,
            'enforce' => $enforce,
            'path' => $dir,
            'timeout' => 5,
            'exempt_routes' => [],
        ],
    ]);
    app()->forgetInstance(Lir\Kit\Support\Licensing\LicenseState::class);

    $user = TestUser::query()->create(['name' => 'Pengelola', 'email' => 'pengelola@contoh.co.id']);
    Gate::define('lir-kit.manage', fn ($u) => $u->is($user));

    return ['user' => $user, 'secret' => sodium_crypto_sign_secretkey($pair)];
}

/**
 * A signed license file the way the portal issues it.
 *
 * @param  array<string, mixed>  $payload
 */
function signedLicense(string $secret, array $payload = []): string
{
    $payload = array_merge([
        'key' => 'ABCD-EFGH-IJKL-MNOP',
        'licensee' => 'PT Contoh',
        'domain' => null,
        'issued_at' => now()->subMonth()->toIso8601String(),
        'expires_at' => now()->addYear()->toIso8601String(),
        'max_users' => null,
        'modules' => null,
        'grace_days' => 0,
    ], $payload);
    $encoded = base64_encode(json_encode($payload));

    return json_encode(['payload' => $encoded, 'signature' => base64_encode(sodium_crypto_sign_detached($encoded, $secret))]);
}

afterEach(function () {
    $path = config('lir-kit.license.path');

    if (is_string($path) && str_contains($path, 'lir-license-')) {
        File::deleteDirectory($path);
    }
});

it('keeps the License screen closed without the ability', function () {
    licenseSetup();
    $other = TestUser::query()->create(['name' => 'Lain', 'email' => 'lain@contoh.co.id']);

    $this->actingAs($other)->getJson('/lir-kit/license')->assertForbidden();
    $this->actingAs($other)->postJson('/lir-kit/license/activate', ['key' => 'x'])->assertForbidden();
});

it('explains itself and limits nothing until a key and enforcement are set', function () {
    $setup = licenseSetup(configured: false);

    $this->actingAs($setup['user'])->getJson('/lir-kit/license')->assertOk()
        ->assertJsonPath('status', 'unconfigured')->assertJsonPath('configured', false)->assertJsonPath('read_only', false);

    $this->actingAs($setup['user'])->postJson('/lir-kit/license/activate', ['key' => 'ABCD'])->assertUnprocessable();
    expect(LirKit::license()['read_only'])->toBeFalse();
});

it('installs a signed license file and shows it with the key masked', function () {
    $setup = licenseSetup();

    $this->actingAs($setup['user'])->post('/lir-kit/license/upload', ['file' => UploadedFile::fake()->createWithContent('a.lic', signedLicense($setup['secret'], ['max_users' => 5, 'modules' => ['SALES']]))], ['Accept' => 'application/json'])
        ->assertOk()
        ->assertJsonPath('status', 'active')
        ->assertJsonPath('licensee', 'PT Contoh')
        ->assertJsonPath('key', 'ABCD•••••••••••MNOP')
        ->assertJsonPath('max_users', 5)
        ->assertJsonPath('modules', ['SALES']);

    $audit = AuditLog::query()->where('action', 'unggah_file_license')->firstOrFail();
    expect($audit->after)->not->toContain('ABCD-EFGH-IJKL-MNOP')->and($audit->entity)->toBe('license');
});

it('refuses a forged file, a file for another domain and one that is not a license', function () {
    $setup = licenseSetup();
    $forged = signedLicense(sodium_crypto_sign_secretkey(sodium_crypto_sign_keypair()));
    $upload = fn (string $contents) => $this->actingAs($setup['user'])->post('/lir-kit/license/upload', ['file' => UploadedFile::fake()->createWithContent('a.lic', $contents)], ['Accept' => 'application/json']);

    $upload($forged)->assertUnprocessable()->assertJsonPath('message', __('File license tidak sah.'));
    $upload('bukan json')->assertUnprocessable();
    $upload(signedLicense($setup['secret'], ['domain' => 'toko-lain.test']))->assertUnprocessable();
    $this->actingAs($setup['user'])->getJson('/lir-kit/license')->assertJsonPath('status', 'missing');
});

it('activates online, stores the file the portal returns and refuses a reply that is not signed by the key', function () {
    $setup = licenseSetup();
    Http::fake(['license.contoh.test/api/licenses/activate' => Http::sequence()
        ->push(signedLicense($setup['secret']), 200)
        ->push(signedLicense(sodium_crypto_sign_secretkey(sodium_crypto_sign_keypair())), 200)
        ->push(['message' => 'Key tidak dikenal.'], 404),
    ]);

    $this->actingAs($setup['user'])->postJson('/lir-kit/license/activate', ['key' => 'ABCD-EFGH-IJKL-MNOP'])->assertOk()->assertJsonPath('status', 'active');
    $this->actingAs($setup['user'])->postJson('/lir-kit/license/activate', ['key' => 'ABCD-EFGH-IJKL-MNOP'])->assertUnprocessable();
    $this->actingAs($setup['user'])->postJson('/lir-kit/license/activate', ['key' => 'SALAH'])->assertUnprocessable()->assertJsonPath('message', 'Key tidak dikenal.');
    expect(AuditLog::query()->where('action', 'aktivasi_license')->count())->toBe(1);
});

it('works out expired, grace and active, and goes read-only only when enforced', function () {
    $setup = licenseSetup(enforce: true);
    $install = fn (array $payload) => $this->actingAs($setup['user'])->post('/lir-kit/license/upload', ['file' => UploadedFile::fake()->createWithContent('a.lic', signedLicense($setup['secret'], $payload))], ['Accept' => 'application/json']);

    $install(['expires_at' => now()->subDay()->toIso8601String(), 'grace_days' => 0])->assertJsonPath('status', 'expired')->assertJsonPath('read_only', true);
    $install(['expires_at' => now()->subDay()->toIso8601String(), 'grace_days' => 7])->assertJsonPath('status', 'grace')->assertJsonPath('read_only', false);
    $install([])->assertJsonPath('status', 'active')->assertJsonPath('read_only', false);

    config(['lir-kit.license.enforce' => false]);
    app()->forgetInstance(Lir\Kit\Support\Licensing\LicenseState::class);
    $install(['expires_at' => now()->subDay()->toIso8601String()])->assertJsonPath('status', 'expired')->assertJsonPath('read_only', false);
});

it('turns writes away in read-only mode but keeps reading and the License screen open', function () {
    $setup = licenseSetup(enforce: true);
    Illuminate\Support\Facades\Route::middleware(['web', 'lir.license-writable'])->group(function () {
        Illuminate\Support\Facades\Route::get('/probe', fn () => 'baca');
        Illuminate\Support\Facades\Route::post('/probe', fn () => 'tulis');
    });

    $this->get('/probe')->assertOk();
    $this->postJson('/probe')->assertForbidden()->assertJsonPath('message', __('Aplikasi belum diaktifkan. Hubungi administrator untuk memasukkan license key.'));
    $this->actingAs($setup['user'])->postJson('/lir-kit/license/check')->assertOk();

    $this->actingAs($setup['user'])->post('/lir-kit/license/upload', ['file' => UploadedFile::fake()->createWithContent('a.lic', signedLicense($setup['secret']))], ['Accept' => 'application/json'])->assertOk();
    $this->postJson('/probe')->assertOk();
});

it('holds the user quota of the license, only when enforced', function () {
    $setup = licenseSetup(enforce: true);
    $this->actingAs($setup['user'])->post('/lir-kit/license/upload', ['file' => UploadedFile::fake()->createWithContent('a.lic', signedLicense($setup['secret'], ['max_users' => 1]))], ['Accept' => 'application/json'])->assertOk();

    $this->actingAs($setup['user'])->postJson('/lir-kit/users', ['name' => 'Baru', 'email' => 'baru@contoh.co.id', 'send_invitation' => false])
        ->assertUnprocessable()->assertJsonValidationErrors('quota');

    config(['lir-kit.license.enforce' => false]);
    app()->forgetInstance(Lir\Kit\Support\Licensing\LicenseState::class);
    $this->actingAs($setup['user'])->postJson('/lir-kit/users', ['name' => 'Baru', 'email' => 'baru@contoh.co.id', 'send_invitation' => false])->assertCreated();
});

it('records a revoked license from the portal and never loses the file on a network problem', function () {
    $setup = licenseSetup(enforce: true);
    $this->actingAs($setup['user'])->post('/lir-kit/license/upload', ['file' => UploadedFile::fake()->createWithContent('a.lic', signedLicense($setup['secret']))], ['Accept' => 'application/json'])->assertOk();

    Http::fake(['license.contoh.test/api/licenses/validate' => Http::sequence()
        ->push(['message' => 'oops'], 500)
        ->push(['revoked' => true, 'message' => 'Dicabut.'], 403),
    ]);

    $this->actingAs($setup['user'])->postJson('/lir-kit/license/check')->assertOk()->assertJsonPath('status', 'active')->assertJsonPath('last_error', 'oops');
    $this->actingAs($setup['user'])->postJson('/lir-kit/license/check')->assertOk()->assertJsonPath('status', 'revoked')->assertJsonPath('read_only', true);
});
