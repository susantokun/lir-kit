import { t } from '@/lir-kit/adapters';
import { SiteSettingsCard } from '@/lir-kit/site-settings-card';
import SettingsPage from '@/layouts/settings-page';

/** The site's identity: name, short line, contact email, logo and favicon (share LirKit::site() as the prop `site`). */
export default function Site() {
  return (
    <SettingsPage
      title={t('Situs')}
      description={t('Identitas situs: nama, logo, kontak, dan favicon aplikasi.')}
    >
      <div className="lg:w-2/3 2xl:w-1/2">
        <SiteSettingsCard />
      </div>
    </SettingsPage>
  );
}
