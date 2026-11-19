<?php

use Illuminate\Support\Facades\Route;
use Lir\Kit\Http\Controllers\LoginSettingsController;
use Lir\Kit\Http\Controllers\MailSettingsController;
use Lir\Kit\Http\Controllers\MenuController;
use Lir\Kit\Http\Controllers\RolesController;
use Lir\Kit\Http\Controllers\UsersController;

/*
| Layar pengaturan. Semua rute butuh ability `lir-kit.manage` (config/lir-kit.php).
*/
Route::middleware(config('lir-kit.routes.api_middleware'))->prefix(config('lir-kit.routes.api_prefix'))->name('lir-kit.')->group(function () {
    Route::get('login-method', [LoginSettingsController::class, 'showMethod'])->name('login-method.show');
    Route::put('login-method', [LoginSettingsController::class, 'updateMethod'])->name('login-method.update');
    Route::get('login-code-email', [LoginSettingsController::class, 'showEmail'])->name('login-code-email.show');
    Route::put('login-code-email', [LoginSettingsController::class, 'updateEmail'])->name('login-code-email.update');
    Route::delete('login-code-email', [LoginSettingsController::class, 'resetEmail'])->name('login-code-email.destroy');

    Route::get('mail-settings', [MailSettingsController::class, 'show'])->name('mail-settings.show');
    Route::put('mail-settings', [MailSettingsController::class, 'update'])->name('mail-settings.update');
    Route::post('mail-settings/test', [MailSettingsController::class, 'test'])->middleware('throttle:10,1')->name('mail-settings.test');

    Route::get('menu', [MenuController::class, 'show'])->name('menu.show');
    Route::put('menu', [MenuController::class, 'update'])->name('menu.update');
    Route::delete('menu', [MenuController::class, 'destroy'])->name('menu.destroy');

    Route::get('users', [UsersController::class, 'index'])->name('users.index');
    Route::post('users', [UsersController::class, 'store'])->middleware('throttle:30,1')->name('users.store');
    Route::put('users/{user}', [UsersController::class, 'update'])->name('users.update');
    Route::delete('users/{user}', [UsersController::class, 'destroy'])->name('users.destroy');
    Route::post('users/{user}/invite', [UsersController::class, 'invite'])->middleware('throttle:10,1')->name('users.invite');

    Route::get('roles', [RolesController::class, 'index'])->name('roles.index');
    Route::post('roles', [RolesController::class, 'store'])->name('roles.store');
    Route::put('roles/{role}', [RolesController::class, 'update'])->name('roles.update');
    Route::delete('roles/{role}', [RolesController::class, 'destroy'])->name('roles.destroy');
});
