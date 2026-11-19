import type { ReactNode } from 'react';
import { SettingsLayout } from '@/lir-kit/layouts/settings-layout';
import AppLayout, { useNavGroups } from '@/layouts/app-layout';

/** A settings page: the app frame, then the settings frame (side menu of the folder this page belongs to). */
export default function SettingsPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const groups = useNavGroups();

  return (
    <AppLayout title={title}>
      <SettingsLayout groups={groups} title={title} description={description}>
        {children}
      </SettingsLayout>
    </AppLayout>
  );
}
