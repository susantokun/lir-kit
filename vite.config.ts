import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';

/**
 * Playground only. `@` is the playground's own shadcn/ui and helpers; `@lir-kit` is the kit's real
 * React source in resources/js, so what you edit there is what you see (with hot reload).
 */
export default defineConfig({
    plugins: [
        laravel({
            input: ['workbench/resources/css/app.css', 'workbench/resources/js/app.tsx'],
            refresh: true,
            // The playground keeps its own public folder (see WorkbenchServiceProvider and testbench.yaml 'sync').
            publicDirectory: 'workbench/public',
            hotFile: 'workbench/public/hot',
        }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@lir-kit': path.resolve(__dirname, 'resources/js'),
            '@': path.resolve(__dirname, 'workbench/resources/js'),
        },
    },
    server: {
        watch: { ignored: ['**/vendor/**', '**/tests/**'] },
    },
});
