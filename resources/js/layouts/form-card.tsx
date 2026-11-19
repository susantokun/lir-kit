import type { FormEvent, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { t } from '../adapters';

/** Responsive field grid: one column on phones, two on wider screens. */
export function FormGrid({
  children,
  columns = 2,
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3;
}) {
  const cols =
    columns === 1
      ? ''
      : columns === 2
        ? 'sm:grid-cols-2'
        : 'sm:grid-cols-2 lg:grid-cols-3';

  return <div className={`grid gap-4 ${cols}`}>{children}</div>;
}

/**
 * A card that holds a form: header, fields, and a footer with the action buttons.
 * Spacing and the footer come from here, so they stay the same on every page.
 */
export function FormCard({
  title,
  description,
  children,
  submitLabel = t('Simpan'),
  onSubmit,
  busy = false,
  disabled = false,
  extraActions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  submitLabel?: string;
  onSubmit: () => void | Promise<unknown>;
  busy?: boolean;
  disabled?: boolean;
  extraActions?: ReactNode;
}) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSubmit();
  };

  return (
    <Card>
      <form onSubmit={submit} className="contents">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-5">{children}</CardContent>
        <CardFooter>
          <Button type="submit" disabled={busy || disabled}>
            {busy && <Spinner data-icon="inline-start" />}
            {submitLabel}
          </Button>
          {extraActions}
        </CardFooter>
      </form>
    </Card>
  );
}
