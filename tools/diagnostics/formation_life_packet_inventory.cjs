#!/usr/bin/env node
/**
 * Formation-life packet inventory diagnostic.
 *
 * Reads a scenario `final_save.json` and classifies active zero-battle
 * brigade-level formations into packet-owner subtypes before any runtime
 * behavior packet starts.
 *
 * Output is deterministic JSON:
 *   - fixed subtype order
 *   - formation rows sorted by formation id
 *   - no timestamps, randomness, or filesystem traversal
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SUBTYPES = [
    'loan',
    'operation_participant',
    'sector_front',
    'sector_reserve',
    'sector_rear',
    'sector_owned',
    'doctrine',
];

const GRAZ_EXEMPT_RS_CORPS = new Set([
    'vrs_1st_krajina',
]);

const GRAZ_EXEMPT_HRHB_CORPS = new Set([
    'hvo_northwest_bosnia',
]);

const GRAZ_EAST_HERZEGOVINA_PAIR = new Set([
    'vrs_herzegovina',
    'hvo_southeast_herzegovina',
]);

const GRAZ_KISELJAK_VRS_EXCLUSION = new Set([
    'op:kiseljak:azapovici_2',
    'op:kiseljak:bilalovac_2',
    'op:kiseljak:brnjaci_2',
    'op:kiseljak:bukovica',
    'op:kiseljak:drazevici',
    'op:kiseljak:gromiljak_2',
    'op:kiseljak:kiseljak_2',
]);

const GRAZ_KISELJAK_HRHB_EXCLUSION = new Set([
    'op:hadzici:misevici_2',
    'op:hadzici:tarcin_2',
    'op:ilidza:rudnik_2',
    'op:visoko:bradve_2',
    'op:visoko:buzic_mahala_2',
    'op:visoko:rajcici_2',
    'op:visoko:stuparici_2',
]);

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

function isBrigadeKind(kind) {
    return kind == null || kind === 'brigade' || kind === 'operational_group';
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

function buildActiveOperationParticipantSet(state) {
    const participants = new Set();
    const corpsCommand = state?.military?.corps_command || {};
    for (const corpsId of sortedKeys(corpsCommand)) {
        const command = corpsCommand[corpsId] || {};
        for (const operation of asArray(command.active_operations)) {
            for (const brigadeId of asArray(operation && operation.participating_brigades)) {
                if (typeof brigadeId === 'string' && brigadeId.length > 0) {
                    participants.add(brigadeId);
                }
            }
        }
    }
    return participants;
}

function buildSectorMembership(state) {
    const sectors = state?.military?.corps_front_sectors || {};
    const membership = new Map();
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

function getSectorContext(state, formation, membership) {
    const sectors = state?.military?.corps_front_sectors || {};
    const assignment = formation?.assignment || null;
    const assignedSectorId = assignment && assignment.kind === 'sector' && typeof assignment.sector_id === 'string'
        ? assignment.sector_id
        : null;
    const member = membership.get(formation.id);
    const sectorId = assignedSectorId || (member && member.sector_id) || null;
    const role = assignment && ['front', 'reserve', 'rear'].includes(assignment.role)
        ? assignment.role
        : (member && member.role) || null;
    return {
        sector_id: sectorId,
        role,
        sector: sectorId ? (sectors[sectorId] || null) : null,
    };
}

function isLoaned(formation) {
    const loan = formation?.elite_loan_state;
    return loan?.on_loan === true
        && typeof loan.loaned_to_corps === 'string'
        && loan.loaned_to_corps.length > 0;
}

function hasDoctrineMarker(formation) {
    if (formation?.garrison === true) return true;
    const tags = asArray(formation?.tags);
    return tags.some((tag) => tag === 'doctrine' || tag === 'doctrine_only' || tag === 'formation_life:doctrine');
}

function isGrazAccordsActive(state) {
    const political = state?.political || {};
    if (political.vienna_declaration_turn == null) return false;
    if ((state?.meta?.turn || 0) < political.vienna_declaration_turn) return false;
    return political.vienna_accepted?.RS === true && political.vienna_accepted?.HRHB === true;
}

function isHerzegovinaTruceActive(state) {
    return isGrazAccordsActive(state) && state?.political?.vienna_herzegovina_broken_by == null;
}

function isKiseljakExclusionActive(state) {
    return isGrazAccordsActive(state) && state?.political?.vienna_kiseljak_broken !== true;
}

function isEastHerzegovinaPair(corpsId) {
    return GRAZ_EAST_HERZEGOVINA_PAIR.has(String(corpsId || ''));
}

function isSectorColdFront(state, sector) {
    if (!sector) return false;
    if (sector.cold_front === true || sector.is_cold_front === true || sector.truce_front === true) return true;
    if (!isGrazAccordsActive(state)) return false;

    const faction = sector.faction;
    const opposingFactions = asArray(sector.opposing_factions);
    const hasRsHrhb =
        (faction === 'RS' && opposingFactions.includes('HRHB')) ||
        (faction === 'HRHB' && opposingFactions.includes('RS'));
    if (!hasRsHrhb) return false;

    const hasNonTruceFoe = faction === 'RS'
        ? opposingFactions.some((opponent) => opponent !== 'HRHB')
        : opposingFactions.some((opponent) => opponent !== 'RS');
    if (hasNonTruceFoe) return false;

    if (isHerzegovinaTruceActive(state)) {
        const corpsId = String(sector.corps_id || '');
        if (GRAZ_EXEMPT_RS_CORPS.has(corpsId)) return false;
        if (GRAZ_EXEMPT_HRHB_CORPS.has(corpsId)) return false;
        if (isEastHerzegovinaPair(corpsId) && state?.political?.graz_east_herzegovina_active_turn == null) {
            return false;
        }
        return true;
    }

    if (isKiseljakExclusionActive(state)) {
        for (const subSegment of asArray(sector.sub_segments)) {
            for (const osid of asArray(subSegment?.friendly_osids)) {
                if (GRAZ_KISELJAK_VRS_EXCLUSION.has(osid) || GRAZ_KISELJAK_HRHB_EXCLUSION.has(osid)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function classifyFormation(state, formation, activeOperationParticipants, membership) {
    if (isLoaned(formation)) {
        return { subtype: 'loan', reason: 'active_elite_loan' };
    }
    if (activeOperationParticipants.has(formation.id)) {
        return { subtype: 'operation_participant', reason: 'active_operation_participant' };
    }
    if (hasDoctrineMarker(formation)) {
        return { subtype: 'doctrine', reason: 'doctrine_or_garrison' };
    }

    const sectorContext = getSectorContext(state, formation, membership);
    if (!sectorContext.sector_id || !sectorContext.sector) {
        return { subtype: 'doctrine', reason: 'ownerless_zero_battle' };
    }
    if (isSectorColdFront(state, sectorContext.sector)) {
        return { subtype: 'doctrine', reason: 'cold_front_doctrine' };
    }

    if (sectorContext.role === 'front') return { subtype: 'sector_front', reason: 'sector_front_assignment' };
    if (sectorContext.role === 'reserve') return { subtype: 'sector_reserve', reason: 'sector_reserve_assignment' };
    if (sectorContext.role === 'rear') return { subtype: 'sector_rear', reason: 'sector_rear_assignment' };
    return { subtype: 'sector_owned', reason: 'sector_owned_no_role' };
}

function makeFormationRow(formation, sectorContext, subtype, reason) {
    return {
        formation_id: String(formation.id),
        subtype,
        reason,
        name: String(formation.name || formation.id),
        faction: String(formation.faction || ''),
        corps_id: formation.corps_id == null ? null : String(formation.corps_id),
        assignment_role: sectorContext.role || null,
        sector_id: sectorContext.sector_id || null,
        location_osid: formation.location_osid == null ? null : String(formation.location_osid),
        home_osid: formation.home_osid == null ? null : String(formation.home_osid),
        battles_fought: battleCount(formation),
    };
}

function emptyBuckets() {
    const buckets = {};
    for (const subtype of SUBTYPES) buckets[subtype] = [];
    return buckets;
}

function emptyCounts() {
    const counts = {};
    for (const subtype of SUBTYPES) counts[subtype] = 0;
    return counts;
}

function classifyFormationLifeInventory(state) {
    const formations = state?.military?.formations || {};
    const activeOperationParticipants = buildActiveOperationParticipantSet(state);
    const membership = buildSectorMembership(state);
    const formationsBySubtype = emptyBuckets();

    for (const formationId of sortedKeys(formations)) {
        const formation = formations[formationId];
        if (!formation || formation.status !== 'active') continue;
        if (!isBrigadeKind(formation.kind)) continue;
        if (battleCount(formation) > 0) continue;

        const classification = classifyFormation(state, formation, activeOperationParticipants, membership);
        const sectorContext = getSectorContext(state, formation, membership);
        formationsBySubtype[classification.subtype].push(
            makeFormationRow(formation, sectorContext, classification.subtype, classification.reason),
        );
    }

    const counts = emptyCounts();
    let total = 0;
    for (const subtype of SUBTYPES) {
        formationsBySubtype[subtype].sort((a, b) => strictCompare(a.formation_id, b.formation_id));
        counts[subtype] = formationsBySubtype[subtype].length;
        total += counts[subtype];
    }

    return {
        diagnostic: 'formation_life_packet_inventory',
        schema_version: 1,
        source_turn: Number.isFinite(+state?.meta?.turn) ? +state.meta.turn : null,
        total,
        counts,
        formations_by_subtype: formationsBySubtype,
    };
}

function resolveFinalSave(inputPath) {
    const resolved = path.resolve(inputPath);
    const stat = fs.statSync(resolved);
    return stat.isDirectory() ? path.join(resolved, 'final_save.json') : resolved;
}

function main() {
    const args = process.argv.slice(2);
    const positional = args.filter((arg) => !arg.startsWith('--'));
    const flags = new Set(args.filter((arg) => arg.startsWith('--')));
    if (flags.has('--help') || positional.length !== 1) {
        const stream = positional.length === 1 ? process.stdout : process.stderr;
        stream.write('Usage: node tools/diagnostics/formation_life_packet_inventory.cjs <run_dir|final_save.json>\n');
        process.exit(positional.length === 1 ? 0 : 2);
    }
    for (const flag of flags) {
        if (flag !== '--help') {
            console.error(`Unknown flag: ${flag}`);
            process.exit(2);
        }
    }

    const finalSavePath = resolveFinalSave(positional[0]);
    if (!fs.existsSync(finalSavePath)) {
        console.error(`Missing final save: ${finalSavePath}`);
        process.exit(2);
    }
    const state = readJson(finalSavePath);
    process.stdout.write(`${JSON.stringify(classifyFormationLifeInventory(state), null, 2)}\n`);
}

if (require.main === module) {
    main();
}

module.exports = {
    SUBTYPES,
    classifyFormation,
    classifyFormationLifeInventory,
    strictCompare,
};
