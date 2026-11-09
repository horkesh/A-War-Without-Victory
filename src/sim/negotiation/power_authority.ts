/**
 * Constitution depth for the first three subjects (DC plan, stage 3): police, education,
 * defense. For each operative owner (state, entity, shared) the catalog names who makes
 * the rules, who runs the service, who pays, whose consent a decision needs and who rules
 * on a dispute, plus one traceable case per subject. The resolver owns WHICH owner a
 * treaty carries (`effectiveOperativePowers`); this catalog only explains what that owner
 * means in practice. Read-only display data: nothing here feeds the simulation.
 *
 * Provenance. The entity rows are the 1995 treaty as signed: Annex 4 (Arts III, V, VI),
 * the Federation Constitution, Part III (cantons hold police and education), Annex 1A
 * (IFOR, the Joint Military Commission), Annex 6 (Human Rights Chamber) and Annex 11
 * (IPTF). The state and shared rows are authored game alternatives (`effective:
 * 'authored'`); where a later reform resembles one, `later` names it with its date.
 *
 * Deterministic: constant data, no state, no clock.
 */

export type AuthorityPower = 'comp_police' | 'comp_education' | 'comp_defense';
export type AuthorityOwner = 'state' | 'entity' | 'shared';

/** A body that acts in a decision path. Display names live in the UI messages. */
export type Jurisdiction =
    | 'state_assembly' | 'presidency' | 'presidency_member' | 'council_of_ministers' | 'state_police' | 'state_army'
    | 'federation' | 'cantons' | 'rs' | 'own_government' | 'entity_governments' | 'entity_army' | 'scmm'
    | 'const_court' | 'human_rights_chamber' | 'ifor' | 'jmc' | 'iptf' | 'other_entity';

/** One set of bodies for the whole country, or one per entity (the Federation has cantons; RS does not). */
export type Bodies = readonly Jurisdiction[] | { readonly federation: readonly Jurisdiction[]; readonly rs: readonly Jurisdiction[] };

export interface AuthorityStep { who: Bodies; act: string }

export interface AuthorityProfile {
    rules: Bodies;
    operates: Bodies;
    pays: Bodies;
    consents: Bodies;
    disputes: Bodies;
    /** 'signing': the treaty as signed in 1995. 'authored': a game alternative. */
    effective: 'signing' | 'authored';
    /** A later reform this resembles, as a message id (the UI names it with its date). */
    later?: string;
    /** Citation for the rows, kept in the source language of the treaty. */
    citation: string;
    /** The subject's case, step by step. */
    case: readonly AuthorityStep[];
}

const split = (federation: readonly Jurisdiction[], rs: readonly Jurisdiction[]): Bodies => ({ federation, rs });

export const POWER_AUTHORITY: Readonly<Record<AuthorityPower, Readonly<Record<AuthorityOwner, AuthorityProfile>>>> = Object.freeze({
    comp_police: {
        entity: {
            rules: split(['cantons', 'own_government'], ['own_government']),
            // Federation Constitution III.1: the Federation itself handles inter-cantonal and organised crime.
            operates: split(['cantons', 'own_government'], ['own_government']),
            pays: split(['cantons'], ['own_government']),
            // Annex 4 gives the other entity a duty to cooperate, not a consent.
            consents: [],
            disputes: ['const_court'],
            effective: 'signing',
            later: 'police_sipa_2004',
            citation: 'Annex 4 Art III(1)(g), III(2)(c), VI(3)(a); Federation Constitution Part III; Annex 11',
            case: [
                { who: split(['cantons'], ['own_government']), act: 'police.opens' },
                // III(1)(g) makes inter-entity enforcement a state responsibility; in 1995 no state body carried it.
                { who: ['presidency', 'council_of_ministers'], act: 'police.stateOnPaper' },
                { who: ['other_entity'], act: 'police.cooperates' },
                { who: ['iptf'], act: 'police.monitors' },
                { who: ['const_court'], act: 'police.dispute' },
            ],
        },
        state: {
            rules: ['state_assembly'],
            operates: ['state_police'],
            pays: ['state_assembly'],
            consents: [],
            disputes: ['const_court'],
            effective: 'authored',
            later: 'police_sipa_2004',
            citation: 'Authored alternative',
            case: [
                { who: ['state_police'], act: 'police.stateOpens' },
                { who: ['iptf'], act: 'police.monitors' },
                { who: ['const_court'], act: 'police.dispute' },
            ],
        },
        shared: {
            rules: ['state_assembly', 'federation', 'rs'],
            operates: split(['cantons'], ['own_government']),
            pays: split(['cantons'], ['own_government']),
            consents: ['federation', 'rs'],
            disputes: ['const_court'],
            effective: 'authored',
            citation: 'Authored alternative',
            case: [
                { who: split(['cantons'], ['own_government']), act: 'police.opens' },
                { who: ['federation', 'rs'], act: 'police.jointTeam' },
                { who: ['const_court'], act: 'police.dispute' },
            ],
        },
    },
    comp_education: {
        entity: {
            rules: split(['cantons'], ['own_government']),
            operates: split(['cantons'], ['own_government']),
            pays: split(['cantons'], ['own_government']),
            consents: [],
            disputes: ['const_court', 'human_rights_chamber'],
            effective: 'signing',
            later: 'education_framework_2003',
            citation: 'Annex 4 Art III(3)(a); Federation Constitution Part III; Annex 6',
            case: [
                { who: split(['cantons'], ['own_government']), act: 'education.decides' },
                { who: split(['cantons'], ['own_government']), act: 'education.pays' },
                { who: ['const_court', 'human_rights_chamber'], act: 'education.review' },
            ],
        },
        state: {
            rules: ['state_assembly'],
            operates: split(['cantons'], ['own_government']),
            pays: ['state_assembly'],
            consents: [],
            disputes: ['const_court'],
            effective: 'authored',
            later: 'education_framework_2003',
            citation: 'Authored alternative',
            case: [
                { who: ['state_assembly'], act: 'education.stateSets' },
                { who: split(['cantons'], ['own_government']), act: 'education.applies' },
                { who: ['const_court'], act: 'education.review' },
            ],
        },
        shared: {
            rules: ['state_assembly', 'federation', 'rs'],
            operates: split(['cantons'], ['own_government']),
            pays: split(['cantons'], ['own_government']),
            consents: ['federation', 'rs'],
            disputes: ['const_court'],
            effective: 'authored',
            citation: 'Authored alternative',
            case: [
                { who: split(['cantons'], ['own_government']), act: 'education.decides' },
                { who: ['state_assembly'], act: 'education.commonCore' },
                { who: ['const_court'], act: 'education.review' },
            ],
        },
    },
    comp_defense: {
        entity: {
            rules: ['entity_governments'],
            operates: ['entity_army'],
            pays: ['entity_governments'],
            // V(5)(a): forces enter the other entity only with its government's and the Presidency's consent.
            consents: ['other_entity', 'presidency', 'ifor'],
            disputes: ['jmc', 'const_court'],
            effective: 'signing',
            later: 'defense_unified_2006',
            citation: 'Annex 4 Art V(5)(a)-(b); Annex 1A Arts IV, VI, VIII, XII',
            case: [
                { who: ['entity_army'], act: 'defense.proposes' },
                { who: ['presidency_member'], act: 'defense.command' },
                { who: ['scmm'], act: 'defense.coordinates' },
                { who: ['ifor'], act: 'defense.ifor' },
                { who: ['other_entity', 'presidency'], act: 'defense.otherEntity' },
                { who: ['jmc'], act: 'defense.dispute' },
            ],
        },
        state: {
            rules: ['state_assembly'],
            operates: ['state_army'],
            pays: ['state_assembly'],
            consents: ['presidency', 'ifor'],
            disputes: ['jmc', 'const_court'],
            effective: 'authored',
            later: 'defense_unified_2006',
            citation: 'Authored alternative',
            case: [
                { who: ['council_of_ministers'], act: 'defense.ministryProposes' },
                { who: ['presidency'], act: 'defense.presidencyDecides' },
                { who: ['ifor'], act: 'defense.ifor' },
                { who: ['jmc'], act: 'defense.dispute' },
            ],
        },
        shared: {
            rules: ['state_assembly', 'federation', 'rs'],
            operates: ['entity_army'],
            pays: ['entity_governments'],
            consents: ['presidency', 'scmm', 'ifor'],
            disputes: ['jmc', 'const_court'],
            effective: 'authored',
            citation: 'Authored alternative',
            case: [
                { who: ['entity_army'], act: 'defense.proposes' },
                { who: ['scmm'], act: 'defense.coordinates' },
                { who: ['presidency'], act: 'defense.presidencyDecides' },
                { who: ['ifor'], act: 'defense.ifor' },
                { who: ['jmc'], act: 'defense.dispute' },
            ],
        },
    },
});

export const AUTHORITY_POWERS: readonly AuthorityPower[] = ['comp_police', 'comp_education', 'comp_defense'];

export function isAuthorityPower(id: string): id is AuthorityPower {
    return (AUTHORITY_POWERS as readonly string[]).includes(id);
}

/** The bodies acting for one entity's view (the player's entity listed first by the UI). */
export function bodiesFor(bodies: Bodies, entity: 'federation' | 'rs'): readonly Jurisdiction[] {
    return 'federation' in bodies ? bodies[entity] : bodies;
}

/** True when the Federation and Republika Srpska use different bodies for this role. */
export function isSplit(bodies: Bodies): boolean {
    return !Array.isArray(bodies);
}
