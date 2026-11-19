import { router } from '@inertiajs/react';
import { GlobeIcon } from 'lucide-react';
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { ApiError, KIT_API, notify, t } from './adapters';
import { ImagePicker } from './image-picker';

type Site = {
  name: string;
  tagline: string | null;
  contact_email: string | null;
  logo: string | null;
  favicon: string | null;
  default_name: string;
};

type Picture = { file: File | null; removed: boolean };

const NONE: Picture = { file: null, removed: false };

const xsrf = () => {
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);

  return match ? decodeURIComponent(match[1]) : '';
};

/** The settings routes of the kit take JSON; the pictures need multipart, so this one posts a form. */
async function post(form: FormData): Promise<Site> {
  const response = await fetch(`${KIT_API}/site`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'X-XSRF-TOKEN': xsrf() },
    body: form,
  });
  const data = (await response.json().catch(() => ({}))) as Partial<Site> & {
    message?: string;
    errors?: Record<string, string[]>;
  };

  if (!response.ok) {
    throw new ApiError(
      data.message ?? `HTTP ${response.status}`,
      response.status,
      data.errors,
    );
  }

  return data as Site;
}

/**
 * Pengaturan > Situs: the site's name, a short line, a contact email, the logo and the favicon. Saved on the
 * server; share `LirKit::site()` with your pages (the Inertia prop `site`) to show them in the sidebar, the
 * sign-in pages and the browser tab.
 */
export function SiteSettingsCard() {
  const [saved, setSaved] = useState<Site | null>(null);
  const [form, setForm] = useState({ name: '', tagline: '', contact_email: '' });
  const [logo, setLogo] = useState<Picture>(NONE);
  const [favicon, setFavicon] = useState<Picture>(NONE);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  const load = (site: Site) => {
    setSaved(site);
    setForm({
      name: site.name === site.default_name ? '' : site.name,
      tagline: site.tagline ?? '',
      contact_email: site.contact_email ?? '',
    });
    setLogo(NONE);
    setFavicon(NONE);
  };

  useEffect(() => {
    fetch(`${KIT_API}/site`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
      .then((r) => (r.ok ? (r.json() as Promise<Site>) : Promise.reject(new ApiError(`HTTP ${r.status}`, r.status))))
      .then(load)
      .catch((e: ApiError) => notify(e.message, true));
  }, []);

  const save = async () => {
    setSaving(true);
    setErrors({});

    const body = new FormData();
    body.set('name', form.name);
    body.set('tagline', form.tagline);
    body.set('contact_email', form.contact_email);

    if (logo.file) body.set('logo', logo.file);
    if (logo.removed) body.set('remove_logo', '1');
    if (favicon.file) body.set('favicon', favicon.file);
    if (favicon.removed) body.set('remove_favicon', '1');

    try {
      load(await post(body));
      notify(t('Pengaturan situs disimpan.'), false);
      router.reload({ only: ['site'] });
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

  const error = (key: string) => errors[key]?.[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Identitas situs')}</CardTitle>
        <CardDescription>
          {t(
            'Nama, logo, dan favicon yang tampil di menu samping, halaman masuk, dan tab peramban.',
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {saved === null ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <FieldGroup>
            <Field data-invalid={!!error('name')}>
              <FieldLabel htmlFor="site-name">{t('Nama situs')}</FieldLabel>
              <Input
                id="site-name"
                maxLength={60}
                placeholder={saved.default_name}
                value={form.name}
                aria-invalid={!!error('name')}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <FieldDescription>
                {t('Kosongkan untuk memakai nama aplikasi ({name}).', {
                  name: saved.default_name,
                })}
              </FieldDescription>
              {error('name') && <FieldError>{error('name')}</FieldError>}
            </Field>
            <Field data-invalid={!!error('tagline')}>
              <FieldLabel htmlFor="site-tagline">
                {t('Deskripsi singkat')}
              </FieldLabel>
              <Input
                id="site-tagline"
                maxLength={120}
                value={form.tagline}
                aria-invalid={!!error('tagline')}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              />
              {error('tagline') && <FieldError>{error('tagline')}</FieldError>}
            </Field>
            <Field data-invalid={!!error('contact_email')}>
              <FieldLabel htmlFor="site-email">{t('Email kontak')}</FieldLabel>
              <Input
                id="site-email"
                type="email"
                placeholder="halo@perusahaan.co.id"
                value={form.contact_email}
                aria-invalid={!!error('contact_email')}
                onChange={(e) =>
                  setForm({ ...form, contact_email: e.target.value })
                }
              />
              {error('contact_email') && (
                <FieldError>{error('contact_email')}</FieldError>
              )}
            </Field>

            <div className="grid gap-6">
              <Field data-invalid={!!error('logo')}>
                <FieldLabel>{t('Logo')}</FieldLabel>
                <ImagePicker
                  current={logo.removed ? null : saved.logo}
                  file={logo.file}
                  onFile={(file) => setLogo({ file, removed: false })}
                  onRemove={() => setLogo({ file: null, removed: true })}
                  fallback={<GlobeIcon className="size-8 text-muted-foreground" />}
                />
                {error('logo') && <FieldError>{error('logo')}</FieldError>}
              </Field>
              <Field data-invalid={!!error('favicon')}>
                <FieldLabel>{t('Favicon')}</FieldLabel>
                <ImagePicker
                  current={favicon.removed ? null : saved.favicon}
                  file={favicon.file}
                  accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/jpeg,image/webp"
                  hint={t('PNG atau ICO persegi, maksimal 512 KB.')}
                  onFile={(file) => setFavicon({ file, removed: false })}
                  onRemove={() => setFavicon({ file: null, removed: true })}
                  fallback={<GlobeIcon className="size-8 text-muted-foreground" />}
                />
                {error('favicon') && <FieldError>{error('favicon')}</FieldError>}
              </Field>
            </div>

            <div>
              <Button onClick={save} disabled={saving}>
                {saving && <Spinner data-icon="inline-start" />}
                {t('Simpan pengaturan situs')}
              </Button>
            </div>
          </FieldGroup>
        )}
      </CardContent>
    </Card>
  );
}
