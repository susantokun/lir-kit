import { Link, router, usePage } from '@inertiajs/react';
import { CheckIcon, ChevronRightIcon, ChevronsUpDownIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { t } from '../adapters';
import type {
  KitNavGroup,
  KitNavItem,
  KitNavLeaf,
  KitNavSub,
} from '../menu';
import { leavesOf } from '../nav';
import { BrandMark } from './brand-mark';
import {
  UserAvatar,
  UserMenuItems,
  type ShellUser,
  type UserMenuLink,
} from './user-menu';

/** The app's name block at the top of the sidebar. */
export type ShellBrand = {
  name: string;
  subtitle?: string;
  logo?: string | null;
};

/** A page of the app is an Inertia visit; a link someone added to another site is a plain anchor. */
function linkFor(leaf: KitNavLeaf) {
  return leaf.newTab || leaf.external ? (
    <a
      href={leaf.href}
      target={leaf.newTab ? '_blank' : undefined}
      rel="noopener noreferrer"
    />
  ) : (
    <Link href={leaf.href} />
  );
}

function openLeaf(leaf: KitNavLeaf): void {
  if (leaf.newTab) {
    window.open(leaf.href, '_blank', 'noopener,noreferrer');
  } else if (leaf.external) {
    window.location.href = leaf.href;
  } else {
    router.visit(leaf.href);
  }
}

function isActive(path: string, href: string, exact = false): boolean {
  return exact ? path === href : path === href || path.startsWith(`${href}/`);
}

/** The count pill beside a menu entry, so a waiting item is noticed without opening the page. */
function CountBadge({
  count,
  className = '',
}: {
  count?: number;
  className?: string;
}) {
  if (!count) {
    return null;
  }

  return (
    <span
      aria-label={t('{n} menunggu', { n: count })}
      className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground tabular-nums ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function NavEntry({ item, path }: { item: KitNavItem; path: string }) {
  const { state, isMobile } = useSidebar();

  if (!item.children) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={isActive(path, item.href)}
          tooltip={item.label}
          render={linkFor(item)}
        >
          <item.icon />
          <span>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  const best = [...leavesOf(item)]
    .sort((a, b) => b.href.length - a.href.length)
    .find((c) => isActive(path, c.href));
  const open = best !== undefined;

  // Collapsed to icons: the children open in a pop-up menu beside the icon.
  if (state === 'collapsed' && !isMobile) {
    const row = (child: KitNavLeaf) => (
      <DropdownMenuItem
        key={child.key ?? child.href}
        onClick={() => openLeaf(child)}
      >
        {best?.href === child.href && (
          <CheckIcon className="text-muted-foreground" />
        )}
        {child.label}
        <CountBadge count={child.badge} className="ml-auto" />
      </DropdownMenuItem>
    );

    return (
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton tooltip={item.label} isActive={open} />}
          >
            <item.icon />
            <span>{item.label}</span>
            {item.badge ? (
              <span className="absolute top-1 right-1 size-2 rounded-full bg-primary ring-2 ring-sidebar" />
            ) : null}
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="min-w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{item.label}</DropdownMenuLabel>
              {item.children.filter((child) => !child.children).map(row)}
            </DropdownMenuGroup>
            {item.children
              .filter((child) => child.children)
              .map((folder) => (
                <DropdownMenuGroup key={folder.key ?? folder.label}>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>{folder.label}</DropdownMenuLabel>
                  {folder.children!.map(row)}
                </DropdownMenuGroup>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible
      defaultOpen={open}
      className="group/collapsible"
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger render={<SidebarMenuButton tooltip={item.label} />}>
        <item.icon />
        <span>{item.label}</span>
        <CountBadge count={item.badge} className="ml-auto" />
        <ChevronRightIcon
          className={`transition-transform duration-200 group-data-open/collapsible:rotate-90 ${item.badge ? '' : 'ml-auto'}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.children.map((child) =>
            child.children ? (
              <NavFolder
                key={child.key ?? child.label}
                folder={child}
                activeHref={best?.href}
              />
            ) : (
              <SidebarMenuSubItem key={child.key ?? child.href}>
                <SidebarMenuSubButton
                  isActive={best?.href === child.href}
                  render={linkFor(child)}
                >
                  <span>{child.label}</span>
                  <CountBadge count={child.badge} className="ml-auto" />
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ),
          )}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** The third level: a folder inside a menu entry, open when the current page is one of its pages. */
function NavFolder({
  folder,
  activeHref,
}: {
  folder: KitNavSub;
  activeHref?: string;
}) {
  const leaves = folder.children ?? [];

  return (
    <Collapsible
      defaultOpen={leaves.some((leaf) => leaf.href === activeHref)}
      className="group/folder"
      render={<SidebarMenuSubItem />}
    >
      <CollapsibleTrigger
        render={
          <SidebarMenuSubButton
            className="w-full text-left"
            render={<button type="button" />}
          />
        }
      >
        <span>{folder.label}</span>
        <CountBadge count={folder.badge} className="ml-auto" />
        <ChevronRightIcon
          className={`transition-transform duration-200 group-data-open/folder:rotate-90 ${folder.badge ? '' : 'ml-auto'}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub className="mx-2.5 px-2">
          {leaves.map((leaf) => (
            <SidebarMenuSubItem key={leaf.key ?? leaf.href}>
              <SidebarMenuSubButton
                isActive={activeHref === leaf.href}
                render={linkFor(leaf)}
              >
                <span>{leaf.label}</span>
                <CountBadge count={leaf.badge} className="ml-auto" />
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** The app's name and logo; `children` replaces it entirely (a company switcher, for example). */
function BrandHeader({ brand }: { brand: ShellBrand }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          tooltip={brand.name}
          render={<Link href="/" />}
        >
          <BrandMark src={brand.logo} className="size-8" />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{brand.name}</span>
            {brand.subtitle && (
              <span className="truncate text-xs text-muted-foreground">
                {brand.subtitle}
              </span>
            )}
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function NavUser({
  user,
  links,
  menuExtra,
}: {
  user: ShellUser | null;
  links?: UserMenuLink[];
  menuExtra?: ReactNode;
}) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent"
              />
            }
          >
            <UserAvatar user={user} className="size-8 rounded-lg" />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user?.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user?.email}
              </span>
            </div>
            <ChevronsUpDownIcon className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="min-w-52 p-1">
            <UserMenuItems user={user} links={links}>
              {menuExtra}
            </UserMenuItems>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/**
 * The collapsible sidebar: brand (or your own `header`), the menu in up to three levels, and the account block.
 * Collapses to icons on desktop and slides in as a sheet on mobile.
 */
export function AppSidebar({
  groups,
  brand,
  header,
  user,
  userLinks,
  userMenuExtra,
}: {
  groups: KitNavGroup[];
  brand: ShellBrand;
  header?: ReactNode;
  user: ShellUser | null;
  userLinks?: UserMenuLink[];
  userMenuExtra?: ReactNode;
}) {
  const path = usePage().url.split('?')[0];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>{header ?? <BrandHeader brand={brand} />}</SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.key}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <NavEntry key={item.key ?? item.label} item={item} path={path} />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} links={userLinks} menuExtra={userMenuExtra} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
