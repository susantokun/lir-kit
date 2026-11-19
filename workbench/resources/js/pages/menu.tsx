import { router } from '@inertiajs/react';
import { buildNav } from '@/config/nav';
import AppLayout from '@/layouts/app-layout';
import { PageHeader } from '@/lir-kit/layouts/page-header';
import { MenuEditor } from '@/lir-kit/menu-editor';

/** The menu editor. The real sidebar next to it is the preview: save and it changes at once. */
export default function Menu() {
    return (
        <AppLayout title="Menu">
            <PageHeader title="Menu" description="Ubah judul, ikon, urutan, dan sembunyikan entri sidebar; tambah tautan atau folder sendiri." />
            <MenuEditor base={buildNav()} onSaved={() => router.reload({ only: ['menuOverrides'] })} />
        </AppLayout>
    );
}
