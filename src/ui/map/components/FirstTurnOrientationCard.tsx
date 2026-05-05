/**
 * First-turn orientation card (NIGHTSHIFT-G2).
 *
 * One-time onboarding overlay shown after the side picker on a fresh save.
 * Dismissal is persisted in localStorage under `awwv_seen_first_turn_intro`.
 *
 * Pure UI — routes through canonical shellNavigation helpers (`openArmyHQTab`,
 * `openChronicle`, `openCodex`) and the warroom `advance-turn` handoff. Does
 * NOT touch Decision Room / Pre-Advance / Warroom data files.
 *
 * Determinism: pure render. localStorage is read at mount in App.tsx and
 * passed in via the `view` prop; this component only writes on dismiss.
 */

import { useGameStore } from '../store/gameStore';
import { Z } from '../../shared/zIndex';
import {
    openChronicle,
    openCodex,
} from '../utils/shellNavigation';
import type {
    FirstTurnOrientationItem,
    FirstTurnOrientationView,
} from '../data/firstTurnOrientation';

export const FIRST_TURN_INTRO_STORAGE_KEY = 'awwv_seen_first_turn_intro';

export interface FirstTurnOrientationCardProps {
    view: FirstTurnOrientationView | null;
    onDismiss: () => void;
}

function persistSeenFlag(): void {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(FIRST_TURN_INTRO_STORAGE_KEY, '1');
        }
    } catch {
        // localStorage unavailable (private mode, SSR, etc.) — silently no-op.
    }
}

function dispatchItem(item: FirstTurnOrientationItem): void {
    const gs = useGameStore.getState();
    const target = item.target;
    if (target.kind === 'inbox-home') {
        // The Inbox surface is the default tactical rail panel — revealed by
        // clearing all entity selections (mirrors openInboxHome in App.tsx).
        gs.setSelectedOsid(null);
        gs.setSelectedFormationId(null);
        gs.setSelectedCorpsId(null);
        gs.setSelectedCorpsFrontSectorId(null);
        gs.setSelectedArmyId(null);
        gs.setSelectedArmyHqId(null);
        gs.setSelectedOperationKey(null);
        gs.setSelectedOrbatCorpsId(null);
        return;
    }
    if (target.kind === 'chronicle') {
        openChronicle(gs);
        return;
    }
    if (target.kind === 'codex') {
        openCodex(gs);
        return;
    }
    if (target.kind === 'advance-turn') {
        // Warroom advance-turn handoff — show the React advance-turn confirmation
        // modal without leaving the tactical map.
        gs.setAdvanceTurnPending?.(true);
        return;
    }
}

export function FirstTurnOrientationCard({ view, onDismiss }: FirstTurnOrientationCardProps) {
    if (!view) return null;

    const handleDismiss = () => {
        persistSeenFlag();
        onDismiss();
    };

    const handleItem = (item: FirstTurnOrientationItem) => {
        dispatchItem(item);
        // Visiting any surface counts as having seen the intro.
        persistSeenFlag();
        onDismiss();
    };

    return (
        <div
            className="fixed inset-0 flex items-center justify-center bg-black/55"
            style={{ zIndex: Z.MODAL_HARD }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="first-turn-intro-headline"
        >
            <div
                className="w-[440px] max-w-[92vw] rounded-lg border border-[#8a7a60]/35 shadow-2xl p-5 flex flex-col gap-3"
                style={{
                    background: 'rgba(26, 24, 21, 0.97)',
                    backdropFilter: 'blur(8px)',
                }}
            >
                <div className="flex items-center justify-between border-b border-[#8a7a60]/20 pb-2">
                    <div
                        id="first-turn-intro-headline"
                        className="text-[12px] uppercase tracking-[0.2em] text-[#c4a35a] font-bold"
                    >
                        {view.headline}
                    </div>
                </div>
                <div className="text-[12px] text-[#d5c9bc]/90 leading-relaxed">
                    {view.body}
                </div>
                <div className="flex flex-col gap-2 mt-1">
                    {view.items.map(item => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => handleItem(item)}
                            className="w-full text-left rounded border border-[#8a7a60]/25 px-3 py-2 hover:bg-[#8a7a60]/15 transition-colors"
                        >
                            <div className="text-[11px] uppercase tracking-wider font-bold text-[#d5c9bc]">
                                {item.label}
                            </div>
                            <div className="text-[10.5px] text-[#d5c9bc]/70 mt-0.5">
                                {item.description}
                            </div>
                        </button>
                    ))}
                </div>
                <div className="h-px bg-[#8a7a60]/20 my-1" />
                <button
                    type="button"
                    onClick={handleDismiss}
                    className="w-full py-2 rounded border border-[#8a7a60]/30 text-[11px] uppercase tracking-wider font-bold text-[#c4a35a] hover:bg-[#8a7a60]/15 transition-colors"
                >
                    {view.dismissLabel}
                </button>
            </div>
        </div>
    );
}
