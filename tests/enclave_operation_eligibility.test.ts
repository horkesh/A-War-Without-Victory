/**
 * Enclave operation-eligibility is ONE rule asked by EVERY operation-creation site.
 *
 * WHY THIS TEST EXISTS (2026-08-26). The rule "a besieged brigade may widen its own perimeter
 * but may not march across the map" lived only inside `sector_offensive.ts`. The engine has
 * five places that build a `sector_attack`, and the commander pipeline
 * (`buildCommanderOperation`, axis id `cmd_*`) had NO enclave awareness of any kind —
 * `grep -c enclave src/sim/combat/corps_operation_helpers.ts` returned 0.
 *
 * Measured consequence: after Srebrenica fell, `arbih_284th_east_bosnian_light` — a 28th
 * Division survivor displaced to the Tuzla basin — joined 2nd Corps operations that took
 * Lopare, Priboj, Jablanica and Šekovići. All four are RS in EVERY painted checkpoint the
 * project holds, and both towns were VRS brigade HQs in 1995 (3rd Majevica, 1st Birač). A §6
 * panel ruled the outcome NON-COMPLIANT: the destruction of the enclave was converting into
 * offensive capacity on ground that never changed hands.
 *
 * ⚠ THE TRAP: tightening the filter at its ORIGINAL site would have looked exactly like a fix
 * and changed NOTHING, because the offending operations were never created there. 14 of the
 * run's 60 axes take the unfiltered path. A rule that lives in one caller is not a rule — it
 * is a coincidence of which code path happened to run.
 *
 * NOTE ON WHAT IS *NOT* BEING CONSTRAINED. 2nd Corps genuinely did mount a major offensive
 * after Srebrenica fell — Operation Farz, joint with 3rd Corps, liberating Vozuća and most of
 * Ozren. The engine must keep allowing that. This rule constrains WHICH BRIGADES may be
 * committed and WHERE, not whether the corps may attack at all. A blanket suppression would
 * have been historically wrong, not merely inelegant.
 */
import { describe, it, expect } from 'vitest';
import { isBrigadeEligibleForOperationObjectives } from '../src/sim/combat/enclave_resilience.js';

const srebrenicaCell = 'op:srebrenica:srebrenica_2';
const gorazdeCell = 'op:gorazde:gorazde_2';
const tuzlaBasinCell = 'op:kalesija:seher_2';   // where the 284th actually sat
const lopareCell = 'op:lopare:lopare_2';        // what it should never have been able to attack
const sekoviciCell = 'op:sekovici:udbina_2';

const enclaveBde = (location: string) => ({ tags: ['enclave'], location_osid: location });
const lineBde = (location: string) => ({ tags: [] as string[], location_osid: location });

describe('enclave operation eligibility — one rule, every creation site', () => {
    it('★ THE REGRESSION: a displaced Srebrenica survivor may NOT attack Lopare/Šekovići', () => {
        const survivor = enclaveBde(tuzlaBasinCell);
        expect(isBrigadeEligibleForOperationObjectives(survivor, [lopareCell])).toBe(false);
        expect(isBrigadeEligibleForOperationObjectives(survivor, [sekoviciCell])).toBe(false);
        // The real Operacija Ponos targeted both at once.
        expect(isBrigadeEligibleForOperationObjectives(survivor, [sekoviciCell, lopareCell])).toBe(false);
    });

    it('★ NEGATIVE CONTROL: an ordinary line brigade is untouched by this rule', () => {
        // If this ever goes false, the rule has stopped being about enclaves and is now
        // restricting the whole army — which would suppress Operation Farz too.
        expect(isBrigadeEligibleForOperationObjectives(lineBde(tuzlaBasinCell), [lopareCell])).toBe(true);
        expect(isBrigadeEligibleForOperationObjectives(lineBde(srebrenicaCell), [lopareCell])).toBe(true);
    });

    it('a besieged brigade MAY still fight to widen its own perimeter', () => {
        // The rule is "corridor-widening only", not "enclave brigades never fight".
        const inside = enclaveBde(srebrenicaCell);
        expect(isBrigadeEligibleForOperationObjectives(inside, [srebrenicaCell])).toBe(true);
    });

    it('a besieged brigade may NOT march to another enclave', () => {
        expect(isBrigadeEligibleForOperationObjectives(enclaveBde(gorazdeCell), [srebrenicaCell])).toBe(false);
    });

    it('mixed objectives: one objective inside its own enclave is enough', () => {
        const inside = enclaveBde(srebrenicaCell);
        expect(isBrigadeEligibleForOperationObjectives(inside, [lopareCell, srebrenicaCell])).toBe(true);
    });

    it('declines to answer rather than guessing when there are no objectives', () => {
        // Corridor-breach ops pass []. A silent `false` would exclude every enclave brigade
        // from them; an op with no objectives captures nothing, so there is no §6 exposure.
        expect(isBrigadeEligibleForOperationObjectives(enclaveBde(srebrenicaCell), [])).toBe(true);
    });

    it('a missing brigade is ineligible, and a locationless one is not penalised', () => {
        expect(isBrigadeEligibleForOperationObjectives(undefined, [lopareCell])).toBe(false);
        expect(isBrigadeEligibleForOperationObjectives({ tags: ['enclave'] }, [lopareCell])).toBe(true);
    });
});
