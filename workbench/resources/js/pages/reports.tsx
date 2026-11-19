import { DownloadIcon, FileSpreadsheetIcon, PrinterIcon, ReceiptTextIcon, SearchIcon, ShoppingCartIcon, TrendingUpIcon, WalletIcon, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { DateRangePicker } from '@/lir-kit/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CATEGORIES, STATUSES, rangeEndingToday, rupiah, rupiahFull, salesBetween, type Status } from '@/lib/dummy';
import AppLayout from '@/layouts/app-layout';
import { notify } from '@/lir-kit/adapters';
import { NoticeDialog } from '@/lir-kit/shell/notice-dialog';
import { PageHeader } from '@/lir-kit/layouts/page-header';
import { SearchSelect } from '@/lir-kit/search-select';

const PER_PAGE = 10;

const STATUS_STYLE: Record<Status, string> = {
    Selesai: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    Diproses: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400',
    Dikirim: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    Dibatalkan: 'border-destructive/30 bg-destructive/10 text-destructive',
};

function Stat({ icon: Icon, label, value, hint, tint }: { icon: LucideIcon; label: string; value: ReactNode; hint?: string; tint: string }) {
    return (
        <Card size="sm">
            <CardContent className="flex items-center gap-3">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-white ${tint}`}>
                    <Icon className="size-5" />
                </span>
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="text-xl leading-tight font-semibold tabular-nums">{value}</span>
                    {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
                </div>
            </CardContent>
        </Card>
    );
}

/** A spreadsheet cell that starts like a formula is made plain text, so opening the file cannot run anything. */
const safe = (value: string | number) => (typeof value === 'string' && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value);
const csvCell = (value: string | number) => `"${String(safe(value)).replaceAll('"', '""')}"`;

/** A report page with made-up data: date range, filters, a table and an export, to see the frame with real content. */
export default function Reports() {
    const [range, setRange] = useState(() => rangeEndingToday(30));
    const [q, setQ] = useState('');
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [confirmExport, setConfirmExport] = useState(false);
    const [printAll, setPrintAll] = useState(false);

    const all = useMemo(() => salesBetween(range.from, range.to), [range]);
    const rows = useMemo(
        () =>
            all.filter(
                (s) =>
                    (!category || s.category === category) &&
                    (!status || s.status === status) &&
                    (!q.trim() || `${s.id} ${s.customer}`.toLowerCase().includes(q.trim().toLowerCase())),
            ),
        [all, q, category, status],
    );

    useEffect(() => setPage(1), [range, q, category, status]);

    const valid = rows.filter((s) => s.status !== 'Dibatalkan');
    const total = valid.reduce((sum, s) => sum + s.amount, 0);
    const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
    // The screen shows one page at a time; a printout shows every row.
    const shown = printAll ? rows : rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    const print = () => {
        setPrintAll(true);
        window.addEventListener('afterprint', () => setPrintAll(false), { once: true });
        window.setTimeout(() => window.print(), 150);
    };

    const exportCsv = () => {
        const header = ['No. Pesanan', 'Tanggal', 'Pelanggan', 'Kategori', 'Status', 'Jumlah', 'Total (Rp)'];
        const lines = [header, ...rows.map((s) => [s.id, s.date, s.customer, s.category, s.status, s.qty, s.amount])];
        const blob = new Blob([`﻿${lines.map((l) => l.map(csvCell).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `laporan-penjualan-${range.from}_${range.to}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        notify(`${rows.length} baris diekspor.`);
    };

    return (
        <AppLayout title="Laporan">
            <PageHeader
                title="Laporan"
                description="Laporan penjualan contoh: pilih periode, saring, lalu ekspor. Semua datanya buatan."
                actions={
                    <div className="flex flex-wrap items-center gap-2 print:hidden">
                        <DateRangePicker from={range.from} to={range.to} apply={{ onApply: setRange, onReset: () => setRange(rangeEndingToday(30)) }} />
                        <Button variant="outline" onClick={print}>
                            <PrinterIcon data-icon="inline-start" />
                            Cetak
                        </Button>
                        <Button onClick={() => setConfirmExport(true)} disabled={rows.length === 0}>
                            <DownloadIcon data-icon="inline-start" />
                            Ekspor CSV
                        </Button>
                    </div>
                }
            />

            <p className="hidden text-sm text-muted-foreground print:block">
                Periode {fmt(range.from)} – {fmt(range.to)}
            </p>

            <section aria-label="Ringkasan" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Stat icon={WalletIcon} label="Total penjualan" value={rupiah(total)} hint="Tanpa yang dibatalkan" tint="bg-sky-500" />
                <Stat icon={ShoppingCartIcon} label="Jumlah pesanan" value={rows.length} hint={`${valid.length} tidak dibatalkan`} tint="bg-violet-500" />
                <Stat icon={TrendingUpIcon} label="Rata-rata per pesanan" value={rupiah(valid.length ? Math.round(total / valid.length) : 0)} tint="bg-emerald-500" />
                <Stat icon={ReceiptTextIcon} label="Pelanggan" value={new Set(rows.map((s) => s.customer)).size} hint="Yang memesan di periode ini" tint="bg-amber-500" />
            </section>

            <Card className="print:hidden">
                <CardContent className="flex flex-col gap-3">
                    <div className="grid gap-2 md:grid-cols-[1fr_14rem_14rem]">
                        <InputGroup>
                            <InputGroupAddon>
                                <SearchIcon />
                            </InputGroupAddon>
                            <InputGroupInput aria-label="Cari pesanan" placeholder="Cari nomor pesanan atau pelanggan" value={q} onChange={(e) => setQ(e.target.value)} />
                        </InputGroup>
                        <SearchSelect
                            ariaLabel="Kategori"
                            value={category}
                            onChange={setCategory}
                            options={[{ value: '', label: 'Semua kategori' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
                        />
                        <SearchSelect
                            ariaLabel="Status"
                            value={status}
                            onChange={setStatus}
                            options={[{ value: '', label: 'Semua status' }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="gap-0 overflow-hidden py-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>No. pesanan</TableHead>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Pelanggan</TableHead>
                            <TableHead className="hidden md:table-cell">Kategori</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Jumlah</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {shown.map((s) => (
                            <TableRow key={s.id}>
                                <TableCell className="font-mono text-xs">{s.id}</TableCell>
                                <TableCell className="whitespace-nowrap text-muted-foreground">{fmt(s.date)}</TableCell>
                                <TableCell className="font-medium">{s.customer}</TableCell>
                                <TableCell className="hidden md:table-cell">{s.category}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={STATUS_STYLE[s.status]}>
                                        {s.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">{s.qty}</TableCell>
                                <TableCell className="text-right whitespace-nowrap tabular-nums">{rupiahFull(s.amount)}</TableCell>
                            </TableRow>
                        ))}
                        {rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                                    <FileSpreadsheetIcon className="mx-auto mb-2 size-6" />
                                    Tidak ada pesanan yang cocok dengan filter.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {rows.length > 0 && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                        {rows.length} pesanan · total {rupiahFull(total)}
                    </span>
                    <div className="flex items-center gap-2 print:hidden">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                            Sebelumnya
                        </Button>
                        <span>
                            {page} / {pages}
                        </span>
                        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                            Berikutnya
                        </Button>
                    </div>
                </div>
            )}
            <NoticeDialog
                open={confirmExport}
                title="Ekspor laporan (CSV)?"
                description={`File berisi ${rows.length} pesanan pada periode ${fmt(range.from)} – ${fmt(range.to)}${category || status || q ? ', sesuai saringan yang aktif' : ''}.`}
                confirmLabel="Ya, ekspor"
                onConfirm={() => {
                    setConfirmExport(false);
                    exportCsv();
                }}
                onCancel={() => setConfirmExport(false)}
                dismissible
            />
        </AppLayout>
    );
}
