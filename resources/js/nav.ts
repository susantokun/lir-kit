import type { KitNavGroup, KitNavLeaf } from './menu';

/** One step of a breadcrumb; every step but the last can link back up. */
export type Crumb = { label: string; href?: string };

/** A page entry with the group it sits in, for the search palette. */
export type FlatLeaf = KitNavLeaf & { group: string };

/** Every page under a level 1 entry, whatever the depth, in menu order. */
export function leavesOf(item: KitNavGroup['items'][number]): KitNavLeaf[] {
  return (item.children ?? []).flatMap((child) => child.children ?? [child]);
}

/**
 * Where the current page sits in the menu, e.g. Pengaturan › Akses › Pengguna.
 * A page that is not in the menu (a record's detail) hangs under the menu page it belongs to.
 */
export function breadcrumbTrail(
  groups: KitNavGroup[],
  path: string,
  title: string,
): Crumb[] {
  const found = groups
    .flatMap((group) => group.items)
    .flatMap((item): { trail: Crumb[]; leaf: KitNavLeaf }[] => {
      if (!item.children) {
        return [{ trail: [], leaf: item }];
      }

      return item.children.flatMap((child) =>
        child.children
          ? child.children.map((leaf) => ({
              trail: [{ label: item.label }, { label: child.label }],
              leaf,
            }))
          : [{ trail: [{ label: item.label }], leaf: child }],
      );
    })
    .filter(
      ({ leaf }) => path === leaf.href || path.startsWith(`${leaf.href}/`),
    )
    .sort((a, b) => b.leaf.href.length - a.leaf.href.length)[0];

  if (!found) {
    return [{ label: title }];
  }

  if (found.leaf.href === path) {
    return [...found.trail, { label: found.leaf.label }];
  }

  return [
    ...found.trail,
    { label: found.leaf.label, href: found.leaf.href },
    { label: title },
  ];
}

/** Flat list of every page, for the search palette. */
export function flattenNav(groups: KitNavGroup[]): FlatLeaf[] {
  return groups.flatMap((group) =>
    group.items.flatMap((item) => {
      if (!item.children) {
        return [{ ...item, group: group.label }];
      }

      return item.children.flatMap((child) =>
        (child.children ?? [child]).map((leaf) => ({
          ...leaf,
          group: child.children
            ? `${item.label} · ${child.label}`
            : `${group.label} · ${item.label}`,
        })),
      );
    }),
  );
}
