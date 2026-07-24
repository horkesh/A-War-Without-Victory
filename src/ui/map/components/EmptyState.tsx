/**
 * LANE-V094-EMPTY-STATE-PASS — reusable empty-state component.
 *
 * Replaces ad-hoc inline empty-state strings ("NO ACTIVE OPERATIONS
 * DETECTED", "No combat record", "No events recorded yet.") that
 * varied in voice register, palette, and structure across Army HQ
 * subpanels and adjacent surfaces. One voice, one visual treatment.
 *
 * Voice register (analytical staff-narrative, matched to existing
 * Army HQ tone):
 *   - Primary line: short, uppercase, mono, tracking-wide. Declarative
 *     ("NO ACTIVE OPERATIONS", "NO ENGAGEMENTS RECORDED").
 *   - Optional helper line: sentence-case italic. Brief context for
 *     why the surface is quiet ("Awaiting first operation order.").
 *
 * Visual rules (audit § P1-E / P2-I, § Quick wins QW-4):
 *   - Faction-symmetric palette: panel-bg / panel-card neutrals,
 *     text-secondary for primary, text-muted/secondary-60 for helper.
 *     No faction-specific colors. No status colors (this is neutral,
 *     not an alert).
 *   - role="status" + aria-live="polite" — empty-state is informational,
 *     not an alert.
 *   - No icon by default; a glyph slot is provided for callers that
 *     want a small visual anchor (e.g., "·", "—", or a Heroicons-style
 *     character). The component does NOT introduce iconography
 *     dependencies — that's a separate lane (P2-E iconography catalog).
 *   - Pure functional component; no hooks, no store reads, no IPC.
 *
 * Reuse contract:
 *   - `message` (required): primary uppercase line.
 *   - `helpText` (optional): italic secondary line.
 *   - `glyph` (optional): tiny string (1–2 chars) prepended to the
 *     primary line.
 *   - `density` (optional): `'compact' | 'normal'` (default: `'normal'`).
 *     Compact mode tightens vertical padding for inline list slots.
 *
 * Sensitive-history compliance: Ring 1, faction-agnostic mechanism,
 * no §6 surface. UI-only — does NOT enter sim path.
 */
import React from 'react';

export interface EmptyStateProps {
  /** Primary line. Should be short, uppercase declarative ("NO ACTIVE OPERATIONS"). */
  message: string;
  /** Optional sentence-case italic context line. */
  helpText?: string;
  /** Optional 1–2 char glyph prepended to the primary line. */
  glyph?: string;
  /** Vertical density. Default `'normal'`. */
  density?: 'compact' | 'normal';
  /** Optional className extension for layout-specific overrides (margin, alignment). */
  className?: string;
}

/**
 * EmptyState — one-voice empty surface placeholder.
 */
export function EmptyState({
  message,
  helpText,
  glyph,
  density = 'normal',
  className,
}: EmptyStateProps): React.ReactElement {
  const padY = density === 'compact' ? 'py-2' : 'py-4';
  const wrapperClass = [
    'flex flex-col items-center justify-center text-center',
    padY,
    'px-3',
    'font-mono',
    className ?? '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={wrapperClass}
      role="status"
      aria-live="polite"
      data-testid="empty-state"
    >
      <div
        className="text-xs uppercase tracking-[0.22em] text-text-secondary"
        data-testid="empty-state-message"
      >
        {glyph ? (
          <span className="mr-1.5 text-text-secondary" data-testid="empty-state-glyph">
            {glyph}
          </span>
        ) : null}
        {message}
      </div>
      {helpText ? (
        <div
          className="mt-1 text-xs italic text-text-secondary"
          data-testid="empty-state-help"
        >
          {helpText}
        </div>
      ) : null}
    </div>
  );
}
