<?php

namespace Lir\Kit\Support\Licensing;

/**
 * The license settings (config 'lir-kit.license'), each with a default so a project that published an older
 * config keeps working. Nothing here is ever on by default: no server, no key, no enforcement.
 */
final class LicenseConfig
{
    public static function serverUrl(): string
    {
        return rtrim((string) config('lir-kit.license.server_url', ''), '/');
    }

    public static function publicKey(): string
    {
        return trim((string) config('lir-kit.license.public_key', ''));
    }

    public static function path(): string
    {
        return rtrim((string) config('lir-kit.license.path', storage_path('app/private/lir-license')), '/\\');
    }

    public static function timeout(): int
    {
        return max(1, (int) config('lir-kit.license.timeout', 10));
    }

    /**
     * Whether a missing or expired license actually limits the app (read-only mode, user quota, modules).
     */
    public static function enforced(): bool
    {
        return (bool) config('lir-kit.license.enforce', false);
    }

    /**
     * Whether there is a public key to verify license files with; without it the License page only explains how to set up.
     */
    public static function configured(): bool
    {
        return self::publicKey() !== '';
    }
}
