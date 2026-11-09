import { COMPETENCY_PACKAGES } from '../../../sim/negotiation/competency_packages.js';
import { CONSTITUTIONAL_CHOICES, RETURN_JUSTICE_CHOICES } from '../../../sim/negotiation/constitutional_packages.js';
import { effectiveOperativePowers } from '../../../sim/negotiation/power_overlap.js';
import type { DaytonAgreementRecord } from '../../../state/negotiation_types.js';
import { t, type MessageKey } from '../i18n';

/**
 * The binder as treaty annexes (DC A4). The treaty reads as a treaty: Annex 1A (military),
 * Annex 2 (the boundary), Brčko (Annex 2, Article V), Annex 4 (the constitution), Annex 7 (return) and Annex 10
 * (the High Representative). Every clause carries a plain line on what it means for the player's
 * entity. One row per power: competencies come through `effectiveOperativePowers`, the
 * same projection the binder rows and the resolver use, so no power is shown twice.
 */
export type AnnexId = '1a' | '2' | 'brcko' | '4' | '7' | '10';

export interface AnnexClause {
    id: string;
    label: string;
    value: string;
    means: string;
}

export interface Annex {
    id: AnnexId;
    title: string;
    clauses: AnnexClause[];
}

type Entity = 'federation' | 'rs';
type Owner = 'state' | 'entity' | 'shared';

const DIAL_KEYS: Record<string, MessageKey> = {
    confederation: 'dayton.dial.confederation',
    'dayton-historical': 'dayton.dial.daytonHistorical',
    federalized: 'dayton.dial.federalized',
    unitary: 'dayton.dial.unitary',
};
const BRCKO_KEYS = { arbitration: 'dayton.brckoArbitration', rs: 'dayton.brckoRs', federation: 'dayton.brckoFederation' } as const;

/** The player's entity under the treaty: Republika Srpska for RS, the Federation otherwise. */
export function entityOf(faction: string | null | undefined): Entity {
    return faction === 'RS' ? 'rs' : 'federation';
}

const key = (k: string) => k as MessageKey;

function powerClause(id: string, owner: Owner, entity: Entity): AnnexClause {
    const power = t(key(`dayton.power.${id}`));
    return {
        id,
        label: power,
        value: t(`dayton.owner.${owner}`),
        means: t(key(`dayton.annex.owner.${owner}`), { power, entity: t(key(`dayton.annex.entity.${entity}`)) }),
    };
}

function choiceClause(id: string, option: string): AnnexClause {
    return {
        id,
        label: t(key(`dayton.choice.${id}`)),
        value: t(key(`dayton.choice.${id}.${option}`)),
        means: t(key(`dayton.choice.${id}.${option}.means`)),
    };
}

const DEFAULT_OPTION = (id: string) =>
    [...CONSTITUTIONAL_CHOICES, ...RETURN_JUSTICE_CHOICES].find(c => c.id === id)?.options.find(o => o.is_default)?.id ?? '';

/** Constitutional slots in Annex 4 (article order). ICTY cooperation is Annex 4, Article II(8); the High Representative is Annex 10. */
const ANNEX_4_CHOICES = ['arch_presidency', 'arch_veto_regime', 'arch_constituent_model', 'arch_const_court'];

export function treatyAnnexes(agreement: DaytonAgreementRecord, faction: string | null | undefined, signed: boolean): Annex[] {
    const { terms, map } = agreement;
    const entity = entityOf(faction);
    const effective = effectiveOperativePowers({
        institutional_choices: terms.institutional_choices,
        competency_allocation: terms.competency_allocation,
        constitutional_choices: terms.constitutional_choices,
    });
    const owner = (id: string): Owner => (effective.competency[id] ?? COMPETENCY_PACKAGES.find(p => p.id === id)?.default_owner ?? 'entity') as Owner;
    const policy = { ...effective.constitutional, ...(terms.return_justice ?? {}) };
    const option = (id: string) => policy[id] ?? DEFAULT_OPTION(id);

    const pct = (n: number | undefined) => (n ?? 0).toFixed(1);
    const fed = (map.territoryPct.RBiH ?? 0) + (map.territoryPct.HRHB ?? 0);
    const rs = map.territoryPct.RS ?? 0;
    const changed = Object.keys(map.controllers).filter(id => map.wartimeControllers[id] !== map.controllers[id]).length;
    const dial = terms.entity_autonomy ?? 'dayton-historical';
    const brcko = terms.brcko_status ?? 'arbitration';

    return [
        {
            id: '1a',
            title: t('dayton.annex.title.1a'),
            clauses: [
                { id: 'separation', label: t('dayton.annex.separation'), value: t('dayton.annex.separation.value'), means: t('dayton.annex.separation.means') },
                powerClause('comp_defense', owner('comp_defense'), entity),
            ],
        },
        {
            id: '2',
            title: t('dayton.annex.title.2'),
            clauses: [{
                id: 'boundary',
                label: t('dayton.annex.boundary'),
                value: t('dayton.annex.boundary.value', { fed: pct(fed), rs: pct(rs) }),
                means: t(signed ? 'dayton.annex.boundary.meansSigned' : 'dayton.annex.boundary.means', {
                    entity: t(key(`dayton.annex.entity.${entity}`)), pct: pct(entity === 'rs' ? rs : fed), changed,
                }),
            }],
        },
        {
            id: 'brcko',
            title: t('dayton.annex.title.brcko'),
            clauses: [{ id: 'brcko', label: t('dayton.annex.brckoLabel'), value: t(BRCKO_KEYS[brcko]), means: t(key(`dayton.annex.brcko.${brcko}`)) }],
        },
        {
            id: '4',
            title: t('dayton.annex.title.4'),
            clauses: [
                { id: 'autonomy', label: t('dayton.annex.dialLabel'), value: t(DIAL_KEYS[dial] ?? 'dayton.dial.daytonHistorical'), means: t(key(`dayton.annex.dial.${dial}`)) },
                ...ANNEX_4_CHOICES.map(id => choiceClause(id, option(id))),
                ...COMPETENCY_PACKAGES.filter(p => p.id !== 'comp_defense').map(p => powerClause(p.id, owner(p.id), entity)),
                choiceClause('rj_icty_cooperation', option('rj_icty_cooperation')),
            ],
        },
        {
            id: '7',
            title: t('dayton.annex.title.7'),
            clauses: [choiceClause('rj_refugee_return', option('rj_refugee_return'))],
        },
        {
            id: '10',
            title: t('dayton.annex.title.10'),
            clauses: [choiceClause('arch_ohr_authority', option('arch_ohr_authority'))],
        },
    ];
}
