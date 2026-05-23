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
import { t } from '../i18n';

const OPENING_BRIEFS: Record<string, { title: string; bullets: string[] }> = {
    RBiH: {
        title: 'Republic of Bosnia and Herzegovina',
        bullets: [
            'Hold Sarajevo, Tuzla, Zenica, Bihac, and other urban anchors while the army forms under fire.',
            'Keep the international record visible: diplomacy, civilian harm, and military survival are linked.',
            'Use Army HQ and the Decision Room to set priorities and approve operations through commanders.',
        ],
    },
    RS: {
        title: 'Republika Srpska',
        bullets: [
            'Exploit inherited JNA armor, artillery, and logistics before international pressure narrows the window.',
            'Secure connected territory and protect the Posavina corridor linking eastern and western holdings.',
            'Use Army HQ and the Decision Room to balance offensive pressure against exhaustion and legitimacy cost.',
        ],
    },
    HRHB: {
        title: 'Herzeg-Bosna',
        bullets: [
            'Protect Herzegovina and exposed Croat communities in central Bosnia while avoiding overextension.',
            'Manage the Sarajevo alliance and Zagreb patron pressure; either can shift faster than the front.',
            'Use Army HQ and the Decision Room to choose when to cooperate, resist, negotiate, or stand down.',
        ],
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
    dayton_negotiation: 'DAYTON',
    convoy_decision: 'CONVOY',
    paramilitary_request: 'PARAMILITARY',
    reserve_request: 'RESERVE',
    officer_event: 'PERSONNEL',
    operation_opportunity: 'OPPORTUNITY',
    autonomy_proposal: 'PROPOSAL',
    intelligence_notification: 'INTEL',
    situation: 'SITUATION',
};

function InboxCard({ item, onClick }: { item: InboxItem; onClick: () => void }) {
    const style = SEVERITY_STYLES[item.severity];
    const typeLabel = TYPE_LABELS[item.type] ?? item.type.toUpperCase();
    const isActionable = item.action !== 'none';

    if (item.type === 'intelligence_notification') {
        return (
            <div className={`w-full text-left p-2.5 rounded border ${style.border} bg-panel-card`}>
                <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${style.badge}`}>
                        {typeLabel}
                    </span>
                    <button
                        type="button"
                        onClick={onClick}
                        className="ml-auto text-[8px] font-bold uppercase tracking-widest text-text-secondary hover:text-white transition-colors"
                        aria-label={t('inbox.dismissIntel')}
                    >
                        {t('inbox.dismiss')}
                    </button>
                </div>
                <div className="text-[11px] font-bold text-text-primary leading-tight">{item.title}</div>
                <div className="text-[10px] text-text-secondary leading-snug mt-0.5">{item.subtitle}</div>
            </div>
        );
    }

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
                {(item.updateCount ?? 1) > 1 && (
                    <span className="ml-auto text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/8 text-text-secondary border border-white/10">
                        {t('inbox.updates', { count: (item.updateCount ?? 1) - 1 })}
                    </span>
                )}
            </div>
            <div className="text-[11px] font-bold text-text-primary leading-tight">{item.title}</div>
            <div className="text-[10px] text-text-secondary leading-snug mt-0.5">{item.subtitle}</div>
        </button>
    );
}

function OpeningBrief({
    faction,
    onDismiss,
    onOpenDecisionRoom,
}: {
    faction: string;
    onDismiss: () => void;
    onOpenDecisionRoom: () => void;
}) {
    const brief = OPENING_BRIEFS[faction];
    if (!brief) return null;

    return (
        <div className="p-3 rounded border border-accent-gold/30 bg-gradient-to-b from-panel-card to-transparent mb-3">
            <div className="text-[9px] font-bold uppercase tracking-widest text-accent-gold mb-1.5">
                Presidential Brief
            </div>
            <div className="text-[12px] font-bold text-text-primary mb-1">{brief.title}</div>
            <ul className="space-y-1 text-[10px] text-text-secondary leading-relaxed">
                {brief.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                        <span className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-accent-gold/70" />
                        <span>{bullet}</span>
                    </li>
                ))}
            </ul>
            <div className="mt-2.5 flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => {
                        onOpenDecisionRoom();
                        onDismiss();
                    }}
                    className="text-[9px] font-bold uppercase tracking-widest text-accent-gold hover:text-white transition-colors"
                >
                    Open Decision Room
                </button>
                <button
                    type="button"
                    onClick={onDismiss}
                    className="text-[9px] font-bold uppercase tracking-widest text-text-secondary hover:text-white transition-colors"
                >
                    Read later
                </button>
            </div>
        </div>
    );
}

function QuietInboxCapsule({ onOpenDecisionRoom }: { onOpenDecisionRoom: () => void }) {
    return (
        <div className="rounded border border-panel-border bg-panel-card/80 p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-accent-gold">
                        {t('inbox.commandWatch')}
                    </div>
                    <div className="mt-1 text-[12px] font-bold text-text-primary">
                        {t('inbox.noOrders')}
                    </div>
                    <div className="mt-1 text-[10px] leading-snug text-text-secondary">
                        {t('inbox.quietTurn')}
                    </div>
                </div>
                <div className="h-2 w-2 shrink-0 rounded-full bg-green-400/80 shadow-[0_0_10px_rgba(74,222,128,0.45)]" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
                <button
                    type="button"
                    onClick={onOpenDecisionRoom}
                    className="rounded border border-accent-gold/25 bg-accent-gold/8 px-2 py-2 text-left hover:bg-accent-gold/12 transition-colors"
                >
                    <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-accent-gold">
                        {t('inbox.decisionRoom')}
                    </div>
                    <div className="mt-0.5 text-[10px] leading-snug text-text-secondary">
                        {t('inbox.openDecisionRoom')}
                    </div>
                </button>
                <div className="rounded border border-panel-border/80 bg-black/10 px-2 py-2">
                    <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-text-primary">
                        {t('inbox.chronicle')}
                    </div>
                    <div className="mt-0.5 text-[10px] leading-snug text-text-secondary">
                        {t('inbox.latestRecordFiled')}
                    </div>
                </div>
            </div>
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
                        {t('inbox.title')}
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
                        onOpenDecisionRoom={() => onAction('army_hq_briefing', 'opening-brief:decision-room')}
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
                    <QuietInboxCapsule onOpenDecisionRoom={() => onAction('army_hq_briefing', 'empty:decision-room')} />
                )}

                {/* Situation divider + items */}
                {situationItems.length > 0 && (
                    <>
                        <div className="border-t border-panel-border/50 pt-2 mt-2">
                            <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-text-tertiary mb-1.5">
                                {t('inbox.situation')}
                            </div>
                        </div>
                        <div className="space-y-1">
                            {situationItems.map(item => (
                                <InboxCard
                                    key={item.id}
                                    item={item}
                                    onClick={() => onAction(item.action, item.id)}
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
                title={t('inbox.badgeTitleEmpty')}
            >
                {t('inbox.title')}
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
            title={t('inbox.badgeTitlePending', { count, decisionWord: t(count === 1 ? 'inbox.pendingDecision.one' : 'inbox.pendingDecision.many') })}
        >
            {t('inbox.title')} {count}
        </button>
    );
}
