<?php

use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Lir\Kit\LirKit;
use Workbench\App\Http\Middleware\HandleInertiaRequests;
use Workbench\App\Models\User;

/*
| The playground has no Fortify. These routes answer the same URLs Fortify does (the starter's pages post to them),
| so the pages run here exactly as they will in a project that uses Fortify.
*/
Route::middleware(['web', HandleInertiaRequests::class])->group(function () {
    Route::get('/', fn () => redirect('/dashboard'));

    Route::middleware('guest')->group(function () {
        Route::get('login', fn (Request $request) => Inertia::render('auth/login', [
            'demo' => ['email' => 'demo@lir-kit.test', 'password' => 'password'],
        ] + LirKit::loginProps($request)))->name('login');

        // The password form, closed by the kit when the administrator chooses "email code only".
        Route::post('login', function (Request $request) {
            $user = User::query()->where('email', $request->input('email'))->first();

            if ($user === null || ! $user->isActive() || ! Hash::check((string) $request->input('password'), $user->password)) {
                throw ValidationException::withMessages(['email' => 'Email atau kata sandi salah.']);
            }

            Auth::login($user);
            $request->session()->regenerate();

            return redirect('/dashboard');
        })->middleware('lir.password-allowed');

        Route::get('forgot-password', fn () => Inertia::render('auth/forgot-password'))->name('password.request');

        // Without a mail server the link is shown on the page (local only), like the OTP code.
        Route::post('forgot-password', function (Request $request) {
            $request->validate(['email' => ['required', 'email']]);

            $link = null;
            Password::sendResetLink($request->only('email'), function ($user, string $token) use (&$link) {
                $link = url('reset-password/'.$token.'?email='.urlencode($user->email));
            });

            // The same answer whether or not the address has an account, so the page never reveals who is registered.
            return back()->with('status', 'Jika email terdaftar, tautan atur ulang sudah dikirim.'.($link ? ' (Lokal: '.$link.')' : ''));
        })->name('password.email');

        Route::get('reset-password/{token}', fn (Request $request, string $token) => Inertia::render('auth/reset-password', [
            'token' => $token,
            'email' => (string) $request->query('email'),
        ]))->name('password.reset');

        Route::post('reset-password', function (Request $request) {
            $request->validate([
                'token' => ['required'],
                'email' => ['required', 'email'],
                'password' => ['required', 'confirmed', 'min:8'],
            ]);

            $status = Password::reset(
                $request->only('email', 'password', 'password_confirmation', 'token'),
                function (User $user, string $password) {
                    $user->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();
                    event(new PasswordReset($user));
                },
            );

            if ($status !== Password::PASSWORD_RESET) {
                throw ValidationException::withMessages(['email' => __($status)]);
            }

            return redirect()->route('login')->with('status', 'Kata sandi diubah. Silakan masuk.');
        })->name('password.update');
    });

    // The kit signs people in and redirects to this address (config 'redirect_after_login').
    Route::post('logout', function (Request $request) {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    })->name('logout');

    // Views only: the playground has no second factor or mail verification. The code "123456" passes the challenge.
    Route::get('two-factor-challenge', fn () => Inertia::render('auth/two-factor-challenge'))->name('two-factor.login');
    Route::post('two-factor-challenge', function (Request $request) {
        if ($request->input('code') !== '123456' && $request->input('recovery_code') !== 'recovery-demo') {
            throw ValidationException::withMessages(['code' => 'Kode tidak valid. Di playground, pakai 123456.']);
        }

        return redirect('/dashboard');
    });
    Route::get('email/verify', fn () => Inertia::render('auth/verify-email'))->middleware('auth')->name('verification.notice');
    Route::post('email/verification-notification', fn () => back()->with('status', 'verification-link-sent'))
        ->middleware(['auth', 'throttle:6,1'])->name('verification.send');

    Route::middleware('auth')->group(function () {
        Route::get('dashboard', fn () => Inertia::render('dashboard'))->name('playground.dashboard');
        Route::get('laporan', fn () => Inertia::render('coming-soon', ['title' => 'Laporan']));
        Route::get('akses/pengguna', fn () => Inertia::render('coming-soon', ['title' => 'Pengguna']));
        Route::get('akses/peran', fn () => Inertia::render('coming-soon', ['title' => 'Peran']));
        Route::get('settings', fn () => Inertia::render('settings'))->name('playground.settings');
        Route::get('settings/menu', fn () => Inertia::render('menu'))->name('playground.menu');
    });
});
