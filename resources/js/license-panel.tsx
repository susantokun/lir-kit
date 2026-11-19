import { RefreshCwIcon, UploadIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { ApiError, KIT_API, api, notify, t } from './adapters';
import { PageActions } from './layouts/page-actions';

type Details = {
  status: string;
  read_only: boolean;
  message: string | null;
  expires_at: string | null;
  days_left: number | null;
  configured: boolean;
  enforced: boolean;
  licensee: string | null;
  key: string | null;
  domain: string | null;
  bound_domain: string | null;
  issued_at: string | null;
  grace_days: number | null;
  max_users: number | null;
  active_users: number;
  modules: string[] | null;
  last_checked_at: string | null;
  last_error: string | null;
};

type Busy = 'activate' | 'upload' | 'check' | null;

const STATUS_LABELS: Record<string, () => string> = {
  unconfigured: () => t('Belum dikonfigurasi'),
  missing: () => t('Belum diaktifkan'),
  invalid: () => t('Tidak sah'),
  active: () => t('Aktif'),
  grace: () => t('Masa tenggang'),
  expired: () => t('Habis'),
  revoked: () => t('Dicabut'),
  rejected: () => t('Ditolak server'),
};

const statusVariant = (status: string) =>
  status === 'active'
    ? ('default' as const)
    : status === 'grace' || status === 'unconfigured' || status === 'missing'
      ? ('secondary' as const)
      : ('destructive' as const);

const xsrf = () => {
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);

  return match ? decodeURIComponent(match[1]) : '';
};

/** The kit's JSON helper cannot send a file, so the .lic upload posts a form itself. */
async function upload(file: File): Promise<Details> {
  const body = new FormData();
  body.append('file', file);
  const response = await fetch(`${KIT_API}/license/upload`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'X-XSRF-TOKEN': xsrf() },
    body,
  });
  const data = (await response.json().catch(() => ({}))) as Partial<Details> & {
    message?: string;
    errors?: Record<string, string[]>;
  };

  if (!response.ok) {
    throw new ApiError(
      data.errors ? Object.values(data.errors).flat().join(' ') : (data.message ?? `HTTP ${response.status}`),
      response.status,
      data.errors,
    );
  }

  return data as Details;
}

const date = (value: string | null, withTime = false) =>
  value
    ? new Date(value).toLocaleString(
        undefined,
        withTime ? { dateStyle: 'long', timeStyle: 'short' } : { dateStyle: 'long' },
      )
    : '-';

/**
 * The License screen: the state of the app's license, activation with a key (the app asks the license portal),
 * an offline .lic file, and "Cek sekarang". Talks to /lir-kit/license. The buttons go to the page header.
 */
export function LicensePanel() {
  const [details, setDetails] = useState<Details | null>(null);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<Details>('/license')
      .then(setDetails)
      .catch((e: ApiError) => notify(e.message, true));
  }, []);

  const run = async (action: Exclude<Busy, null>, request: () => Promise<Details>, success: string) => {
    setBusy(action);

    try {
      setDetails(await request());
      notify(success);
    } catch (e) {
      notify((e as ApiError).message, true);
    } finally {
      setBusy(null);
    }
  };

  const activate = () =>
    run(
      'activate',
      async () => {
        const result = await api<Details>('/license/activate', { method: 'POST', body: { key: key.trim() } });
        setKey('');

        return result;
      },
      t('License berhasil diaktifkan.'),
    );

  const check = () =>
    run('check', () => api<Details>('/license/check', { method: 'POST', body: {} }), t('Pengecekan selesai.'));

  const row = (label: string, value: string | number | null) => (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-all sm:text-right">{value ?? '-'}</dd>
    </div>
  );

  const limit = (used: number, max: number | null) =>
    max === null ? t('{used} (tanpa batas)', { used }) : t('{used} dari {max}', { used, max });

  const canChange = details?.configured === true;

  return (
    <>
      <PageActions>
        <Button variant="outline" disabled={busy !== null || details?.key == null} onClick={() => void check()}>
          {busy === 'check' ? <Spinner data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
          {t('Cek sekarang')}
        </Button>
      </PageActions>

      {details === null ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t('Informasi license')}
                <Badge variant={statusVariant(details.status)}>
                  {STATUS_LABELS[details.status]?.() ?? details.status}
                </Badge>
              </CardTitle>
              {details.message && <CardDescription>{details.message}</CardDescription>}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {!details.configured && (
                <Alert>
                  <AlertDescription>
                    {t('License belum dikonfigurasi. Isi LIR_LICENSE_SERVER_URL dan LIR_LICENSE_PUBLIC_KEY di .env (lihat config lir-kit.license), lalu aktifkan di sini.')}
                  </AlertDescription>
                </Alert>
              )}
              {details.configured && !details.enforced && (
                <Alert>
                  <AlertDescription>
                    {t('Pembatasan belum diberlakukan: license hanya ditampilkan. Setel LIR_LICENSE_ENFORCE=true agar aplikasi baca-saja tanpa license yang berlaku.')}
                  </AlertDescription>
                </Alert>
              )}
              <dl className="flex flex-col gap-3">
                {row(t('Pemegang license'), details.licensee)}
                {row(t('License key'), details.key)}
                {row(t('Domain'), details.domain ?? details.bound_domain)}
                {row(t('Diterbitkan'), date(details.issued_at))}
                {row(t('Berlaku sampai'), date(details.expires_at))}
                {row(t('Sisa hari'), details.days_left)}
                {row(t('Masa tenggang'), details.grace_days === null ? null : t('{count} hari', { count: details.grace_days }))}
                {row(t('Batas user aktif'), limit(details.active_users, details.max_users))}
                <div className="flex flex-col gap-1.5 sm:flex-row sm:justify-between sm:gap-4">
                  <dt className="text-sm text-muted-foreground">{t('Modul')}</dt>
                  <dd className="flex flex-wrap gap-1.5 sm:justify-end">
                    {details.modules === null ? (
                      <span className="text-sm font-medium">{details.key === null ? '-' : t('Semua fitur')}</span>
                    ) : (
                      details.modules.map((code) => (
                        <Badge key={code} variant="outline">
                          {code}
                        </Badge>
                      ))
                    )}
                  </dd>
                </div>
                {row(t('Cek terakhir'), date(details.last_checked_at, true))}
                {details.last_error && row(t('Galat terakhir'), details.last_error)}
              </dl>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{details.key === null ? t('Aktifkan dengan license key') : t('Ganti license')}</CardTitle>
                <CardDescription>
                  {t('Aplikasi akan menghubungi server license untuk mengikat license ini ke domain ini.')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="license-key">{t('License key')}</FieldLabel>
                    <Input
                      id="license-key"
                      autoComplete="off"
                      spellCheck={false}
                      disabled={!canChange}
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                    />
                  </Field>
                  <Button disabled={busy !== null || !canChange || !key.trim()} onClick={() => void activate()}>
                    {busy === 'activate' && <Spinner data-icon="inline-start" />}
                    {t('Aktifkan')}
                  </Button>
                </FieldGroup>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('File license offline')}</CardTitle>
                <CardDescription>
                  {t('Untuk server tanpa akses internet: unggah file .lic yang diunduh dari penerbit.')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Field>
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".lic,application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';

                      if (file) {
                        void run('upload', () => upload(file), t('File license terpasang.'));
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    disabled={busy !== null || !canChange}
                    onClick={() => fileInput.current?.click()}
                  >
                    {busy === 'upload' ? <Spinner data-icon="inline-start" /> : <UploadIcon data-icon="inline-start" />}
                    {t('Unggah file .lic')}
                  </Button>
                  <FieldDescription>{t('Ukuran maksimal 64 KB.')}</FieldDescription>
                </Field>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
