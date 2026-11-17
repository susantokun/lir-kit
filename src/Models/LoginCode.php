<?php

namespace Lir\Kit\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A one-time sign-in code sent to an email address. Only its hash is kept; it dies when used, expired or guessed wrong too often.
 */
class LoginCode extends Model
{
    protected $guarded = [];

    public function getTable(): string
    {
        return config('lir-kit.tables.codes');
    }

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'used_at' => 'datetime', 'attempts' => 'integer'];
    }
}
