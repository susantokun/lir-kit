<?php

use Illuminate\Support\ServiceProvider;
use Lir\Kit\LirKitServiceProvider;

it('offers the starter pages and layout as their own publish tag', function () {
    $paths = ServiceProvider::pathsToPublish(LirKitServiceProvider::class, 'lir-kit-starter');

    expect($paths)->not->toBeEmpty();

    foreach (array_keys($paths) as $source) {
        expect(file_exists($source))->toBeTrue("Sumber publish tidak ada: {$source}");
    }

    expect(array_values($paths))->toContain(resource_path('js'), resource_path('css/lir-kit-starter.css'));
});

it('keeps the starter apart from the components the kit republishes', function () {
    $components = ServiceProvider::pathsToPublish(LirKitServiceProvider::class, 'lir-kit-js');

    expect(array_values($components))->toBe([resource_path('js/lir-kit')])
        ->and(is_file(__DIR__.'/../stubs/starter/js/pages/auth/login.tsx'))->toBeTrue()
        ->and(is_file(__DIR__.'/../resources/js/layouts/app-shell.tsx'))->toBeTrue();
});
