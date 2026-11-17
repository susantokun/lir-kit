<?php

namespace Lir\Kit\Services;

use Lir\Kit\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * The SMTP server and sender address that all email of the installation (sign-in codes, password resets, notifications)
 * goes out through. Set in the app by a Superadmin; when left off, the .env values (MAIL_*) stay in charge.
 * The password is kept encrypted and never sent back to the browser.
 */
class MailSettings
{
    private const KEY = 'mail';

    public const ENCRYPTIONS = ['tls', 'ssl', 'none'];

    /**
     * @return array{enabled: bool, host: string, port: int, encryption: string, username: string, from_address: string, from_name: string, has_password: bool}
     */
    public function all(): array
    {
        $stored = $this->stored();

        return [
            'enabled' => (bool) ($stored['enabled'] ?? false),
            'host' => (string) ($stored['host'] ?? ''),
            'port' => (int) ($stored['port'] ?? 587),
            'encryption' => (string) ($stored['encryption'] ?? 'tls'),
            'username' => (string) ($stored['username'] ?? ''),
            'from_address' => (string) ($stored['from_address'] ?? config('mail.from.address')),
            'from_name' => (string) ($stored['from_name'] ?? config('mail.from.name')),
            'has_password' => filled($stored['password'] ?? null),
        ];
    }

    /**
     * An empty password keeps the saved one.
     *
     * @param  array<string, mixed>  $values
     */
    public function save(array $values): void
    {
        $stored = $this->stored();
        $password = filled($values['password'] ?? null) ? Crypt::encryptString($values['password']) : ($stored['password'] ?? null);

        Setting::query()->updateOrCreate(['key' => self::KEY], ['value' => [
            'enabled' => (bool) $values['enabled'],
            'host' => $values['host'],
            'port' => (int) $values['port'],
            'encryption' => $values['encryption'],
            'username' => $values['username'] ?? '',
            'password' => $password,
            'from_address' => $values['from_address'],
            'from_name' => $values['from_name'],
        ]]);
        Cache::forget('lir-kit:setting:'.self::KEY);
        $this->apply();
    }

    /**
     * True when the app sends through the server saved here, or when the .env already points to a real mail server.
     */
    public function canDeliver(): bool
    {
        $stored = $this->stored();

        return (($stored['enabled'] ?? false) && filled($stored['host'] ?? null))
            || ! in_array(config('mail.default'), ['log', 'array'], true);
    }

    /**
     * Puts the saved settings over the .env ones for this request (and for queue workers, which boot the app too).
     */
    public function apply(): void
    {
        try {
            $stored = $this->stored();
        } catch (Throwable) {
            // The table does not exist yet (fresh install, running migrations).
            return;
        }

        if (! ($stored['enabled'] ?? false) || blank($stored['host'] ?? null)) {
            return;
        }

        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => $stored['host'],
            'mail.mailers.smtp.port' => (int) $stored['port'],
            'mail.mailers.smtp.scheme' => ($stored['encryption'] ?? 'tls') === 'ssl' ? 'smtps' : 'smtp',
            'mail.mailers.smtp.username' => filled($stored['username'] ?? null) ? $stored['username'] : null,
            'mail.mailers.smtp.password' => filled($stored['password'] ?? null) ? Crypt::decryptString($stored['password']) : null,
            'mail.mailers.smtp.auto_tls' => ($stored['encryption'] ?? 'tls') !== 'none',
            'mail.from.address' => $stored['from_address'],
            'mail.from.name' => $stored['from_name'],
        ]);
        Mail::purge('smtp');
    }

    /**
     * Sends a sample of the sign-in code email through the current settings: it proves the server and sender work
     * and shows the template as people will see it.
     *
     * @return array{ok: bool, pesan: string}
     */
    public function sendTest(string $to): array
    {
        return app(LoginCodeEmail::class)->sendSample($to);
    }

    /**
     * @return array<string, mixed>
     */
    private function stored(): array
    {
        return (array) Cache::rememberForever('lir-kit:setting:'.self::KEY, fn () => Setting::query()->whereKey(self::KEY)->value('value') ?? []);
    }
}
