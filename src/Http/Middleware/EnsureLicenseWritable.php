<?php

namespace Lir\Kit\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Lir\Kit\Features;
use Lir\Kit\Support\Licensing\LicenseState;
use Symfony\Component\HttpFoundation\Response;

/**
 * Without a usable license the app is read-only: every page can still be opened, but nothing can be written.
 * Only active when config 'lir-kit.license.enforce' is on. Add it to your own route groups as `lir.license-writable`;
 * the kit's License routes and any route named in config 'lir-kit.license.exempt_routes' stay open.
 */
class EnsureLicenseWritable
{
    public function __construct(private LicenseState $license) {}

    public function handle(Request $request, Closure $next): Response
    {
        $exempt = ['lir-kit.license.*', 'lir.otp.*', ...(array) config('lir-kit.license.exempt_routes', [])];

        if (! Features::enabled(Features::LICENSE) || $request->isMethodSafe() || ! $this->license->isReadOnly() || $request->routeIs(...$exempt)) {
            return $next($request);
        }

        $message = $this->license->message() ?? __('License tidak aktif. Aplikasi dalam mode baca saja.');

        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json(['message' => $message], 403);
        }

        return back()->withErrors(['license' => $message]);
    }
}
