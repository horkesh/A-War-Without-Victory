/**
 * Verdict figures with their basis (R8 council fix 1, B6/B7): every territory, casualty and
 * displacement figure on the Verdict says what it counts. The council found three casualty
 * totals and three territory shares on the ending, none labelled; this is the one place the
 * Verdict's per-side figures are built, and a row cannot be built without a basis.
 *
 * Display only: every value is read from the frozen verdict or the end-of-war control map.
 */
import type { FactionVerdict } from '../../../state/negotiation_types.js';
import { t } from '../i18n';
import { formatCount } from '../utils/formatters.js';

export type VerdictFigureKind = 'territory' | 'casualty' | 'displacement' | 'force' | 'record';

export interface VerdictFigureRow {
    id: string;
    kind: VerdictFigureKind;
    label: string;
    value: string;
    /** What the figure counts. Never empty for territory, casualty or displacement rows. */
    basis: string;
}

/** Settlements held at the end of the war, read from the operational-settlement control map. */
export interface FrontLineHolding {
    held: number;
    total: number;
}

/**
 * Count settlements held per side from a control map, reading operational-settlement ids
 * (`op:` keys) only. The map lookup also carries census-key aliases for older consumers;
 * counting those double-counted settlements (R8 council B7: "39.3% (323 settlements)").
 */
export function countFrontLineHoldings(controllers: Readonly<Record<string, string | null>> | undefined): Record<string, FrontLineHolding> {
    const held: Record<string, number> = {};
    let total = 0;
    for (const [id, controller] of Object.entries(controllers ?? {})) {
        if (!id.startsWith('op:')) continue;
        total++;
        if (typeof controller === 'string') held[controller] = (held[controller] ?? 0) + 1;
    }
    const out: Record<string, FrontLineHolding> = {};
    for (const faction of ['RBiH', 'RS', 'HRHB']) out[faction] = { held: held[faction] ?? 0, total };
    return out;
}

function pct(value: number): string {
    return `${value.toFixed(1)}%`;
}

export interface FactionFigureInput {
    verdict: FactionVerdict;
    frontLine: FrontLineHolding;
    /** True when a signed settlement's map graded the territory (Dayton or an accepted plan). */
    settled: boolean;
    brigadeCount: number;
    personnel: number;
}

/** Per-side figures of the Verdict report, each with its basis, in display order. */
export function buildFactionFigureRows({ verdict, frontLine, settled, brigadeCount, personnel }: FactionFigureInput): VerdictFigureRow[] {
    const rows: VerdictFigureRow[] = [];
    const cap = verdict.capital_breakdown;
    if (cap) {
        rows.push({
            id: 'territory_graded',
            kind: 'territory',
            label: t('verdict.figure.territoryGraded'),
            value: pct(cap.territory_controlled_pct),
            basis: t(settled ? 'verdict.basis.territorySettled' : 'verdict.basis.territoryFront'),
        });
    }
    if (frontLine.total > 0) {
        rows.push({
            id: 'settlements_held',
            kind: 'territory',
            label: t('verdict.figure.settlementsHeld'),
            value: t('verdict.figure.settlementsHeldValue', {
                held: formatCount(frontLine.held),
                total: formatCount(frontLine.total),
                pct: pct((frontLine.held / frontLine.total) * 100),
            }),
            basis: t('verdict.basis.settlementsFront'),
        });
    }
    if (!cap) return rows;
    rows.push(
        {
            id: 'area_held',
            kind: 'territory',
            label: t('verdict.figure.areaHeld'),
            value: `${formatCount(Math.round(cap.territory_controlled_km2))} km²`,
            basis: t('verdict.basis.areaFront'),
        },
        {
            id: 'active_brigades',
            kind: 'force',
            label: t('verdict.report.stat.activeBrigades'),
            value: String(brigadeCount),
            basis: t('verdict.basis.forceEnd'),
        },
        {
            id: 'personnel',
            kind: 'force',
            label: t('verdict.report.stat.personnel'),
            value: formatCount(personnel),
            basis: t('verdict.basis.forceEnd'),
        },
        {
            id: 'combat_losses_taken',
            kind: 'casualty',
            label: t('verdict.figure.combatLossesTaken'),
            value: formatCount(cap.military_casualties_taken),
            basis: t('verdict.basis.combatLosses'),
        },
        {
            id: 'combat_losses_inflicted',
            kind: 'casualty',
            label: t('verdict.figure.combatLossesInflicted'),
            value: formatCount(cap.military_casualties_inflicted),
            basis: t('verdict.basis.combatLosses'),
        },
        {
            id: 'population_held',
            kind: 'displacement',
            label: t('verdict.figure.populationHeld'),
            value: formatCount(cap.civilians_under_protection),
            basis: t('verdict.basis.populationHeld'),
        },
        {
            id: 'displaced_or_killed',
            kind: 'displacement',
            label: t('verdict.report.stat.refugeesCreated'),
            value: formatCount(cap.refugees_created),
            basis: t('verdict.basis.displacedBooked'),
        },
        {
            id: 'refugees_received',
            kind: 'displacement',
            label: t('verdict.report.stat.refugeesReceived'),
            value: formatCount(cap.refugees_received),
            basis: t('verdict.basis.refugeesReceived'),
        },
        {
            id: 'operations_launched',
            kind: 'record',
            label: t('verdict.report.stat.operationsLaunched'),
            value: String(cap.operations_launched),
            basis: t('verdict.basis.campaignRecord'),
        },
        {
            id: 'operations_successful',
            kind: 'record',
            label: t('verdict.report.stat.operationsSuccessful'),
            value: String(cap.operations_successful),
            basis: t('verdict.basis.campaignRecord'),
        },
    );
    if (cap.war_crimes_events > 0) {
        rows.push({
            id: 'war_crimes_events',
            kind: 'record',
            label: t('verdict.report.stat.warCrimesEvents'),
            value: String(cap.war_crimes_events),
            basis: t('verdict.basis.warCrimesRecord'),
        });
    }
    return rows;
}
