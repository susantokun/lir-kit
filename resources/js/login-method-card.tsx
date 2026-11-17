import { useCallback, useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { ApiError, api, notify, t } from './adapters';

type Mode = 'password' | 'otp' | 'both';

type LoginMethod = {
  mode: Mode;
  length: number;
  ttl_minutes: number;
  max_attempts: number;
  resend_seconds: number;
  max_requests_per_hour: number;
  mail_ready: boolean;
};

const MODES: { value: Mode; label: string; hint: string }[] = [
  {
    value: 'password',
    label: 'Kata sandi saja',
    hint: 'Cara bawaan: email atau username dan kata sandi.',
  },
  {
    value: 'both',
    label: 'Kata sandi atau kode email',
    hint: 'Pengguna memilih sendiri. Disarankan saat mulai memakai kode email.',
  },
  {
    value: 'otp',
    label: 'Kode email saja (tanpa kata sandi)',
    hint: 'Pengguna cukup memasukkan email, lalu kode sekali pakai yang dikirim ke emailnya.',
  },
];

const NUMBERS: {
  key:
    | 'length'
    | 'ttl_minutes'
    | 'max_attempts'
    | 'resend_seconds'
    | 'max_requests_per_hour';
  label: string;
  hint: string;
  min: number;
  max: number;
}[] = [
  {
    key: 'length',
    label: 'Panjang kode (digit)',
    hint: '4 sampai 8 digit.',
    min: 4,
    max: 8,
  },
  {
    key: 'ttl_minutes',
    label: 'Masa berlaku kode (menit)',
    hint: 'Setelah ini kode tidak berlaku lagi. 1 sampai 30.',
    min: 1,
    max: 30,
  },
  {
    key: 'max_attempts',
    label: 'Batas salah memasukkan kode',
    hint: 'Kode hangus setelah salah sebanyak ini. 3 sampai 10.',
    min: 3,
    max: 10,
  },
  {
    key: 'resend_seconds',
    label: 'Jeda kirim ulang (detik)',
    hint: 'Waktu tunggu sebelum meminta kode baru. 30 sampai 300.',
    min: 30,
    max: 300,
  },
  {
    key: 'max_requests_per_hour',
    label: 'Maksimal permintaan kode per jam',
    hint: 'Per alamat email. 3 sampai 20.',
    min: 3,
    max: 20,
  },
];

/**
 * Superadmin's choice of how everyone signs in, and the rules of the emailed code. Applies to the whole installation.
 */
export function LoginMethodCard() {
  const [form, setForm] = useState<LoginMethod | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setForm(await api<LoginMethod>('/login-method'));
  }, []);

  useEffect(() => {
    void load().catch((e: ApiError) => notify(e.message, true));
  }, [load]);

  const save = async () => {
    if (!form) return;

    setSaving(true);
    try {
      setForm(
        await api<LoginMethod>('/login-method', {
          method: 'PUT',
          body: form,
        }),
      );
      notify(t('Metode masuk disimpan.'), false);
    } catch (e) {
      notify((e as ApiError).message, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Metode masuk')}</CardTitle>
        <CardDescription>
          {t(
            'Pilih cara pengguna masuk ke aplikasi dan atur aturan kode sekali pakai yang dikirim lewat email. Berlaku untuk seluruh aplikasi.',
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {form === null ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <FieldGroup>
            <RadioGroup
              value={form.mode}
              onValueChange={(mode) => setForm({ ...form, mode: mode as Mode })}
            >
              {MODES.map((m) => (
                <Field
                  key={m.value}
                  orientation="horizontal"
                  className="items-start"
                >
                  <RadioGroupItem id={`mode-${m.value}`} value={m.value} />
                  <div className="flex flex-col gap-0.5">
                    <FieldLabel htmlFor={`mode-${m.value}`}>
                      {t(m.label)}
                    </FieldLabel>
                    <FieldDescription>{t(m.hint)}</FieldDescription>
                  </div>
                </Field>
              ))}
            </RadioGroup>

            {form.mode !== 'password' && !form.mail_ready && (
              <Alert variant="destructive">
                <AlertDescription>
                  {t(
                    'Pengiriman email belum diatur, jadi kode tidak akan sampai. Isi dan aktifkan "Email pengirim" di halaman ini dulu.',
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div
              className={
                form.mode === 'password'
                  ? 'pointer-events-none opacity-50'
                  : 'grid gap-4 sm:grid-cols-2'
              }
            >
              {NUMBERS.map((n) => (
                <Field key={n.key}>
                  <FieldLabel htmlFor={`otp-${n.key}`}>{t(n.label)}</FieldLabel>
                  <Input
                    id={`otp-${n.key}`}
                    type="number"
                    inputMode="numeric"
                    min={n.min}
                    max={n.max}
                    value={form[n.key]}
                    disabled={form.mode === 'password'}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [n.key]: Number(e.target.value),
                      })
                    }
                  />
                  <FieldDescription>{t(n.hint)}</FieldDescription>
                </Field>
              ))}
            </div>

            <div>
              <Button onClick={save} disabled={saving}>
                {saving && <Spinner data-icon="inline-start" />}
                {t('Simpan metode masuk')}
              </Button>
            </div>
          </FieldGroup>
        )}
      </CardContent>
    </Card>
  );
}
