<?php

namespace Lir\Kit\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Lir\Kit\Contracts\LoginHooks;
use Lir\Kit\Models\MenuSetting;

/**
 * How a tenant (or the whole application) arranges its sidebar on top of the built-in menu: title, icon, order, shown or hidden, and
 * entries of its own (a link to any URL, or a folder). The whole arrangement is sent each time and replaces the
 * saved one. Hiding is cosmetic only: routes and permissions still decide what a person can open.
 */
class MenuController extends Controller
{
    private const MAX_ROWS = 300;

    public function __construct(private LoginHooks $hooks) {}

    public function show(): JsonResponse
    {
        Gate::authorize(config('lir-kit.menu_ability') ?? config('lir-kit.ability'));

        return response()->json(['items' => self::items()]);
    }

    public function update(Request $request): JsonResponse
    {
        Gate::authorize(config('lir-kit.menu_ability') ?? config('lir-kit.ability'));
        $keyPattern = 'regex:/^[A-Za-z0-9\/._-]{1,80}$/';

        $data = $request->validate([
            'items' => ['present', 'array', 'max:'.self::MAX_ROWS],
            'items.*.key' => ['required', 'string', $keyPattern, 'distinct'],
            'items.*.title' => ['nullable', 'string', 'max:60'],
            'items.*.icon' => ['nullable', 'string', Rule::in(config('lir-kit.menu_icons'))],
            'items.*.is_visible' => ['required', 'boolean'],
            'items.*.order_column' => ['nullable', 'integer', 'between:0,10000'],
            'items.*.parent_key' => ['nullable', 'string', $keyPattern],
            'items.*.kind' => ['nullable', Rule::in(['link', 'folder'])],
            'items.*.url' => ['nullable', 'string', 'max:500'],
            'items.*.new_tab' => ['nullable', 'boolean'],
        ]);

        $custom = collect($data['items'])->filter(fn (array $i) => str_starts_with($i['key'], MenuSetting::CUSTOM_PREFIX));
        $customKeys = $custom->pluck('key')->all();

        foreach ($data['items'] as $item) {
            $isCustom = in_array($item['key'], $customKeys, true);

            if (! $isCustom && (($item['kind'] ?? null) !== null || ($item['parent_key'] ?? null) !== null)) {
                $this->fail(__('Menu bawaan tidak bisa dipindah atau diberi jenis.'));
            }

            if (! $isCustom && in_array($item['key'], config('lir-kit.menu_locked'), true) && ! $item['is_visible']) {
                $this->fail(__('Menu ini tidak bisa disembunyikan.'));
            }

            if (! $isCustom) {
                continue;
            }

            if (! preg_match('/^custom\.[a-z0-9]{6,40}$/', $item['key'])) {
                $this->fail(__('Kunci menu buatan sendiri tidak valid.'));
            }

            if (blank($item['title'] ?? null)) {
                $this->fail(__('Menu buatan sendiri harus punya judul.'));
            }

            if (blank($item['parent_key'] ?? null) || $item['parent_key'] === $item['key']) {
                $this->fail(__('Menu buatan sendiri harus berada di dalam bagian atau folder.'));
            }

            if (! in_array($item['kind'] ?? null, ['link', 'folder'], true)) {
                $this->fail(__('Jenis menu harus tautan atau folder.'));
            }

            if ($item['kind'] === 'link' && ! $this->validUrl($item['url'] ?? null)) {
                $this->fail(__('Alamat ":title" tidak valid. Pakai https://... atau alamat internal yang diawali /.', ['title' => $item['title']]));
            }

            // Nested custom folders must not loop back on themselves or go deeper than the menu allows.
            $depth = 0;
            $cursor = $item;

            while ($cursor !== null && in_array($cursor['parent_key'] ?? null, $customKeys, true)) {
                $cursor = $custom->firstWhere('key', $cursor['parent_key']);
                $depth++;

                if ($depth > 2) {
                    $this->fail(__('Menu hanya boleh sampai tiga level.'));
                }
            }
        }

        $before = self::items();

        DB::transaction(function () use ($data) {
            MenuSetting::query()->delete();

            foreach ($data['items'] as $item) {
                MenuSetting::query()->create([
                    'key' => $item['key'],
                    'title' => filled($item['title'] ?? null) ? trim($item['title']) : null,
                    'icon' => $item['icon'] ?? null,
                    'is_visible' => $item['is_visible'],
                    'order_column' => $item['order_column'] ?? null,
                    'parent_key' => $item['parent_key'] ?? null,
                    'kind' => $item['kind'] ?? null,
                    'url' => ($item['kind'] ?? null) === 'link' ? $item['url'] : null,
                    'new_tab' => ($item['kind'] ?? null) === 'link' && ($item['new_tab'] ?? false),
                ]);
            }
        });

        $this->hooks->audit('ubah_menu', $request->user(), $before, self::items());

        return response()->json(['items' => self::items()]);
    }

    /**
     * Back to the built-in menu.
     */
    public function destroy(Request $request): JsonResponse
    {
        Gate::authorize(config('lir-kit.menu_ability') ?? config('lir-kit.ability'));
        $before = self::items();
        MenuSetting::query()->delete();
        $this->hooks->audit('reset_menu', $request->user(), $before, []);

        return response()->json(['items' => []]);
    }

    /**
     * What the sidebar needs from the saved arrangement.
     *
     * @return list<array<string, mixed>>
     */
    public static function items(): array
    {
        return MenuSetting::query()->orderBy('order_column')->orderBy('id')
            ->get(['key', 'title', 'icon', 'is_visible', 'order_column', 'parent_key', 'kind', 'url', 'new_tab'])
            ->map(fn (MenuSetting $m) => $m->toArray())
            ->all();
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['items' => $message]);
    }

    /**
     * An external http(s) address, or an absolute path on this site. Never //host, javascript: or anything else.
     */
    private function validUrl(mixed $url): bool
    {
        if (! is_string($url) || $url === '' || preg_match('/\s/', $url) === 1) {
            return false;
        }

        if (preg_match('#^https?://#i', $url) === 1) {
            return filter_var($url, FILTER_VALIDATE_URL) !== false;
        }

        return str_starts_with($url, '/') && ! str_starts_with($url, '//');
    }
}
