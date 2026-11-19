import { Head, Link, usePage } from '@inertiajs/react';
import { Fragment, type ReactNode } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { t } from '../adapters';
import type { KitNavGroup } from '../menu';
import { breadcrumbTrail } from '../nav';
import { AppSidebar, type ShellBrand } from '../shell/app-sidebar';
import { SearchDialog, type SearchHit } from '../shell/search-dialog';
import { ThemeToggle } from '../shell/theme-toggle';
import {
  LogoutConfirm,
  UserAvatar,
  UserMenuItems,
  type ShellUser,
  type UserMenuLink,
} from '../shell/user-menu';

/** Where this page is in the menu; every step but the last is a link back up. */
function PageCrumbs({
  groups,
  title,
}: {
  groups: KitNavGroup[];
  title: string;
}) {
  const path = usePage().url.split('?')[0];
  const trail = breadcrumbTrail(groups, path, title);

  return (
    <Breadcrumb className="min-w-0 flex-1">
      <BreadcrumbList className="flex-nowrap">
        {trail.map((crumb, i) => (
          <Fragment key={`${crumb.label}-${i}`}>
            {i > 0 && <BreadcrumbSeparator className="hidden lg:block" />}
            <BreadcrumbItem
              className={`min-w-0 ${i === trail.length - 1 ? '' : 'hidden lg:inline-flex'}`}
            >
              {i === trail.length - 1 ? (
                <BreadcrumbPage className="truncate">
                  {crumb.label}
                </BreadcrumbPage>
              ) : crumb.href ? (
                <BreadcrumbLink render={<Link href={crumb.href} />}>
                  {crumb.label}
                </BreadcrumbLink>
              ) : (
                <span className="truncate">{crumb.label}</span>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/**
 * The page frame: collapsible sidebar, top bar (sidebar switch, breadcrumb, search, theme, account) and content area.
 * It knows nothing about your app: you pass the menu, the user and the brand (see the starter's layouts/app-layout.tsx).
 */
export function AppShell({
  title,
  groups,
  user,
  brand,
  userLinks,
  userMenuExtra,
  headerActions,
  sidebarHeader,
  onSearch,
  onLogout,
  toaster,
  children,
}: {
  title: string;
  /** The menu, already run through applyMenu(). */
  groups: KitNavGroup[];
  user: ShellUser | null;
  brand: ShellBrand;
  /** Pages in the account menu (Profil, Keamanan, ...). */
  userLinks?: UserMenuLink[];
  /** Extra rows in the account menu, e.g. a language switch (DropdownMenuItem). */
  userMenuExtra?: ReactNode;
  /** Buttons between the theme switch and the account menu, e.g. notifications. */
  headerActions?: ReactNode;
  /** Replaces the brand block at the top of the sidebar, e.g. a company switcher. */
  sidebarHeader?: ReactNode;
  /** Adds results from your server to the search palette. */
  onSearch?: (query: string) => Promise<SearchHit[]>;
  onLogout?: () => void;
  /** Your toast host (render it here so notify() has somewhere to show). */
  toaster?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <Head title={title} />
      {toaster}
      <LogoutConfirm appName={brand.name} onLogout={onLogout} />
      <AppSidebar
        groups={groups}
        brand={brand}
        header={sidebarHeader}
        user={user}
        userLinks={userLinks}
        userMenuExtra={userMenuExtra}
      />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:px-6">
          <SidebarTrigger className="-ml-1" />
          <PageCrumbs groups={groups} title={title} />
          <div className="flex shrink-0 items-center gap-1">
            <SearchDialog groups={groups} onSearch={onSearch} />
            <ThemeToggle />
            {headerActions}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('Menu akun')}
                    className="rounded-full"
                  />
                }
              >
                <UserAvatar user={user} className="size-8" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52 p-1">
                <UserMenuItems user={user} links={userLinks}>
                  {userMenuExtra}
                </UserMenuItems>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main
          aria-label={title}
          className="flex w-full flex-1 flex-col gap-6 p-4 motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in motion-safe:slide-in-from-bottom-2 sm:p-6 lg:p-8"
        >
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
