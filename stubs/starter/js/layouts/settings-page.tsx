import type { ReactNode } from 'react';
import { PageActionsSlot } from '@/lir-kit/layouts/page-actions';
import { PageHeader } from '@/lir-kit/layouts/page-header';
import AppLayout from '@/layouts/app-layout';

/**
 * A page of the menu's folders (Akses, Pengaturan, Akun): the app frame, a page header (title, one line of help,
 * and the page's main buttons on the right: see PageActions) and the whole width for the content.
 */
export default function SettingsPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <AppLayout title={title}>
      <PageHeader
        title={title}
        description={description}
        actions={<PageActionsSlot />}
      />
      {children}
    </AppLayout>
  );
}
