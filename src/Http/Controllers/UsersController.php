<?php

namespace Lir\Kit\Http\Controllers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Lir\Kit\Contracts\LoginHooks;
use Lir\Kit\Contracts\UserDirectory;
use Lir\Kit\Models\Role;
use Lir\Kit\Services\Access;
use Lir\Kit\Services\UserInvitation;
use Lir\Kit\Support\Licensing\LicenseState;

/**
 * The Pengguna screen: list, invite, change (name, email, status, roles) and remove people. The users stay the
 * application's own; the kit reaches them through UserDirectory and only adds roles on top.
 */
class UsersController extends Controller
{
    private const PER_PAGE = 15;

    public function __construct(
        private UserDirectory $users,
        private Access $access,
        private LoginHooks $hooks,
        private UserInvitation $invitation,
        private LicenseState $license,
    ) {}

    public function index(Request $request): JsonResponse
    {
        Gate::authorize(Access::usersAbility());

        $search = trim((string) $request->query('q', ''));
        $query = $this->users->query();

        if ($search !== '') {
            $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $search).'%';
            $query->where(fn ($q) => $q->where('name', 'like', $like)->orWhere('email', 'like', $like));
        }

        if ($request->filled('role')) {
            $holders = DB::table(config('lir-kit.tables.role_user', 'lir_role_user'))
                ->where('role_id', (int) $request->query('role'))->pluck('user_id');
            $query->whereIn($query->getModel()->getKeyName(), $holders);
        }

        $page = $query->orderBy('name')->paginate(self::PER_PAGE);

        return response()->json([
            'data' => $this->present($page->getCollection()),
            'meta' => ['total' => $page->total(), 'page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage()],
            'roles' => Role::query()->orderBy('name')->get(['id', 'key', 'name'])->all(),
            'supports_status' => $this->users->supportsStatus(),
            'stats' => $this->stats(),
        ]);
    }

    /**
     * Headcount for the cards above the list, whatever the search or filter: everyone, and (when accounts have a
     * status) how many are active and inactive.
     *
     * @return array{total: int, active: int|null, inactive: int|null}
     */
    private function stats(): array
    {
        $total = $this->users->query()->count();

        if (! $this->users->supportsStatus()) {
            return ['total' => $total, 'active' => null, 'inactive' => null];
        }

        return [
            'total' => $total,
            'active' => $this->users->query()->where('status', 'active')->count(),
            'inactive' => $this->users->query()->where('status', 'inactive')->count(),
        ];
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize(Access::usersAbility());

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique($this->users->table(), 'email')],
            'roles' => ['array'],
            'roles.*' => ['integer'],
            'send_invitation' => ['boolean'],
        ]);
        $roleIds = $this->validRoleIds($data['roles'] ?? []);
        $this->license->guardUserQuota();

        $attributes = ['name' => $data['name'], 'email' => $data['email'], 'password' => Hash::make(Str::random(40))];

        if ($this->users->supportsStatus()) {
            $attributes['status'] = 'active';
        }

        $user = DB::transaction(function () use ($attributes, $roleIds) {
            $user = $this->users->create($attributes);
            $this->access->syncRoles($user->getKey(), $roleIds);

            return $user;
        });

        if ($data['send_invitation'] ?? true) {
            $this->invitation->send($user, $request->user());
        }

        $this->hooks->audit('tambah_pengguna', $request->user(), null, ['email' => $user->getAttribute('email'), 'roles' => $roleIds]);

        return response()->json(['data' => $this->present(collect([$user]))[0]], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        Gate::authorize(Access::usersAbility());
        $user = $this->find($id);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique($this->users->table(), 'email')->ignore($user->getKey(), $user->getKeyName())],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'roles' => ['array'],
            'roles.*' => ['integer'],
        ]);
        $roleIds = $this->validRoleIds($data['roles'] ?? []);
        $isSelf = (string) $user->getKey() === (string) $request->user()?->getAuthIdentifier();

        if ($isSelf && ($data['status'] ?? 'active') === 'inactive') {
            $this->fail(__('Anda tidak bisa menonaktifkan akun Anda sendiri.'));
        }

        if ($this->users->supportsStatus() && ($data['status'] ?? null) === 'active' && $user->getAttribute('status') === 'inactive') {
            $this->license->guardUserQuota();
        }

        $this->guardLastSuperadmin($user, $roleIds, ($data['status'] ?? 'active') === 'inactive');

        $before = ['name' => $user->getAttribute('name'), 'email' => $user->getAttribute('email'), 'roles' => $this->access->rolesOf($user->getKey())->pluck('id')->all()];

        $attributes = ['name' => $data['name'], 'email' => $data['email']];

        if ($this->users->supportsStatus() && isset($data['status'])) {
            $attributes['status'] = $data['status'];
        }

        DB::transaction(function () use ($user, $attributes, $roleIds) {
            $this->users->update($user, $attributes);
            $this->access->syncRoles($user->getKey(), $roleIds);
        });

        $this->hooks->audit('ubah_pengguna', $request->user(), $before, ['name' => $data['name'], 'email' => $data['email'], 'status' => $data['status'] ?? null, 'roles' => $roleIds]);

        return response()->json(['data' => $this->present(collect([$user->refresh()]))[0]]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        Gate::authorize(Access::usersAbility());
        $user = $this->find($id);

        if ((string) $user->getKey() === (string) $request->user()?->getAuthIdentifier()) {
            $this->fail(__('Anda tidak bisa menghapus akun Anda sendiri.'));
        }

        $this->guardLastSuperadmin($user, [], true);

        DB::transaction(function () use ($user) {
            $this->access->syncRoles($user->getKey(), []);
            $this->users->delete($user);
        });

        $this->hooks->audit('hapus_pengguna', $request->user(), ['email' => $user->getAttribute('email')], null);

        return response()->json(['ok' => true]);
    }

    /**
     * Sends the invitation again (for someone who has not signed in yet).
     */
    public function invite(Request $request, string $id): JsonResponse
    {
        Gate::authorize(Access::usersAbility());
        $user = $this->find($id);
        $this->invitation->send($user, $request->user());
        $this->hooks->audit('undang_ulang_pengguna', $request->user(), null, ['email' => $user->getAttribute('email')]);

        return response()->json(['ok' => true]);
    }

    private function find(string $id): Model
    {
        return $this->users->find($id) ?? abort(404);
    }

    /**
     * Only ids of roles of this tenant, so a request cannot hand out another tenant's role.
     *
     * @param  array<int, mixed>  $ids
     * @return list<int>
     */
    private function validRoleIds(array $ids): array
    {
        $ids = array_values(array_unique(array_map('intval', $ids)));
        $valid = Role::query()->whereIn('id', $ids)->pluck('id')->map(fn ($id) => (int) $id)->all();

        if (count($valid) !== count($ids)) {
            throw ValidationException::withMessages(['roles' => __('Ada peran yang tidak dikenal.')]);
        }

        return $valid;
    }

    /**
     * The last superadmin can neither lose the role nor be switched off or removed, so the app is never left without one.
     *
     * @param  list<int>  $newRoleIds
     */
    private function guardLastSuperadmin(Model $user, array $newRoleIds, bool $goingAway): void
    {
        $superadmin = $this->access->superadminRole();
        $holdsNow = $this->access->rolesOf($user->getKey())->contains(fn (Role $r) => $r->getKey() === $superadmin->getKey());
        $keeps = in_array($superadmin->getKey(), $newRoleIds, true) && ! $goingAway;

        if ($holdsNow && ! $keeps && $this->access->superadminCount() <= 1) {
            $this->fail(__('Harus ada setidaknya satu Superadmin yang aktif.'));
        }
    }

    /**
     * @param  Collection<int, Model>  $users
     * @return list<array<string, mixed>>
     */
    private function present(Collection $users): array
    {
        $ids = $users->map(fn (Model $u) => (string) $u->getKey())->all();
        $pivot = DB::table(config('lir-kit.tables.role_user', 'lir_role_user'))->whereIn('user_id', $ids)->get(['user_id', 'role_id'])->groupBy('user_id');
        $roles = Role::query()->get(['id', 'key', 'name'])->keyBy('id');
        $withStatus = $this->users->supportsStatus();

        return $users->map(fn (Model $user) => [
            'id' => (string) $user->getKey(),
            'name' => $user->getAttribute('name'),
            'email' => $user->getAttribute('email'),
            'status' => $withStatus ? ($user->getAttribute('status') ?? 'active') : null,
            'roles' => collect($pivot->get((string) $user->getKey(), []))
                ->map(fn ($row) => $roles->get($row->role_id))->filter()
                ->map(fn (Role $r) => ['id' => $r->id, 'key' => $r->key, 'name' => $r->name])->values()->all(),
        ])->values()->all();
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['user' => $message]);
    }
}
