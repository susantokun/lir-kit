<?php

namespace Lir\Kit\Support;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Log;
use Lir\Kit\Contracts\LoginHooks;
use Lir\Kit\Features;
use Lir\Kit\Services\AuditTrail;
use Throwable;

/**
 * The behaviour when the application has not bound its own LoginHooks: any account may receive a code
 * unless it says it is inactive (an isActive() method), nothing is asked of a second factor, and
 * audit entries go to the tamper-evident audit log (AuditTrail), or to the application log when that table is missing.
 */
class DefaultLoginHooks implements LoginHooks
{
    public function canReceiveCode(Authenticatable $user): bool
    {
        return ! method_exists($user, 'isActive') || (bool) $user->isActive();
    }

    public function sessionConflict(Authenticatable $user): ?array
    {
        return null;
    }

    public function requiresSecondFactor(Authenticatable $user): bool
    {
        return false;
    }

    public function signedIn(Authenticatable $user): void {}

    public function recordLogin(string $event, ?Authenticatable $user, ?string $identifier, ?string $detail): void {}

    public function audit(string $action, ?Authenticatable $actor, mixed $before = null, mixed $after = null): void
    {
        if (! Features::enabled(Features::AUDIT)) {
            Log::info("lir-kit: {$action}", ['actor' => $actor?->getAuthIdentifier(), 'before' => $before, 'after' => $after]);

            return;
        }

        try {
            app(AuditTrail::class)->log($action, $actor, $before, $after);
        } catch (Throwable $e) {
            // The audit table may not exist yet (migrations not run): never break the action itself, keep a line in the log.
            Log::info("lir-kit: {$action}", ['actor' => $actor?->getAuthIdentifier(), 'before' => $before, 'after' => $after, 'audit_error' => $e->getMessage()]);
        }
    }
}
