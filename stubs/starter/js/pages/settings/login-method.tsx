import { t } from '@/lir-kit/adapters';
import { LoginMethodCard } from '@/lir-kit/login-method-card';
import SettingsPage from '@/layouts/settings-page';

/** How people sign in: password, emailed code, or both, and the rules for the code. */
export default function LoginMethod() {
  return (
    <SettingsPage
      title={t('Metode Masuk')}
      description={t('Pilih cara pengguna masuk dan atur aturan kode sekali pakai.')}
    >
      <div className="lg:w-2/3 2xl:w-1/2">
        <LoginMethodCard />
      </div>
    </SettingsPage>
  );
}
