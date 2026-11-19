import type { LucideIcon } from 'lucide-react';
import { InfoIcon, TriangleAlertIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { t } from '../adapters';

export type NoticeTone = 'info' | 'warning' | 'danger';

const TONES: Record<NoticeTone, { icon: LucideIcon; badge: string }> = {
  info: { icon: InfoIcon, badge: 'bg-primary/10 text-primary' },
  warning: {
    icon: TriangleAlertIcon,
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  },
  danger: {
    icon: TriangleAlertIcon,
    badge: 'bg-destructive/10 text-destructive',
  },
};

/**
 * The one look for every decision dialog (confirmations, conflicts): a coloured icon, a centred title and text,
 * and full-width stacked buttons. Only its buttons close it, never a click outside or Esc (unless `dismissible`).
 */
export function NoticeDialog({
  open = true,
  tone = 'info',
  icon,
  title,
  description,
  children,
  note,
  confirmLabel,
  cancelLabel = t('Batal'),
  busy = false,
  showCancel = true,
  onConfirm,
  onCancel,
  dismissible = false,
}: {
  open?: boolean;
  tone?: NoticeTone;
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode;
  note?: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  showCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  dismissible?: boolean;
}) {
  const style = TONES[tone];
  const Icon = icon ?? style.icon;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && dismissible && !busy && onCancel()}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader className="items-center gap-3 text-center">
          <span
            className={cn(
              'flex size-12 items-center justify-center rounded-full',
              style.badge,
            )}
          >
            <Icon className="size-6" />
          </span>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {children}

        {note && (
          <p className="text-center text-sm text-muted-foreground">{note}</p>
        )}

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          {showCancel && (
            <Button
              variant="outline"
              className="w-full sm:flex-1"
              disabled={busy}
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
          )}
          <Button
            variant={tone === 'danger' ? 'destructive' : 'default'}
            className="w-full sm:flex-1"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy && <Spinner data-icon="inline-start" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
