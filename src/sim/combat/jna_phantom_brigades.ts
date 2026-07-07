/**
 * JNA Phantom Brigades — temporary formations representing JNA assets
 * that fought alongside VRS in the first weeks of the war.
 *
 * They carry heavy equipment (tanks, artillery, APCs) that gets handed off
 * to VRS brigades when the JNA withdraws. Personnel disappear (returned to Serbia).
 *
 * Pipeline integration:
 *   spawn: called once at scenario start (before first runTurn)
 *   withdrawal: checked each turn during war phases
 *
 * Deterministic: sorted iteration, no randomness.
 */

import type {
    BrigadeComposition,
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { seedDisplacementTimerOnFlip } from '../../state/displacement_takeover.js';

// ═══════════════════════════════════════════════════════════════════════════
// Equipment ceilings per equipment_class
// ═══════════════════════════════════════════════════════════════════════════

const EQUIPMENT_CEILINGS: Record<string, { max_tanks: number; max_artillery: number; max_apcs: number }> = {
    mechanized:      { max_tanks: 25, max_artillery: 20, max_apcs: 15 },
    motorized:       { max_tanks: 15, max_artillery: 15, max_apcs: 12 },
    light_infantry:  { max_tanks: 5,  max_artillery: 10, max_apcs: 8 },
    mountain:        { max_tanks: 3,  max_artillery: 8,  max_apcs: 5 },
    garrison:        { max_tanks: 2,  max_artillery: 6,  max_apcs: 3 },
    police:          { max_tanks: 0,  max_artillery: 2,  max_apcs: 2 },
    special:         { max_tanks: 2,  max_artillery: 4,  max_apcs: 3 },
};

function getEquipmentCeiling(equipmentClass: string | undefined) {
    return EQUIPMENT_CEILINGS[equipmentClass ?? 'light_infantry']
        ?? EQUIPMENT_CEILINGS['light_infantry']!;
}

function hasHeavyPhantomEquipment(def: Pick<PhantomDef, 'tanks' | 'artillery' | 'apcs'>): boolean {
    return (def.tanks ?? 0) > 0 || (def.artillery ?? 0) > 0 || (def.apcs ?? 0) > 0;
}

function getPhantomSpawnProfile(def: PhantomDef): {
    personnel: number;
    infantry: number;
    cohesion: number;
    morale: number;
    experience: number;
    equipmentClass: string;
} {
    if (hasHeavyPhantomEquipment(def)) {
        return {
            personnel: 2000,
            infantry: 1200,
            cohesion: 85,
            morale: 90,
            experience: 0.6,
            equipmentClass: 'mechanized',
        };
    }
    return {
        personnel: 800,
        infantry: 800,
        cohesion: 60,
        morale: 60,
        experience: 0.25,
        equipmentClass: 'light_infantry',
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Phantom brigade definitions
// ═══════════════════════════════════════════════════════════════════════════

interface PhantomDef {
    id: FormationId;
    name: string;
    corps_id: FormationId;
    /** Faction owning the phantom. Defaults to 'RS' for JNA phantoms. */
    faction?: FactionId;
    location_osid: string;
    withdrawal_turn: number;
    tanks: number;
    artillery: number;
    apcs: number;
    /** Ghost phantoms capture OSIDs at spawn and dissolve without equipment handoff. */
    capture_osids?: string[];
    /** If true, equipment disappears on withdrawal (not distributed to corps). */
    no_equipment_handoff?: boolean;
    /** Kind tag for the formation. Defaults to 'jna_phantom'. */
    kind_tag?: FormationState['kind'];
    /** Turn at which this phantom becomes eligible to spawn. Absent → spawns at scenario start
     *  (turn 0), preserving the existing JNA + 1992 HV Op-Jackal behaviour. Set on second-wave
     *  HV expeditionary brigades that arrive after the Split Agreement (22 July 1995, ≈ turn 150)
     *  per `docs/40_reports/proposals/20260523_HV_EXPEDITIONARY_GHOST_DESIGN.md`. */
    spawn_turn?: number;
}

const JNA_PHANTOM_DEFS: PhantomDef[] = [
    {
        id: 'jna_uzice_corps_tg' as FormationId,
        name: 'JNA Uzice Corps Task Group',
        corps_id: 'vrs_herzegovina' as FormationId,
        location_osid: 'op:visegrad:okrugla',
        withdrawal_turn: 6,
        tanks: 30, artillery: 20, apcs: 8,
    },
    {
        id: 'jna_mostar_garrison_tg' as FormationId,
        name: 'JNA Mostar Garrison TG',
        corps_id: 'vrs_herzegovina' as FormationId,
        location_osid: 'op:foca:foca_3',
        withdrawal_turn: 5,
        tanks: 15, artillery: 15, apcs: 5,
    },
    {
        id: 'jna_mostar_east_garrison' as FormationId,
        name: 'JNA East Mostar Garrison',
        corps_id: 'vrs_herzegovina' as FormationId,
        location_osid: 'op:mostar:mostar_istok_2',
        withdrawal_turn: 6,
        tanks: 12, artillery: 10, apcs: 6,
        // JNA controlled positions from Stolac down to Čapljina.
        // On withdrawal, VRS inherits → Op Jackal target.
        // vranjevići/kružanj REMOVED: painted RS in Jan 1993 (VRS held these Mostar hills
        // throughout — HVO never captured them in Op Jackal).
        capture_osids: [
            'op:stolac:stolac_2',
            'op:stolac:rotimlja_2',
            'op:stolac:pjesivac_kula_2',
            'op:capljina:tasovcici_2',
            'op:mostar:hodbina_2',
        ],
    },
    {
        id: 'jna_17th_corps_tg' as FormationId,
        name: 'JNA 17th Corps Task Group',
        corps_id: 'vrs_east_bosnian' as FormationId,
        location_osid: 'op:bijeljina:dvorovi_2',
        withdrawal_turn: 6,
        tanks: 25, artillery: 15, apcs: 10,
    },
    {
        id: 'jna_4th_corps_tg' as FormationId,
        name: 'JNA 4th Corps Task Group',
        corps_id: 'vrs_sarajevo_romanija' as FormationId,
        location_osid: 'op:ilidza:kasindo',
        withdrawal_turn: 6,
        tanks: 20, artillery: 25, apcs: 5,
    },
    {
        id: 'jna_visegrad_local_to_tg' as FormationId,
        name: 'Višegrad Serb TO',
        corps_id: 'vrs_herzegovina' as FormationId,
        location_osid: 'op:visegrad:okrugla',
        withdrawal_turn: 8,
        tanks: 0, artillery: 0, apcs: 0,
        no_equipment_handoff: true,
    },
    {
        id: 'jna_rudo_to_tg' as FormationId,
        name: 'Rudo Serb TO',
        corps_id: 'vrs_herzegovina' as FormationId,
        location_osid: 'op:visegrad:donji_dobrun_2',
        withdrawal_turn: 8,
        tanks: 0, artillery: 0, apcs: 0,
        no_equipment_handoff: true,
    },
    {
        id: 'jna_rajlovac_barracks_tg' as FormationId,
        name: 'JNA Rajlovac Barracks TG',
        corps_id: 'vrs_sarajevo_romanija' as FormationId,
        location_osid: 'op:ilijas:srednje',
        withdrawal_turn: 5,
        tanks: 0, artillery: 0, apcs: 0,
        no_equipment_handoff: true,
    },
    {
        // Vogošća Serb TO — local territorial defense mobilized by JNA/SDS
        // to seize Vogošća suburbs north of Sarajevo (April-May 1992).
        id: 'jna_vogosca_to_tg' as FormationId,
        name: 'Vogošća TO Tactical Group',
        corps_id: 'vrs_sarajevo_romanija' as FormationId,
        location_osid: 'op:vogosca:vogosca_3',
        withdrawal_turn: 8,
        tanks: 0, artillery: 0, apcs: 0,
        no_equipment_handoff: true,
    },
    {
        // Ilijaš Serb TO — local territorial defense securing Ilijaš municipality
        // alongside JNA Rajlovac barracks elements (April-May 1992).
        id: 'jna_ilijas_to_tg' as FormationId,
        name: 'Ilijaš TO Tactical Group',
        corps_id: 'vrs_sarajevo_romanija' as FormationId,
        location_osid: 'op:ilijas:podlugovi',
        withdrawal_turn: 8,
        tanks: 0, artillery: 0, apcs: 0,
        no_equipment_handoff: true,
    },
    {
        // JNA Ilijas Garrison Detachment — elements of the JNA Ilijas barracks
        // that remained after the Rajlovac TG withdrew, providing local fire support
        // to the SDS-organised Ilijas Serb TO (April-May 1992).
        // Infantry only: no equipment handoff.
        id: 'jna_ilijas_garrison_det' as FormationId,
        name: 'JNA Ilijaš Garrison Detachment',
        corps_id: 'vrs_sarajevo_romanija' as FormationId,
        location_osid: 'op:ilijas:srednje',
        withdrawal_turn: 10,
        tanks: 0, artillery: 0, apcs: 0,
        no_equipment_handoff: true,
    },
    {
        // Ilijaš North Serb TO — Serb Territorial Defence units from the northern
        // Ilijas villages (Dragoradi, Krivajevici, Sirovine area) mobilised under
        // JNA/SDS coordination to close the northern siege ring (April 1992).
        // Staged from op:sokolac:meljine_2 (RS-controlled Romanija plateau OSID,
        // 6 shared segments with sirovine — the natural northern approach).
        // ljesevo OSID does not exist in data; podlugovi is southern Ilijas only.
        id: 'jna_ilijas_north_to_tg' as FormationId,
        name: 'Ilijaš North TO Tactical Group',
        corps_id: 'vrs_sarajevo_romanija' as FormationId,
        location_osid: 'op:sokolac:meljine_2',
        withdrawal_turn: 10,
        tanks: 0, artillery: 0, apcs: 0,
        no_equipment_handoff: true,
    },
    {
        // JNA 37th Corps forward elements at Nevesinje (BB1 p.480).
        // Represent JNA command authority + mobilized local Serb reservists.
        id: 'jna_nevesinje_garrison' as FormationId,
        name: 'JNA Nevesinje Garrison',
        corps_id: 'jna_herzegovina_command' as FormationId,
        location_osid: 'op:nevesinje:sopilja',
        withdrawal_turn: 6,
        tanks: 0, artillery: 0, apcs: 0,
        no_equipment_handoff: true,
    },
    {
        // Serbian paramilitaries in Foča — White Eagles, local irregulars.
        // Historically drove ethnic cleansing in Foča valley spring 1992.
        id: 'jna_foca_paramilitaries' as FormationId,
        name: 'Foča Serb Paramilitaries',
        corps_id: 'jna_herzegovina_command' as FormationId,
        location_osid: 'op:foca:foca_3',
        withdrawal_turn: 8,
        tanks: 0, artillery: 0, apcs: 0,
        no_equipment_handoff: true,
    },
    {
        // Local Serb TO mobilized by JNA for southern Konjic/Kalinovik seizure.
        id: 'jna_konjic_south_tg' as FormationId,
        name: 'Konjic-South Serb TO',
        corps_id: 'jna_herzegovina_command' as FormationId,
        location_osid: 'op:konjic:bijela_2',
        withdrawal_turn: 6,
        tanks: 0, artillery: 0, apcs: 0,
        no_equipment_handoff: true,
    },
    {
        // Kalinovik Serb TO — local territorial defense securing Kalinovik
        // highlands for VRS Herzegovina Corps (April-June 1992).
        // Historically VRS held Kalinovik throughout (BB2 p.514).
        id: 'jna_kalinovik_to_tg' as FormationId,
        name: 'Kalinovik TO Tactical Group',
        corps_id: 'vrs_herzegovina' as FormationId,
        location_osid: 'op:kalinovik:kalinovik_2',
        withdrawal_turn: 10,
        tanks: 0, artillery: 0, apcs: 0,
        no_equipment_handoff: true,
    },
    {
        id: 'jna_2nd_md_tg' as FormationId,
        name: 'JNA 2nd Military District TG',
        corps_id: 'vrs_1st_krajina' as FormationId,
        location_osid: 'op:prijedor:prijedor_2',
        withdrawal_turn: 7,
        tanks: 35, artillery: 20, apcs: 12,
    },
    {
        id: 'jna_9th_corps_tg' as FormationId,
        name: 'JNA 9th Corps Task Group',
        corps_id: 'vrs_2nd_krajina' as FormationId,
        location_osid: 'op:kupres:bucovaca',
        withdrawal_turn: 4,
        tanks: 20, artillery: 15, apcs: 6,
        capture_osids: ['op:kupres:goravci', 'op:kupres:kupres_2'],
        no_equipment_handoff: true,
    },
];

/**
 * HV (Croatian Army) phantom brigades — temporary formations representing
 * Croatian Army assets that supported HVO in Operation Jackal (June 1992).
 *
 * Historical: HV 116th Brigade and elements of 4th Guards Brigade deployed
 * to Herzegovina to support the liberation of east Mostar and Stolac.
 * Equipment returns to Croatia on withdrawal (no_equipment_handoff).
 */
const HV_PHANTOM_DEFS: PhantomDef[] = [
    {
        id: 'hv_116th_brigade_tg' as FormationId,
        name: 'HV 116th Brigade Task Group',
        corps_id: 'hvo_southeast_herzegovina' as FormationId,
        faction: 'HRHB',
        location_osid: 'op:mostar:mostar_zapad_2',
        withdrawal_turn: 24, // Stay until Op Jackal completes + buffer; dynamic withdrawal below
        tanks: 15, artillery: 12, apcs: 8,
        no_equipment_handoff: true,
        kind_tag: 'hv_phantom',
    },
    {
        id: 'hv_4th_guards_tg' as FormationId,
        name: 'HV 4th Guards Brigade TG',
        corps_id: 'hvo_southeast_herzegovina' as FormationId,
        faction: 'HRHB',
        location_osid: 'op:capljina:capljina_2',
        withdrawal_turn: 24,
        tanks: 10, artillery: 8, apcs: 6,
        no_equipment_handoff: true,
        kind_tag: 'hv_phantom',
    },
    {
        id: 'hv_1st_guards_tg' as FormationId,
        name: 'HV 1st Guards Brigade TG (Tigrovi)',
        corps_id: 'hvo_southeast_herzegovina' as FormationId,
        faction: 'HRHB',
        // R17 2026-05-25: moved from op:stolac:rotimlja_2 (RS-held at t0 —
        // brigade stranded in hostile territory, never reached staging, zero
        // fatigue across 188w). capljina_2 is Op Jackal staging, adjacent to
        // tasovcici_2 (first objective).
        location_osid: 'op:capljina:capljina_2',
        withdrawal_turn: 24,
        tanks: 12, artillery: 10, apcs: 8,
        no_equipment_handoff: true,
        kind_tag: 'hv_phantom',
    },
    {
        id: 'hv_113th_brigade_tg' as FormationId,
        name: 'HV 113th Brigade TG (Šibenik)',
        corps_id: 'hvo_southeast_herzegovina' as FormationId,
        faction: 'HRHB',
        location_osid: 'op:capljina:capljina_2',
        withdrawal_turn: 24,
        tanks: 8, artillery: 8, apcs: 6,
        no_equipment_handoff: true,
        kind_tag: 'hv_phantom',
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// Spawn
// ═══════════════════════════════════════════════════════════════════════════

/** All phantom defs (JNA + HV). */
/**
 * HV (Croatian Army) 1995 expeditionary phantom brigades — second wave.
 *
 * Historical: post-Split Agreement (22 July 1995, ≈ turn 150) HV deployed openly
 * inside BiH under Tuđman + Izetbegović + Zubak + Silajdžić consent. Three
 * operational groups under HV Maj Gen Ante Gotovina ran Mistral 2 (8–15 Sept)
 * and Southern Move (8–11 Oct). HVO Guards Brigades were embedded as line units
 * (those remain HRHB-native — see `data/source/oob_brigades.json`); the
 * brigades below are the HV regulars + home guard regiments that joined them.
 *
 * Sources: ICTY Gotovina IT-06-90 trial chamber (HV order of battle for Mistral 2,
 * Summer '95, Southern Move); BB Vol. II ch.12–13; Tanner, *Croatia* ch.13.
 *
 * Spawn turn 150 (≈ Split Agreement window). Withdraw turn 188 (Dayton ceasefire)
 * or earlier on `holbrooke_us_belgrade_channel_1995` flag (dynamic trigger handled
 * in `processJnaWithdrawals`). Equipment returns to Croatia (no handoff to HVO).
 *
 * Coexists with the permanent 4-brigade pool in `hv_integration.ts` (which models
 * post-Washington 1994 Federation Military Council integration). The two pools
 * are distinct: hv_integration = permanent; phantoms = short-window expeditionary.
 *
 * See: `docs/40_reports/proposals/20260523_HV_EXPEDITIONARY_GHOST_DESIGN.md`.
 */
const HV_PHANTOM_DEFS_1995: PhantomDef[] = [
    // ── OG North (main effort, Mistral 2 + Southern Move) ────────────────
    {
        id: 'hv_4th_guards_brigade_1995' as FormationId,
        name: 'HV 4th Guards Brigade (Split, OG North)',
        corps_id: 'hvo_southeast_herzegovina' as FormationId,
        faction: 'HRHB',
        location_osid: 'op:livno:livno_2',
        spawn_turn: 150,
        withdrawal_turn: 188,
        tanks: 40, artillery: 30, apcs: 12,
        no_equipment_handoff: true,
        kind_tag: 'hv_phantom',
    },
    {
        id: 'hv_7th_guards_brigade_1995' as FormationId,
        name: 'HV 7th Guards Brigade (Varaždin, OG North)',
        corps_id: 'hvo_central_bosnia' as FormationId,
        faction: 'HRHB',
        // Canonical OSID is op:duvno:tomislavgrad_2 (Duvno = pre-1990 muni name
        // for Tomislavgrad). Prior 'op:tomislavgrad:tomislavgrad_2' did not exist
        // in data/derived/operational/osid_areas.json, so this phantom spawned
        // into a void and could not be sector-classified.
        location_osid: 'op:duvno:tomislavgrad_2',
        spawn_turn: 150,
        withdrawal_turn: 188,
        tanks: 30, artillery: 25, apcs: 10,
        no_equipment_handoff: true,
        kind_tag: 'hv_phantom',
    },
    {
        id: 'hv_1st_guards_brigade_1995' as FormationId,
        name: 'HV 1st Croatian Guards Brigade Tigrovi (Zagreb, OG North)',
        corps_id: 'hvo_central_bosnia' as FormationId,
        faction: 'HRHB',
        location_osid: 'op:livno:livno_2',
        spawn_turn: 150,
        withdrawal_turn: 188,
        tanks: 25, artillery: 25, apcs: 10,
        no_equipment_handoff: true,
        kind_tag: 'hv_phantom',
    },
    // ── OG South (flank + Southern Move main effort 8-11 Oct) ────────────
    {
        id: 'hv_126th_hgr_1995' as FormationId,
        name: 'HV 126th Home Guard Regiment (Sinj, OG South)',
        corps_id: 'hvo_southeast_herzegovina' as FormationId,
        faction: 'HRHB',
        location_osid: 'op:livno:livno_2',
        spawn_turn: 150,
        withdrawal_turn: 188,
        tanks: 12, artillery: 15, apcs: 8,
        no_equipment_handoff: true,
        kind_tag: 'hv_phantom',
    },
    {
        id: 'hv_141st_reserve_brigade_1995' as FormationId,
        name: 'HV 141st Reserve Infantry Brigade (OG South)',
        corps_id: 'hvo_southeast_herzegovina' as FormationId,
        faction: 'HRHB',
        // Canonical OSID is op:duvno:tomislavgrad_2 (Duvno = pre-1990 muni name).
        location_osid: 'op:duvno:tomislavgrad_2',
        spawn_turn: 150,
        withdrawal_turn: 188,
        tanks: 8, artillery: 10, apcs: 6,
        no_equipment_handoff: true,
        kind_tag: 'hv_phantom',
    },
    // ── OG West (Drvar axis) ──────────────────────────────────────────────
    {
        id: 'hv_7th_hgr_1995' as FormationId,
        name: 'HV 7th Home Guard Regiment (OG West)',
        corps_id: 'hvo_tomislavgrad' as FormationId,
        faction: 'HRHB',
        location_osid: 'op:livno:livno_2',
        spawn_turn: 150,
        withdrawal_turn: 188,
        tanks: 10, artillery: 10, apcs: 6,
        no_equipment_handoff: true,
        kind_tag: 'hv_phantom',
    },
    {
        id: 'hv_112th_infantry_1995' as FormationId,
        name: 'HV 112th Infantry Brigade (OG West)',
        corps_id: 'hvo_tomislavgrad' as FormationId,
        faction: 'HRHB',
        location_osid: 'op:livno:livno_2',
        spawn_turn: 150,
        withdrawal_turn: 188,
        tanks: 6, artillery: 8, apcs: 4,
        no_equipment_handoff: true,
        kind_tag: 'hv_phantom',
    },
    {
        id: 'hv_134th_hgr_1995' as FormationId,
        name: 'HV 134th Home Guard Regiment (OG West)',
        corps_id: 'hvo_tomislavgrad' as FormationId,
        faction: 'HRHB',
        location_osid: 'op:livno:livno_2',
        spawn_turn: 150,
        withdrawal_turn: 188,
        tanks: 5, artillery: 8, apcs: 4,
        no_equipment_handoff: true,
        kind_tag: 'hv_phantom',
    },
];

const ALL_PHANTOM_DEFS: PhantomDef[] = [...JNA_PHANTOM_DEFS, ...HV_PHANTOM_DEFS, ...HV_PHANTOM_DEFS_1995];

export interface SpawnJnaPhantomBrigadesOptions {
    emitControlEvents?: boolean;
    controlEventMechanism?: 'combat' | 'setup_control';
    seedDisplacementTimers?: boolean;
}

/**
 * Spawn phantom brigades into the game state.
 * Called at scenario start (turn 0) AND each war-phase turn (so spawn_turn-gated
 * defs like the 1995 HV expeditionary wave can land at their authored turn).
 * Each def is idempotent: spawn check is `if (state.military.formations[def.id])`.
 * Handles both JNA (VRS) and HV (HRHB) phantoms.
 */
export function spawnJnaPhantomBrigades(state: GameState, options: SpawnJnaPhantomBrigadesOptions = {}): void {
    if (!state.military.formations) state.military.formations = {};
    const turn = state.meta?.turn ?? 0;
    const emitControlEvents = options.emitControlEvents ?? true;
    const controlEventMechanism = options.controlEventMechanism ?? 'combat';
    const seedDisplacementTimers = options.seedDisplacementTimers ?? true;

    // Phantoms that have ever been spawned. When a phantom withdraws its
    // formation entry is removed entirely, so `formations[def.id]` alone is
    // NOT sufficient to gate re-spawn — without this set, the spawn step (now
    // running each war turn for turn-gated 1995 HV defs) would re-spawn
    // long-withdrawn JNA / 1992 HV phantoms each turn and (worse) re-flip
    // their `capture_osids` controllers back. n2004 verified this regression.
    const spawned = (state.military.phantoms_spawned ??= []);
    const spawnedSet = new Set(spawned);

    for (const def of ALL_PHANTOM_DEFS) {
        if (spawnedSet.has(def.id)) continue;                 // never re-spawn
        if (state.military.formations[def.id]) continue;      // belt-and-braces — already in dict

        // Spawn-turn gate: defs with `spawn_turn` field only spawn when current
        // turn ≥ spawn_turn. Defs without it default to turn 0 (legacy behaviour,
        // preserves all existing JNA + 1992 HV Op-Jackal phantoms).
        const spawnTurn = def.spawn_turn ?? 0;
        if (turn < spawnTurn) continue;

        const faction: FactionId = def.faction ?? 'RS';
        const kindTag = def.kind_tag ?? 'jna_phantom';
        const spawnProfile = getPhantomSpawnProfile(def);

        const formation: FormationState = {
            id: def.id,
            faction,
            name: def.name,
            created_turn: turn,
            status: 'active',
            assignment: null,
            kind: kindTag,
            personnel: spawnProfile.personnel,
            corps_id: def.corps_id,
            location_osid: def.location_osid,
            withdrawal_turn: def.withdrawal_turn,
            posture: 'attack',
            cohesion: spawnProfile.cohesion,
            morale: spawnProfile.morale,
            experience: spawnProfile.experience,
            equipment_class: spawnProfile.equipmentClass,
            tags: [kindTag, `corps:${def.corps_id}`],
            composition: {
                infantry: spawnProfile.infantry,
                tanks: def.tanks,
                artillery: def.artillery,
                aa_systems: 2,
                tank_condition: { operational: 0.95, degraded: 0.04, non_operational: 0.01 },
                artillery_condition: { operational: 0.95, degraded: 0.04, non_operational: 0.01 },
            },
        } as FormationState;

        state.military.formations[def.id] = formation;
        // Mark as spawned so subsequent turns of the war-phase phantom-spawn
        // step skip this def even after the formation is removed on withdrawal.
        spawned.push(def.id);
        spawnedSet.add(def.id);

        // Ghost phantoms flip political control of target OSIDs at spawn
        if (def.capture_osids) {
            if (!state.political.political_controllers) state.political.political_controllers = {};
            for (const osid of def.capture_osids) {
                const previousController = state.political.political_controllers[osid];
                state.political.political_controllers[osid] = faction;
                if (seedDisplacementTimers && previousController && previousController !== faction) {
                    seedDisplacementTimerOnFlip(state, osid, previousController, faction);
                }
                if (emitControlEvents && previousController !== faction) {
                    (state.political.control_events ??= []).push({
                        turn: state.meta?.turn ?? 0,
                        settlement_id: osid,
                        mechanism: controlEventMechanism,
                        from: (previousController as string) ?? null,
                        to: faction,
                        mun_id: osid.split(':')[1],
                    });
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Withdrawal + equipment handoff
// ═══════════════════════════════════════════════════════════════════════════

export interface JnaWithdrawalEvent {
    phantom_id: FormationId;
    phantom_name: string;
    corps_id: FormationId;
    tanks_distributed: number;
    artillery_distributed: number;
    apcs_distributed: number;
    tanks_to_reserve: number;
    artillery_to_reserve: number;
    apcs_to_reserve: number;
}

/**
 * Process JNA phantom withdrawals for the current turn.
 * Returns withdrawal events for notifications.
 */
export function processJnaWithdrawals(state: GameState): JnaWithdrawalEvent[] {
    if (!state.military.formations) return [];
    const formations = state.military.formations;
    const turn = state.meta?.turn ?? 0;
    const events: JnaWithdrawalEvent[] = [];

    const phantomKinds = new Set(['jna_phantom', 'hv_phantom']);
    const phantomIds = Object.keys(formations)
        .filter(id => {
            const k = formations[id]?.kind;
            return k != null && phantomKinds.has(k);
        })
        .sort(strictCompare);

    for (const phantomId of phantomIds) {
        const phantom = state.military.formations[phantomId]!;
        if (phantom.status !== 'active') continue;

        // HV phantoms withdraw dynamically when Graz east Herzegovina truce activates
        // (Op Jackal complete → HV returns to Croatia), or at withdrawal_turn fallback.
        // SCOPE: this dynamic trigger applies ONLY to the 1992 Op-Jackal HV phantoms
        // (created at scenario init, turn 0). 1995 HV expeditionary phantoms have
        // `created_turn >= 150` (post-Split Agreement) and must NOT be evicted by the
        // long-past Graz Accords (May 1992). n2005 verified the prior shared-trigger
        // semantics caused the 1995 brigades to spawn-and-withdraw in the same turn.
        const isHvPhantom = phantom.kind === 'hv_phantom';
        const isHv1992OpJackal = isHvPhantom && (phantom.created_turn ?? 0) < 100;
        const grazEastActive = state.political.graz_east_herzegovina_active_turn != null;
        const hvShouldWithdraw = isHv1992OpJackal && grazEastActive;

        if (!hvShouldWithdraw && (phantom.withdrawal_turn == null || turn < phantom.withdrawal_turn)) continue;

        // This phantom withdraws now
        const corpsId = phantom.corps_id;
        const phantomDef = ALL_PHANTOM_DEFS.find(d => d.id === phantomId);

        // Ghost phantoms dissolve without equipment handoff
        if (phantomDef?.no_equipment_handoff) {
            events.push({
                phantom_id: phantomId as FormationId,
                phantom_name: phantom.name,
                corps_id: corpsId as FormationId,
                tanks_distributed: 0,
                artillery_distributed: 0,
                apcs_distributed: 0,
                tanks_to_reserve: 0,
                artillery_to_reserve: 0,
                apcs_to_reserve: 0,
            });

            // Remove from any active operations
            if (corpsId && state.military.corps_command?.[corpsId]) {
                for (const op of state.military.corps_command[corpsId].active_operations) {
                    if (!op.participating_brigades.includes(phantomId)) continue;
                    op.participating_brigades = op.participating_brigades.filter(id => id !== phantomId);
                    if (Array.isArray(op.axes)) {
                        for (const axis of op.axes) {
                            axis.assigned_brigades = axis.assigned_brigades.filter(id => id !== phantomId);
                        }
                    }
                    break;
                }
            }

            phantom.status = 'inactive';
            phantom.lifecycle_status = 'withdrawn';
            delete state.military.formations[phantomId];
            continue;
        }

        const comp = phantom.composition;
        let tanksToGive = comp?.tanks ?? 0;
        let artilleryToGive = comp?.artillery ?? 0;
        let apcsToGive = phantomDef?.apcs ?? 0;

        let tanksDistributed = 0;
        let artilleryDistributed = 0;
        let apcsDistributed = 0;

        if (corpsId) {
            // Find eligible receiving brigades in same corps.
            // Tank distribution priority: mech/motorized first (they can operate tanks),
            // then light/mountain only if mech/moto ceilings are full.
            // Artillery goes to all classes (JNA mortar/howitzer companies distributed to all TO units).
            const allEligible = Object.values(state.military.formations)
                .filter((f): f is FormationState =>
                    f != null &&
                    f.corps_id === corpsId &&
                    f.id !== phantomId &&
                    f.kind === 'brigade' &&
                    f.status === 'active' &&
                    f.faction === phantom.faction
                )
                .sort((a, b) => {
                    // Sort by proximity to phantom's location (same OSID first, then alphabetical)
                    const aMatch = a.location_osid === phantom.location_osid ? 0 : 1;
                    const bMatch = b.location_osid === phantom.location_osid ? 0 : 1;
                    if (aMatch !== bMatch) return aMatch - bMatch;
                    return strictCompare(a.id, b.id);
                });
            // For tank distribution: mech/moto first, then all (VRS had tanks everywhere,
            // but prioritize units that can use them effectively)
            const TANK_PRIORITY_CLASSES = new Set(['mechanized', 'motorized']);
            const tankPriorityBrigades = allEligible.filter(f => TANK_PRIORITY_CLASSES.has(f.equipment_class ?? ''));
            const tankFallbackBrigades = allEligible.filter(f => !TANK_PRIORITY_CLASSES.has(f.equipment_class ?? ''));
            const eligibleBrigades = allEligible; // artillery uses all

            // Helper: distribute tanks/APCs to a brigade list, returns remaining
            const distributeTanksTo = (brigades: FormationState[]) => {
                for (const brigade of brigades) {
                    if (tanksToGive <= 0 && apcsToGive <= 0) break;
                    const ceiling = getEquipmentCeiling(brigade.equipment_class);
                    if (!brigade.composition) {
                        brigade.composition = {
                            infantry: brigade.personnel ?? 1000,
                            tanks: 0, artillery: 0, aa_systems: 0,
                            tank_condition: { operational: 0.8, degraded: 0.15, non_operational: 0.05 },
                            artillery_condition: { operational: 0.8, degraded: 0.15, non_operational: 0.05 },
                        };
                    }
                    const comp = brigade.composition!;

                    // Tanks
                    const tankRoom = Math.max(0, ceiling.max_tanks - comp.tanks);
                    const tanksGiven = Math.min(tanksToGive, tankRoom);
                    if (tanksGiven > 0) {
                        const oldOp = comp.tank_condition.operational;
                        const oldCount = comp.tanks;
                        comp.tanks += tanksGiven;
                        tanksToGive -= tanksGiven;
                        tanksDistributed += tanksGiven;
                        const newOp = Math.min(0.95, (oldOp * oldCount + 0.95 * tanksGiven) / comp.tanks);
                        comp.tank_condition = { operational: newOp, degraded: (1 - newOp) * 0.8, non_operational: (1 - newOp) * 0.2 };
                    }

                    // APCs: added to tanks in composition (BrigadeComposition.tanks = MBTs + APCs)
                    const tankCeilingTotal = ceiling.max_tanks + ceiling.max_apcs;
                    const armorRoom = Math.max(0, tankCeilingTotal - comp.tanks);
                    const actualApcs = Math.min(apcsToGive, armorRoom);
                    if (actualApcs > 0) {
                        comp.tanks += actualApcs;
                        apcsToGive -= actualApcs;
                        apcsDistributed += actualApcs;
                    }
                }
            };

            // Tanks/APCs: mech/moto first, then light/mountain as fallback
            distributeTanksTo(tankPriorityBrigades);
            if (tanksToGive > 0 || apcsToGive > 0) {
                distributeTanksTo(tankFallbackBrigades);
            }

            // Artillery: all classes (JNA mortar/howitzer companies went to all TO units)
            for (const brigade of eligibleBrigades) {
                if (artilleryToGive <= 0) break;
                const ceiling = getEquipmentCeiling(brigade.equipment_class);
                if (!brigade.composition) {
                    brigade.composition = {
                        infantry: brigade.personnel ?? 1000,
                        tanks: 0, artillery: 0, aa_systems: 0,
                        tank_condition: { operational: 0.8, degraded: 0.15, non_operational: 0.05 },
                        artillery_condition: { operational: 0.8, degraded: 0.15, non_operational: 0.05 },
                    };
                }
                const comp = brigade.composition!;
                const artRoom = Math.max(0, ceiling.max_artillery - comp.artillery);
                const artGiven = Math.min(artilleryToGive, artRoom);
                if (artGiven > 0) {
                    const oldOp = comp.artillery_condition.operational;
                    const oldCount = comp.artillery;
                    comp.artillery += artGiven;
                    artilleryToGive -= artGiven;
                    artilleryDistributed += artGiven;
                    const newOp = Math.min(0.95, (oldOp * oldCount + 0.95 * artGiven) / comp.artillery);
                    comp.artillery_condition = { operational: newOp, degraded: (1 - newOp) * 0.8, non_operational: (1 - newOp) * 0.2 };
                }
            }

            // Excess goes to corps equipment reserve
            if (tanksToGive > 0 || artilleryToGive > 0 || apcsToGive > 0) {
                if (!state.military.corps_equipment_reserve) state.military.corps_equipment_reserve = {};
                const reserve = state.military.corps_equipment_reserve[corpsId] ?? { tanks: 0, artillery: 0, apcs: 0 };
                reserve.tanks += tanksToGive;
                reserve.artillery += artilleryToGive;
                reserve.apcs += apcsToGive;
                state.military.corps_equipment_reserve[corpsId] = reserve;
            }
        }

        events.push({
            phantom_id: phantomId as FormationId,
            phantom_name: phantom.name,
            corps_id: corpsId as FormationId,
            tanks_distributed: tanksDistributed,
            artillery_distributed: artilleryDistributed,
            apcs_distributed: apcsDistributed,
            tanks_to_reserve: tanksToGive,
            artillery_to_reserve: artilleryToGive,
            apcs_to_reserve: apcsToGive,
        });

        // Remove phantom from any active operations
        if (corpsId && state.military.corps_command?.[corpsId]) {
            for (const op of state.military.corps_command[corpsId].active_operations) {
                if (!op.participating_brigades.includes(phantomId)) continue;
                // Remove from flat participating_brigades
                op.participating_brigades = op.participating_brigades.filter(id => id !== phantomId);
                // Remove from axes
                if (Array.isArray(op.axes)) {
                    for (const axis of op.axes) {
                        axis.assigned_brigades = axis.assigned_brigades.filter(id => id !== phantomId);
                    }
                }
                break;
            }
        }

        // Disband: remove from formations
        phantom.status = 'inactive';
        phantom.lifecycle_status = 'withdrawn';
        delete state.military.formations[phantomId];
    }

    return events;
}

// ═══════════════════════════════════════════════════════════════════════════
// Notification helpers
// ═══════════════════════════════════════════════════════════════════════════

export interface JnaCountdownNotice {
    phantom_id: FormationId;
    phantom_name: string;
    turns_remaining: number;
}

/**
 * Generate withdrawal countdown notices for situation briefing.
 */
export function getJnaWithdrawalCountdowns(state: GameState): JnaCountdownNotice[] {
    if (!state.military.formations) return [];
    const formations = state.military.formations;
    const turn = state.meta?.turn ?? 0;
    const notices: JnaCountdownNotice[] = [];

    const phantomKinds = new Set(['jna_phantom', 'hv_phantom']);
    const phantomIds = Object.keys(formations)
        .filter(id => {
            const k = formations[id]?.kind;
            return k != null && phantomKinds.has(k);
        })
        .sort(strictCompare);

    for (const id of phantomIds) {
        const f = state.military.formations[id]!;
        if (f.status !== 'active' || f.withdrawal_turn == null) continue;
        const remaining = f.withdrawal_turn - turn;
        if (remaining >= 0) {
            notices.push({
                phantom_id: id as FormationId,
                phantom_name: f.name,
                turns_remaining: remaining,
            });
        }
    }
    return notices;
}

/** Exported for testing. */
export const _JNA_PHANTOM_DEFS = JNA_PHANTOM_DEFS;
export const _HV_PHANTOM_DEFS = HV_PHANTOM_DEFS;
export const _ALL_PHANTOM_DEFS = ALL_PHANTOM_DEFS;
export const _EQUIPMENT_CEILINGS = EQUIPMENT_CEILINGS;
