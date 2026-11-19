<?php

namespace Lir\Kit\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Lir\Kit\Contracts\LoginHooks;
use Lir\Kit\Services\SiteSettings;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Pengaturan > Situs: name, tagline, contact email, logo and favicon. Needs the ability in config 'lir-kit.ability';
 * the pictures themselves are public (the sign-in pages show them), so they are served without it.
 */
class SiteSettingsController extends Controller
{
    public function __construct(private SiteSettings $site, private LoginHooks $hooks) {}

    public function show(): JsonResponse
    {
        Gate::authorize(config('lir-kit.ability'));

        return response()->json($this->payload());
    }

    /**
     * Sent as multipart (POST) because it may carry files.
     */
    public function update(Request $request): JsonResponse
    {
        Gate::authorize(config('lir-kit.ability'));

        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:60'],
            'tagline' => ['nullable', 'string', 'max:120'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'logo' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'favicon' => ['nullable', 'file', 'mimes:png,ico,jpg,jpeg,webp', 'max:512'],
            'remove_logo' => ['boolean'],
            'remove_favicon' => ['boolean'],
        ]);

        $before = $this->site->present();
        $remove = array_keys(array_filter(['logo' => $request->boolean('remove_logo'), 'favicon' => $request->boolean('remove_favicon')]));

        $this->site->save(
            ['name' => $data['name'] ?? null, 'tagline' => $data['tagline'] ?? null, 'contact_email' => $data['contact_email'] ?? null],
            ['logo' => $request->file('logo'), 'favicon' => $request->file('favicon')],
            $remove,
        );

        $after = $this->site->present();
        $this->hooks->audit('ubah_situs', $request->user(), $this->forAudit($before), $this->forAudit($after));

        return response()->json($this->payload());
    }

    /**
     * The saved picture ("logo" or "favicon"). Public, so the sign-in pages can show it.
     */
    public function asset(string $kind): StreamedResponse
    {
        $path = $this->site->path($kind);
        abort_if($path === null || ! $this->site->disk()->exists($path), 404);

        return $this->site->disk()->response($path, null, ['Cache-Control' => 'public, max-age=86400', 'X-Content-Type-Options' => 'nosniff']);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(): array
    {
        return $this->site->present() + ['default_name' => (string) config('app.name')];
    }

    /**
     * @param  array<string, mixed>  $site
     * @return array<string, mixed>
     */
    private function forAudit(array $site): array
    {
        return ['name' => $site['name'], 'tagline' => $site['tagline'], 'contact_email' => $site['contact_email'], 'logo' => $site['logo'] !== null, 'favicon' => $site['favicon'] !== null];
    }
}
