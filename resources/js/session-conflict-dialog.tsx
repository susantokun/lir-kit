import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { t } from './adapters';

/** What your LoginHooks::sessionConflict() returns about the other live session. */
export type SessionConflict = {
  ip: string | null;
  device: string;
  location?: string | null;
  last_activity: string;
};

/** Asks whether to take over an account that is already signed in elsewhere (ends the other session). */
export function SessionConflictDialog({
  conflict,
  busy,
  onCancel,
  onContinue,
}: {
  conflict: SessionConflict | null;
  busy: boolean;
  onCancel: () => void;
  onContinue: () => void;
}) {
  return (
    <Dialog
      open={conflict !== null}
      onOpenChange={(next) => !next && onCancel()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('Akun ini sedang aktif di perangkat lain')}
          </DialogTitle>
          <DialogDescription>
            {t('Jika Anda lanjut, sesi di perangkat itu akan diakhiri.')}
          </DialogDescription>
        </DialogHeader>
        {conflict && (
          <dl className="grid gap-1 text-sm">
            <div>
              <dt className="inline text-muted-foreground">
                {t('Perangkat')}:{' '}
              </dt>
              <dd className="inline">{conflict.device}</dd>
            </div>
            {conflict.ip && (
              <div>
                <dt className="inline text-muted-foreground">IP: </dt>
                <dd className="inline">{conflict.ip}</dd>
              </div>
            )}
            {conflict.location && (
              <div>
                <dt className="inline text-muted-foreground">
                  {t('Lokasi')}:{' '}
                </dt>
                <dd className="inline">{conflict.location}</dd>
              </div>
            )}
          </dl>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t('Batal')}
          </Button>
          <Button onClick={onContinue} disabled={busy}>
            {t('Lanjutkan dan akhiri sesi lain')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
