/**
 * SurfaceModalLayer — the dimmed full-window layer for a surface opened over the map
 * or the War Room without the shared `<Modal>` (Economy, the enclave ledger, the
 * humanitarian ledger). It sits on the canonical `Z.MODAL` tier, like Army HQ and the
 * Chronicle, so the map rails, the Presidential Inbox and the toolbar never draw over
 * the surface. Put a `<SurfaceFrame layerClassName="">` inside it.
 *
 * Canonical owner: src/ui/map/components/surface/SurfaceModalLayer.tsx
 */
import type { ReactNode } from 'react';
import { Z } from '../../../shared/zIndex';

export function SurfaceModalLayer({ zIndex = Z.MODAL, children }: { zIndex?: number; children: ReactNode }) {
  return (
    <div role="presentation" className="pointer-events-auto fixed inset-0 bg-[#05070a]/80" style={{ zIndex }}>
      {children}
    </div>
  );
}
