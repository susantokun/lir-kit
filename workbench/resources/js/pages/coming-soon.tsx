import { ConstructionIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { PageHeader } from '@/lir-kit/layouts/page-header';

/** A page the starter will fill in a later phase (users, roles) or that an app builds itself (reports). */
export default function ComingSoon({ title }: { title: string }) {
    return (
        <AppLayout title={title}>
            <PageHeader title={title} />
            <Card>
                <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                    <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <ConstructionIcon className="size-6" />
                    </span>
                    <p className="font-medium">Halaman ini belum ada</p>
                    <p className="max-w-sm text-sm text-muted-foreground">
                        Entri menunya hanya contoh agar sidebar tiga level, breadcrumb, dan pencarian bisa dicoba.
                    </p>
                </CardContent>
            </Card>
        </AppLayout>
    );
}
