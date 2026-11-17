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
        expect(view.patronStance?.patronLabelToken).toEqual({ key: 'diplomacy.patron.serbia' });
        expect(view.patronStance?.constraintBand).toBe('high');
        // Player-safe: raw faction slug RS must resolve to the military name VRS in prose.
        expect(view.patronStance?.stanceSummary).toBe('Serbia is constrained by sanctions and keeps the VRS channel under pressure.');
        expect(view.patronStance?.stanceSummaryToken).toEqual({
            key: 'diplomacy.actor.summary.sanctions',
            params: { force: 'VRS' },
        });
        // The bare slug "RS" must never appear as a standalone word (VRS is fine).
        expect(view.patronStance?.stanceSummary).not.toMatch(/\bRS\b/);
        expect(view.activeProposals.map((proposal) => proposal.name)).toEqual([
            'Dayton negotiation menu',
            'Vance-Owen Peace Plan',
        ]);
        expect(view.activeProposals[0]?.nameToken).toEqual({ key: 'diplomacy.proposal.dayton.name' });
        expect(view.activeProposals[0]?.detailToken).toEqual({
            key: 'diplomacy.proposal.dayton.detail',
            params: { territorialCount: 1, institutionalCount: 1 },
        });
        // #124: the player's own patron (Serbia, surfaced as patronStance) must NOT
        // be duplicated under "Other Patrons" — only the non-player actors remain.
        expect(view.externalActors.map((actor) => actor.patronLabel)).toEqual([
            'International Community',
        ]);
        expect(view.externalActors[0]?.patronLabelToken).toEqual({ key: 'diplomacy.patron.internationalCommunity' });
        expect(view.externalActors.map((actor) => actor.faction)).not.toContain('RS');
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
        expect(view.negotiationTimeline.find((entry) => entry.id === 'consequence:international_sanctions')?.labelToken).toEqual({
            key: 'diplomacy.consequence.internationalSanctions',
        });
        expect(view.needleHints.map((hint) => hint.label)).toContain('Ease Serbia constraint');
        expect(view.needleHints.map((hint) => hint.label)).toContain('Reduce Sarajevo siege visibility');
        expect(view.needleHints.find((hint) => hint.id === 'patron-constraint:RS')?.labelToken).toMatchObject({
            key: 'diplomacy.needle.easePatronConstraint',
            paramKeys: { patron: 'diplomacy.patron.serbia' },
        });
    });

    it('does not duplicate the current patron under externalActors (#124)', () => {
        const view = buildDiplomacyView(makeDiplomacyState(), 'RS');
        // patronStance carries the player's own patron (Serbia / RS faction)...
        expect(view.patronStance?.faction).toBe('RS');
        // ...so the "Other Patrons" list must exclude that same actor.
        const otherFactions = view.externalActors.map((actor) => actor.faction);
        expect(otherFactions).not.toContain('RS');
        expect(otherFactions).toEqual(['RBiH']);
        // The non-player actors are still fully present.
        expect(view.externalActors).toHaveLength(1);
    });

    it('does not invent an International Community patron for RBiH', () => {
        const view = buildDiplomacyView(makeDiplomacyState(), 'RBiH');

        expect(view.playerFaction).toBe('RBiH');
        expect(view.patronStance).toBeUndefined();
        expect(view.patronConfidence).toBeUndefined();
        expect(view.patronDefianceCuts).toBeUndefined();
        expect(view.externalActors.map((actor) => actor.faction)).not.toContain('RBiH');
        expect(view.pressureReasons.length).toBeGreaterThan(0);
        expect(view.activeProposals.length).toBeGreaterThan(0);
    });

    it('routes raw faction slugs and snake_case event ids through player-safe resolvers in the timeline', () => {
        const view = buildDiplomacyView(makeDiplomacyState(), 'RS');
        // RS relationship_events: ['belgrade_border_pressure'] → "Serbia: Belgrade Border Pressure".
        const entry = view.negotiationTimeline.find((e) => e.id.startsWith('patron:RS:'));
        expect(entry).toBeDefined();
        expect(entry?.label).toBe('Serbia: Belgrade Border Pressure');
        // Detail must say "VRS channel", never the raw RS slug as a standalone word.
        expect(entry?.detail).toBe('VRS channel relationship signal.');
        expect(entry?.detail).not.toMatch(/\bRS\b/);
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
                    {
                        faction: 'RS', turn: 18, cut_fraction: 0.03, support_after: 0.8,
                        tag: 'milosevic_isolation_warning_aug92#resist_patron', expires_turn: 31, combined_multiplier: 0.97,
                    },
                    {
                        faction: 'RS', turn: 54, cut_fraction: 0.05, support_after: 0.6,
                        tag: 'milosevic_vopp_pressure#resist_patron', expires_turn: 67, combined_multiplier: 0.95,
                    },
                    {
                        faction: 'HRHB', turn: 46, cut_fraction: 0.05, support_after: 0.7,
                        tag: 'zagreb_restrains_boban_vopp#resist_patron', expires_turn: 59, combined_multiplier: 0.95,
                    },
                    // Pre-panel per-turn entry (no tag): never shown.
                    { faction: 'RS', turn: 60, cut_fraction: 0.1, support_after: 0.5 },
                ],
            },
        }), 'RS');
        expect(withCuts.patronDefianceCuts).toEqual({
            count: 2,
            latestCutFraction: 0.05,
            latestTurn: 54,
            latestExpiresTurn: 67,
            latestSupportAfter: 0.6,
            activeCombinedCutFraction: 0,
            activeFloorBinding: false,
            entries: [
                { turn: 54, tag: 'milosevic_vopp_pressure#resist_patron', cutFraction: 0.05, expiresTurn: 67, floorBinding: false },
                { turn: 18, tag: 'milosevic_isolation_warning_aug92#resist_patron', cutFraction: 0.03, expiresTurn: 31, floorBinding: false },
            ],
        });

        expect(withCuts.negotiationTimeline).toContainEqual(expect.objectContaining({
            id: 'patron-defiance:RS:54:milosevic_vopp_pressure#resist_patron',
            label: 'Serbia supply cut',
            detail: 'VRS combat effectiveness -5% for 13 weeks.',
            turn: 54,
            confidence: 'known',
        }));

        const noCuts = buildDiplomacyView(makeDiplomacyState(), 'RS');
        expect(noCuts.patronDefianceCuts).toBeUndefined();
    });

    it('reads the patron cut in force through the combat reader, floor included', () => {
        // Turn 44: two active RS patron cuts (0.90 x 0.90 = 0.81) floor at 0.85; a non-patron
        // modifier never counts toward the patron cut.
        const view = buildDiplomacyView(makeDiplomacyState({
            military: {
                ...(makeDiplomacyState().military as Record<string, unknown>),
                equipment_quality_modifiers: [
                    { faction: 'RS', multiplier: 0.9, expires_turn: 50, source: 'patron_supply_cut' },
                    { faction: 'RS', multiplier: 0.9, expires_turn: 60, source: 'patron_supply_cut' },
                    { faction: 'RS', multiplier: 1.04, expires_turn: 60 },
                ],
                patron_defiance_supply_cuts: [{
                    faction: 'RS', turn: 40, cut_fraction: 0.1, support_after: 0.6,
                    tag: 'rs_belgrade_pressure_response_1993#defy_belgrade_directive', expires_turn: 50,
                    combined_multiplier: 0.85, floor_binding: true,
                }],
            },
        }), 'RS');
        expect(view.patronDefianceCuts?.activeCombinedCutFraction).toBeCloseTo(0.15, 10);
        expect(view.patronDefianceCuts?.activeFloorBinding).toBe(true);
        expect(view.patronDefianceCuts?.entries?.[0]?.floorBinding).toBe(true);
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
