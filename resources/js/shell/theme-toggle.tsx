import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { t } from '../adapters';
import { useAppearance, type Appearance } from '../hooks/use-appearance';

export const APPEARANCES: {
  value: Appearance;
  label: string;
  icon: typeof SunIcon;
}[] = [
  { value: 'light', label: t('Terang'), icon: SunIcon },
  { value: 'dark', label: t('Gelap'), icon: MoonIcon },
  { value: 'system', label: t('Sistem'), icon: MonitorIcon },
];

/** The light / dark / follow-the-system switch for the top bar. */
export function ThemeToggle() {
  const { appearance, update } = useAppearance();
  const Current =
    APPEARANCES.find((a) => a.value === appearance)?.icon ?? MonitorIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={t('Ganti tema')} />
        }
      >
        <Current />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          {APPEARANCES.map(({ value, label, icon: Icon }) => (
            <DropdownMenuItem key={value} onClick={() => update(value)}>
              <Icon />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
