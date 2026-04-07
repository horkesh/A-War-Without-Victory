# 2026-04-07 — v0.8-to-v0.9 Commander Explanation Surfaces Phase 8: NewspaperModal Officer Boundary Seam

## Scope

Bounded hardening lane:

- Close the two raw war-phase state reads in `NewspaperModal.getOfficerSuccessionLines()`:
  - `this.gameState.military.named_officer_data` (line 149) — full named officer array read to build `nameById` map
  - `this.gameState.military.formations?.[corpsId]?.name` (line 154) — corps name lookup per replacement entry
- Add `officerNamesById: Record<string, string>` to `WarDataSnapshot` as the canonical officer name lookup
- Add `extractOfficerNamesById()` sub-extractor to `war_data_extractor.ts`
- Document the full NewspaperModal data boundary contract with a class-level `DATA BOUNDARY:` comment
- Remove `getPlayerSafeCorpsName` from NewspaperModal imports (no longer needed after seam closure)

## Why this lane

Phase 7 identified `NewspaperModal.getOfficerSuccessionLines()` as the next real modal/shell boundary seam. The method was called exclusively from `generateWarContent()` (war-phase only, `phase !== 'peace'` gate), meaning both raw reads were live war-phase bypasses of the `extractWarData()` boundary.

**Seam A — named_officer_data bypass:** The method looped over `this.gameState.military.named_officer_data` to build a `Map<string, string>` of officer IDs to player-safe names. `extractWarData()` already extracted `named_officer_data` for `officersByFaction` (Phase E), but had no general-purpose ID→name lookup. This duplicated extraction logic that belongs in the extractor.

**Seam B — formations corps name bypass:** The `corpsName()` closure read `this.gameState.military.formations?.[corpsId]?.name` directly to get a corps display name. `extractWarData()` already built `ownForces.formationDetails` (array of `FormationDetail` with `id` and player-safe `name`), making this a silent bypass of an already-owned snapshot field.

Both reads were war-phase only (succession lines only appear in `generateWarContent()`), both bypassed `extractWarData()` silently, and both could be closed without any new raw-state knowledge in the extractor.

## Audit findings

### Canonical before this pass

- `src/ui/warroom/data/war_data_extractor.ts`
  - owned `officersByFaction` (Phase E) but no general ID→name record for modal use
  - `ownForces.formationDetails` had player-safe corps names but was not used by NewspaperModal
- `src/ui/warroom/components/NewspaperModal.ts`
  - `getOfficerSuccessionLines()` read `military.named_officer_data` directly at line 149
  - `getOfficerSuccessionLines()` read `military.formations?.[corpsId]?.name` directly at line 154
  - no `DATA BOUNDARY:` comment — contract was undocumented
  - imported `getPlayerSafeCorpsName` from `playerSafeText.js` solely for the now-bypassed corps name call

### Seam A — named_officer_data bypass (CLOSED)

`extractOfficerNamesById(state: GameState): Record<string, string>` added as a sub-extractor:
- reads `state.military?.named_officer_data ?? []`
- sorts input by `id` (determinism invariant — stable across runs regardless of insertion order)
- applies `getPlayerSafeOfficerName()` to each name before storing (fog of war / player-safe contract maintained at extraction boundary)
- returns empty `{}` when `named_officer_data` is absent or empty (null safe)

`WarDataSnapshot` gains `officerNamesById: Record<string, string>` as a new field.

`getOfficerSuccessionLines()` now calls `extractWarData(this.gameState, playerFaction as FactionId)` at the top of the method and builds its `nameById` map via `new Map(Object.entries(snap.officerNamesById))`.

### Seam B — formations corps name bypass (CLOSED)

The `corpsName()` closure replaced:
- Old: `getPlayerSafeCorpsName(this.gameState.military.formations?.[corpsId]?.name ?? null, corpsId)`
- New: `snap.ownForces.formationDetails.find(fd => fd.id === corpsId)?.name ?? corpsId`

`formationDetails` entries already carry player-safe names (processed by `getPlayerSafeCorpsName` / `getPlayerSafeBrigadeName` in `extractOwnForces()`). The new closure reads from the snapshot — no raw state access.

Fallback is `corpsId` (the raw ID string) when the formation is not found in the player's snapshot. This is the same semantic as the previous fallback (`getPlayerSafeCorpsName(null, corpsId)` which returns the formatted corps ID).

### Import cleanup

- `getPlayerSafeCorpsName` removed from NewspaperModal imports — no longer used anywhere in the file after seam closure
- `extractWarData` import added from `../data/war_data_extractor.js`
- `getPlayerSafeOfficerName` retained — still used as fallback at lines 175, 181, 186 when officer ID is not found in `nameById`

## Design

### Canonical boundary after cleanup

NewspaperModal is now fully documented with a class-level `DATA BOUNDARY:` comment:

- `this.gameState.meta.*` — phase gate, turn display (meta.* always permitted)
- `this.gameState.political.phase0_events_log` — Phase 0 only, peace-phase gated (accepted Phase 0 exception)
- `this.gameState.factions[*].declaration_pressure` — Phase 0 / peace only (accepted Phase 0 exception)
- `extractWarData(this.gameState, playerFaction)` — sole war-phase live data entry point
- Forbidden: direct `military.*` reads in war-phase display paths; direct `political.*` reads in war-phase display paths

### Snapshot contract extension

`WarDataSnapshot` gains one new field:

```typescript
/** Officer name lookup: maps officer ID → player-safe display name.
 *  Sourced from military.named_officer_data (Tier 2 — own faction names visible to player).
 *  Returns empty record when named_officer_data is absent or empty. */
officerNamesById: Record<string, string>;
```

`extractOfficerNamesById()` sub-extractor:
- Input: `state.military?.named_officer_data ?? []`
- Sort: by `id` ascending (determinism)
- Transform: `getPlayerSafeOfficerName(o.name)` applied at extraction boundary
- Output: `Record<string, string>` (plain object, key = officer ID, value = player-safe name)
- Null safe: absent/empty input → `{}`

Note: `officersByFaction` (Phase E) remains the canonical full officer list for officer-panel surfaces. `officerNamesById` is the lightweight ID→name lookup for succession-line rendering in the newspaper modal. Singular ownership: each field serves a distinct consumer with non-overlapping concerns.

## Implementation

### `src/ui/warroom/data/war_data_extractor.ts`

- Added `extractOfficerNamesById()` sub-extractor function before `extractIvpState()` (officer name section)
- Added `officerNamesById: Record<string, string>` field to `WarDataSnapshot` interface
- Wired `const officerNamesById = extractOfficerNamesById(gameState)` in `extractWarData()` extraction block
- Added `officerNamesById` to `extractWarData()` return object

### `src/ui/warroom/components/NewspaperModal.ts`

- Added `import { extractWarData } from '../data/war_data_extractor.js'` to import block
- Replaced `import { getPlayerSafeCorpsName, getPlayerSafeOfficerName }` with `import { getPlayerSafeOfficerName }` (corps name no longer needed)
- Added class-level `DATA BOUNDARY:` JSDoc comment before `export class NewspaperModal` documenting permitted/forbidden reads
- `getOfficerSuccessionLines()`: replaced lines 149–154 raw reads with:
  - `const snap = extractWarData(this.gameState, playerFaction as FactionId)`
  - `const nameById = new Map<string, string>(Object.entries(snap.officerNamesById))`
  - `const corpsName = (corpsId: string): string => snap.ownForces.formationDetails.find(fd => fd.id === corpsId)?.name ?? corpsId`

## Tests

`tests/newspaper_modal_officer_boundary.test.ts` — 13 new tests across 6 describe blocks:

**Structural — named_officer_data read guard (1 test)**
1. NewspaperModal does not contain `this.gameState.military.named_officer_data`

**Structural — formations read guard (1 test)**
2. NewspaperModal does not contain `this.gameState.military.formations`

**Structural — DATA BOUNDARY comment (3 tests)**
3. NewspaperModal has `DATA BOUNDARY:` comment at class level
4. `DATA BOUNDARY:` comment references `extractWarData`
5. `DATA BOUNDARY:` comment documents Phase 0 exceptions (`phase0_events_log`, `declaration_pressure`)

**Functional — officerNamesById correctness (3 tests)**
6. Returns officer names keyed by ID for all officers in named_officer_data
7. Player-safe officer names are non-empty strings
8. `officerNamesById` is a plain Record object, not a Map

**Null safety — absent/empty named_officer_data (3 tests)**
9. Returns empty record when `named_officer_data` is undefined
10. Returns empty record when `named_officer_data` is empty array
11. `officerNamesById` field is always present on snapshot (never undefined)

**Structural — extractor contract (2 tests)**
12. Extractor source declares `officerNamesById` on `WarDataSnapshot` interface
13. Extractor source has `extractOfficerNamesById` sub-extractor function

## Verification

- `npx.cmd tsc --noEmit -p tsconfig.json`: clean — zero errors
- `npm.cmd run test:vitest`: **216 suites, 3016 tests — all pass** (was 215/3003 before Phase 8, +1 suite +13 tests)
- `npm.cmd run desktop:map:build`: clean (pre-existing chunk size warning unrelated to this change)

## Residual drift

After Phase 8, all named war-phase modal/shell data seams in the Warroom have been closed:

| Surface | Status |
|---|---|
| `FactionOverviewPanel` | snapshot-first, `DATA BOUNDARY:` present |
| `ReportsModal` | snapshot-first via `getOperationalSitrepView` |
| `MagazineModal` | snapshot-first, `DATA BOUNDARY:` present |
| `DiplomacyModal` | snapshot-first, `DATA BOUNDARY:` present |
| `IvpBreakdownModal` | snapshot-first, `DATA BOUNDARY:` present (Phase 6) |
| `CommandBriefingModal` | `military.last_briefing` exception documented (Phase 6) |
| `ClickableRegionManager` | shell seams closed (Phases 6+7), `DATA BOUNDARY:` present |
| `NewspaperModal` | snapshot-first, `DATA BOUNDARY:` present (Phase 8) |

Remaining accepted non-modal gaps:
- `TacticalMap` / `WarPlanningMap` — render-layer utilities reading controller state for polygon fill; not modal/shell display paths; accepted per Phase 7 audit
- `DeclarationEventModal.findWarMilestoneEvent()` — event-detector utility reading political state; not a display render path; accepted per Phase 7 audit
- `ReportsModal.gatherMunicipalityIntel()` — Phase 0-only path reading `political.municipalities` and `political.political_controllers` for pre-war org-penetration display; explicitly accepted under Phase 0 rules (Phase 4)

No war-phase raw `military.*` or `political.*` reads remain in any Warroom modal/shell surface without a boundary-exception comment or routing through `extractWarData()`.

---

## Integration notes

### PROJECT_LEDGER.md entry

```
**[2026-04-07] v0.8-to-v0.9 Commander Explanation Surfaces Phase 8 - NewspaperModal Officer Boundary COMPLETE**

- **Summary:** Closed the two remaining war-phase raw state reads in `NewspaperModal.getOfficerSuccessionLines()`.
  Added `officerNamesById: Record<string, string>` to `WarDataSnapshot` (ID→player-safe name lookup, sourced
  from military.named_officer_data, sorted by ID for determinism). `getOfficerSuccessionLines()` now calls
  `extractWarData()` and reads officer names from `snap.officerNamesById` and corps names from
  `snap.ownForces.formationDetails`. `getPlayerSafeCorpsName` import removed from NewspaperModal. Class-level
  `DATA BOUNDARY:` comment added. 13 new boundary/correctness tests.
- **Files changed:** src/ui/warroom/data/war_data_extractor.ts, src/ui/warroom/components/NewspaperModal.ts,
  tests/newspaper_modal_officer_boundary.test.ts (new).
- **Verification:** tsc clean, 3016/3016 vitest (216 files), build clean.
- **Report:** docs/40_reports/implemented/20260407_V08TO09_NEWSPAPER_MODAL_OFFICER_BOUNDARY.md
```

### MASTER_ROADMAP.md mark-done line

Locate the Commander Explanation Surfaces section. Mark Phase 8 as complete:

```
- [x] Phase 8 — NewspaperModal Officer Boundary (2026-04-07): getOfficerSuccessionLines seam closed; officerNamesById added to WarDataSnapshot; DATA BOUNDARY: comment; 13 tests
```

### architect_notes.md board note

```
## NewspaperModal officer boundary — CLOSED (2026-04-07)

Phase 8 complete. Last named war-phase modal seam in the Warroom closed.

WarDataSnapshot.officerNamesById (Record<string, string>) now owned by extractOfficerNamesById() in
war_data_extractor.ts. NewspaperModal.getOfficerSuccessionLines() reads officer names and corps names
exclusively via extractWarData() snapshot — zero direct military.* reads remain in war-phase paths.

All Warroom modal/shell surfaces (FactionOverviewPanel, ReportsModal, MagazineModal, DiplomacyModal,
IvpBreakdownModal, CommandBriefingModal, ClickableRegionManager, NewspaperModal) are now either
snapshot-first with DATA BOUNDARY: comments or have exceptions explicitly documented.

extractWarData() is the sole war-phase data entry point across all Warroom surfaces. No undocumented
raw military.* or political.* reads remain in any war-phase Warroom display path.
```
