import {
  FileTextIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  MailIcon,
  MenuIcon,
  PaletteIcon,
  RouteIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UserRoundIcon,
  UsersIcon,
} from 'lucide-react';
import { setLockedKeys, type KitNavGroup } from '@/lir-kit/menu';
import { t } from '@/lir-kit/adapters';

/** Entries that cannot be hidden in the menu editor (same list as config/lir-kit.php 'menu_locked'). */
setLockedKeys(['/dashboard', '/settings/menu', 'folder.pengaturan']);

/** The permission a page needs to show in the menu (the same names as your Gate abilities). Pages not listed are open to everyone signed in. */
const REQUIRES: Record<string, string> = {
  '/laporan': 'laporan.lihat',
  '/akses/pengguna': 'lir-kit.users',
  '/akses/peran': 'lir-kit.roles',
  '/settings/login-method': 'lir-kit.manage',
  '/settings/mail': 'lir-kit.manage',
  '/settings/menu': 'lir-kit.manage',
};

/**
 * Your app's built-in menu: up to three levels (group > entry > sub entry). Give each group and folder a stable `key`;
 * for a page the key is its `href`. Add a page by adding a line, and the sidebar, the search palette and the
 * breadcrumb all follow. The pages under a folder (Akses, Pengaturan, Akun) also make up that folder's side menu
 * on the settings pages.
 *
 * `permissions` is what the person may do (the shared prop from LirKit::permissions()). Leave it out to get the whole
 * menu, which is what the menu editor needs. A page whose permission in REQUIRES the person lacks is left out, and so
 * is a folder left empty. Hiding is cosmetic: the routes stay protected by their abilities.
 */
export function buildNav(permissions?: string[]): KitNavGroup[] {
  const allowed = (href: string) =>
    permissions === undefined || REQUIRES[href] === undefined || permissions.includes(REQUIRES[href]);

  const groups: KitNavGroup[] = [
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
          icon: KeyRoundIcon,
          children: [
            { href: '/akses/pengguna', label: t('Pengguna'), icon: UsersIcon },
            { href: '/akses/peran', label: t('Peran'), icon: ShieldCheckIcon },
          ],
        },
        {
          key: 'folder.pengaturan',
          href: '/settings/login-method',
          label: t('Pengaturan'),
          icon: SettingsIcon,
          children: [
            { href: '/settings/login-method', label: t('Metode masuk'), icon: RouteIcon },
            { href: '/settings/mail', label: t('Email & template'), icon: MailIcon },
            { href: '/settings/menu', label: t('Menu'), icon: MenuIcon },
          ],
        },
      ],
    },
    {
      key: 'group.akun',
      label: t('Akun'),
      items: [
        {
          key: 'folder.akun',
          href: '/settings/profile',
          label: t('Akun saya'),
          icon: UserRoundIcon,
          children: [
            { href: '/settings/profile', label: t('Profil'), icon: UserRoundIcon },
            { href: '/settings/security', label: t('Keamanan'), icon: ShieldCheckIcon },
            { href: '/settings/appearance', label: t('Tampilan'), icon: PaletteIcon },
          ],
        },
      ],
    },
  ];

  return groups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => ({
          ...item,
          children: item.children?.filter((child) => allowed(child.href)),
        }))
        .filter((item) => (item.children ? item.children.length > 0 : allowed(item.href))),
    }))
    .filter((group) => group.items.length > 0);
}
