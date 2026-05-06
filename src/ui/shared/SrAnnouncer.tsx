/**
 * SrAnnouncer — canonical screen-reader live-region announcer for AWWV.
 *
 * Authored by LANE-NIGHTSHIFT-V093-A11Y-LANE-E.
 * Closes audit AC C-E3 (Phase 0 panel `49375b5a`).
 *
 * Provides a Provider + `useSrAnnouncer()` hook so any component can call
 * `announce(msg, level)` to push text to either a polite or assertive
 * `aria-live` region. Both regions are mounted as `sr-only` siblings of the
 * provider's children and use `aria-atomic="true"` so screen readers re-read
 * the entire region content on update (per WCAG 4.1.3).
 *
 * The provider is intentionally NOT mounted at App root in this lane — the
 * App.tsx mount point is owned by Lane B (`LANE-NIGHTSHIFT-V093-A11Y-LANE-B`).
 * Lane E ships only the primitive; downstream consumers wire it up.
 *
 * Sensitive-history compliance: Ring 1, faction-agnostic, no §6 surface,
 * UI-only, no determinism path (state lives in React, never in GameState).
 */
import {
    createContext,
    useCallback,
    useContext,
    useState,
    type ReactNode,
} from 'react';

export type SrAnnounceLevel = 'polite' | 'assertive';

export interface SrAnnouncerCtx {
    /**
     * Announce `msg` to the screen reader. `level` defaults to `'polite'`,
     * which defers to user activity; use `'assertive'` only for blocking
     * errors or unrecoverable state changes (per WCAG / aria-live spec).
     */
    announce: (msg: string, level?: SrAnnounceLevel) => void;
}

const Ctx = createContext<SrAnnouncerCtx | null>(null);

export interface SrAnnouncerProviderProps {
    children: ReactNode;
}

export function SrAnnouncerProvider({ children }: SrAnnouncerProviderProps) {
    const [politeMsg, setPoliteMsg] = useState('');
    const [assertiveMsg, setAssertiveMsg] = useState('');

    const announce = useCallback(
        (msg: string, level: SrAnnounceLevel = 'polite') => {
            if (level === 'polite') {
                setPoliteMsg(msg);
            } else {
                setAssertiveMsg(msg);
            }
        },
        [],
    );

    return (
        <Ctx.Provider value={{ announce }}>
            {children}
            <div
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
                data-awwv-sr-announcer="polite"
            >
                {politeMsg}
            </div>
            <div
                aria-live="assertive"
                aria-atomic="true"
                className="sr-only"
                data-awwv-sr-announcer="assertive"
            >
                {assertiveMsg}
            </div>
        </Ctx.Provider>
    );
}

/**
 * Access the announcer from any component inside `<SrAnnouncerProvider>`.
 * Throws if called outside the provider — guards against silent miswire.
 */
export function useSrAnnouncer(): SrAnnouncerCtx {
    const ctx = useContext(Ctx);
    if (!ctx) {
        throw new Error('useSrAnnouncer must be used inside <SrAnnouncerProvider>');
    }
    return ctx;
}

export default SrAnnouncerProvider;
