import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Separator } from '@/components/ui/separator';
import { t } from '../adapters';
import type { KitNavGroup, KitNavLeaf } from '../menu';
import { leavesOf } from '../nav';
import { PageActionsSlot } from './page-actions';

type Section = { label: string; links: KitNavLeaf[] };

/** The side menu of the folder (level 1 entry) that holds the current page, split into its own pages and sub folders. */
function sectionsFor(groups: KitNavGroup[], path: string) {
  const inPath = (l: KitNavLeaf) =>
    path === l.href || path.startsWith(`${l.href}/`);
  const folders = groups
    .flatMap((group) => group.items)
    .filter((item) => item.children);
  const owner = folders.find((item) => leavesOf(item).some(inPath));

  if (!owner) {
    return {
      heading: undefined,
      headingDescription: undefined,
      sections: [] as Section[],
    };
  }

  const own = owner.children!.filter((c) => !c.children);
  const subFolders = owner.children!.filter((c) => c.children);
  const sections: Section[] = [
    { label: owner.label, links: own },
    ...subFolders.map((f) => ({ label: f.label, links: f.children! })),
  ]
    .map((s) => ({ ...s, links: s.links.filter((l) => !l.standalone) }))
    .filter((s) => s.links.length > 0);

  return {
    heading: owner.label,
    headingDescription: owner.description,
    sections,
  };
}

/**
 * Settings pages share one frame: a heading, a side menu on the left (the folder this page belongs to in your menu)
 * and a content column kept narrow enough to read. Pass the same `groups` you give the AppShell.
 */
export function SettingsLayout({
  groups,
  title,
  description,
  heading,
  children,
}: {
  groups: KitNavGroup[];
  title: string;
  description?: string;
  /** Overrides the big heading (it is the folder's name by default). */
  heading?: string;
  children: ReactNode;
}) {
  const path = usePage().url.split('?')[0];
  const found = sectionsFor(groups, path);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {heading ?? found.heading ?? t('Pengaturan')}
        </h1>
        {found.headingDescription && (
          <p className="text-sm text-muted-foreground">
            {found.headingDescription}
          </p>
        )}
      </div>
      <Separator />
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
        {found.sections.length > 0 && (
          <nav
            aria-label={t('Menu pengaturan')}
            className="flex shrink-0 [scrollbar-width:none] gap-6 overflow-x-auto lg:w-56 lg:flex-col lg:gap-5 lg:overflow-visible [&::-webkit-scrollbar]:hidden"
          >
            {found.sections.map((section) => {
              const best = [...section.links]
                .sort((a, b) => b.href.length - a.href.length)
                .find((l) => path === l.href || path.startsWith(`${l.href}/`));

              return (
                <div key={section.label} className="flex flex-col gap-1">
                  <span className="px-3 text-xs font-medium text-muted-foreground uppercase">
                    {section.label}
                  </span>
                  <ul className="flex gap-1 lg:flex-col">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors hover:bg-accent ${best?.href === link.href ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground'}`}
                        >
                          <link.icon className="size-4" />
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">{title}</h2>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            <PageActionsSlot />
          </div>
          <Separator />
          {children}
        </div>
      </div>
    </div>
  );
}
