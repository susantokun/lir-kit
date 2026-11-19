import {
  FileTextIcon,
  LayoutDashboardIcon,
  MailIcon,
  MenuIcon,
  SettingsIcon,
  UsersIcon,
} from 'lucide-react';
import { setLockedKeys, type KitNavGroup } from '@/lir-kit/menu';
import { t } from '@/lir-kit/adapters';

/** Entries that cannot be hidden in the menu editor (same list as config/lir-kit.php 'menu_locked'). */
setLockedKeys(['/dashboard', '/settings/menu', 'folder.pengaturan']);

/**
 * Your app's built-in menu: up to three levels (group > entry > sub entry). Give each group and folder a stable `key`;
 * for a page the key is its `href`. Add a page by adding a line, and the sidebar, the search palette and the
 * breadcrumb all follow. Hide entries by permission here before returning (the editor only reorders what you give it).
 */
export function buildNav(): KitNavGroup[] {
  return [
    {
      key: 'group.utama',
      label: t('Utama'),
      items: [
        { href: '/dashboard', label: t('Dashboard'), icon: LayoutDashboardIcon },
        { href: '/laporan', label: t('Laporan'), icon: FileTextIcon },
      ],
    },
    {
      key: 'group.admin',
      label: t('Administrasi'),
      items: [
        {
          key: 'folder.akses',
          href: '/akses/pengguna',
          label: t('Akses'),
          icon: UsersIcon,
          children: [
            { href: '/akses/pengguna', label: t('Pengguna'), icon: UsersIcon },
            { href: '/akses/peran', label: t('Peran'), icon: UsersIcon },
          ],
        },
        {
          key: 'folder.pengaturan',
          href: '/settings',
          label: t('Pengaturan'),
          icon: SettingsIcon,
          children: [
            { href: '/settings', label: t('Metode masuk & email'), icon: MailIcon },
            { href: '/settings/menu', label: t('Menu'), icon: MenuIcon },
          ],
        },
      ],
    },
  ];
}
