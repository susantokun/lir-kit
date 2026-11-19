import { ImageUpIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { t } from './adapters';
import { NoticeDialog } from './shell/notice-dialog';

/**
 * Pick-and-preview control for a picture (profile photo, logo, favicon): a preview, a button to choose a file,
 * and one to remove it. `current` is what is saved now; `fallback` shows when there is nothing. The control does
 * not upload anything: `onFile` hands you the chosen file, `onRemove` tells you to delete the saved one.
 */
export function ImagePicker({
  current,
  fallback,
  file = null,
  onFile,
  onRemove,
  busy = false,
  shape = 'square',
  accept = 'image/png,image/jpeg,image/webp',
  hint,
}: {
  current?: string | null;
  fallback: ReactNode;
  file?: File | null;
  onFile: (file: File | null) => void;
  onRemove?: () => void;
  busy?: boolean;
  shape?: 'square' | 'round';
  accept?: string;
  hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);

      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shown = preview ?? current ?? null;
  const [confirming, setConfirming] = useState(false);

  const remove = () => {
    setConfirming(false);
    onFile(null);
    onRemove?.();
  };

  return (
    <div className="flex items-center gap-4">
      <div
        className={`flex size-20 shrink-0 items-center justify-center overflow-hidden border bg-muted ${shape === 'round' ? 'rounded-full' : 'rounded-2xl'}`}
      >
        {shown ? (
          <img src={shown} alt="" className="size-full object-cover" />
        ) : (
          fallback
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <ImageUpIcon />
            {shown ? t('Ganti gambar') : t('Pilih gambar')}
          </Button>
          {(shown || file) && onRemove && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => (current ? setConfirming(true) : remove())}
            >
              <Trash2Icon />
              {t('Hapus')}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {hint ?? t('JPG, PNG, atau WebP, maksimal 2 MB.')}
        </p>
      </div>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />
      <NoticeDialog
        open={confirming}
        tone="danger"
        icon={Trash2Icon}
        title={t('Hapus gambar?')}
        description={t('Gambar yang tersimpan akan dihapus. Tindakan ini tidak bisa dibatalkan.')}
        confirmLabel={t('Ya, hapus')}
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
