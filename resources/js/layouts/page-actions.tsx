import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const SLOT_ID = 'lir-kit-page-actions';

/** The spot in a page header where PageActions put their buttons (SettingsLayout renders one beside the title). */
export function PageActionsSlot() {
  return (
    <div
      id={SLOT_ID}
      className="flex flex-wrap items-center gap-2 empty:hidden"
    />
  );
}

/**
 * Puts buttons in the page header, next to the title, from anywhere inside the page. When the layout around has
 * no slot (your own layout), they stay where they are written.
 */
export function PageActions({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSlot(document.getElementById(SLOT_ID));
  }, []);

  return slot ? (
    createPortal(children, slot)
  ) : (
    <div className="flex justify-end">{children}</div>
  );
}
