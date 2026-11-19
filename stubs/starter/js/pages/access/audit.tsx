import { AuditPanel } from '@/lir-kit/access/audit-panel';
import { t } from '@/lir-kit/adapters';
import SettingsPage from '@/layouts/settings-page';

/** Log Audit: the tamper-evident trail of who did what. Needs the ability in config 'lir-kit.audit_ability'. */
export default function Audit() {
  return (
    <SettingsPage
      title={t('Log Audit')}
      description={t(
        'Siapa melakukan apa, kapan, dari mana, dan apa yang berubah. Catatan bersifat tambah-saja dan tidak dapat diubah.',
      )}
    >
      <AuditPanel />
    </SettingsPage>
  );
}
