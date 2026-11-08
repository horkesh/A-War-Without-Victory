/**
 * Dayton IPC proposal, preview, signing, and save/load-mid-negotiation tests.
 *
 * The `preview-dayton` IPC handler (electron-main.cjs) runs the real
 * evaluateBotResponse + resolveDaytonNegotiation on a THROWAWAY deserialized
 * clone and discards it — surfacing the authoritative readouts + bot counter-offers
 * WITHOUT mutating game state. The handler tests also exercise the shared proposal
 * contract and signing transaction; the sim tests cover the readouts, counters and
 * pending_dayton round trip used to resume a negotiation after loading a save.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, it, expect, vi } from 'vitest';
import type { GameState } from '../../src/state/game_state.js';
import type { DaytonAgreementRecord, DaytonProposal, NegotiationBreakdown, PatronRelationship, PendingDaytonPacket } from '../../src/state/negotiation_types.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../../src/state/negotiation_types.js';
import { resolveDaytonNegotiation } from '../../src/sim/negotiation/dayton_negotiation.js';
import { evaluateBotResponse } from '../../src/sim/negotiation/bot_negotiation.js';
import { getAllCompetencyPackages } from '../../src/sim/negotiation/competency_packages.js';
import { getAllConstitutionalChoices, getAllReturnJusticeChoices } from '../../src/sim/negotiation/constitutional_packages.js';
import { initializeStrategicDimensions } from '../../src/sim/events/strategic_dimensions.js';
import { derivePendingDayton, deriveSettlementMap } from '../../src/ui/map/data/GameStateAdapter.js';
import * as desktopSim from '../../src/desktop/desktop_sim.js';

const { projectPlayerVisibleStateJson } = createRequire(import.meta.url)('../../src/desktop/player_visible_state.cjs');

const PENDING: PendingDaytonPacket = {
    territorial_packages: [
        { id: 'gorazde_corridor', name: 'Goražde Corridor', default_holder: 'RS', demand_cost: 12, concede_cost: 8 },
        { id: 'brcko_district', name: 'Brčko District', default_holder: 'RS', demand_cost: 20, concede_cost: 15 },
    ],
    institutional_packages: [
        { id: 'military', name: 'Military Structure', centralized_cost: 15, decentralized_cost: 10 },
    ],
    faction_capital: { RBiH: 80, RS: 60, HRHB: 40 },
    patron_override: { RBiH: 5, RS: 10, HRHB: 25 },
};

function makeState(): GameState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, PatronRelationship> = {};
    for (const f of ['RBiH', 'RS', 'HRHB']) {
        capital[f] = { ...createEmptyCapital(), territory_controlled_pct: 30, refugees_created: 50_000 };
        patron_relationships[f] = createDefaultPatronRelationship(f);
    }
    const store = initializeStrategicDimensions();
    for (const f of ['RBiH', 'RS', 'HRHB']) {
        for (const dim of Object.keys(store[f])) store[f][dim] = { base_value: 55, event_modifier: 0, effective_value: 55 };
    }
    return {
        meta: { turn: 190, war_start_turn: 0, phase: 'war', seed: 1, date: '1995-11-21', game_over: false, player_faction: 'RBiH', decision_mode: 'emergent' },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: {},
            negotiation: {
                capital, patron_relationships, peace_plan_history: [],
                strategic_dimensions: store, pending_dayton: PENDING,
            },
        },
        political: { political_controllers: { 'op:sarajevo:sarajevo_1': 'RBiH', 'op:banja_luka:banja_luka_2': 'RS', 'op:mostar:mostar_1': 'HRHB' } },
        displacement: {},
    } as unknown as GameState;
}

const DEMAND_PROPOSAL: DaytonProposal = {
    territorial_demands: ['gorazde_corridor', 'brcko_district'],
    territorial_concessions: [],
    institutional_choices: { military: 'centralized' },
};

const STRUCTURAL_PROPOSAL: DaytonProposal = {
    territorial_demands: [],
    territorial_concessions: [],
    institutional_choices: {},
    entity_autonomy: 'federalized',
    competency_allocation: { comp_foreign_policy: 'shared', comp_defense: 'state' },
    constitutional_choices: { arch_ohr_authority: 'monitoring_only' },
    return_justice: { rj_refugee_return: 'full_right_of_return' },
};

const DAYTON_CHANNELS = ['preview-dayton', 'resolve-dayton'] as const;
type DaytonChannel = (typeof DAYTON_CHANNELS)[number];
type DaytonHandler = (_event: object, payload: unknown) => Promise<{
    ok: boolean; result?: unknown; agreement?: DaytonAgreementRecord; botResponses?: unknown; playerFaction?: string; error?: string;
}>;

// Electron exits if required in Node. Execute the actual registrations and
// canonical transaction code, replacing only the process/IO boundaries.
function loadDaytonHandlers(state = makeState(), useCanonicalSerialization = false) {
    const source = readFileSync('src/desktop/electron-main.cjs', 'utf8');
    const canonical = source.slice(
        source.indexOf('function readCanonicalCurrentState('),
        source.indexOf('async function loadStatePathIntoDesktop('),
    );
    const dayton = source.slice(
        source.indexOf("ipcMain.handle('resolve-dayton'"),
        source.indexOf('// --- Read-only query handlers (UI previews; no state mutation) ---'),
    );
    const handlers = new Map<string, DaytonHandler>();
    const serializeState = useCanonicalSerialization ? desktopSim.serializeState : JSON.stringify;
    const serializeRuntimeState = useCanonicalSerialization ? desktopSim.serializeRuntimeState : JSON.stringify;
    const deserializeState = vi.fn(useCanonicalSerialization ? desktopSim.deserializeState : (json: string): GameState => JSON.parse(json));
    const sim = {
        ...desktopSim,
        deserializeState,
        serializeRuntimeState,
        serializeState,
        resolveDesktopDaytonAgreement: vi.fn(desktopSim.resolveDesktopDaytonAgreement),
        evaluateBotResponse: vi.fn(desktopSim.evaluateBotResponse),
        writeOwedTerminationRecords: vi.fn(),
    };
    const context = {
        currentGameStateJson: serializeRuntimeState(state),
        currentCanonicalSaveJson: serializeState(state),
        getDesktopSim: () => sim,
        getBaseDir: () => process.cwd(),
        ipcMain: { handle: (channel: string, handler: DaytonHandler) => handlers.set(channel, handler) },
        autoSave: vi.fn(),
        sendGameStateToRenderer: vi.fn(),
    };
    runInNewContext(`${canonical}\n${dayton}`, context);
    return { invoke: (channel: DaytonChannel, payload: unknown) => handlers.get(channel)!({}, payload), sim, context };
}

describe('desktop Dayton proposal IPC', () => {
    it('previews and signs all institutional fields, keeping preview read-only', async () => {
        const { invoke, sim, context } = loadDaytonHandlers();
        const before = context.currentGameStateJson;
        const expected = desktopSim.resolveDaytonNegotiation(makeState(), STRUCTURAL_PROPOSAL, process.cwd());
        const preview = await invoke('preview-dayton', STRUCTURAL_PROPOSAL);

        expect(preview).toMatchObject({ ok: true, result: expected, playerFaction: 'RBiH' });
        expect(sim.resolveDesktopDaytonAgreement.mock.calls[0][1]).toEqual(STRUCTURAL_PROPOSAL);
        expect(Object.keys(sim.resolveDesktopDaytonAgreement.mock.calls[0][1].competency_allocation!))
            .toEqual(['comp_defense', 'comp_foreign_policy']);
        expect(preview.botResponses).toEqual({
            HRHB: desktopSim.evaluateBotResponse(makeState(), 'HRHB', STRUCTURAL_PROPOSAL),
            RS: desktopSim.evaluateBotResponse(makeState(), 'RS', STRUCTURAL_PROPOSAL),
        });
        expect(sim.resolveDesktopDaytonAgreement.mock.calls[0][0].meta.game_over).toBe(true);
        expect(context.currentGameStateJson).toBe(before);
        expect(context.currentCanonicalSaveJson).toBe(before);
        expect(context.autoSave).not.toHaveBeenCalled();
        expect(context.sendGameStateToRenderer).not.toHaveBeenCalled();

        expect(await invoke('resolve-dayton', STRUCTURAL_PROPOSAL)).toEqual({ ok: true, result: preview.result, agreement: preview.agreement });
        expect(sim.resolveDesktopDaytonAgreement.mock.calls[1][1]).toEqual(STRUCTURAL_PROPOSAL);
        expect(context.autoSave).toHaveBeenCalledOnce();
        expect(context.sendGameStateToRenderer).toHaveBeenCalledOnce();
        expect(JSON.parse(context.currentCanonicalSaveJson).military.negotiation.dayton_result).toEqual(expected);
    });

    it.each(DAYTON_CHANNELS)('%s rejects malformed proposals before resolution or write', async (channel) => {
        const { invoke, sim, context } = loadDaytonHandlers();
        const before = context.currentGameStateJson;
        const invalidPayloads = [
            [],
            { territorial_demands: 'gorazde_corridor' },
            { territorial_demands: ['not_a_package'] },
            { territorial_demands: ['front:missing'] },
            { territorial_demands: ['gorazde_corridor', 'gorazde_corridor'] },
            { territorial_demands: ['brcko_district'], territorial_concessions: ['brcko_district'] },
            { territorial_demands: Array(128).fill('gorazde_corridor') },
            { institutional_choices: { military: 'unknown' } },
            { institutional_choices: { unknown: 'centralized' } },
            { entity_autonomy: 'unknown' },
            { competency_allocation: { comp_defense: 'unknown' } },
            { competency_allocation: { unknown: 'state' } },
            { constitutional_choices: { arch_presidency: 'monitoring_only' } },
            { constitutional_choices: { rj_icty_cooperation: 'full' } },
            { return_justice: { rj_refugee_return: 'full' } },
            { return_justice: { arch_presidency: 'single_elected' } },
            { return_justice: [] },
            { arbitrary: true },
        ];
        for (const payload of invalidPayloads) {
            expect(await invoke(channel, payload)).toMatchObject({ ok: false, error: expect.stringContaining('Invalid Dayton proposal') });
        }
        expect(sim.resolveDesktopDaytonAgreement).not.toHaveBeenCalled();
        expect(sim.evaluateBotResponse).not.toHaveBeenCalled();
        expect(context.currentGameStateJson).toBe(before);
        expect(context.currentCanonicalSaveJson).toBe(before);
        expect(context.autoSave).not.toHaveBeenCalled();
        expect(context.sendGameStateToRenderer).not.toHaveBeenCalled();
    });

    it.each(DAYTON_CHANNELS)('%s rejects over-budget input without changing the forced table', async (channel) => {
        const state = makeState();
        const neg = state.military.negotiation!;
        neg.pending_dayton = { ...PENDING, forced: { on_faction: 'RBiH', by: 'united_states', opened_turn: 190 } };
        for (const dim of Object.keys(neg.strategic_dimensions!.RBiH)) {
            neg.strategic_dimensions!.RBiH[dim].effective_value = 0;
        }
        const { invoke, sim, context } = loadDaytonHandlers(state);
        const before = context.currentGameStateJson;

        for (const payload of [DEMAND_PROPOSAL, { competency_allocation: { comp_foreign_policy: 'entity' } }]) {
            expect(await invoke(channel, payload)).toMatchObject({ ok: false, error: expect.stringContaining('budget') });
        }
        expect(sim.resolveDesktopDaytonAgreement).not.toHaveBeenCalled();
        expect(sim.evaluateBotResponse).not.toHaveBeenCalled();
        expect(context.currentGameStateJson).toBe(before);
        expect(context.currentCanonicalSaveJson).toBe(before);
        expect(context.autoSave).not.toHaveBeenCalled();
        expect(context.sendGameStateToRenderer).not.toHaveBeenCalled();
    });

    it('still accepts an omitted legacy proposal at an ordinary or forced table', async () => {
        for (const forced of [undefined, { on_faction: 'RBiH', by: 'united_states', opened_turn: 190 }] as const) {
            const state = makeState();
            state.military.negotiation!.pending_dayton = { ...PENDING, forced };
            const { invoke, context } = loadDaytonHandlers(state);
            const expected = desktopSim.resolveDaytonNegotiation(state, {
                territorial_demands: [], territorial_concessions: [], institutional_choices: {},
            }, process.cwd());
            expect(await invoke('preview-dayton', {})).toMatchObject({ ok: true, result: expected });
            expect(await invoke('resolve-dayton', undefined)).toMatchObject({ ok: true, result: expected });
            expect(context.autoSave).toHaveBeenCalledOnce();
        }
    });

    it('accepts captured-ground IDs from the current table', async () => {
        const state = makeState();
        state.political.political_controllers = { 'op:sipovo:pribeljci_2': 'RBiH' };
        const proposal: DaytonProposal = {
            territorial_demands: ['front:sipovo:RBiH:RS'], territorial_concessions: [], institutional_choices: {},
        };
        const { invoke } = loadDaytonHandlers(state);
        const expected = desktopSim.resolveDaytonNegotiation(state, proposal, process.cwd());
        expect([...expected.territorial_packages_accepted, ...expected.territorial_packages_rejected])
            .toContain('front:sipovo:RBiH:RS');
        expect(await invoke('preview-dayton', proposal)).toMatchObject({ ok: true, result: expected });
        expect(await invoke('resolve-dayton', proposal)).toMatchObject({ ok: true, result: expected });
    });

    it('returns the first signed agreement on retry without another write', async () => {
        const state = makeState();
        for (const dim of Object.keys(state.military.negotiation!.strategic_dimensions!.RBiH)) {
            state.military.negotiation!.strategic_dimensions!.RBiH[dim].effective_value = 0;
        }
        const { invoke, context } = loadDaytonHandlers(state);
        const first = await invoke('resolve-dayton', undefined);
        expect(first.ok).toBe(true);
        const signed = context.currentGameStateJson;
        const signedSave = context.currentCanonicalSaveJson;

        expect(await invoke('resolve-dayton', DEMAND_PROPOSAL)).toEqual(first);
        expect(context.currentGameStateJson).toBe(signed);
        expect(context.currentCanonicalSaveJson).toBe(signedSave);
        expect(context.autoSave).toHaveBeenCalledOnce();
        expect(context.sendGameStateToRenderer).toHaveBeenCalledOnce();
    });

    it('signs the previewed transfers and terms and keeps them fixed through canonical reload', async ({ onTestFinished }) => {
        const state = makeState();
        const held = 'op:sipovo:pribeljci_2';
        const arbitration = 'op:brcko:bijela_2';
        state.political.political_controllers = { [held]: 'RBiH', [arbitration]: 'RS' };
        for (const bot of ['HRHB', 'RS']) {
            state.military.negotiation!.patron_relationships[bot].override_authority = 90;
        }
        const { invoke, context } = loadDaytonHandlers(state, true);
        const saveDir = mkdtempSync(join(tmpdir(), 'awwv-dayton-agreement-'));
        onTestFinished(() => rmSync(saveDir, { recursive: true, force: true }));
        const savePath = join(saveDir, 'autosave.json');
        context.autoSave.mockImplementation(() => writeFileSync(savePath, context.currentCanonicalSaveJson, 'utf8'));
        const before = context.currentGameStateJson;
        const preview = await invoke('preview-dayton', STRUCTURAL_PROPOSAL);
        expect(preview).toMatchObject({
            ok: true,
            agreement: {
                version: 1,
                terms: {
                    brcko_status: 'arbitration',
                    entity_autonomy: 'federalized',
                    competency_allocation: { comp_defense: 'state', comp_police: 'entity' },
                    constitutional_choices: { arch_ohr_authority: 'monitoring_only' },
                    return_justice: { rj_refugee_return: 'full_right_of_return', rj_icty_cooperation: 'conditional' },
                },
                map: {
                    controllers: { [held]: 'RS', [arbitration]: 'RS' },
                    wartimeControllers: { [held]: 'RBiH', [arbitration]: 'RS' },
                    specialOsids: [arbitration],
                },
            },
        });
        expect(context.currentGameStateJson).toBe(before);
        expect(context.autoSave).not.toHaveBeenCalled();
        expect(existsSync(savePath)).toBe(false);

        const signed = await invoke('resolve-dayton', STRUCTURAL_PROPOSAL);
        expect(signed).toEqual({ ok: true, result: preview.result, agreement: preview.agreement });
        const savedBytes = readFileSync(savePath, 'utf8');
        expect(savedBytes).toBe(context.currentCanonicalSaveJson);
        const reloaded = desktopSim.deserializeState(savedBytes);
        expect(desktopSim.serializeState(reloaded)).toBe(savedBytes);
        expect(reloaded.political.political_controllers).toEqual(state.political.political_controllers);
        expect(reloaded.military.negotiation?.dayton_agreement).toEqual(preview.agreement);
        expect(preview.agreement?.map.territoryPct).toEqual(reloaded.military.negotiation?.settlement?.territory_pct);
        reloaded.political.political_controllers![held] = 'HRHB';
        const drifted = loadDaytonHandlers(reloaded, true);
        expect(await drifted.invoke('resolve-dayton', DEMAND_PROPOSAL)).toEqual(signed);
        expect(await drifted.invoke('preview-dayton', DEMAND_PROPOSAL)).toEqual(signed);
        expect(drifted.context.autoSave).not.toHaveBeenCalled();
        const visible = JSON.parse(projectPlayerVisibleStateJson(drifted.context.currentGameStateJson));
        const visibleNegotiation = visible.military.negotiation;
        expect(visibleNegotiation.dayton_agreement).toEqual(preview.agreement);
        expect(visibleNegotiation.dayton_result).toBeUndefined();
        expect(Object.keys(visibleNegotiation.patron_relationships)).toEqual(['RBiH']);
    });

    it('marks a Brčko cell awarded at the table as a transfer without an arbitration marker', async () => {
        const state = makeState();
        const brcko = 'op:brcko:bijela_2';
        state.meta.player_faction = 'RS';
        state.political.political_controllers = { [brcko]: 'RS' };
        const { invoke } = loadDaytonHandlers(state);
        const preview = await invoke('preview-dayton', { territorial_concessions: ['brcko_district'] });
        expect(preview).toMatchObject({
            ok: true,
            agreement: {
                terms: { brcko_status: 'federation' },
                map: {
                    controllers: { [brcko]: 'RBiH' },
                    wartimeControllers: { [brcko]: 'RS' },
                    specialOsids: [],
                },
            },
        });
    });

    it('freezes complete default terms for new signatures and leaves legacy signatures terms-only', async () => {
        const legacyState = makeState();
        const legacyResult = desktopSim.resolveDaytonNegotiation(legacyState, {
            territorial_demands: [], territorial_concessions: [], institutional_choices: {},
        }, process.cwd());
        const { invoke, context } = loadDaytonHandlers(makeState(), true);
        const signed = await invoke('resolve-dayton', undefined);
        expect(signed.result).toEqual(legacyResult);
        expect(signed.agreement).toMatchObject({
            terms: {
                entity_autonomy: 'dayton-historical',
                competency_allocation: Object.fromEntries(getAllCompetencyPackages().map(item => [item.id, item.default_owner])),
                constitutional_choices: Object.fromEntries(getAllConstitutionalChoices().map(item => [item.id, item.options.find(option => option.is_default)!.id])),
                return_justice: Object.fromEntries(getAllReturnJusticeChoices().map(item => [item.id, item.options.find(option => option.is_default)!.id])),
            },
        });
        const signedState = desktopSim.deserializeState(context.currentCanonicalSaveJson);
        delete signedState.military.negotiation!.dayton_agreement;
        expect(desktopSim.serializeState(signedState)).toBe(desktopSim.serializeState(legacyState));

        const old = loadDaytonHandlers(legacyState, true);
        for (const channel of DAYTON_CHANNELS) {
            expect(await old.invoke(channel, undefined)).toEqual({ ok: true, result: legacyResult });
        }
        expect(old.context.autoSave).not.toHaveBeenCalled();
        const visible = JSON.parse(projectPlayerVisibleStateJson(old.context.currentGameStateJson));
        expect(visible.military.negotiation.dayton_agreement).toBeUndefined();
    });
});

it('ignores a malformed frozen map when adapting a save', () => {
    expect(deriveSettlementMap({
        military: { negotiation: { dayton_agreement: { version: 1, map: {} } } },
    })).toBeUndefined();
});

describe('preview-dayton: no-mutation guarantee (run on a clone)', () => {
    it('resolving on a deserialized clone leaves the original state pending + unresolved', () => {
        const original = makeState();
        const beforeJson = JSON.stringify(original);

        // Simulate the IPC handler: deserialize a fresh CLONE and resolve on it only.
        const clone = JSON.parse(beforeJson) as GameState;
        const result = resolveDaytonNegotiation(clone, DEMAND_PROPOSAL);

        // The clone resolved (authoritative readouts present)…
        expect(result.entity_autonomy_index).toBeTypeOf('number');
        expect(typeof result.brcko_status).toBe('string');
        expect(clone.meta.game_over).toBe(true);

        // …but the ORIGINAL is byte-identical: still pending, not game-over, no result.
        expect(JSON.stringify(original)).toBe(beforeJson);
        expect(original.meta.game_over).toBe(false);
        expect(original.military.negotiation?.dayton_result).toBeUndefined();
        expect(original.military.negotiation?.pending_dayton).toBeDefined();
    });

    it('the preview surfaces the authoritative dysfunction + Brčko readouts', () => {
        const clone = makeState();
        const result = resolveDaytonNegotiation(clone, {
            territorial_demands: [], territorial_concessions: [], institutional_choices: {},
        });
        // Unraised Brčko → arbitration district (Annex-2 condominium of both entities).
        expect(result.brcko_status).toBe('arbitration');
        expect(result.brcko_arbitration).toBe(true);
        // Emergent-mode → dysfunction index is computed and stamped.
        expect(result.peace_dysfunction_index).toBeTypeOf('number');
    });
});

describe('preview-dayton: bot counter-offer is surfaced', () => {
    it('evaluateBotResponse produces a counter-offer the modal can render', () => {
        const state = makeState();
        // A heavy demand against RS that exceeds its acceptance band → reject/counter.
        const resp = evaluateBotResponse(state, 'RS', DEMAND_PROPOSAL);
        expect(['accept', 'reject', 'counter']).toContain(resp.decision);
        expect(resp.available_capital).toBeGreaterThan(0);
        if (resp.decision === 'counter') {
            expect(resp.counter_proposal).toBeDefined();
            // The counter is a SUBSET of the player's demands → the modal diff works.
            for (const id of resp.counter_proposal!.territorial_demands) {
                expect(DEMAND_PROPOSAL.territorial_demands).toContain(id);
            }
        }
    });
});

describe('save/load mid-negotiation: pending_dayton survives a round-trip', () => {
    it('a pending packet persists through JSON serialize → parse and re-derives in the UI adapter', () => {
        const state = makeState();
        const roundTripped = JSON.parse(JSON.stringify(state)) as GameState;

        const pd = roundTripped.military.negotiation?.pending_dayton;
        expect(pd).toBeDefined();
        expect(pd!.territorial_packages).toHaveLength(2);

        // The UI adapter still derives the pending-Dayton view (modal re-opens).
        const view = derivePendingDayton(roundTripped);
        expect(view).toBeDefined();
        expect(view!.territorialPackages.map((p) => p.id).sort()).toEqual(['brcko_district', 'gorazde_corridor']);
        expect(view!.factionCapital.RBiH).toBe(80);
    });

    it('once resolved, the adapter stops deriving the pending view (modal closes)', () => {
        const state = makeState();
        resolveDaytonNegotiation(state, DEMAND_PROPOSAL);
        const roundTripped = JSON.parse(JSON.stringify(state)) as GameState;
        // game_over + dayton_result set → no pending view.
        expect(derivePendingDayton(roundTripped)).toBeUndefined();
    });
});
