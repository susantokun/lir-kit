<?php

namespace Lir\Kit\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Lir\Kit\Models\Setting;
use Throwable;

/**
 * The wording of the email that carries a sign-in code. An administrator can rewrite subject and body;
 * anything left empty uses the built-in text. The layout itself (header, code box, footer) is fixed.
 */
class LoginCodeEmail
{
    private const KEY = 'login_code_email';

    /** Placeholders usable in the subject and body. */
    public const PLACEHOLDERS = [
        'kode' => 'Kode masuk',
        'nama' => 'Nama penerima',
        'menit' => 'Masa berlaku kode (menit)',
        'aplikasi' => 'Nama aplikasi',
    ];

    /**
     * @return array{subject: string, body: string}
     */
    public static function defaults(): array
    {
        return [
            'subject' => __('Kode masuk {aplikasi}: {kode}'),
            'body' => __("Halo {nama},\n\nGunakan kode di bawah ini untuk masuk ke {aplikasi}. Kode berlaku {menit} menit dan hanya bisa dipakai sekali.\n\nJika bukan Anda yang meminta kode ini, abaikan email ini dan jangan bagikan kode kepada siapa pun."),
        ];
    }

    /**
     * What an administrator wrote; empty strings where the built-in text is used.
     *
     * @return array{subject: string, body: string}
     */
    public function custom(): array
    {
        $stored = (array) Cache::rememberForever('lir-kit:setting:'.self::KEY, fn () => Setting::query()->whereKey(self::KEY)->value('value') ?? []);

        return ['subject' => (string) ($stored['subject'] ?? ''), 'body' => (string) ($stored['body'] ?? '')];
    }

    public function save(?string $subject, ?string $body): void
    {
        if (blank($subject) && blank($body)) {
            $this->reset();

            return;
        }

        Setting::query()->updateOrCreate(['key' => self::KEY], ['value' => ['subject' => (string) $subject, 'body' => (string) $body]]);
        Cache::forget('lir-kit:setting:'.self::KEY);
    }

    public function reset(): void
    {
        Setting::query()->whereKey(self::KEY)->delete();
        Cache::forget('lir-kit:setting:'.self::KEY);
    }

    /**
     * Subject and body with the placeholders filled in, plus the data the mail layout needs.
     *
     * @return array{subject: string, body: string, code: string, accent: string, app: string}
     */
    public function render(string $name, string $code, int $ttlMinutes): array
    {
        $custom = $this->custom();
        $default = self::defaults();
        $values = ['{kode}' => $code, '{nama}' => $name, '{menit}' => (string) $ttlMinutes, '{aplikasi}' => (string) config('app.name')];

        return [
            'subject' => strtr(filled($custom['subject']) ? $custom['subject'] : $default['subject'], $values),
            'body' => strtr(filled($custom['body']) ? $custom['body'] : $default['body'], $values),
            'code' => $code,
            'accent' => '#2563eb',
            'app' => (string) config('app.name'),
        ];
    }

    /**
     * Sends a sample with a made-up code, so the wording can be judged in a real inbox.
     *
     * @return array{ok: bool, pesan: string}
     */
    public function sendSample(string $to): array
    {
        $data = $this->render(__('Pengguna'), '123456', (int) app(LoginMethod::class)->all()['ttl_minutes']);

        try {
            Mail::send(['html' => 'lir-kit::mail.system', 'text' => 'lir-kit::mail.system-text'], $data, fn ($mail) => $mail->to($to)->subject($data['subject']));
        } catch (Throwable $e) {
            return ['ok' => false, 'pesan' => $e->getMessage()];
        }

        return ['ok' => true, 'pesan' => __('Email uji dikirim ke :email.', ['email' => $to])];
    }
}
