<?php

namespace Lir\Kit\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Lir\Kit\Services\LoginMethod;

/**
 * Put in front of the password login route (alias `lir.password-allowed`): when the administrator has set sign-in to
 * emailed codes only, the password form is closed for everyone. The mode is public (the login page shows it), so
 * refusing before looking at the credentials reveals nothing.
 */
class EnsurePasswordLoginAllowed
{
    public function __construct(private LoginMethod $method) {}

    public function handle(Request $request, Closure $next): mixed
    {
        if (! $this->method->passwordAllowed()) {
            throw ValidationException::withMessages(['email' => __('Masuk dengan kata sandi dinonaktifkan. Masuk dengan kode yang dikirim ke email Anda.')]);
        }

        return $next($request);
    }
}
