<?php

namespace Lir\Kit\Console;

use Illuminate\Console\Command;
use Lir\Kit\Contracts\UserDirectory;
use Lir\Kit\Models\Role;
use Lir\Kit\Services\Access;

/**
 * Gives a role to a user from the terminal: the way to make the first superadmin, before anyone can open the Pengguna screen.
 */
class GrantRoleCommand extends Command
{
    protected $signature = 'lir-kit:grant {email : Email pengguna} {role=superadmin : Kunci peran}';

    protected $description = 'Beri peran kepada pengguna (bawaan: superadmin).';

    public function handle(UserDirectory $users, Access $access): int
    {
        $user = $users->query()->where('email', $this->argument('email'))->first();

        if ($user === null) {
            $this->error('Pengguna tidak ditemukan.');

            return self::FAILURE;
        }

        $key = (string) $this->argument('role');
        $role = $key === Role::SUPERADMIN ? $access->superadminRole() : Role::query()->where('key', $key)->first();

        if ($role === null) {
            $this->error("Peran \"{$key}\" tidak ada.");

            return self::FAILURE;
        }

        $current = $access->rolesOf($user->getKey())->pluck('id')->all();
        $access->syncRoles($user->getKey(), array_values(array_unique([...$current, $role->getKey()])));
        $this->info("{$user->getAttribute('email')} kini memegang peran {$role->name}.");

        return self::SUCCESS;
    }
}
