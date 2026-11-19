import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { t } from './adapters';

export type SearchOption = {
  value: string;
  label: string;
  description?: string;
};

/**
 * The dropdown for choosing one value: a button that opens a popover with a search box and a list. Use it
 * instead of a plain select so every list can be searched.
 */
export function SearchSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  ariaLabel,
  id,
  className = 'w-full',
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  ariaLabel?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const search = searchPlaceholder ?? t('Cari…');

  const selected = options.find((o) => o.value === value);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    return options.filter(
      (o) =>
        !q ||
        o.label.toLowerCase().includes(q) ||
        (o.description ?? '').toLowerCase().includes(q),
    );
  }, [options, query]);

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery('');
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setActive(0);

        if (!o) {
          setQuery('');
        }
      }}
    >
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={ariaLabel}
            className={`justify-between font-normal ${className}`}
          />
        }
      >
        <span
          className={`truncate ${selected ? '' : 'text-muted-foreground'}`}
        >
          {selected?.label ?? placeholder ?? t('Pilih…')}
        </span>
        <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--anchor-width) min-w-56 gap-2 p-2"
      >
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            autoFocus
            aria-label={search}
            placeholder={search}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === 'Enter' && results[active]) {
                e.preventDefault();
                choose(results[active].value);
              }
            }}
          />
        </InputGroup>
        <ul
          role="listbox"
          className="flex max-h-64 flex-col gap-0.5 overflow-y-auto"
        >
          {results.length === 0 && (
            <li className="px-2 py-4 text-center text-sm text-muted-foreground">
              {t('Tidak ditemukan.')}
            </li>
          )}
          {results.map((option, i) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
            >
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(option.value)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${i === active ? 'bg-accent text-accent-foreground' : ''}`}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{option.label}</span>
                  {option.description && (
                    <span className="truncate text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  )}
                </span>
                {option.value === value && (
                  <CheckIcon className="size-4 shrink-0 text-primary" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
