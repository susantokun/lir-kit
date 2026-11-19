import { ChevronDownIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

/**
 * A card whose header (icon, title, one line of help, optional badge) opens and closes its body, closed by default.
 * Use it for secondary information that should not push the main content down.
 */
export function CollapsibleCard({
  title,
  description,
  badge,
  icon,
  defaultOpen = false,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} render={<Card className="gap-0 py-0" />}>
      <CollapsibleTrigger
        className={`flex w-full items-center gap-3 px-5 py-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${open ? 'rounded-t-xl bg-primary/8 hover:bg-primary/10' : 'rounded-xl hover:bg-muted/40'}`}
      >
        {icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            {icon}
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-medium">{title}</span>
          {description && (
            <span className="truncate text-sm text-muted-foreground">{description}</span>
          )}
        </span>
        {badge}
        <ChevronDownIcon
          className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-5 border-t px-5 py-5">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
