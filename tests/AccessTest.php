<?php

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Notification;
use Lir\Kit\LirKit;
use Lir\Kit\Models\Role;
use Lir\Kit\Notifications\UserInvitationNotification;
use Lir\Kit\Services\Access;
use Lir\Kit\Tests\TestUser;

function adminWith(string ...$abilities): TestUser
{
    config(['lir-kit.users_ability' => 'lir-kit.users', 'lir-kit.roles_ability' => 'lir-kit.roles', 'lir-kit.register_gate' => false]);
    $user = TestUser::query()->create(['name' => 'Pengelola', 'email' => 'pengelola@contoh.co.id']);

    foreach ($abilities as $ability) {
        Gate::define($ability, fn ($u) => $u->is($user));
    }

    return $user;
}

function makeRole(string $name, array $permissions = []): Role
{
    $role = Role::query()->create(['key' => str($name)->slug('_')->toString(), 'name' => $name]);
    app(Access::class)->syncPermissions($role, $permissions);

    return $role;
}

it('keeps the users and roles screens closed without their ability', function () {
    $user = adminWith();

    $this->actingAs($user)->getJson('/lir-kit/users')->assertForbidden();
    $this->actingAs($user)->getJson('/lir-kit/roles')->assertForbidden();
    $this->actingAs($user)->postJson('/lir-kit/users', ['name' => 'X', 'email' => 'x@contoh.co.id'])->assertForbidden();
});

it('invites a user with roles and emails the invitation', function () {
    Notification::fake();
    $user = adminWith('lir-kit.users');
    $role = makeRole('Staf');

    $this->actingAs($user)->postJson('/lir-kit/users', ['name' => 'Baru', 'email' => 'baru@contoh.co.id', 'roles' => [$role->id]])
        ->assertCreated()->assertJsonPath('data.roles.0.name', 'Staf');

    $created = TestUser::query()->where('email', 'baru@contoh.co.id')->firstOrFail();
    expect($created->password)->not->toBeEmpty();
    Notification::assertSentTo($created, UserInvitationNotification::class);
});

it('lists users with search and role filter', function () {
    $user = adminWith('lir-kit.users');
    $staff = makeRole('Staf');
    $other = TestUser::query()->create(['name' => 'Budi Santoso', 'email' => 'budi@contoh.co.id']);
    TestUser::query()->create(['name' => 'Citra', 'email' => 'citra@contoh.co.id']);
    app(Access::class)->syncRoles($other->id, [$staff->id]);

    $this->actingAs($user)->getJson('/lir-kit/users?q=budi')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.roles.0.key', 'staf');
    $this->actingAs($user)->getJson('/lir-kit/users?role='.$staff->id)->assertOk()->assertJsonCount(1, 'data');
    $this->actingAs($user)->getJson('/lir-kit/users')->assertOk()->assertJsonCount(3, 'data');
});

it('counts everyone, active and inactive for the cards, whatever the search', function () {
    $user = adminWith('lir-kit.users');
    TestUser::query()->create(['name' => 'Budi', 'email' => 'budi@contoh.co.id', 'status' => 'inactive']);
    TestUser::query()->create(['name' => 'Citra', 'email' => 'citra@contoh.co.id']);

    $this->actingAs($user)->getJson('/lir-kit/users?q=budi')->assertOk()
        ->assertJsonPath('stats', ['total' => 3, 'active' => 2, 'inactive' => 1]);
});

it('rejects a duplicate email and unknown roles', function () {
    $user = adminWith('lir-kit.users');

    $this->actingAs($user)->postJson('/lir-kit/users', ['name' => 'Dobel', 'email' => $user->email])->assertUnprocessable()->assertJsonValidationErrors('email');
    $this->actingAs($user)->postJson('/lir-kit/users', ['name' => 'Baru', 'email' => 'baru@contoh.co.id', 'roles' => [9999]])->assertUnprocessable()->assertJsonValidationErrors('roles');
});

it('protects the last superadmin and the signed-in user', function () {
    $user = adminWith('lir-kit.users');
    $access = app(Access::class);
    $access->syncRoles($user->id, [$access->superadminRole()->id]);

    $this->actingAs($user)->deleteJson('/lir-kit/users/'.$user->id)->assertUnprocessable();
    $this->actingAs($user)->putJson('/lir-kit/users/'.$user->id, ['name' => 'P', 'email' => $user->email, 'roles' => []])->assertUnprocessable();
    $this->actingAs($user)->putJson('/lir-kit/users/'.$user->id, ['name' => 'P', 'email' => $user->email, 'status' => 'inactive', 'roles' => [$access->superadminRole()->id]])->assertUnprocessable();

    $second = TestUser::query()->create(['name' => 'Kedua', 'email' => 'kedua@contoh.co.id']);
    $access->syncRoles($second->id, [$access->superadminRole()->id]);
    $this->actingAs($user)->putJson('/lir-kit/users/'.$second->id, ['name' => 'Kedua', 'email' => $second->email, 'roles' => []])->assertOk();
});

it('creates, changes and removes roles but never the built-in one', function () {
    $user = adminWith('lir-kit.roles');

    $created = $this->actingAs($user)->postJson('/lir-kit/roles', ['name' => 'Auditor Luar', 'permissions' => ['lir-kit.manage', 'tidak.ada']]);
    $created->assertUnprocessable();

    $this->actingAs($user)->postJson('/lir-kit/roles', ['name' => 'Auditor Luar', 'permissions' => ['lir-kit.manage']])->assertCreated();
    $role = Role::query()->where('name', 'Auditor Luar')->firstOrFail();
    expect($role->key)->toBe('auditor_luar');

    $this->actingAs($user)->putJson('/lir-kit/roles/'.$role->id, ['name' => 'Auditor', 'permissions' => []])->assertOk();
    expect($role->refresh()->name)->toBe('Auditor')->and($role->permissions()->count())->toBe(0);

    $superadmin = app(Access::class)->superadminRole();
    $this->actingAs($user)->putJson('/lir-kit/roles/'.$superadmin->id, ['name' => 'X'])->assertUnprocessable();
    $this->actingAs($user)->deleteJson('/lir-kit/roles/'.$superadmin->id)->assertUnprocessable();

    app(Access::class)->syncRoles($user->id, [$role->id]);
    $this->actingAs($user)->deleteJson('/lir-kit/roles/'.$role->id)->assertUnprocessable();
    app(Access::class)->syncRoles($user->id, []);
    $this->actingAs($user)->deleteJson('/lir-kit/roles/'.$role->id)->assertOk();
});

it('turns role permissions into Gate abilities when register_gate is on', function () {
    config(['lir-kit.register_gate' => true, 'lir-kit.permissions' => ['Laporan' => ['laporan.lihat' => 'Lihat laporan']]]);
    $this->app->forgetInstance(Access::class);
    $this->app->register(\Lir\Kit\LirKitServiceProvider::class, true);

    $user = TestUser::query()->create(['name' => 'Staf', 'email' => 'staf@contoh.co.id']);
    $role = makeRole('Pelihat', ['laporan.lihat']);
    expect(Gate::forUser($user)->allows('laporan.lihat'))->toBeFalse();

    app(Access::class)->syncRoles($user->id, [$role->id]);
    expect(Gate::forUser($user)->allows('laporan.lihat'))->toBeTrue()
        ->and(Gate::forUser($user)->allows('laporan.hapus'))->toBeFalse()
        ->and(LirKit::permissions($user))->toBe(['laporan.lihat']);

    $admin = TestUser::query()->create(['name' => 'Adm', 'email' => 'adm@contoh.co.id']);
    app(Access::class)->syncRoles($admin->id, [app(Access::class)->superadminRole()->id]);
    expect(Gate::forUser($admin)->allows('laporan.lihat'))->toBeTrue();
});

it('gives the first superadmin from the terminal', function () {
    $user = TestUser::query()->create(['name' => 'Awal', 'email' => 'awal@contoh.co.id']);

    $this->artisan('lir-kit:grant', ['email' => 'awal@contoh.co.id'])->assertSuccessful();
    expect(app(Access::class)->rolesOf($user->id)->pluck('key')->all())->toBe(['superadmin']);

    $this->artisan('lir-kit:grant', ['email' => 'tidak@ada.co.id'])->assertFailed();
});

it('keeps roles of one tenant away from another', function () {
    $current = '1';
    config(['lir-kit.tenant_resolver' => function () use (&$current) {
        return $current;
    }]);
    $user = adminWith('lir-kit.roles');
    makeRole('Milik Satu');

    $current = '2';
    $this->actingAs($user)->getJson('/lir-kit/roles')->assertOk()->assertJsonMissing(['name' => 'Milik Satu']);
});
