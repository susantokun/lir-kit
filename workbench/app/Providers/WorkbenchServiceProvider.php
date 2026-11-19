<?php

namespace Workbench\App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class WorkbenchServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Vite writes its hot file and build here; the Vite helper reads them from the same place.
        $this->app->usePublicPath(dirname(__DIR__, 3).'/workbench/public');
    }

    public function boot(): void
    {
        // In the playground the demo user may manage everything. A real app defines this ability itself.
        Gate::define('lir-kit.manage', fn ($user) => $user !== null);

        $this->loadRoutesFrom(__DIR__.'/../../routes/web.php');
    }
}
