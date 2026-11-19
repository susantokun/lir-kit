import {
  BadgeCheckIcon,
  FileTextIcon,
  GlobeIcon,
  HistoryIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  MailCheckIcon,
  MailIcon,
  MenuIcon,
  PaletteIcon,
  ServerCogIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UserRoundIcon,
  UsersIcon,
} from 'lucide-react';
import { setLockedKeys, type KitNavGroup } from '@/lir-kit/menu';
import { t } from '@/lir-kit/adapters';

/** Entries that cannot be hidden in the menu editor (same list as config/lir-kit.php 'menu_locked'). */
setLockedKeys(['/dashboard', '/settings/menu', 'folder.pengaturan', 'folder.sistem']);

/** The permission a page needs to show in the menu (the same names as your Gate abilities). Pages not listed are open to everyone signed in. */
const REQUIRES: Record<string, string> = {
  '/laporan': 'laporan.lihat',
  '/akses/pengguna': 'lir-kit.users',
  '/akses/peran': 'lir-kit.roles',
  '/akses/audit': 'lir-kit.manage',
  '/settings/login-method': 'lir-kit.manage',
  '/settings/site': 'lir-kit.manage',
  '/settings/mail': 'lir-kit.manage',
  '/settings/license': 'lir-kit.manage',
  '/settings/menu': 'lir-kit.manage',
};

/** The part of the kit a page belongs to (config 'lir-kit.features'). A page whose part is off is left out of the menu. */
const FEATURE: Record<string, string> = {
  '/akses/pengguna': 'access',
  '/akses/peran': 'access',
  '/akses/audit': 'audit',
  '/settings/login-method': 'otp',
  '/settings/site': 'site',
  '/settings/mail': 'mail',
  '/settings/menu': 'menu',
  '/settings/license': 'license',
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
 *
 * `features` is the shared prop from LirKit::features(): a page of a part that is switched off is left out, for
 * everyone (also in the menu editor). Leave it out to keep every page.
 */
export function buildNav(
  permissions?: string[],
  features?: Record<string, boolean>,
): KitNavGroup[] {
  const featureOn = (href: string) =>
    features === undefined || FEATURE[href] === undefined || features[FEATURE[href]] !== false;
  const allowed = (href: string) =>
    featureOn(href) &&
    (permissions === undefined || REQUIRES[href] === undefined || permissions.includes(REQUIRES[href]));

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
          description: t('Atur siapa yang bisa masuk, apa yang boleh mereka lakukan, dan pantau aktivitasnya.'),
          icon: ShieldCheckIcon,
          children: [
            { href: '/akses/pengguna', label: t('Pengguna'), icon: UsersIcon },
            { href: '/akses/peran', label: t('Peran & Hak Akses'), icon: KeyRoundIcon },
            { href: '/settings/login-method', label: t('Metode Masuk'), icon: MailCheckIcon },
            { href: '/akses/audit', label: t('Log Audit'), icon: HistoryIcon },
          ],
        },
      ],
    },
    {
      key: 'group.lainnya',
      label: t('Lainnya'),
      items: [
        {
          key: 'folder.pengaturan',
          href: '/settings/site',
          label: t('Pengaturan'),
          description: t('Atur identitas situs, email pengirim, menu, dan lisensi aplikasi.'),
          icon: SettingsIcon,
          children: [
            { href: '/settings/site', label: t('Situs'), icon: GlobeIcon },
            { href: '/settings/mail', label: t('Email'), icon: MailIcon },
            {
              key: 'folder.sistem',
              href: '/settings/menu',
              label: t('Sistem'),
              icon: ServerCogIcon,
              children: [
                { href: '/settings/menu', label: t('Menu'), icon: MenuIcon },
                { href: '/settings/license', label: t('License'), icon: BadgeCheckIcon },
              ],
            },
          ],
        },
        {
          key: 'folder.akun',
          href: '/settings/profile',
          label: t('Akun'),
          description: t('Kelola profil, keamanan, dan tampilan akun Anda.'),
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

  /** Keeps what the person may open; a folder left empty goes too (works at every level). */
  const prune = <T extends { href: string; children?: T[] }>(entries: T[]): T[] =>
    entries
      .map((entry) => (entry.children ? { ...entry, children: prune(entry.children) } : entry))
      .filter((entry) => (entry.children ? entry.children.length > 0 : allowed(entry.href)));

  return groups
    .map((group) => ({ ...group, items: prune(group.items) }))
    .filter((group) => group.items.length > 0);
}
