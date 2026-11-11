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
import { deriveInboxItems, countActionableItems } from '../data/inboxItems';
import type { InboxItem } from '../data/inboxItems';
import type { EventDefinition } from '../../../sim/events/event_types';
import type { CSSProperties } from 'react';
import { DETAIL_PANEL_STYLE } from './panelRail';
import { resolvePlayerFacingFaction } from '../../shared/playerVisibility';
import { t, type MessageKey } from '../i18n';
import { hasFiledRecord } from '../data/filedRecordTruth';
import { shouldShowOpeningBrief } from '../data/openingBriefGate';

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

/**
 * Dossier mount: a folder on the president's desk, lower and narrower than the
 * map rail, so the Warroom plate stays in view. Exported for the material test.
 */
export const DOSSIER_LAYOUT = Object.freeze({
    top: '34%',
    width: '24rem',
    right: '1.25rem',
    // Clears the floating Find (Ctrl/⌘ K) button below it (R8 RBiH attempt 08).
    bottomGap: '3rem',
});

const PANEL_STYLE: CSSProperties = { ...DETAIL_PANEL_STYLE, width: '25rem' };
const DOSSIER_STYLE: CSSProperties = {
    ...DETAIL_PANEL_STYLE,
    width: DOSSIER_LAYOUT.width,
    top: DOSSIER_LAYOUT.top,
    right: DOSSIER_LAYOUT.right,
    bottom: `calc(var(--awwv-bottom-bar-clearance, 2.5rem) + ${DOSSIER_LAYOUT.bottomGap})`,
    overflow: 'visible',
};
const PANEL_CLASS = 'bg-[#11141b] border-l border-accent-gold/35 flex flex-col text-text-primary';
const DOSSIER_CLASS = 'flex flex-col rounded-lg border border-accent-gold/35 bg-[#11141b] text-text-primary shadow-[0_30px_90px_rgba(0,0,0,0.65)]';
const DOSSIER_TAB_CLASS = 'pointer-events-none absolute -top-7 left-4 rounded-t-md border border-b-0 border-accent-gold/50 bg-paper px-3 py-1 font-mono text-[13px] font-semibold uppercase tracking-[0.16em] text-panel-bg shadow-[0_-1px_2px_rgba(0,0,0,0.25)]';

const PRIORITY_STYLES: Record<InboxItem['priorityBand'], { badge: string; border: string; labelKey: MessageKey }> = {
    required: { badge: 'bg-red-500 text-neutral-950', border: 'border-red-500/40', labelKey: 'decisionRoom.metric.required' },
    recommended: { badge: 'bg-amber-500 text-neutral-950', border: 'border-amber-500/30', labelKey: 'decisionRoom.metric.recommended' },
    monitor: { badge: 'bg-sky-600 text-neutral-950', border: 'border-sky-600/20', labelKey: 'decisionRoom.metric.monitor' },
    record: { badge: 'bg-stone-600 text-stone-200', border: 'border-stone-600/20', labelKey: 'decisionRoom.metric.record' },
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

// Surface redesign (2026-11-10): the Inbox keeps its place (map rail, desk dossier) but
// reads in the surface style — opaque, 13–18px text, mono gold labels, full-size buttons.
const CARD_LABEL = 'uppercase font-mono text-[13px] font-semibold tracking-[0.14em] text-[#b9ad94]';
const BADGE_CLASS = 'rounded px-2 py-0.5 font-mono text-[13px] font-semibold';

export function InboxCard({ item, onClick }: { item: InboxItem; onClick: () => void }) {
    const style = PRIORITY_STYLES[item.priorityBand];
    const cardTypeLabel = typeLabel(item.type);
    const priorityLabel = t(style.labelKey);
    const isActionable = item.action !== 'none';

    if (item.type === 'intelligence_notification') {
        return (
            <div
                className={`flex w-full flex-col gap-1.5 rounded-md border ${style.border} bg-[#161a22] px-4 py-3 text-left`}
                data-testid="presidential-inbox-card"
                data-inbox-item-id={item.id}
                data-inbox-item-type={item.type}
                data-inbox-action={item.action}
                data-actionable={isActionable ? 'true' : 'false'}
                data-priority-band={item.priorityBand}
                data-threat-severity={item.severity}
            >
                <div className="flex items-center gap-2">
                    <span className={`${BADGE_CLASS} ${style.badge}`}>
                        {priorityLabel}
                    </span>
                    <span className={CARD_LABEL}>
                        {cardTypeLabel}
                    </span>
                    <button
                        type="button"
                        onClick={onClick}
                        className="ml-auto h-9 rounded-md border border-[#3a4150] px-3 text-[14px] font-semibold text-[#e8dcbc] transition hover:border-accent-gold/60"
                        aria-label={t('inbox.dismissIntel')}
                    >
                        {t('inbox.dismiss')}
                    </button>
                </div>
                <div className="text-[16px] font-semibold leading-snug text-[#f1e6c8]">{item.title}</div>
                <div className="text-[15px] leading-snug text-[#c2b69c]">{item.subtitle}</div>
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
            data-priority-band={item.priorityBand}
            data-threat-severity={item.severity}
            className={`flex w-full flex-col gap-1.5 rounded-md border px-4 py-3 text-left ${style.border} ${
                isActionable
                    ? 'bg-[#161a22] cursor-pointer transition hover:border-[#c9a75c] hover:bg-[#1b2029]'
                    : 'bg-transparent cursor-default'
            }`}
        >
            <div className="flex items-center gap-2">
                <span className={`${BADGE_CLASS} ${style.badge}`}>
                    {priorityLabel}
                </span>
                <span className={CARD_LABEL}>
                    {cardTypeLabel}
                </span>
                {(item.updateCount ?? 1) > 1 && (
                    <span className="ml-auto rounded border border-[#3a4150] px-2 py-0.5 text-[13px] font-semibold text-[#b9ad94]">
                        {t('inbox.updates', { count: (item.updateCount ?? 1) - 1 })}
                    </span>
                )}
            </div>
            <div className="text-[16px] font-semibold leading-snug text-[#f1e6c8]">{item.title}</div>
            <div className="text-[15px] leading-snug text-[#c2b69c]">{item.subtitle}</div>
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
            className="flex flex-col gap-3 rounded-md border border-accent-gold/35 bg-[#161a22] p-4"
            data-testid="presidential-inbox-opening-brief"
        >
            <div className="uppercase font-mono text-[13px] font-semibold tracking-[0.16em] text-[#e0c27a]">
                {t('inbox.openingBrief.label')}
            </div>
            <div className="text-[19px] font-semibold leading-snug text-[#f1e6c8]">{t(brief.titleKey)}</div>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[15px] leading-relaxed text-[#ddd1b3]">
                {brief.bulletKeys.map((bulletKey) => (
                    <li key={bulletKey} className="grid grid-cols-[0.875rem_minmax(0,1fr)] gap-2">
                        <span aria-hidden="true" className="text-[#c9a75c]">•</span>
                        <span>{t(bulletKey)}</span>
                    </li>
                ))}
            </ul>
            {/* A4 onboarding — negative-sum thesis framing. Faction-agnostic
                footer so the very first surface the player reads names the
                real win/lose axis: there is no conquest victory; the war is
                judged at Dayton by its human cost. Mirrors the deck's beats
                1+3 at first contact. */}
            <p className="m-0 border-t border-[#262b35] pt-3 text-[15px] italic leading-relaxed text-[#c2b69c]">
                {t('inbox.openingBrief.thesis')}
            </p>
            <div className="flex flex-col gap-2">
                <button
                    type="button"
                    data-testid="presidential-inbox-opening-brief-open-desk"
                    onClick={() => {
                        onOpenDesk();
                        onDismiss();
                    }}
                    className="h-12 rounded-md bg-[#c9a75c] px-5 text-[16px] font-bold text-[#15120b] transition hover:bg-[#d8b86c]"
                >
                    {t('inbox.openDesk')}
                </button>
                <button
                    type="button"
                    data-testid="presidential-inbox-opening-brief-read-later"
                    onClick={onDismiss}
                    className="h-11 rounded-md border border-[#3a4150] bg-[#1b2029] px-5 text-[15px] font-semibold text-[#e8dcbc] transition hover:border-accent-gold/60"
                >
                    {t('inbox.openingBrief.readLater')}
                </button>
            </div>
        </div>
    );
}

function QuietInboxCapsule({ onOpenDesk, recordFiled }: { onOpenDesk: () => void; recordFiled: boolean }) {
    return (
        <div className="flex flex-col gap-3 rounded-md border border-[#2a303c] bg-[#161a22] p-4" data-testid="presidential-inbox-quiet-capsule">
            <div className="flex flex-col gap-1">
                <div className="uppercase font-mono text-[13px] font-semibold tracking-[0.16em] text-[#e0c27a]">
                    {t('inbox.commandWatch')}
                </div>
                <div className="text-[17px] font-semibold text-[#f1e6c8]">
                    {t('inbox.noOrders')}
                </div>
                <div className="text-[15px] leading-snug text-[#c2b69c]">
                    {t('inbox.quietTurn')}
                </div>
            </div>
            <button
                type="button"
                onClick={onOpenDesk}
                data-testid="presidential-inbox-quiet-open-desk"
                className="flex flex-col gap-0.5 rounded-md border border-accent-gold/35 bg-[#1b2029] px-4 py-2.5 text-left transition hover:border-[#c9a75c]"
            >
                <span className="text-[16px] font-semibold text-[#e0c27a]">{t('inbox.decisionRoom')}</span>
                <span className="text-[14px] leading-snug text-[#b9ad94]">{t('inbox.openDesk')}</span>
            </button>
            <div className="flex flex-col gap-0.5 px-1">
                <span className="text-[15px] font-semibold text-[#ddd1b3]">{t('inbox.chronicle')}</span>
                <span className="text-[14px] leading-snug text-[#9c917b]">
                    {t(recordFiled ? 'inbox.latestRecordFiled' : 'inbox.noRecordFiledYet')}
                </span>
            </div>
        </div>
    );
}

interface PresidentialInboxProps {
    onAction: (action: InboxItem['action'], itemId: string) => void;
    eventCatalog?: ReadonlyMap<string, EventDefinition>;
    /**
     * `panel` (default): the full-height right rail used on the tactical map.
     * `dossier`: a folder on the president's desk — lower, narrower, with a tab — so
     * the Warroom plate (corkboard map, whiteboard date, flag) stays in view.
     * Presentation only; items, actions and the badge are identical.
     */
    material?: 'panel' | 'dossier';
}

export function PresidentialInbox({ onAction, eventCatalog, material = 'panel' }: PresidentialInboxProps) {
    const state = useGameStore((s) => s.loadedGameState);
    const osidNameMap = useGameStore((s) => s.osidDisplayNames);
    const playerFaction = resolvePlayerFacingFaction(useGameStore.getState().loadedGameState);
    const briefDismissed = useGameStore((s) => s.openingBriefDismissed);
    const setBriefDismissed = useGameStore((s) => s.setOpeningBriefDismissed);

    const items = deriveInboxItems(state, osidNameMap, eventCatalog);
    const actionableCount = countActionableItems(items);
    const blocking = items.some((item) => item.priorityBand === 'required');

    const actionableItems = items.filter(i => i.type !== 'situation');
    const situationItems = items.filter(i => i.type === 'situation');
    const openingBriefPending = shouldShowOpeningBrief(state, briefDismissed);
    const recordFiled = hasFiledRecord(state);
    const dossier = material === 'dossier';

    return (
        <div
            style={dossier ? DOSSIER_STYLE : PANEL_STYLE}
            className={dossier ? DOSSIER_CLASS : PANEL_CLASS}
            data-testid="presidential-inbox"
            data-material={dossier ? 'dossier' : undefined}
            data-awwv-counter-occluder="true"
        >
            {dossier && (
                <div
                    aria-hidden="true"
                    data-testid="presidential-inbox-tab"
                    className={DOSSIER_TAB_CLASS}
                >
                    {t('inbox.title')}
                </div>
            )}
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#262b35] bg-[#141821] px-4 py-3">
                <span className="text-[18px] font-semibold text-[#f1e6c8]">
                    {t('inbox.title')}
                </span>
                {actionableCount > 0 && (
                    <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 font-mono text-[14px] font-semibold ${
                        blocking ? 'bg-red-300 text-[#15120b]' : 'bg-[#e0b45a] text-[#15120b]'
                    }`}>
                        {actionableCount}
                    </span>
                )}
            </div>

            {/* Scrollable content */}
            <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3 py-3">
                {/* Opening brief (first turn only) */}
                {openingBriefPending && playerFaction && (
                    <OpeningBrief
                        faction={playerFaction}
                        onDismiss={() => setBriefDismissed(true)}
                        onOpenDesk={() => onAction('decision_room', 'opening-brief:desk')}
                    />
                )}

                {/* Actionable items */}
                {actionableItems.length > 0 && (
                    <div className="flex flex-col gap-2">
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
                {actionableItems.length === 0 && !openingBriefPending && (
                    <QuietInboxCapsule
                        recordFiled={recordFiled}
                        onOpenDesk={() => onAction('decision_room', 'empty:desk')}
                    />
                )}

                {/* Situation divider + items */}
                {situationItems.length > 0 && (
                    <>
                        <div className="mt-2 border-t border-[#262b35] pt-3">
                            <div className="uppercase font-mono text-[13px] font-semibold tracking-[0.16em] text-[#e0c27a]">
                                {t('inbox.situation')}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
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
    const blocking = items.some((item) => item.priorityBand === 'required');

    if (count === 0) {
        return (
            <button
                type="button"
                onClick={onClick}
                className="text-[13px] font-bold uppercase tracking-[0.1em] text-text-secondary hover:text-text-primary transition-colors px-2 py-1"
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
            className={`text-[13px] font-bold uppercase tracking-[0.1em] px-2 py-1 rounded transition-colors ${
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
