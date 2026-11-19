<?php

use Illuminate\Support\Facades\Route;
use Lir\Kit\Http\Controllers\OtpLoginController;
use Lir\Kit\Http\Controllers\SiteSettingsController;

/*
| Langkah masuk dengan kode email. Halaman login milik aplikasi menampilkannya (lihat LirKit::loginProps()).
*/
Route::middleware(config('lir-kit.routes.web_middleware'))->prefix('login/otp')->name('lir.otp.')->group(function () {
    Route::post('send', [OtpLoginController::class, 'send'])->middleware('throttle:10,1')->name('send');
    Route::post('verify', [OtpLoginController::class, 'verify'])->middleware('throttle:10,1')->name('verify');
    Route::post('resend', [OtpLoginController::class, 'resend'])->middleware('throttle:10,1')->name('resend');
    Route::post('cancel', [OtpLoginController::class, 'cancel'])->name('cancel');
});

/*
| Logo dan favicon situs (Pengaturan > Situs). Terbuka untuk siapa saja karena halaman masuk juga menampilkannya.
*/
Route::middleware('web')->get(trim((string) config('lir-kit.routes.api_prefix'), '/').'/site/{kind}', [SiteSettingsController::class, 'asset'])
    ->whereIn('kind', ['logo', 'favicon'])->name('lir-kit.site.asset');
