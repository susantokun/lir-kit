<?php

namespace Lir\Kit\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Lir\Kit\Contracts\UserDirectory;
use Lir\Kit\Models\AuditLog;

/**
 * Reads the audit log: the filters (shared by the page and the export), and turns raw rows into what an auditor
 * needs: who did what, to which object, when and from where, with the before and after values.
 */
class AuditQuery
{
    public const CATEGORIES = [
        'keamanan' => 'Keamanan & akses',
        'pengguna' => 'Pengguna & hak akses',
        'konfigurasi' => 'Konfigurasi',
    ];

    public const OUTCOMES = ['berhasil' => 'Berhasil', 'gagal' => 'Gagal', 'ditolak' => 'Ditolak'];

    public function __construct(private UserDirectory $users) {}

    public static function category(string $entity, string $action): string
    {
        return match (true) {
            in_array($entity, ['sesi', 'login_method', 'audit_log'], true) => 'keamanan',
            in_array($entity, ['user', 'role'], true) => 'pengguna',
            default => 'konfigurasi',
        };
    }

    public static function outcome(string $entity, string $action): string
    {
        return match (true) {
            str_contains($action, 'ditolak') => 'ditolak',
            str_contains($action, 'gagal'), str_contains($action, 'rusak') => 'gagal',
            default => 'berhasil',
        };
    }

    public static function severity(string $entity, string $action): string
    {
        return match (true) {
            str_contains($action, 'rusak') => 'kritis',
            str_contains($action, 'gagal'), str_starts_with($action, 'hapus_'), $action === 'ubah_metode_masuk', $action === 'ubah_pengaturan_email', $action === 'ubah_peran' => 'peringatan',
            default => 'info',
        };
    }

    /**
     * @return Builder<AuditLog>
     */
    public function filtered(Request $request): Builder
    {
        $query = AuditLog::query();

        $q = trim((string) $request->query('q', ''));

        if ($q !== '') {
            $like = '%'.addcslashes($q, '%_\\').'%';
            $query->where(fn ($w) => $w->where('action', 'like', $like)->orWhere('entity', 'like', $like)->orWhere('note', 'like', $like)
                ->orWhere('role', 'like', $like)->orWhere('ip', 'like', $like)->orWhere('hash', 'like', $like));
        }

        $query->when($request->query('id'), fn ($b, $v) => $b->whereKey((int) $v))
            ->when($request->query('entitas'), fn ($b, $v) => $b->where('entity', $v))
            ->when($request->query('aksi'), fn ($b, $v) => $b->where('action', $v))
            ->when($request->query('peran'), fn ($b, $v) => $b->where('role', 'like', '%'.addcslashes((string) $v, '%_\\').'%'))
            ->when($request->query('ip'), fn ($b, $v) => $b->where('ip', $v))
            ->when($request->query('dari'), fn ($b, $v) => $b->where('created_at', '>=', $v.' 00:00:00'))
            ->when($request->query('sampai'), fn ($b, $v) => $b->where('created_at', '<=', $v.' 23:59:59'));

        if ($actor = $request->query('aktor')) {
            $actor === 'sistem' ? $query->whereNull('actor_id') : $query->where('actor_id', (string) $actor);
        }

        foreach (['kategori' => self::category(...), 'hasil' => self::outcome(...), 'tingkat' => self::severity(...)] as $param => $classify) {
            if ($wanted = $request->query($param)) {
                $pairs = AuditLog::query()->select('entity', 'action')->distinct()->get()
                    ->filter(fn ($p) => $classify($p->entity, $p->action) === $wanted);

                $pairs->isEmpty()
                    ? $query->whereRaw('1 = 0')
                    : $query->where(function ($w) use ($pairs) {
                        foreach ($pairs as $p) {
                            $w->orWhere(fn ($x) => $x->where('entity', $p->entity)->where('action', $p->action));
                        }
                    });
            }
        }

        return $query;
    }

    /**
     * Values for the filter drop-downs: only what actually appears in the log.
     *
     * @return array<string, mixed>
     */
    public function facets(): array
    {
        $actorIds = AuditLog::query()->whereNotNull('actor_id')->distinct()->pluck('actor_id')->all();

        return [
            'entitas' => AuditLog::query()->distinct()->orderBy('entity')->pluck('entity'),
            'aksi' => AuditLog::query()->distinct()->orderBy('action')->pluck('action'),
            'peran' => AuditLog::query()->whereNotNull('role')->distinct()->pluck('role')->flatMap(fn ($p) => explode(',', $p))->unique()->sort()->values(),
            'aktor' => $this->actors($actorIds)->values(),
            'kategori' => collect(self::CATEGORIES)->map(fn ($label, $key) => ['key' => $key, 'label' => __($label)])->values(),
            'hasil' => collect(self::OUTCOMES)->map(fn ($label, $key) => ['key' => $key, 'label' => __($label)])->values(),
        ];
    }

    /**
     * @param  Collection<int, AuditLog>  $logs
     * @return Collection<int, array<string, mixed>>
     */
    public function present(Collection $logs): Collection
    {
        $actors = $this->actors($logs->pluck('actor_id')->filter()->unique()->all());

        return $logs->map(function (AuditLog $l) use ($actors) {
            $before = $this->decode($l->before);
            $after = $this->decode($l->after);

            return [
                'id' => (string) $l->id,
                'waktu' => $l->created_at,
                'aktor' => $l->actor_id ? ($actors->get($l->actor_id) ?? ['id' => $l->actor_id, 'nama' => '#'.$l->actor_id, 'email' => '']) : null,
                'peran' => $l->role,
                'entitas' => $l->entity,
                'entitas_id' => $l->entity_id,
                'aksi' => $l->action,
                'kategori' => self::category($l->entity, $l->action),
                'hasil' => self::outcome($l->entity, $l->action),
                'tingkat' => self::severity($l->entity, $l->action),
                'catatan' => $l->note,
                'ip' => $l->ip,
                'user_agent' => $l->user_agent,
                'metode' => $l->method,
                'url' => $l->url,
                'hash' => $l->hash,
                'prev_hash' => $l->prev_hash,
                'sebelum' => $before,
                'sesudah' => $after,
                'perubahan' => $this->diff($before, $after),
            ];
        });
    }

    /**
     * @param  list<string>  $ids
     * @return Collection<string, array{id: string, nama: string, email: string}>
     */
    private function actors(array $ids): Collection
    {
        if ($ids === []) {
            return collect();
        }

        $query = $this->users->query();

        return $query->whereIn($query->getModel()->getKeyName(), $ids)->orderBy('name')->get()
            ->mapWithKeys(fn ($u) => [(string) $u->getKey() => ['id' => (string) $u->getKey(), 'nama' => (string) $u->getAttribute('name'), 'email' => (string) $u->getAttribute('email')]]);
    }

    private function decode(?string $value): mixed
    {
        if ($value === null || $value === '') {
            return null;
        }

        $json = json_decode($value, true);

        return json_last_error() === JSON_ERROR_NONE && is_array($json) ? $json : $value;
    }

    /**
     * Field-by-field changes when both sides are structured; otherwise empty (the raw values are still returned).
     *
     * @return list<array{field: string, sebelum: mixed, sesudah: mixed}>
     */
    private function diff(mixed $before, mixed $after): array
    {
        $b = is_array($before) ? $before : [];
        $a = is_array($after) ? $after : [];
        $changes = [];

        foreach (array_unique([...array_keys($b), ...array_keys($a)]) as $field) {
            if (($b[$field] ?? null) !== ($a[$field] ?? null)) {
                $changes[] = ['field' => (string) $field, 'sebelum' => $b[$field] ?? null, 'sesudah' => $a[$field] ?? null];
            }
        }

        return $changes;
    }
}
