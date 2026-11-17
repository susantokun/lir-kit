import { router, useForm } from '@inertiajs/react';
import { ArrowLeftIcon, MailIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { OtpCodeInput } from './otp-code-input';
import { SessionConflictDialog } from './session-conflict-dialog';
import type { SessionConflict } from '@/components/session-conflict-dialog';
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
import { t } from './adapters';

type Props = {
  otpEmail: string | null;
  length: number;
  resendIn: number;
  /** Only while developing: the code that was just sent, shown so no mailbox is needed. */
  devCode?: string | null;
};

/**
 * Passwordless sign-in: first the email, then the code sent to it. The server answers the same whether or not
 * the address has an account, so this form says "if registered" and never confirms it.
 */
export function OtpLoginForm({ otpEmail, length, resendIn, devCode }: Props) {
  return otpEmail ? (
    <CodeStep
      email={otpEmail}
      length={length}
      resendIn={resendIn}
      devCode={devCode}
    />
  ) : (
    <EmailStep />
  );
}

function EmailStep() {
  const form = useForm({ email: '' });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.post('/login/otp/send');
      }}
    >
      <FieldGroup>
        <Field data-invalid={!!form.errors.email}>
          <FieldLabel htmlFor="otp-email">{t('Email')}</FieldLabel>
          <Input
            id="otp-email"
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
            {t('Kami mengirim kode sekali pakai ke email ini bila terdaftar.')}
          </FieldDescription>
        </Field>
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={form.processing || !form.data.email.trim()}
        >
          {form.processing ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <MailIcon data-icon="inline-start" />
          )}
          {form.processing ? t('Mengirim…') : t('Kirim kode masuk')}
        </Button>
      </FieldGroup>
    </form>
  );
}

function CodeStep({
  email,
  length,
  resendIn,
  devCode,
}: {
  email: string;
  length: number;
  resendIn: number;
  devCode?: string | null;
}) {
  const form = useForm({ code: '', takeover: false });
  const [wait, setWait] = useState(resendIn);
  const [resending, setResending] = useState(false);
  const conflictRaw = (form.errors as Record<string, string | undefined>)
    .session_conflict;
  const conflict = useMemo(() => {
    try {
      return conflictRaw ? (JSON.parse(conflictRaw) as SessionConflict) : null;
    } catch {
      return null;
    }
  }, [conflictRaw]);

  useEffect(() => setWait(resendIn), [resendIn]);

  useEffect(() => {
    if (wait <= 0) return;

    const timer = window.setTimeout(() => setWait((s) => s - 1), 1000);

    return () => window.clearTimeout(timer);
  }, [wait]);

  const submit = () => form.post('/login/otp/verify');

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <FieldGroup>
          {devCode && (
            <div
              role="note"
              className="rounded-lg border bg-muted/40 p-3 text-sm"
            >
              <p className="font-medium">{t('Mode lokal')}</p>
              <p className="text-muted-foreground">
                {t('Kode Anda:')}{' '}
                <button
                  type="button"
                  className="font-mono font-semibold text-foreground underline-offset-4 hover:underline"
                  title={t('Klik untuk mengisi kode')}
                  onClick={() => form.setData('code', devCode)}
                >
                  {devCode}
                </button>
              </p>
            </div>
          )}
          <Field data-invalid={!!form.errors.code}>
            <FieldLabel htmlFor="otp-code">{t('Kode masuk')}</FieldLabel>
            <OtpCodeInput
              id="otp-code"
              length={length}
              autoFocus
              invalid={!!form.errors.code}
              value={form.data.code}
              onChange={(code) => form.setData('code', code)}
            />
            {form.errors.code && <FieldError>{form.errors.code}</FieldError>}
            <FieldDescription>
              {t('Masukkan kode {count} digit yang dikirim ke {email}.', {
                count: length,
                email,
              })}
            </FieldDescription>
          </Field>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={form.processing || form.data.code.length < length}
          >
            {form.processing && <Spinner data-icon="inline-start" />}
            {form.processing ? t('Memeriksa…') : t('Masuk')}
          </Button>
          <div className="flex items-center justify-between gap-2 text-sm">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.post('/login/otp/cancel')}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              {t('Ganti email')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={wait > 0 || resending}
              onClick={() =>
                router.post(
                  '/login/otp/resend',
                  {},
                  {
                    preserveScroll: true,
                    onStart: () => setResending(true),
                    onFinish: () => setResending(false),
                  },
                )
              }
            >
              {wait > 0
                ? t('Kirim ulang kode ({seconds} dtk)', {
                    seconds: wait,
                  })
                : t('Kirim ulang kode')}
            </Button>
          </div>
        </FieldGroup>
      </form>
      <SessionConflictDialog
        conflict={conflict}
        busy={form.processing}
        onCancel={() => form.clearErrors()}
        onContinue={() => {
          form.transform((d) => ({ ...d, takeover: true }));
          form.post('/login/otp/verify', {
            onFinish: () => form.transform((d) => d),
          });
        }}
      />
    </>
  );
}
