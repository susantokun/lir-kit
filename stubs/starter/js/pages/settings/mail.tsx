import { t } from '@/lir-kit/adapters';
import { LoginCodeEmailCard } from '@/lir-kit/login-code-email-card';
import { MailSettingsCard } from '@/lir-kit/mail-settings-card';
import SettingsPage from '@/layouts/settings-page';

/** The sender email (SMTP) for every email the app sends, and the wording of the sign-in code email. */
export default function Mail() {
  return (
    <SettingsPage
      title={t('Email')}
      description={t('Server pengirim, alamat pengirim, dan isi email kode masuk.')}
    >
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <MailSettingsCard />
        <LoginCodeEmailCard />
      </div>
    </SettingsPage>
  );
}
