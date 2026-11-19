import { t } from '@/lir-kit/adapters';
import { LicensePanel } from '@/lir-kit/license-panel';
import SettingsPage from '@/layouts/settings-page';

/**
 * License of the app: activation with a key, an offline .lic file and the check against the portal.
 * Set LIR_LICENSE_SERVER_URL and LIR_LICENSE_PUBLIC_KEY (config lir-kit.license) to turn it on.
 */
export default function License() {
  return (
    <SettingsPage
      title={t('License')}
      description={t(
        'Status license aplikasi ini. Dengan pembatasan menyala, tanpa license yang berlaku aplikasi hanya bisa dibaca dan tidak bisa mengubah data.',
      )}
    >
      <LicensePanel />
    </SettingsPage>
  );
}
