/**
 * v0.4.1 Phase 5: Event Modal.
 * Displays a non-decision fired event with narrative, effects preview, and
 * faction impact badges. Renders an "Acknowledged" button and auto-dismisses.
 *
 * Ownership boundary: this modal does NOT execute presidential event decisions.
 * Those are owned by EventDecisionModal, launched from pending_event_decisions
 * or President's Desk inbox clicks, and execute the single decision response path.
 *
 * Uses the shared Modal wrapper with dispatch paper inner content.
 */
import { Icon, type IconName } from './icons/Icon';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';
import type { EventEffect } from '../../../sim/events/event_types';
import { getPlayerSafeDisplayLabel, getPlayerSafePoliticalFactionName } from '../utils/playerSafeText';
import { resolveEventIllustration, section6StillAlt } from '../data/eventIllustrationArt';
import { t, type MessageKey } from '../i18n';
import { isDisplayEventEffectKind } from '../utils/eventEffectDisplay';
import {
    SurfaceCloseButton,
    SurfaceColumns,
    SurfaceDetail,
    SurfaceHeader,
    SURFACE_CHIP,
    SURFACE_LABEL,
    SURFACE_MODAL_BACKDROP,
    SURFACE_MODAL_PANEL_COMPACT,
    SURFACE_PRIMARY_BUTTON,
} from './surface/Surface';

/** Display-ready event data for the modal. */
export interface EventDisplayData {
    id: string;
    title: string;
    narrative: string;
    category: string;
    effects: Array<{ kind: string; description: string }>;
    isDecision: boolean;
    responseOptions?: Array<{ id: string; label: string; description?: string }>;
    image?: string;
}

export interface EventModalProps {
    event: EventDisplayData;
    queuePosition?: number;
    queueTotal?: number;
    onAcknowledge: () => void;
}

const FACTION_COLORS: Record<string, string> = {
    RBiH: '#4a9eff',
    RS: '#e05050',
    HRHB: '#50b850',
};

const CATEGORY_CONFIG: Record<string, { bg: string; color: string; labelKey: MessageKey; icon: IconName }> = {
    military: { bg: '#6b3030', color: '#c08080', labelKey: 'event.category.military', icon: 'offensive' },
    political: { bg: '#4a3a6b', color: '#a090c0', labelKey: 'event.category.political', icon: 'balanced' },
    humanitarian: { bg: '#6b5a30', color: '#c0b080', labelKey: 'event.category.humanitarian', icon: 'personnel' },
    diplomatic: { bg: '#305a6b', color: '#80b0c0', labelKey: 'event.category.diplomatic', icon: 'recon' },
    economic: { bg: '#3a6b3a', color: '#80c080', labelKey: 'event.category.economic', icon: 'supply' },
    command: { bg: '#5a4a3a', color: '#c0a890', labelKey: 'event.category.command', icon: 'star' },
    territorial: { bg: '#3a5a4a', color: '#80c0a0', labelKey: 'event.category.territorial', icon: 'home' },
};

const EFFECT_ICONS: Record<string, IconName> = {
    morale_change: 'morale',
    supply_delta: 'supply',
    cohesion_change: 'cohesion',
    humanitarian_impact: 'dead',
    patron_pressure: 'recon',
    alliance_change: 'balanced',
    negotiation_capital: 'star',
    equipment_grant: 'tanks',
    aggression_modifier: 'offensive',
};

/**
 * Engine/audit-only effect kinds that must NOT surface in the player-facing
 * Intelligence Assessment box. These are internal tuning knobs (recruitment /
 * equipment modifiers, bot-priority / doctrine constraints, alliance locks) or
 * endgame-ledger audit annotations — they have no curated `describeEventEffect`
 * label, so they would otherwise render as raw machine kinds (e.g.
 * "recruitment_modifier") or long prosecutorial ledger text. Most prominent on
 * `csq_*` consequence events (surfaced once consequences.json joined the modal
 * def-loader); filtered here so consequence notifications show only their
 * narrative + genuinely player-facing state changes.
 */
/** Extract faction IDs mentioned in effects for impact badges. */
function extractFactions(effects: EventDisplayData['effects']): string[] {
    const factions = new Set<string>();
    for (const e of effects) {
        for (const fid of ['RBiH', 'RS', 'HRHB']) {
            if (e.description.includes(fid)) factions.add(fid);
        }
    }
    return Array.from(factions).sort();
}

function formatAllianceLabel(): string {
    return `${getPlayerSafePoliticalFactionName('RBiH')} / ${getPlayerSafePoliticalFactionName('HRHB')} alliance`;
}

/** Describe an EventEffect for display. Reuses logic from EventDecisionModal. */
export function describeEventEffect(effect: EventEffect): string {
    switch (effect.kind) {
        case 'narrative': return effect.text;
        case 'morale_change': return `${getPlayerSafePoliticalFactionName(effect.faction)} morale ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
        case 'supply_delta': return `${getPlayerSafePoliticalFactionName(effect.faction)} supply ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
        case 'cohesion_change': return `${getPlayerSafePoliticalFactionName(effect.faction)} cohesion ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
        case 'humanitarian_impact': return `${getPlayerSafePoliticalFactionName(effect.faction)} humanitarian impact${effect.war_crimes_delta ? ` (${effect.war_crimes_delta > 0 ? '+' : ''}${effect.war_crimes_delta})` : ''}`;
        case 'patron_pressure': return `${getPlayerSafePoliticalFactionName(effect.faction)} patron pressure ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
        case 'alliance_change': return `${formatAllianceLabel()} ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
        case 'negotiation_capital': return `${getPlayerSafePoliticalFactionName(effect.faction)} ${getPlayerSafeDisplayLabel(effect.dimension, effect.dimension)} ${effect.delta > 0 ? '+' : ''}${effect.delta}`;
    }
    return effect.kind;
}

export function EventModal({ event, queuePosition, queueTotal, onAcknowledge }: EventModalProps) {
    const cat = CATEGORY_CONFIG[event.category] ?? { bg: '#444', color: '#aaa', labelKey: 'event.category.unknown', icon: 'star' as IconName };
    const factions = extractFactions(event.effects);
    const mechanicalEffects = event.effects.filter(
        e => !e.description.startsWith('[narrative]') && isDisplayEventEffectKind(e.kind),
    );
    // Optional documentary-realism illustration. Resolves to null when the event
    // authors no `image` key (every shipped event today) OR the asset is not yet
    // on disk — in both cases the text-only layout below is unchanged.
    const illustration = resolveEventIllustration(event.image);
    // A §6 still is record, never decoration: it carries its factual alt and is read by
    // assistive technology. Any other still is decorative beside the narrative.
    const illustrationAlt = section6StillAlt(event.image);

    // Surface redesign (owner, 2026-11-10): a short notice in the Command Surface's style —
    // the still and the report on the left, what it changes and the single Acknowledged
    // action on the right, in a footer that never scrolls away.
    return (
        <Modal
            isOpen={true}
            onClose={onAcknowledge}
            zIndex={Z.GLASS_PANEL_EVENT_MODAL}
            ariaLabelledBy="event-modal-title"
            backdropClassName={SURFACE_MODAL_BACKDROP}
            panelClassName={`relative animate-slideUp ${SURFACE_MODAL_PANEL_COMPACT}`}
            testIdBackdrop="event-modal-backdrop"
            testIdPanel="event-modal-panel"
        >
            <SurfaceHeader
                eyebrow={t('event.title')}
                title={<span id="event-modal-title">{event.title}</span>}
                trailing={queueTotal != null && queueTotal > 1 ? (
                    <span className="text-[16px] text-[#b9ad94]">
                        {t('event.queuePosition', { position: queuePosition ?? 1, total: queueTotal })}
                    </span>
                ) : undefined}
                close={<SurfaceCloseButton onClick={onAcknowledge} aria-label={t('common.close')} />}
            />
            <SurfaceColumns layout={mechanicalEffects.length > 0 ? 'content-detail' : 'single'}>
                <div
                    className="flex min-h-0 flex-col overflow-y-auto"
                    data-testid="event-modal-scroll-region"
                >
                    {/* Documentary-realism illustration — rendered ONLY when the event
                        authors an `image` and the asset resolves. */}
                    {illustration && (
                        <div className="relative w-full shrink-0" data-testid="event-modal-illustration">
                            <img
                                src={illustration}
                                alt={illustrationAlt ?? ''}
                                aria-hidden={illustrationAlt ? undefined : 'true'}
                                className="block max-h-80 w-full object-cover"
                                style={{ aspectRatio: '16 / 9' }}
                            />
                        </div>
                    )}
                    <div className="flex flex-col gap-4 px-8 py-6">
                        <div
                            data-testid="event-modal-metadata-row"
                            className="flex flex-wrap items-center justify-between gap-3"
                        >
                            <div
                                data-testid="event-modal-faction-badges"
                                className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                            >
                                {factions.map(fid => (
                                    <span
                                        key={fid}
                                        className="rounded border px-3 py-1 text-[14px] font-semibold"
                                        style={{
                                            color: FACTION_COLORS[fid] ?? '#888',
                                            borderColor: `${FACTION_COLORS[fid] ?? '#888'}66`,
                                        }}
                                    >
                                        {getPlayerSafePoliticalFactionName(fid)}
                                    </span>
                                ))}
                            </div>
                            <div
                                data-testid="event-modal-category-stamp"
                                className={`${SURFACE_CHIP} flex shrink-0 items-center gap-2`}
                                style={{ borderColor: cat.color, color: cat.color }}
                            >
                                <Icon name={cat.icon} size={14} color={cat.color} />
                                {t(cat.labelKey)}
                            </div>
                        </div>
                        <p className="m-0 text-[18px] leading-relaxed text-[#ddd1b3]">
                            {event.narrative}
                        </p>
                    </div>
                </div>

                {mechanicalEffects.length > 0 && (
                    <SurfaceDetail>
                        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
                            <div className={`pb-3 ${SURFACE_LABEL}`}>
                                {t('event.intelligenceAssessment')}
                            </div>
                            <ul className="m-0 flex list-none flex-col gap-2 p-0">
                                {mechanicalEffects.map((e, i) => (
                                    <li key={i} className="flex items-start gap-2.5 text-[16px] leading-relaxed text-[#ddd1b3]">
                                        <span className="mt-1 shrink-0">
                                            <Icon
                                                name={EFFECT_ICONS[e.kind] ?? 'star'}
                                                size={15}
                                                color="#c9a75c"
                                            />
                                        </span>
                                        <span>{e.description}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </SurfaceDetail>
                )}
            </SurfaceColumns>
            {/* Keep the only completion action visible while long dispatches scroll. */}
            <div
                className="flex shrink-0 justify-end border-t border-[#262b35] bg-[#12161e] px-7 py-4"
                data-testid="event-modal-action-bar"
            >
                <button
                    data-testid="event-notice-acknowledge"
                    data-event-id={event.id}
                    onClick={onAcknowledge}
                    className={SURFACE_PRIMARY_BUTTON}
                >
                    {t('event.acknowledged')}
                </button>
            </div>
        </Modal>
    );
}
