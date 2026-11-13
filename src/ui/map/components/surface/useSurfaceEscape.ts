/**
 * useSurfaceEscape — Esc closes an open surface.
 *
 * For surfaces mounted outside the shared `<Modal>` (which owns Esc itself). Listens on
 * window in the capture phase and stops the event, so one Esc closes this surface and
 * not also whatever sits under it (the pause menu, the Warroom handler).
 *
 * Canonical owner: src/ui/map/components/surface/useSurfaceEscape.ts
 */
import { useEffect } from 'react';

export function useSurfaceEscape(open: boolean, onClose: (() => void) | undefined): void {
  useEffect(() => {
    if (!open || !onClose) return undefined;
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [open, onClose]);
}
