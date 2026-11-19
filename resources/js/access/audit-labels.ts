import { t } from '../adapters';

const ACTIONS: Record<string, () => string> = {
  masuk_otp: () => t('Masuk dengan kode email'),
  tambah_pengguna: () => t('Tambah pengguna'),
  ubah_pengguna: () => t('Ubah pengguna'),
  hapus_pengguna: () => t('Hapus pengguna'),
  undang_ulang_pengguna: () => t('Kirim ulang undangan'),
  tambah_peran: () => t('Tambah peran'),
  ubah_peran: () => t('Ubah peran'),
  hapus_peran: () => t('Hapus peran'),
  ubah_menu: () => t('Ubah menu'),
  reset_menu: () => t('Kembalikan menu ke bawaan'),
  ubah_metode_masuk: () => t('Ubah metode masuk'),
  ubah_pengaturan_email: () => t('Ubah pengaturan email'),
  ubah_template_email_kode: () => t('Ubah template email kode masuk'),
  reset_template_email_kode: () => t('Kembalikan template email kode masuk'),
  ubah_situs: () => t('Ubah pengaturan situs'),
  aktivasi_license: () => t('Aktivasi license'),
  unggah_file_license: () => t('Unggah file license'),
  ekspor_audit: () => t('Ekspor log audit'),
  verifikasi_integritas: () => t('Verifikasi integritas log audit'),
  integritas_rusak: () => t('Integritas log audit bermasalah'),
};

const ENTITIES: Record<string, () => string> = {
  sesi: () => t('Sesi masuk'),
  user: () => t('Pengguna'),
  role: () => t('Peran'),
  menu: () => t('Menu'),
  login_method: () => t('Metode masuk'),
  email: () => t('Email'),
  site: () => t('Situs'),
  license: () => t('License'),
  audit_log: () => t('Log audit'),
  sistem: () => t('Sistem'),
};

const human = (code: string) => {
  const text = code.replace(/_/g, ' ');

  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Readable name of an audit action code. Actions of your own app fall back to the code made readable. */
export const actionLabel = (code: string): string =>
  ACTIONS[code]?.() ?? human(code);

export const entityLabel = (code: string): string =>
  ENTITIES[code]?.() ?? human(code);

export const outcomeLabel = (outcome: string): string =>
  ({ berhasil: t('Berhasil'), gagal: t('Gagal'), ditolak: t('Ditolak') })[
    outcome
  ] ?? outcome;

export const severityLabel = (level: string): string =>
  ({ kritis: t('Kritis'), peringatan: t('Peringatan'), info: t('Info') })[
    level
  ] ?? level;

export const OUTCOME_STYLE: Record<string, string> = {
  berhasil:
    'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  gagal:
    'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  ditolak: 'border-destructive/30 bg-destructive/10 text-destructive',
};
