import { useEffect, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { ApiError, api, notify, t } from './adapters';
import { NoticeDialog } from './shell/notice-dialog';

type Template = {
  custom: { subject: string; body: string };
  defaults: { subject: string; body: string };
  placeholders: { key: string; label: string }[];
};

/**
 * Wording of the email that carries the sign-in code. The look (header, big code box, footer) is fixed;
 * subject and text can be rewritten, with placeholders such as {kode} and {nama}.
 */
export function LoginCodeEmailCard() {
  const [data, setData] = useState<Template | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const apply = (d: Template) => {
    setData(d);
    setSubject(d.custom.subject || d.defaults.subject);
    setBody(d.custom.body || d.defaults.body);
  };

  useEffect(() => {
    api<Template>('/login-code-email')
      .then(apply)
      .catch((e: ApiError) => notify(e.message, true));
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      apply(
        await api<Template>('/login-code-email', {
          method: 'PUT',
          body: { subject, body },
        }),
      );
      notify(t('Template email kode disimpan.'), false);
    } catch (e) {
      notify((e as ApiError).message, true);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setConfirmReset(false);
    setBusy(true);
    try {
      apply(await api<Template>('/login-code-email', { method: 'DELETE' }));
      notify(t('Template dikembalikan ke teks bawaan.'), false);
    } catch (e) {
      notify((e as ApiError).message, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Template email kode masuk')}</CardTitle>
        <CardDescription>
          {t(
            'Tulisan email yang membawa kode masuk. Tampilannya (header, kotak kode, footer) sudah dirapikan; subjek dan isi bisa Anda ubah. Untuk melihat hasilnya, simpan lalu pakai "Kirim email uji" di kartu Email pengirim.',
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data === null ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="code-mail-subject">
                {t('Subjek email')}
              </FieldLabel>
              <Input
                id="code-mail-subject"
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="code-mail-body">{t('Isi email')}</FieldLabel>
              <Textarea
                id="code-mail-body"
                rows={8}
                maxLength={3000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <FieldDescription>
                {t(
                  'Kotak berisi kode ditampilkan otomatis di bawah isi. Pisahkan paragraf dengan baris kosong. Isian yang bisa dipakai:',
                )}{' '}
                {data.placeholders.map((p, i) => (
                  <span key={p.key}>
                    {i > 0 && ', '}
                    <code title={p.label}>{`{${p.key}}`}</code>
                  </span>
                ))}
              </FieldDescription>
            </Field>

            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={busy}>
                {busy && <Spinner data-icon="inline-start" />}
                {t('Simpan template')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmReset(true)}
                disabled={busy || (!data.custom.subject && !data.custom.body)}
              >
                {t('Kembalikan ke bawaan')}
              </Button>
            </div>
          </FieldGroup>
        )}
      </CardContent>
      <NoticeDialog
        open={confirmReset}
        tone="warning"
        title={t('Kembalikan template ke bawaan?')}
        description={t('Subjek dan isi email yang sudah Anda ubah akan diganti dengan teks bawaan.')}
        confirmLabel={t('Ya, kembalikan')}
        onConfirm={reset}
        onCancel={() => setConfirmReset(false)}
      />
    </Card>
  );
}
