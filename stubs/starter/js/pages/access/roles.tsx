import { RolesPanel } from '@/lir-kit/access/roles-panel';
import { t } from '@/lir-kit/adapters';
import SettingsPage from '@/layouts/settings-page';

/** Peran: what each role may do. The permissions listed come from config 'lir-kit.permissions'. */
export default function Roles() {
  return (
    <SettingsPage
      title={t('Peran & Hak Akses')}
      description={t('Kumpulan hak akses yang bisa diberikan kepada pengguna.')}
    >
      <RolesPanel />
    </SettingsPage>
  );
}
