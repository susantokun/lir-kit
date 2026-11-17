import { FolderIcon, LinkIcon, type LucideIcon } from 'lucide-react';
import { MENU_ICONS } from './menu-icons';

/**
 * Arranging a sidebar with the changes saved by the menu editor. Your own nav code builds the built-in menu as
 * KitNavGroup[]; run it through applyMenu() to get what the sidebar should show.
 */
export type KitNavLeaf = {
  key?: string;
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  standalone?: boolean;
  newTab?: boolean;
  external?: boolean;
};
export type KitNavSub = KitNavLeaf & { children?: KitNavLeaf[] };
export type KitNavItem = KitNavLeaf & { children?: KitNavSub[] };
export type KitNavGroup = { key: string; label: string; items: KitNavItem[] };

/** Entries that cannot be hidden (set the same list in config 'lir-kit.menu_locked'). */
export let lockedKeys: string[] = [];
export const setLockedKeys = (keys: string[]) => {
  lockedKeys = keys;
};

/** A tenant's change to one entry, or an entry of its own (key starts with "custom."). */
export type MenuOverride = {
  key: string;
  title: string | null;
  icon: string | null;
  is_visible: boolean;
  order_column: number | null;
  parent_key: string | null;
  kind: 'link' | 'folder' | null;
  url: string | null;
  new_tab: boolean;
};

/** A menu entry with everything the editor needs to show and change it. */
export type ArrNode = {
  key: string;
  label: string;
  defaultLabel: string;
  icon: LucideIcon;
  iconName: string | null;
  href: string;
  badge?: number;
  standalone?: boolean;
  custom: boolean;
  kind: 'link' | 'folder' | null;
  url: string;
  newTab: boolean;
  hidden: boolean;
  locked: boolean;
  children?: ArrNode[];
};
export type ArrGroup = {
  key: string;
  label: string;
  defaultLabel: string;
  hidden: boolean;
  items: ArrNode[];
};

type Source = KitNavLeaf & { children?: Source[] };

type Defaults = {
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: number;
  standalone?: boolean;
  custom?: boolean;
  kind?: 'link' | 'folder' | null;
  url?: string;
  newTab?: boolean;
};

/**
 * The built-in menu with a tenant's changes laid over it: titles, icons and order applied, hidden entries kept
 * (flagged) and the tenant's own links and folders added where it put them. The editor works on this tree;
 * the sidebar uses visibleNav() of it.
 */
export function arrangeNav(
  groups: KitNavGroup[],
  overrides: MenuOverride[],
): ArrGroup[] {
  const byKey = new Map(overrides.map((o) => [o.key, o]));
  const customsUnder = (parent: string) =>
    overrides.filter(
      (o) => o.parent_key === parent && o.key.startsWith('custom.'),
    );
  const sortByOrder = <T extends { order: number }>(rows: T[]) =>
    [...rows].sort((a, b) => a.order - b.order);

  const make = (
    key: string,
    defaults: Defaults,
    position: number,
    depth: number,
    childSources: Source[] | undefined,
  ): { node: ArrNode; order: number } => {
    const ov = byKey.get(key);
    const locked = lockedKeys.includes(key);
    const kids = childSources
      ? childSources.map((c, i) => fromSource(c, i, depth + 1))
      : defaults.kind === 'folder'
        ? []
        : undefined;
    const customKids =
      kids !== undefined && depth < 3
        ? customsUnder(key).map((o, i) => fromCustom(o, 5000 + i, depth + 1))
        : [];
    const children =
      kids === undefined
        ? undefined
        : sortByOrder([...kids, ...customKids]).map((k) => k.node);
    const iconName = ov?.icon && MENU_ICONS[ov.icon] ? ov.icon : null;

    return {
      order: ov?.order_column ?? position,
      node: {
        key,
        label: ov?.title || defaults.label,
        defaultLabel: defaults.label,
        icon: iconName ? MENU_ICONS[iconName] : defaults.icon,
        iconName,
        href: defaults.href,
        badge: defaults.badge,
        standalone: defaults.standalone,
        custom: defaults.custom ?? false,
        kind: defaults.kind ?? null,
        url: defaults.url ?? '',
        newTab: defaults.newTab ?? false,
        hidden: ov !== undefined && !ov.is_visible && !locked,
        locked,
        children,
      },
    };
  };

  const fromSource = (
    src: Source,
    position: number,
    depth: number,
  ): { node: ArrNode; order: number } =>
    make(src.key ?? src.href, src, position, depth, src.children);

  const fromCustom = (
    o: MenuOverride,
    position: number,
    depth: number,
  ): { node: ArrNode; order: number } =>
    make(
      o.key,
      {
        label: o.title ?? '',
        icon: o.kind === 'folder' ? FolderIcon : LinkIcon,
        href: o.url ?? '#',
        custom: true,
        kind: o.kind,
        url: o.url ?? '',
        newTab: o.new_tab,
      },
      position,
      depth,
      undefined,
    );

  return sortByOrder(
    groups.map((group, i) => {
      const ov = byKey.get(group.key);
      const kids = group.items.map((item, n) => fromSource(item, n, 1));
      const customKids = customsUnder(group.key).map((o, n) =>
        fromCustom(o, 5000 + n, 1),
      );
      const arranged: ArrGroup = {
        key: group.key,
        label: ov?.title || group.label,
        defaultLabel: group.label,
        hidden: ov !== undefined && !ov.is_visible,
        items: sortByOrder([...kids, ...customKids]).map((k) => k.node),
      };

      return { order: ov?.order_column ?? i, group: arranged };
    }),
  ).map((g) => g.group);
}

/** What the sidebar shows: hidden entries gone, folders left empty gone, each folder opening at its first page. */
export function visibleNav(tree: ArrGroup[]): KitNavGroup[] {
  const toLeaf = (n: ArrNode): KitNavItem | null => {
    if (n.hidden) {
      return null;
    }

    const base: KitNavItem = {
      key: n.key,
      href: n.href,
      label: n.label,
      icon: n.icon,
      badge: n.badge,
      standalone: n.standalone,
      newTab: n.newTab || undefined,
      external: /^https?:\/\//i.test(n.href) || undefined,
    };

    if (n.children === undefined) {
      return base;
    }

    const children = n.children
      .map(toLeaf)
      .filter((c): c is KitNavItem => c !== null);

    if (children.length === 0) {
      return null;
    }

    const first = (c: KitNavItem): string => c.children?.[0]?.href ?? c.href;

    return { ...base, href: first(children[0]), children };
  };

  return tree
    .filter((g) => !g.hidden)
    .map((g) => ({
      key: g.key,
      label: g.label,
      items: g.items.map(toLeaf).filter((i): i is KitNavItem => i !== null),
    }))
    .filter((g) => g.items.length > 0);
}

/** The editor's tree back into the rows the server stores: one per entry, in order. */
export function overridesFromTree(tree: ArrGroup[]): MenuOverride[] {
  const rows: MenuOverride[] = [];

  const walk = (nodes: ArrNode[], parent: string) =>
    nodes.forEach((n, i) => {
      rows.push({
        key: n.key,
        title: n.custom || n.label !== n.defaultLabel ? n.label : null,
        icon: n.iconName,
        is_visible: !n.hidden,
        order_column: i,
        parent_key: n.custom ? parent : null,
        kind: n.custom ? n.kind : null,
        url: n.custom && n.kind === 'link' ? n.url : null,
        new_tab: n.custom && n.kind === 'link' ? n.newTab : false,
      });

      if (n.children) {
        walk(n.children, n.key);
      }
    });

  tree.forEach((g, i) => {
    rows.push({
      key: g.key,
      title: g.label !== g.defaultLabel ? g.label : null,
      icon: null,
      is_visible: !g.hidden,
      order_column: i,
      parent_key: null,
      kind: null,
      url: null,
      new_tab: false,
    });
    walk(g.items, g.key);
  });

  return rows;
}

/** Built-in menu + saved changes → what the sidebar shows. Returns the menu untouched when nothing is saved. */
export function applyMenu(
  groups: KitNavGroup[],
  overrides: MenuOverride[],
): KitNavGroup[] {
  return overrides.length > 0
    ? visibleNav(arrangeNav(groups, overrides))
    : groups;
}
