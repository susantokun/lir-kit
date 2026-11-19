import { Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeftIcon, MailCheckIcon } from 'lucide-react';
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

/** Asks for the account's email and sends the reset link (Fortify: POST /forgot-password). */
export default function ForgotPassword() {
  const form = useForm({ email: '' });
  const { status } = usePage<{ status?: string | null }>().props;

  return (
    <AuthSplitLayout brand={authBrand} title={t('Lupa kata sandi')}>
      <div className={`flex flex-col gap-2 ${ENTER}`} style={enter(60)}>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t('Lupa kata sandi?')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(
            'Masukkan email akun Anda. Kami kirimkan tautan untuk membuat kata sandi baru.',
          )}
        </p>
      </div>

      {status && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300"
        >
          <MailCheckIcon className="mt-0.5 size-4 shrink-0" />
          {status}
        </div>
      )}

      <form
        className={ENTER}
        style={enter(160)}
        onSubmit={(e) => {
          e.preventDefault();
          form.post('/forgot-password');
        }}
      >
        <FieldGroup>
          <Field data-invalid={!!form.errors.email}>
            <FieldLabel htmlFor="email">{t('Email')}</FieldLabel>
            <Input
              id="email"
              type="email"
              autoFocus
              autoComplete="email"
              placeholder={t('nama@perusahaan.co.id')}
              aria-invalid={!!form.errors.email}
              value={form.data.email}
              onChange={(e) => form.setData('email', e.target.value)}
            />
            {form.errors.email && <FieldError>{form.errors.email}</FieldError>}
            <FieldDescription>
              {t('Email dikirim lewat server surat aplikasi.')}
            </FieldDescription>
          </Field>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={form.processing}
          >
            {form.processing && <Spinner data-icon="inline-start" />}
            {t('Kirim tautan atur ulang')}
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
