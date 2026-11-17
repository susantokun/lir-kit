<?php

namespace Lir\Kit\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Lir\Kit\Contracts\LoginHooks;
use Lir\Kit\Services\LoginCodeEmail;
use Lir\Kit\Services\LoginMethod;
use Lir\Kit\Services\MailSettings;

/**
 * How everyone signs in (password, emailed code, or either), the rules of the code, and the wording of its email.
 * Needs the `lir-kit.manage` ability; every change goes to the audit hook.
 */
class LoginSettingsController extends Controller
{
    public function __construct(private LoginMethod $method, private LoginCodeEmail $email, private MailSettings $mail, private LoginHooks $hooks) {}

    public function showMethod(): JsonResponse
    {
        $this->authorizeManage();

        return response()->json($this->payload());
    }

    public function updateMethod(Request $request): JsonResponse
    {
        $this->authorizeManage();
        $data = $request->validate([
            'mode' => ['required', Rule::in(LoginMethod::MODES)],
            'length' => ['required', 'integer', 'between:4,8'],
            'ttl_minutes' => ['required', 'integer', 'between:1,30'],
            'max_attempts' => ['required', 'integer', 'between:3,10'],
            'resend_seconds' => ['required', 'integer', 'between:30,300'],
            'max_requests_per_hour' => ['required', 'integer', 'between:3,20'],
        ]);

        // Codes only work if the server can really send email; otherwise the administrator would lock everyone out.
        abort_if(
            $data['mode'] !== LoginMethod::PASSWORD && ! $this->mailReady(),
            422,
            __('Pengiriman email belum diatur, jadi kode tidak akan sampai. Isi dan aktifkan "Email pengirim" di halaman ini dulu.'),
        );

        $before = $this->method->all();
        $this->method->save($data);
        $this->hooks->audit('ubah_metode_masuk', $request->user(), $before, $this->method->all());

        return response()->json($this->payload());
    }

    public function showEmail(): JsonResponse
    {
        $this->authorizeManage();

        return response()->json($this->emailPayload());
    }

    public function updateEmail(Request $request): JsonResponse
    {
        $this->authorizeManage();
        $data = $request->validate(['subject' => ['nullable', 'string', 'max:200'], 'body' => ['nullable', 'string', 'max:3000']]);

        $before = $this->email->custom();
        $this->email->save($data['subject'] ?? null, $data['body'] ?? null);
        $this->hooks->audit('ubah_template_email_kode', $request->user(), $before, $this->email->custom());

        return response()->json($this->emailPayload());
    }

    public function resetEmail(Request $request): JsonResponse
    {
        $this->authorizeManage();
        $before = $this->email->custom();
        $this->email->reset();
        $this->hooks->audit('reset_template_email_kode', $request->user(), $before, null);

        return response()->json($this->emailPayload());
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(): array
    {
        return $this->method->all() + ['mail_ready' => $this->mailReady()];
    }

    /**
     * @return array<string, mixed>
     */
    private function emailPayload(): array
    {
        return [
            'custom' => $this->email->custom(),
            'defaults' => LoginCodeEmail::defaults(),
            'placeholders' => collect(LoginCodeEmail::PLACEHOLDERS)->map(fn ($label, $key) => ['key' => $key, 'label' => __($label)])->values(),
        ];
    }

    private function mailReady(): bool
    {
        return app()->environment(['local', 'testing']) || $this->mail->canDeliver();
    }

    private function authorizeManage(): void
    {
        Gate::authorize(config('lir-kit.ability'));
    }
}
