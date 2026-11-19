import { t } from '@/lir-kit/adapters';
import { LoginCodeEmailCard } from '@/lir-kit/login-code-email-card';
import { MailSettingsCard } from '@/lir-kit/mail-settings-card';
import SettingsPage from '@/layouts/settings-page';

/** The sender email (SMTP) for every email the app sends, and the wording of the sign-in code email. */
export default function Mail() {
  return (
    <SettingsPage
      title={t('Email & template')}
      description={t('Server pengirim, alamat pengirim, dan isi email kode masuk.')}
    >
      <MailSettingsCard />
      <LoginCodeEmailCard />
    </SettingsPage>
  );
}
