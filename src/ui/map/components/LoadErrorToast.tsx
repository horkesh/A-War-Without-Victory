/**
 * LANE-V094-LOADING-AND-ERROR — dismissible save-load error toast.
 *
 * Renders a small, dismissible toast at App root when a save-load
 * (or related shell-level IO) fails. Replaces the prior silent
 * failure mode where `setLoadError(...)` would write to the store but
 * no UI consumer rendered the message (audit § P1-D).
 *
 * Reuse contract: the toast is intentionally generic — it accepts a
 * `message` string + an `onDismiss` callback, and is rendered by the
 * shell wrapper from the canonical `loadError` slice of the game
 * store. The same component can be reused later by other lanes
 * (v0.9.4 backlog: empty-state pass, modal wrapper) without changes.
 *
 * Design rules (from audit § P1-D / QW-3):
 *   - z-index `8500` per audit recommendation (above modal stack but
 *     below GameOver / Verdict / TurnAftermath at 9999+).
 *   - Faction-symmetric: amber/red status palette, no faction colors.
 *   - Dismiss via close button or `Escape` key when focused.
 *   - role="alert" + aria-live="assertive" for accessibility.
 *
 * Sensitive-history compliance: Ring 1, faction-agnostic mechanism,
 * no §6 surface. UI-only — does NOT enter sim path.
 */
import React, { useEffect, useRef } from 'react';
import { Z } from '../../shared/zIndex';
import { t } from '../i18n';

export interface LoadErrorToastProps {
  /** The error message to display. If null/empty, the toast does not render. */
  message: string | null | undefined;
  /** Called when the user dismisses the toast. */
  onDismiss: () => void;
  /**
   * Optional fixed-position override. Defaults to top-center under the
   * Presidential toolbar. Tests can pass `static` for layout-isolated
   * snapshots.
   */
  positioning?: 'fixed' | 'static';
}

/**
 * LoadErrorToast — dismissible error banner for save-load failures.
 */
export function LoadErrorToast({ message, onDismiss, positioning = 'fixed' }: LoadErrorToastProps): React.ReactElement | null {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Focus the dismiss button on mount so Escape works without a click.
  useEffect(() => {
    if (!message) return;
    buttonRef.current?.focus();
  }, [message]);

  if (!message) return null;

  const positionClass = positioning === 'fixed'
    ? 'fixed top-16 left-1/2 -translate-x-1/2'
    : '';
  const positionStyle = positioning === 'fixed' ? { zIndex: Z.MODAL_HARD } : undefined;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onDismiss();
    }
  };

  return (
    <div
      className={`${positionClass} max-w-md min-w-[20rem] bg-panel-bg border border-red-500 shadow-lg rounded`}
      style={positionStyle}
      role="alert"
      aria-live="assertive"
      onKeyDown={handleKeyDown}
      data-testid="load-error-toast"
    >
      <div className="flex items-start gap-3 p-3">
        <div
          className="font-mono uppercase tracking-[0.22em] text-[10px] text-red-400 mt-0.5"
          data-testid="load-error-toast-tag"
        >
          {t('loadError.error')}
        </div>
        <div
          className="flex-1 font-mono text-[12px] text-text-primary break-words"
          data-testid="load-error-toast-message"
        >
          {message}
        </div>
        <button
          ref={buttonRef}
          type="button"
          onClick={onDismiss}
          className="font-mono text-[12px] text-amber-400 hover:text-amber-300 px-1.5 py-0.5 border border-panel-border rounded focus:outline-none focus:border-amber-400"
          data-testid="load-error-toast-dismiss"
          aria-label={t('loadError.dismissAria')}
        >
          ×
        </button>
      </div>
    </div>
  );
}
