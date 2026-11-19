<?php

namespace Lir\Kit\Services;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Lir\Kit\Models\Role;
use Lir\Kit\Models\RolePermission;

/**
 * Roles and permissions. A permission is a string that is also a Gate ability (e.g. "lir-kit.users"); the application
 * lists its own in config 'lir-kit.permissions'. The "superadmin" role holds all of them.
 */
class Access
{
    /** @var array<string, list<string>> */
    private array $memo = [];

    /**
     * Permissions grouped for the role editor.
     *
     * @return list<array{label: string, permissions: list<array{key: string, label: string}>}>
     */
    public function groups(): array
    {
        $kit = [];

        foreach ([
            [config('lir-kit.ability'), __('Kelola pengaturan')],
            [self::usersAbility(), __('Kelola pengguna')],
            [self::rolesAbility(), __('Kelola peran')],
            [config('lir-kit.menu_ability'), __('Kelola menu')],
            [config('lir-kit.audit_ability'), __('Melihat log audit')],
        ] as [$key, $label]) {
            if (is_string($key) && $key !== '') {
                $kit[$key] ??= $label;
            }
        }

        $groups = [[
            'label' => __('Kit'),
            'permissions' => collect($kit)->map(fn (string $label, string $key) => ['key' => $key, 'label' => $label])->values()->all(),
        ]];

        foreach ((array) config('lir-kit.permissions', []) as $label => $permissions) {
            $groups[] = [
                'label' => (string) $label,
                'permissions' => collect((array) $permissions)->map(fn ($text, $key) => ['key' => (string) $key, 'label' => (string) $text])->values()->all(),
            ];
        }

        return $groups;
    }

    /**
     * @return list<string>
     */
    public function keys(): array
    {
        return collect($this->groups())->flatMap(fn (array $g) => array_column($g['permissions'], 'key'))->unique()->values()->all();
    }

    public function knows(string $ability): bool
    {
        return in_array($ability, $this->keys(), true);
    }

    public static function usersAbility(): string
    {
        return config('lir-kit.users_ability') ?? config('lir-kit.ability');
    }

    public static function rolesAbility(): string
    {
        return config('lir-kit.roles_ability') ?? config('lir-kit.ability');
    }

    public static function auditAbility(): string
    {
        return config('lir-kit.audit_ability') ?? config('lir-kit.ability');
    }

    /**
     * Every permission this person holds (all of them for a superadmin).
     *
     * @return list<string>
     */
    public function permissionsOf(?Authenticatable $user): array
    {
        if ($user === null) {
            return [];
        }

        $id = (string) $user->getAuthIdentifier();

        return $this->memo[$id] ??= $this->load($id);
    }

    public function allows(?Authenticatable $user, string $permission): bool
    {
        return in_array($permission, $this->permissionsOf($user), true);
    }

    /**
     * @return Collection<int, Role>
     */
    public function rolesOf(Authenticatable|string|int $user): Collection
    {
        $id = $user instanceof Authenticatable ? (string) $user->getAuthIdentifier() : (string) $user;

        return Role::query()->whereIn('id', $this->pivot()->where('user_id', $id)->pluck('role_id'))->orderBy('name')->get();
    }

    /**
     * Replaces the roles of a user.
     *
     * @param  list<int|string>  $roleIds
     */
    public function syncRoles(int|string $userId, array $roleIds): void
    {
        $userId = (string) $userId;
        $valid = Role::query()->whereIn('id', $roleIds)->pluck('id')->all();

        DB::transaction(function () use ($userId, $valid) {
            // Only this tenant's roles are replaced; roles of the same user in another tenant stay as they are.
            $this->pivot()->where('user_id', $userId)->whereIn('role_id', Role::query()->pluck('id'))->delete();

            foreach ($valid as $roleId) {
                $this->pivot()->insert(['role_id' => $roleId, 'user_id' => $userId]);
            }
        });

        $this->forget();
    }

    /**
     * The built-in role that holds everything; created the first time it is needed.
     */
    public function superadminRole(): Role
    {
        return Role::query()->firstOrCreate(
            ['key' => Role::SUPERADMIN],
            ['name' => __('Superadmin'), 'description' => __('Memegang semua hak akses.'), 'is_system' => true],
        );
    }

    /**
     * @param  list<string>  $permissions
     */
    public function syncPermissions(Role $role, array $permissions): void
    {
        $permissions = array_values(array_intersect(array_unique($permissions), $this->keys()));

        DB::transaction(function () use ($role, $permissions) {
            RolePermission::query()->where('role_id', $role->getKey())->delete();

            foreach ($permissions as $permission) {
                RolePermission::query()->create(['role_id' => $role->getKey(), 'permission' => $permission]);
            }
        });

        $this->forget();
    }

    /**
     * A key for a new role that no role of this tenant uses yet.
     */
    public function uniqueKey(string $name): string
    {
        $base = Str::slug($name, '_') ?: 'peran';
        $key = $base;
        $n = 2;

        while (Role::query()->where('key', $key)->exists()) {
            $key = $base.'_'.$n++;
        }

        return $key;
    }

    /**
     * How many users hold the superadmin role.
     */
    public function superadminCount(): int
    {
        return $this->pivot()->where('role_id', $this->superadminRole()->getKey())->count();
    }

    /**
     * How many users hold each role, keyed by role id.
     *
     * @return array<int|string, int>
     */
    public function userCounts(): array
    {
        return $this->pivot()->selectRaw('role_id, count(*) as total')->groupBy('role_id')->pluck('total', 'role_id')->map(fn ($n) => (int) $n)->all();
    }

    public function forget(): void
    {
        $this->memo = [];
    }

    /**
     * @return list<string>
     */
    private function load(string $id): array
    {
        $roles = Role::query()->whereIn('id', $this->pivot()->where('user_id', $id)->pluck('role_id'))->with('permissions')->get();

        if ($roles->contains(fn (Role $role) => $role->key === Role::SUPERADMIN)) {
            return $this->keys();
        }

        return $roles->flatMap(fn (Role $role) => $role->permissions->pluck('permission'))->unique()->values()->all();
    }

    private function pivot(): Builder
    {
        return DB::table(config('lir-kit.tables.role_user', 'lir_role_user'));
    }
}
