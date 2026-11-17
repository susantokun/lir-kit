<?php

namespace Lir\Kit\Actions;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Lir\Kit\Contracts\LoginHooks;
use Lir\Kit\Models\LoginCode;
use Lir\Kit\Services\LoginMethod;

/**
 * Step two: check the code. Every refusal says the same thing (wrong, expired, used, or no such account), so nothing
 * reveals which addresses exist. A code works once, expires, and dies after too many wrong guesses.
 */
class VerifyLoginCode
{
    private const PER_WINDOW = 10;

    public function __construct(private LoginMethod $method, private LoginHooks $hooks) {}

    public function handle(string $email, string $code, ?string $ip, bool $takeover = false): Authenticatable
    {
        $email = Str::lower(trim($email));
        $key = 'lir-otp:'.sha1($email.'|'.$ip);

        if (RateLimiter::tooManyAttempts($key, self::PER_WINDOW)) {
            throw ValidationException::withMessages(['code' => __('Terlalu banyak percobaan. Coba lagi dalam :seconds detik.', ['seconds' => RateLimiter::availableIn($key)])]);
        }

        $loginCode = LoginCode::query()->where('email', $email)->whereNull('used_at')->latest('id')->first();
        $usable = $loginCode !== null && $loginCode->expires_at->isFuture() && $loginCode->attempts < $this->method->all()['max_attempts'];
        // The hash is always checked, so a missing code does not answer faster than a wrong one.
        $matches = Hash::check($code, $usable ? $loginCode->code_hash : Hash::make('decoy'));

        if (! $usable || ! $matches) {
            RateLimiter::hit($key, 900);

            if ($usable) {
                $loginCode->increment('attempts');
            }

            $this->hooks->recordLogin('gagal', null, $email, __('Kode masuk salah atau sudah kedaluwarsa.'));

            throw $this->refused();
        }

        $user = config('lir-kit.user_model')::query()->where('email', $email)->first();

        if ($user === null || ! $this->hooks->canReceiveCode($user)) {
            RateLimiter::hit($key, 900);
            $loginCode->update(['used_at' => now()]);
            $this->hooks->recordLogin('gagal', $user, $email, __('Akun tidak aktif atau tidak boleh masuk dengan kode.'));

            throw $this->refused();
        }

        // Checked before the code is spent, so confirming a take-over can reuse the same code.
        if (! $takeover && ($conflict = $this->hooks->sessionConflict($user)) !== null) {
            throw ValidationException::withMessages(['session_conflict' => json_encode($conflict)]);
        }

        $loginCode->update(['used_at' => now()]);
        RateLimiter::clear($key);

        if ($user->email_verified_at === null && array_key_exists('email_verified_at', $user->getAttributes())) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        $this->hooks->audit('masuk_otp', $user, null, $email);

        return $user;
    }

    private function refused(): ValidationException
    {
        return ValidationException::withMessages(['code' => __('Kode salah atau sudah kedaluwarsa. Periksa kodenya atau minta kode baru.')]);
    }
}
