<?php

namespace Workbench\Database\Seeders;

use Illuminate\Database\Seeder;
use Lir\Kit\Models\Role;
use Lir\Kit\Services\Access;
use Workbench\App\Models\User;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Sign in with the emailed code (shown on the page while APP_ENV=local) or with the password "password".
        $demo = User::query()->updateOrCreate(['email' => 'demo@lir-kit.test'], [
            'name' => 'Demo', 'password' => 'password', 'email_verified_at' => now(),
        ]);
        User::query()->updateOrCreate(['email' => 'nonaktif@lir-kit.test'], [
            'name' => 'Nonaktif', 'password' => 'password', 'status' => 'inactive',
        ]);

        $access = app(Access::class);

        // The demo user is the superadmin; the other roles show what a smaller set of permissions looks like.
        $access->syncRoles($demo->id, [$access->superadminRole()->id]);

        $admin = Role::query()->firstOrCreate(['key' => 'admin'], ['name' => 'Admin', 'description' => 'Mengelola pengguna dan pengaturan.']);
        $access->syncPermissions($admin, ['lir-kit.manage', 'lir-kit.users', 'laporan.lihat', 'laporan.ekspor']);
        $member = Role::query()->firstOrCreate(['key' => 'anggota'], ['name' => 'Anggota', 'description' => 'Hanya melihat laporan.']);
        $access->syncPermissions($member, ['laporan.lihat']);

        foreach ([['Ani Admin', 'ani@lir-kit.test', $admin], ['Budi Santoso', 'budi@lir-kit.test', $member], ['Citra Dewi', 'citra@lir-kit.test', $member]] as [$name, $email, $role]) {
            $user = User::query()->updateOrCreate(['email' => $email], ['name' => $name, 'password' => 'password', 'email_verified_at' => now()]);
            $access->syncRoles($user->id, [$role->id]);
        }
    }
}
