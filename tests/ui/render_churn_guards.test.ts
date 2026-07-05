import { describe, it, expect } from 'vitest';
import {
    deckLayerRenderInputsChanged,
    shouldPreserveDeckFormationCounters,
    shouldRunPulseAnimation,
    type DeckLayerRenderInputs,
} from '../../src/ui/map/map/renderChurnGuards.js';

function makeInputs(overrides: Partial<DeckLayerRenderInputs> & {
    featureIds?: string[];
    loadedFormationCount?: number;
} = {}): DeckLayerRenderInputs {
    const formationsGeoJson = {
        type: 'FeatureCollection',
        features: (overrides.featureIds ?? []).map((id) => ({ type: 'Feature', properties: { id } })),
    } as any;
    const loadedGameState = {
        turn: 10,
        phase: 'war',
        formations: Array.from({ length: overrides.loadedFormationCount ?? 0 }, (_, index) => ({ id: `f${index}` })),
    } as any;
    const centroidLookup = new Map() as any;
    const { featureIds: _featureIds, loadedFormationCount: _loadedFormationCount, ...rest } = overrides;
    return {
        formationsGeoJson,
        labelsVisible: true,
        formationsVisible: true,
        zoom: 8,
        loadedGameState,
        centroidLookup,
        ghostMapVisible: false,
        ghostMapData: undefined,
        selectedFormationId: null,
        selectedCorpsId: null,
        selectedCorpsFrontSectorId: null,
        hoveredSectorId: null,
        hoveredCorpsId: null,
        ...rest,
    };
}

describe('renderChurnGuards', () => {
    it('treats identical deck-layer inputs as reusable', () => {
        const shared = makeInputs();
        expect(deckLayerRenderInputsChanged(shared, shared)).toBe(false);
    });

    it('rebuilds deck layers when selection changes', () => {
        const previous = makeInputs();
        const next = makeInputs({
            formationsGeoJson: previous.formationsGeoJson,
            loadedGameState: previous.loadedGameState,
            centroidLookup: previous.centroidLookup,
            selectedFormationId: 'brig_101',
        });
        expect(deckLayerRenderInputsChanged(previous, next)).toBe(true);
    });

    it('rebuilds deck layers when zoom changes', () => {
        const previous = makeInputs();
        const next = makeInputs({
            formationsGeoJson: previous.formationsGeoJson,
            loadedGameState: previous.loadedGameState,
            centroidLookup: previous.centroidLookup,
            zoom: 9,
        });
        expect(deckLayerRenderInputsChanged(previous, next)).toBe(true);
    });

    it('skips pulse animation when there is nothing live to animate', () => {
        expect(shouldRunPulseAnimation({
            mapReady: true,
            stagedOrderCount: 0,
            ghostLineActive: false,
            battlesVisible: true,
            recentCombatEventCount: 0,
            currentTurnBattleCount: 0,
        })).toBe(false);
    });

    it('keeps pulse animation alive for staged orders or live combat markers', () => {
        expect(shouldRunPulseAnimation({
            mapReady: true,
            stagedOrderCount: 1,
            ghostLineActive: false,
            battlesVisible: false,
            recentCombatEventCount: 0,
            currentTurnBattleCount: 0,
        })).toBe(true);

        expect(shouldRunPulseAnimation({
            mapReady: true,
            stagedOrderCount: 0,
            ghostLineActive: false,
            battlesVisible: true,
            recentCombatEventCount: 1,
            currentTurnBattleCount: 0,
        })).toBe(true);
    });

    it('preserves a non-empty deck counter layer across transient empty GeoJSON while formations still exist', () => {
        const previous = makeInputs({ featureIds: ['own_1', 'enemy_contact_1'], loadedFormationCount: 100 });
        const next = makeInputs({ featureIds: [], loadedFormationCount: 100 });

        expect(shouldPreserveDeckFormationCounters(previous, next)).toBe(true);
    });

    it('allows deck counters to clear when formations are explicitly hidden or the state has no formations', () => {
        const previous = makeInputs({ featureIds: ['own_1'], loadedFormationCount: 1 });

        expect(shouldPreserveDeckFormationCounters(previous, makeInputs({
            featureIds: [],
            loadedFormationCount: 1,
            formationsVisible: false,
        }))).toBe(false);
        expect(shouldPreserveDeckFormationCounters(previous, makeInputs({
            featureIds: [],
            loadedFormationCount: 0,
        }))).toBe(false);
    });
});
