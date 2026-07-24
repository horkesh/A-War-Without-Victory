/**
 * WarHasBegunSplash — step 1 of the game-start intro.
 *
 * A dramatic, full-screen blood-red overlay that announces "WAR HAS STARTED"
 * at the live peace→war handoff, then fades out and chains into the existing
 * PeaceWarTransition briefing (step 2).
 *
 * Faithful reproduction (in React) of the legacy vanilla-DOM declaration
 * splash look — src/ui/warroom/components/DeclarationEventModal.ts +
 * src/ui/warroom/styles/modals.css (.decl-overlay / .decl-content /
 * .decl-title): blood-red backdrop, ~0.8s opacity fade in/out, IBM Plex
 * Mono, big letter-spaced caps, an Acknowledge button.
 *
 * Dismiss paths: a timed auto-advance, or click / any key to skip. All paths
 * resolve through onDismiss exactly once (guarded), which the caller uses to
 * advance the intro sequence to the briefing.
 *
 * Determinism note: pure UI. Headless scenarios never render this component,
 * so there is zero hash / calibration risk. Animation timing uses
 * window.setTimeout for presentation only and never feeds sim state.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Z } from '../../shared/zIndex';
import { t } from '../i18n';

interface WarHasBegunSplashProps {
    /** Called exactly once when the splash is dismissed (auto, click, or key). */
    onDismiss: () => void;
    /**
     * Total visible lifetime before auto-advance, in milliseconds. The fade-out
     * occupies the last FADE_MS.
     */
    holdMs?: number;
}

const FADE_MS = 800;
const DEFAULT_HOLD_MS = 4200;

export function WarHasBegunSplash({ onDismiss, holdMs = DEFAULT_HOLD_MS }: WarHasBegunSplashProps) {
    // Mount readable immediately; visible only drives the fade-out dismissal.
    const [visible, setVisible] = useState(true);
    const dismissedRef = useRef(false);
    const timersRef = useRef<number[]>([]);

    const finish = useCallback(() => {
        if (dismissedRef.current) return;
        dismissedRef.current = true;
        for (const id of timersRef.current) window.clearTimeout(id);
        timersRef.current = [];
        onDismiss();
    }, [onDismiss]);

    // Skip → fade out, then dismiss after the fade completes.
    const skip = useCallback(() => {
        if (dismissedRef.current) return;
        setVisible(false);
        const id = window.setTimeout(finish, FADE_MS);
        timersRef.current.push(id);
    }, [finish]);

    useEffect(() => {
        // Begin fade-out so it completes right as the hold elapses.
        const fadeOutId = window.setTimeout(() => setVisible(false), Math.max(holdMs - FADE_MS, FADE_MS));
        // Auto-advance once the full hold has elapsed.
        const autoId = window.setTimeout(finish, holdMs);
        timersRef.current.push(fadeOutId, autoId);
        return () => {
            for (const id of timersRef.current) window.clearTimeout(id);
            timersRef.current = [];
        };
    }, [holdMs, finish]);

    // Any key skips.
    useEffect(() => {
        const handler = () => skip();
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [skip]);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={t('intro.warHasStarted')}
            onClick={skip}
            className="fixed inset-0 flex flex-col items-center justify-center"
            style={{
                zIndex: Z.TURN_AFTERMATH,
                backgroundColor: 'rgba(24, 4, 4, 0.94)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                opacity: visible ? 1 : 0,
                transition: `opacity ${FADE_MS}ms ease-in-out`,
                cursor: 'pointer',
            }}
        >
            <div
                className="text-center"
                style={{ maxWidth: '560px', padding: '40px' }}
            >
                <div
                    style={{
                        fontFamily: "'IBM Plex Mono', 'Consolas', monospace",
                        fontSize: '32px',
                        fontWeight: 700,
                        letterSpacing: '8px',
                        textTransform: 'uppercase',
                        marginBottom: '12px',
                        color: '#fff4de',
                        textShadow: '0 2px 18px rgba(0, 0, 0, 0.9), 0 0 22px rgba(255, 61, 0, 0.55)',
                    }}
                >
                    {t('intro.warHasStarted')}
                </div>
                <div
                    style={{
                        fontFamily: "'IBM Plex Mono', 'Consolas', monospace",
                        fontSize: '14px',
                        fontWeight: 400,
                        letterSpacing: '4px',
                        textTransform: 'uppercase',
                        color: 'rgba(255, 244, 222, 0.88)',
                        marginBottom: '28px',
                    }}
                >
                    {t('intro.warHasStartedDate')}
                </div>
                <hr
                    style={{
                        border: 'none',
                        borderTop: '1px solid rgba(255, 244, 222, 0.65)',
                        width: '180px',
                        margin: '0 auto 28px',
                        opacity: 0.4,
                    }}
                />
                <button
                    type="button"
                    onClick={skip}
                    style={{
                        padding: '12px 40px',
                        fontFamily: "'IBM Plex Mono', 'Consolas', monospace",
                        fontSize: '12px',
                        fontWeight: 600,
                        letterSpacing: '3px',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        background: '#fff4de',
                        border: '1px solid rgba(255, 244, 222, 0.85)',
                        borderRadius: '3px',
                        color: '#210909',
                    }}
                >
                    {t('intro.warHasStartedAcknowledge')}
                </button>
                <div
                    style={{
                        marginTop: '20px',
                        fontFamily: "'IBM Plex Mono', 'Consolas', monospace",
                        fontSize: '12px',
                        letterSpacing: '2px',
                        textTransform: 'uppercase',
                        color: 'rgba(255, 244, 222, 0.58)',
                    }}
                >
                    {t('intro.warHasStartedSkip')}
                </div>
            </div>
        </div>
    );
}

export default WarHasBegunSplash;
