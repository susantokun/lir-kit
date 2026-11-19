<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Lir\Kit\LirKit;
use Workbench\App\Http\Middleware\HandleInertiaRequests;
use Workbench\App\Models\User;

Route::middleware(['web', HandleInertiaRequests::class])->group(function () {
    Route::get('/', fn () => redirect()->route(Auth::check() ? 'playground.settings' : 'login'));

    Route::middleware('guest')->group(function () {
        Route::get('login', fn (Request $request) => Inertia::render('login', ['demoEmail' => 'demo@lir-kit.test'] + LirKit::loginProps($request)))->name('login');

        // The password form, closed by the kit when the administrator chooses "email code only".
        Route::post('login', function (Request $request) {
            $user = User::query()->where('email', $request->input('email'))->first();

            if ($user === null || ! $user->isActive() || ! password_verify((string) $request->input('password'), $user->password)) {
                throw ValidationException::withMessages(['email' => 'Email atau kata sandi salah.']);
            }

            Auth::login($user);
            $request->session()->regenerate();

            return redirect()->route('playground.settings');
        })->middleware('lir.password-allowed');
    });

    // The kit signs people in and redirects to this address (config 'redirect_after_login').
    Route::post('logout', function (Request $request) {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    })->name('logout');

    Route::middleware('auth')->group(function () {
        Route::get('settings', fn () => Inertia::render('settings'))->name('playground.settings');
        Route::get('menu', fn () => Inertia::render('menu'))->name('playground.menu');
    });
});
