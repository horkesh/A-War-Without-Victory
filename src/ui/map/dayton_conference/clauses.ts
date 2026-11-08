import { COMPETENCY_PACKAGES } from '../../../sim/negotiation/competency_packages.js';
import { CONSTITUTIONAL_CHOICES, RETURN_JUSTICE_CHOICES } from '../../../sim/negotiation/constitutional_packages.js';
import { effectiveOperativePowers } from '../../../sim/negotiation/power_overlap.js';
import type { DaytonAgreementRecord, DaytonProposal } from '../../../state/negotiation_types.js';
import type { LoadedGameState } from '../data/types';
import { t } from '../i18n';

type PendingDayton = NonNullable<LoadedGameState['pendingDayton']>;
type TerritoryPackage = PendingDayton['territorialPackages'][number];
type Proposal = Pick<DaytonProposal, 'territorial_demands' | 'territorial_concessions' | 'institutional_choices' | 'entity_autonomy' | 'constitutional_choices' | 'return_justice'>
    & { competency_allocation?: Record<string, string> };

export type DaytonClause = { id: string; label: string; before: string; after: string } & (
    { kind: 'map'; osids?: readonly string[] } | { kind: 'binder' }
);

const dialKeys = {
    confederation: 'dayton.dial.confederation',
    'dayton-historical': 'dayton.dial.daytonHistorical',
    federalized: 'dayton.dial.federalized',
    unitary: 'dayton.dial.unitary',
} as const;

export const brckoKeys = { arbitration: 'dayton.brckoArbitration', rs: 'dayton.brckoRs', federation: 'dayton.brckoFederation' } as const;

function brckoLabel(status: DaytonAgreementRecord['terms']['brcko_status']) {
    return status ? t(brckoKeys[status]) : t('dayton.conference.termUnavailable');
}

/**
 * One row per power. The six legacy toggles are not listed: each is carried by its
 * competency or constitutional row (power_overlap.ts), and a legacy-only term is
 * shown through that row's effective value, so the binder never prints two answers
 * for police, defense, education, the courts, taxation or the presidency.
 */
export function institutionalRows(terms: Omit<Proposal, 'territorial_demands' | 'territorial_concessions'>, defaults = false) {
    const dial = terms.entity_autonomy ?? (defaults ? 'dayton-historical' : undefined);
    const effective = effectiveOperativePowers({
        institutional_choices: terms.institutional_choices,
        competency_allocation: terms.competency_allocation as Record<string, 'state' | 'entity' | 'shared'> | undefined,
        constitutional_choices: terms.constitutional_choices,
    });
    const competencies = effective.competency;
    const policy = { ...effective.constitutional, ...terms.return_justice };
    const options = [...CONSTITUTIONAL_CHOICES, ...RETURN_JUSTICE_CHOICES];
    return [
        ...(dial ? [{ id: 'autonomy', label: t('dayton.dialTitle'), value: t(dialKeys[dial]) }] : []),
        ...(defaults ? COMPETENCY_PACKAGES.map(pkg => pkg.id).sort() : Object.keys(competencies).sort()).map(id => {
            const pkg = COMPETENCY_PACKAGES.find(item => item.id === id);
            const owner = competencies[id] ?? pkg?.default_owner;
            return { id, label: pkg?.label ?? id, value: t(`dayton.owner.${owner as 'state' | 'entity' | 'shared'}`) };
        }),
        ...(defaults ? options.map(item => item.id).sort() : Object.keys(policy).sort()).map(id => {
            const choice = options.find(item => item.id === id);
            const option = policy[id] ?? choice?.options.find(item => item.is_default)?.id;
            return { id, label: choice?.label ?? id, value: choice?.options.find(item => item.id === option)?.label ?? option ?? '' };
        }),
    ];
}

function institutionChanges(before: Parameters<typeof institutionalRows>[0], after: Parameters<typeof institutionalRows>[0], defaults = false): DaytonClause[] {
    const opening = new Map(institutionalRows(before, defaults).map(row => [row.id, row.value]));
    return institutionalRows(after, defaults).flatMap(({ id, label, value }) => {
        const previous = opening.get(id);
        return previous !== undefined && previous !== value ? [{ kind: 'binder', id, label, before: previous, after: value }] : [];
    });
}

export function counterClauses(before: Proposal, after: Proposal, packages: readonly TerritoryPackage[]): DaytonClause[] {
    const position = (draft: Proposal, id: string) => draft.territorial_demands.includes(id) ? t('dayton.conference.demand')
        : draft.territorial_concessions.includes(id) ? t('dayton.conference.concession') : t('dayton.conference.unraised');
    const territory = packages.flatMap(({ id, name, osids }): DaytonClause[] => {
        const previous = position(before, id);
        const next = position(after, id);
        return previous !== next ? [{ kind: 'map', id, label: name, osids, before: previous, after: next }] : [];
    });
    return [...territory, ...institutionChanges(before, after, true)];
}

export function recordedHolder(map: DaytonAgreementRecord['map'], osid: string, wartime = false) {
    if (!wartime && map.specialOsids.includes(osid)) return t('dayton.agreement.arbitration');
    return (wartime ? map.wartimeControllers[osid] : map.controllers[osid]) ?? t('dayton.agreement.unavailable');
}

export function reviewClauses(opening: DaytonAgreementRecord, current: DaytonAgreementRecord, packages: readonly TerritoryPackage[]): DaytonClause[] {
    const changed = new Set([...Object.keys(opening.map.controllers), ...Object.keys(current.map.controllers), ...opening.map.specialOsids, ...current.map.specialOsids]
        .filter(osid => recordedHolder(opening.map, osid) !== recordedHolder(current.map, osid)));
    const uncovered = new Set(changed);
    const territory = packages.flatMap(({ id, name, osids }): DaytonClause[] => {
        const brcko = id === 'brcko_district' && opening.terms.brcko_status !== current.terms.brcko_status;
        const members = osids?.filter(osid => changed.has(osid)) ?? [];
        if (!members.length && !brcko) return [];
        members.forEach(osid => uncovered.delete(osid));
        const holders = (map: DaytonAgreementRecord['map']) => [...new Set(members.map(osid => recordedHolder(map, osid)))].join(', ');
        return [{ kind: 'map', id, label: name, osids, before: brcko ? brckoLabel(opening.terms.brcko_status) : holders(opening.map),
            after: brcko ? brckoLabel(current.terms.brcko_status) : holders(current.map) }];
    });
    if (uncovered.size) territory.push({ kind: 'map', id: 'other-assignments', label: t('dayton.conference.otherAssignments'), osids: [...uncovered].sort(),
        before: t('dayton.conference.openingAssignments'), after: t('dayton.conference.currentAssignments') });
    return [...territory, ...institutionChanges(opening.terms, current.terms)];
}
