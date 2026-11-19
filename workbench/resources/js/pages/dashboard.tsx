import { ActivityIcon, FileTextIcon, UsersIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { PageHeader } from '@/lir-kit/layouts/page-header';

const STATS = [
    { label: 'Pengguna aktif', value: '128', icon: UsersIcon },
    { label: 'Laporan bulan ini', value: '42', icon: FileTextIcon },
    { label: 'Aktivitas hari ini', value: '1.204', icon: ActivityIcon },
];

/** A stand-in home page: the playground only needs something real-looking inside the frame. */
export default function Dashboard() {
    return (
        <AppLayout title="Dashboard">
            <PageHeader title="Dashboard" description="Ringkasan contoh. Ganti dengan halaman utama aplikasi Anda." />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {STATS.map(({ label, value, icon: Icon }) => (
                    <Card key={label}>
                        <CardHeader>
                            <CardDescription className="flex items-center justify-between">
                                {label}
                                <Icon className="size-4" />
                            </CardDescription>
                            <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
                        </CardHeader>
                    </Card>
                ))}
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Mulai dari sini</CardTitle>
                    <CardDescription>
                        Coba ciutkan sidebar, tekan Ctrl K untuk mencari, ganti tema, atau perkecil jendela untuk tampilan ponsel.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                    Halaman ini, menu, dan layout adalah milik playground; yang tampil di sekelilingnya (sidebar, bilah atas, halaman masuk) adalah
                    kit starter apa adanya.
                </CardContent>
            </Card>
        </AppLayout>
    );
}
