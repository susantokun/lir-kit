<?php

namespace Lir\Kit\Services;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Lir\Kit\Models\AuditCheckpoint;
use Lir\Kit\Models\AuditLog;

/**
 * Writes the audit log and guards it. Every entry stores the hash of the entry before it (a chain), so an edited
 * or removed line shows when the chain is verified; each clean verification also saves a reference point, which
 * catches a chain that was quietly recomputed. Values that look like secrets are masked before they are stored.
 */
class AuditTrail
{
    /** Request context was added to the hash only when present, so rows without it keep a stable hash. */
    private const OPTIONAL = ['user_agent', 'method', 'url'];

    private const FIELDS = [
        'actor_id', 'role', 'entity', 'entity_id', 'action', 'before', 'after', 'note', 'ip', 'user_agent', 'method', 'url', 'prev_hash',
    ];

    public function __construct(private Access $access) {}

    /**
     * The kind of thing an action touches, taken from the action code (the hook only hands over the action).
     */
    public static function entityFor(string $action): string
    {
        return match (true) {
            $action === 'masuk_otp' => 'sesi',
            str_ends_with($action, '_pengguna') => 'user',
            str_ends_with($action, '_peran') => 'role',
            str_ends_with($action, '_menu') => 'menu',
            $action === 'ubah_metode_masuk' => 'login_method',
            $action === 'ubah_situs' => 'site',
            in_array($action, ['aktivasi_license', 'unggah_file_license'], true) => 'license',
            str_ends_with($action, '_email_kode'), $action === 'ubah_pengaturan_email' => 'email',
            in_array($action, ['verifikasi_integritas', 'integritas_rusak', 'ekspor_audit'], true) => 'audit_log',
            default => 'sistem',
        };
    }

    public function log(
        string $action,
        ?Authenticatable $actor = null,
        mixed $before = null,
        mixed $after = null,
        ?string $entity = null,
        string|int|null $entityId = null,
        ?string $note = null,
    ): AuditLog {
        $request = request();
        $path = $request->path();

        return DB::transaction(function () use ($action, $actor, $before, $after, $entity, $entityId, $note, $request, $path) {
            $previous = AuditLog::query()->orderByDesc('id')->lockForUpdate()->first();
            $payload = [
                'actor_id' => $actor === null ? null : (string) $actor->getAuthIdentifier(),
                'role' => $actor === null ? null : $this->roleKeys($actor),
                'entity' => $entity ?? self::entityFor($action),
                'entity_id' => $entityId === null ? null : (string) $entityId,
                'action' => $action,
                'before' => $this->encode($before),
                'after' => $this->encode($after),
                'note' => $note,
                'ip' => $request->ip(),
                'user_agent' => $this->clip($request->userAgent(), 255),
                'method' => $request->method(),
                'url' => $this->clip('/'.ltrim($path, '/'), 500),
                'prev_hash' => $previous?->hash,
                'created_at' => now()->format('Y-m-d H:i:s'),
            ];

            return AuditLog::query()->create($payload + ['hash' => $this->hash($payload)]);
        });
    }

    /**
     * The first entry that does not fit the chain, or null when the whole chain is intact.
     *   - "rantai_putus": it points to another predecessor than the one before it (an entry in between was removed).
     *   - "isi_berubah": its content no longer matches its hash (it was edited after it was written).
     *   - "titik_acuan": it no longer matches a reference point taken earlier (the chain was rewritten).
     *
     * @return array{id: int, alasan: string}|null
     */
    public function firstBrokenEntry(): ?array
    {
        $previousHash = null;

        foreach (AuditLog::query()->orderBy('id')->cursor() as $entry) {
            if ($entry->prev_hash !== $previousHash) {
                return ['id' => (int) $entry->id, 'alasan' => 'rantai_putus'];
            }

            if ($entry->hash !== $this->hash($entry->only([...self::FIELDS, 'created_at']))) {
                return ['id' => (int) $entry->id, 'alasan' => 'isi_berubah'];
            }

            $previousHash = $entry->hash;
        }

        foreach (AuditCheckpoint::query()->orderBy('id')->cursor() as $point) {
            $entry = AuditLog::query()->find($point->log_id);

            if ($entry === null || $entry->hash !== $point->hash) {
                return ['id' => (int) $point->log_id, 'alasan' => 'titik_acuan'];
            }
        }

        return null;
    }

    /**
     * Checks the whole chain, writes the result to the audit log, and (when intact and something new was written
     * since the last one) saves a reference point.
     *
     * @return array{valid: bool, rusak: array{id: int, alasan: string}|null, jumlah: int, diperiksa_pada: string}
     */
    public function verify(?Authenticatable $actor = null, bool $scheduled = false): array
    {
        $broken = $this->firstBrokenEntry();
        $count = AuditLog::query()->count();

        $this->log(
            $broken ? 'integritas_rusak' : 'verifikasi_integritas',
            $actor,
            null,
            ['valid' => $broken === null, 'rusak' => $broken, 'jumlah' => $count, 'terjadwal' => $scheduled],
        );

        if ($broken !== null) {
            Log::critical('lir-kit: integritas log audit bermasalah', $broken);
        } else {
            $this->checkpoint();
        }

        return ['valid' => $broken === null, 'rusak' => $broken, 'jumlah' => $count, 'diperiksa_pada' => now()->toIso8601String()];
    }

    private function checkpoint(): void
    {
        $last = AuditLog::query()->orderByDesc('id')->first();
        $previous = AuditCheckpoint::query()->orderByDesc('id')->first();

        if ($last === null || $previous?->log_id === $last->id) {
            return;
        }

        AuditCheckpoint::query()->create(['log_id' => $last->id, 'hash' => $last->hash, 'count' => AuditLog::query()->count()]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function hash(array $payload): string
    {
        foreach (self::OPTIONAL as $optional) {
            if (($payload[$optional] ?? null) === null) {
                unset($payload[$optional]);
            }
        }

        $payload['created_at'] = (string) $payload['created_at'];
        ksort($payload);

        return hash('sha256', json_encode($payload, JSON_UNESCAPED_UNICODE));
    }

    private function roleKeys(Authenticatable $actor): ?string
    {
        try {
            return $this->access->rolesOf($actor)->pluck('key')->implode(',') ?: null;
        } catch (\Throwable) {
            return null;
        }
    }

    private function clip(?string $value, int $max): ?string
    {
        return $value === null ? null : mb_substr($value, 0, $max);
    }

    private function encode(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return is_scalar($value) ? (string) $value : json_encode($this->redact($value), JSON_UNESCAPED_UNICODE);
    }

    private function redact(mixed $value): mixed
    {
        if (! is_array($value)) {
            return $value;
        }

        foreach ($value as $key => $item) {
            $value[$key] = is_string($key) && preg_match('/password|secret|token|kata_sandi/i', $key) && ! str_starts_with($key, 'has_')
                ? '***'
                : $this->redact($item);
        }

        return $value;
    }
}
