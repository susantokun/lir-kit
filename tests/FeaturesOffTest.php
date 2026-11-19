<?php

use Illuminate\Support\Facades\Artisan;
use Lir\Kit\Contracts\LoginHooks;
use Lir\Kit\Features;
use Lir\Kit\LirKit;
use Lir\Kit\Models\AuditLog;
use Lir\Kit\Services\LoginMethod;
use Lir\Kit\Tests\TestCase;

beforeAll(function () {
    TestCase::$features = array_fill_keys(array_keys(Features::ALL), false);
});

afterAll(fn () => TestCase::$features = null);

it('registers no routes of a part that is off', function () {
    foreach (['lir.otp.send', 'lir.otp.verify', 'lir-kit.login-method.show', 'lir-kit.mail-settings.show', 'lir-kit.menu.show',
        'lir-kit.users.index', 'lir-kit.roles.index', 'lir-kit.audit-log.index', 'lir-kit.site.show', 'lir-kit.site.asset',
        'lir-kit.license.show'] as $name) {
        expect(Route::has($name))->toBeFalse("Rute {$name} tidak boleh ada.");
    }
});

it('answers 404, not 403, for a part that is off', function () {
    $this->actingAs($this->manager());

    $this->getJson('/lir-kit/users')->assertNotFound();
    $this->getJson('/lir-kit/audit-log')->assertNotFound();
    $this->getJson('/lir-kit/menu')->assertNotFound();
    $this->postJson('/login/otp/send', ['email' => 'a@b.co'])->assertNotFound();
});

it('registers only the commands of the parts that are on', function () {
    $commands = Artisan::all();

    expect($commands)->toHaveKey('lir-kit:install')
        ->and($commands)->not->toHaveKey('lir-kit:grant')
        ->and($commands)->not->toHaveKey('lir-kit:audit-verify')
        ->and($commands)->not->toHaveKey('lir-kit:license-check');
});

it('falls back to the password whatever mode was saved', function () {
    app(LoginMethod::class)->save(['mode' => 'otp', 'length' => 6, 'ttl_minutes' => 10, 'max_attempts' => 5, 'resend_seconds' => 60, 'max_requests_per_hour' => 5]);

    $method = app(LoginMethod::class);

    expect($method->mode())->toBe('password')
        ->and($method->otpAllowed())->toBeFalse()
        ->and($method->passwordAllowed())->toBeTrue();
});

it('shares quiet defaults for the parts that are off', function () {
    expect(LirKit::features())->each->toBeFalse()
        ->and(LirKit::menuOverrides())->toBe([])
        ->and(LirKit::site())->toBe(['name' => 'Contoh App', 'tagline' => null, 'contact_email' => null, 'logo' => null, 'favicon' => null])
        ->and(LirKit::license()['read_only'])->toBeFalse();
});

it('keeps audit entries out of the audit table when the audit part is off', function () {
    app(LoginHooks::class)->audit('uji', null, null, ['a' => 1]);

    expect(AuditLog::query()->count())->toBe(0);
});
