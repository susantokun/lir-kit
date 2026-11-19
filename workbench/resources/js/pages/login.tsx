import { useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { PlaygroundLayout } from '@/components/playground-layout';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { OtpLoginForm } from '@lir-kit/otp-login-form';

type Props = {
    demoEmail: string;
    loginMode: 'password' | 'otp' | 'both';
    otpEmail: string | null;
    otpLength: number;
    resendIn: number;
    devCode: string | null;
};

/**
 * How an app's own login page uses the kit: the password form, the emailed-code form, or a switch between them,
 * following the mode the administrator chose (Pengaturan > Metode masuk).
 */
export default function Login({ demoEmail, loginMode, otpEmail, otpLength, resendIn, devCode }: Props) {
    const { status } = usePage<{ status?: string | null }>().props;
    const form = useForm({ email: demoEmail, password: 'password' });
    const [chooseOtp, setChooseOtp] = useState(false);
    const showOtp = loginMode === 'otp' || (loginMode === 'both' && (chooseOtp || !!otpEmail));

    return (
        <PlaygroundLayout title="Masuk">
            <div className="mx-auto flex max-w-sm flex-col gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">Masuk</h1>
                    <p className="text-sm text-muted-foreground">
                        Mode saat ini: <b>{loginMode}</b>. Akun demo: <code>{demoEmail}</code> (kata sandi{' '}
                        <code>password</code>). Kode OTP ditampilkan di halaman ini selama APP_ENV=local.
                    </p>
                </div>

                {status && (
                    <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
                        {status}
                    </div>
                )}

                {showOtp ? (
                    <>
                        <OtpLoginForm otpEmail={otpEmail} length={otpLength} resendIn={resendIn} devCode={devCode} />
                        {loginMode === 'both' && !otpEmail && (
                            <Button variant="link" onClick={() => setChooseOtp(false)}>
                                Masuk dengan kata sandi
                            </Button>
                        )}
                    </>
                ) : (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post('/login');
                        }}
                    >
                        <FieldGroup>
                            <Field data-invalid={!!form.errors.email}>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input
                                    id="email"
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                />
                                {form.errors.email && <FieldError>{form.errors.email}</FieldError>}
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="password">Kata sandi</FieldLabel>
                                <Input
                                    id="password"
                                    type="password"
                                    value={form.data.password}
                                    onChange={(e) => form.setData('password', e.target.value)}
                                />
                            </Field>
                            <Button type="submit" disabled={form.processing}>
                                Masuk
                            </Button>
                            {loginMode === 'both' && (
                                <Button type="button" variant="outline" onClick={() => setChooseOtp(true)}>
                                    Masuk dengan kode email
                                </Button>
                            )}
                        </FieldGroup>
                    </form>
                )}
            </div>
        </PlaygroundLayout>
    );
}
