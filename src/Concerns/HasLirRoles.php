<?php

namespace Lir\Kit\Concerns;

use Illuminate\Support\Collection;
use Lir\Kit\Models\Role;
use Lir\Kit\Services\Access;

/**
 * Optional, for the application's User model: asks the kit's roles instead of keeping role code of your own.
 */
trait HasLirRoles
{
    /**
     * @return Collection<int, Role>
     */
    public function lirRoles(): Collection
    {
        return app(Access::class)->rolesOf($this);
    }

    public function hasLirPermission(string $permission): bool
    {
        return app(Access::class)->allows($this, $permission);
    }

    public function isLirSuperadmin(): bool
    {
        return $this->lirRoles()->contains(fn (Role $role) => $role->key === Role::SUPERADMIN);
    }
}
