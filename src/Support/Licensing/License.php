<?php

namespace Lir\Kit\Support\Licensing;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Str;

/**
 * A verified license payload.
 */
final readonly class License
{
    /**
     * @param  list<string>|null  $modules
     */
    public function __construct(
        public string $key,
        public string $licensee,
        public ?string $domain,
        public CarbonImmutable $issuedAt,
        public CarbonImmutable $expiresAt,
        public ?int $maxUsers,
        public ?array $modules,
        public int $graceDays = 0,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     *
     * @throws InvalidLicenseException
     */
    public static function fromPayload(array $payload): self
    {
        foreach (['key', 'licensee', 'issued_at', 'expires_at'] as $required) {
            if (! is_string($payload[$required] ?? null)) {
                throw new InvalidLicenseException("Payload license tidak memiliki {$required}.");
            }
        }

        $modules = $payload['modules'] ?? null;

        return new self(
            key: $payload['key'],
            licensee: $payload['licensee'],
            domain: is_string($payload['domain'] ?? null) ? $payload['domain'] : null,
            issuedAt: CarbonImmutable::parse($payload['issued_at']),
            expiresAt: CarbonImmutable::parse($payload['expires_at']),
            maxUsers: is_int($payload['max_users'] ?? null) ? $payload['max_users'] : null,
            modules: is_array($modules) ? array_values(array_map(strval(...), array_filter($modules, is_string(...)))) : null,
            graceDays: is_int($payload['grace_days'] ?? null) ? max(0, $payload['grace_days']) : 0,
        );
    }

    public function matchesDomain(string $host): bool
    {
        return $this->domain === null || Str::is(Str::lower($this->domain), Str::lower($host));
    }

    public function isExpired(?CarbonInterface $at = null): bool
    {
        return $this->expiresAt->lessThanOrEqualTo($at ?? now());
    }

    /**
     * Whether the license still unlocks full use: before expiry or within the grace period from the payload.
     */
    public function isUsable(?CarbonInterface $at = null): bool
    {
        return $this->expiresAt->addDays($this->graceDays)->greaterThan($at ?? now());
    }

    /**
     * Whether a feature such as "SALES.invoice" is unlocked; the part before the dot is the module code.
     */
    public function allowsFeature(string $feature): bool
    {
        if ($this->modules === null) {
            return true;
        }

        return in_array(Str::before($feature, '.'), $this->modules, true);
    }
}
