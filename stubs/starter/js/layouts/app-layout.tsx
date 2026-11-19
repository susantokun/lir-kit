import { usePage } from '@inertiajs/react';
import { PaletteIcon, ShieldCheckIcon, UserRoundIcon } from 'lucide-react';
import { useEffect, useMemo, type ReactNode } from 'react';
import { t } from '@/lir-kit/adapters';
import { AppShell } from '@/lir-kit/layouts/app-shell';
import { applyMenu, type KitNavGroup, type MenuOverride } from '@/lir-kit/menu';
import { LicenseBanner, type SharedLicense } from '@/lir-kit/shell/license-banner';
import type { ShellUser } from '@/lir-kit/shell/user-menu';
import { APP_NAME, APP_SUBTITLE } from '@/config/brand';
import { buildNav } from '@/config/nav';

type Shared = {
  auth: { user: ShellUser | null };
  /** From LirKit::site(): the name, logo and favicon saved in Pengaturan > Situs. Without it APP_NAME is used. */
  site?: { name: string; logo: string | null; favicon: string | null };
  /** From LirKit::license(): shows a strip when the license is about to expire or the app is read-only. */
  license?: SharedLicense;
  menuOverrides?: MenuOverride[];
  /** From LirKit::permissions(); when the app does not share it, the whole menu shows. */
  permissions?: string[];
  /** From LirKit::features(): the parts of the kit that are on; a page of a part that is off leaves the menu. */
  features?: Record<string, boolean>;
};

/**
 * The menu as the sidebar shows it: your built-in menu, cut down to what this person may open, with the changes
 * saved in the menu editor applied.
 */
export function useNavGroups(): KitNavGroup[] {
  const { menuOverrides, permissions, features } = usePage<Shared>().props;

  return useMemo(
    () => applyMenu(buildNav(permissions, features), menuOverrides ?? []),
    [menuOverrides, permissions, features],
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
  const { auth, site, license } = usePage<Shared>().props;
  const groups = useNavGroups();
  const favicon = site?.favicon ?? null;

  useEffect(() => {
    if (!favicon) {
      return;
    }

    const link =
      document.querySelector<HTMLLinkElement>('link[rel~="icon"]') ??
      document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'icon' }));
    link.href = favicon;
    link.removeAttribute('type');
  }, [favicon]);

  return (
    <AppShell
      title={title}
      groups={groups}
      user={auth.user}
      brand={{ name: site?.name ?? APP_NAME, subtitle: APP_SUBTITLE, logo: site?.logo ?? undefined }}
      userLinks={[
        { label: t('Profil'), href: '/settings/profile', icon: UserRoundIcon },
        { label: t('Keamanan'), href: '/settings/security', icon: ShieldCheckIcon },
        { label: t('Tampilan'), href: '/settings/appearance', icon: PaletteIcon },
      ]}
    >
      <LicenseBanner license={license} />
      {children}
    </AppShell>
  );
}
