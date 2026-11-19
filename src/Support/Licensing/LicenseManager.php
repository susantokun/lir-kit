<?php

namespace Lir\Kit\Support\Licensing;

/**
 * Activation (online or from an uploaded file) and the periodic check against the portal.
 * The license file is only ever replaced by a file that passes verification.
 */
class LicenseManager
{
    public function __construct(private LicenseClient $client, private LicenseStore $store, private LicenseState $state) {}

    /**
     * @throws LicenseException with a message fit to show to the user
     */
    public function activate(string $key, string $domain, ?string $appUrl = null): License
    {
        $this->ensureConfigured();
        $reply = $this->client->activate(trim($key), $domain, $appUrl);

        if (! $reply->ok()) {
            throw new LicenseException($reply->message());
        }

        try {
            $license = LicenseCodec::verify($reply->body, LicenseConfig::publicKey());
        } catch (InvalidLicenseException) {
            throw new LicenseException(__('File license dari server tidak sah. Periksa kunci publik di konfigurasi.'));
        }

        $this->store->write($reply->body);
        $this->saveState($domain, ['revoked' => false, 'rejected_message' => null, 'last_error' => null]);

        return $license;
    }

    /**
     * @throws LicenseException with a message fit to show to the user
     */
    public function installFile(string $contents, string $host): License
    {
        $this->ensureConfigured();

        try {
            $license = LicenseCodec::verify($contents, LicenseConfig::publicKey());
        } catch (InvalidLicenseException) {
            throw new LicenseException(__('File license tidak sah.'));
        }

        if (! $license->matchesDomain($host)) {
            throw new LicenseException(__('File license ini tidak berlaku untuk domain :domain.', ['domain' => $host]));
        }

        $this->store->write($contents);
        $this->saveState($host, ['revoked' => false, 'rejected_message' => null, 'last_error' => null]);

        return $license;
    }

    /**
     * Asks the portal whether the license is still good and records the answer. A network problem or a server error
     * never changes the status: the app keeps working from the file it has.
     *
     * @return 'skipped'|'ok'|'revoked'|'rejected'|'unchanged'
     */
    public function check(): string
    {
        $raw = LicenseConfig::configured() ? $this->store->read() : null;

        if ($raw === null) {
            return 'skipped';
        }

        try {
            $license = LicenseCodec::verify($raw, LicenseConfig::publicKey());
        } catch (InvalidLicenseException) {
            $this->saveState(null, ['last_error' => __('File license di server ini tidak sah.')]);

            return 'unchanged';
        }

        $domain = $this->store->state()['domain'] ?? parse_url((string) config('app.url'), PHP_URL_HOST) ?: 'localhost';

        try {
            $reply = $this->client->validate($license->key, (string) $domain, (string) config('app.url'));
        } catch (LicenseException $e) {
            $this->saveState(null, ['last_error' => $e->getMessage()]);

            return 'unchanged';
        }

        if ($reply->ok()) {
            try {
                LicenseCodec::verify($reply->body, LicenseConfig::publicKey());
            } catch (InvalidLicenseException) {
                $this->saveState(null, ['last_error' => __('File dari server tidak sah.')]);

                return 'unchanged';
            }

            $this->store->write($reply->body);
            $this->saveState(null, ['revoked' => false, 'rejected_message' => null, 'last_error' => null]);

            return 'ok';
        }

        if ($reply->status === 403 && $reply->revoked()) {
            $this->saveState(null, ['revoked' => true, 'last_error' => null]);

            return 'revoked';
        }

        if (in_array($reply->status, [403, 404, 409], true)) {
            $this->saveState(null, ['rejected_message' => $reply->message(), 'last_error' => null]);

            return 'rejected';
        }

        $this->saveState(null, ['last_error' => $reply->message()]);

        return 'unchanged';
    }

    /**
     * @throws LicenseException
     */
    private function ensureConfigured(): void
    {
        if (! LicenseConfig::configured()) {
            throw new LicenseException(__('Kunci publik license belum diatur (config lir-kit.license.public_key).'));
        }
    }

    /**
     * @param  array<string, mixed>  $changes
     */
    private function saveState(?string $domain, array $changes): void
    {
        $this->store->updateState(array_merge($domain === null ? [] : ['domain' => $domain], $changes, ['last_checked_at' => now()->toIso8601String()]));
        $this->state->forget();
    }
}
