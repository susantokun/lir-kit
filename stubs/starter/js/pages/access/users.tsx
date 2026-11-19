import { usePage } from '@inertiajs/react';
import { UsersPanel } from '@/lir-kit/access/users-panel';
import { t } from '@/lir-kit/adapters';
import SettingsPage from '@/layouts/settings-page';

/** Pengguna: invite people, give them roles, switch them off. Needs the ability in config 'lir-kit.users_ability'. */
export default function Users() {
  const { auth } = usePage<{ auth: { user: { id?: string | number } | null } }>().props;

  return (
    <SettingsPage
      title={t('Pengguna')}
      description={t('Undang orang, atur peran, dan nonaktifkan akun.')}
    >
      <UsersPanel currentUserId={auth.user?.id !== undefined ? String(auth.user.id) : undefined} />
    </SettingsPage>
  );
}
