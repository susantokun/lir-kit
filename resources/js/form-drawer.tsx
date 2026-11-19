import type { FormEvent, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { t } from './adapters';

/**
 * A form in a drawer that slides in from the right (shadcn Sheet): title, fields that scroll when long, and
 * Cancel / Submit pinned at the bottom. Same props as FormDialog; use it for forms with more than a few fields.
 */
export function FormDrawer({
  open,
  onClose,
  title,
  description,
  children,
  onSubmit,
  submitLabel = t('Simpan'),
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit: () => void | Promise<unknown>;
  submitLabel?: string;
  busy?: boolean;
}) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSubmit();
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="w-full data-[side=right]:sm:max-w-lg">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <SheetHeader className="border-b pr-12">
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            {children}
          </div>
          <SheetFooter className="flex-row justify-end border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Batal')}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Spinner data-icon="inline-start" />}
              {submitLabel}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
