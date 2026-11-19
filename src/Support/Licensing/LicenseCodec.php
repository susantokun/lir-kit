<?php

namespace Lir\Kit\Support\Licensing;

use JsonException;

/**
 * Verifies Ed25519-signed license files issued by the license portal.
 *
 * A license file is JSON: {"payload": base64(JSON payload), "signature": base64(detached signature over the payload string)}.
 */
class LicenseCodec
{
    /**
     * Verify a license file (JSON string or decoded array) and return its payload.
     *
     * @param  string|array<string, mixed>  $file
     *
     * @throws InvalidLicenseException
     */
    public static function verify(string|array $file, string $publicKey): License
    {
        if (! function_exists('sodium_crypto_sign_verify_detached')) {
            throw new InvalidLicenseException('Ekstensi sodium PHP tidak tersedia.');
        }

        if (is_string($file)) {
            try {
                $file = json_decode($file, true, 512, JSON_THROW_ON_ERROR);
            } catch (JsonException) {
                throw new InvalidLicenseException('File license bukan JSON yang valid.');
            }
        }

        if (! is_array($file) || ! is_string($file['payload'] ?? null) || ! is_string($file['signature'] ?? null)) {
            throw new InvalidLicenseException('Format file license tidak dikenal.');
        }

        $signature = base64_decode($file['signature'], true);
        $key = base64_decode(trim($publicKey), true);

        if ($signature === false || strlen($signature) !== SODIUM_CRYPTO_SIGN_BYTES) {
            throw new InvalidLicenseException('Tanda tangan license tidak valid.');
        }

        if ($key === false || strlen($key) !== SODIUM_CRYPTO_SIGN_PUBLICKEYBYTES) {
            throw new InvalidLicenseException('Kunci publik tidak valid.');
        }

        if (! sodium_crypto_sign_verify_detached($signature, $file['payload'], $key)) {
            throw new InvalidLicenseException('Tanda tangan license tidak cocok.');
        }

        $json = base64_decode($file['payload'], true);

        try {
            $payload = $json === false ? null : json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            $payload = null;
        }

        if (! is_array($payload)) {
            throw new InvalidLicenseException('Isi license tidak bisa dibaca.');
        }

        /** @var array<string, mixed> $payload */
        return License::fromPayload($payload);
    }
}
