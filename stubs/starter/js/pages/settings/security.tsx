import { router, useForm, usePage } from '@inertiajs/react';
import { CheckIcon, ShieldCheckIcon, ShieldOffIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { t } from '@/lir-kit/adapters';
import { FormCard, FormGrid } from '@/lir-kit/layouts/form-card';
import SettingsPage from '@/layouts/settings-page';

/** Shared by your app (e.g. in HandleInertiaRequests): is two-step verification on, or set up but not yet confirmed? */
type TwoFactor = { enabled: boolean; pending: boolean };

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  });

  return (await response.json()) as T;
}

/**
 * Two-step verification with an authenticator app (Fortify: POST/DELETE /user/two-factor-authentication,
 * GET /user/two-factor-qr-code, /user/two-factor-secret-key, /user/two-factor-recovery-codes,
 * POST /user/confirmed-two-factor-authentication).
 */
function TwoFactorCard({ twoFactor }: { twoFactor: TwoFactor }) {
  const [qr, setQr] = useState<{ svg: string; secret: string } | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const form = useForm({ code: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (twoFactor.pending) {
      void Promise.all([
        getJson<{ svg: string }>('/user/two-factor-qr-code'),
        getJson<{ secretKey: string }>('/user/two-factor-secret-key'),
      ]).then(([q, s]) => setQr({ svg: q.svg, secret: s.secretKey }));
    } else {
      setQr(null);
    }

    if (twoFactor.enabled) {
      void getJson<string[]>('/user/two-factor-recovery-codes').then(setCodes);
    } else {
      setCodes([]);
    }
  }, [twoFactor.pending, twoFactor.enabled]);

  const call = (method: 'post' | 'delete', url: string) =>
    router[method](url, {}, {
      preserveScroll: true,
      onStart: () => setBusy(true),
      onFinish: () => setBusy(false),
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {twoFactor.enabled ? (
            <ShieldCheckIcon className="size-4 text-emerald-600" />
          ) : (
            <ShieldOffIcon className="size-4 text-muted-foreground" />
          )}
          {t('Verifikasi dua langkah')}
        </CardTitle>
        <CardDescription>
          {twoFactor.enabled
            ? t('Aktif. Setiap masuk meminta kode dari aplikasi autentikator.')
            : t('Tambahkan lapisan keamanan dengan kode dari aplikasi autentikator.')}
        </CardDescription>
      </CardHeader>
      {twoFactor.pending && (
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t('Pindai kode QR dengan aplikasi autentikator, lalu masukkan kode 6 digit untuk mengonfirmasi.')}
          </p>
          {qr && (
            <div className="flex flex-col items-start gap-2">
              <div
                className="size-44 rounded-lg border bg-white p-2 [&>svg]:size-full"
                dangerouslySetInnerHTML={{ __html: qr.svg }}
              />
              <p className="text-xs text-muted-foreground">
                {t('Atau ketik kunci ini')}: <code>{qr.secret}</code>
              </p>
            </div>
          )}
          <form
            className="flex max-w-xs items-start gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              form.post('/user/confirmed-two-factor-authentication', {
                preserveScroll: true,
                onSuccess: () => form.reset(),
              });
            }}
          >
            <Field data-invalid={!!form.errors.code} className="flex-1">
              <Input
                aria-label={t('Kode autentikator')}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={form.data.code}
                aria-invalid={!!form.errors.code}
                onChange={(e) => form.setData('code', e.target.value)}
              />
              {form.errors.code && <FieldError>{form.errors.code}</FieldError>}
            </Field>
            <Button type="submit" disabled={form.processing}>
              {t('Konfirmasi')}
            </Button>
          </form>
        </CardContent>
      )}
      {twoFactor.enabled && codes.length > 0 && (
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm font-medium">{t('Kode pemulihan')}</p>
          <p className="text-sm text-muted-foreground">
            {t('Simpan di tempat aman. Tiap kode hanya bisa dipakai sekali bila Anda kehilangan ponsel.')}
          </p>
          <ul className="grid gap-1 rounded-lg border bg-muted/40 p-3 font-mono text-sm sm:grid-cols-2">
            {codes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
        </CardContent>
      )}
      <CardFooter>
        {twoFactor.enabled || twoFactor.pending ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => call('delete', '/user/two-factor-authentication')}
          >
            {busy && <Spinner data-icon="inline-start" />}
            {twoFactor.pending ? t('Batalkan') : t('Nonaktifkan')}
          </Button>
        ) : (
          <Button
            disabled={busy}
            onClick={() => call('post', '/user/two-factor-authentication')}
          >
            {busy && <Spinner data-icon="inline-start" />}
            {t('Aktifkan')}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

/** Change the password (Fortify: PUT /user/password) and manage two-step verification. */
export default function Security() {
  const { twoFactor } = usePage<{ twoFactor?: TwoFactor }>().props;
  const form = useForm({
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  return (
    <SettingsPage
      title={t('Keamanan')}
      description={t('Kata sandi dan verifikasi dua langkah.')}
    >
      <div className="grid items-start gap-6 lg:grid-cols-2">
      <FormCard
        title={t('Ganti kata sandi')}
        description={t('Gunakan kata sandi yang panjang dan tidak dipakai di layanan lain.')}
        busy={form.processing}
        submitLabel={t('Simpan kata sandi')}
        onSubmit={() =>
          form.put('/user/password', {
            preserveScroll: true,
            onSuccess: () => form.reset(),
          })
        }
        extraActions={
          form.recentlySuccessful && (
            <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckIcon className="size-4" />
              {t('Tersimpan')}
            </span>
          )
        }
      >
        <Field data-invalid={!!form.errors.current_password}>
          <FieldLabel htmlFor="s-current">{t('Kata sandi saat ini')}</FieldLabel>
          <Input
            id="s-current"
            type="password"
            autoComplete="current-password"
            value={form.data.current_password}
            aria-invalid={!!form.errors.current_password}
            onChange={(e) => form.setData('current_password', e.target.value)}
          />
          {form.errors.current_password && (
            <FieldError>{form.errors.current_password}</FieldError>
          )}
        </Field>
        <FormGrid>
          <Field data-invalid={!!form.errors.password}>
            <FieldLabel htmlFor="s-new">{t('Kata sandi baru')}</FieldLabel>
            <Input
              id="s-new"
              type="password"
              autoComplete="new-password"
              value={form.data.password}
              aria-invalid={!!form.errors.password}
              onChange={(e) => form.setData('password', e.target.value)}
            />
            {form.errors.password && <FieldError>{form.errors.password}</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="s-confirm">{t('Ulangi kata sandi baru')}</FieldLabel>
            <Input
              id="s-confirm"
              type="password"
              autoComplete="new-password"
              value={form.data.password_confirmation}
              onChange={(e) => form.setData('password_confirmation', e.target.value)}
            />
          </Field>
        </FormGrid>
      </FormCard>
      <TwoFactorCard twoFactor={twoFactor ?? { enabled: false, pending: false }} />
      </div>
    </SettingsPage>
  );
}
