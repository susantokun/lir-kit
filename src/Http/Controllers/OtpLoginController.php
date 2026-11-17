<?php

namespace Lir\Kit\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Lir\Kit\Actions\SendLoginCode;
use Lir\Kit\Actions\VerifyLoginCode;
use Lir\Kit\Contracts\LoginHooks;
use Lir\Kit\Services\LoginMethod;

/**
 * Sign-in with a one-time code emailed to the person (passwordless). The application's own login page shows the
 * steps (see LirKit::loginProps()); accounts are never created here, only people that already exist can sign in.
 */
class OtpLoginController extends Controller
{
    public function __construct(private LoginMethod $method, private LoginHooks $hooks) {}

    public function send(Request $request, SendLoginCode $sendCode): RedirectResponse
    {
        $this->ensureAllowed();
        $email = Str::lower($request->validate(['email' => ['required', 'email', 'max:255']])['email']);

        $code = $sendCode->handle($email, $request->ip(), $request->userAgent());
        $request->session()->put('lir_otp_email', $email);
        $this->rememberCodeLocally($request, $code);

        // The same words whether or not the address has an account.
        return redirect()->route(config('lir-kit.login_route'))->with('status', __('Jika email terdaftar, kode masuk sudah dikirim. Periksa kotak masuk Anda.'));
    }

    public function resend(Request $request, SendLoginCode $sendCode): RedirectResponse
    {
        $this->ensureAllowed();
        $email = $request->session()->get('lir_otp_email');

        if (! is_string($email)) {
            return redirect()->route(config('lir-kit.login_route'));
        }

        $this->rememberCodeLocally($request, $sendCode->handle($email, $request->ip(), $request->userAgent()));

        return back()->with('status', __('Jika email terdaftar, kode baru sudah dikirim.'));
    }

    public function verify(Request $request, VerifyLoginCode $verifyCode): RedirectResponse
    {
        $this->ensureAllowed();
        $email = $request->session()->get('lir_otp_email');

        if (! is_string($email)) {
            return redirect()->route(config('lir-kit.login_route'));
        }

        $data = $request->validate(['code' => ['required', 'string', 'regex:/^\d{4,8}$/'], 'takeover' => ['boolean']]);
        $user = $verifyCode->handle($email, $data['code'], $request->ip(), (bool) ($data['takeover'] ?? false));

        $request->session()->forget(['lir_otp_email', 'lir_otp_dev_code']);

        // The code proves the mailbox, not a second factor: a person with an authenticator app is still asked for it.
        if ($this->hooks->requiresSecondFactor($user)) {
            $request->session()->put(['login.id' => $user->getAuthIdentifier(), 'login.remember' => false]);

            return redirect()->route(config('lir-kit.two_factor_route'));
        }

        $this->hooks->signedIn($user);
        Auth::guard(config('lir-kit.guard'))->login($user);
        $request->session()->regenerate();

        return redirect()->intended(config('lir-kit.redirect_after_login'));
    }

    public function cancel(Request $request): RedirectResponse
    {
        $request->session()->forget(['lir_otp_email', 'lir_otp_dev_code']);

        return redirect()->route(config('lir-kit.login_route'));
    }

    private function rememberCodeLocally(Request $request, ?string $code): void
    {
        if ($this->method->showsCodeLocally() && $code !== null) {
            $request->session()->put('lir_otp_dev_code', $code);
        } else {
            $request->session()->forget('lir_otp_dev_code');
        }
    }

    private function ensureAllowed(): void
    {
        if (! $this->method->otpAllowed()) {
            throw ValidationException::withMessages(['email' => __('Masuk dengan kode email tidak diaktifkan.')]);
        }
    }
}
