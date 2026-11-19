<?php

namespace Lir\Kit\Support\Licensing;

use Illuminate\Support\Facades\File;
use JsonException;

/**
 * Reads and writes the license file and the state of the last check, both outside public/.
 */
class LicenseStore
{
    /**
     * @return array{domain: string|null, revoked: bool, rejected_message: string|null, last_checked_at: string|null, last_error: string|null}
     */
    public static function defaultState(): array
    {
        return ['domain' => null, 'revoked' => false, 'rejected_message' => null, 'last_checked_at' => null, 'last_error' => null];
    }

    public function read(): ?string
    {
        $contents = is_file($this->path('license.lic')) ? file_get_contents($this->path('license.lic')) : false;

        return $contents === false || trim($contents) === '' ? null : $contents;
    }

    public function write(string $contents): void
    {
        $this->writeAtomically('license.lic', $contents);
    }

    /**
     * @return array{domain: string|null, revoked: bool, rejected_message: string|null, last_checked_at: string|null, last_error: string|null}
     */
    public function state(): array
    {
        $file = $this->path('state.json');

        try {
            $saved = is_file($file) ? json_decode((string) file_get_contents($file), true, 512, JSON_THROW_ON_ERROR) : [];
        } catch (JsonException) {
            $saved = [];
        }

        return array_merge(self::defaultState(), array_intersect_key(is_array($saved) ? $saved : [], self::defaultState()));
    }

    /**
     * @param  array<string, mixed>  $changes
     */
    public function updateState(array $changes): void
    {
        $this->writeAtomically('state.json', (string) json_encode(array_merge($this->state(), $changes), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    private function path(string $file): string
    {
        return LicenseConfig::path().DIRECTORY_SEPARATOR.$file;
    }

    private function writeAtomically(string $file, string $contents): void
    {
        File::ensureDirectoryExists(LicenseConfig::path());

        $temporary = $this->path($file).'.'.bin2hex(random_bytes(4)).'.tmp';
        file_put_contents($temporary, $contents, LOCK_EX);
        rename($temporary, $this->path($file));
    }
}
