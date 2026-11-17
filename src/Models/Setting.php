<?php

namespace Lir\Kit\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Installation-wide settings (sign-in method, sender email, email wording) kept as one JSON value per key.
 */
class Setting extends Model
{
    public $incrementing = false;

    protected $primaryKey = 'key';

    protected $keyType = 'string';

    protected $guarded = [];

    public function getTable(): string
    {
        return config('lir-kit.tables.settings');
    }

    protected function casts(): array
    {
        return ['value' => 'array'];
    }
}
