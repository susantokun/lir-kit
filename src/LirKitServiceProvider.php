<?php

namespace Lir\Kit;

use Illuminate\Support\ServiceProvider;
use Lir\Kit\Contracts\LoginHooks;
use Lir\Kit\Http\Middleware\EnsurePasswordLoginAllowed;
use Lir\Kit\Services\MailSettings;
use Lir\Kit\Support\DefaultLoginHooks;

class LirKitServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/lir-kit.php', 'lir-kit');

        // The application replaces this with its own binding to adapt the kit to its rules.
        $this->app->bindIf(LoginHooks::class, DefaultLoginHooks::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'lir-kit');
        $this->loadJsonTranslationsFrom(__DIR__.'/../lang');
        $this->loadRoutesFrom(__DIR__.'/../routes/web.php');
        $this->loadRoutesFrom(__DIR__.'/../routes/api.php');

        $this->app['router']->aliasMiddleware('lir.password-allowed', EnsurePasswordLoginAllowed::class);

        // The sender email saved in the app takes over from the .env one (also for queue workers, which boot the app too).
        $this->app->booted(fn () => $this->app->make(MailSettings::class)->apply());

        if ($this->app->runningInConsole()) {
            $this->publishes([__DIR__.'/../config/lir-kit.php' => config_path('lir-kit.php')], 'lir-kit-config');
            $this->publishes([__DIR__.'/../resources/views' => resource_path('views/vendor/lir-kit')], 'lir-kit-views');
            $this->publishes([__DIR__.'/../resources/js' => resource_path('js/lir-kit')], 'lir-kit-js');
        }
    }
}
