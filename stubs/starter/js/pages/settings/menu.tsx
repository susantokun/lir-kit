import { router, usePage } from '@inertiajs/react';
import { t } from '@/lir-kit/adapters';
import { MenuEditor } from '@/lir-kit/menu-editor';
import { buildNav } from '@/config/nav';
import SettingsPage from '@/layouts/settings-page';

/** The menu editor: titles, icons, order, hiding, and your own links and folders. The sidebar updates once saved. */
export default function Menu() {
  const { features } = usePage<{ features?: Record<string, boolean> }>().props;

  return (
    <SettingsPage
      title={t('Menu')}
      description={t('Ubah judul, ikon, urutan, dan sembunyikan entri sidebar; tambah tautan atau folder sendiri.')}
    >
      <MenuEditor
        base={buildNav(undefined, features)}
        onSaved={() => router.reload({ only: ['menuOverrides'] })}
      />
    </SettingsPage>
  );
}
