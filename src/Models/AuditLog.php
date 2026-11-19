<?php

namespace Lir\Kit\Models;

use Illuminate\Database\Eloquent\Model;
use LogicException;

/**
 * One line of the audit log. Append-only: an entry is never edited or removed, and each one carries the hash of the
 * entry before it, so tampering shows up when the chain is verified.
 */
class AuditLog extends Model
{
    public $timestamps = false;

    protected $guarded = [];

    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException(__('Log audit bersifat tambah-saja.')));
        static::deleting(fn () => throw new LogicException(__('Log audit bersifat tambah-saja.')));
    }

    public function getTable(): string
    {
        return config('lir-kit.tables.audit_logs', 'lir_audit_logs');
    }
}
