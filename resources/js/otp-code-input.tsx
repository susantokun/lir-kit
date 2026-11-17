import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  id?: string;
  length: number;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  autoFocus?: boolean;
};

/**
 * One box per digit. A single real input sits invisibly on top, so typing, pasting, backspace and
 * the browser's "one-time code" autofill all work as in any text field.
 */
export function OtpCodeInput({
  id,
  length,
  value,
  onChange,
  invalid,
  autoFocus,
}: Props) {
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const active = Math.min(value.length, length - 1);

  return (
    <div
      className="relative mx-auto flex w-fit justify-center gap-2"
      onClick={() => input.current?.focus()}
    >
      {Array.from({ length }, (_, i) => (
        <div
          key={i}
          aria-hidden
          className={cn(
            'relative flex size-11 items-center justify-center rounded-md border bg-background text-lg font-medium shadow-xs transition-all',
            invalid && 'border-destructive',
            focused && i === active && 'z-10 border-ring ring-3 ring-ring/50',
          )}
        >
          {value[i]}
          {focused && i === value.length && (
            <span className="pointer-events-none absolute h-5 w-px animate-pulse bg-foreground" />
          )}
        </div>
      ))}
      <input
        ref={input}
        id={id}
        value={value}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        maxLength={length}
        aria-invalid={invalid}
        className="absolute inset-0 size-full cursor-text opacity-0"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) =>
          onChange(e.target.value.replace(/\D/g, '').slice(0, length))
        }
      />
    </div>
  );
}
