<?php

use Illuminate\Support\Facades\DB;
use Lir\Kit\Models\AuditCheckpoint;
use Lir\Kit\Models\AuditLog;
use Lir\Kit\Services\AuditTrail;

/** Someone who may open the audit screen (ability 'lir-kit.manage'), or, with false, someone who may not. */
function auditor(bool $allowed = true): Lir\Kit\Tests\TestUser
{
    config(['lir-kit.register_gate' => false]);
    $user = Lir\Kit\Tests\TestUser::query()->create(['name' => 'Auditor', 'email' => 'auditor@contoh.co.id']);

    if ($allowed) {
        Illuminate\Support\Facades\Gate::define('lir-kit.manage', fn ($u) => $u->is($user));
    }

    return $user;
}

it('keeps the audit screen closed without the ability', function () {
    $user = auditor(false);

    $this->actingAs($user)->getJson('/lir-kit/audit-log')->assertForbidden();
    $this->actingAs($user)->postJson('/lir-kit/audit-log/verify')->assertForbidden();
    $this->actingAs($user)->get('/lir-kit/audit-log/export')->assertForbidden();
});

it('writes hook audits to a hash chain and masks secrets', function () {
    $user = auditor();
    $trail = app(AuditTrail::class);

    $trail->log('ubah_pengaturan_email', $user, ['host' => 'a'], ['host' => 'b', 'password' => 'rahasia', 'has_password' => true]);
    $trail->log('tambah_pengguna', $user, null, ['email' => 'x@contoh.co.id']);

    [$first, $second] = AuditLog::query()->orderBy('id')->get()->all();

    expect($first->prev_hash)->toBeNull()
        ->and($second->prev_hash)->toBe($first->hash)
        ->and($first->entity)->toBe('email')
        ->and($second->entity)->toBe('user')
        ->and($first->after)->not->toContain('rahasia')->toContain('"has_password":true')
        ->and($trail->firstBrokenEntry())->toBeNull();
});

it('refuses to edit or delete a line of the log', function () {
    app(AuditTrail::class)->log('tambah_peran', null);
    $entry = AuditLog::query()->firstOrFail();

    expect(fn () => $entry->update(['note' => 'x']))->toThrow(LogicException::class)
        ->and(fn () => $entry->delete())->toThrow(LogicException::class);
});

it('catches an edited line, a removed line and a rewritten chain', function () {
    $trail = app(AuditTrail::class);

    foreach (['tambah_peran', 'ubah_peran', 'hapus_peran'] as $action) {
        $trail->log($action, null);
    }

    $table = config('lir-kit.tables.audit_logs');
    $ids = AuditLog::query()->orderBy('id')->pluck('id')->all();

    DB::table($table)->where('id', $ids[1])->update(['note' => 'diubah diam-diam']);
    expect($trail->firstBrokenEntry())->toBe(['id' => $ids[1], 'alasan' => 'isi_berubah']);

    DB::table($table)->where('id', $ids[1])->update(['note' => null]);
    expect($trail->firstBrokenEntry())->toBeNull();

    DB::table($table)->where('id', $ids[1])->delete();
    expect($trail->firstBrokenEntry())->toBe(['id' => $ids[2], 'alasan' => 'rantai_putus']);
});

it('verifies through the screen, records the check and saves a reference point once per new entry', function () {
    $user = auditor();
    app(AuditTrail::class)->log('tambah_peran', $user);

    $this->actingAs($user)->postJson('/lir-kit/audit-log/verify')->assertOk()->assertJsonPath('valid', true);
    expect(AuditCheckpoint::query()->count())->toBe(1)
        ->and(AuditLog::query()->where('action', 'verifikasi_integritas')->count())->toBe(1);

    $this->actingAs($user)->getJson('/lir-kit/audit-log/checkpoints')->assertOk()->assertJsonCount(1, 'data');

    // The check wrote an entry itself, so the next clean check adds one more reference point.
    $this->actingAs($user)->postJson('/lir-kit/audit-log/verify')->assertOk();
    expect(AuditCheckpoint::query()->count())->toBe(2);
});

it('notices an entry that no longer matches a saved reference point', function () {
    $trail = app(AuditTrail::class);
    $trail->log('tambah_peran', null);
    $trail->verify();

    $point = AuditCheckpoint::query()->firstOrFail();
    DB::table(config('lir-kit.tables.audit_checkpoints'))->where('id', $point->id)->update(['hash' => str_repeat('a', 64)]);

    expect($trail->firstBrokenEntry())->toBe(['id' => (int) $point->log_id, 'alasan' => 'titik_acuan']);
});

it('lists, searches and filters the log with the people behind it', function () {
    $user = auditor();
    $trail = app(AuditTrail::class);
    $trail->log('tambah_pengguna', $user, null, ['email' => 'a@contoh.co.id']);
    $trail->log('ubah_metode_masuk', null, ['mode' => 'password'], ['mode' => 'otp']);

    $all = $this->actingAs($user)->getJson('/lir-kit/audit-log')->assertOk();
    $all->assertJsonPath('meta.total', 2)->assertJsonPath('data.1.aktor.email', $user->email)->assertJsonPath('data.0.aktor', null)
        ->assertJsonPath('data.0.perubahan.0.field', 'mode')->assertJsonPath('data.0.kategori', 'keamanan');

    $this->actingAs($user)->getJson('/lir-kit/audit-log?q=metode')->assertJsonCount(1, 'data');
    $this->actingAs($user)->getJson('/lir-kit/audit-log?aktor=sistem')->assertJsonCount(1, 'data');
    $this->actingAs($user)->getJson('/lir-kit/audit-log?aktor='.$user->id)->assertJsonCount(1, 'data');
    $this->actingAs($user)->getJson('/lir-kit/audit-log?kategori=pengguna')->assertJsonCount(1, 'data');
    $this->actingAs($user)->getJson('/lir-kit/audit-log?hasil=gagal')->assertJsonCount(0, 'data');
});

it('exports a CSV that cannot run a formula and records the export', function () {
    $user = auditor();
    app(AuditTrail::class)->log('ubah_menu', $user, null, null, null, null, '=HYPERLINK("http://jahat")');

    $csv = $this->actingAs($user)->get('/lir-kit/audit-log/export')->assertOk()->streamedContent();

    expect($csv)->toContain("'=HYPERLINK")->not->toContain(',=HYPERLINK')
        ->and(AuditLog::query()->where('action', 'ekspor_audit')->count())->toBe(1);
});
