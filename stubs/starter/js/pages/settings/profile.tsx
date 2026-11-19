import { router, useForm, usePage } from '@inertiajs/react';
import { CheckIcon } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { notify, t } from '@/lir-kit/adapters';
import { ImagePicker } from '@/lir-kit/image-picker';
import { FormCard, FormGrid } from '@/lir-kit/layouts/form-card';
import { UserAvatar, type ShellUser } from '@/lir-kit/shell/user-menu';
import SettingsPage from '@/layouts/settings-page';

/**
 * The person's photo (POST and DELETE /profile/avatar, a route of your app: store the file, share its URL as
 * `auth.user.avatar`), name and email (Fortify: PUT /user/profile-information).
 */
export default function Profile() {
  const { auth } = usePage<{ auth: { user: ShellUser | null } }>().props;
  const [uploading, setUploading] = useState(false);
  const form = useForm({
    name: auth.user?.name ?? '',
    email: auth.user?.email ?? '',
  });

  const uploadAvatar = (file: File | null) => {
    if (!file) {
      return;
    }

    router.post(
      '/profile/avatar',
      { avatar: file },
      {
        forceFormData: true,
        preserveScroll: true,
        onStart: () => setUploading(true),
        onFinish: () => setUploading(false),
        onSuccess: () => notify(t('Foto profil diperbarui.')),
        onError: (errors) => notify(Object.values(errors).join(' '), true),
      },
    );
  };

  const removeAvatar = () =>
    router.delete('/profile/avatar', {
      preserveScroll: true,
      onSuccess: () => notify(t('Foto profil dihapus.')),
    });

  return (
    <SettingsPage
      title={t('Profil')}
      description={t('Data akun Anda.')}
    >
      <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t('Foto profil')}</CardTitle>
          <CardDescription>
            {t('Tampil di menu akun. Tanpa foto, inisial nama Anda yang dipakai.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImagePicker
            shape="round"
            current={auth.user?.avatar}
            onFile={uploadAvatar}
            onRemove={auth.user?.avatar ? removeAvatar : undefined}
            busy={uploading}
            fallback={<UserAvatar user={auth.user} className="size-full" />}
          />
        </CardContent>
      </Card>
      <FormCard
        title={t('Informasi akun')}
        description={t('Nama dan email dipakai di notifikasi dan jejak aktivitas.')}
        busy={form.processing}
        onSubmit={() => form.put('/user/profile-information', { preserveScroll: true })}
        extraActions={
          form.recentlySuccessful && (
            <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckIcon className="size-4" />
              {t('Tersimpan')}
            </span>
          )
        }
      >
        <FormGrid>
          <Field data-invalid={!!form.errors.name}>
            <FieldLabel htmlFor="p-name">{t('Nama')}</FieldLabel>
            <Input
              id="p-name"
              value={form.data.name}
              aria-invalid={!!form.errors.name}
              onChange={(e) => form.setData('name', e.target.value)}
            />
            {form.errors.name && <FieldError>{form.errors.name}</FieldError>}
          </Field>
          <Field data-invalid={!!form.errors.email}>
            <FieldLabel htmlFor="p-email">{t('Email')}</FieldLabel>
            <Input
              id="p-email"
              type="email"
              value={form.data.email}
              aria-invalid={!!form.errors.email}
              onChange={(e) => form.setData('email', e.target.value)}
            />
            {form.errors.email && <FieldError>{form.errors.email}</FieldError>}
          </Field>
        </FormGrid>
      </FormCard>
      </div>
    </SettingsPage>
  );
}
