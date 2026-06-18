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
import { resolveEventIllustration } from '../data/eventIllustrationArt';
import { t, type MessageKey } from '../i18n';
import { isDisplayEventEffectKind } from '../utils/eventEffectDisplay';

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

    return (
        <Modal
            isOpen={true}
            onClose={onAcknowledge}
            zIndex={Z.GLASS_PANEL_EVENT_MODAL}
            ariaLabelledBy="event-modal-title"
            backdropClassName="bg-black/50 backdrop-blur-sm"
            panelClassName="relative bg-panel-bg/95 backdrop-blur-md border border-[rgba(180,160,130,0.15)] shadow-xl rounded-lg overflow-hidden animate-slideUp"
            panelStyle={{ width: '520px', maxHeight: '84vh' }}
            testIdBackdrop="event-modal-backdrop"
            testIdPanel="event-modal-panel"
        >
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[rgba(180,160,130,0.15)]">
                <h2
                    className="text-accent-gold uppercase tracking-[0.22em] text-[12px] font-black leading-none"
                    style={{ textShadow: '0 0 8px rgba(196,163,90,0.3)' }}
                >
                    {t('event.title')}
                </h2>
                <button
                    onClick={onAcknowledge}
                    className="text-text-secondary hover:text-accent-gold transition-colors text-base leading-none"
                    aria-label={t('common.close')}
                >
                    &times;
                </button>
            </div>
            <div className="overflow-y-auto px-2.5 py-2" style={{ maxHeight: 'calc(84vh - 38px)' }}>
            {/* Queue indicator */}
            {queueTotal != null && queueTotal > 1 && (
                <div className="text-right text-xs mb-2" style={{ color: '#8a8578' }}>
                    {t('event.queuePosition', { position: queuePosition ?? 1, total: queueTotal })}
                </div>
            )}

            {/* Dispatch paper container */}
            <div
                className="rounded-md overflow-hidden relative"
                style={{
                    background: 'linear-gradient(165deg, #f0e8d8 0%, #e8dfc8 40%, #e0d8c0 100%)',
                    boxShadow: 'inset 0 0 30px rgba(0,0,0,0.05)',
                }}
            >
                {/* Documentary-realism illustration — rendered ONLY when the event
                    authors an `image` and the asset resolves. Absent → nothing here,
                    so the text-only dispatch layout is byte-identical to before. */}
                {illustration && (
                    <div className="relative w-full" data-testid="event-modal-illustration">
                        <img
                            src={illustration}
                            alt=""
                            aria-hidden="true"
                            className="block w-full object-cover"
                            style={{ aspectRatio: '16 / 9' }}
                        />
                        {/* Bottom fade into the paper so the still seats into the dispatch. */}
                        <div
                            aria-hidden="true"
                            className="absolute inset-x-0 bottom-0 h-1/4 pointer-events-none"
                            style={{
                                background: 'linear-gradient(to top, rgba(224,216,192,0.9), rgba(224,216,192,0))',
                            }}
                        />
                    </div>
                )}

                {/* Subtle paper noise */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.03]"
                    style={{
                        backgroundImage: 'repeating-conic-gradient(#000 0.0001%, transparent 0.0002%)',
                        backgroundSize: '80px 80px',
                    }}
                />

                {/* Category stamp — top-right corner, rotated */}
                <div
                    className="absolute top-3 right-3 px-3 py-1.5 border-2 rounded-sm font-bold uppercase tracking-[0.2em] text-xs select-none"
                    style={{
                        transform: 'rotate(-4deg)',
                        borderColor: cat.color,
                        color: cat.color,
                        opacity: 0.7,
                        backgroundColor: `${cat.bg}15`,
                    }}
                >
                    <div className="flex items-center gap-1.5">
                        <Icon name={cat.icon} size={12} color={cat.color} />
                        {cat.labelKey === 'event.category.unknown' ? event.category.toUpperCase() : t(cat.labelKey)}
                    </div>
                </div>

                <div className="p-5 relative">
                    {/* Faction impact badges */}
                    {factions.length > 0 && (
                        <div className="flex items-center gap-1.5 mb-3">
                            {factions.map(fid => (
                                <span
                                    key={fid}
                                    className="text-[10px] px-2 py-0.5 rounded font-bold tracking-wider"
                                    style={{
                                        backgroundColor: `${FACTION_COLORS[fid] ?? '#888'}18`,
                                        color: FACTION_COLORS[fid] ?? '#888',
                                        border: `1px solid ${FACTION_COLORS[fid] ?? '#888'}40`,
                                    }}
                                >
                                    {getPlayerSafePoliticalFactionName(fid)}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Title — typewriter style on paper */}
                    <h3
                        id="event-modal-title"
                        className="text-lg font-bold mb-3 pr-24"
                        style={{ color: '#3a3228', fontFamily: 'Georgia, serif' }}
                    >
                        {event.title}
                    </h3>

                    {/* Narrative body — field report style */}
                    <p
                        className="text-sm leading-relaxed mb-4"
                        style={{ color: '#4a4438', fontFamily: "'Courier New', monospace", lineHeight: '1.7' }}
                    >
                        {event.narrative}
                    </p>

                    {/* Effect preview — on paper, subtle box */}
                    {mechanicalEffects.length > 0 && (
                        <div
                            className="mb-4 p-3 rounded-sm"
                            style={{
                                backgroundColor: 'rgba(60,50,35,0.06)',
                                border: '1px solid rgba(60,50,35,0.12)',
                            }}
                        >
                            <div
                                className="text-[10px] uppercase tracking-[0.15em] mb-2 font-bold"
                                style={{ color: '#8a7e68' }}
                            >
                                {t('event.intelligenceAssessment')}
                            </div>
                            <ul className="space-y-1.5">
                                {mechanicalEffects.map((e, i) => (
                                    <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#5a5040' }}>
                                        <Icon
                                            name={EFFECT_ICONS[e.kind] ?? 'star'}
                                            size={11}
                                            color="#8a7e68"
                                        />
                                        <span>{e.description}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Acknowledge — non-decision events only. Presidential decisions
                        are executed by PresidentialAttentionPanel, not here. */}
                    <div className="flex justify-end pt-2">
                        <button
                            onClick={onAcknowledge}
                            className="px-5 py-2 rounded-sm text-sm font-bold uppercase tracking-wider transition-all"
                            style={{
                                backgroundColor: 'rgba(60,80,50,0.12)',
                                color: '#5a6a4a',
                                border: '1px solid rgba(60,80,50,0.25)',
                                fontFamily: 'Georgia, serif',
                            }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(60,80,50,0.22)';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(60,80,50,0.12)';
                            }}
                        >
                            {t('event.acknowledged')}
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </Modal>
    );
}
