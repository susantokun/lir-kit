<?php

namespace Lir\Kit\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Lir\Kit\Contracts\LoginHooks;
use Lir\Kit\Services\MailSettings;

/**
 * The outgoing mail server and sender address of the whole installation. The password is never returned, and every
 * change goes to the audit hook (without it). "Test" sends a sample sign-in email through the saved settings.
 */
class MailSettingsController extends Controller
{
    public function __construct(private MailSettings $mail, private LoginHooks $hooks) {}

    public function show(): JsonResponse
    {
        Gate::authorize(config('lir-kit.ability'));

        return response()->json($this->mail->all());
    }

    public function update(Request $request): JsonResponse
    {
        Gate::authorize(config('lir-kit.ability'));
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'host' => ['required_if:enabled,true', 'nullable', 'string', 'max:255', 'regex:/^[A-Za-z0-9.\-]+$/'],
            'port' => ['required', 'integer', 'between:1,65535'],
            'encryption' => ['required', Rule::in(MailSettings::ENCRYPTIONS)],
            'username' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:500'],
            'from_address' => ['required', 'email', 'max:255'],
            'from_name' => ['required', 'string', 'max:100'],
        ]);

        $before = $this->mail->all();
        $this->mail->save($data + ['host' => $data['host'] ?? '']);
        $this->hooks->audit('ubah_pengaturan_email', $request->user(), $before, $this->mail->all());

        return response()->json($this->mail->all());
    }

    public function test(Request $request): JsonResponse
    {
        Gate::authorize(config('lir-kit.ability'));
        $data = $request->validate(['to' => ['required', 'email', 'max:255']]);

        return response()->json($this->mail->sendTest($data['to']));
    }
}
