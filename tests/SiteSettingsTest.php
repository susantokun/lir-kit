<?php

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Lir\Kit\LirKit;
use Lir\Kit\Models\AuditLog;
use Lir\Kit\Tests\TestUser;

function siteAdmin(bool $allowed = true): TestUser
{
    config(['lir-kit.register_gate' => false, 'lir-kit.disk' => 'local']);
    Storage::fake('local');
    $user = TestUser::query()->create(['name' => 'Pengelola', 'email' => 'pengelola@contoh.co.id']);

    if ($allowed) {
        Gate::define('lir-kit.manage', fn ($u) => $u->is($user));
    }

    return $user;
}

it('shows the app name and no pictures until something is saved', function () {
    siteAdmin();

    expect(LirKit::site())->toBe(['name' => 'Contoh App', 'tagline' => null, 'contact_email' => null, 'logo' => null, 'favicon' => null]);
});

it('keeps the site settings closed without the ability', function () {
    $user = siteAdmin(false);

    $this->actingAs($user)->getJson('/lir-kit/site')->assertForbidden();
    $this->actingAs($user)->postJson('/lir-kit/site', ['name' => 'X'])->assertForbidden();
});

it('saves the name, the texts and the pictures, and serves them to anyone', function () {
    $user = siteAdmin();

    $this->actingAs($user)->post('/lir-kit/site', [
        'name' => 'Toko Maju',
        'tagline' => 'Selalu ada',
        'contact_email' => 'halo@tokomaju.id',
        'logo' => UploadedFile::fake()->image('logo.png', 200, 200),
        'favicon' => UploadedFile::fake()->image('favicon.png', 32, 32),
    ], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('name', 'Toko Maju');

    $site = LirKit::site();
    expect($site['name'])->toBe('Toko Maju')->and($site['logo'])->toStartWith('/lir-kit/site/logo?v=');

    auth()->logout();
    $this->get('/lir-kit/site/logo')->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
    $this->get('/lir-kit/site/favicon')->assertOk();
    expect(AuditLog::query()->where('action', 'ubah_situs')->count())->toBe(1);
});

it('replaces and removes a picture without touching the other', function () {
    $user = siteAdmin();
    $post = fn (array $data) => $this->actingAs($user)->post('/lir-kit/site', $data + ['name' => 'Toko'], ['Accept' => 'application/json']);

    $post(['logo' => UploadedFile::fake()->image('a.png'), 'favicon' => UploadedFile::fake()->image('f.png')])->assertOk();
    $first = app(Lir\Kit\Services\SiteSettings::class)->path('logo');
    $post(['logo' => UploadedFile::fake()->image('b.png')])->assertOk();

    $second = app(Lir\Kit\Services\SiteSettings::class)->path('logo');
    Storage::disk('local')->assertMissing($first);
    Storage::disk('local')->assertExists($second);
    expect(LirKit::site()['favicon'])->not->toBeNull();

    $post(['remove_logo' => true])->assertOk();
    expect(LirKit::site()['logo'])->toBeNull()->and(LirKit::site()['favicon'])->not->toBeNull();
    $this->get('/lir-kit/site/logo')->assertNotFound();
});

it('refuses files that are not pictures, such as an SVG with script', function () {
    $user = siteAdmin();

    $this->actingAs($user)->post('/lir-kit/site', ['name' => 'X', 'logo' => UploadedFile::fake()->createWithContent('logo.svg', '<svg onload="alert(1)"></svg>')], ['Accept' => 'application/json'])
        ->assertUnprocessable()->assertJsonValidationErrors('logo');
    $this->actingAs($user)->post('/lir-kit/site', ['name' => 'X', 'contact_email' => 'bukan-email'], ['Accept' => 'application/json'])
        ->assertUnprocessable()->assertJsonValidationErrors('contact_email');
});
