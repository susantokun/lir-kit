<?php

namespace Lir\Kit\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A named set of permissions that can be given to users. Scoped to the tenant given by `lir-kit.tenant_resolver`, if any.
 * The role with key "superadmin" (is_system) always holds every permission.
 */
class Role extends Model
{
    public const SUPERADMIN = 'superadmin';

    protected $guarded = [];

    public function getTable(): string
    {
        return config('lir-kit.tables.roles', 'lir_roles');
    }

    protected static function booted(): void
    {
        static::addGlobalScope('tenant', function (Builder $query) {
            $query->where($query->getModel()->getTable().'.tenant_id', MenuSetting::tenantId());
        });

        static::creating(function (self $model): void {
            $model->tenant_id ??= MenuSetting::tenantId();
        });
    }

    /**
     * @return HasMany<RolePermission, $this>
     */
    public function permissions(): HasMany
    {
        return $this->hasMany(RolePermission::class, 'role_id');
    }

    protected function casts(): array
    {
        return ['is_system' => 'boolean'];
    }
}
