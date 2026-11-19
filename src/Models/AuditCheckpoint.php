<?php

namespace Lir\Kit\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A reference point of the audit log: "at this moment the last entry was #N with this hash". A later check compares
 * the live entry against it, which catches a chain that was quietly recomputed.
 */
class AuditCheckpoint extends Model
{
    public const UPDATED_AT = null;

    protected $guarded = [];

    public function getTable(): string
    {
        return config('lir-kit.tables.audit_checkpoints', 'lir_audit_checkpoints');
    }

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }
}
