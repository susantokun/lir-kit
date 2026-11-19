import { createInertiaApp } from '@inertiajs/react';
import type { ComponentType } from 'react';

// The playground's own pages, plus the starter's pages (stubs/starter/js/pages): the same files a project publishes.
const playgroundPages = import.meta.glob<{ default: ComponentType }>('./pages/**/*.tsx', {
    eager: true,
});
const starterPages = import.meta.glob<{ default: ComponentType }>('../../../stubs/starter/js/pages/**/*.tsx', {
    eager: true,
});
const pages: Record<string, { default: ComponentType }> = {
    ...playgroundPages,
    ...Object.fromEntries(
        Object.entries(starterPages).map(([path, page]) => [path.replace('../../../stubs/starter/js/pages/', './pages/'), page]),
    ),
};

void createInertiaApp({
    title: (title) => (title ? `${title} - LIR-KIT` : 'LIR-KIT'),
    resolve: (name) => {
        const page = pages[`./pages/${name}.tsx`];

        if (!page) {
            throw new Error(`Halaman playground tidak ada: ${name}`);
        }

        return page;
    },
});
