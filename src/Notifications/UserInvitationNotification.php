<?php

namespace Lir\Kit\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * The email that invites a new user: where to sign in and, when signing in with an emailed code is not on,
 * a link to set a password.
 */
class UserInvitationNotification extends Notification
{
    public function __construct(
        private string $loginUrl,
        private ?string $passwordUrl,
        private ?string $inviter,
        private bool $viaCode,
    ) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $app = (string) config('app.name');
        $lines = [
            __('Halo :nama,', ['nama' => (string) ($notifiable->name ?? '')]),
            $this->inviter
                ? __(':inviter mengundang Anda untuk memakai :app.', ['inviter' => $this->inviter, 'app' => $app])
                : __('Anda diundang untuk memakai :app.', ['app' => $app]),
        ];

        if ($this->viaCode) {
            $lines[] = __('Buka :url, isi email ini, lalu pilih masuk dengan kode email. Kami kirim kode sekali pakai ke inbox Anda; tidak perlu kata sandi.', ['url' => $this->loginUrl]);
        } else {
            $lines[] = __('Buat kata sandi Anda lewat tautan ini: :url', ['url' => $this->passwordUrl ?? $this->loginUrl]);
            $lines[] = __('Setelah itu masuk di :url.', ['url' => $this->loginUrl]);
        }

        $data = [
            'subject' => __('Undangan ke :app', ['app' => $app]),
            'title' => __('Anda diundang'),
            'body' => implode("\n\n", $lines),
            'code' => null,
            'accent' => '#2563eb',
            'app' => $app,
        ];

        return (new MailMessage)->subject($data['subject'])->view(['lir-kit::mail.system', 'lir-kit::mail.system-text'], $data);
    }
}
