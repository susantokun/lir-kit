import { useEffect, useState } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { ApiError, api, notify, t } from './adapters';
import { SearchSelect } from './search-select';

type Mail = {
  enabled: boolean;
  host: string;
  port: number;
  encryption: 'tls' | 'ssl' | 'none';
  username: string;
  from_address: string;
  from_name: string;
  has_password: boolean;
};

/**
 * The SMTP server and sender address for every email the app sends. Off, the server's .env values stay in charge.
 */
export function MailSettingsCard() {
  const [form, setForm] = useState<(Mail & { password: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; pesan: string } | null>(
    null,
  );

  useEffect(() => {
    api<Mail>('/mail-settings')
      .then((m) => setForm({ ...m, password: '' }))
      .catch((e: ApiError) => notify(e.message, true));
  }, []);

  const set = <K extends keyof Mail | 'password'>(
    key: K,
    value: (Mail & { password: string })[K],
  ) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async () => {
    if (!form) return;

    setSaving(true);
    try {
      const saved = await api<Mail>('/mail-settings', {
        method: 'PUT',
        body: form,
      });
      setForm({ ...saved, password: '' });
      notify(t('Pengaturan email disimpan.'), false);
    } catch (e) {
      notify((e as ApiError).message, true);
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setResult(null);
    try {
      setResult(
        await api<{ ok: boolean; pesan: string }>('/mail-settings/test', {
          method: 'POST',
          body: { to: testTo },
        }),
      );
    } catch (e) {
      setResult({ ok: false, pesan: (e as ApiError).message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Email pengirim')}</CardTitle>
        <CardDescription>
          {t(
            'Server SMTP dan alamat pengirim untuk semua email aplikasi: kode masuk, atur ulang kata sandi, dan notifikasi. Bila dimatikan, pengaturan MAIL_* di server yang dipakai.',
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {form === null ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <FieldGroup>
            <Field orientation="horizontal">
              <Switch
                id="mail-enabled"
                checked={form.enabled}
                onCheckedChange={(on) => set('enabled', on)}
              />
              <FieldLabel htmlFor="mail-enabled">
                {t('Pakai server email ini')}
              </FieldLabel>
            </Field>

            <div className="grid gap-4 2xl:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="mail-host">{t('Server SMTP')}</FieldLabel>
                <Input
                  id="mail-host"
                  placeholder="smtp.perusahaan.co.id"
                  value={form.host}
                  onChange={(e) => set('host', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="mail-port">{t('Port')}</FieldLabel>
                <Input
                  id="mail-port"
                  type="number"
                  min={1}
                  max={65535}
                  value={form.port}
                  onChange={(e) => set('port', Number(e.target.value))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="mail-encryption">
                  {t('Enkripsi')}
                </FieldLabel>
                <SearchSelect
                  id="mail-encryption"
                  value={form.encryption}
                  onChange={(v) => set('encryption', v as Mail['encryption'])}
                  options={[
                    { value: 'tls', label: t('TLS / STARTTLS (port 587)') },
                    { value: 'ssl', label: t('SSL (port 465)') },
                    { value: 'none', label: t('Tanpa enkripsi') },
                  ]}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="mail-username">{t('Username')}</FieldLabel>
                <Input
                  id="mail-username"
                  autoComplete="off"
                  value={form.username}
                  onChange={(e) => set('username', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="mail-password">
                  {t('Kata sandi SMTP')}
                </FieldLabel>
                <Input
                  id="mail-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={form.has_password ? '••••••••' : ''}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                />
                <FieldDescription>
                  {t(
                    'Kosongkan untuk memakai kata sandi yang sudah tersimpan.',
                  )}
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="mail-from">
                  {t('Alamat pengirim')}
                </FieldLabel>
                <Input
                  id="mail-from"
                  type="email"
                  placeholder="no-reply@perusahaan.co.id"
                  value={form.from_address}
                  onChange={(e) => set('from_address', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="mail-from-name">
                  {t('Nama pengirim')}
                </FieldLabel>
                <Input
                  id="mail-from-name"
                  value={form.from_name}
                  onChange={(e) => set('from_name', e.target.value)}
                />
              </Field>
            </div>

            <div>
              <Button onClick={save} disabled={saving}>
                {saving && <Spinner data-icon="inline-start" />}
                {t('Simpan pengaturan email')}
              </Button>
            </div>

            <div className="flex flex-col gap-2 border-t pt-4">
              <FieldLabel htmlFor="mail-test">
                {t('Kirim email uji')}
              </FieldLabel>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="mail-test"
                  type="email"
                  className="max-w-xs"
                  placeholder={t('email@tujuan.com')}
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={test}
                  disabled={testing || !testTo.trim()}
                >
                  {testing && <Spinner data-icon="inline-start" />}
                  {t('Kirim uji')}
                </Button>
              </div>
              <FieldDescription>
                {t(
                  'Yang terkirim adalah contoh email kode masuk dengan template terbaru. Simpan dulu agar memakai pengaturan terbaru.',
                )}
              </FieldDescription>
              {result && (
                <Alert variant={result.ok ? 'default' : 'destructive'}>
                  <AlertDescription>{result.pesan}</AlertDescription>
                </Alert>
              )}
            </div>
          </FieldGroup>
        )}
      </CardContent>
    </Card>
  );
}
