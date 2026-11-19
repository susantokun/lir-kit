<?php

namespace Workbench\App\Providers;

use Illuminate\Support\Facades\Gate;
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

        // In the playground the demo user may manage everything. A real app defines this ability itself.
        Gate::define('lir-kit.manage', fn ($user) => $user !== null);

        $this->loadRoutesFrom(__DIR__.'/../../routes/web.php');
    }
}
