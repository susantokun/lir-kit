<?php

use Lir\Kit\Features;
use Lir\Kit\Tests\TestCase;

beforeAll(function () {
    TestCase::$features = ['otp' => true, 'mail' => false, 'audit' => true, 'menu' => false, 'access' => false, 'site' => false, 'license' => false];
});

afterAll(fn () => TestCase::$features = null);

it('brings in the mail part that the code login needs', function () {
    expect(Features::enabled(Features::MAIL))->toBeTrue()
        ->and(Route::has('lir.otp.send'))->toBeTrue()
        ->and(Route::has('lir-kit.mail-settings.show'))->toBeTrue()
        ->and(Route::has('lir-kit.audit-log.index'))->toBeTrue();
});

it('leaves the other parts out', function () {
    foreach (['lir-kit.menu.show', 'lir-kit.users.index', 'lir-kit.roles.index', 'lir-kit.site.show', 'lir-kit.license.show'] as $name) {
        expect(Route::has($name))->toBeFalse("Rute {$name} tidak boleh ada.");
    }
});

it('still sends a code once the administrator chose the emailed code', function () {
    config(['lir-kit.login.mode' => 'otp']);
    $user = $this->manager();

    $this->post('/login/otp/send', ['email' => $user->email])->assertSessionHasNoErrors();
});
