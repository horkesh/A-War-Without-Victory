import { useActiveWindowKeydown } from '../hooks/useActiveWindowKeydown';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import type { TacticalMapInteractionReadiness } from './TacticalMapViewport';

export function isCurrentTacticalInteractionReady(args: {
  screenActive: boolean;
  readiness: TacticalMapInteractionReadiness;
  currentTurn: number | null | undefined;
  currentFingerprint: string | null;
}): boolean {
  return args.screenActive
    && args.readiness.ready
    && args.readiness.renderedTurn === args.currentTurn
    && args.readiness.renderedFingerprint != null
    && args.readiness.renderedFingerprint === args.currentFingerprint;
}

export function TacticalInputOwners({
  active,
  onShellKeyDown,
}: {
  active: boolean;
  onShellKeyDown: (event: KeyboardEvent) => void;
}) {
  useKeyboardShortcuts(active);
  useActiveWindowKeydown(active, onShellKeyDown);
  return null;
}
