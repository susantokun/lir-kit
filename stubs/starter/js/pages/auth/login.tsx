import { Link, useForm, usePage } from '@inertiajs/react';
import { EyeIcon, EyeOffIcon, MailIcon, TriangleAlertIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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
import { OtpLoginForm } from '@/lir-kit/otp-login-form';
import {
  SessionConflictDialog,
  type SessionConflict,
} from '@/lir-kit/session-conflict-dialog';
import { authBrand } from '@/config/brand';

type Props = {
  /** Set by LirKit::loginProps(): 'password', 'otp' or 'both' (Pengaturan > Metode masuk). */
  loginMode?: 'password' | 'otp' | 'both';
  otpEmail?: string | null;
  otpLength?: number;
  resendIn?: number;
  devCode?: string | null;
  /** Optional: shows a box with a demo account and a button that fills the form (the kit's playground uses it). */
  demo?: { email: string; password: string };
};

/** Sign-in: the password form, the emailed-code form, or a switch between them, following the mode the admin chose. */
export default function Login({
  loginMode = 'password',
  otpEmail = null,
  otpLength = 6,
  resendIn = 0,
  devCode = null,
  demo,
}: Props) {
  const form = useForm({ email: '', password: '', takeover: false });
  const { status, notice } = usePage<{
    status?: string | null;
    notice?: string | null;
  }>().props;
  // With both methods on, the password form shows first and a link swaps to the emailed code; a code already sent keeps the code step.
  const [chooseOtp, setChooseOtp] = useState(false);
  const [reveal, setReveal] = useState(false);
  const showOtp =
    loginMode === 'otp' || (loginMode === 'both' && (chooseOtp || !!otpEmail));
  const conflictRaw = (form.errors as Record<string, string | undefined>)
    .session_conflict;
  const conflict = useMemo<SessionConflict | null>(() => {
    try {
      return conflictRaw ? (JSON.parse(conflictRaw) as SessionConflict) : null;
    } catch {
      return null;
    }
  }, [conflictRaw]);

  return (
    <>
      <AuthSplitLayout brand={authBrand} title={t('Masuk')}>
        <div className={`flex flex-col gap-2 ${ENTER}`} style={enter(60)}>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t('Selamat datang kembali')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {showOtp
              ? t(
                  'Masukkan email Anda, lalu kami kirim kode masuk sekali pakai. Tanpa kata sandi.',
                )
              : t('Masuk dengan akun yang diberikan administrator Anda.')}
          </p>
        </div>

        {status && (
          <div
            role="status"
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300"
          >
            {status}
          </div>
        )}
        {notice === 'replaced' && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300"
          >
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
            {t('Sesi Anda berakhir karena akun ini masuk dari perangkat lain.')}
          </div>
        )}
        {demo && (
          <div
            className={`flex items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground ${ENTER}`}
            style={enter(120)}
          >
            <span>
              {t('Akun demo')}: <code>{demo.email}</code> / <code>{demo.password}</code>
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                form.setData({ ...form.data, ...demo });
                setChooseOtp(false);
              }}
            >
              {t('Isi otomatis')}
            </Button>
          </div>
        )}

        {showOtp && (
          <div className={ENTER} style={enter(160)}>
            <OtpLoginForm
              otpEmail={otpEmail}
              devCode={devCode}
              length={otpLength}
              resendIn={resendIn}
            />
            {loginMode === 'both' && !otpEmail && (
              <Button
                type="button"
                variant="link"
                className="mt-3 w-full"
                onClick={() => setChooseOtp(false)}
              >
                {t('Masuk dengan kata sandi')}
              </Button>
            )}
          </div>
        )}
        <form
          hidden={showOtp}
          className={ENTER}
          style={enter(160)}
          onSubmit={(e) => {
            e.preventDefault();
            form.post('/login');
          }}
        >
          <FieldGroup>
            <Field data-invalid={!!form.errors.email}>
              <FieldLabel htmlFor="email">{t('Email')}</FieldLabel>
              <Input
                id="email"
                type="text"
                autoFocus
                autoComplete="username"
                placeholder={t('nama@perusahaan.co.id')}
                aria-invalid={!!form.errors.email}
                value={form.data.email}
                onChange={(e) => form.setData('email', e.target.value)}
              />
              {form.errors.email && <FieldError>{form.errors.email}</FieldError>}
            </Field>
            <Field>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor="password">{t('Kata sandi')}</FieldLabel>
                <Link
                  href="/forgot-password"
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {t('Lupa kata sandi?')}
                </Link>
              </div>
              <InputGroup>
                <InputGroupInput
                  id="password"
                  type={reveal ? 'text' : 'password'}
                  autoComplete="current-password"
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
            </Field>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={form.processing}
            >
              {form.processing && <Spinner data-icon="inline-start" />}
              {form.processing ? t('Memeriksa…') : t('Masuk')}
            </Button>
            {loginMode === 'both' && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                disabled={form.processing}
                onClick={() => setChooseOtp(true)}
              >
                <MailIcon data-icon="inline-start" />
                {t('Masuk dengan kode email')}
              </Button>
            )}
          </FieldGroup>
        </form>

        <p
          className={`border-t pt-5 text-center text-xs text-muted-foreground ${ENTER}`}
          style={enter(260)}
        >
          {t('Belum punya akun? Hubungi administrator Anda.')}
        </p>
      </AuthSplitLayout>
      <SessionConflictDialog
        conflict={conflict}
        busy={form.processing}
        onCancel={() => form.clearErrors()}
        onContinue={() => {
          form.transform((d) => ({ ...d, takeover: true }));
          form.post('/login', { onFinish: () => form.transform((d) => d) });
        }}
      />
    </>
  );
}
