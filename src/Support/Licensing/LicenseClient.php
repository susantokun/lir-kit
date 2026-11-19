<?php

namespace Lir\Kit\Support\Licensing;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Talks to the license portal (POST {server_url}/api/licenses/activate and /validate). Only activation, the daily
 * check and "Cek sekarang" call it, never a normal request.
 */
class LicenseClient
{
    /**
     * @throws LicenseException when the portal cannot be reached
     */
    public function activate(string $key, string $domain, ?string $appUrl = null): LicenseReply
    {
        return $this->post('activate', $key, $domain, $appUrl);
    }

    /**
     * @throws LicenseException when the portal cannot be reached
     */
    public function validate(string $key, string $domain, ?string $appUrl = null): LicenseReply
    {
        return $this->post('validate', $key, $domain, $appUrl);
    }

    private function post(string $action, string $key, string $domain, ?string $appUrl): LicenseReply
    {
        $base = LicenseConfig::serverUrl();

        if ($base === '') {
            throw new LicenseException(__('Alamat server license belum diatur (config lir-kit.license.server_url).'));
        }

        if (! str_starts_with($base, 'https://') && ! app()->environment('local', 'testing')) {
            throw new LicenseException(__('Alamat server license harus memakai HTTPS.'));
        }

        try {
            $response = Http::acceptJson()
                ->timeout(LicenseConfig::timeout())
                ->post("{$base}/api/licenses/{$action}", array_filter(['key' => $key, 'domain' => $domain, 'app_url' => $appUrl]));
        } catch (ConnectionException) {
            throw new LicenseException(__('Tidak bisa menghubungi server license. Coba lagi nanti atau gunakan file license offline.'));
        }

        $data = $response->json();

        return new LicenseReply($response->status(), $response->body(), is_array($data) ? $data : []);
    }
}
