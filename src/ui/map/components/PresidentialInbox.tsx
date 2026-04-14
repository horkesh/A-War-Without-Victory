/**
 * PresidentialInbox — The president's decision queue.
 *
 * Persistent right-side panel that collects all pending decisions and
 * situational highlights. This IS the game loop for a presidential player.
 * Visible when nothing is selected on the map (home state).
 *
 * Canonical owner: this file.
 * Reads: inboxItems.ts (derived from LoadedGameState)
 * Routes to: existing modals/panels (EventModal, PeacePlanModal, ArmyReservePanel, ArmyHQ Personnel)
 */

import { useGameStore } from '../store/gameStore';
import { deriveInboxItems, countActionableItems, hasBlockingItems } from '../data/inboxItems';
import type { InboxItem, InboxSeverity } from '../data/inboxItems';
import { DETAIL_PANEL_STYLE } from './panelRail';
import { resolvePlayerFacingFaction } from '../../shared/playerVisibility';

const OPENING_BRIEFS: Record<string, { title: string; body: string }> = {
    RBiH: {
        title: 'Republic of Bosnia and Herzegovina',
        body: 'You are the president of Bosnia and Herzegovina. Your nation declared independence in March 1992, and the war has begun. The JNA and Bosnian Serb paramilitaries are seizing territory across the country. Your army is poorly armed \u2014 mostly rifles against tanks and artillery. Hold the major cities. Keep the international community engaged. Survive long enough to negotiate from strength. You command through Army HQ and your corps commanders. You set strategic direction and approve operations \u2014 you do not move brigades.',
    },
    RS: {
        title: 'Republika Srpska',
        body: 'You lead Republika Srpska. Your forces control the JNA\u2019s heavy equipment \u2014 tanks, artillery, logistics. Secure a contiguous territory connecting all Serb-majority areas. Control the Posavina corridor linking east and west. Force international recognition. Your military advantage is overwhelming but temporary \u2014 international pressure and war exhaustion will erode your position. Every month of war costs you diplomatic capital.',
    },
    HRHB: {
        title: 'Herzeg-Bosna',
        body: 'You lead Herzeg-Bosna, the Croatian community\u2019s wartime entity. Zagreb provides your political direction and military support. Secure Herzegovina as a Croat-majority region. Protect Croat communities in central Bosnia. Maintain the alliance with Sarajevo as long as it serves Croatian interests. You are caught between two larger forces. Your patron in Zagreb may order you to fight, negotiate, or stand down \u2014 and you may not always agree.',
    },
};

const SEVERITY_STYLES: Record<InboxSeverity, { badge: string; border: string; label: string }> = {
    blocking: { badge: 'bg-red-500 text-white', border: 'border-red-500/40', label: 'BLOCKING' },
    urgent: { badge: 'bg-amber-500 text-white', border: 'border-amber-500/30', label: 'URGENT' },
    normal: { badge: 'bg-sky-600 text-white', border: 'border-sky-600/20', label: '' },
    info: { badge: 'bg-stone-600 text-stone-300', border: 'border-stone-600/20', label: '' },
};

const TYPE_LABELS: Record<string, string> = {
    event_decision: 'DECISION',
    peace_plan: 'PEACE PLAN',
    reserve_request: 'RESERVE',
    officer_event: 'PERSONNEL',
    situation: 'SITUATION',
};

function InboxCard({ item, onClick }: { item: InboxItem; onClick: () => void }) {
    const style = SEVERITY_STYLES[item.severity];
    const typeLabel = TYPE_LABELS[item.type] ?? item.type.toUpperCase();
    const isActionable = item.action !== 'none';

    return (
        <button
            type="button"
            onClick={isActionable ? onClick : undefined}
            disabled={!isActionable}
            className={`w-full text-left p-2.5 rounded border ${style.border} ${
                isActionable
                    ? 'bg-panel-card hover:bg-panel-card-hover cursor-pointer transition-colors'
                    : 'bg-transparent cursor-default'
            }`}
        >
            <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${style.badge}`}>
                    {style.label || typeLabel}
                </span>
                {style.label && (
                    <span className="text-[8px] font-bold uppercase tracking-widest text-text-secondary">
                        {typeLabel}
                    </span>
                )}
            </div>
            <div className="text-[11px] font-bold text-text-primary leading-tight">{item.title}</div>
            <div className="text-[10px] text-text-secondary leading-snug mt-0.5">{item.subtitle}</div>
        </button>
    );
}

function OpeningBrief({ faction, onDismiss }: { faction: string; onDismiss: () => void }) {
    const brief = OPENING_BRIEFS[faction];
    if (!brief) return null;

    return (
        <div className="p-3 rounded border border-accent-gold/30 bg-gradient-to-b from-panel-card to-transparent mb-3">
            <div className="text-[9px] font-bold uppercase tracking-widest text-accent-gold mb-1.5">
                Presidential Brief
            </div>
            <div className="text-[12px] font-bold text-text-primary mb-1">{brief.title}</div>
            <div className="text-[10px] text-text-secondary leading-relaxed whitespace-pre-wrap">{brief.body}</div>
            <button
                type="button"
                onClick={onDismiss}
                className="mt-2.5 text-[9px] font-bold uppercase tracking-widest text-accent-gold hover:text-white transition-colors"
            >
                Understood \u2014 Begin
            </button>
        </div>
    );
}

interface PresidentialInboxProps {
    onAction: (action: InboxItem['action'], itemId: string) => void;
}

export function PresidentialInbox({ onAction }: PresidentialInboxProps) {
    const state = useGameStore((s) => s.loadedGameState);
    const osidNameMap = useGameStore((s) => s.osidDisplayNames);
    const playerFaction = resolvePlayerFacingFaction(useGameStore.getState().loadedGameState);
    const briefDismissed = useGameStore((s) => s.openingBriefDismissed);
    const setBriefDismissed = useGameStore((s) => s.setOpeningBriefDismissed);

    const items = deriveInboxItems(state, osidNameMap);
    const actionableCount = countActionableItems(items);
    const blocking = hasBlockingItems(items);

    const actionableItems = items.filter(i => i.type !== 'situation');
    const situationItems = items.filter(i => i.type === 'situation');

    return (
        <div
            style={{ ...DETAIL_PANEL_STYLE, width: '22rem' }}
            className="bg-panel-bg/95 backdrop-blur-sm border-l border-panel-border flex flex-col"
        >
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-panel-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-primary">
                        Presidential Inbox
                    </span>
                    {actionableCount > 0 && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            blocking ? 'bg-red-500 text-white' : 'bg-amber-500/80 text-white'
                        }`}>
                            {actionableCount}
                        </span>
                    )}
                </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2">
                {/* Opening brief (first turn only) */}
                {!briefDismissed && playerFaction && (
                    <OpeningBrief
                        faction={playerFaction}
                        onDismiss={() => setBriefDismissed(true)}
                    />
                )}

                {/* Actionable items */}
                {actionableItems.length > 0 && (
                    <div className="space-y-1.5">
                        {actionableItems.map(item => (
                            <InboxCard
                                key={item.id}
                                item={item}
                                onClick={() => onAction(item.action, item.id)}
                            />
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {actionableItems.length === 0 && briefDismissed && (
                    <div className="py-6 text-center">
                        <div className="text-[11px] text-text-secondary italic">
                            No pending decisions.
                        </div>
                        <div className="text-[10px] text-text-tertiary mt-1">
                            Advance the turn to continue.
                        </div>
                    </div>
                )}

                {/* Situation divider + items */}
                {situationItems.length > 0 && (
                    <>
                        <div className="border-t border-panel-border/50 pt-2 mt-2">
                            <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-text-tertiary mb-1.5">
                                Situation
                            </div>
                        </div>
                        <div className="space-y-1">
                            {situationItems.map(item => (
                                <InboxCard
                                    key={item.id}
                                    item={item}
                                    onClick={() => {}}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

/**
 * Toolbar badge component for PresidentialToolbar.
 * Shows actionable item count with severity coloring.
 */
export function InboxBadge({ onClick }: { onClick: () => void }) {
    const state = useGameStore((s) => s.loadedGameState);
    const osidNameMap = useGameStore((s) => s.osidDisplayNames);

    const items = deriveInboxItems(state, osidNameMap);
    const count = countActionableItems(items);
    const blocking = hasBlockingItems(items);

    if (count === 0) {
        return (
            <button
                type="button"
                onClick={onClick}
                className="text-[9px] font-bold uppercase tracking-[0.1em] text-text-secondary hover:text-text-primary transition-colors px-2 py-1"
                title="Presidential Inbox — no pending decisions"
            >
                Inbox
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={`text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-1 rounded transition-colors ${
                blocking
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
            }`}
            title={`Presidential Inbox — ${count} pending decision${count !== 1 ? 's' : ''}`}
        >
            Inbox {count}
        </button>
    );
}
