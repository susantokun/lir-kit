import { cn } from '@/lib/utils';

/**
 * The logo tile. Pass `src` for your own logo (shown whole on a plain tile so any shape looks right);
 * without it a neutral mark in the theme's primary colour is drawn.
 */
export function BrandMark({
  src,
  className = 'size-8',
}: {
  src?: string | null;
  className?: string;
}) {
  if (src) {
    return (
      <span
        className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white p-0.5', className)}
      >
        <img src={src} alt="" className="size-full object-contain" />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={cn('flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground ring-1 ring-primary-foreground/20', className)}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-[60%]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 4v13a3 3 0 0 0 3 3h7" />
        <path d="M12 9l2.5 2.5L19 7" />
      </svg>
    </span>
  );
}
