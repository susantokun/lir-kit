import {
  MailPlusIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  Trash2Icon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError, api, notify, t } from '../adapters';
import { FormDialog } from '../form-dialog';
import { NoticeDialog } from '../shell/notice-dialog';
import { UserAvatar } from '../shell/user-menu';

type RoleRef = { id: number; key: string; name: string };
type UserRow = {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | null;
  roles: RoleRef[];
};
type Listing = {
  data: UserRow[];
  meta: { total: number; page: number; last_page: number; per_page: number };
  roles: RoleRef[];
  supports_status: boolean;
};
type Form = {
  id: string | null;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  roles: number[];
  send_invitation: boolean;
};

const EMPTY: Form = {
  id: null,
  name: '',
  email: '',
  status: 'active',
  roles: [],
  send_invitation: true,
};

/**
 * The Pengguna screen: a searchable, paged list of people with their roles; invite a person, change name, email,
 * status and roles, resend an invitation, or remove someone. Talks to GET/POST/PUT/DELETE /lir-kit/users.
 */
export function UsersPanel({ currentUserId }: { currentUserId?: string }) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<UserRow | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams({ page: String(page) });

    if (debounced) {
      query.set('q', debounced);
    }

    if (role) {
      query.set('role', role);
    }

    try {
      setListing(await api<Listing>(`/users?${query.toString()}`));
    } catch (e) {
      notify((e as ApiError).message, true);
    } finally {
      setLoading(false);
    }
  }, [page, debounced, role]);

  useEffect(() => {
    void load();
  }, [load]);

  const edit = (user: UserRow | null) => {
    setErrors({});
    setForm(
      user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            status: user.status ?? 'active',
            roles: user.roles.map((r) => r.id),
            send_invitation: false,
          }
        : { ...EMPTY },
    );
  };

  const save = async () => {
    if (!form) {
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const body = {
        name: form.name,
        email: form.email,
        roles: form.roles,
        ...(form.id
          ? listing?.supports_status
            ? { status: form.status }
            : {}
          : { send_invitation: form.send_invitation }),
      };
      await api(form.id ? `/users/${form.id}` : '/users', {
        method: form.id ? 'PUT' : 'POST',
        body,
      });
      notify(form.id ? t('Pengguna diperbarui.') : t('Pengguna ditambahkan.'));
      setForm(null);
      await load();
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
      await api(`/users/${removing.id}`, { method: 'DELETE' });
      notify(t('Pengguna dihapus.'));
      setRemoving(null);
      await load();
    } catch (e) {
      const err = e as ApiError;
      notify(err.errors ? Object.values(err.errors).flat().join(' ') : err.message, true);
      setRemoving(null);
    }
  };

  const invite = async (user: UserRow) => {
    try {
      await api(`/users/${user.id}/invite`, { method: 'POST' });
      notify(t('Undangan dikirim ke {email}.', { email: user.email }));
    } catch (e) {
      notify((e as ApiError).message, true);
    }
  };

  const meta = listing?.meta;
  const error = (key: string) => errors[key]?.[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={t('Cari pengguna')}
            placeholder={t('Cari nama atau email…')}
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <NativeSelect
          aria-label={t('Filter peran')}
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
        >
          <NativeSelectOption value="">{t('Semua peran')}</NativeSelectOption>
          {listing?.roles.map((r) => (
            <NativeSelectOption key={r.id} value={String(r.id)}>
              {r.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button onClick={() => edit(null)}>
          <PlusIcon data-icon="inline-start" />
          {t('Undang pengguna')}
        </Button>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Pengguna')}</TableHead>
              <TableHead>{t('Peran')}</TableHead>
              {listing?.supports_status && <TableHead>{t('Status')}</TableHead>}
              <TableHead className="w-32 text-right">{t('Aksi')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !listing
              ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-9 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : listing?.data.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} className="size-8" />
                        <div className="grid min-w-0 leading-tight">
                          <span className="truncate font-medium">{user.name}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length === 0 && (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                        {user.roles.map((r) => (
                          <Badge key={r.id} variant="secondary">
                            {r.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    {listing.supports_status && (
                      <TableCell>
                        <Badge variant={user.status === 'inactive' ? 'outline' : 'default'}>
                          {user.status === 'inactive' ? t('Nonaktif') : t('Aktif')}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t('Kirim ulang undangan')}
                          onClick={() => invite(user)}
                        >
                          <SendIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t('Ubah')}
                          onClick={() => edit(user)}
                        >
                          <PencilIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t('Hapus')}
                          disabled={user.id === currentUserId}
                          onClick={() => setRemoving(user)}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            {listing && listing.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  {t('Tidak ada pengguna yang cocok.')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t('{n} pengguna', { n: meta.total })}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              {t('Sebelumnya')}
            </Button>
            <span>
              {meta.page} / {meta.last_page}
            </span>
            <Button variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => setPage(page + 1)}>
              {t('Berikutnya')}
            </Button>
          </div>
        </div>
      )}

      <FormDialog
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.id ? t('Ubah pengguna') : t('Undang pengguna')}
        description={
          form?.id
            ? undefined
            : t('Pengguna baru menerima email undangan untuk masuk.')
        }
        submitLabel={form?.id ? t('Simpan') : t('Undang')}
        busy={saving}
        onSubmit={save}
      >
        {form && (
          <>
            {error('user') && <FieldError>{error('user')}</FieldError>}
            <Field data-invalid={!!error('name')}>
              <FieldLabel htmlFor="u-name">{t('Nama')}</FieldLabel>
              <Input
                id="u-name"
                value={form.name}
                aria-invalid={!!error('name')}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {error('name') && <FieldError>{error('name')}</FieldError>}
            </Field>
            <Field data-invalid={!!error('email')}>
              <FieldLabel htmlFor="u-email">{t('Email')}</FieldLabel>
              <Input
                id="u-email"
                type="email"
                value={form.email}
                aria-invalid={!!error('email')}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              {error('email') && <FieldError>{error('email')}</FieldError>}
            </Field>
            {form.id && listing?.supports_status && (
              <Field>
                <FieldLabel htmlFor="u-status">{t('Status')}</FieldLabel>
                <NativeSelect
                  id="u-status"
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as Form['status'] })
                  }
                >
                  <NativeSelectOption value="active">{t('Aktif')}</NativeSelectOption>
                  <NativeSelectOption value="inactive">{t('Nonaktif')}</NativeSelectOption>
                </NativeSelect>
              </Field>
            )}
            <Field data-invalid={!!error('roles')}>
              <FieldLabel>{t('Peran')}</FieldLabel>
              <div className="flex flex-col gap-2 rounded-lg border p-3">
                {listing?.roles.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.roles.includes(r.id)}
                      onCheckedChange={(on) =>
                        setForm({
                          ...form,
                          roles: on
                            ? [...form.roles, r.id]
                            : form.roles.filter((id) => id !== r.id),
                        })
                      }
                    />
                    {r.name}
                  </label>
                ))}
              </div>
              {error('roles') && <FieldError>{error('roles')}</FieldError>}
            </Field>
            {!form.id && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.send_invitation}
                  onCheckedChange={(on) => setForm({ ...form, send_invitation: !!on })}
                />
                <MailPlusIcon className="size-4 text-muted-foreground" />
                {t('Kirim email undangan sekarang')}
              </label>
            )}
          </>
        )}
      </FormDialog>

      <NoticeDialog
        open={removing !== null}
        tone="danger"
        title={t('Hapus pengguna?')}
        description={t('{nama} tidak akan bisa masuk lagi. Tindakan ini tidak bisa dibatalkan.', {
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
