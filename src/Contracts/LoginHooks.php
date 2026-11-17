<?php

namespace Lir\Kit\Contracts;

use Illuminate\Contracts\Auth\Authenticatable;

/**
 * Where the kit meets the application. Bind your own implementation to adapt the sign-in with a code to the
 * rules your app already has (inactive accounts, single sign-on, one session per person, audit trail).
 * The default implementation does nothing special, so the kit works out of the box.
 */
interface LoginHooks
{
    /**
     * Whether this person may be sent a code (an inactive account, or one that must use SSO, may not).
     */
    public function canReceiveCode(Authenticatable $user): bool;

    /**
     * Another live session of this person, or null. Returned as ['ip', 'device', 'location', 'last_activity'] so
     * the login page can ask to take it over.
     *
     * @return array<string, mixed>|null
     */
    public function sessionConflict(Authenticatable $user): ?array;

    /**
     * Whether, after the code, the person must still pass a second factor (an authenticator app).
     */
    public function requiresSecondFactor(Authenticatable $user): bool;

    /**
     * Called once the code is accepted and just before the person is signed in (end other sessions here).
     */
    public function signedIn(Authenticatable $user): void;

    /**
     * A sign-in event for the login history: 'berhasil', 'gagal', ...
     */
    public function recordLogin(string $event, ?Authenticatable $user, ?string $identifier, ?string $detail): void;

    /**
     * An entry for the audit trail: what changed and who did it.
     */
    public function audit(string $action, ?Authenticatable $actor, mixed $before = null, mixed $after = null): void;
}
