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
            'auth' => ['user' => $request->user()?->only(['name', 'email'])],
            'status' => fn () => $request->session()->get('status'),
            // The saved sidebar arrangement, shared with every page (see README, "Pakai editor menu").
            'twoFactor' => fn () => ['enabled' => (bool) $request->session()->get('demo_2fa') && $request->session()->get('demo_2fa_confirmed'), 'pending' => (bool) $request->session()->get('demo_2fa') && ! $request->session()->get('demo_2fa_confirmed')],
            'menuOverrides' => fn () => $request->user() ? LirKit::menuOverrides() : [],
        ];
    }
}
