<?php

namespace Lir\Kit\Actions;

use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Lir\Kit\Contracts\LoginHooks;
use Lir\Kit\Models\LoginCode;
use Lir\Kit\Notifications\LoginCodeNotification;
use Lir\Kit\Services\LoginMethod;

/**
 * Step one of signing in with a code: email a one-time code. What it answers never depends on whether the address
 * belongs to an account, so it cannot be used to find out who has one; the limits count every request alike.
 */
class SendLoginCode
{
    public function __construct(private LoginMethod $method, private LoginHooks $hooks) {}

    /**
     * @return string|null the code that was sent, or null when nothing was sent (no usable account)
     */
    public function handle(string $email, ?string $ip, ?string $userAgent): ?string
    {
        $email = Str::lower(trim($email));
        $rules = $this->method->all();

        $this->guard('lir-code:wait:'.$email, 1, __('Tunggu :seconds detik sebelum meminta kode baru.'));
        $this->guard('lir-code:email:'.$email, $rules['max_requests_per_hour'], __('Terlalu banyak permintaan kode. Coba lagi dalam :seconds detik.'));
        $this->guard('lir-code:ip:'.$ip, (int) config('lir-kit.login.per_ip_per_hour', 20), __('Terlalu banyak permintaan kode. Coba lagi dalam :seconds detik.'));

        RateLimiter::hit('lir-code:wait:'.$email, $rules['resend_seconds']);
        RateLimiter::hit('lir-code:email:'.$email, 3600);
        RateLimiter::hit('lir-code:ip:'.$ip, 3600);

        $user = config('lir-kit.user_model')::query()->where('email', $email)->first();

        if ($user === null || ! $this->hooks->canReceiveCode($user)) {
            $this->hooks->recordLogin('gagal', null, $email, __('Permintaan kode masuk untuk akun yang tidak bisa dipakai.'));

            return null;
        }

        $code = str_pad((string) random_int(0, (10 ** $rules['length']) - 1), $rules['length'], '0', STR_PAD_LEFT);

        LoginCode::query()->where('email', $email)->whereNull('used_at')->update(['expires_at' => now()]);
        LoginCode::query()->where('created_at', '<', now()->subDay())->delete();
        LoginCode::query()->create([
            'email' => $email,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes($rules['ttl_minutes']),
            'ip' => $ip,
            'user_agent' => $userAgent === null ? null : Str::limit($userAgent, 255, ''),
        ]);

        $user->notify(new LoginCodeNotification($code, $rules['ttl_minutes']));

        return $code;
    }

    private function guard(string $key, int $max, string $message): void
    {
        if (RateLimiter::tooManyAttempts($key, $max)) {
            throw ValidationException::withMessages(['email' => str_replace(':seconds', (string) RateLimiter::availableIn($key), $message)]);
        }
    }
}
