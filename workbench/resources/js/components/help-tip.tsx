import { CircleHelpIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * A small "?" icon that shows an explanation in a tooltip when clicked (and closes on a second click,
 * a click elsewhere, or Esc). It replaces helper text under form fields so forms stay short.
 */
export function HelpTip({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Tooltip
            open={open}
            onOpenChange={(next, details) => {
                // Only a click opens it; hover and focus do not, and clicks elsewhere or Esc close it.
                const reason = details?.reason as string | undefined;

                if (
                    !next ||
                    reason === 'outside-press' ||
                    reason === 'escape-key'
                ) {
                    setOpen(next);
                }
            }}
        >
            <TooltipTrigger
                closeOnClick={false}
                render={
                    <button
                        type="button"
                        aria-label={t('Bantuan')}
                        aria-expanded={open}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpen((o) => !o);
                        }}
                        className={cn(
                            'inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                            open && 'bg-muted text-foreground',
                            className,
                        )}
                    />
                }
            >
                <CircleHelpIcon className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent
                side="top"
                className="max-w-72 text-left leading-relaxed text-pretty"
            >
                {children}
            </TooltipContent>
        </Tooltip>
    );
}
