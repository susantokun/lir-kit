import type { ReactNode } from 'react';

/** Theme chart colours (--chart-1 ... --chart-5); change them in app.css and every chart follows. */
export const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

export type Series = { name: string; color: string };

export function Legend({ items }: { items: { label: string; color: string; value?: ReactNode }[] }) {
    return (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
            {items.map((item) => (
                <li key={item.label} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="text-muted-foreground">{item.label}</span>
                    {item.value !== undefined && <span className="font-medium tabular-nums">{item.value}</span>}
                </li>
            ))}
        </ul>
    );
}

/** Grouped vertical bars with a light grid. Labels sit under the bars as plain HTML so text stays crisp. */
export function BarChart({ labels, series, values, height = 200 }: { labels: string[]; series: Series[]; values: number[][]; height?: number }) {
    const max = Math.max(1, ...values.flat());
    const top = Math.ceil(max / 2) * 2 || 2;
    const width = labels.length * 40;
    const barWidth = Math.min(14, 30 / series.length);

    return (
        <div className="flex w-full flex-col gap-2">
            <div className="relative" style={{ height }}>
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    preserveAspectRatio="none"
                    className="absolute inset-0 size-full overflow-visible"
                    role="img"
                    aria-label={series.map((s) => s.name).join(', ')}
                >
                    {[0, 0.5, 1].map((p) => (
                        <line
                            key={p}
                            x1={0}
                            x2={width}
                            y1={height - p * (height - 4) - 2}
                            y2={height - p * (height - 4) - 2}
                            stroke="currentColor"
                            strokeOpacity={0.12}
                            strokeDasharray={p === 0 ? '0' : '3 4'}
                            vectorEffect="non-scaling-stroke"
                        />
                    ))}
                    {labels.map((label, i) =>
                        series.map((s, j) => {
                            const value = values[j]?.[i] ?? 0;
                            const h = (value / top) * (height - 8);
                            const x = i * 40 + 20 - (series.length * barWidth) / 2 + j * barWidth;

                            return (
                                <rect
                                    key={`${label}-${s.name}`}
                                    x={x}
                                    y={height - 2 - h}
                                    width={barWidth - 2}
                                    height={Math.max(h, value > 0 ? 2 : 0)}
                                    rx={2}
                                    fill={s.color}
                                />
                            );
                        }),
                    )}
                </svg>
                <span className="absolute -top-1 left-0 text-[10px] text-muted-foreground">{top}</span>
            </div>
            <div className="grid text-center text-[10px] text-muted-foreground" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
                {labels.map((label, i) => (
                    <span key={`${label}-${i}`} className={labels.length > 14 && i % 2 !== 0 ? 'hidden sm:block' : ''}>
                        {label}
                    </span>
                ))}
            </div>
            <Legend items={series.map((s) => ({ label: s.name, color: s.color }))} />
        </div>
    );
}

/** Ring chart with the total in the middle. */
export function DonutChart({ slices, center, caption, size = 168 }: { slices: { label: string; value: number; color: string }[]; center?: ReactNode; caption?: string; size?: number }) {
    const total = slices.reduce((sum, s) => sum + s.value, 0);
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return (
        <div className="relative mx-auto" style={{ width: size, height: size }}>
            <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={slices.map((s) => `${s.label} ${s.value}`).join(', ')}>
                <circle cx={50} cy={50} r={radius} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={12} />
                {total > 0 &&
                    slices
                        .filter((s) => s.value > 0)
                        .map((s) => {
                            const length = (s.value / total) * circumference;
                            const node = (
                                <circle
                                    key={s.label}
                                    cx={50}
                                    cy={50}
                                    r={radius}
                                    fill="none"
                                    stroke={s.color}
                                    strokeWidth={12}
                                    strokeDasharray={`${Math.max(length - 1.5, 0.5)} ${circumference}`}
                                    strokeDashoffset={-offset}
                                />
                            );
                            offset += length;

                            return node;
                        })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-semibold tabular-nums">{center ?? total}</span>
                {caption && <span className="text-xs text-muted-foreground">{caption}</span>}
            </div>
        </div>
    );
}

/** One labelled bar per row, scaled to the largest value. */
export function HorizontalBars({ rows, color = CHART_COLORS[0] }: { rows: { label: string; value: number; shown?: ReactNode; hint?: ReactNode; color?: string }[]; color?: string }) {
    const max = Math.max(1, ...rows.map((r) => r.value));

    return (
        <ul className="flex flex-col gap-3">
            {rows.map((row) => (
                <li key={row.label} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate">{row.label}</span>
                        <span className="flex items-center gap-2">
                            {row.hint}
                            <span className="font-medium tabular-nums">{row.shown ?? row.value}</span>
                        </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(row.value / max) * 100}%`, background: row.color ?? color }} />
                    </div>
                </li>
            ))}
        </ul>
    );
}
