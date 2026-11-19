<?php

namespace Workbench\App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;
use Lir\Kit\LirKit;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    /**
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => ['user' => $request->user() ? [
                ...$request->user()->only(['id', 'name', 'email']),
                'avatar' => $request->user()->avatar_path ? url('/avatar/'.$request->user()->id).'?v='.md5($request->user()->avatar_path) : null,
            ] : null],
            // Site name, logo and favicon from Pengaturan > Situs (shared with every page, also the sign-in ones).
            'site' => fn () => LirKit::site(),
            // The license strip: quiet until LIR_LICENSE_ENFORCE is on and the license is about to expire or has lapsed.
            'license' => fn () => LirKit::license(),
            // What this person may do (their roles' permissions), so the menu can leave out what they cannot open.
            'permissions' => fn () => LirKit::permissions($request->user()),
            'status' => fn () => $request->session()->get('status'),
            // The saved sidebar arrangement, shared with every page (see README, "Pakai editor menu").
            'twoFactor' => fn () => ['enabled' => (bool) $request->session()->get('demo_2fa') && $request->session()->get('demo_2fa_confirmed'), 'pending' => (bool) $request->session()->get('demo_2fa') && ! $request->session()->get('demo_2fa_confirmed')],
            'menuOverrides' => fn () => $request->user() ? LirKit::menuOverrides() : [],
        ];
    }
}
