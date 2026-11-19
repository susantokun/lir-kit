<?php

namespace Lir\Kit\Services;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Lir\Kit\Models\Setting;

/**
 * How the site presents itself: its name, a short line under it, a contact email, the logo and the favicon.
 * Installation-wide (the sign-in pages need it before anyone is signed in). Pictures live on the disk in config
 * 'lir-kit.disk' (default: the app's default disk) and are served through the kit's own route, so they work on a
 * private disk too. Without anything saved the name is the app's name and there are no pictures.
 */
class SiteSettings
{
    public const KINDS = ['logo', 'favicon'];

    private const KEY = 'site';

    /**
     * What is saved (paths of the pictures included).
     *
     * @return array{name: ?string, tagline: ?string, contact_email: ?string, logo: ?string, favicon: ?string, version: ?string}
     */
    public function stored(): array
    {
        $stored = (array) Cache::rememberForever('lir-kit:setting:'.self::KEY, fn () => Setting::query()->whereKey(self::KEY)->value('value') ?? []);

        return [
            'name' => $this->text($stored['name'] ?? null),
            'tagline' => $this->text($stored['tagline'] ?? null),
            'contact_email' => $this->text($stored['contact_email'] ?? null),
            'logo' => $this->text($stored['logo'] ?? null),
            'favicon' => $this->text($stored['favicon'] ?? null),
            'version' => $this->text($stored['version'] ?? null),
        ];
    }

    /**
     * What the pages show: the name (falling back to the app's), and the URLs of the pictures.
     *
     * @return array{name: string, tagline: ?string, contact_email: ?string, logo: ?string, favicon: ?string}
     */
    public function present(): array
    {
        $stored = $this->stored();

        return [
            'name' => $stored['name'] ?? (string) config('app.name'),
            'tagline' => $stored['tagline'],
            'contact_email' => $stored['contact_email'],
            'logo' => $this->url('logo', $stored),
            'favicon' => $this->url('favicon', $stored),
        ];
    }

    /**
     * Saves the texts and applies the picture changes. A picture is replaced when a file is given and removed
     * when its flag is set; otherwise it stays.
     *
     * @param  array{name?: ?string, tagline?: ?string, contact_email?: ?string}  $texts
     * @param  array<string, UploadedFile|null>  $files
     * @param  list<string>  $remove
     */
    public function save(array $texts, array $files = [], array $remove = []): void
    {
        $stored = $this->stored();

        foreach (self::KINDS as $kind) {
            $file = $files[$kind] ?? null;

            if ($file instanceof UploadedFile) {
                $this->forget($stored[$kind]);
                $stored[$kind] = $file->store('site', ['disk' => $this->diskName()]);
            } elseif (in_array($kind, $remove, true)) {
                $this->forget($stored[$kind]);
                $stored[$kind] = null;
            }
        }

        Setting::query()->updateOrCreate(['key' => self::KEY], ['value' => [
            'name' => $this->text($texts['name'] ?? null),
            'tagline' => $this->text($texts['tagline'] ?? null),
            'contact_email' => $this->text($texts['contact_email'] ?? null),
            'logo' => $stored['logo'],
            'favicon' => $stored['favicon'],
            'version' => (string) now()->timestamp,
        ]]);
        Cache::forget('lir-kit:setting:'.self::KEY);
    }

    /**
     * The saved picture's path on the disk, or null.
     */
    public function path(string $kind): ?string
    {
        return in_array($kind, self::KINDS, true) ? $this->stored()[$kind] : null;
    }

    public function disk(): Filesystem
    {
        return Storage::disk($this->diskName());
    }

    private function diskName(): string
    {
        return (string) (config('lir-kit.disk') ?? config('filesystems.default'));
    }

    /**
     * @param  array<string, ?string>  $stored
     */
    private function url(string $kind, array $stored): ?string
    {
        return $stored[$kind] === null
            ? null
            : '/'.trim((string) config('lir-kit.routes.api_prefix'), '/').'/site/'.$kind.'?v='.($stored['version'] ?? '0');
    }

    private function forget(?string $path): void
    {
        if ($path !== null) {
            $this->disk()->delete($path);
        }
    }

    private function text(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }
}
