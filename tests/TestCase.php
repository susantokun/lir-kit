<?php

namespace Lir\Kit\Tests;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Foundation\Auth\User as BaseUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Lir\Kit\LirKit;
use Lir\Kit\LirKitServiceProvider;
use Orchestra\Testbench\TestCase as Orchestra;

class TestCase extends Orchestra
{
    use RefreshDatabase;

    protected function getPackageProviders($app): array
    {
        return [LirKitServiceProvider::class];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('database.default', 'testing');
        $app['config']->set('mail.default', 'array');
        $app['config']->set('lir-kit.user_model', TestUser::class);
        $app['config']->set('app.key', 'base64:'.base64_encode(str_repeat('k', 32)));
        $app['config']->set('app.name', 'Contoh App');
    }

    protected function defineDatabaseMigrations(): void
    {
        Schema::create('users', function ($table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password')->nullable();
            $table->string('status')->default('active');
            $table->rememberToken();
            $table->timestamps();
        });

        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');
    }

    protected function defineRoutes($router): void
    {
        Route::get('/login', fn () => response()->json(LirKit::loginProps(request())))->middleware('web')->name('login');
        Route::get('/', fn () => 'home')->middleware('web')->name('home');
        Route::get('/two-factor', fn () => '2fa')->middleware('web')->name('two-factor.login');
    }

    protected function manager(): TestUser
    {
        Gate::define('lir-kit.manage', fn (Authenticatable $user) => $user->email === 'admin@contoh.co.id');

        return TestUser::query()->create(['name' => 'Admin', 'email' => 'admin@contoh.co.id']);
    }
}

class TestUser extends BaseUser
{
    use Notifiable;

    protected $table = 'users';

    protected $guarded = [];

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
