import { CheckIcon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { t } from '../adapters';
import { useAppearance } from '../hooks/use-appearance';
import { APPEARANCES } from './theme-toggle';

const HINT: Record<string, string> = {
  light: t('Latar terang, cocok untuk ruangan yang terang.'),
  dark: t('Latar gelap, nyaman untuk mata di ruangan redup.'),
  system: t('Mengikuti pengaturan perangkat Anda secara otomatis.'),
};

/** The theme picker (terang, gelap, sistem) as three cards. The choice is kept in this browser. */
export function AppearanceCard() {
  const { appearance, update } = useAppearance();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Tema')}</CardTitle>
        <CardDescription>{t('Berlaku untuk seluruh halaman aplikasi.')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="radiogroup"
          aria-label={t('Tema')}
          className="grid gap-3 sm:grid-cols-3"
        >
          {APPEARANCES.map(({ value, label, icon: Icon }) => {
            const active = appearance === value;

            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update(value)}
                className={`flex flex-col gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${active ? 'border-primary ring-1 ring-primary' : ''}`}
              >
                <span className="flex items-center gap-2 font-medium">
                  <Icon className="size-4" />
                  {label}
                  {active && <CheckIcon className="ml-auto size-4 text-primary" />}
                </span>
                <span className="text-sm text-muted-foreground">
                  {HINT[value]}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
