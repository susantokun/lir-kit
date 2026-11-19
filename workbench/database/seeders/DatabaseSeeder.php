<?php

namespace Workbench\Database\Seeders;

use Illuminate\Database\Seeder;
use Workbench\App\Models\User;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Sign in with the emailed code (shown on the page while APP_ENV=local) or with the password "password".
        User::query()->updateOrCreate(['email' => 'demo@lir-kit.test'], [
            'name' => 'Demo', 'password' => 'password', 'email_verified_at' => now(),
        ]);
        User::query()->updateOrCreate(['email' => 'nonaktif@lir-kit.test'], [
            'name' => 'Nonaktif', 'password' => 'password', 'status' => 'inactive',
        ]);
    }
}
