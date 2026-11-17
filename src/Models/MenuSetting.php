<?php

namespace Lir\Kit\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * One change to a sidebar entry (title, icon, order, shown or hidden), or an entry of its own (a link or a folder).
 * Only differences from the built-in menu are kept. Scoped to the tenant given by `lir-kit.tenant_resolver`, if any.
 */
class MenuSetting extends Model
{
    public const CUSTOM_PREFIX = 'custom.';

    protected $guarded = [];

    public function getTable(): string
    {
        return config('lir-kit.tables.menu');
    }

    protected static function booted(): void
    {
        static::addGlobalScope('tenant', function (Builder $query) {
            $query->where('tenant_id', self::tenantId());
        });

        static::creating(function (self $model): void {
            $model->tenant_id ??= self::tenantId();
        });
    }

    /**
     * 0 stands for "the whole application" so the unique index also holds when there are no tenants.
     */
    public static function tenantId(): string
    {
        $resolver = config('lir-kit.tenant_resolver');

        return (string) ($resolver === null ? 0 : (call_user_func($resolver) ?? 0));
    }

    protected function casts(): array
    {
        return ['is_visible' => 'boolean', 'new_tab' => 'boolean', 'order_column' => 'integer'];
    }
}
