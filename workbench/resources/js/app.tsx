import { createInertiaApp } from '@inertiajs/react';
import type { ComponentType } from 'react';

const pages = import.meta.glob<{ default: ComponentType }>('./pages/**/*.tsx', {
    eager: true,
});

void createInertiaApp({
    title: (title) => (title ? `${title} - lir-kit playground` : 'lir-kit playground'),
    resolve: (name) => {
        const page = pages[`./pages/${name}.tsx`];

        if (!page) {
            throw new Error(`Halaman playground tidak ada: ${name}`);
        }

        return page;
    },
});
