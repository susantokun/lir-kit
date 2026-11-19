import {
  CopyIcon,
  DownloadIcon,
  FilterXIcon,
  FingerprintIcon,
  HistoryIcon,
  SearchIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError, KIT_API, api, notify, t } from '../adapters';
import { CollapsibleCard } from '../collapsible-card';
import { DateRangePicker } from '../date-range-picker';
import { PageActions } from '../layouts/page-actions';
import { SearchSelect } from '../search-select';
import { NoticeDialog } from '../shell/notice-dialog';
import {
  OUTCOME_STYLE,
  actionLabel,
  entityLabel,
  outcomeLabel,
  severityLabel,
} from './audit-labels';

type Log = {
  id: string;
  waktu: string;
  aktor: { id: string; nama: string; email: string } | null;
  peran: string | null;
  entitas: string;
  entitas_id: string | null;
  aksi: string;
  kategori: string;
  hasil: string;
  tingkat: string;
  catatan: string | null;
  ip: string | null;
  user_agent: string | null;
  metode: string | null;
  url: string | null;
  hash: string;
  prev_hash: string | null;
  sebelum: unknown;
  sesudah: unknown;
  perubahan: { field: string; sebelum: unknown; sesudah: unknown }[];
};
type Facets = {
  entitas: string[];
  aksi: string[];
  peran: string[];
  aktor: { id: string; nama: string; email: string }[];
  kategori: { key: string; label: string }[];
  hasil: { key: string; label: string }[];
};
type Integrity = {
  valid: boolean;
  rusak: {
    id: number;
    alasan: 'rantai_putus' | 'isi_berubah' | 'titik_acuan';
  } | null;
  jumlah: number;
  diperiksa_pada: string;
};
type Meta = { total: number; page: number; last_page: number; per_page: number };
type Checkpoint = {
  id: number;
  log_id: number;
  hash: string;
  jumlah: number;
  waktu: string;
};
type Confirm = {
  title: string;
  description: string;
  confirmLabel: string;
  run: () => void;
};

const ALL = '';
const EMPTY = {
  q: '',
  dari: '',
  sampai: '',
  kategori: ALL,
  hasil: ALL,
  entitas: ALL,
  aksi: ALL,
  aktor: ALL,
  peran: ALL,
};

const when = (value: string, options?: Intl.DateTimeFormatOptions) =>
  new Date(value.replace(' ', 'T')).toLocaleString(undefined, options);

const show = (value: unknown): string =>
  value === null || value === undefined || value === ''
    ? '—'
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value as string | number | boolean);

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b py-3 last:border-0 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words sm:col-span-2">{children}</dd>
    </div>
  );
}

function Hash({ value }: { value: string | null }) {
  if (!value) {
    return <>—</>;
  }

  return (
    <span className="flex items-start gap-2">
      <code className="rounded bg-muted px-1.5 py-0.5 text-xs break-all">
        {value}
      </code>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={t('Salin')}
        onClick={() =>
          void navigator.clipboard
            .writeText(value)
            .then(() => notify(t('Disalin.')))
            .catch(() => notify(t('Gagal menyalin.'), true))
        }
      >
        <CopyIcon />
      </Button>
    </span>
  );
}

/** Reference points taken after every clean check, to copy into a record kept outside the database. */
function Checkpoints({ refreshKey, broken }: { refreshKey: unknown; broken: boolean }) {
  const [rows, setRows] = useState<Checkpoint[] | null>(null);

  useEffect(() => {
    api<{ data: Checkpoint[] }>('/audit-log/checkpoints')
      .then((r) => setRows(r.data))
      .catch(() => setRows([]));
  }, [refreshKey]);

  return (
    <CollapsibleCard
      icon={<FingerprintIcon className="size-4 text-muted-foreground" />}
      title={t('Titik acuan integritas')}
      description={t('Dicatat setiap Verifikasi integritas yang bersih. Salin ke tempat di luar database sebagai bukti.')}
    >
      <p className="text-sm text-muted-foreground">
        {t(
          'Titik acuan adalah "foto" hash catatan terakhir saat log audit dinyatakan utuh. Kalau seseorang mengubah catatan lama lalu menghitung ulang seluruh rantai hash, rantainya tampak utuh tetapi tidak lagi cocok dengan titik acuan yang sudah tersimpan atau Anda salin ke luar database.',
        )}
      </p>
      {rows === null ? (
        <Skeleton className="h-16 w-full" />
      ) : rows.length === 0 ? (
        <p className="rounded-lg border bg-muted/30 p-3 text-sm">
          {broken
            ? t('Belum ada titik acuan karena rantai log audit terdeteksi rusak. Titik acuan hanya dibuat saat rantai utuh.')
            : t('Belum ada titik acuan. Klik Verifikasi integritas, atau jalankan php artisan lir-kit:audit-verify.')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Waktu')}</TableHead>
              <TableHead>{t('Catatan terakhir')}</TableHead>
              <TableHead>{t('Hash')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {new Date(r.waktu).toLocaleString()}
                </TableCell>
                <TableCell>
                  #{r.log_id} · {t('{n} catatan', { n: r.jumlah })}
                </TableCell>
                <TableCell>
                  <Hash value={r.hash} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CollapsibleCard>
  );
}

function Detail({ log, onClose }: { log: Log | null; onClose: () => void }) {
  return (
    <Sheet open={log !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>{log ? actionLabel(log.aksi) : ''}</SheetTitle>
          {log && (
            <SheetDescription>
              {t('Catatan audit #{id}', { id: log.id })}
            </SheetDescription>
          )}
        </SheetHeader>
        {log && (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
            <dl>
              <Row label={t('Hasil')}>
                <span className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={OUTCOME_STYLE[log.hasil]}>
                    {outcomeLabel(log.hasil)}
                  </Badge>
                  <Badge variant="outline">
                    {t('Tingkat')}: {severityLabel(log.tingkat)}
                  </Badge>
                </span>
              </Row>
              <Row label={t('Pelaku')}>
                {log.aktor ? (
                  <>
                    <span className="font-medium">{log.aktor.nama}</span>
                    <br />
                    <span className="text-muted-foreground">{log.aktor.email}</span>
                  </>
                ) : (
                  t('Sistem (tanpa pengguna)')
                )}
              </Row>
              <Row label={t('Peran saat bertindak')}>{show(log.peran?.split(',').join(', '))}</Row>
              <Row label={t('Waktu')}>
                {when(log.waktu, { dateStyle: 'full', timeStyle: 'medium' })}
                <br />
                <code className="text-xs text-muted-foreground">{log.waktu}</code>
              </Row>
              <Row label={t('Objek')}>
                {entityLabel(log.entitas)}
                {log.entitas_id ? ` · ID ${log.entitas_id}` : ''}
              </Row>
              <Row label={t('Catatan')}>{show(log.catatan)}</Row>
              <Row label={t('Alamat IP')}>{show(log.ip)}</Row>
              <Row label={t('Permintaan')}>
                {log.metode ? (
                  <code className="text-xs">
                    {log.metode} {log.url}
                  </code>
                ) : (
                  '—'
                )}
              </Row>
              <Row label={t('Perangkat / peramban')}>
                <span className="text-muted-foreground">{show(log.user_agent)}</span>
              </Row>
            </dl>

            <h3 className="mt-6 mb-2 text-sm font-medium">{t('Perubahan nilai')}</h3>
            {log.perubahan.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Field')}</TableHead>
                    <TableHead>{t('Sebelum')}</TableHead>
                    <TableHead>{t('Sesudah')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {log.perubahan.map((c) => (
                    <TableRow key={c.field}>
                      <TableCell className="font-medium">{c.field}</TableCell>
                      <TableCell className="break-all text-destructive">{show(c.sebelum)}</TableCell>
                      <TableCell className="break-all text-emerald-700 dark:text-emerald-400">
                        {show(c.sesudah)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <dl>
                <Row label={t('Sebelum')}>{show(log.sebelum)}</Row>
                <Row label={t('Sesudah')}>{show(log.sesudah)}</Row>
              </dl>
            )}

            <h3 className="mt-6 mb-2 text-sm font-medium">{t('Integritas catatan')}</h3>
            <dl>
              <Row label={t('Hash catatan (SHA-256)')}>
                <Hash value={log.hash} />
              </Row>
              <Row label={t('Hash catatan sebelumnya')}>
                <Hash value={log.prev_hash} />
              </Row>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              {t('Setiap catatan menyimpan hash catatan sebelumnya, sehingga perubahan atau penghapusan terdeteksi lewat Verifikasi integritas.')}
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * The Log Audit screen: who did what, when, from where and what changed. Search, filter, open a line for its
 * details, export to CSV, and verify that nothing was edited or removed. Talks to /lir-kit/audit-log.
 */
export function AuditPanel() {
  const [filters, setFilters] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Log[] | null>(null);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, last_page: 1, per_page: 25 });
  const [facets, setFacets] = useState<Facets | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Log | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [integrity, setIntegrity] = useState<Integrity | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  // The search box waits for a pause in typing; the other filters apply at once.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setApplied(filters);
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [filters]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(applied).forEach(([k, v]) => v && params.set(k, v));

    return params;
  }, [applied]);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams(queryString);
      params.set('page', String(page));
      const res = await api<{ data: Log[]; meta: Meta; facets: Facets }>(
        `/audit-log?${params.toString()}`,
      );
      setRows(res.data);
      setMeta(res.meta);
      setFacets(res.facets);
    } catch (e) {
      setRows([]);
      notify((e as ApiError).message, true);
    } finally {
      setLoading(false);
    }
  }, [queryString, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeCount = Object.values(applied).filter(Boolean).length;
  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setFilters((f) => ({ ...f, [key]: value }));
  const options = (all: string, items: { value: string; label: string }[]) => [
    { value: ALL, label: all },
    ...items,
  ];

  const verify = async () => {
    setVerifying(true);

    try {
      setIntegrity(await api<Integrity>('/audit-log/verify', { method: 'POST' }));
      void load();
    } catch (e) {
      notify((e as ApiError).message, true);
    } finally {
      setVerifying(false);
    }
  };

  const openBroken = async (id: number) => {
    try {
      const res = await api<{ data: Log[] }>(`/audit-log?id=${id}`);

      if (res.data[0]) {
        setSelected(res.data[0]);
      }
    } catch (e) {
      notify((e as ApiError).message, true);
    }
  };

  const exportCsv = () => {
    const link = document.createElement('a');
    link.href = `${KIT_API}/audit-log/export?${queryString.toString()}`;
    link.rel = 'noopener';
    link.click();
    window.setTimeout(() => void load(), 1500);
  };

  const reason = (r: NonNullable<Integrity['rusak']>) =>
    r.alasan === 'rantai_putus'
      ? t('Catatan #{id} menunjuk ke catatan sebelumnya yang tidak ada lagi: ada catatan di antaranya yang dihapus.', { id: r.id })
      : r.alasan === 'titik_acuan'
        ? t('Catatan #{id} tidak cocok dengan titik acuan yang tersimpan: seluruh rantai kemungkinan ditulis ulang.', { id: r.id })
        : t('Isi catatan #{id} tidak lagi cocok dengan hash-nya: catatan ini diubah setelah ditulis.', { id: r.id });

  return (
    <div className="flex flex-col gap-6">
      <PageActions>
        <Button
          variant="outline"
          onClick={() =>
            setConfirm({
              title: t('Ekspor log audit (CSV)?'),
              description:
                activeCount > 0
                  ? t('File berisi {n} catatan yang cocok dengan filter, lengkap dengan IP, perangkat, dan nilai sebelum/sesudah. Ekspor ini tercatat di log audit atas nama Anda.', { n: meta.total })
                  : t('File berisi seluruh catatan audit, lengkap dengan IP, perangkat, dan nilai sebelum/sesudah. Ekspor ini tercatat di log audit atas nama Anda.'),
              confirmLabel: t('Ya, ekspor'),
              run: exportCsv,
            })
          }
        >
          <DownloadIcon data-icon="inline-start" />
          {t('Ekspor CSV')}
        </Button>
        <Button
          variant="outline"
          disabled={verifying}
          onClick={() =>
            setConfirm({
              title: t('Verifikasi integritas log audit?'),
              description: t('Seluruh rantai hash diperiksa. Setiap verifikasi dicatat di log audit atas nama Anda, dan bila rantai utuh dan ada catatan baru, sebuah titik acuan baru disimpan.'),
              confirmLabel: t('Ya, verifikasi'),
              run: () => void verify(),
            })
          }
        >
          {verifying ? <Spinner data-icon="inline-start" /> : <ShieldCheckIcon data-icon="inline-start" />}
          {t('Verifikasi integritas')}
        </Button>
      </PageActions>

      {integrity && (
        <div
          role={integrity.valid ? 'status' : 'alert'}
          className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start ${integrity.valid ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200' : 'border-destructive/40 bg-destructive/10 text-destructive'}`}
        >
          {integrity.valid ? <ShieldCheckIcon className="size-5 shrink-0" /> : <ShieldAlertIcon className="size-5 shrink-0" />}
          <div className="flex flex-1 flex-col gap-1 text-sm">
            <p className="font-semibold">
              {integrity.valid ? t('Rantai log audit utuh') : t('Integritas log audit bermasalah')}
            </p>
            {integrity.valid ? (
              <p>
                {t('{jumlah} catatan diperiksa dan tidak ada yang diubah atau dihapus. Diperiksa {waktu}.', {
                  jumlah: integrity.jumlah,
                  waktu: new Date(integrity.diperiksa_pada).toLocaleString(),
                })}
              </p>
            ) : (
              <>
                {integrity.rusak && <p>{reason(integrity.rusak)}</p>}
                <p>
                  {t('Segera selidiki: siapa yang punya akses langsung ke database, lalu pulihkan dari cadangan dan laporkan ke pihak keamanan. Catatan setelah titik ini tidak dapat dipercaya.')}
                </p>
              </>
            )}
          </div>
          {integrity.rusak && (
            <Button variant="outline" size="sm" onClick={() => void openBroken(integrity.rusak!.id)}>
              {t('Lihat catatan #{id}', { id: integrity.rusak.id })}
            </Button>
          )}
        </div>
      )}

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <InputGroup>
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                aria-label={t('Cari log')}
                placeholder={t('Cari aksi, catatan, IP, atau hash')}
                value={filters.q}
                onChange={(e) => set('q')(e.target.value)}
              />
            </InputGroup>
            <DateRangePicker
              from={filters.dari}
              to={filters.sampai}
              onChange={(r) => setFilters((f) => ({ ...f, dari: r.from, sampai: r.to }))}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <SearchSelect
              ariaLabel={t('Kategori')}
              value={filters.kategori}
              onChange={set('kategori')}
              options={options(
                t('Semua kategori'),
                (facets?.kategori ?? []).map((k) => ({ value: k.key, label: k.label })),
              )}
            />
            <SearchSelect
              ariaLabel={t('Hasil')}
              value={filters.hasil}
              onChange={set('hasil')}
              options={options(
                t('Semua hasil'),
                (facets?.hasil ?? []).map((k) => ({ value: k.key, label: k.label })),
              )}
            />
            <SearchSelect
              ariaLabel={t('Objek')}
              value={filters.entitas}
              onChange={set('entitas')}
              options={options(
                t('Semua objek'),
                (facets?.entitas ?? []).map((e) => ({ value: e, label: entityLabel(e) })),
              )}
            />
            <SearchSelect
              ariaLabel={t('Aksi')}
              value={filters.aksi}
              onChange={set('aksi')}
              options={options(
                t('Semua aksi'),
                (facets?.aksi ?? []).map((a) => ({ value: a, label: actionLabel(a) })),
              )}
            />
            <SearchSelect
              ariaLabel={t('Pelaku')}
              value={filters.aktor}
              onChange={set('aktor')}
              options={options(t('Semua pelaku'), [
                { value: 'sistem', label: t('Sistem (tanpa pengguna)') },
                ...(facets?.aktor ?? []).map((a) => ({ value: a.id, label: a.nama })),
              ])}
            />
            <SearchSelect
              ariaLabel={t('Peran')}
              value={filters.peran}
              onChange={set('peran')}
              options={options(
                t('Semua peran'),
                (facets?.peran ?? []).map((r) => ({ value: r, label: r })),
              )}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              {t('{n} catatan', { n: meta.total })}
              {activeCount > 0 && ` · ${t('{n} filter aktif', { n: activeCount })}`}
            </span>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY)}>
                <FilterXIcon />
                {t('Atur ulang filter')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {rows === null && <Skeleton className="h-64 w-full" />}
      {rows !== null && rows.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <HistoryIcon className="size-5" />
          </span>
          <p className="font-medium">{t('Belum ada catatan')}</p>
          <p className="text-sm text-muted-foreground">
            {activeCount > 0 ? t('Tidak ada catatan yang cocok dengan filter.') : t('Aksi pengguna akan muncul di sini.')}
          </p>
        </div>
      )}
      {rows !== null && rows.length > 0 && (
        <Card className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Waktu')}</TableHead>
                  <TableHead>{t('Pelaku')}</TableHead>
                  <TableHead>{t('Aksi')}</TableHead>
                  <TableHead>{t('Objek')}</TableHead>
                  <TableHead>{t('Hasil')}</TableHead>
                  <TableHead className="hidden xl:table-cell">{t('Alamat IP')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((l) => (
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => setSelected(l)}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{when(l.waktu)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{l.aktor?.nama ?? t('Sistem')}</span>
                        <span className="text-xs text-muted-foreground">{l.peran?.split(',').join(', ') ?? '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{actionLabel(l.aksi)}</span>
                        <span className="text-xs text-muted-foreground">
                          {facets?.kategori.find((k) => k.key === l.kategori)?.label}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-56 truncate">{entityLabel(l.entitas)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={OUTCOME_STYLE[l.hasil]}>
                        {outcomeLabel(l.hasil)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground xl:table-cell">{l.ip ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {meta.last_page > 1 && (
              <div className="flex items-center justify-between pt-4 text-sm text-muted-foreground">
                <span>{t('{n} catatan', { n: meta.total })}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    {t('Sebelumnya')}
                  </Button>
                  <span>
                    {meta.page} / {meta.last_page}
                  </span>
                  <Button variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => setPage(page + 1)}>
                    {t('Berikutnya')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Checkpoints refreshKey={integrity} broken={integrity?.valid === false} />
      <Detail log={selected} onClose={() => setSelected(null)} />
      <NoticeDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel ?? ''}
        onConfirm={() => {
          confirm?.run();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
        dismissible
      />
    </div>
  );
}
