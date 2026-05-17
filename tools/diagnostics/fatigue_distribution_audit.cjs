#!/usr/bin/env node
/**
 * Fatigue distribution audit.
 *
 * Reads a run directory or final_save.json-shaped artifact and emits stable
 * per-week, per-faction, per-corps, per-role fatigue buckets. The diagnostic
 * is observational only: no state mutation, no timestamps, no filesystem
 * traversal beyond the explicit input path.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FATIGUE_MAX = 30;
const FATIGUE_THRESHOLD = 1;
const MAX_REPLAY_READ_BYTES = 450 * 1024 * 1024;

const SOURCE_KEYS = [
    'combat_driven',
    'front_duty_driven',
    'unknown',
    'unsupplied_accumulation',
];

function strictCompare(a, b) {
    const sa = String(a);
    const sb = String(b);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function sortedKeys(obj) {
    return Object.keys(obj || {}).slice().sort(strictCompare);
}

function asArray(value) {
    return Array.isArray(value) ? value : [];
}

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonIfExists(filePath, fallback) {
    return fs.existsSync(filePath) ? readJson(filePath) : fallback;
}

function resolveInput(inputPath) {
    const resolved = path.resolve(inputPath);
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
        return {
            run_dir: path.dirname(resolved),
            states: [readJson(resolved)],
            summary: {},
        };
    }

    const replayPath = path.join(resolved, 'replay_save_sequence.json');
    const finalSavePath = path.join(resolved, 'final_save.json');
    if (fs.existsSync(replayPath)) {
        const replayStat = fs.statSync(replayPath);
        if (replayStat.size > MAX_REPLAY_READ_BYTES && fs.existsSync(finalSavePath)) {
            return {
                run_dir: resolved,
                states: [readJson(finalSavePath)],
                summary: readJsonIfExists(path.join(resolved, 'run_summary.json'), {}),
                artifact_mode: 'final_save_fallback_large_replay',
                replay_bytes: replayStat.size,
            };
        }
        return {
            run_dir: resolved,
            states: readJson(replayPath),
            summary: readJsonIfExists(path.join(resolved, 'run_summary.json'), {}),
            artifact_mode: 'replay_save_sequence',
            replay_bytes: replayStat.size,
        };
    }
    if (fs.existsSync(finalSavePath)) {
        return {
            run_dir: resolved,
            states: [readJson(finalSavePath)],
            summary: readJsonIfExists(path.join(resolved, 'run_summary.json'), {}),
            artifact_mode: 'final_save',
            replay_bytes: null,
        };
    }
    throw new Error(`missing replay_save_sequence.json or final_save.json in ${resolved}`);
}

function isFormationKind(kind) {
    return kind == null
        || kind === 'brigade'
        || kind === 'og'
        || kind === 'operational_group'
        || kind === 'jna_phantom'
        || kind === 'hv_phantom';
}

function battleCount(formation) {
    const history = formation && formation.brigade_history;
    if (history && Number.isFinite(+history.battles_fought)) return +history.battles_fought;
    if (history && Array.isArray(history.engagements)) return history.engagements.length;
    const attacker = history && Number.isFinite(+history.battles_as_attacker) ? +history.battles_as_attacker : 0;
    const defender = history && Number.isFinite(+history.battles_as_defender) ? +history.battles_as_defender : 0;
    if (attacker + defender > 0) return attacker + defender;
    return Number.isFinite(+formation?.battle_outcome_count) ? +formation.battle_outcome_count : 0;
}

function wasEngagedThisTurn(formation, turn) {
    const engagements = asArray(formation?.brigade_history?.engagements);
    return engagements.some((engagement) => Number(engagement?.turn) === turn);
}

function buildActiveOperationParticipantSet(state) {
    const participants = new Set();
    const corpsCommand = state?.military?.corps_command || {};
    for (const corpsId of sortedKeys(corpsCommand)) {
        const command = corpsCommand[corpsId] || {};
        for (const operation of asArray(command.active_operations)) {
            for (const brigadeId of asArray(operation?.participating_brigades)) {
                if (typeof brigadeId === 'string' && brigadeId.length > 0) {
                    participants.add(brigadeId);
                }
            }
        }
    }
    return participants;
}

function buildSectorMembership(state) {
    const membership = new Map();
    const sectors = state?.military?.corps_front_sectors || {};
    const remember = (brigadeId, sectorId, role) => {
        if (typeof brigadeId !== 'string' || brigadeId.length === 0) return;
        const existing = membership.get(brigadeId);
        if (!existing || rolePriority(role) < rolePriority(existing.role)) {
            membership.set(brigadeId, { sector_id: sectorId, role });
        }
    };

    for (const sectorId of sortedKeys(sectors)) {
        const sector = sectors[sectorId] || {};
        for (const brigadeId of asArray(sector.assigned_brigade_ids)) remember(brigadeId, sectorId, 'front');
        for (const brigadeId of asArray(sector.reserve_brigade_ids)) remember(brigadeId, sectorId, 'reserve');
        for (const brigadeId of asArray(sector.rear_brigade_ids)) remember(brigadeId, sectorId, 'rear');
    }
    return membership;
}

function rolePriority(role) {
    switch (role) {
        case 'front': return 0;
        case 'reserve': return 1;
        case 'rear': return 2;
        default: return 3;
    }
}

function roleForFormation(formation, membership, activeOperationParticipants, turn) {
    if (wasEngagedThisTurn(formation, turn)) return 'engaged_this_turn';
    if (activeOperationParticipants.has(formation.id)) return 'operation_participant';

    const assignment = formation?.assignment || null;
    const assignmentRole = assignment && typeof assignment.role === 'string' ? assignment.role : null;
    const memberRole = membership.get(formation.id)?.role || null;
    const role = assignmentRole || memberRole;
    if (role === 'front') return 'sector_front';
    if (role === 'reserve') return 'sector_reserve';
    if (role === 'rear') return 'sector_rear';
    return 'unassigned';
}

function classifySource(formation, role, fatigue, turn) {
    if (fatigue <= 0) return null;
    if (battleCount(formation) > 0) return 'combat_driven';
    const lastSupplied = formation?.ops?.last_supplied_turn;
    if (lastSupplied != null && Number(lastSupplied) < turn) return 'unsupplied_accumulation';
    if (role === 'sector_front' || role === 'engaged_this_turn' || role === 'operation_participant') {
        return 'front_duty_driven';
    }
    return 'unknown';
}

function getFatigue(formation) {
    const opsFatigue = formation?.ops?.fatigue;
    if (Number.isFinite(+opsFatigue)) return Math.max(0, +opsFatigue);
    const legacyFatigue = formation?.fatigue;
    return Number.isFinite(+legacyFatigue) ? Math.max(0, +legacyFatigue) : 0;
}

function bucketKey(row) {
    return [
        String(row.week),
        row.faction_id,
        row.corps_id,
        row.role,
    ].join('\u0000');
}

function emptySourceCounts() {
    const counts = {};
    for (const key of SOURCE_KEYS) counts[key] = 0;
    return counts;
}

function round(value) {
    return Math.round(value * 1000) / 1000;
}

function summarizeBucket(bucket) {
    const count = bucket.rows.length;
    const totalFatigue = bucket.rows.reduce((sum, row) => sum + row.fatigue, 0);
    const zero = bucket.rows.filter((row) => row.fatigue === 0).length;
    const aboveThreshold = bucket.rows.filter((row) => row.fatigue > FATIGUE_THRESHOLD).length;
    const aboveHalf = bucket.rows.filter((row) => row.fatigue > FATIGUE_MAX / 2).length;
    const formationIds = bucket.rows.map((row) => row.formation_id).sort(strictCompare);
    return {
        week: bucket.week,
        faction_id: bucket.faction_id,
        corps_id: bucket.corps_id,
        role: bucket.role,
        count,
        mean_fatigue: round(totalFatigue / count),
        pct_zero: round((zero / count) * 100),
        pct_above_threshold: round((aboveThreshold / count) * 100),
        pct_above_FATIGUE_MAX_half: round((aboveHalf / count) * 100),
        classified_sources: bucket.classified_sources,
        formation_ids: formationIds,
    };
}

function auditStates(states) {
    const buckets = new Map();
    const weeks = [];
    for (const state of asArray(states)) {
        const turn = Number.isFinite(+state?.meta?.turn) ? +state.meta.turn : null;
        if (turn != null) weeks.push(turn);
        const activeOperationParticipants = buildActiveOperationParticipantSet(state);
        const membership = buildSectorMembership(state);
        const formations = state?.military?.formations || {};

        for (const formationId of sortedKeys(formations)) {
            const formation = formations[formationId];
            if (!formation || formation.status !== 'active') continue;
            if (!isFormationKind(formation.kind)) continue;
            const fatigue = getFatigue(formation);
            const factionId = String(formation.faction || 'unknown');
            const corpsId = formation.corps_id == null ? 'unknown' : String(formation.corps_id);
            const role = roleForFormation(formation, membership, activeOperationParticipants, turn);
            const row = {
                week: turn,
                faction_id: factionId,
                corps_id: corpsId,
                role,
                formation_id: String(formation.id || formationId),
                fatigue,
                source: classifySource(formation, role, fatigue, turn),
            };
            const key = bucketKey(row);
            if (!buckets.has(key)) {
                buckets.set(key, {
                    week: turn,
                    faction_id: factionId,
                    corps_id: corpsId,
                    role,
                    rows: [],
                    classified_sources: emptySourceCounts(),
                });
            }
            const bucket = buckets.get(key);
            bucket.rows.push(row);
            if (row.source) bucket.classified_sources[row.source] += 1;
        }
    }

    const sortedWeeks = Array.from(new Set(weeks)).sort((a, b) => a - b);
    const sortedBuckets = Array.from(buckets.values()).sort((a, b) => {
        const wc = (a.week ?? -1) - (b.week ?? -1);
        if (wc !== 0) return wc;
        const fc = strictCompare(a.faction_id, b.faction_id);
        if (fc !== 0) return fc;
        const cc = strictCompare(a.corps_id, b.corps_id);
        if (cc !== 0) return cc;
        return strictCompare(a.role, b.role);
    });

    return {
        weeks: sortedWeeks,
        buckets: sortedBuckets.map(summarizeBucket),
    };
}

function auditFatigueDistribution(inputPath) {
    const input = resolveInput(inputPath);
    const audited = auditStates(input.states);
    return {
        diagnostic: 'fatigue_distribution_audit',
        schema_version: 1,
        run_dir: input.run_dir,
        artifact_mode: input.artifact_mode || 'single_file',
        replay_bytes: input.replay_bytes ?? null,
        final_state_hash: input.summary.final_state_hash || null,
        fatigue_max: FATIGUE_MAX,
        fatigue_threshold: FATIGUE_THRESHOLD,
        weeks: audited.weeks,
        buckets: audited.buckets,
    };
}

function main() {
    const args = process.argv.slice(2);
    const positional = args.filter((arg) => !arg.startsWith('--'));
    const flags = new Set(args.filter((arg) => arg.startsWith('--')));
    if (flags.has('--help') || positional.length !== 1) {
        const stream = positional.length === 1 ? process.stdout : process.stderr;
        stream.write('Usage: node tools/diagnostics/fatigue_distribution_audit.cjs <run_dir|final_save.json>\n');
        process.exit(positional.length === 1 ? 0 : 2);
    }
    for (const flag of flags) {
        if (flag !== '--help') {
            console.error(`Unknown flag: ${flag}`);
            process.exit(2);
        }
    }
    process.stdout.write(`${JSON.stringify(auditFatigueDistribution(positional[0]), null, 2)}\n`);
}

if (require.main === module) {
    main();
}

module.exports = {
    auditFatigueDistribution,
    strictCompare,
};
