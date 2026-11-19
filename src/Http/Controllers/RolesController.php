<?php

namespace Lir\Kit\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Lir\Kit\Contracts\LoginHooks;
use Lir\Kit\Models\Role;
use Lir\Kit\Services\Access;

/**
 * The Peran screen: roles and the permissions each holds. The "superadmin" role is built in and cannot be changed or removed.
 */
class RolesController extends Controller
{
    public function __construct(private Access $access, private LoginHooks $hooks) {}

    public function index(): JsonResponse
    {
        Gate::authorize(Access::rolesAbility());
        $this->access->superadminRole();

        return response()->json(['roles' => $this->roles(), 'groups' => $this->access->groups()]);
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize(Access::rolesAbility());
        $data = $this->validated($request);

        $role = Role::query()->create([
            'key' => $this->access->uniqueKey($data['name']),
            'name' => trim($data['name']),
            'description' => $data['description'] ?? null,
        ]);
        $this->access->syncPermissions($role, $data['permissions'] ?? []);
        $this->hooks->audit('tambah_peran', $request->user(), null, ['name' => $role->name, 'permissions' => $data['permissions'] ?? []]);

        return response()->json(['roles' => $this->roles()], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        Gate::authorize(Access::rolesAbility());
        $role = $this->find($id);
        $this->refuseSystem($role);
        $data = $this->validated($request);

        $before = ['name' => $role->name, 'permissions' => $role->permissions()->pluck('permission')->all()];
        $role->update(['name' => trim($data['name']), 'description' => $data['description'] ?? null]);
        $this->access->syncPermissions($role, $data['permissions'] ?? []);
        $this->hooks->audit('ubah_peran', $request->user(), $before, ['name' => $role->name, 'permissions' => $data['permissions'] ?? []]);

        return response()->json(['roles' => $this->roles()]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        Gate::authorize(Access::rolesAbility());
        $role = $this->find($id);
        $this->refuseSystem($role);

        if (($this->access->userCounts()[$role->getKey()] ?? 0) > 0) {
            throw ValidationException::withMessages(['role' => __('Peran ini masih dipakai pengguna. Lepaskan dulu dari penggunanya.')]);
        }

        $role->delete();
        $this->hooks->audit('hapus_peran', $request->user(), ['name' => $role->name], null);

        return response()->json(['roles' => $this->roles()]);
    }

    private function find(int $id): Role
    {
        return Role::query()->findOrFail($id);
    }

    private function refuseSystem(Role $role): void
    {
        if ($role->is_system) {
            throw ValidationException::withMessages(['role' => __('Peran bawaan tidak bisa diubah atau dihapus.')]);
        }
    }

    /**
     * @return array{name: string, description: ?string, permissions: list<string>}
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['array'],
            'permissions.*' => ['string', 'in:'.implode(',', $this->access->keys())],
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function roles(): array
    {
        $counts = $this->access->userCounts();

        return Role::query()->with('permissions')->orderByDesc('is_system')->orderBy('name')->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'key' => $role->key,
                'name' => $role->name,
                'description' => $role->description,
                'is_system' => $role->is_system,
                'permissions' => $role->is_system ? $this->access->keys() : $role->permissions->pluck('permission')->values()->all(),
                'users_count' => $counts[$role->id] ?? 0,
            ])->all();
    }
}
