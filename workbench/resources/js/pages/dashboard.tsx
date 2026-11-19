import { ActivityIcon, AlertTriangleIcon, BanknoteIcon, CheckCircle2Icon, PencilIcon, PlusCircleIcon, ShieldCheckIcon, ShoppingCartIcon, Trash2Icon, type LucideIcon } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { BarChart, CHART_COLORS, DonutChart, HorizontalBars, Legend } from '@/components/charts';
import { DateRangePicker } from '@/lir-kit/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ACTIVITIES, CATEGORIES, daysBetween, rangeEndingToday, rupiah, salesBetween } from '@/lib/dummy';
import AppLayout from '@/layouts/app-layout';
import { PageHeader } from '@/lir-kit/layouts/page-header';

const ACCENTS = {
    blue: { card: 'from-sky-500/15 via-sky-500/5 to-transparent ring-sky-500/20', icon: 'bg-sky-500' },
    rose: { card: 'from-rose-500/15 via-rose-500/5 to-transparent ring-rose-500/20', icon: 'bg-rose-500' },
    green: { card: 'from-emerald-500/15 via-emerald-500/5 to-transparent ring-emerald-500/20', icon: 'bg-emerald-500' },
    violet: { card: 'from-violet-500/15 via-violet-500/5 to-transparent ring-violet-500/20', icon: 'bg-violet-500' },
    amber: { card: 'from-amber-500/15 via-amber-500/5 to-transparent ring-amber-500/20', icon: 'bg-amber-500' },
};

function StatCard({ icon: Icon, label, value, hint, color = 'blue' }: { icon: LucideIcon; label: string; value: ReactNode; hint?: ReactNode; color?: keyof typeof ACCENTS }) {
    const accent = ACCENTS[color];

    return (
        <Card className={`gap-3 border-0 bg-gradient-to-br py-4 ring-1 ${accent.card}`}>
            <CardContent className="flex items-start gap-4">
                <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${accent.icon}`}>
                    <Icon className="size-5" />
                </span>
                <div className="flex min-w-0 flex-col">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
                    {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
                </div>
            </CardContent>
        </Card>
    );
}

/** Icon and colour for an activity row, by what kind of action it was. */
function tone(code: string): { icon: LucideIcon; style: string } {
    if (/^(hapus|reset|tolak)/.test(code)) {
        return { icon: Trash2Icon, style: 'bg-rose-500/15 text-rose-600 dark:text-rose-400' };
    }

    if (/^(tambah|buat|setujui)/.test(code)) {
        return { icon: PlusCircleIcon, style: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' };
    }

    if (/^(ubah|koreksi)/.test(code)) {
        return { icon: PencilIcon, style: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' };
    }

    if (/(ekspor|masuk)/.test(code)) {
        return { icon: ShieldCheckIcon, style: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' };
    }

    return { icon: ActivityIcon, style: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' };
}

const STAGES = ['Pesanan masuk', 'Pembayaran', 'Pengemasan', 'Pengiriman', 'Selesai'];

/** A stand-in home page with made-up numbers: it shows what the frame looks like with a real, colourful dashboard. */
export default function Dashboard() {
    const [range, setRange] = useState(() => rangeEndingToday(14));
    const sales = useMemo(() => salesBetween(range.from, range.to), [range]);
    const days = useMemo(() => daysBetween(range.from, range.to), [range]);

    const valid = sales.filter((s) => s.status !== 'Dibatalkan');
    const revenue = valid.reduce((sum, s) => sum + s.amount, 0);
    const active = sales.filter((s) => s.status === 'Diproses' || s.status === 'Dikirim').length;
    const cancelled = sales.filter((s) => s.status === 'Dibatalkan').length;
    const customers = new Set(sales.map((s) => s.customer)).size;

    const perDay = days.map((d) => {
        const rows = sales.filter((s) => s.date === d);

        return { label: `${d.slice(8)}/${d.slice(5, 7)}`, made: rows.length, done: rows.filter((s) => s.status === 'Selesai').length };
    });
    const statusSlices = [
        { label: 'Selesai', color: CHART_COLORS[1], value: sales.filter((s) => s.status === 'Selesai').length },
        { label: 'Diproses', color: CHART_COLORS[0], value: sales.filter((s) => s.status === 'Diproses').length },
        { label: 'Dikirim', color: CHART_COLORS[2], value: sales.filter((s) => s.status === 'Dikirim').length },
        { label: 'Dibatalkan', color: 'var(--destructive)', value: cancelled },
    ];
    const perCategory = CATEGORIES.map((c, i) => ({
        label: c,
        value: valid.filter((s) => s.category === c).reduce((sum, s) => sum + s.amount, 0),
        color: CHART_COLORS[i % 5],
        count: valid.filter((s) => s.category === c).length,
    })).sort((a, b) => b.value - a.value);
    const stageCounts = [sales.length, Math.round(sales.length * 0.8), Math.round(sales.length * 0.62), active, statusSlices[0].value];

    return (
        <AppLayout title="Dashboard">
            <PageHeader
                title="Dashboard"
                description="Ringkasan contoh penjualan: semua angka di sini data buatan untuk melihat tampilan."
                actions={<DateRangePicker from={range.from} to={range.to} apply={{ onApply: setRange, onReset: () => setRange(rangeEndingToday(14)) }} />}
            />

            <section aria-label="Ringkasan" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={BanknoteIcon} label="Pendapatan" value={rupiah(revenue)} hint={`${valid.length} pesanan tidak dibatalkan`} />
                <StatCard icon={ShoppingCartIcon} label="Pesanan berjalan" value={active} hint="Diproses atau sedang dikirim" color="violet" />
                <StatCard icon={CheckCircle2Icon} label="Pesanan selesai" value={statusSlices[0].value} hint={`${customers} pelanggan aktif`} color="green" />
                <StatCard
                    icon={AlertTriangleIcon}
                    label="Dibatalkan"
                    value={cancelled}
                    hint={cancelled === 0 ? 'Tidak ada pembatalan' : `${((cancelled / Math.max(sales.length, 1)) * 100).toFixed(1)}% dari seluruh pesanan`}
                    color={cancelled > 3 ? 'rose' : 'amber'}
                />
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Aktivitas {days.length} hari</CardTitle>
                        <CardDescription>Pesanan yang dibuat dan yang selesai pada periode ini.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <BarChart
                            labels={perDay.map((d) => d.label)}
                            series={[
                                { name: 'Dibuat', color: CHART_COLORS[0] },
                                { name: 'Selesai', color: CHART_COLORS[1] },
                            ]}
                            values={[perDay.map((d) => d.made), perDay.map((d) => d.done)]}
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Status pesanan</CardTitle>
                        <CardDescription>Sebaran pesanan pada periode ini.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5">
                        <DonutChart slices={statusSlices} caption="pesanan" />
                        <Legend items={statusSlices.map((s) => ({ label: s.label, color: s.color, value: s.value }))} />
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Antrean per tahap</CardTitle>
                        <CardDescription>Berapa pesanan yang sampai di tiap tahap.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="grid gap-3 sm:grid-cols-5">
                            {STAGES.map((label, i) => (
                                <li key={label} className="flex h-full flex-col gap-1 rounded-lg border p-3 transition-colors hover:border-primary/50 hover:bg-muted/40">
                                    <span className="text-xs text-muted-foreground">Tahap {i + 1}</span>
                                    <span className="text-2xl font-semibold tabular-nums" style={{ color: CHART_COLORS[i] }}>
                                        {stageCounts[i]}
                                    </span>
                                    <span className="text-sm leading-tight">{label}</span>
                                    {i === 3 && active > 8 && (
                                        <Badge variant="destructive" className="mt-1 w-fit">
                                            {Math.round(active / 3)} terlambat
                                        </Badge>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Per kategori</CardTitle>
                        <CardDescription>Pendapatan tiap kategori produk.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <HorizontalBars
                            rows={perCategory.map((c) => ({
                                label: c.label,
                                value: c.value,
                                shown: rupiah(c.value),
                                color: c.color,
                                hint: <span className="text-xs text-muted-foreground">{c.count} pesanan</span>,
                            }))}
                        />
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Aktivitas terbaru</CardTitle>
                        <CardDescription>Apa yang dikerjakan orang di aplikasi ini.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="flex flex-col divide-y">
                            {ACTIVITIES.map((a) => {
                                const { icon: Icon, style } = tone(a.action);

                                return (
                                    <li key={a.text} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                                        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${style}`}>
                                            <Icon className="size-4" />
                                        </span>
                                        <div className="flex min-w-0 flex-1 flex-col">
                                            <span className="truncate text-sm font-medium">{a.text}</span>
                                            <span className="text-xs text-muted-foreground">{a.who}</span>
                                        </div>
                                        <span className="shrink-0 text-xs text-muted-foreground">{a.ago}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Pelanggan teratas</CardTitle>
                        <CardDescription>Berdasarkan nilai pesanan di periode ini.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <HorizontalBars
                            color={CHART_COLORS[4]}
                            rows={Object.entries(
                                valid.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.customer]: (acc[s.customer] ?? 0) + s.amount }), {}),
                            )
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5)
                                .map(([label, value]) => ({ label, value, shown: rupiah(value) }))}
                        />
                    </CardContent>
                </Card>
            </section>
        </AppLayout>
    );
}

