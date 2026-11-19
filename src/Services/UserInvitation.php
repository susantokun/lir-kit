<?php

namespace Lir\Kit\Services;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Route;
use Lir\Kit\Notifications\UserInvitationNotification;

/**
 * Invites a person to the app: an email that points to the sign-in page. With sign-in by emailed code on, that is
 * all they need; otherwise the email carries a link to set a password (needs the app's "password.reset" route).
 */
class UserInvitation
{
    public function __construct(private LoginMethod $method) {}

    public function send(Model $user, ?Authenticatable $inviter = null): void
    {
        $loginUrl = Route::has(config('lir-kit.login_route')) ? route(config('lir-kit.login_route')) : url('/');
        $viaCode = $this->method->otpAllowed();
        $passwordUrl = null;

        if (! $viaCode && Route::has('password.reset')) {
            $token = Password::broker()->createToken($user);
            $passwordUrl = route('password.reset', ['token' => $token, 'email' => $user->getAttribute('email')]);
        }

        $user->notify(new UserInvitationNotification(
            $loginUrl,
            $passwordUrl,
            $inviter?->name ?? null,
            $viaCode,
        ));
    }
}
