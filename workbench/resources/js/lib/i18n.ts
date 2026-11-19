/** The playground shows the texts as written (Indonesian); a real app plugs in its own translation. */
export function t(
    text: string,
    vars?: Record<string, string | number | null | undefined>,
): string {
    return vars
        ? text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''))
        : text;
}
