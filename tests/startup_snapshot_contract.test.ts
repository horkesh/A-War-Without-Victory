import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'vitest';

import { loadOperationalEdges } from '../src/data/operational_data.js';
import { startNewCampaign } from '../src/desktop/desktop_sim.js';
import {
    buildStartupSnapshotPayload,
    loadStartupSnapshotPayload,
    loadStartupSnapshotState,
    validateStartupSnapshot,
} from '../src/scenario/startup_snapshot.js';
import {
    brigadeRequiresSectorAssignment,
    buildOneHopReserveBand,
} from '../src/sim/combat/brigade_assignment.js';
import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors.js';
import { isSectorAssignmentExemptCorpsId } from '../src/sim/combat/corps_front_sectors_constants.js';
import { buildOsidAdjacency } from '../src/sim/combat/osid_adjacency.js';
import { isSectorRosterEligibleFormation } from '../src/sim/combat/sector_roster_eligibility.js';
import { auditSectorTruth } from '../src/sim/combat/sector_truth_audit.js';
import { getSectorFrontOsids } from '../src/sim/combat/sector_utils.js';
import {
    isSrkStranglePostureEnabled,
    resetSrkStranglePostureGate,
} from '../src/sim/combat/contain_posture_gate.js';
import { computeSrkStrangleOsids } from '../src/sim/combat/srk_strangle.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';
import { resolveCorpsCommanderDisplay } from '../src/ui/map/utils/officerUtils.js';

test('baked April 1992 startup artifact matches canonical builder truth after checkout normalization', async () => {
    const baseDir = process.cwd();
    const [artifactPayload, builderPayload] = await Promise.all([
        loadStartupSnapshotPayload(baseDir, 'apr_1992'),
        buildStartupSnapshotPayload(baseDir, 'apr_1992'),
    ]);

    assert.strictEqual(
        artifactPayload,
        builderPayload,
        'baked startup artifact should remain a one-way derived copy of canonical builder truth',
    );
}, 120_000);

test('baked April 1992 startup artifact stays in canonical loaded-save form', async () => {
    const state = await loadStartupSnapshotState(process.cwd(), 'apr_1992');
    const payload = serializeState(state);

    assert.strictEqual(
        serializeState(deserializeState(payload)),
        payload,
        'baked startup artifact should already be in canonical save/load form',
    );
});

test('desktop new campaign consumes the baked April 1992 startup artifact path', async () => {
    const source = await readFile(
        resolve(process.cwd(), 'src', 'desktop', 'desktop_sim.ts'),
        'utf8',
    );
    const startCampaignStart = source.indexOf('export async function startNewCampaign(');
    const startCampaignEnd = source.indexOf('export async function loadStateFromPath', startCampaignStart);
    const startCampaignBody = source.slice(startCampaignStart, startCampaignEnd === -1 ? undefined : startCampaignEnd);

    assert.ok(startCampaignStart >= 0, 'startNewCampaign should exist');
    assert.match(
        startCampaignBody,
        /const state = key === 'apr_1992'\s*\? await loadStartupSnapshotState\(baseDir, key\)\s*:\s*await createStateFromScenario\(scenarioPath, baseDir\);/s,
        'desktop apr_1992 startup should consume the baked startup artifact while non-baked scenarios keep the builder path',
    );
});

test('desktop new campaign overlays remain canonical after loading the baked artifact', async () => {
    const baseDir = process.cwd();
    const bakedState = await loadStartupSnapshotState(baseDir, 'apr_1992');
    const { state } = await startNewCampaign(baseDir, 'RBiH', 'apr_1992');

    // The baked/headless artifact keeps player_faction unset; desktop
    // startNewCampaign overlays the faction passed by the user.
    assert.strictEqual(bakedState.meta.player_faction, undefined);
    assert.strictEqual(state.meta.player_faction, 'RBiH');
    assert.ok(state.military.recruitment_state, 'desktop new campaign should still inject recruitment_state over the baked artifact');
    assert.strictEqual(
        serializeState(deserializeState(serializeState(state))),
        serializeState(state),
        'desktop overlays over the baked artifact should remain canonical after save/load',
    );
}, 120_000);

test('baked April 1992 startup materializes default-on SRK strangle containment', async () => {
    resetSrkStranglePostureGate();
    const prev = process.env.AWWV_SRK_STRANGLE_POSTURE;
    delete process.env.AWWV_SRK_STRANGLE_POSTURE;
    try {
        const state = await loadStartupSnapshotState(process.cwd(), 'apr_1992');
        const expected = computeSrkStrangleOsids(state);

        assert.strictEqual(isSrkStranglePostureEnabled(), true);
        assert.strictEqual(expected.length, 4, 'startup should expose the four RBiH-held Sarajevo urban-core OSIDs');
        assert.deepStrictEqual(state.political.last_contained_osids_by_faction?.RS, expected);
    } finally {
        if (prev !== undefined) process.env.AWWV_SRK_STRANGLE_POSTURE = prev;
        else delete process.env.AWWV_SRK_STRANGLE_POSTURE;
        resetSrkStranglePostureGate();
    }
}, 120_000);

test('baked April 1992 opening corps command display does not mutate sim officer state', async () => {
    const state = await loadStartupSnapshotState(process.cwd(), 'apr_1992');
    const activeCommandedCorps = new Set(
        Object.values(state.military.named_officers ?? {})
            .filter((officer) => officer.status === 'active' && officer.assigned_corps_id)
            .map((officer) => officer.assigned_corps_id!),
    );

    const openingCorpsIds = [
        'vrs_drina',
        'arbih_3rd_corps',
        'arbih_4th_corps',
    ];

    for (const corpsId of openingCorpsIds) {
        const corps = state.military.formations[corpsId];
        const activeBrigades = Object.values(state.military.formations)
            .filter((formation) => formation.status === 'active' && formation.corps_id === corpsId);

        assert.ok(corps, `${corpsId} should exist in the baked startup artifact`);
        assert.strictEqual(corps.status, 'active', `${corpsId} should be an active opening corps asset`);
        assert.ok(activeBrigades.length > 0, `${corpsId} should have active opening brigades`);
        assert.ok(!activeCommandedCorps.has(corpsId), `${corpsId} should not be seated into sim-active command at turn 0`);
    }
}, 120_000);

test('baked April 1992 UI read model shows opening commanders without backdating official arrivals', async () => {
    const state = await loadStartupSnapshotState(process.cwd(), 'apr_1992');
    const view = parseGameState(state);
    const officers = state.military.named_officers ?? {};

    assert.deepStrictEqual(resolveCorpsCommanderDisplay('vrs_drina', 'RS', view), {
        name: 'Svetozar Andrić',
        acting: true,
        source: 'opening_read_model',
    });
    assert.deepStrictEqual(resolveCorpsCommanderDisplay('arbih_3rd_corps', 'RBiH', view), {
        name: 'Selmo Cikotić',
        acting: true,
        source: 'opening_read_model',
    });
    assert.deepStrictEqual(resolveCorpsCommanderDisplay('arbih_4th_corps', 'RBiH', view), {
        name: 'Midhad Hujdur "Hujka"',
        acting: true,
        source: 'opening_read_model',
    });
    assert.deepStrictEqual(resolveCorpsCommanderDisplay('jna_herzegovina_command', 'RS', view), {
        name: 'JNA forward command staff',
        acting: false,
        source: 'synthetic',
    });

    assert.strictEqual(officers.vrs_zivanovic, undefined, 'Živanović remains a later Drina arrival, not a turn-0 backdate');
    assert.strictEqual(officers.arbih_hadzihasanovic, undefined, 'Hadžihasanović remains a later 3rd Corps arrival, not a turn-0 backdate');
    assert.strictEqual(officers.arbih_pasalic, undefined, 'Pašalić remains a later 4th Corps arrival, not a turn-0 backdate');
}, 120_000);

test('baked April 1992 startup has no false turn-0 combat control history', async () => {
    const state = await loadStartupSnapshotState(process.cwd(), 'apr_1992');
    const turnZeroCombatEvents = (state.political.control_events ?? [])
        .filter((event) => event.turn === 0 && event.mechanism === 'combat');

    assert.deepStrictEqual(turnZeroCombatEvents, []);

    const jnaSetupControlOsids = [
        'op:stolac:stolac_2',
        'op:stolac:rotimlja_2',
        'op:stolac:pjesivac_kula_2',
        'op:capljina:tasovcici_2',
        'op:mostar:hodbina_2',
        'op:kupres:goravci',
        'op:kupres:kupres_2',
    ];

    for (const osid of jnaSetupControlOsids) {
        assert.strictEqual(state.political.political_controllers?.[osid], 'RS');
        assert.strictEqual(state.political.initial_political_controllers?.[osid], 'RS');
    }
}, 120_000);

test('baked April 1992 startup active formations resolve their command parents', async () => {
    const state = await loadStartupSnapshotState(process.cwd(), 'apr_1992');
    const missingParents = Object.values(state.military.formations)
        .filter((formation) => formation.status === 'active' && formation.corps_id)
        .filter((formation) => !state.military.formations[formation.corps_id!])
        .map((formation) => `${formation.id}->${formation.corps_id}`)
        .sort();

    assert.deepStrictEqual(missingParents, []);
    assert.strictEqual(state.military.formations.vrs_main_staff?.kind, 'army_hq');
}, 120_000);

test('baked April 1992 startup sectors do not duplicate same-faction edge ownership', async () => {
    const state = await loadStartupSnapshotState(process.cwd(), 'apr_1992');
    const ownerByFactionEdge = new Map<string, string>();
    const duplicates: string[] = [];

    for (const sector of Object.values(state.military.corps_front_sectors ?? {})) {
        for (const edgeId of sector.edge_ids ?? []) {
            const key = `${sector.faction}::${edgeId}`;
            const existing = ownerByFactionEdge.get(key);
            if (existing && existing !== sector.sector_id) {
                duplicates.push(`${key} => ${existing} / ${sector.sector_id}`);
            } else {
                ownerByFactionEdge.set(key, sector.sector_id);
            }
        }
    }

    assert.deepStrictEqual(duplicates.sort(), []);
}, 120_000);

test('baked April 1992 startup sector truth audits clean without rebuilt-state mutation', async () => {
    const savedState = await loadStartupSnapshotState(process.cwd(), 'apr_1992');
    const rebuiltState = deserializeState(serializeState(savedState));
    const edges = await loadOperationalEdges();

    const savedAudit = auditSectorTruth(
        savedState,
        Object.values(savedState.military.corps_front_sectors ?? {}),
        edges,
    );
    const rebuiltSectors = Object.values(buildCorpsFrontSectors(rebuiltState, edges, null));
    const rebuiltAudit = auditSectorTruth(rebuiltState, rebuiltSectors, edges);
    const releaseGateCounts = {
        reserve_only_live_sectors: 1,
        stale_density_sectors: 0,
        same_corps_front_overlaps: 0,
        untruthful_assigned_brigades: 0,
        edge_front_mismatches: 0,
        unresolved_sector_brigades: 0,
        active_formations_in_enemy_territory: 0,
    };

    assert.deepStrictEqual(savedAudit.counts, releaseGateCounts);
    assert.strictEqual(savedAudit.ok, true);
    assert.strictEqual(
        rebuiltAudit.counts.untruthful_assigned_brigades,
        0,
        'rebuilt sector diagnostics must not mutate saved-state brigade locations before the saved audit runs',
    );
}, 120_000);

test('baked April 1992 HVO Bosnian Posavina frontage is not claimed by Central Bosnia', async () => {
    const state = await loadStartupSnapshotState(process.cwd(), 'apr_1992');
    const samplePosavinaEdge = 'op:bosanski_brod:brod__op:bosanski_brod:donja_vrela';
    const owners = Object.values(state.military.corps_front_sectors ?? {})
        .filter((sector) => sector.faction === 'HRHB' && (sector.edge_ids ?? []).includes(samplePosavinaEdge))
        .map((sector) => ({
            sector_id: sector.sector_id,
            corps_id: sector.corps_id,
        }));

    assert.deepStrictEqual(owners, [
        {
            sector_id: 'sector:hvo_northwest_bosnia:0',
            corps_id: 'hvo_northwest_bosnia',
        },
    ]);
}, 120_000);

test('baked April 1992 startup sector roster and sectorless brigades are structurally explicit', async () => {
    const state = await loadStartupSnapshotState(process.cwd(), 'apr_1992');
    const edges = await loadOperationalEdges();
    const adjacency = buildOsidAdjacency(edges);
    const sectors = Object.values(state.military.corps_front_sectors ?? {});
    const sectorById = new Map(sectors.map((sector) => [sector.sector_id, sector]));
    const unresolvedSectorBrigades = new Set(state.military.unresolved_sector_brigades ?? []);
    const brigades = Object.values(state.military.formations)
        .filter((formation) => formation.kind === 'brigade');
    const rosterLifecycleIssues: string[] = [];
    const sectorBucketIssues: string[] = [];
    const sectorPhysicalBucketIssues: string[] = [];
    const sectorlessHqReserveIds: string[] = [];
    const interiorOrAlliedIds: string[] = [];
    const unresolvedIds: string[] = [];
    const missingSectorClassification: string[] = [];

    const activeMissingParent = brigades
        .filter((formation) => formation.status === 'active' && (!formation.corps_id || !state.military.formations[formation.corps_id]))
        .map((formation) => formation.id)
        .sort();
    const activeMissingLocation = brigades
        .filter((formation) => formation.status === 'active' && !formation.location_osid && !formation.home_osid && !formation.hq_sid)
        .map((formation) => formation.id)
        .sort();

    for (const sector of sectors) {
        const frontSet = getSectorFrontOsids(sector);
        const oneHopBehind = buildOneHopReserveBand(
            frontSet,
            adjacency,
            new Set<string>([...sector.territory_osids, ...frontSet]),
        );
        for (const [role, bucket] of [
            ['front', sector.assigned_brigade_ids ?? []],
            ['reserve', sector.reserve_brigade_ids ?? []],
            ['rear', sector.rear_brigade_ids ?? []],
        ] as const) {
            for (const brigadeId of bucket) {
                const formation = state.military.formations[brigadeId];
                if (!isSectorRosterEligibleFormation(formation)) {
                    rosterLifecycleIssues.push(`${sector.sector_id}:${role}:${brigadeId}:${formation?.status ?? 'missing'}:${formation?.readiness ?? 'missing'}`);
                    continue;
                }
                const locationOsid = formation.location_osid ?? '';
                if (role === 'front' && !frontSet.has(locationOsid)) {
                    sectorPhysicalBucketIssues.push(`${sector.sector_id}:front:${brigadeId}:${locationOsid || 'missing-location'}`);
                } else if (role === 'reserve' && !oneHopBehind.has(locationOsid)) {
                    sectorPhysicalBucketIssues.push(`${sector.sector_id}:reserve:${brigadeId}:${locationOsid || 'missing-location'}`);
                } else if (role === 'rear' && (frontSet.has(locationOsid) || !sector.territory_osids.includes(locationOsid))) {
                    sectorPhysicalBucketIssues.push(`${sector.sector_id}:rear:${brigadeId}:${locationOsid || 'missing-location'}`);
                }
            }
        }
    }

    for (const formation of brigades) {
        if (!isSectorRosterEligibleFormation(formation) || !formation.corps_id) continue;
        const persisted = formation as typeof formation & {
            assignment?: { kind?: string | null; role?: string | null; sector_id?: string | null };
            sector_id?: string | null;
            sectorOverrideId?: string | null;
        };
        const assignmentSectorId = persisted.assignment?.sector_id ?? persisted.sector_id ?? persisted.sectorOverrideId ?? null;
        if (assignmentSectorId) {
            const sector = sectorById.get(assignmentSectorId);
            if (!sector) {
                sectorBucketIssues.push(`${formation.id}:missing-sector:${assignmentSectorId}`);
                continue;
            }
            const role = persisted.assignment?.role === 'rear'
                ? 'rear'
                : persisted.assignment?.role === 'reserve'
                    ? 'reserve'
                    : 'front';
            const bucket = role === 'rear'
                ? (sector.rear_brigade_ids ?? [])
                : role === 'reserve'
                    ? (sector.reserve_brigade_ids ?? [])
                    : (sector.assigned_brigade_ids ?? []);
            if (!bucket.includes(formation.id)) {
                sectorBucketIssues.push(`${formation.id}:${assignmentSectorId}:${role}:not-in-sector-bucket`);
            }
            continue;
        }
        if (isSectorAssignmentExemptCorpsId(formation.corps_id)) {
            sectorlessHqReserveIds.push(formation.id);
            continue;
        }
        if (unresolvedSectorBrigades.has(formation.id)) {
            unresolvedIds.push(formation.id);
            continue;
        }
        if (!brigadeRequiresSectorAssignment(formation, sectors, adjacency, edges)) {
            interiorOrAlliedIds.push(formation.id);
            continue;
        }
        missingSectorClassification.push(formation.id);
    }

    assert.deepStrictEqual(activeMissingParent, []);
    assert.deepStrictEqual(activeMissingLocation, []);
    assert.deepStrictEqual(rosterLifecycleIssues.sort(), []);
    assert.deepStrictEqual(sectorBucketIssues.sort(), []);
    assert.deepStrictEqual(sectorPhysicalBucketIssues.sort(), []);
    assert.deepStrictEqual(sectorlessHqReserveIds.sort(), [
        'rs_1st_guards_motorized',
        'rs_65th_protection_motorized_regiment',
    ]);
    assert.deepStrictEqual(interiorOrAlliedIds.sort(), [
        'hrhb_travnik_brigade',
    ]);
    assert.deepStrictEqual(unresolvedIds.sort(), []);
    assert.deepStrictEqual(missingSectorClassification.sort(), []);
}, 120_000);

test('desktop new campaign preserves default-on SRK strangle containment at birth', async () => {
    resetSrkStranglePostureGate();
    const prev = process.env.AWWV_SRK_STRANGLE_POSTURE;
    delete process.env.AWWV_SRK_STRANGLE_POSTURE;
    try {
        const { state } = await startNewCampaign(process.cwd(), 'RBiH', 'apr_1992');
        const expected = computeSrkStrangleOsids(state);

        assert.strictEqual(isSrkStranglePostureEnabled(), true);
        assert.strictEqual(expected.length, 4, 'desktop birth state should expose the four RBiH-held Sarajevo urban-core OSIDs');
        assert.deepStrictEqual(state.political.last_contained_osids_by_faction?.RS, expected);
    } finally {
        if (prev !== undefined) process.env.AWWV_SRK_STRANGLE_POSTURE = prev;
        else delete process.env.AWWV_SRK_STRANGLE_POSTURE;
        resetSrkStranglePostureGate();
    }
}, 120_000);

test('startup snapshot validator reports the committed artifact as current', async () => {
    const result = await validateStartupSnapshot(process.cwd(), 'apr_1992');
    assert.strictEqual(result.matches, true);
}, 120_000);
