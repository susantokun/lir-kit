<?php

namespace Lir\Kit\Services;

use Illuminate\Support\Facades\Cache;
use Lir\Kit\Models\Setting;

/**
 * How people may sign in (password, emailed code, or both) and the rules of the one-time code.
 * Installation-wide: it must be known before anyone has signed in. Defaults live in config/lir-kit.php.
 */
class LoginMethod
{
    public const PASSWORD = 'password';

    public const OTP = 'otp';

    public const BOTH = 'both';

    public const MODES = [self::PASSWORD, self::OTP, self::BOTH];

    private const KEY = 'login_method';

    private const FIELDS = ['mode', 'length', 'ttl_minutes', 'max_attempts', 'resend_seconds', 'max_requests_per_hour'];

    /**
     * @return array{mode: string, length: int, ttl_minutes: int, max_attempts: int, resend_seconds: int, max_requests_per_hour: int}
     */
    public function all(): array
    {
        $stored = Cache::rememberForever('lir-kit:setting:'.self::KEY, fn () => Setting::query()->whereKey(self::KEY)->value('value') ?? []);
        $merged = array_merge(array_intersect_key((array) config('lir-kit.login'), array_flip(self::FIELDS)), (array) $stored);

        return [
            'mode' => in_array($merged['mode'], self::MODES, true) ? $merged['mode'] : self::PASSWORD,
            'length' => (int) $merged['length'],
            'ttl_minutes' => (int) $merged['ttl_minutes'],
            'max_attempts' => (int) $merged['max_attempts'],
            'resend_seconds' => (int) $merged['resend_seconds'],
            'max_requests_per_hour' => (int) $merged['max_requests_per_hour'],
        ];
    }

    /**
     * @param  array<string, int|string>  $values
     */
    public function save(array $values): void
    {
        Setting::query()->updateOrCreate(['key' => self::KEY], ['value' => array_intersect_key($values, array_flip(self::FIELDS))]);
        Cache::forget('lir-kit:setting:'.self::KEY);
    }

    public function mode(): string
    {
        return $this->all()['mode'];
    }

    public function passwordAllowed(): bool
    {
        return $this->mode() !== self::OTP;
    }

    public function otpAllowed(): bool
    {
        return $this->mode() !== self::PASSWORD;
    }

    /**
     * Whether the code may be shown on the page: only while developing (APP_ENV=local), never elsewhere.
     */
    public function showsCodeLocally(): bool
    {
        return app()->environment('local') && (bool) config('lir-kit.login.show_code_locally');
    }
}
