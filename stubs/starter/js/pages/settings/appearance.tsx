import { t } from '@/lir-kit/adapters';
import { AppearanceCard } from '@/lir-kit/shell/appearance-card';
import SettingsPage from '@/layouts/settings-page';

/** Theme choice. Add a language card here when your app has more than one language. */
export default function Appearance() {
  return (
    <SettingsPage
      title={t('Tampilan')}
      description={t('Pilih tema aplikasi. Pilihan disimpan di peramban ini.')}
    >
      <AppearanceCard />
    </SettingsPage>
  );
}
