<?php

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Mail;
use Lir\Kit\LirKit;
use Lir\Kit\Models\MenuSetting;
use Lir\Kit\Models\Setting;
use Lir\Kit\Services\LoginMethod;
use Lir\Kit\Services\MailSettings;
use Lir\Kit\Tests\TestUser;

function menuRow(array $override = []): array
{
    return $override + ['key' => '/vendors', 'title' => null, 'icon' => null, 'is_visible' => true, 'order_column' => null];
}

function linkRow(array $override = []): array
{
    return $override + ['key' => 'custom.abcdef12', 'kind' => 'link', 'title' => 'Wiki', 'url' => 'https://wiki.contoh.co.id', 'parent_key' => 'group.a', 'is_visible' => true];
}

it('keeps every settings route closed until the ability is defined and held', function () {
    $user = TestUser::query()->create(['name' => 'Biasa', 'email' => 'biasa@contoh.co.id']);

    $this->actingAs($user)->getJson('/lir-kit/login-method')->assertForbidden();
    $this->actingAs($user)->putJson('/lir-kit/mail-settings', [])->assertForbidden();
    $this->actingAs($user)->getJson('/lir-kit/menu')->assertForbidden();
});

it('asks anonymous visitors to sign in', function () {
    $this->getJson('/lir-kit/menu')->assertUnauthorized();
});

it('saves the sign-in method and refuses out-of-range rules', function () {
    $admin = $this->manager();
    $payload = ['mode' => 'both', 'length' => 8, 'ttl_minutes' => 5, 'max_attempts' => 4, 'resend_seconds' => 90, 'max_requests_per_hour' => 6];

    $this->actingAs($admin)->putJson('/lir-kit/login-method', $payload)->assertOk()->assertJsonPath('mode', 'both');
    expect(app(LoginMethod::class)->all()['length'])->toBe(8);
    $this->actingAs($admin)->putJson('/lir-kit/login-method', ['length' => 2] + $payload)->assertUnprocessable();
});

it('saves the mail server with an encrypted password that is never returned, and applies it', function () {
    $admin = $this->manager();
    $payload = ['enabled' => true, 'host' => 'smtp.contoh.co.id', 'port' => 465, 'encryption' => 'ssl', 'username' => 'kirim', 'password' => 'rahasia-smtp', 'from_address' => 'no-reply@contoh.co.id', 'from_name' => 'Contoh'];

    $this->actingAs($admin)->putJson('/lir-kit/mail-settings', $payload)->assertOk()->assertJsonPath('has_password', true)->assertJsonMissingPath('password');

    expect(json_encode(Setting::find('mail')->value))->not->toContain('rahasia-smtp')
        ->and(config('mail.default'))->toBe('smtp')
        ->and(config('mail.mailers.smtp.scheme'))->toBe('smtps')
        ->and(config('mail.mailers.smtp.password'))->toBe('rahasia-smtp')
        ->and(app(MailSettings::class)->canDeliver())->toBeTrue();

    $this->actingAs($admin)->putJson('/lir-kit/mail-settings', ['password' => ''] + $payload)->assertOk();
    expect(config('mail.mailers.smtp.password'))->toBe('rahasia-smtp');
});

it('sends a sample sign-in email as the test and reports a failure instead of crashing', function () {
    $admin = $this->manager();
    Mail::shouldReceive('send')->once()->andReturnNull();
    $this->actingAs($admin)->postJson('/lir-kit/mail-settings/test', ['to' => 'saya@contoh.co.id'])->assertOk()->assertJsonPath('ok', true);

    Mail::shouldReceive('send')->once()->andThrow(new RuntimeException('Connection refused'));
    $this->actingAs($admin)->postJson('/lir-kit/mail-settings/test', ['to' => 'saya@contoh.co.id'])->assertJsonPath('ok', false)->assertJsonPath('pesan', 'Connection refused');
});

it('saves and replaces the menu arrangement', function () {
    $admin = $this->manager();

    $this->actingAs($admin)->putJson('/lir-kit/menu', ['items' => [menuRow(['title' => 'Pemasok']), linkRow()]])->assertOk()->assertJsonCount(2, 'items');
    $this->actingAs($admin)->putJson('/lir-kit/menu', ['items' => [menuRow(['title' => 'Vendor Saya'])]])->assertOk()->assertJsonCount(1, 'items');

    expect(MenuSetting::count())->toBe(1);
    $this->actingAs($admin)->deleteJson('/lir-kit/menu')->assertOk()->assertJsonPath('items', []);
});

it('refuses addresses that could run code and incomplete custom entries', function (array $override) {
    $this->actingAs($this->manager())->putJson('/lir-kit/menu', ['items' => [linkRow($override)]])->assertUnprocessable();
})->with([
    'javascript' => [['url' => 'javascript:alert(1)']],
    'protocol-relative' => [['url' => '//evil.example.com']],
    'no title' => [['title' => '']],
    'no parent' => [['parent_key' => null]],
    'unknown kind' => [['kind' => 'iframe']],
]);

it('limits custom folders to three levels', function () {
    $folder = fn (string $key, string $parent) => linkRow(['key' => $key, 'kind' => 'folder', 'url' => null, 'parent_key' => $parent]);
    $items = [$folder('custom.aaaaaa01', 'group.a'), $folder('custom.aaaaaa02', 'custom.aaaaaa01'), $folder('custom.aaaaaa03', 'custom.aaaaaa02'), linkRow(['key' => 'custom.aaaaaa04', 'parent_key' => 'custom.aaaaaa03'])];

    $this->actingAs($this->manager())->putJson('/lir-kit/menu', ['items' => $items])->assertUnprocessable();
});

it('keeps a tenant\'s menu away from another tenant', function () {
    $tenant = 1;
    config(['lir-kit.tenant_resolver' => function () use (&$tenant) {
        return $tenant;
    }]);
    $admin = $this->manager();
    $this->actingAs($admin)->putJson('/lir-kit/menu', ['items' => [menuRow(['title' => 'Rahasia A'])]])->assertOk();

    $tenant = 2;
    $this->actingAs($admin)->getJson('/lir-kit/menu')->assertOk()->assertJsonCount(0, 'items');
    $tenant = 1;
    $this->actingAs($admin)->getJson('/lir-kit/menu')->assertJsonPath('items.0.title', 'Rahasia A');
});

it('does not let locked menu entries be hidden', function () {
    config(['lir-kit.menu_locked' => ['/dashboard']]);

    $this->actingAs($this->manager())->putJson('/lir-kit/menu', ['items' => [menuRow(['key' => '/dashboard', 'is_visible' => false])]])->assertUnprocessable();
});

it('lets the menu have its own ability, separate from the other settings', function () {
    Gate::define('menu.only', fn ($user) => $user->email === 'menu@contoh.co.id');
    config(['lir-kit.menu_ability' => 'menu.only']);
    $editor = TestUser::query()->create(['name' => 'Menu', 'email' => 'menu@contoh.co.id']);

    $this->actingAs($editor)->getJson('/lir-kit/menu')->assertOk();
    $this->actingAs($editor)->getJson('/lir-kit/login-method')->assertForbidden();
});

it('reads the saved menu of a given tenant even before the current tenant is known', function () {
    config(['lir-kit.tenant_resolver' => fn () => 5]);
    $this->actingAs($this->manager())->putJson('/lir-kit/menu', ['items' => [menuRow(['title' => 'Milik 5'])]])->assertOk();
    config(['lir-kit.tenant_resolver' => null]);

    expect(LirKit::menuOverrides(5))->toHaveCount(1)
        ->and(LirKit::menuOverrides(5)[0]['title'])->toBe('Milik 5')
        ->and(LirKit::menuOverrides(6))->toBe([]);
});
