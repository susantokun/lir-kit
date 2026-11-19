import { Head } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { BrandMark } from '../shell/brand-mark';

/** Entrance animation for each block of an auth page; give blocks a growing delay with enter(). */
export const enter = (delay: number) => ({ animationDelay: `${delay}ms` });
export const ENTER =
  'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700 motion-safe:fill-mode-backwards';

/** What the branded left panel says: a headline, a tagline, up to three selling points, and a closing line. */
export type AuthBrand = {
  name: string;
  logo?: string | null;
  headline: string;
  tagline?: string;
  points?: { icon: LucideIcon; text: string }[];
  footer?: string;
};

/**
 * The sign-in frame: a branded panel on the left (hidden on small screens, where the brand sits above the form)
 * and the form on the right. Every auth page of the starter uses it, so the whole flow looks the same.
 */
export function AuthSplitLayout({
  brand,
  title,
  children,
}: {
  brand: AuthBrand;
  /** The browser tab title. */
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <Head title={title} />
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <aside className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:22px_22px] opacity-15"
          />
          <div
            aria-hidden
            className="animate-float-slow pointer-events-none absolute -top-24 -right-16 size-96 rounded-full bg-white/15 blur-3xl"
          />
          <div
            aria-hidden
            className="animate-float-slower pointer-events-none absolute -bottom-32 -left-20 size-[28rem] rounded-full bg-black/20 blur-3xl"
          />

          <div
            className={`relative flex items-center gap-2.5 text-lg font-semibold ${ENTER}`}
          >
            <BrandMark
              src={brand.logo}
              className="size-9 bg-primary-foreground text-primary"
            />
            {brand.name}
          </div>

          <div className="relative flex max-w-lg flex-col gap-8">
            <div className={`flex flex-col gap-3 ${ENTER}`} style={enter(120)}>
              <h2 className="text-4xl leading-tight font-semibold">
                {brand.headline}
              </h2>
              {brand.tagline && (
                <p className="text-base text-primary-foreground/75">
                  {brand.tagline}
                </p>
              )}
            </div>
            {brand.points && brand.points.length > 0 && (
              <ul className="flex flex-col gap-4">
                {brand.points.map(({ icon: Icon, text }, i) => (
                  <li
                    key={text}
                    className={`flex items-center gap-3 text-sm ${ENTER}`}
                    style={enter(280 + i * 120)}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15 ring-1 ring-primary-foreground/20">
                      <Icon className="size-4" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p
            className={`relative text-xs text-primary-foreground/60 ${ENTER}`}
            style={enter(700)}
          >
            {brand.footer}
          </p>
        </aside>

        <main className="flex items-center justify-center bg-muted/40 p-4 sm:p-10 lg:bg-background">
          <div className="flex w-full max-w-md flex-col gap-7 rounded-2xl border bg-card p-7 shadow-sm sm:p-9 lg:max-w-sm lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            <div
              className={`flex items-center gap-3 text-lg font-semibold lg:hidden ${ENTER}`}
            >
              <BrandMark src={brand.logo} className="size-9" />
              {brand.name}
            </div>
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
