<?php

namespace Lir\Kit\Support\Licensing;

use Illuminate\Validation\ValidationException;
use Lir\Kit\Contracts\UserDirectory;

/**
 * The single source of truth about the license: loads the file, verifies it every time it is read (once per request),
 * works out the status and answers what the app may do. Nothing here calls the portal.
 *
 * Nothing is limited until config 'lir-kit.license.enforce' is on: before that the status is only shown.
 */
class LicenseState
{
    /** @var array{license: License|null, status: LicenseStatus}|null */
    private ?array $resolved = null;

    public function __construct(private LicenseStore $store, private UserDirectory $users) {}

    /**
     * Drops what was loaded, so the next question reads the file again.
     */
    public function forget(): void
    {
        $this->resolved = null;
    }

    public function status(): LicenseStatus
    {
        return $this->resolve()['status'];
    }

    /**
     * The verified license, or null when there is none, it is not valid or not for this domain.
     */
    public function license(): ?License
    {
        return $this->resolve()['license'];
    }

    /**
     * Whether the license limits anything: only when enforcement is on and there is a key to verify against.
     */
    public function isEnforced(): bool
    {
        return LicenseConfig::enforced() && LicenseConfig::configured();
    }

    public function isReadOnly(): bool
    {
        return $this->isEnforced() && ! $this->status()->isFullAccess();
    }

    /**
     * Why the app is read-only (or about to be), in the user's language; null when nothing needs to be said.
     */
    public function message(): ?string
    {
        $license = $this->license();

        $message = match ($this->status()) {
            LicenseStatus::Unconfigured => null,
            LicenseStatus::Missing => __('Aplikasi belum diaktifkan. Hubungi administrator untuk memasukkan license key.'),
            LicenseStatus::Invalid => __('File license tidak sah untuk instalasi ini.'),
            LicenseStatus::Revoked => __('License ini telah dicabut oleh penerbit.'),
            LicenseStatus::Rejected => $this->store->state()['rejected_message'],
            LicenseStatus::Expired => __('License sudah habis. Aplikasi dalam mode baca saja.'),
            LicenseStatus::Grace => __('License habis pada :date. Aplikasi akan menjadi read-only pada :until.', [
                'date' => $license?->expiresAt->translatedFormat('j F Y'),
                'until' => $license?->expiresAt->addDays($license->graceDays)->translatedFormat('j F Y'),
            ]),
            LicenseStatus::Active => $this->daysLeft() !== null && $this->daysLeft() <= 30
                ? __('License akan habis pada :date.', ['date' => $license?->expiresAt->translatedFormat('j F Y')])
                : null,
        };

        return is_string($message) ? $message : null;
    }

    public function daysLeft(): ?int
    {
        $license = $this->license();

        return $license === null ? null : (int) now()->startOfDay()->diffInDays($license->expiresAt->startOfDay(), false);
    }

    /**
     * Whether a feature such as "SALES.invoice" is unlocked. A license without a module list unlocks everything.
     */
    public function allows(string $feature): bool
    {
        if (! $this->isEnforced()) {
            return true;
        }

        return $this->status()->isFullAccess() && ($this->license()?->allowsFeature($feature) ?? false);
    }

    public function maxUsers(): ?int
    {
        return $this->isEnforced() ? $this->license()?->maxUsers : null;
    }

    /**
     * Refuses a new or re-activated user once the license's active-user quota is used up.
     *
     * @throws ValidationException
     */
    public function guardUserQuota(): void
    {
        $max = $this->maxUsers();

        if ($max !== null && $this->activeUsers() >= $max) {
            throw ValidationException::withMessages(['quota' => __('Batas :count user dari license sudah tercapai. Hubungi penerbit untuk menambah kuota.', ['count' => $max])]);
        }
    }

    public function activeUsers(): int
    {
        $query = $this->users->query();

        return $this->users->supportsStatus() ? $query->where('status', 'active')->count() : $query->count();
    }

    /**
     * What every page needs for the banner.
     *
     * @return array{status: string, read_only: bool, message: string|null, expires_at: string|null, days_left: int|null}
     */
    public function shared(): array
    {
        return [
            'status' => $this->status()->value,
            'read_only' => $this->isReadOnly(),
            'message' => $this->isEnforced() ? $this->message() : null,
            'expires_at' => $this->license()?->expiresAt->toIso8601String(),
            'days_left' => $this->daysLeft(),
        ];
    }

    /**
     * Everything the License page shows.
     *
     * @return array<string, mixed>
     */
    public function details(): array
    {
        $license = $this->license();
        $state = $this->store->state();

        return [
            'status' => $this->status()->value,
            'read_only' => $this->isReadOnly(),
            'message' => $this->message(),
            'expires_at' => $license?->expiresAt->toIso8601String(),
            'days_left' => $this->daysLeft(),
            'configured' => LicenseConfig::configured(),
            'enforced' => LicenseConfig::enforced(),
            'licensee' => $license?->licensee,
            'key' => $license === null ? null : self::maskKey($license->key),
            'domain' => $license?->domain,
            'bound_domain' => $state['domain'],
            'issued_at' => $license?->issuedAt->toIso8601String(),
            'grace_days' => $license?->graceDays,
            'max_users' => $license?->maxUsers,
            'active_users' => $this->activeUsers(),
            'modules' => $license?->modules,
            'last_checked_at' => $state['last_checked_at'],
            'last_error' => $state['last_error'],
        ];
    }

    /**
     * Keeps the first and last four characters, so a full key never reaches the screen or the log.
     */
    public static function maskKey(string $key): string
    {
        return strlen($key) <= 8 ? str_repeat('•', strlen($key)) : substr($key, 0, 4).str_repeat('•', strlen($key) - 8).substr($key, -4);
    }

    /**
     * @return array{license: License|null, status: LicenseStatus}
     */
    private function resolve(): array
    {
        return $this->resolved ??= $this->compute();
    }

    /**
     * @return array{license: License|null, status: LicenseStatus}
     */
    private function compute(): array
    {
        if (! LicenseConfig::configured()) {
            return ['license' => null, 'status' => LicenseStatus::Unconfigured];
        }

        $raw = $this->store->read();

        if ($raw === null) {
            return ['license' => null, 'status' => LicenseStatus::Missing];
        }

        try {
            $license = LicenseCodec::verify($raw, LicenseConfig::publicKey());
        } catch (InvalidLicenseException) {
            return ['license' => null, 'status' => LicenseStatus::Invalid];
        }

        if (! $license->matchesDomain($this->host())) {
            return ['license' => null, 'status' => LicenseStatus::Invalid];
        }

        $state = $this->store->state();

        $status = match (true) {
            $state['revoked'] => LicenseStatus::Revoked,
            filled($state['rejected_message']) => LicenseStatus::Rejected,
            ! $license->isExpired() => LicenseStatus::Active,
            $license->isUsable() => LicenseStatus::Grace,
            default => LicenseStatus::Expired,
        };

        return ['license' => $license, 'status' => $status];
    }

    /**
     * The host of the current request; the console has no request, so the domain saved at activation stands in.
     */
    private function host(): string
    {
        if (app()->runningInConsole() && ! app()->runningUnitTests()) {
            return (string) ($this->store->state()['domain'] ?? parse_url((string) config('app.url'), PHP_URL_HOST));
        }

        return request()->getHost();
    }
}
