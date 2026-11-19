import { TriangleAlertIcon } from 'lucide-react';

/** The `license` prop the app shares (LirKit::license()). */
export type SharedLicense = {
  status: string;
  read_only: boolean;
  message: string | null;
  expires_at: string | null;
  days_left: number | null;
};

/**
 * A strip above the page when the license needs attention (about to expire, in its grace period, or the app is
 * read-only). Shows nothing while the license is fine or enforcement is off.
 */
export function LicenseBanner({ license }: { license?: SharedLicense | null }) {
  if (!license?.message) {
    return null;
  }

  return (
    <div
      role={license.read_only ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${license.read_only ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'}`}
    >
      <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
      <span>{license.message}</span>
    </div>
  );
}
