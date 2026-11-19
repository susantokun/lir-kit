import { Link, useForm } from '@inertiajs/react';
import { ArrowLeftIcon, EyeIcon, EyeOffIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { t } from '@/lir-kit/adapters';
import {
  AuthSplitLayout,
  ENTER,
  enter,
} from '@/lir-kit/layouts/auth-split-layout';
import { authBrand } from '@/config/brand';

/** The page the emailed link opens: sets a new password (Fortify: POST /reset-password). */
export default function ResetPassword({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const form = useForm({
    token,
    email,
    password: '',
    password_confirmation: '',
  });
  const [reveal, setReveal] = useState(false);

  return (
    <AuthSplitLayout brand={authBrand} title={t('Atur ulang kata sandi')}>
      <div className={`flex flex-col gap-2 ${ENTER}`} style={enter(60)}>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t('Buat kata sandi baru')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('Untuk akun {email}.', { email })}
        </p>
      </div>

      <form
        className={ENTER}
        style={enter(160)}
        onSubmit={(e) => {
          e.preventDefault();
          form.post('/reset-password');
        }}
      >
        <FieldGroup>
          {(form.errors.token || form.errors.email) && (
            <FieldError>{form.errors.token ?? form.errors.email}</FieldError>
          )}
          <Field data-invalid={!!form.errors.password}>
            <FieldLabel htmlFor="password">{t('Kata sandi baru')}</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="password"
                type={reveal ? 'text' : 'password'}
                autoFocus
                autoComplete="new-password"
                value={form.data.password}
                onChange={(e) => form.setData('password', e.target.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  aria-label={
                    reveal
                      ? t('Sembunyikan kata sandi')
                      : t('Tampilkan kata sandi')
                  }
                  onClick={() => setReveal((v) => !v)}
                >
                  {reveal ? <EyeOffIcon /> : <EyeIcon />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {form.errors.password && (
              <FieldError>{form.errors.password}</FieldError>
            )}
            <FieldDescription>
              {t(
                'Gunakan kata sandi yang panjang dan tidak dipakai di layanan lain.',
              )}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="password_confirmation">
              {t('Ulangi kata sandi baru')}
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="password_confirmation"
                type={reveal ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.data.password_confirmation}
                onChange={(e) =>
                  form.setData('password_confirmation', e.target.value)
                }
              />
            </InputGroup>
          </Field>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={form.processing}
          >
            {form.processing && <Spinner data-icon="inline-start" />}
            {t('Simpan kata sandi baru')}
          </Button>
        </FieldGroup>
      </form>

      <p className={`border-t pt-5 ${ENTER}`} style={enter(260)}>
        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          {t('Kembali ke halaman masuk')}
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
