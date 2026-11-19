import { usePage } from '@inertiajs/react';
import { SettingsIcon } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { t } from '@/lir-kit/adapters';
import { AppShell } from '@/lir-kit/layouts/app-shell';
import { applyMenu, type MenuOverride } from '@/lir-kit/menu';
import type { ShellUser } from '@/lir-kit/shell/user-menu';
import { APP_NAME, APP_SUBTITLE } from '@/config/brand';
import { buildNav } from '@/config/nav';

type Shared = {
  auth: { user: ShellUser | null };
  menuOverrides?: MenuOverride[];
};

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
  const { auth, menuOverrides } = usePage<Shared>().props;
  const groups = useMemo(
    () => applyMenu(buildNav(), menuOverrides ?? []),
    [menuOverrides],
  );

  return (
    <AppShell
      title={title}
      groups={groups}
      user={auth.user}
      brand={{ name: APP_NAME, subtitle: APP_SUBTITLE }}
      userLinks={[
        { label: t('Pengaturan'), href: '/settings', icon: SettingsIcon },
      ]}
    >
      {children}
    </AppShell>
  );
}
