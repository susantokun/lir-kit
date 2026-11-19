<?php

namespace Lir\Kit\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Lir\Kit\Models\AuditCheckpoint;
use Lir\Kit\Services\Access;
use Lir\Kit\Services\AuditQuery;
use Lir\Kit\Services\AuditTrail;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The Log Audit screen: search and filter the audit log, export it, and verify that nothing was changed or removed.
 * Needs the ability in config 'lir-kit.audit_ability'. Exporting and verifying are written to the log themselves.
 */
class AuditLogController extends Controller
{
    public function __construct(private AuditQuery $query, private AuditTrail $trail) {}

    public function index(Request $request): JsonResponse
    {
        Gate::authorize(Access::auditAbility());
        $request->validate(['dari' => ['nullable', 'date'], 'sampai' => ['nullable', 'date'], 'per_page' => ['nullable', 'integer', 'between:5,100']]);

        $page = $this->query->filtered($request)->orderByDesc('id')->paginate((int) $request->query('per_page', 25));

        return response()->json([
            'data' => $this->query->present(collect($page->items())),
            'meta' => ['total' => $page->total(), 'page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage()],
            'facets' => $this->query->facets(),
        ]);
    }

    public function verify(Request $request): JsonResponse
    {
        Gate::authorize(Access::auditAbility());

        return response()->json($this->trail->verify($request->user()));
    }

    /**
     * Reference points, newest first, so they can be copied into a record kept outside the database.
     */
    public function checkpoints(): JsonResponse
    {
        Gate::authorize(Access::auditAbility());

        return response()->json(['data' => AuditCheckpoint::query()->orderByDesc('id')->limit(20)->get()
            ->map(fn (AuditCheckpoint $c) => ['id' => $c->id, 'log_id' => $c->log_id, 'hash' => $c->hash, 'jumlah' => $c->count, 'waktu' => $c->created_at?->toIso8601String()])]);
    }

    public function export(Request $request): StreamedResponse
    {
        Gate::authorize(Access::auditAbility());
        $request->validate(['dari' => ['nullable', 'date'], 'sampai' => ['nullable', 'date']]);

        $query = $this->query->filtered($request)->orderBy('id');
        $this->trail->log('ekspor_audit', $request->user(), null, $request->query());

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, array_map(__(...), ['ID', 'Waktu', 'Pelaku', 'Peran', 'Objek', 'ID Objek', 'Aksi', 'Sebelum', 'Sesudah', 'Catatan', 'IP', 'User Agent', 'Metode', 'URL', 'Hash Sebelumnya', 'Hash']));

            foreach ($query->lazyById(500) as $log) {
                fputcsv($out, array_map(self::safe(...), [
                    $log->id, $log->created_at, $log->actor_id, $log->role, $log->entity, $log->entity_id, $log->action,
                    $log->before, $log->after, $log->note, $log->ip, $log->user_agent, $log->method, $log->url, $log->prev_hash, $log->hash,
                ]));
            }

            fclose($out);
        }, 'audit-'.now()->format('Ymd-His').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * A cell that starts like a spreadsheet formula is made plain text, so opening the file cannot run anything.
     */
    private static function safe(mixed $value): mixed
    {
        return is_string($value) && $value !== '' && in_array($value[0], ['=', '+', '-', '@', "\t", "\r"], true) ? "'".$value : $value;
    }
}
