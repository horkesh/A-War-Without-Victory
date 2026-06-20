/**
 * Generals' Digest FEEL surface — "what your generals did this week" (D2 task #42).
 *
 * Provenance: the REAL_WAR_MASTER "what did my corps do for 3 years" gap — on the
 * long silent stretches where no decision fires in the player's chair, the war still
 * grinds on through their generals, but the UI went dark. This surface makes the
 * week's MILITARY activity legible from the player's own faction's perspective: which
 * corps held their line, which pressed an advance, where ground changed hands, and
 * which fronts were quiet — so advancing a turn always shows the war continuing.
 *
 * PURE READ-MODEL. This module derives a per-turn military digest + somber-factual
 * prose from data ALREADY on the parsed UI state — the per-turn `TurnSummary` history
 * (battles / territory_net / notable_flips / formation_destructions, all turn-keyed)
 * and the live `corps_command` snapshot (in-execution operations). It touches NO sim
 * state, writes NO persisted field, bumps NO save schema, and moves NO territory or
 * combat. It is imported ONLY by src/ui/** — NOT on the headless artifact path — so
 * the calibration baselines stay byte-identical.
 *
 * FACTION-AWARE: every digest is scoped to the player's OWN faction's generals. Corps
 * are attributed by corps-id prefix (`arbih_*` → RBiH, `vrs_*` → RS, `hvo_*` → HRHB);
 * battles are scoped by the player as attacker/defender; ground held/lost is the
 * player's `territory_net`. An observer (no player faction) gets nothing — the digest
 * is a chair surface, not a god's-eye scoreboard.
 *
 * §6 GUARDRAIL: this is a MILITARY-FACTUAL digest of ops and ground — corps lines,
 * advances, attrition, quiet fronts. It is NOT the Srebrenica/Žepa rupture receipt
 * (task #39, separately §6-gated) and must never author, pre-empt, or minimise the
 * genocide record. The prose names no atrocity, no perpetrator, no enclave-by-name; it
 * is the dry order-of-battle week, not a humanitarian or atrocity narrative. A
 * forbidden-vocabulary guard (`assertDigestProseClean`) test-pins this: the digest
 * carries no §6-sensitive vocabulary in its prose.
 *
 * Determinism: pure functions of their inputs; corps and fronts iterated in sorted
 * order via strictCompare; no RNG, no clock.
 *
 * Canonical owner: src/ui/map/data/generalsDigest.ts
 */

import { strictCompare } from '../../../state/validateGameState.js';
import { shouldNarrateTerritorySummary } from './territorySummaryGuard.js';

/** Canonical player factions. */
export type DigestFaction = 'RBiH' | 'RS' | 'HRHB';

/** Map a corps-id prefix to its faction. `arbih_*`→RBiH, `vrs_*`→RS, `hvo_*`→HRHB. */
export function factionFromCorpsId(corpsId: string): DigestFaction | null {
    if (corpsId.startsWith('arbih_')) return 'RBiH';
    if (corpsId.startsWith('vrs_')) return 'RS';
    if (corpsId.startsWith('hvo_')) return 'HRHB';
    return null;
}

/** Title-case a corps slug, stripping the faction prefix. `arbih_2nd_corps` → "2nd Corps". */
export function formatDigestCorpsName(corpsId: string): string {
    const stripped = corpsId.replace(/^(arbih|vrs|hvo)_/, '');
    if (!stripped) return 'a corps';
    return stripped
        .split(/[_-]/)
        .filter((w) => w.length > 0)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

/** A single corps' in-progress operation (read off the live corps_command snapshot). */
export interface DigestActiveOp {
    corpsId: string;
    corpsName: string;
    /** Op display name (humanized; never a raw slug — see formatOpName below). */
    opName: string;
    /** True while the op is in its execution phase (pressing forward), else preparing. */
    pressing: boolean;
}

/** One turn's military digest for the player faction. */
export interface GeneralsDigestTurn {
    turn: number;
    /** Player corps with an operation under way this snapshot (execution or planning). */
    activeOps: DigestActiveOp[];
    /** Net settlements gained (+) or lost (−) by the player this turn. */
    netTerritory: number;
    /** Friendly casualties suffered by the player this turn (across all battles). */
    friendlyCasualties: number;
    /** Own formations lost this turn. */
    ownFormationsDestroyed: number;
    /** How many battles the player was a party to this turn. */
    battleCount: number;
    /** Notable municipality-seat / corridor flips touching the player this turn. */
    notableGains: number;
    notableLosses: number;
}

/**
 * §6 forbidden-vocabulary guard. The digest is a military order-of-battle account; it
 * must never carry atrocity / perpetrator / enclave-by-name vocabulary in its prose
 * (that belongs to the separately-gated §6 rupture receipt, never here). Used two ways:
 *   - `scrubForbiddenTokens` (RUNTIME, production-safe) strips a forbidden token from a
 *     live op name before interpolation, so the digest never renders it.
 *   - `assertDigestProseClean` (TEST-only tripwire) throws so a future prose edit or a
 *     scrub-bypass surfaces loudly in dev/test rather than silently drifting the digest
 *     toward the §6 record.
 * `i`-flag only (stateless `.test()` — safe to reuse across calls; no `g` flag).
 */
export const DIGEST_FORBIDDEN_VOCAB =
    /srebrenica|žepa|zepa|genocide|massacre|atrocit|cleans|mladic|mladić|karadzic|karadžić/i;

export function assertDigestProseClean(text: string): void {
    if (DIGEST_FORBIDDEN_VOCAB.test(text)) {
        throw new Error(`generals' digest prose contains §6-sensitive vocabulary: ${text}`);
    }
}

/**
 * Humanize an operation name. Op records carry display names; slugs get title-cased.
 *
 * §6 RUNTIME SCRUB: the op name is live, author-supplied data interpolated VERBATIM
 * into the digest prose. Today no top-level `CorpsOperation.name` carries a forbidden
 * token (the Srebrenica rupture op is "Operation Krivaja-95"; the sensitive
 * "Srebrenica Enclave/Ring" / "Žepa Pocket" strings live only in AXIS names the digest
 * never reads). But this surface fires on turns ≥170 (the rupture window), so the
 * bright line must be CODE-enforced, not naming-dependent: any forbidden token in a
 * live op name is scrubbed to a neutral placeholder BEFORE interpolation, so production
 * never renders it. `assertDigestProseClean` (test-only) is the loud tripwire for drift.
 */
function formatOpName(raw: string | null | undefined): string {
    const name = (raw ?? '').trim();
    if (!name) return 'an operation';
    const humanized = /\s/.test(name) || /[A-Z]/.test(name)
        // Already a human label (has spaces / mixed case) → keep verbatim.
        ? name
        : name
            .replace(/^operation_/, '')
            .split(/[_-]/)
            .filter((w) => w.length > 0)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
    return scrubForbiddenTokens(humanized);
}

/**
 * Deterministically strip any §6-forbidden token from live op-name text, replacing the
 * whole name with a neutral placeholder if any token is present. Production-safe: never
 * throws (a render-path scrub, not a crash), never renders the token. Pure; no clock/RNG.
 */
function scrubForbiddenTokens(text: string): string {
    return DIGEST_FORBIDDEN_VOCAB.test(text) ? 'an operation' : text;
}

/**
 * Read the player faction's in-execution / planning operations off the live
 * `corps_command` snapshot. Returns a sorted (by corps-id), deduped list. Empty when
 * the snapshot is absent or no player corps holds an op. Never throws.
 *
 * Corps are attributed by id prefix; only ops in 'planning' or 'execution' phase are
 * reported (recovery = winding down, not "doing something this week"). Each op is
 * reported at most once per corps (the lead op), so the digest reads cleanly.
 */
export function deriveActiveOps(
    corpsCommand: unknown,
    playerFaction: DigestFaction,
): DigestActiveOp[] {
    if (!corpsCommand || typeof corpsCommand !== 'object') return [];
    const out: DigestActiveOp[] = [];
    const seen = new Set<string>();

    const corpsIds = Object.keys(corpsCommand as Record<string, unknown>).sort(strictCompare);
    for (const corpsId of corpsIds) {
        if (factionFromCorpsId(corpsId) !== playerFaction) continue;
        if (seen.has(corpsId)) continue;
        const cmd = (corpsCommand as Record<string, unknown>)[corpsId];
        if (!cmd || typeof cmd !== 'object') continue;
        const ops = (cmd as { active_operations?: unknown }).active_operations;
        if (!Array.isArray(ops)) continue;

        // First op in planning/execution is the corps' headline activity this week.
        const lead = ops.find((op) => {
            const phase = (op as { phase?: unknown })?.phase;
            return phase === 'planning' || phase === 'execution';
        }) as { name?: unknown; phase?: unknown } | undefined;
        if (!lead) continue;

        out.push({
            corpsId,
            corpsName: formatDigestCorpsName(corpsId),
            opName: formatOpName(typeof lead.name === 'string' ? lead.name : null),
            pressing: lead.phase === 'execution',
        });
        seen.add(corpsId);
    }

    return out;
}

/** Sum a battle's casualties from the player's perspective (attacker or defender). */
function friendlyCasualtiesFromBattle(battle: unknown, playerFaction: DigestFaction): number {
    const b = battle as {
        attacker_faction?: unknown;
        defender_faction?: unknown;
        attacker_casualties?: unknown;
        defender_casualties?: unknown;
    } | null;
    if (!b) return 0;
    if (b.attacker_faction === playerFaction) return Number(b.attacker_casualties ?? 0) || 0;
    if (b.defender_faction === playerFaction) return Number(b.defender_casualties ?? 0) || 0;
    return 0;
}

/** True if the player was a party (attacker or defender) to this battle. */
function playerInBattle(battle: unknown, playerFaction: DigestFaction): boolean {
    const b = battle as { attacker_faction?: unknown; defender_faction?: unknown } | null;
    return !!b && (b.attacker_faction === playerFaction || b.defender_faction === playerFaction);
}

/**
 * Derive one turn's player-faction military digest from a single TurnSummary plus the
 * live corps_command snapshot (the snapshot is the CURRENT state, so active ops are
 * only meaningful for the latest turn — caller passes `corpsCommand` only there).
 *
 * Pure; never throws. A turn the player has no part in returns a zeroed digest (the
 * caller decides whether a fully-quiet turn earns a "fronts quiet" beat).
 */
export function deriveDigestTurn(
    summary: unknown,
    playerFaction: DigestFaction,
    corpsCommand: unknown,
): GeneralsDigestTurn {
    const s = summary as Record<string, unknown> | null;
    const turn = Number((s as { turn?: unknown })?.turn ?? 0) || 0;

    const battles = Array.isArray((s as { battles?: unknown })?.battles)
        ? ((s as { battles: unknown[] }).battles)
        : [];
    let friendlyCasualties = 0;
    let battleCount = 0;
    for (const battle of battles) {
        if (!playerInBattle(battle, playerFaction)) continue;
        battleCount += 1;
        friendlyCasualties += friendlyCasualtiesFromBattle(battle, playerFaction);
    }

    const narrateTerritory = shouldNarrateTerritorySummary(s);
    const territoryNet = narrateTerritory
        ? ((s as { territory_net?: Record<string, unknown> })?.territory_net ?? {})
        : {};
    const netTerritory = Number(territoryNet?.[playerFaction] ?? 0) || 0;

    const destructions = Array.isArray((s as { formation_destructions?: unknown })?.formation_destructions)
        ? ((s as { formation_destructions: unknown[] }).formation_destructions)
        : [];
    const ownFormationsDestroyed = destructions.filter(
        (d) => (d as { faction?: unknown })?.faction === playerFaction,
    ).length;

    const flips = narrateTerritory && Array.isArray((s as { notable_flips?: unknown })?.notable_flips)
        ? ((s as { notable_flips: unknown[] }).notable_flips)
        : [];
    let notableGains = 0;
    let notableLosses = 0;
    for (const flip of flips) {
        const f = flip as { from?: unknown; to?: unknown } | null;
        if (!f) continue;
        if (f.to === playerFaction) notableGains += 1;
        else if (f.from === playerFaction) notableLosses += 1;
    }

    return {
        turn,
        activeOps: deriveActiveOps(corpsCommand, playerFaction),
        netTerritory,
        friendlyCasualties,
        ownFormationsDestroyed,
        battleCount,
        notableGains,
        notableLosses,
    };
}

/** True when this digest carries NO player military activity at all (a quiet week). */
export function isQuietWeek(digest: GeneralsDigestTurn): boolean {
    return digest.activeOps.length === 0
        && digest.battleCount === 0
        && digest.netTerritory === 0
        && digest.ownFormationsDestroyed === 0
        && digest.notableGains === 0
        && digest.notableLosses === 0;
}

/** Short, presentation-ready digest heading. Stays neutral and factual. */
export function generalsDigestTitle(digest: GeneralsDigestTurn): string {
    if (isQuietWeek(digest)) return 'The fronts were quiet this week';
    if (digest.activeOps.some((op) => op.pressing)) return "Your generals' week: operations under way";
    if (digest.netTerritory > 0 || digest.notableGains > 0) return "Your generals' week: ground gained";
    if (digest.netTerritory < 0 || digest.notableLosses > 0 || digest.ownFormationsDestroyed > 0) {
        return "Your generals' week: the line held under pressure";
    }
    return "Your generals' week: holding the line";
}

/**
 * Player-safe, military-factual digest prose. Describes the week's order-of-battle
 * activity — corps operations, ground held/changed, attrition — in dry, somber terms.
 * Names no atrocity, no perpetrator, no enclave; this is the corps' week, never the §6
 * record. Faction-neutral phrasing (the chair is implied by "your").
 */
export function generalsDigestGloss(digest: GeneralsDigestTurn): string {
    if (isQuietWeek(digest)) {
        return 'No operations, no ground changed hands, no formations lost. Across your sectors '
            + 'the front sat still — the war grinding on without a battle to mark the week.';
    }

    const clauses: string[] = [];

    // Operations under way — the headline of what the generals are doing.
    const pressing = digest.activeOps.filter((op) => op.pressing);
    const planning = digest.activeOps.filter((op) => !op.pressing);
    for (const op of pressing) {
        clauses.push(`your ${op.corpsName} pressed ${op.opName}`);
    }
    for (const op of planning) {
        clauses.push(`your ${op.corpsName} prepared ${op.opName}`);
    }

    // Ground held or lost this week.
    if (digest.netTerritory > 0) {
        clauses.push(`${digest.netTerritory} settlement${digest.netTerritory === 1 ? '' : 's'} taken`);
    } else if (digest.netTerritory < 0) {
        const lost = Math.abs(digest.netTerritory);
        clauses.push(`${lost} settlement${lost === 1 ? '' : 's'} given up`);
    } else if (digest.battleCount > 0) {
        clauses.push('the line held, no ground changed hands');
    }

    // Attrition — the cost the generals paid.
    if (digest.ownFormationsDestroyed > 0) {
        // "N of your formations lost" — the partitive reads plural even at N=1.
        clauses.push(`${digest.ownFormationsDestroyed} of your formations lost`);
    } else if (digest.friendlyCasualties > 0) {
        clauses.push(`${digest.friendlyCasualties} casualties borne`);
    }

    if (clauses.length === 0) {
        // Battles fought but nothing else to report (e.g. defensive skirmishing).
        return 'Your corps traded fire along the front this week; the line held and the map sat still.';
    }

    // Capitalize the first clause; join the rest as a running account.
    const joined = clauses.join('; ');
    const sentence = joined.charAt(0).toUpperCase() + joined.slice(1);
    return `${sentence}. This was your generals' week — the war fought in your name along the front.`;
}
