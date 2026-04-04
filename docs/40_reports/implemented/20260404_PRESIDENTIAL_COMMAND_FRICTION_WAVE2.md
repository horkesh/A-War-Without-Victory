# Presidential Command Friction — Wave 2
**Date:** 2026-04-04
**Branch:** main
**Commits:** c689ba74, 387da70b, 45feea0d, 7d8006ac

## Mission

Turn command strain from a passive review label into a **decision-shaping institutional signal** — without fake penalties, without brigade-micro, without morale system rewrites.

Wave 1 (already merged) established `computeCorpsCommandStrain`, the strain badge in `ArmyHQCorpsCard`, and the `CommandRecord` fifth row. Wave 2 propagates that signal to three decision-adjacent surfaces.

## Phase A — Leverage audit findings

1. **ChiefOfStaffBriefing**: did not receive or use any strain data. `gameState: LoadedGameState` was already a prop, enabling direct import of `computeCorpsCommandStrain` — no new props needed.
2. **OperationsSection**: did not receive strain. Had `corpsId`, `operations`, `gameState`. Added optional `commandStrain?` and `commandStrainLabel?` props, passed from `ArmyHQCorpsCard` which already derived them from `FormationView`.
3. **OperationBriefingModal**: already computes `corpsStrain`/`corpsStrainLabel` from the Zustand store (lines 186–189). No new prop drilling needed — only needed to pass them into `DirectInterventionSection`.
4. **Signal validity**: strain > 0 combined with an operation in the direct-intervention window is a genuine institutional signal. The two inputs are independent: strain accumulates from prior overrides, the operation represents a current decision point. Compound warning is honest.

## Phase B — Implementations

### B1 — Strain-shaped CoS briefing paragraph (`ChiefOfStaffBriefing.tsx`)

Added `buildStrainParagraphs(state, faction, tone): Paragraph[]`:
- Filters `state.formations` to player-faction corps/corps_asset kinds
- Calls `computeCorpsCommandStrain` per corps (same computation as adapter, deterministic)
- For each corps with strain > 0: selects phrase from `STRAIN_PHRASES[tone][label]` (cautious/precise/aggressive × strained/compromised = 6 phrases)
- Paragraph appended in `generateCoSBriefing` at §3, after operational summary, before sign-off
- Silence = healthy throughout: zero-strain state reads identically to before

**Example phrases:**
- cautious/strained: "I must note that command relations with 2nd Corps remain under strain following recent presidential interventions. The staff are compliant but the relationship requires careful management."
- precise/compromised: "Command Authority Status: 1st Corps command relationship is compromised. Repeated direct interventions have created institutional friction. Recommend restoring delegated command before further operations."

### B2 — OperationsSection command-risk notice (`OperationsSection.tsx`, `ArmyHQCorpsCard.tsx`)

Added `commandStrain?: number` and `commandStrainLabel?: 'healthy' | 'strained' | 'compromised'` to `OperationsSectionProps`. Default values `0` / `'healthy'` mean zero regression for any caller that doesn't pass them.

When `commandStrain > 0` AND `operations.length > 0`: renders a compact border-left notice at the top of the operations list:
- Amber styling for strained: "Command Strain: Strained — operations proceeding under strained command conditions."
- Red styling for compromised: "Command Compromised — high-risk operating conditions. Presidential interventions have damaged command cohesion."

`ArmyHQCorpsCard` passes `data.strain` and `data.strainLabel` (already computed from `FormationView.commandStrain/commandStrainLabel` by the adapter).

### B3 — OperationBriefingModal compound warning (`OperationBriefingModal.tsx`)

`DirectInterventionSection` extended with `corpsStrain: number` and `corpsStrainLabel: 'healthy' | 'strained' | 'compromised'` props.

When `corpsStrain > 0`: shows a pre-launch notice above the cost display:
> "⚠ This corps already carries command strain ([Strained|Compromised]). A further Direct Intervention will compound institutional damage."

The call site passes `corpsStrain` and `corpsStrainLabel` already computed in the modal's `useMemo` from the store. No new GameState fields, no new prop drilling from parent.

## Phase C — CoS briefing verification

- Strain paragraph placed at §3 (after operational summary, before return) — correct document flow
- Zero-strain: `buildStrainParagraphs` returns empty array, no iteration, function returns identically to pre-Wave-2
- Sign-off / stamp / footer: not touched; `profile` and `paragraphs.length === 0` guard unchanged
- Letter Home vignette: positioned after paragraphs in JSX, unaffected

## Phase D — Simplification

- Searched for `"Force Launch"` in all UI text (not code identifiers): **no matches** — already canonicalized to "Direct Intervention" in Wave 1
- Strain badge wording: B2 uses "Command Strain: Strained" / "Command Compromised"; B3 uses "command strain (Strained)" / "command strain (Compromised)" — consistent label casing
- No duplicate compound-risk notices: B2 is in the corps card operations section (visible while reviewing); B3 is in the pre-launch modal (visible at the moment of decision). Different surfaces, different timing, no duplication
- Silence = healthy throughout all three surfaces

## Constraints verification

- NO fake mechanical penalties: B1/B2/B3 are information only
- NO new GameState fields
- NO morale/commander stat changes
- All Wave 1 work preserved

## Tests

File: `tests/command_authority.test.ts` — 70 tests total (21 new Wave 2 tests), all pass.

Wave 2 suites:
- `B2: OperationsSection command-risk notice` — 8 tests: presence conditions, absence conditions, label branching
- `B3: OperationBriefingModal compound strain warning` — 6 tests: presence/absence, label display
- `B1: CoS briefing strain paragraph — label-driven phrase selection` — 3 tests + structural comment explaining why direct component test deferred to integration

## Verification evidence

```
npx.cmd tsc --noEmit -p tsconfig.json   → clean (0 errors)
vitest run tests/command_authority.test.ts  → 70/70 pass
check_claude_governance.ps1             → Claude governance check: OK
```

## Files changed

| File | Change |
|------|--------|
| `src/ui/map/components/army_hq/ChiefOfStaffBriefing.tsx` | +48 lines: strain phrases table, `buildStrainParagraphs`, §3 call |
| `src/ui/map/components/army_hq/OperationsSection.tsx` | +16 lines: optional props, command-risk notice block |
| `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx` | +2: pass strain props through to OperationsSection |
| `src/ui/map/components/OperationBriefingModal.tsx` | +13 lines: compound-risk notice in DirectInterventionSection |
| `tests/command_authority.test.ts` | +124 lines: 21 Wave 2 tests |

---

```
Canonical owner: command_strain.ts (derivation) + three UI surfaces (display)
Demoted path: none — no prior owner for these three surfaces
Player-visible truth: command strain is now surfaced at three decision points (CoS briefing, ops section header, pre-launch modal)
Canonical UI surface: ChiefOfStaffBriefing (narrative), OperationsSection (ambient), OperationBriefingModal (pre-decision)
Done means: tsc clean, 70 tests pass, governance OK, silence=healthy at all three surfaces
```
