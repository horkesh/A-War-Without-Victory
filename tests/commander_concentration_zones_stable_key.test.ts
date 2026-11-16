/**
 * N6 (2026-11-16): last turn's enemy-concentration sectors are mapped onto this turn's sectors by
 * stable sector key, not by the positional sector id the partition re-mints every turn. The zones
 * reach the player's command-strain text ("Enemy concentration detected ...").
 */
import { describe, expect, it } from 'vitest';

import { concentrationZonesFromPreviousIntel } from '../src/sim/combat/commander/assess.js';
import { stableSectorKey } from '../src/sim/combat/sector_intel.js';
import { deriveCorpsSituationAssessment } from '../src/ui/map/data/command_strain.js';
import type { CorpsFrontSector } from '../src/state/game_state.js';

function sector(sectorId: string, edges: string[], osids: string[]): CorpsFrontSector {
    return {
        sector_id: sectorId, corps_id: 'arbih_4th_corps', faction: 'RBiH', opposing_factions: [], edge_ids: edges,
        sub_segments: [], length_edges: edges.length, territory_osids: osids, assigned_brigade_ids: [],
        reserve_brigade_ids: [], density: 1, threat_ratio: 1, defensive_power: 100, sector_stance: 'defend',
        stance_source: 'bot',
    } as unknown as CorpsFrontSector;
}

const zone = (zoneId: string, osids: string[]) => ({ zone_id: zoneId, osids }) as never;

// Last turn, the massing was seen on the Konjic sector, then numbered sector:arbih_4th_corps:3.
const KONJIC_LAST_TURN = sector('sector:arbih_4th_corps:3', ['e_konjic'], ['op:konjic:bijela_2']);
// This turn the partition renumbered: Konjic is now :0, and :3 is a different (Mostar) sector.
const KONJIC_NOW = sector('sector:arbih_4th_corps:0', ['e_konjic'], ['op:konjic:bijela_2']);
const MOSTAR_NOW = sector('sector:arbih_4th_corps:3', ['e_mostar'], ['op:mostar:vranjevici_2']);
const ZONES = [zone('zone:konjic', ['op:konjic:bijela_2']), zone('zone:mostar', ['op:mostar:vranjevici_2'])];

const PREVIOUS_PICTURE = {
    zone_confidence: {},
    offensive_signs: { 'sector:arbih_4th_corps:3': 1 },
    concentration_detected: { 'sector:arbih_4th_corps:3': true },
    concentration_detected_by_stable_key: { [stableSectorKey(KONJIC_LAST_TURN)]: true },
    last_updated_turn: 76,
};

describe('N6: enemy concentration zones survive sector renumbering', () => {
    it('maps last turn\'s concentration to the same sector after it was renumbered', () => {
        const zones = concentrationZonesFromPreviousIntel(PREVIOUS_PICTURE, [MOSTAR_NOW, KONJIC_NOW], ZONES);
        expect(zones).toEqual(['zone:konjic']);
    });

    it('a picture saved before N6 (no stable map) keeps the positional lookup', () => {
        const legacy = { ...PREVIOUS_PICTURE, concentration_detected_by_stable_key: undefined };
        // Positional: :3 is now the Mostar sector. This is the old behaviour, kept only for old saves.
        expect(concentrationZonesFromPreviousIntel(legacy, [MOSTAR_NOW, KONJIC_NOW], ZONES)).toEqual(['zone:mostar']);
    });

    it('no previous picture, no concentration', () => {
        expect(concentrationZonesFromPreviousIntel(null, [KONJIC_NOW], ZONES)).toEqual([]);
    });

    it('the player\'s strain text reports the concentration on the right corps when it was real', () => {
        const zones = concentrationZonesFromPreviousIntel(PREVIOUS_PICTURE, [KONJIC_NOW], ZONES);
        const withConcentration = deriveCorpsSituationAssessment(
            { threat_assessment: { overall_pressure: 'moderate', enemy_concentration_zones: zones } }, 'defensive', 0, 0,
        );
        expect(withConcentration.threatContext).toBe('Enemy concentration detected — defensive readiness elevated');

        // Before N6 a renumbered corps whose old id no longer existed lost the warning entirely.
        const legacyZones = concentrationZonesFromPreviousIntel(
            { ...PREVIOUS_PICTURE, concentration_detected_by_stable_key: undefined }, [KONJIC_NOW], ZONES,
        );
        expect(legacyZones).toEqual([]);
        const withoutConcentration = deriveCorpsSituationAssessment(
            { threat_assessment: { overall_pressure: 'moderate', enemy_concentration_zones: legacyZones } }, 'defensive', 0, 0,
        );
        expect(withoutConcentration.threatContext).toBeNull();
    });
});
