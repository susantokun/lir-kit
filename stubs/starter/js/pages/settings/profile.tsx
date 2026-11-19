import { useForm, usePage } from '@inertiajs/react';
import { CheckIcon } from 'lucide-react';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { t } from '@/lir-kit/adapters';
import { FormCard, FormGrid } from '@/lir-kit/layouts/form-card';
import { UserAvatar, type ShellUser } from '@/lir-kit/shell/user-menu';
import SettingsPage from '@/layouts/settings-page';

/** The person's name and email (Fortify: PUT /user/profile-information). */
export default function Profile() {
  const { auth } = usePage<{ auth: { user: ShellUser | null } }>().props;
  const form = useForm({
    name: auth.user?.name ?? '',
    email: auth.user?.email ?? '',
  });

  return (
    <SettingsPage
      title={t('Profil')}
      description={t('Data akun Anda.')}
    >
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
        <div className="flex items-center gap-3">
          <UserAvatar user={auth.user} className="size-14" />
          <p className="text-sm text-muted-foreground">
            {t('Tanpa foto, inisial nama Anda yang dipakai.')}
          </p>
        </div>
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
    </SettingsPage>
  );
}
