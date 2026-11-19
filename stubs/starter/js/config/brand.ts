import { HistoryIcon, ScaleIcon, ShieldCheckIcon } from 'lucide-react';
import type { AuthBrand } from '@/lir-kit/layouts/auth-split-layout';
import { t } from '@/lir-kit/adapters';

/** Your app's name. Used in the sidebar, the sign-out dialog and the sign-in pages. */
export const APP_NAME = 'lir-kit';

/** One line under the name in the sidebar. */
export const APP_SUBTITLE = t('Starter kit');

/** The left panel of the sign-in pages. Change the words, the three points and the icons to describe your app. */
export const authBrand: AuthBrand = {
  name: APP_NAME,
  headline: t('Mulai proyek Laravel dengan tampilan yang sudah jadi.'),
  tagline: t('Masuk, menu, dan pengaturan siap pakai.'),
  points: [
    { icon: ShieldCheckIcon, text: t('Masuk dengan kata sandi atau kode email') },
    { icon: ScaleIcon, text: t('Menu sidebar yang bisa diatur per pengguna') },
    { icon: HistoryIcon, text: t('Tampilan terang dan gelap, nyaman di ponsel') },
  ],
  footer: t('Ubah teks ini di resources/js/config/brand.ts.'),
};
