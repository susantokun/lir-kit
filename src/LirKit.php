<?php

namespace Lir\Kit;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Lir\Kit\Models\MenuSetting;
use Lir\Kit\Services\LoginMethod;

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
     * The saved sidebar arrangement, to share with every page (e.g. as the Inertia prop `menuOverrides`).
     *
     * @return list<array<string, mixed>>
     */
    public static function menuOverrides(): array
    {
        return MenuSetting::query()->orderBy('order_column')->orderBy('id')
            ->get(['key', 'title', 'icon', 'is_visible', 'order_column', 'parent_key', 'kind', 'url', 'new_tab'])
            ->map(fn (MenuSetting $m) => $m->toArray())
            ->all();
    }
}
