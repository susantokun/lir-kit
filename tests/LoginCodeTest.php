<?php

use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Lir\Kit\Models\LoginCode;
use Lir\Kit\Notifications\LoginCodeNotification;
use Lir\Kit\Services\LoginMethod;
use Lir\Kit\Tests\TestUser;

beforeEach(function () {
    $this->user = TestUser::query()->create(['name' => 'Budi', 'email' => 'budi@contoh.co.id']);
});

function setMode(string $mode, array $rules = []): void
{
    app(LoginMethod::class)->save(['mode' => $mode] + $rules + app(LoginMethod::class)->all());
}

function sentCode(): string
{
    $sent = Notification::sent(TestUser::query()->where('email', 'budi@contoh.co.id')->first(), LoginCodeNotification::class)->first();

    return (fn () => $this->code)->call($sent);
}

it('keeps the code routes closed while the mode is password only', function () {
    $this->post('/login/otp/send', ['email' => $this->user->email])->assertSessionHasErrors('email');

    expect(LoginCode::count())->toBe(0);
});

it('emails a hashed code and signs in with it, once', function () {
    setMode('otp');
    Notification::fake();

    $this->post('/login/otp/send', ['email' => 'BUDI@contoh.co.id'])->assertRedirect('/login');
    $code = sentCode();

    expect(LoginCode::first()->code_hash)->not->toBe($code);
    $this->post('/login/otp/verify', ['code' => $code])->assertRedirect('/');
    $this->assertAuthenticatedAs($this->user);

    $this->post('/logout');
    auth()->logout();
    $this->withSession(['lir_otp_email' => $this->user->email])->post('/login/otp/verify', ['code' => $code])->assertSessionHasErrors('code');
});

it('answers the same for an address without an account and sends nothing', function () {
    setMode('otp');
    Notification::fake();

    $known = $this->post('/login/otp/send', ['email' => $this->user->email]);
    $this->flushSession();
    $unknown = $this->post('/login/otp/send', ['email' => 'tidak.ada@contoh.co.id']);

    expect($unknown->headers->get('Location'))->toBe($known->headers->get('Location'));
    Notification::assertSentTimes(LoginCodeNotification::class, 1);
});

it('does not send a code to an inactive account', function () {
    setMode('otp');
    Notification::fake();
    $this->user->update(['status' => 'inactive']);

    $this->post('/login/otp/send', ['email' => $this->user->email])->assertRedirect('/login');

    Notification::assertNothingSent();
});

it('refuses a wrong code, an expired code, and burns the code after too many guesses', function () {
    setMode('otp', ['max_attempts' => 3]);
    Notification::fake();
    $this->post('/login/otp/send', ['email' => $this->user->email]);
    $code = sentCode();

    foreach (range(1, 3) as $_) {
        $this->post('/login/otp/verify', ['code' => $code === '111111' ? '222222' : '111111'])->assertSessionHasErrors('code');
    }
    $this->post('/login/otp/verify', ['code' => $code])->assertSessionHasErrors('code');

    LoginCode::query()->update(['attempts' => 0, 'expires_at' => now()->subSecond()]);
    RateLimiter::clear('lir-otp:'.sha1($this->user->email.'|127.0.0.1'));
    $this->post('/login/otp/verify', ['code' => $code])->assertSessionHasErrors('code');
    $this->assertGuest();
});

it('limits how often a code can be asked for', function () {
    setMode('otp', ['max_requests_per_hour' => 3]);
    Notification::fake();

    $this->post('/login/otp/send', ['email' => $this->user->email])->assertSessionHasNoErrors();
    $this->post('/login/otp/send', ['email' => $this->user->email])->assertSessionHasErrors('email');

    Notification::assertSentTimes(LoginCodeNotification::class, 1);
});

it('uses the length set by the administrator and shows the code only in local environment', function () {
    setMode('otp', ['length' => 8]);
    Notification::fake();
    $this->post('/login/otp/send', ['email' => $this->user->email]);

    expect(sentCode())->toMatch('/^\d{8}$/');
    $this->get('/login')->assertJsonPath('devCode', null)->assertJsonPath('otpLength', 8)->assertJsonPath('otpEmail', $this->user->email);
});

it('renders the branded email with the wording the administrator wrote', function () {
    app()->setLocale('id');
    $notification = new LoginCodeNotification('482915', 10);

    $default = $notification->toMail($this->user);
    expect($default->subject)->toBe('Kode masuk Contoh App: 482915');

    $this->actingAs($this->manager())->putJson('/lir-kit/login-code-email', ['subject' => 'Kode {kode} untuk {nama}', 'body' => 'Berlaku {menit} menit <b>x</b>'])->assertOk();
    $custom = $notification->toMail($this->user);

    expect($custom->subject)->toBe('Kode 482915 untuk Budi');
    expect(view($custom->view[0], $custom->viewData)->render())->toContain('Berlaku 10 menit')->toContain('&lt;b&gt;x&lt;/b&gt;')->toContain('482915');
});
