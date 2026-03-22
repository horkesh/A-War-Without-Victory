# Graz Accords + Goražde Brigades + Enclave UI Fixes — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three independent issues: (1) Graz Accords bilateral ceasefire everywhere except Posavina/Op Jackal, (2) Goražde brigade staggered spawns with correct home municipalities and `displaced_from` field, (3) Enclave UI synced with sim's painted OSID lists.

**Architecture:** Three independent changes touching different subsystems. Each can be committed and tested independently. No cross-dependencies between the three fixes.

**Tech Stack:** TypeScript, JSON data, Vitest tests.

---

## Fix 1: Graz Accords — Bilateral RS↔HRHB Ceasefire

### Task 1: Add HRHB→RS blocking in shouldGrazBlockAttack

**Files:**
- Modify: `src/sim/local_truces.ts`
- Test: `tests/graz_faction_block.test.ts`

Currently `shouldGrazBlockAttack()` blocks RS→HRHB at faction level (lines 206-212) but NOT HRHB→RS. The Graz Accords should be bilateral — ceasefire in BOTH directions, except Posavina.

- [ ] **Step 1: Write failing test**

Add to `tests/graz_faction_block.test.ts`:

```typescript
it('Graz blocks HRHB attacking RS (bilateral)', () => {
    const state = makeGrazActiveState();
    // HVO Tomislavgrad attacking VRS Herzegovina — should be blocked
    expect(shouldGrazBlockAttack(state, 'hvo_tomislavgrad', 'HRHB', 'op:nevesinje:some_osid', 'RS')).toBe(true);
});

it('Graz does NOT block HVO Northwest Bosnia attacking RS (Posavina exempt)', () => {
    const state = makeGrazActiveState();
    // HVO Posavina (Orašje pocket) attacking VRS — Posavina exempted
    expect(shouldGrazBlockAttack(state, 'hvo_northwest_bosnia', 'HRHB', 'op:orasje:some_osid', 'RS')).toBe(false);
});
```

- [ ] **Step 2: Run test, verify HRHB→RS test fails** (currently not blocked)

- [ ] **Step 3: Implement bilateral blocking**

In `src/sim/local_truces.ts`, in `shouldGrazBlockAttack()`, after the existing RS→HRHB block (line ~212), add the mirror:

```typescript
// HRHB → RS: block all except Posavina-area HVO corps
if (faction === 'HRHB' && (targetController === 'RS')
    && isHerzegovinaTruceActive(state)
    && !GRAZ_EXEMPT_HRHB_CORPS.has(corpsId)) {
    return true;
}
```

Add the exempt set near the existing `GRAZ_EXEMPT_RS_CORPS`:

```typescript
const GRAZ_EXEMPT_HRHB_CORPS = new Set([
    'hvo_northwest_bosnia',  // Orašje pocket — Posavina corridor fighting
]);
```

Also exempt HRHB corps participating in Op Jackal before it completes: if `graz_east_herzegovina_active_turn` is null (Op Jackal hasn't ended) AND corps is `hvo_southeast_herzegovina`, don't block.

- [ ] **Step 4: Run tests, verify pass**

- [ ] **Step 5: Commit**

```bash
git commit -m "fix(graz): add bilateral HRHB→RS blocking — ceasefire both directions except Posavina"
```

### Task 2: Extend isColdFront to all RS↔HRHB fronts

**Files:**
- Modify: `src/sim/combat/frontline_attrition.ts`
- Test: `tests/graz_faction_block.test.ts`

Currently `isColdFront()` only applies to corps-pair fronts. ALL RS↔HRHB contact should be cold when Graz is active (except Posavina).

- [ ] **Step 1: Write failing test**

```typescript
it('isColdFront returns true for any RS↔HRHB sector when Graz active', () => {
    const state = makeGrazActiveState();
    // A VRS Drina brigade facing HRHB — not in a corps pair, but should be cold
    const formation = { corps_id: 'vrs_drina', faction: 'RS' };
    const sector = { faction: 'RS', opposing_factions: ['HRHB'] };
    expect(isColdFront(state, formation, sector)).toBe(true);
});

it('isColdFront returns false for Posavina RS↔HRHB', () => {
    const state = makeGrazActiveState();
    const formation = { corps_id: 'vrs_1st_krajina', faction: 'RS' };
    const sector = { faction: 'RS', opposing_factions: ['HRHB'] };
    expect(isColdFront(state, formation, sector)).toBe(false);
});
```

- [ ] **Step 2: Run test, verify first fails**

- [ ] **Step 3: Simplify isColdFront logic**

Replace the corps-pair check with faction-level logic:

```typescript
function isColdFront(state: GameState, formation: FormationState, sector: CorpsFrontSector): boolean {
    if (!isGrazAccordsActive(state)) return false;

    const fac = sector.faction;
    const opp = sector.opposing_factions;
    const hasRsHrhb =
        (fac === 'RS' && opp.includes('HRHB')) ||
        (fac === 'HRHB' && opp.includes('RS'));
    if (!hasRsHrhb) return false;

    // Posavina exempt
    const corpsId = getFormationCorpsId(formation);
    if (corpsId && (GRAZ_EXEMPT_RS_CORPS.has(corpsId) || GRAZ_EXEMPT_HRHB_CORPS.has(corpsId))) {
        return false;
    }

    // Op Jackal: east Herzegovina pair not yet frozen
    if (corpsId && isEastHerzegovinaPair(corpsId)
        && state.political.graz_east_herzegovina_active_turn == null) {
        return false;
    }

    return true;
}
```

Import `GRAZ_EXEMPT_RS_CORPS` and the new `GRAZ_EXEMPT_HRHB_CORPS` from `local_truces.ts` (export them).

- [ ] **Step 4: Run tests, verify pass**

- [ ] **Step 5: Commit**

```bash
git commit -m "fix(graz): extend isColdFront to all RS↔HRHB fronts, not just corps pairs"
```

---

## Fix 2: Goražde Brigades — Staggered Spawns + Correct Home Municipalities

### Task 3: Add displaced_from field to OOB schema

**Files:**
- Modify: `src/state/game_state.ts` (FormationState or OOB type — find where brigade fields are defined)
- Modify: `data/source/oob_brigades.json` (Goražde brigades)

- [ ] **Step 1: Find the OOB brigade type definition**

Search for `home_mun` or `home_osid` in `src/state/game_state.ts` or the formation types to find where brigade schema fields are defined. Add:

```typescript
/** Municipality the brigade's soldiers originally came from (refugees/displaced). Informational. */
displaced_from?: string;
```

- [ ] **Step 2: Update Goražde brigade entries in oob_brigades.json**

Based on historical research (81st Division lineage):

| Brigade ID | Change |
|---|---|
| `arbih_801st_light` | `available_from: 6` (18 May 1992). Keep home_mun gorazde. |
| `arbih_802nd_light` | `available_from: 6`. Keep home_mun gorazde. |
| `arbih_803rd_light` | `available_from: 165` (June 1995) OR remove from 40w scenario. Set initial_personnel to 300. |
| `arbih_807th_muslim_liberation` | `available_from: 165` OR remove. Set initial_personnel to 300. |
| `arbih_808th_liberation` | `home_mun: "gorazde"`, `home_osid: "op:gorazde:ustipraca_2"` (Prača valley entrance from Goražde side). `displaced_from: "visegrad"`. `available_from: 8` (29 May 1992). |
| `arbih_843rd_light` | `home_mun: "gorazde"`, `home_osid: "op:gorazde:faocici_2"`. `displaced_from: "cajnice"`. `available_from: 9` (6 Jun 1992). |
| `arbih_851st_vitezka_liberation` | `displaced_from: "rogatica"`. `available_from: 8`. Keep home in Goražde. |

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(oob): stagger Goražde brigade spawns, correct home municipalities, add displaced_from field"
```

### Task 4: Ensure displaced_from serializes and is ignored by gameplay

**Files:**
- Modify: `src/state/serialize.ts` (if needed — check if FormationState fields auto-serialize)
- Test: verify with typecheck + existing tests

- [ ] **Step 1: Verify displaced_from round-trips through save/load**

The field is on the static OOB data (not mutable FormationState). Check if `oob_brigades.json` fields are loaded directly. If so, no serialization changes needed — JSON fields pass through automatically.

- [ ] **Step 2: Run full test suite**

Run: `npm run test:vitest`
Expected: All pass (displaced_from is informational, no gameplay code reads it)

- [ ] **Step 3: Commit if any fixes needed**

---

## Fix 3: Enclave UI — Sync with Sim's Painted OSID Lists

### Task 5: Update GameStateAdapter enclave definitions

**Files:**
- Modify: `src/ui/map/data/GameStateAdapter.ts` (lines ~90-101)

- [ ] **Step 1: Read the sim-side enclave definitions**

Read `src/sim/combat/enclave_resilience.ts` to get the exact `osid_list` arrays for Srebrenica, Žepa, and Goražde.

- [ ] **Step 2: Update ENCLAVE_UI_DEFINITIONS type**

Add `osid_list?: string[]` to the type. For Srebrenica, Žepa, and Goražde, add the exact OSID lists from the sim and remove the prefix-based matching for those enclaves.

```typescript
const ENCLAVE_UI_DEFINITIONS: Array<{
    id: string;
    display_name: string;
    faction: 'RBiH';
    osid_prefixes?: string[];   // For Bihać, Sarajevo (municipality-wide)
    osid_list?: string[];       // For Srebrenica, Žepa, Goražde (painted only)
}> = [
    { id: 'bihac_pocket', display_name: 'Bihac Pocket', faction: 'RBiH',
      osid_prefixes: ['op:bihac:', 'op:cazin:', 'op:velika_kladusa:', 'op:bosanska_krupa:'] },
    { id: 'gorazde', display_name: 'Gorazde', faction: 'RBiH',
      osid_list: [
          'op:gorazde:bacci', 'op:gorazde:citluk_2', 'op:gorazde:faocici_2',
          'op:gorazde:gorazde_2', 'op:gorazde:hrancici', 'op:gorazde:hrusanj',
          'op:gorazde:kola', 'op:gorazde:kolovarice', 'op:gorazde:mravinjac_2',
          'op:gorazde:novakovici', 'op:gorazde:osjecani_2', 'op:gorazde:semihova_2',
          'op:gorazde:slatina_2', 'op:gorazde:ustipraca_2', 'op:gorazde:zorlaci',
          'op:gorazde:zorovici',
      ] },
    { id: 'sarajevo', display_name: 'Sarajevo', faction: 'RBiH',
      osid_prefixes: ['op:centar_sarajevo:', 'op:novo_sarajevo:', 'op:stari_grad_sarajevo:', 'op:novi_grad_sarajevo:'] },
    { id: 'srebrenica', display_name: 'Srebrenica', faction: 'RBiH',
      osid_list: [
          'op:srebrenica:bostahovine_2', 'op:srebrenica:brezovice_2',
          'op:srebrenica:donji_potocari_2', 'op:srebrenica:kalimanici',
          'op:srebrenica:lijesce', 'op:srebrenica:ljeskovik_2',
          'op:srebrenica:luka_2', 'op:srebrenica:milacevici',
          'op:srebrenica:radovcici', 'op:srebrenica:srebrenica_2',
          'op:srebrenica:suceska', 'op:srebrenica:sulice_2',
      ] },
    { id: 'zepa', display_name: 'Zepa', faction: 'RBiH',
      osid_list: ['op:rogatica:zepa_2'] },
];
```

- [ ] **Step 3: Update matching logic**

Find where the enclave OSID matching happens (likely a function checking `osid.startsWith(prefix)`). Update to check `osid_list` first:

```typescript
function osidMatchesEnclave(osid: string, def: EnclaveUIDefinition): boolean {
    if (def.osid_list) return def.osid_list.includes(osid);
    if (def.osid_prefixes) return def.osid_prefixes.some(p => osid.startsWith(p));
    return false;
}
```

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(ui): sync enclave definitions with sim painted OSID lists — GameStateAdapter"
```

### Task 6: Update buildEnclaveGeoJSON

**Files:**
- Modify: `src/ui/map/map/builders/buildEnclaveGeoJSON.ts`

- [ ] **Step 1: Read the file to find its enclave definitions**

It has its own `ENCLAVE_DEFINITIONS_UI` that duplicates GameStateAdapter's definitions.

- [ ] **Step 2: Update to use osid_list with same pattern as Task 5**

Either:
- Import the definitions from GameStateAdapter (DRY), or
- Duplicate the osid_list arrays here (simpler, avoids cross-module dependency)

Recommendation: Import from a shared constant. But if the existing pattern is duplication, follow the existing pattern.

- [ ] **Step 3: Update the matching logic**

Same `osid_list` precedence check as Task 5.

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(ui): sync buildEnclaveGeoJSON with painted OSID lists"
```

### Task 7: Full regression test

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 2: Run full test suite**

Run: `npm run test:vitest`
Expected: All 1028+ tests pass

- [ ] **Step 3: Run 40w scenario**

Run: `npm run sim:scenario:run:40w`
Expected: Scenario completes. Check that Graz Accords are now bilateral (RS and HRHB should NOT be fighting each other outside Posavina).

- [ ] **Step 4: Commit any fixes**

```bash
git commit -m "fix: regression fixes for Graz/Goražde/enclave changes"
```
