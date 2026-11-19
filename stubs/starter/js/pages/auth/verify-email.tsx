import { router, useForm, usePage } from '@inertiajs/react';
import { LogOutIcon, MailCheckIcon, MailIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { t } from '@/lir-kit/adapters';
import {
  AuthSplitLayout,
  ENTER,
  enter,
} from '@/lir-kit/layouts/auth-split-layout';
import { authBrand } from '@/config/brand';

/** Shown to a signed-in person whose email is not verified yet (Fortify: POST /email/verification-notification). */
export default function VerifyEmail() {
  const form = useForm({});
  const { status, auth } = usePage<{
    status?: string | null;
    auth?: { user?: { email?: string } | null };
  }>().props;

  return (
    <AuthSplitLayout brand={authBrand} title={t('Verifikasi email')}>
      <div className={`flex flex-col gap-2 ${ENTER}`} style={enter(60)}>
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MailIcon className="size-5" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t('Verifikasi email Anda')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(
            'Akun hanya dapat dipakai setelah email diverifikasi. Kami sudah mengirim tautan verifikasi ke email Anda; buka tautan itu untuk melanjutkan.',
          )}
        </p>
      </div>

      {status === 'verification-link-sent' && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300"
        >
          <MailCheckIcon className="mt-0.5 size-4 shrink-0" />
          {t('Tautan verifikasi baru sudah dikirim.')}
        </div>
      )}

      {auth?.user?.email && (
        <div
          className={`flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm ${ENTER}`}
          style={enter(160)}
        >
          <MailIcon className="size-4 text-muted-foreground" />
          {auth.user.email}
        </div>
      )}

      <div className={`flex flex-col gap-2 ${ENTER}`} style={enter(220)}>
        <Button
          size="lg"
          className="w-full"
          disabled={form.processing}
          onClick={() => form.post('/email/verification-notification')}
        >
          {form.processing && <Spinner data-icon="inline-start" />}
          {t('Kirim ulang email verifikasi')}
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => router.post('/logout')}
        >
          <LogOutIcon data-icon="inline-start" />
          {t('Keluar')}
        </Button>
      </div>
    </AuthSplitLayout>
  );
}
