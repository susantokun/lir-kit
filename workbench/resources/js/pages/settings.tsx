import AppLayout from '@/layouts/app-layout';
import { PageHeader } from '@/lir-kit/layouts/page-header';
import { LoginCodeEmailCard } from '@/lir-kit/login-code-email-card';
import { LoginMethodCard } from '@/lir-kit/login-method-card';
import { MailSettingsCard } from '@/lir-kit/mail-settings-card';

/** The three settings cards as an app places them: metode masuk + template on the left, email pengirim on the right. */
export default function Settings() {
    return (
        <AppLayout title="Metode masuk & email">
            <PageHeader title="Metode masuk & email" description="Cara pengguna masuk dan email yang dikirim aplikasi." />
            <div className="grid items-start gap-6 lg:grid-cols-2">
                <div className="flex flex-col gap-6">
                    <LoginMethodCard />
                    <LoginCodeEmailCard />
                </div>
                <MailSettingsCard />
            </div>
        </AppLayout>
    );
}
