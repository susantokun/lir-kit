<?php

namespace Lir\Kit\Console;

use Illuminate\Console\Command;
use Lir\Kit\Support\Licensing\LicenseManager;

/**
 * Checks the license against the portal and refreshes the license file, e.g. in routes/console.php:
 * Schedule::command('lir-kit:license-check --jitter=300')->daily();
 */
class LicenseCheckCommand extends Command
{
    protected $signature = 'lir-kit:license-check {--jitter=0 : Tunggu acak sekian detik dulu, supaya instalasi tidak menghubungi server serempak}';

    protected $description = 'Periksa license ke server license dan perbarui berkas license.';

    public function handle(LicenseManager $manager): int
    {
        $jitter = max(0, (int) $this->option('jitter'));

        if ($jitter > 0) {
            sleep(random_int(0, $jitter));
        }

        $this->components->info(match ($manager->check()) {
            'skipped' => 'Belum ada license yang terpasang atau kunci publik belum diatur; dilewati.',
            'ok' => 'License valid dan sudah diperbarui dari server.',
            'revoked' => 'License telah dicabut oleh penerbit.',
            'rejected' => 'License ditolak oleh server (domain tidak cocok, dipindahkan, atau tidak dikenal).',
            default => 'Server tidak dapat memastikan license; status tidak berubah.',
        });

        return self::SUCCESS;
    }
}
