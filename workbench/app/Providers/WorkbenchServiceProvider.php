<?php

namespace Workbench\App\Providers;

use Illuminate\Support\ServiceProvider;

class WorkbenchServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        if ($this->app->runningUnitTests()) {
            return;
        }

        // Vite writes its hot file and build here; the Vite helper reads them from the same place.
        $this->app->usePublicPath(dirname(__DIR__, 3).'/workbench/public');
    }

    public function boot(): void
    {
        // The package tests (tests/) must not see the playground: its demo ability and routes are for the browser only.
        if ($this->app->runningUnitTests()) {
            return;
        }

        // Roles decide who may do what (LIR_REGISTER_GATE turns them into Gate abilities, see testbench.yaml).
        config([
            'lir-kit.users_ability' => 'lir-kit.users',
            'lir-kit.roles_ability' => 'lir-kit.roles',
            'lir-kit.permissions' => ['Laporan' => ['laporan.lihat' => 'Melihat laporan', 'laporan.ekspor' => 'Mengekspor laporan']],
        ]);

        $this->loadRoutesFrom(__DIR__.'/../../routes/web.php');
    }
}
