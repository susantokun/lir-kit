import { router } from '@inertiajs/react';
import { CornerDownLeftIcon, SearchIcon, type LucideIcon } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { ScrollArea } from '@/components/ui/scroll-area';
import { t } from '../adapters';
import type { KitNavGroup } from '../menu';
import { flattenNav } from '../nav';

/** A result you add to the palette through `onSearch` (a record found on the server, for example). */
export type SearchHit = {
  key: string;
  section: string;
  title: string;
  subtitle?: string | null;
  href: string;
  icon: LucideIcon;
};

/** Wraps the matching part of a text in <mark> so people see why a result matched. */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  const at = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;

  if (at < 0) {
    return <>{text}</>;
  }

  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-sm bg-primary/15 text-foreground">
        {text.slice(at, at + q.length)}
      </mark>
      {text.slice(at + q.length)}
    </>
  );
}

/**
 * Ctrl/⌘ + K palette. It always finds pages of the sidebar menu; pass `onSearch` to add results from your server
 * (called after a short pause once the query has two or more characters).
 */
export function SearchDialog({
  groups,
  onSearch,
  placeholder,
}: {
  groups: KitNavGroup[];
  onSearch?: (query: string) => Promise<SearchHit[]>;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [remote, setRemote] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const q = query.trim();

    if (!onSearch || !open || q.length < 2) {
      setRemote([]);
      setLoading(false);

      return;
    }

    setLoading(true);
    const timer = window.setTimeout(() => {
      onSearch(q)
        .then(setRemote)
        .catch(() => setRemote([]))
        .finally(() => setLoading(false));
    }, 200);

    return () => window.clearTimeout(timer);
  }, [query, open, onSearch]);

  const entries = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    const pages: SearchHit[] = flattenNav(groups)
      .filter(
        (leaf) =>
          !q ||
          leaf.label.toLowerCase().includes(q) ||
          leaf.group.toLowerCase().includes(q),
      )
      .map((leaf) => ({
        key: `p-${leaf.group}-${leaf.href}`,
        section: t('Halaman'),
        title: leaf.label,
        subtitle: leaf.group,
        href: leaf.href,
        icon: leaf.icon,
      }));

    return [...remote, ...pages];
  }, [groups, query, remote]);

  const go = (href: string) => {
    setOpen(false);
    setQuery('');
    setRemote([]);

    if (/^https?:\/\//i.test(href)) {
      window.open(href, '_blank', 'noopener,noreferrer');
    } else {
      router.visit(href);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, entries.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && entries[active]) {
      go(entries[active].href);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        aria-label={t('Cari…')}
        className="h-9 shrink-0 justify-start gap-2 px-2.5 font-normal text-muted-foreground lg:w-72 lg:px-3"
        onClick={() => setOpen(true)}
      >
        <SearchIcon />
        <span className="hidden flex-1 text-left lg:inline">{t('Cari…')}</span>
        <Kbd className="hidden lg:inline-flex">{t('Ctrl K')}</Kbd>
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          setActive(0);
        }}
      >
        <DialogContent
          className="top-[20%] translate-y-0 gap-0 p-0 sm:max-w-xl"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">{t('Pencarian')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('Cari halaman lalu tekan Enter.')}
          </DialogDescription>
          <div className="flex h-12 items-center gap-3 border-b border-border/50 px-4">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              aria-label={t('Pencarian')}
              placeholder={placeholder ?? t('Cari halaman…')}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {loading && (
              <span className="text-xs text-muted-foreground">
                {t('Mencari…')}
              </span>
            )}
          </div>
          <ScrollArea className="max-h-[22rem]">
            <div className="flex flex-col gap-1 p-2">
              {entries.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {t('Tidak ada hasil untuk')} “{query}”.
                </p>
              )}
              {entries.map((entry, i) => (
                <Fragment key={entry.key}>
                  {(i === 0 || entries[i - 1].section !== entry.section) && (
                    <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                      {entry.section}
                    </p>
                  )}
                  <button
                    type="button"
                    onMouseMove={() => setActive(i)}
                    onClick={() => go(entry.href)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${i === active ? 'bg-accent text-accent-foreground' : ''}`}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <entry.icon className="size-4" />
                    </span>
                    <span className="grid min-w-0 flex-1">
                      <span className="truncate font-medium">
                        <Highlight text={entry.title} query={query} />
                      </span>
                      {entry.subtitle && (
                        <span className="truncate text-xs text-muted-foreground">
                          {entry.subtitle}
                        </span>
                      )}
                    </span>
                    {i === active && (
                      <CornerDownLeftIcon className="size-3.5 text-muted-foreground" />
                    )}
                  </button>
                </Fragment>
              ))}
            </div>
          </ScrollArea>
          <div className="flex items-center gap-3 border-t border-border/50 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> {t('pilih')}
            </span>
            <span className="flex items-center gap-1">
              <Kbd>{t('Enter')}</Kbd> {t('buka')}
            </span>
            <span className="flex items-center gap-1">
              <Kbd>{t('Esc')}</Kbd> {t('tutup')}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
