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
        // Order matters: the specific aliases come before '@'. The starter's own files (stubs/starter) are what a real
        // project gets from `vendor:publish --tag=lir-kit-starter`, so the playground runs them as they are.
        alias: [
            { find: '@lir-kit', replacement: path.resolve(__dirname, 'resources/js') },
            { find: '@/lir-kit', replacement: path.resolve(__dirname, 'resources/js') },
            { find: '@/config', replacement: path.resolve(__dirname, 'stubs/starter/js/config') },
            { find: '@/layouts', replacement: path.resolve(__dirname, 'stubs/starter/js/layouts') },
            { find: '@', replacement: path.resolve(__dirname, 'workbench/resources/js') },
        ],
    },
    server: {
        watch: { ignored: ['**/vendor/**', '**/tests/**'] },
    },
});
