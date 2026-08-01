/**
 * Front Visit Section — the player-initiated presidential FRONT VISIT action.
 *
 * A leadership/morale gesture (Presidential Command Surface design §10): the
 * president visits the front, force-queuing the authored visit_to_front_<faction>
 * event (morale +5 / cohesion +3 / patron_pressure -3 / standing shifts) so the
 * EventDecisionModal surfaces the branch choice. Costs FRONT_VISIT_COST (10) CA;
 * cooldown/cap use the event's voluntary action cadence (max_fires 5 / cooldown 10t).
 *
 * ⚠ ENCLAVE REACHABILITY GATE: the president CANNOT visit a CUT-OFF enclave
 * (Srebrenica/Žepa/Goražde, Bihać-when-encircled). Availability + reachable
 * branches are computed server-side (initiate-front-visit / get-front-visit-
 * availability IPC) from the supply-connectivity signal; this component only
 * RENDERS the result (button enabled/disabled + reason). Cut-off fronts are
 * never offered.
 *
 * Lives in the Command & Personnel area (PersonnelContent) per the design's
 * six-category card taxonomy. Pure presentation; no determinism touch (player-
 * IPC-only).
 */

import { useCallback, useEffect, useState } from 'react';
import { CollapsibleSection } from './CollapsibleSection';
import { useIPC } from '../../desktop/useIPC';
import { useGameStore } from '../../store/gameStore';
import { turnToDateString } from '../../utils/formatters';
import { FRONT_VISIT_COST } from '../../utils/commandAuthority';
import { t } from '../../i18n';

interface FrontVisitAvailability {
    available: boolean;
    reason: string | null;
    firesLeft: number;
    maxFires: number;
    cooldownUntil: number | null;
    onCooldown: boolean;
    reachableBranchIds: string[];
    unreachableBranchIds: string[];
}

/** Human-readable front label from a gated branch id. */
function frontLabel(branchId: string): string {
    switch (branchId) {
        case 'visit_sarajevo': return 'Sarajevo';
        case 'visit_eastern_front': return 'Tuzla / the corridor';
        case 'visit_bihac': return 'Bihać';
        case 'visit_posavina': return 'the Posavina corridor';
        case 'visit_sarajevo_lines': return 'the Sarajevo lines';
        case 'visit_drina_front': return 'the Drina front';
        case 'visit_mostar_front': return 'Mostar';
        case 'visit_central_bosnia': return 'central Bosnia';
        case 'visit_posavina_hrhb': return 'the Posavina front';
        default: return branchId;
    }
}

function strictCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

export function FrontVisitSection() {
    const ipc = useIPC();
    const setLoadError = useGameStore((s) => s.setLoadError);
    // Re-fetch availability whenever the loaded state changes (turn advance,
    // territory flips, CA spend). loadedGameState identity changes on each sync.
    const loadedGameState = useGameStore((s) => s.loadedGameState);

    const [avail, setAvail] = useState<FrontVisitAvailability | null>(null);
    const [busy, setBusy] = useState(false);

    const refresh = useCallback(async () => {
        if (!ipc.isAvailable) { setAvail(null); return; }
        const r = await ipc.getFrontVisitAvailability();
        if (!r.ok) { setAvail(null); return; }
        setAvail({
            available: !!r.available,
            reason: r.reason ?? null,
            firesLeft: r.firesLeft ?? 0,
            maxFires: r.maxFires ?? 0,
            cooldownUntil: r.cooldownUntil ?? null,
            onCooldown: !!r.onCooldown,
            reachableBranchIds: r.reachableBranchIds ?? [],
            unreachableBranchIds: r.unreachableBranchIds ?? [],
        });
    }, [ipc]);

    useEffect(() => {
        void refresh();
    }, [refresh, loadedGameState]);

    const handleVisit = useCallback(async () => {
        if (!ipc.isAvailable || busy) return;
        setBusy(true);
        try {
            const r = await ipc.initiateFrontVisit();
            if (!r.ok) {
                setLoadError(r.error ?? t('frontVisit.error'));
            }
            // On success the handler pushes a pending decision + syncs state;
            // EventDecisionModal will surface it. Refresh availability either way.
            await refresh();
        } finally {
            setBusy(false);
        }
    }, [ipc, busy, setLoadError, refresh]);

    // Desktop-only affordance. In browser mode (no IPC), render nothing.
    if (!ipc.isAvailable || !avail) return null;

    const canVisit = avail.available && !busy;
    const reachableLabels = avail.reachableBranchIds.map(frontLabel).sort(strictCompare).join(', ');
    const unreachableLabels = avail.unreachableBranchIds.map(frontLabel).sort(strictCompare).join(', ');

    return (
        <div className="bg-panel-card border border-panel-border rounded-lg overflow-hidden">
        <CollapsibleSection
            sectionKey="front-visit"
            title={t('frontVisit.title')}
            defaultOpen={true}
        >
            <div className="flex flex-col gap-2">
                <p className="text-xs text-text-secondary leading-snug">
                    {t('frontVisit.stake')}
                </p>

                {/* Availability readout */}
                <div className="flex flex-col gap-0.5 text-xs text-text-secondary font-mono">
                    {avail.firesLeft > 0 ? (
                        <span>{t('frontVisit.firesLeft', { count: avail.firesLeft })}</span>
                    ) : (
                        <span className="text-red-400/80">{t('frontVisit.firesExhausted')}</span>
                    )}
                    {avail.onCooldown && avail.cooldownUntil != null && (
                        <span className="text-amber-400/80">
                            {t('frontVisit.cooldown', { date: turnToDateString(avail.cooldownUntil) })}
                        </span>
                    )}
                    {avail.reachableBranchIds.length === 0 && avail.firesLeft > 0 && !avail.onCooldown && (
                        <span className="text-red-400/80">{t('frontVisit.allCutOff')}</span>
                    )}
                    {avail.reachableBranchIds.length > 0 && (
                        <span className="text-emerald-300/75">
                            {t('frontVisit.reachable', { fronts: reachableLabels })}
                        </span>
                    )}
                    {avail.unreachableBranchIds.length > 0 && (
                        <span className="text-amber-400/70">
                            {t('frontVisit.someCutOff', { fronts: unreachableLabels })}
                        </span>
                    )}
                </div>

                {/* Action button */}
                <button
                    type="button"
                    disabled={!canVisit}
                    onClick={(e) => { e.stopPropagation(); void handleVisit(); }}
                    className={`w-full text-xs font-bold uppercase tracking-wider px-3 py-1.5 border transition-colors text-left ${
                        canVisit
                            ? 'border-emerald-600/50 text-emerald-400 bg-emerald-900/20 hover:bg-emerald-900/40 hover:border-emerald-500/70 cursor-pointer'
                            : 'border-panel-border text-text-secondary bg-panel-bg/40 cursor-not-allowed'
                    }`}
                    title={t('frontVisit.buttonTitle', { cost: FRONT_VISIT_COST })}
                >
                    {t('frontVisit.button')} {t('frontVisit.cost', { cost: FRONT_VISIT_COST })}
                </button>
            </div>
        </CollapsibleSection>
        </div>
    );
}
