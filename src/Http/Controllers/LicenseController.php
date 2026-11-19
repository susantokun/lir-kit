<?php

namespace Lir\Kit\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Lir\Kit\Contracts\LoginHooks;
use Lir\Kit\Support\Licensing\LicenseException;
use Lir\Kit\Support\Licensing\LicenseManager;
use Lir\Kit\Support\Licensing\LicenseState;

/**
 * The License page: shows the state and lets the administrator activate online, upload a license file or check now.
 * Needs the ability in config 'lir-kit.ability'. It stays usable in read-only mode (see EnsureLicenseWritable).
 */
class LicenseController extends Controller
{
    public function __construct(private LicenseState $state, private LicenseManager $manager, private LoginHooks $hooks) {}

    public function show(): JsonResponse
    {
        Gate::authorize(config('lir-kit.ability'));

        return response()->json($this->state->details());
    }

    public function activate(Request $request): JsonResponse
    {
        Gate::authorize(config('lir-kit.ability'));
        $data = $request->validate(['key' => ['required', 'string', 'max:100']]);

        try {
            $license = $this->manager->activate($data['key'], mb_strtolower($request->getHost()), config('app.url'));
        } catch (LicenseException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->hooks->audit('aktivasi_license', $request->user(), null, ['key' => LicenseState::maskKey($license->key), 'domain' => $request->getHost()]);

        return response()->json($this->state->details());
    }

    public function upload(Request $request): JsonResponse
    {
        Gate::authorize(config('lir-kit.ability'));
        $request->validate(['file' => ['required', 'file', 'max:64']]);

        try {
            $license = $this->manager->installFile((string) file_get_contents($request->file('file')->getRealPath()), mb_strtolower($request->getHost()));
        } catch (LicenseException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->hooks->audit('unggah_file_license', $request->user(), null, ['key' => LicenseState::maskKey($license->key), 'domain' => $request->getHost()]);

        return response()->json($this->state->details());
    }

    public function check(): JsonResponse
    {
        Gate::authorize(config('lir-kit.ability'));

        $this->manager->check();

        return response()->json($this->state->details());
    }
}
