/**
 * Captured-ground packages for the Dayton negotiation (owner, 2026-11-07: "Any capture
 * territories become negotiable pieces in Dayton negotiations").
 *
 * The 8 fixed territorial packages are the areas actually argued over at Wright-Patterson.
 * On top of them, every municipality where the front line departs from the Dayton map
 * becomes a package of its own: the OSIDs in that municipality that one party holds
 * (the claimant) while the Dayton map gives them to another (the map assignee).
 *
 *  - Left unraised, the package follows the Dayton map (the assignee gets it). Bots and an
 *    unanswered menu therefore sign the historical map.
 *  - The claimant pays negotiation capital, scaled by the package's area, to demand it.
 *    The assignee must accept, or keep it in its counter-offer, or be overruled by its
 *    patron (override >= 75); otherwise the demand fails and the map stands.
 *  - The assignee may instead concede it to the claimant.
 *
 * The package's `default_holder` is the map assignee, so the existing demand/concede cost
 * model reads it unchanged: a demand costs the demander `capital_cost_to_demand` and costs
 * the assignee `capital_cost_to_concede` when it evaluates the proposal.
 *
 * Packages are derived on demand from current control and the Dayton map; they are not
 * persisted. The resolver rebuilds them from the state it signs, so a menu left open while
 * the front moves negotiates the front as it stands at signature. OSIDs covered by a
 * fixed package's keywords are left to that package. Special (shared/arbitration) cells
 * stay with their wartime holder on the map and never differ.
 *
 * Determinism: pure over state and constant JSON; sorted iteration (strictCompare).
 */
import type { FactionId, GameState } from '../../state/game_state.js';
import type { DaytonProposal, TerritorialPackage } from '../../state/negotiation_types.js';
import { strictCompare } from '../../state/validateGameState.js';
import { computeSettlementControllers, getSettlementAdjacency } from './peace_settlement.js';
import { TERRITORIAL_PACKAGES } from './territorial_packages.js';
import { resolveOsidsForKeywords } from './package_area_resolver.js';
import osidAreasJson from '../../../data/derived/operational/osid_areas.json';
import munNamesJson from '../../../data/derived/mun1990_names.json';

/** Id prefix of a captured-ground package: `front:<municipality>:<claimant>:<assignee>`. */
export const FRONT_PACKAGE_PREFIX = 'front:';

const OSID_AREAS: { total_area_km2: number; areas: Record<string, number> } = osidAreasJson;
const MUN_NAMES: Record<string, { display_name?: string }> = munNamesJson.by_mun1990_id;

/** Capital cost scale: base plus a per-percent-of-BiH rate (the fixed packages run ~10-25). */
const DEMAND_BASE = 3;
const DEMAND_PER_PCT = 12;
const CONCEDE_BASE = 2;
const CONCEDE_PER_PCT = 9;

export function isFrontPackageId(id: string): boolean {
    return id.startsWith(FRONT_PACKAGE_PREFIX);
}

function isFaction(value: string | null | undefined): value is 'RBiH' | 'RS' | 'HRHB' {
    return value === 'RBiH' || value === 'RS' || value === 'HRHB';
}

/** RBiH and HRHB are the Federation; RS is the other entity. */
export function sameEntitySide(a: string, b: string): boolean {
    const fed = (f: string) => f === 'RBiH' || f === 'HRHB';
    return a === b || (fed(a) && fed(b));
}

function municipalityName(mun: string): string {
    const name = MUN_NAMES[mun]?.display_name;
    if (name) return name;
    return mun.split('_').map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w)).join(' ');
}

/** Largest encircled pocket attached to a package (the retired rear-pocket rule's cap). */
const MAX_ENCIRCLED_POCKET = 6;

interface FrontGroup {
    mun: string;
    claimant: FactionId;
    assignee: FactionId;
    osids: string[];
    /** Encircled cells attached by attachEncircledPockets (also listed in osids). */
    encircled: string[];
    km2: number;
}


let fixedPackageOsids: Set<string> | null = null;
function osidsGovernedByFixedPackages(): Set<string> {
    if (!fixedPackageOsids) {
        fixedPackageOsids = new Set<string>();
        for (const pkg of TERRITORIAL_PACKAGES) {
            for (const o of resolveOsidsForKeywords(pkg.osid_keywords)) fixedPackageOsids.add(o);
        }
    }
    return fixedPackageOsids;
}

/**
 * Every captured-ground package for this state, sorted by id. Empty when the front
 * matches the Dayton map everywhere outside the fixed packages.
 */
export function buildFrontPackages(state: GameState): TerritorialPackage[] {
    const wartime = state.political?.political_controllers ?? {};
    const map = computeSettlementControllers(state, 'dayton').controllers;
    const fixed = osidsGovernedByFixedPackages();
    const groups = new Map<string, FrontGroup>();
    for (const osid of Object.keys(wartime).sort(strictCompare)) {
        const claimant = wartime[osid];
        const assignee = map[osid];
        if (!isFaction(claimant) || !isFaction(assignee) || claimant === assignee) continue;
        // Owner ruling 2026-11-07: Dayton drew the inter-entity line only. RBiH-vs-HRHB
        // differences follow the researched Dayton map; they are not negotiable here.
        if (sameEntitySide(claimant, assignee)) continue;
        if (fixed.has(osid)) continue;
        const mun = osid.split(':')[1] ?? '';
        const id = `${FRONT_PACKAGE_PREFIX}${mun}:${claimant}:${assignee}`;
        let g = groups.get(id);
        if (!g) {
            g = { mun, claimant, assignee, osids: [], encircled: [], km2: 0 };
            groups.set(id, g);
        }
        g.osids.push(osid);
        g.km2 += OSID_AREAS.areas[osid] ?? 0;
    }
    attachEncircledPockets(wartime, map, fixed, groups);
    const total = OSID_AREAS.total_area_km2 > 0 ? OSID_AREAS.total_area_km2 : 1;
    const out: TerritorialPackage[] = [];
    for (const id of [...groups.keys()].sort(strictCompare)) {
        const g = groups.get(id)!;
        const pct = Math.round((g.km2 / total) * 100 * 100) / 100;
        const name = municipalityName(g.mun);
        const pocket = g.encircled.length > 0
            ? ` Includes ${g.encircled.length} encircled cell(s) its ground surrounds.`
            : '';
        out.push({
            id,
            name,
            description: `${name}: ground ${g.claimant} holds that the Dayton map gives to ${g.assignee}.${pocket}`,
            default_holder: g.assignee,
            capital_cost_to_demand: Math.max(DEMAND_BASE, Math.round(DEMAND_BASE + DEMAND_PER_PCT * pct)),
            capital_cost_to_concede: Math.max(CONCEDE_BASE, Math.round(CONCEDE_BASE + CONCEDE_PER_PCT * pct)),
            osid_keywords: [],
            osids: [...g.osids].sort(strictCompare),
            claimant: g.claimant,
            area_pct: pct,
            municipality: g.mun,
            ...(g.encircled.length > 0 ? { encircled_osids: [...g.encircled].sort(strictCompare) } : {}),
        });
    }
    return out;
}

/**
 * Encircled pockets (owner, 2026-11-07, Rasavci): a cluster of at most
 * MAX_ENCIRCLED_POCKET cells held by one party and entirely surrounded by cells another
 * party holds would survive the settlement as a tiny exclave, because the claimant never
 * held it and so could not demand it. Such a pocket joins the claimant's adjacent
 * captured-ground package: it is priced by area and changes hands only if that package is
 * won. Pockets the Dayton map already gives to the surrounding party, pockets inside a
 * fixed package, pockets already holding captured ground, and pockets between the two
 * Federation parties (no entity line runs between them) are left alone.
 */
function attachEncircledPockets(
    wartime: Record<string, FactionId | null | undefined>,
    map: Record<string, FactionId>,
    fixed: Set<string>,
    groups: Map<string, FrontGroup>,
): void {
    const adjacency = getSettlementAdjacency();
    const packageOf = new Map<string, string>();
    for (const id of [...groups.keys()].sort(strictCompare)) {
        for (const o of groups.get(id)!.osids) packageOf.set(o, id);
    }
    const checked = new Set<string>();
    for (const start of Object.keys(wartime).sort(strictCompare)) {
        if (checked.has(start)) continue;
        const holder = wartime[start];
        if (!isFaction(holder)) { checked.add(start); continue; }
        const cluster: string[] = [];
        const seen = new Set<string>([start]);
        const queue = [start];
        while (queue.length > 0 && cluster.length <= MAX_ENCIRCLED_POCKET) {
            const cur = queue.shift()!;
            cluster.push(cur);
            for (const n of adjacency.get(cur) ?? []) {
                if (!seen.has(n) && wartime[n] === holder) { seen.add(n); queue.push(n); }
            }
        }
        for (const o of seen) checked.add(o);
        if (cluster.length > MAX_ENCIRCLED_POCKET || queue.length > 0) continue;
        if (cluster.some((o) => fixed.has(o) || packageOf.has(o))) continue;
        let surrounder: string | null = null;
        let enclosed = true;
        const touching = new Map<string, number>();
        for (const o of cluster) {
            for (const n of adjacency.get(o) ?? []) {
                if (seen.has(n)) continue;
                const h = wartime[n];
                if (!isFaction(h) || (surrounder !== null && h !== surrounder)) { enclosed = false; break; }
                surrounder = h;
                const pkg = packageOf.get(n);
                if (pkg) touching.set(pkg, (touching.get(pkg) ?? 0) + 1);
            }
            if (!enclosed) break;
        }
        if (!enclosed || surrounder === null || sameEntitySide(surrounder, holder)) continue;
        if (cluster.every((o) => map[o] === surrounder)) continue;
        const target = [...touching.entries()]
            .filter(([id]) => groups.get(id)!.claimant === surrounder)
            .sort((a, b) => (b[1] - a[1]) || strictCompare(a[0], b[0]))[0]?.[0];
        if (!target) continue;
        const g = groups.get(target)!;
        for (const o of [...cluster].sort(strictCompare)) {
            g.osids.push(o);
            g.encircled.push(o);
            g.km2 += OSID_AREAS.areas[o] ?? 0;
        }
    }
}

/**
 * The captured-ground packages a player faction can act on: those it holds against the
 * map, those the map gives it, and Federation-partner ground the map gives RS.
 */
export function frontPackagesForPlayer(state: GameState, playerFaction: string): TerritorialPackage[] {
    return buildFrontPackages(state).filter((p) =>
        p.claimant === playerFaction
        || p.default_holder === playerFaction
        || (p.claimant !== undefined && sameEntitySide(p.claimant, playerFaction) && !sameEntitySide(p.default_holder, playerFaction)));
}

/** The captured-ground packages a proposal names, or [] when it names none (cheap path). */
export function frontPackagesForProposal(state: GameState, proposal: DaytonProposal): TerritorialPackage[] {
    const names = [...proposal.territorial_demands, ...proposal.territorial_concessions];
    if (!names.some(isFrontPackageId)) return [];
    return buildFrontPackages(state);
}
