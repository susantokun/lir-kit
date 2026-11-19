<?php

namespace Lir\Kit\Support\Licensing;

enum LicenseStatus: string
{
    case Unconfigured = 'unconfigured';
    case Missing = 'missing';
    case Invalid = 'invalid';
    case Active = 'active';
    case Grace = 'grace';
    case Expired = 'expired';
    case Revoked = 'revoked';
    case Rejected = 'rejected';

    /**
     * Full use is only allowed while the license is active or in its grace period.
     */
    public function isFullAccess(): bool
    {
        return $this === self::Active || $this === self::Grace;
    }
}
