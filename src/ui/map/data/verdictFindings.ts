/**
 * Cost-ledger findings as the Verdict shows them (R8 council fix 1: B5, C1, C3).
 *
 * The ledger's findings are frozen English inside the save. This layer rebuilds each known
 * finding's text from the ledger's structured fields in the active locale, so saves frozen
 * before the ending truth pass read correctly too: one card per finding id (older saves
 * repeated the paramilitary card at every band crossing), public sources only (no internal
 * design document is ever cited), and the Srebrenica finding in the historian's wording.
 */
import type { CostLedger, CostLedgerFinding } from '../../../sim/endgame/cost_ledger.js';
import { COST_LEDGER_SOURCES } from '../../../sim/endgame/cost_ledger.js';
import { t, type MessageKey } from '../i18n';
import { formatCount } from '../utils/formatters.js';

export interface DisplayFinding {
    id: string;
    category: CostLedgerFinding['category'];
    severity: CostLedgerFinding['severity'];
    faction?: string;
    title: string;
    text: string;
    sources: string[];
}

const FORCES_KEYS: Record<string, MessageKey> = {
    RBiH: 'verdict.forces.RBiH',
    RS: 'verdict.forces.RS',
    HRHB: 'verdict.forces.HRHB',
};

/** Responsible party named as forces (Sensitive History Design Gate §4). */
export function formatForcesName(faction: string | undefined): string {
    const key = faction ? FORCES_KEYS[faction] : undefined;
    return key ? t(key) : faction ?? '';
}

const COMMAND_KEYS: Record<string, MessageKey> = {
    RBiH: 'warCost.findingFaction.RBiH',
    RS: 'warCost.findingFaction.RS',
    HRHB: 'warCost.findingFaction.HRHB',
};

/** The authorizing command, as the ledger badges name it ("RS command"). */
function formatCommandName(faction: string): string {
    const key = COMMAND_KEYS[faction];
    return key ? t(key) : faction;
}

/** Fixed side order for per-side cards: never ranked by count (Ring 3 #7). */
function sideOrder(faction: string | undefined): number {
    const index = ['RBiH', 'RS', 'HRHB'].indexOf(faction ?? '');
    return index === -1 ? 3 : index;
}

function perSideKind(id: string): string | undefined {
    if (id.startsWith('war_crimes_record_')) return 'war_crimes_record';
    if (id.startsWith('paramilitary_war_crimes_findings_')) return 'paramilitary';
    return undefined;
}

/** Sources a player-facing finding may cite: public ones only (court, archive, agreement). */
function publicSources(sources: readonly string[]): string[] {
    return sources.filter(source => !/design gate|pyrrhic scoring|section \d|§/i.test(source));
}

function parseCount(text: string, pattern: RegExp): number | undefined {
    const match = pattern.exec(text);
    if (!match?.[1]) return undefined;
    const value = Number.parseInt(match[1].replace(/,/g, ''), 10);
    return Number.isFinite(value) ? value : undefined;
}

function localize(finding: CostLedgerFinding, ledger: CostLedger): Pick<DisplayFinding, 'title' | 'text' | 'sources'> {
    const id = finding.id;
    if (id === 'human_cost_record') {
        return {
            title: t('warCost.finding.humanCost.title'),
            text: t('warCost.finding.humanCost.text', {
                military: formatCount(ledger.total_military_killed),
                civilian: formatCount(ledger.total_civilian_killed),
            }),
            sources: [],
        };
    }
    if (id === 'civilian_displacement_record') {
        const total = ledger.entries.reduce((sum, entry) => sum + Math.max(0, entry.refugees_created), 0);
        return {
            title: t('warCost.finding.displacement.title'),
            text: t('warCost.finding.displacement.text', { count: formatCount(total) }),
            sources: [],
        };
    }
    if (id === 'rupture_srebrenica_genocide_1995') {
        return {
            title: t('warCost.finding.srebrenica.title'),
            text: t('warCost.finding.srebrenica.text'),
            sources: [COST_LEDGER_SOURCES.srebrenica],
        };
    }
    if (id.startsWith('war_crimes_record_') && finding.faction) {
        const entry = ledger.entries.find(candidate => candidate.faction === finding.faction);
        if (entry) {
            const forces = formatForcesName(finding.faction);
            // Count only: the civilian and displacement figures are booked by control or siege,
            // not culpability (§4 panel, red-team A8).
            return {
                title: t('warCost.finding.warCrimes.title', { forces }),
                text: t(entry.war_crimes_events === 1 ? 'warCost.finding.warCrimes.textOne' : 'warCost.finding.warCrimes.text', {
                    events: formatCount(entry.war_crimes_events),
                    forces,
                }),
                sources: [],
            };
        }
    }
    if (id.startsWith('paramilitary_war_crimes_findings_') && finding.faction) {
        const count = parseCount(finding.text, /([\d,]+) paramilitary/);
        if (count !== undefined) {
            const command = formatCommandName(finding.faction);
            return {
                title: t('warCost.finding.paramilitary.title', { command }),
                text: t(count === 1 ? 'warCost.finding.paramilitary.textOne' : 'warCost.finding.paramilitary.text', {
                    count: formatCount(count),
                    command,
                }),
                sources: [],
            };
        }
    }
    if (id === 'early_peace_implementation_record') {
        return { title: t('warCost.finding.earlyPeace.title'), text: finding.text, sources: [] };
    }
    return { title: finding.title, text: finding.text, sources: publicSources(finding.sources) };
}

/** The ledger's findings for display: one per id (the last one recorded wins), localized. */
export function buildDisplayFindings(ledger: CostLedger | undefined): DisplayFinding[] {
    const lastIndexById = new Map<string, number>();
    const findings = ledger?.findings ?? [];
    findings.forEach((finding, index) => lastIndexById.set(finding.id, index));
    const kept = findings.filter((finding, index) => lastIndexById.get(finding.id) === index);
    // Per-side cards of one kind keep the first card's place but run RBiH, RS, HRHB (older
    // saves sorted the war-crimes cards by count).
    const ordered: CostLedgerFinding[] = [];
    const placed = new Set<string>();
    for (const finding of kept) {
        const kind = perSideKind(finding.id);
        if (!kind) {
            ordered.push(finding);
            continue;
        }
        if (placed.has(kind)) continue;
        placed.add(kind);
        ordered.push(...kept
            .filter(candidate => perSideKind(candidate.id) === kind)
            .sort((a, b) => sideOrder(a.faction) - sideOrder(b.faction)));
    }
    return ordered
        .map(finding => ({
            id: finding.id,
            category: finding.category,
            severity: finding.severity,
            faction: finding.faction,
            ...localize(finding, ledger!),
        }));
}
