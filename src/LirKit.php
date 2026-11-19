<?php

namespace Lir\Kit;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Lir\Kit\Models\MenuSetting;
use Lir\Kit\Services\Access;
use Lir\Kit\Services\LoginMethod;
use Lir\Kit\Services\SiteSettings;
use Lir\Kit\Support\Licensing\LicenseState;

/**
 * What the application's own pages need from the kit.
 */
class LirKit
{
    /**
     * Props to merge into the login page, e.g.
     *   Inertia::render('auth/login', [...] + LirKit::loginProps($request))
     * The page then shows the password form, the emailed-code form, or a switch between them.
     *
     * @return array{loginMode: string, otpEmail: ?string, otpLength: int, resendIn: int, devCode: ?string}
     */
    public static function loginProps(Request $request): array
    {
        $method = app(LoginMethod::class);
        $email = $method->otpAllowed() ? $request->session()->get('lir_otp_email') : null;
        $email = is_string($email) ? $email : null;

        return [
            'loginMode' => $method->mode(),
            'otpEmail' => $email,
            'otpLength' => $method->all()['length'],
            'resendIn' => $email === null ? 0 : RateLimiter::availableIn('lir-code:wait:'.$email),
            'devCode' => $email !== null && $method->showsCodeLocally() ? $request->session()->get('lir_otp_dev_code') : null,
        ];
    }

    /**
     * Which parts of the kit are switched on (config 'lir-kit.features'), to share with every page (e.g. as the Inertia
     * prop `features`) so the starter's menu leaves out what is off. Every part is on unless the application says otherwise.
     *
     * @return array<string, bool>
     */
    public static function features(): array
    {
        return Features::all();
    }

    /**
     * What this person may do, to share with every page (e.g. as the Inertia prop `permissions`) so the menu can hide
     * what they cannot open. Empty for a guest; every permission for a superadmin.
     *
     * @return list<string>
     */
    public static function permissions(?Authenticatable $user): array
    {
        return app(Access::class)->permissionsOf($user);
    }

    /**
     * How the site presents itself (Pengaturan > Situs), to share with every page, also the sign-in ones (e.g. as the
     * Inertia prop `site`): the name (the app's own name until one is saved), a short line, a contact email, and the
     * URLs of the logo and favicon (null until uploaded).
     *
     * @return array{name: string, tagline: ?string, contact_email: ?string, logo: ?string, favicon: ?string}
     */
    public static function site(): array
    {
        if (! Features::enabled(Features::SITE)) {
            return ['name' => (string) config('app.name'), 'tagline' => null, 'contact_email' => null, 'logo' => null, 'favicon' => null];
        }

        try {
            return app(SiteSettings::class)->present();
        } catch (\Throwable) {
            // The settings table does not exist yet (fresh install, running migrations).
            return ['name' => (string) config('app.name'), 'tagline' => null, 'contact_email' => null, 'logo' => null, 'favicon' => null];
        }
    }

    /**
     * What every page needs for a license banner (share it as the Inertia prop `license`): the status, whether the
     * app is read-only, a message for the person, and the expiry. Quiet (no message) until enforcement is on.
     *
     * @return array{status: string, read_only: bool, message: string|null, expires_at: string|null, days_left: int|null}
     */
    public static function license(): array
    {
        if (! Features::enabled(Features::LICENSE)) {
            return ['status' => 'unconfigured', 'read_only' => false, 'message' => null, 'expires_at' => null, 'days_left' => null];
        }

        try {
            return app(LicenseState::class)->shared();
        } catch (\Throwable) {
            return ['status' => 'unconfigured', 'read_only' => false, 'message' => null, 'expires_at' => null, 'days_left' => null];
        }
    }

    /**
     * The saved sidebar arrangement, to share with every page (e.g. as the Inertia prop `menuOverrides`).
     * Pass the tenant when the current one is not known yet at that point (null = the resolver's tenant).
     *
     * @return list<array<string, mixed>>
     */
    public static function menuOverrides(int|string|null $tenant = null): array
    {
        if (! Features::enabled(Features::MENU)) {
            return [];
        }

        $query = $tenant === null ? MenuSetting::query() : MenuSetting::withoutGlobalScopes()->where('tenant_id', (string) $tenant);

        return $query->orderBy('order_column')->orderBy('id')
            ->get(['key', 'title', 'icon', 'is_visible', 'order_column', 'parent_key', 'kind', 'url', 'new_tab'])
            ->map(fn (MenuSetting $m) => $m->toArray())
            ->all();
    }
}
