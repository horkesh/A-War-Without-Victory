import { describe, expect, it } from 'vitest';
import { buildDiplomacyView } from '../../src/ui/map/data/diplomacyView.js';

function makeDiplomacyState(overrides: Record<string, unknown> = {}) {
    return {
        meta: { turn: 44, phase: 'war', player_faction: 'RS' },
        factions: [
            {
                id: 'RS',
                patron_state: {
                    material_support_level: 0.62,
                    diplomatic_isolation: 0.41,
                    constraint_severity: 0.74,
                    patron_commitment: 0.55,
                    last_updated: 44,
                },
            },
            {
                id: 'RBiH',
                patron_state: {
                    material_support_level: 0.34,
                    diplomatic_isolation: 0.12,
                    constraint_severity: 0.28,
                    patron_commitment: 0.69,
                    last_updated: 44,
                },
            },
        ],
        political: {
            international_visibility_pressure: {
                sarajevo_siege_visibility: 0.8,
                enclave_humanitarian_pressure: 0.5,
                atrocity_visibility: 0.25,
                negotiation_momentum: 0.3,
                composite_ivp: 0.55,
                last_major_shift: 43,
            },
            ivp_consequences_active: ['international_sanctions', 'drina_blockade'],
        },
        military: {
            negotiation: {
                patron_relationships: {
                    RS: {
                        patron_id: 'serbia',
                        support_level: 66,
                        override_authority: 71,
                        sanctions_active: true,
                        relationship_events: ['belgrade_border_pressure'],
                    },
                    RBiH: {
                        patron_id: 'international_community',
                        support_level: 45,
                        override_authority: 15,
                        sanctions_active: false,
                        relationship_events: [],
                    },
                },
                pending_peace_plan: {
                    plan_id: 'vance_owen',
                    turn_offered: 40,
                    bot_responses: { RBiH: 'accepted', HRHB: 'accepted' },
                },
                pending_dayton: {
                    territorial_packages: [{ id: 'brcko', name: 'Brcko corridor', default_holder: 'RS', demand_cost: 20, concede_cost: 10 }],
                    institutional_packages: [{ id: 'central_state', name: 'Central institutions', centralized_cost: 25, decentralized_cost: 15 }],
                    faction_capital: { RS: 58, RBiH: 46 },
                    patron_override: { RS: 71 },
                },
                strategic_dimensions: {
                    RS: {
                        patron_confidence: { base_value: 50, event_modifier: -5, effective_value: 45 },
                        negotiating_leverage: { base_value: 60, event_modifier: 0, effective_value: 60 },
                    },
                },
            },
        },
        ...overrides,
    };
}

describe('buildDiplomacyView', () => {
    it('projects patron stance, active proposals, external actors, and top pressure reasons from existing state', () => {
        const view = buildDiplomacyView(makeDiplomacyState(), 'RS');

        expect(view.playerFaction).toBe('RS');
        expect(view.patronStance?.patronLabel).toBe('Serbia');
        expect(view.patronStance?.constraintBand).toBe('high');
        expect(view.patronStance?.stanceSummary).toBe('Serbia is constrained by sanctions and keeps the RS channel under pressure.');
        expect(view.activeProposals.map((proposal) => proposal.name)).toEqual([
            'Dayton negotiation menu',
            'Vance-Owen Peace Plan',
        ]);
        expect(view.externalActors.map((actor) => actor.patronLabel)).toEqual([
            'International Community',
            'Serbia',
        ]);
        expect(view.pressureReasons.map((reason) => reason.label).slice(0, 2)).toEqual([
            'Sarajevo siege visibility',
            'Enclave humanitarian pressure',
        ]);
        expect(view.activeConsequences.map((item) => item.label)).toEqual([
            'Drina blockade pressure',
            'International sanctions',
        ]);
        expect(view.negotiationTimeline.map((entry) => entry.label)).toContain('Vance-Owen Peace Plan');
        expect(view.negotiationTimeline.map((entry) => entry.label)).toContain('International sanctions');
        expect(view.needleHints.map((hint) => hint.label)).toContain('Ease Serbia constraint');
        expect(view.needleHints.map((hint) => hint.label)).toContain('Reduce Sarajevo siege visibility');
    });

    it('projects patron-confidence standing for the player faction', () => {
        const view = buildDiplomacyView(makeDiplomacyState(), 'RS');
        // strategic_dimensions.RS.patron_confidence.effective_value === 45 in the fixture.
        expect(view.patronConfidence).toEqual({ value: 45, band: 'neutral' });
    });

    it('omits patron-confidence when the dimension store is unpopulated', () => {
        const view = buildDiplomacyView(makeDiplomacyState(), 'HRHB');
        expect(view.patronConfidence).toBeUndefined();
    });

    it('summarizes player-faction defiance supply cuts when present, absent otherwise', () => {
        const withCuts = buildDiplomacyView(makeDiplomacyState({
            military: {
                ...(makeDiplomacyState().military as Record<string, unknown>),
                patron_defiance_supply_cuts: [
                    { faction: 'RS', turn: 30, cut_fraction: 0.2, support_after: 0.6 },
                    { faction: 'RS', turn: 44, cut_fraction: 0.35, support_after: 0.45 },
                    { faction: 'HRHB', turn: 40, cut_fraction: 0.5, support_after: 0.3 },
                ],
            },
        }), 'RS');
        expect(withCuts.patronDefianceCuts).toEqual({
            count: 2,
            latestCutFraction: 0.35,
            latestTurn: 44,
            latestSupportAfter: 0.45,
        });

        // No player-faction entries → summary absent (historical/calibration mode never writes these).
        const noCuts = buildDiplomacyView(makeDiplomacyState(), 'RS');
        expect(noCuts.patronDefianceCuts).toBeUndefined();
    });

    it('returns a stable empty view when diplomacy state has not been populated', () => {
        const view = buildDiplomacyView({
            meta: { turn: 2, phase: 'peace' },
            factions: [],
            political: {},
            military: {},
        }, 'RBiH');

        expect(view.hasSignals).toBe(false);
        expect(view.activeProposals).toEqual([]);
        expect(view.externalActors).toEqual([]);
        expect(view.pressureReasons).toEqual([]);
        expect(view.negotiationTimeline).toEqual([]);
        expect(view.needleHints).toEqual([]);
    });
});
