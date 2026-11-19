import { useCallback, useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

const KEY = 'appearance';

const prefersDark = (): boolean =>
    window.matchMedia('(prefers-color-scheme: dark)').matches;

function apply(mode: Appearance): void {
    document.documentElement.classList.toggle(
        'dark',
        mode === 'dark' || (mode === 'system' && prefersDark()),
    );
}

function stored(): Appearance {
    if (typeof localStorage === 'undefined') {
        return 'light';
    }

    const value = localStorage.getItem(KEY);

    return value === 'dark' || value === 'system' ? value : 'light';
}

/** Light, dark or follow-the-system theme, persisted in localStorage and applied to <html>. */
export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>('light');

    // Read the saved choice after mount: the server render has no localStorage, and this keeps hydration identical.
    useEffect(() => setAppearance(stored()), []);

    useEffect(() => {
        if (appearance !== 'system') return;

        const query = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = () => apply('system');
        query.addEventListener('change', onChange);

        return () => query.removeEventListener('change', onChange);
    }, [appearance]);

    const update = useCallback((mode: Appearance) => {
        localStorage.setItem(KEY, mode);
        setAppearance(mode);
        apply(mode);
    }, []);

    return { appearance, update };
}
