import { useEffect, useRef } from 'react';
import { FACTION_COLORS_SUBTLE } from '../utils/theme';
import { getPlayerSafeMilitaryFactionName } from '../utils/playerSafeText';

/** Attacker formation summary for the confirmation modal. */
export interface AttackConfirmationAttacker {
  id: string;
  name: string;
  faction: string;
}

/** Defender formation summary (if any at target). */
export interface AttackConfirmationDefender {
  id: string;
  name: string;
  faction: string;
  strength: number | string;
}

export interface AttackConfirmationProps {
  attacker: AttackConfirmationAttacker;
  targetOsid: string;
  targetDisplayName: string;
  defender: AttackConfirmationDefender | null;
  terrainSummary: string;
  /** Combat odds from query-combat-estimate if available; otherwise "—". */
  combatOdds: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Phase C4: Attack confirmation modal. HOI §9.2 warm palette; overlay + card;
 * Confirm / Cancel; focus trap and Escape to cancel.
 */
export function AttackConfirmation({
  attacker,
  targetOsid: _targetOsid,
  targetDisplayName,
  defender,
  terrainSummary,
  combatOdds,
  onConfirm,
  onCancel,
}: AttackConfirmationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus trap: focus Confirm on mount; keep focus inside modal
  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== 'Tab' || !containerRef.current) return;
      const focusable = containerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first && last) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last && first) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attack-confirmation-title"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        ref={containerRef}
        className="bg-panel-card border border-panel-border rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-panel-border bg-panel-bg">
          <h2
            id="attack-confirmation-title"
            className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold"
          >
            Confirm attack
          </h2>
        </div>

        <div className="p-4 space-y-3 text-sm">
          <div>
            <span className="text-text-secondary">Attacker: </span>
            <span className={FACTION_COLORS_SUBTLE[attacker.faction] ?? 'text-text-primary'}>
              {attacker.name}
            </span>
            <span className="text-text-secondary ml-1">({getPlayerSafeMilitaryFactionName(attacker.faction)})</span>
          </div>

          <div>
            <span className="text-text-secondary">Target: </span>
            <span className="text-text-primary">
              {targetDisplayName}
            </span>
          </div>

          <div>
            <span className="text-text-secondary">Defender: </span>
            {defender ? (
              <>
                <span className={FACTION_COLORS_SUBTLE[defender.faction] ?? 'text-text-primary'}>
                  {defender.name}
                </span>
                <span className="text-text-secondary ml-1">
                  ({getPlayerSafeMilitaryFactionName(defender.faction)} / strength: {typeof defender.strength === 'number' ? defender.strength.toLocaleString() : defender.strength})
                </span>
              </>
            ) : (
              <span className="text-text-secondary">—</span>
            )}
          </div>

          <div>
            <span className="text-text-secondary">Terrain: </span>
            <span className="text-text-primary">{terrainSummary}</span>
          </div>

          <div>
            <span className="text-text-secondary">Odds: </span>
            <span className="text-text-primary">{combatOdds}</span>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-panel-border bg-panel-bg flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-text-secondary hover:text-interactive hover:bg-panel-hover rounded border border-panel-border text-xs font-sans"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="px-3 py-1.5 bg-interactive text-white hover:bg-panel-hover rounded border border-panel-border text-xs font-sans"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
