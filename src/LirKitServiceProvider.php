<?php

namespace Lir\Kit;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Lir\Kit\Console\GrantRoleCommand;
use Lir\Kit\Console\LicenseCheckCommand;
use Lir\Kit\Console\VerifyAuditCommand;
use Lir\Kit\Http\Middleware\EnsureLicenseWritable;
use Lir\Kit\Support\Licensing\LicenseState;
use Lir\Kit\Contracts\LoginHooks;
use Lir\Kit\Contracts\UserDirectory;
use Lir\Kit\Services\Access;
use Lir\Kit\Support\EloquentUserDirectory;
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
        $this->app->bindIf(UserDirectory::class, EloquentUserDirectory::class);
        $this->app->singleton(Access::class);
        $this->app->singleton(LicenseState::class);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');
        $this->loadViewsFrom(__DIR__.'/../resources/views', 'lir-kit');
        $this->loadJsonTranslationsFrom(__DIR__.'/../lang');
        $this->loadRoutesFrom(__DIR__.'/../routes/web.php');
        $this->loadRoutesFrom(__DIR__.'/../routes/api.php');

        $this->app['router']->aliasMiddleware('lir.password-allowed', EnsurePasswordLoginAllowed::class);
        $this->app['router']->aliasMiddleware('lir.license-writable', EnsureLicenseWritable::class);

        // The sender email saved in the app takes over from the .env one (also for queue workers, which boot the app too).
        $this->app->booted(fn () => $this->app->make(MailSettings::class)->apply());

        // Roles of the kit become Gate abilities: whoever holds a permission (or is superadmin) passes that ability.
        if (config('lir-kit.register_gate')) {
            Gate::before(function (?Authenticatable $user, string $ability) {
                $access = $this->app->make(Access::class);

                return $user !== null && $access->knows($ability) && $access->allows($user, $ability) ? true : null;
            });
        }

        if ($this->app->runningInConsole()) {
            $this->commands([GrantRoleCommand::class, VerifyAuditCommand::class, LicenseCheckCommand::class]);

            $this->publishes([__DIR__.'/../config/lir-kit.php' => config_path('lir-kit.php')], 'lir-kit-config');
            $this->publishes([__DIR__.'/../resources/views' => resource_path('views/vendor/lir-kit')], 'lir-kit-views');
            $this->publishes([__DIR__.'/../resources/js' => resource_path('js/lir-kit')], 'lir-kit-js');

            // The starter: pages and layout that become the project's own (never overwritten without --force).
            $this->publishes([
                __DIR__.'/../stubs/starter/js' => resource_path('js'),
                __DIR__.'/../stubs/starter/css/lir-kit-starter.css' => resource_path('css/lir-kit-starter.css'),
            ], 'lir-kit-starter');
        }
    }
}
