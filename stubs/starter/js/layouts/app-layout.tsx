import { usePage } from '@inertiajs/react';
import { PaletteIcon, ShieldCheckIcon, UserRoundIcon } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { t } from '@/lir-kit/adapters';
import { AppShell } from '@/lir-kit/layouts/app-shell';
import { applyMenu, type KitNavGroup, type MenuOverride } from '@/lir-kit/menu';
import type { ShellUser } from '@/lir-kit/shell/user-menu';
import { APP_NAME, APP_SUBTITLE } from '@/config/brand';
import { buildNav } from '@/config/nav';

type Shared = {
  auth: { user: ShellUser | null };
  menuOverrides?: MenuOverride[];
  /** From LirKit::permissions(); when the app does not share it, the whole menu shows. */
  permissions?: string[];
};

/**
 * The menu as the sidebar shows it: your built-in menu, cut down to what this person may open, with the changes
 * saved in the menu editor applied.
 */
export function useNavGroups(): KitNavGroup[] {
  const { menuOverrides, permissions } = usePage<Shared>().props;

  return useMemo(
    () => applyMenu(buildNav(permissions), menuOverrides ?? []),
    [menuOverrides, permissions],
  );
}

/**
 * The frame of every signed-in page. This file is yours: put the menu, the account links, a company switcher
 * (`sidebarHeader`), notifications (`headerActions`) or your toast host (`toaster`) here and every page follows.
 * Use it in a page as <AppLayout title="Dashboard">...</AppLayout>.
 */
export default function AppLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { auth } = usePage<Shared>().props;
  const groups = useNavGroups();

  return (
    <AppShell
      title={title}
      groups={groups}
      user={auth.user}
      brand={{ name: APP_NAME, subtitle: APP_SUBTITLE }}
      userLinks={[
        { label: t('Profil'), href: '/settings/profile', icon: UserRoundIcon },
        { label: t('Keamanan'), href: '/settings/security', icon: ShieldCheckIcon },
        { label: t('Tampilan'), href: '/settings/appearance', icon: PaletteIcon },
      ]}
    >
      {children}
    </AppShell>
  );
}
