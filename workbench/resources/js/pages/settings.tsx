import { PlaygroundLayout } from '@/components/playground-layout';
import { LoginCodeEmailCard } from '@lir-kit/login-code-email-card';
import { LoginMethodCard } from '@lir-kit/login-method-card';
import { MailSettingsCard } from '@lir-kit/mail-settings-card';

/** The three settings cards as an app places them: metode masuk + template on the left, email pengirim on the right. */
export default function Settings() {
    return (
        <PlaygroundLayout title="Pengaturan">
            <div className="grid items-start gap-6 lg:grid-cols-2">
                <div className="flex flex-col gap-6">
                    <LoginMethodCard />
                    <LoginCodeEmailCard />
                </div>
                <MailSettingsCard />
            </div>
        </PlaygroundLayout>
    );
}
