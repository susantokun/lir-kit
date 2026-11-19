import { LockIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, api, notify, t } from '../adapters';
import { FormDrawer } from '../form-drawer';
import { PageActions } from '../layouts/page-actions';
import { NoticeDialog } from '../shell/notice-dialog';

type Role = {
  id: number;
  key: string;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: string[];
  users_count: number;
};
type Group = { label: string; permissions: { key: string; label: string }[] };
type Form = { id: number | null; name: string; description: string; permissions: string[]; system: boolean };

/**
 * The Peran screen: the roles and what each may do. A role is a set of permissions (the list comes from your
 * config 'lir-kit.permissions'); the built-in Superadmin holds all and cannot be changed. Talks to /lir-kit/roles.
 */
export function RolesPanel() {
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<Role | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ roles: Role[]; groups: Group[] }>('/roles');
      setRoles(res.roles);
      setGroups(res.groups);
    } catch (e) {
      notify((e as ApiError).message, true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const edit = (role: Role | null) => {
    setErrors({});
    setForm(
      role
        ? {
            id: role.id,
            name: role.name,
            description: role.description ?? '',
            permissions: role.permissions,
            system: role.is_system,
          }
        : { id: null, name: '', description: '', permissions: [], system: false },
    );
  };

  const save = async () => {
    if (!form || form.system) {
      setForm(null);

      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const res = await api<{ roles: Role[] }>(form.id ? `/roles/${form.id}` : '/roles', {
        method: form.id ? 'PUT' : 'POST',
        body: { name: form.name, description: form.description || null, permissions: form.permissions },
      });
      setRoles(res.roles);
      notify(t('Peran disimpan.'));
      setForm(null);
    } catch (e) {
      const err = e as ApiError;
      setErrors(err.errors ?? {});

      if (!err.errors) {
        notify(err.message, true);
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!removing) {
      return;
    }

    try {
      const res = await api<{ roles: Role[] }>(`/roles/${removing.id}`, { method: 'DELETE' });
      setRoles(res.roles);
      notify(t('Peran dihapus.'));
    } catch (e) {
      const err = e as ApiError;
      notify(err.errors ? Object.values(err.errors).flat().join(' ') : err.message, true);
    }

    setRemoving(null);
  };

  const toggle = (key: string, on: boolean) =>
    form &&
    setForm({
      ...form,
      permissions: on ? [...form.permissions, key] : form.permissions.filter((p) => p !== key),
    });

  return (
    <div className="flex flex-col gap-4">
      <PageActions>
        <Button onClick={() => edit(null)}>
          <PlusIcon data-icon="inline-start" />
          {t('Tambah peran')}
        </Button>
      </PageActions>

      {roles === null && <Skeleton className="h-24 w-full" />}
      <div className="grid gap-3 md:grid-cols-2">
        {roles?.map((role) => (
          <Card key={role.id}>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-0.5">
                  <span className="flex items-center gap-2 font-medium">
                    {role.name}
                    {role.is_system && (
                      <Badge variant="outline">
                        <LockIcon data-icon="inline-start" />
                        {t('Bawaan')}
                      </Badge>
                    )}
                  </span>
                  {role.description && (
                    <span className="text-sm text-muted-foreground">{role.description}</span>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" aria-label={t('Ubah')} onClick={() => edit(role)}>
                    <PencilIcon />
                  </Button>
                  {!role.is_system && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('Hapus')}
                      onClick={() => setRemoving(role)}
                    >
                      <Trash2Icon />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('{n} hak akses', { n: role.permissions.length })} · {t('{n} pengguna', { n: role.users_count })}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <FormDrawer
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.system ? form.name : form?.id ? t('Ubah peran') : t('Tambah peran')}
        description={form?.system ? t('Peran bawaan memegang semua hak akses dan tidak bisa diubah.') : undefined}
        submitLabel={form?.system ? t('Tutup') : t('Simpan')}
        busy={saving}
        onSubmit={save}
      >
        {form && (
          <>
            {error(errors, 'role') && <FieldError>{error(errors, 'role')}</FieldError>}
            {!form.system && (
              <>
                <Field data-invalid={!!error(errors, 'name')}>
                  <FieldLabel htmlFor="r-name">{t('Nama peran')}</FieldLabel>
                  <Input
                    id="r-name"
                    value={form.name}
                    aria-invalid={!!error(errors, 'name')}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  {error(errors, 'name') && <FieldError>{error(errors, 'name')}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel htmlFor="r-desc">{t('Keterangan')}</FieldLabel>
                  <Input
                    id="r-desc"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </Field>
              </>
            )}
            <div className="flex max-h-72 flex-col gap-4 overflow-y-auto rounded-lg border p-3">
              {groups.map((group) => (
                <div key={group.label} className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase">{group.label}</span>
                  {group.permissions.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        disabled={form.system}
                        checked={form.permissions.includes(p.key)}
                        onCheckedChange={(on) => toggle(p.key, !!on)}
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </FormDrawer>

      <NoticeDialog
        open={removing !== null}
        tone="danger"
        title={t('Hapus peran?')}
        description={t('Peran "{nama}" akan dihapus. Peran yang masih dipakai pengguna tidak bisa dihapus.', {
          nama: removing?.name,
        })}
        confirmLabel={t('Ya, hapus')}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
        dismissible
      />
    </div>
  );
}

function error(errors: Record<string, string[]>, key: string): string | undefined {
  return errors[key]?.[0];
}
