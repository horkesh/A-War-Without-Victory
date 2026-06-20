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
import type { EventDefinition } from '../../../sim/events/event_types';
import { DETAIL_PANEL_STYLE } from './panelRail';
import { resolvePlayerFacingFaction } from '../../shared/playerVisibility';
import { t, type MessageKey } from '../i18n';

const OPENING_BRIEFS: Record<string, { titleKey: MessageKey; bulletKeys: MessageKey[] }> = {
    RBiH: {
        titleKey: 'inbox.openingBrief.RBiH.title',
        bulletKeys: [
            'inbox.openingBrief.RBiH.bullet.0',
            'inbox.openingBrief.RBiH.bullet.1',
            'inbox.openingBrief.RBiH.bullet.2',
        ],
    },
    RS: {
        titleKey: 'inbox.openingBrief.RS.title',
        bulletKeys: [
            'inbox.openingBrief.RS.bullet.0',
            'inbox.openingBrief.RS.bullet.1',
            'inbox.openingBrief.RS.bullet.2',
        ],
    },
    HRHB: {
        titleKey: 'inbox.openingBrief.HRHB.title',
        bulletKeys: [
            'inbox.openingBrief.HRHB.bullet.0',
            'inbox.openingBrief.HRHB.bullet.1',
            'inbox.openingBrief.HRHB.bullet.2',
        ],
    },
};

const SEVERITY_STYLES: Record<InboxSeverity, { badge: string; border: string; labelKey: MessageKey | null }> = {
    blocking: { badge: 'bg-red-500 text-white', border: 'border-red-500/40', labelKey: 'inbox.severity.blocking' },
    urgent: { badge: 'bg-amber-500 text-white', border: 'border-amber-500/30', labelKey: 'inbox.severity.urgent' },
    normal: { badge: 'bg-sky-600 text-white', border: 'border-sky-600/20', labelKey: null },
    info: { badge: 'bg-stone-600 text-stone-300', border: 'border-stone-600/20', labelKey: null },
};

export function typeLabel(type: string): string {
    if (type === 'event_decision') return t('inbox.type.eventDecision');
    if (type === 'peace_plan') return t('inbox.type.peacePlan');
    if (type === 'dayton_negotiation') return t('inbox.type.dayton');
    if (type === 'convoy_decision') return t('inbox.type.convoy');
    if (type === 'paramilitary_request') return t('inbox.type.paramilitary');
    if (type === 'reserve_request') return t('inbox.type.reserve');
    if (type === 'officer_event') return t('inbox.type.personnel');
    if (type === 'operation_opportunity') return t('inbox.type.opportunity');
    if (type === 'autonomy_proposal') return t('inbox.type.proposal');
    if (type === 'intelligence_notification') return t('inbox.type.intel');
    if (type === 'situation') return t('inbox.type.situation');
    return t('inbox.type.reviewItem');
}

function InboxCard({ item, onClick }: { item: InboxItem; onClick: () => void }) {
    const style = SEVERITY_STYLES[item.severity];
    const cardTypeLabel = typeLabel(item.type);
    const severityLabel = style.labelKey ? t(style.labelKey) : '';
    const isActionable = item.action !== 'none';

    if (item.type === 'intelligence_notification') {
        return (
            <div
                className={`w-full text-left p-2.5 rounded border ${style.border} bg-panel-card`}
                data-testid="presidential-inbox-card"
                data-inbox-item-id={item.id}
                data-inbox-item-type={item.type}
                data-inbox-action={item.action}
                data-actionable={isActionable ? 'true' : 'false'}
            >
                <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${style.badge}`}>
                        {cardTypeLabel}
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
            data-testid="presidential-inbox-card"
            data-inbox-item-id={item.id}
            data-inbox-item-type={item.type}
            data-inbox-action={item.action}
            data-actionable={isActionable ? 'true' : 'false'}
            className={`w-full text-left p-2.5 rounded border ${style.border} ${
                isActionable
                    ? 'bg-panel-card hover:bg-panel-card-hover cursor-pointer transition-colors'
                    : 'bg-transparent cursor-default'
            }`}
        >
            <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${style.badge}`}>
                    {severityLabel || cardTypeLabel}
                </span>
                {severityLabel && (
                    <span className="text-[8px] font-bold uppercase tracking-widest text-text-secondary">
                        {cardTypeLabel}
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
    onOpenDesk,
}: {
    faction: string;
    onDismiss: () => void;
    onOpenDesk: () => void;
}) {
    const brief = OPENING_BRIEFS[faction];
    if (!brief) return null;

    return (
        <div
            className="p-3 rounded border border-accent-gold/30 bg-gradient-to-b from-panel-card to-transparent mb-3"
            data-testid="presidential-inbox-opening-brief"
        >
            <div className="text-[9px] font-bold uppercase tracking-widest text-accent-gold mb-1.5">
                {t('inbox.openingBrief.label')}
            </div>
            <div className="text-[12px] font-bold text-text-primary mb-1">{t(brief.titleKey)}</div>
            <ul className="space-y-1 text-[10px] text-text-secondary leading-relaxed">
                {brief.bulletKeys.map((bulletKey) => (
                    <li key={bulletKey} className="flex gap-2">
                        <span className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-accent-gold/70" />
                        <span>{t(bulletKey)}</span>
                    </li>
                ))}
            </ul>
            {/* A4 onboarding — negative-sum thesis framing. Faction-agnostic
                footer so the very first surface the player reads names the
                real win/lose axis: there is no conquest victory; the war is
                judged at Dayton by its human cost. Mirrors the deck's beats
                1+3 at first contact. */}
            <p className="mt-2 border-t border-accent-gold/15 pt-2 text-[9px] italic leading-snug text-text-secondary/90">
                {t('inbox.openingBrief.thesis')}
            </p>
            <div className="mt-2.5 flex items-center justify-between gap-3">
                <button
                    type="button"
                    data-testid="presidential-inbox-opening-brief-open-desk"
                    onClick={() => {
                        onOpenDesk();
                        onDismiss();
                    }}
                    className="text-[9px] font-bold uppercase tracking-widest text-accent-gold hover:text-white transition-colors"
                >
                    {t('inbox.openDecisionRoom')}
                </button>
                <button
                    type="button"
                    data-testid="presidential-inbox-opening-brief-read-later"
                    onClick={onDismiss}
                    className="text-[9px] font-bold uppercase tracking-widest text-text-secondary hover:text-white transition-colors"
                >
                    {t('inbox.openingBrief.readLater')}
                </button>
            </div>
        </div>
    );
}

function QuietInboxCapsule({ onOpenDesk }: { onOpenDesk: () => void }) {
    return (
        <div className="rounded border border-panel-border bg-panel-card/80 p-3 space-y-2" data-testid="presidential-inbox-quiet-capsule">
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
                    onClick={onOpenDesk}
                    data-testid="presidential-inbox-quiet-open-desk"
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
    eventCatalog?: ReadonlyMap<string, EventDefinition>;
}

export function PresidentialInbox({ onAction, eventCatalog }: PresidentialInboxProps) {
    const state = useGameStore((s) => s.loadedGameState);
    const osidNameMap = useGameStore((s) => s.osidDisplayNames);
    const playerFaction = resolvePlayerFacingFaction(useGameStore.getState().loadedGameState);
    const briefDismissed = useGameStore((s) => s.openingBriefDismissed);
    const setBriefDismissed = useGameStore((s) => s.setOpeningBriefDismissed);

    const items = deriveInboxItems(state, osidNameMap, eventCatalog);
    const actionableCount = countActionableItems(items);
    const blocking = hasBlockingItems(items);

    const actionableItems = items.filter(i => i.type !== 'situation');
    const situationItems = items.filter(i => i.type === 'situation');

    return (
        <div
            style={{ ...DETAIL_PANEL_STYLE, width: '22rem' }}
            className="bg-panel-bg/95 backdrop-blur-sm border-l border-panel-border flex flex-col"
            data-testid="presidential-inbox"
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
                        onOpenDesk={() => onAction('decision_room', 'opening-brief:desk')}
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
                    <QuietInboxCapsule onOpenDesk={() => onAction('decision_room', 'empty:desk')} />
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

    const decisionLabel = t(count === 1 ? 'inbox.badge.decision.one' : 'inbox.badge.decision.many');

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
