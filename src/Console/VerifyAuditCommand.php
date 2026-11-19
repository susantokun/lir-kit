<?php

namespace Lir\Kit\Console;

use Illuminate\Console\Command;
use Lir\Kit\Services\AuditTrail;

/**
 * Checks the audit log chain from the terminal or the scheduler, e.g. in routes/console.php:
 * Schedule::command('lir-kit:audit-verify')->dailyAt('03:00');
 */
class VerifyAuditCommand extends Command
{
    protected $signature = 'lir-kit:audit-verify';

    protected $description = 'Periksa keutuhan rantai hash log audit dan simpan titik acuan bila utuh.';

    public function handle(AuditTrail $trail): int
    {
        $result = $trail->verify(null, true);

        if ($result['valid']) {
            $this->info("Rantai log audit utuh ({$result['jumlah']} catatan).");

            return self::SUCCESS;
        }

        $this->error("Integritas log audit bermasalah: catatan #{$result['rusak']['id']} ({$result['rusak']['alasan']}).");

        return self::FAILURE;
    }
}
