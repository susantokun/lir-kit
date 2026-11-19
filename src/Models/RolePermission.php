<?php

namespace Lir\Kit\Models;

use Illuminate\Database\Eloquent\Model;

class RolePermission extends Model
{
    public $timestamps = false;

    protected $guarded = [];

    public function getTable(): string
    {
        return config('lir-kit.tables.role_permissions', 'lir_role_permissions');
    }
}
