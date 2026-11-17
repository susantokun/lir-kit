<?php

namespace Lir\Kit\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Lir\Kit\Services\LoginCodeEmail;

class LoginCodeNotification extends Notification
{
    public function __construct(private string $code, private int $ttlMinutes) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $email = app(LoginCodeEmail::class)->render((string) ($notifiable->name ?? ''), $this->code, $this->ttlMinutes);

        return (new MailMessage)
            ->subject($email['subject'])
            ->view(['lir-kit::mail.system', 'lir-kit::mail.system-text'], $email);
    }
}
