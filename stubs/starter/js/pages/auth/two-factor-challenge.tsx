import { useForm } from '@inertiajs/react';
import { KeyRoundIcon, SmartphoneIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { t } from '@/lir-kit/adapters';
import {
  AuthSplitLayout,
  ENTER,
  enter,
} from '@/lir-kit/layouts/auth-split-layout';
import { authBrand } from '@/config/brand';

/** The second step of sign-in: the code from the authenticator app, or a recovery code (Fortify: POST /two-factor-challenge). */
export default function TwoFactorChallenge() {
  const form = useForm({ code: '', recovery_code: '' });
  const [useRecovery, setUseRecovery] = useState(false);
  const error = form.errors.code ?? form.errors.recovery_code;

  return (
    <AuthSplitLayout brand={authBrand} title={t('Verifikasi dua langkah')}>
      <div className={`flex flex-col gap-2 ${ENTER}`} style={enter(60)}>
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {useRecovery ? (
            <KeyRoundIcon className="size-5" />
          ) : (
            <SmartphoneIcon className="size-5" />
          )}
        </span>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t('Verifikasi dua langkah')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {useRecovery
            ? t('Masukkan salah satu kode pemulihan yang Anda simpan.')
            : t('Masukkan kode dari aplikasi autentikator Anda.')}
        </p>
      </div>

      <form
        className={ENTER}
        style={enter(160)}
        onSubmit={(e) => {
          e.preventDefault();
          form.post('/two-factor-challenge');
        }}
      >
        <FieldGroup>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="code">
              {useRecovery ? t('Kode pemulihan') : t('Kode autentikator')}
            </FieldLabel>
            {useRecovery ? (
              <Input
                id="recovery_code"
                autoFocus
                autoComplete="one-time-code"
                aria-invalid={!!error}
                value={form.data.recovery_code}
                onChange={(e) => form.setData('recovery_code', e.target.value)}
              />
            ) : (
              <Input
                id="code"
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                aria-invalid={!!error}
                value={form.data.code}
                onChange={(e) => form.setData('code', e.target.value)}
              />
            )}
            {error && <FieldError>{error}</FieldError>}
            <FieldDescription>
              {useRecovery
                ? t('Setiap kode pemulihan hanya bisa dipakai sekali.')
                : t('Kode berganti setiap 30 detik.')}
            </FieldDescription>
          </Field>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={form.processing}
          >
            {form.processing && <Spinner data-icon="inline-start" />}
            {t('Verifikasi')}
          </Button>
        </FieldGroup>
      </form>

      <p className={`border-t pt-5 text-center ${ENTER}`} style={enter(260)}>
        <Button
          type="button"
          variant="link"
          onClick={() => {
            setUseRecovery((v) => !v);
            form.setData({ code: '', recovery_code: '' });
            form.clearErrors();
          }}
        >
          {useRecovery
            ? t('Pakai kode autentikator')
            : t('Pakai kode pemulihan')}
        </Button>
      </p>
    </AuthSplitLayout>
  );
}
