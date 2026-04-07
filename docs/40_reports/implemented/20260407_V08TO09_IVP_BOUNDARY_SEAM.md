# 2026-04-07 - v0.8-to-v0.9 Commander Explanation Surfaces Phase 6 - IVP Boundary Seam

## Scope

Bounded hardening lane:

- close the IVP data boundary seam in `ClickableRegionManager.openCommandBriefingModal()` (shell coordinator reading raw `political.*`)
- close the undocumented raw-state bypass in `IvpBreakdownModal.ts`
- document the accepted `military.last_briefing` read in `CommandBriefingModal.ts`
- add `ivpState: IvpStateSnapshot` to `WarDataSnapshot` as the single IVP data entry point

## Why this lane

After Phase 5 closed the `DiplomacyModal` W5 seam, the audit found two remaining boundary violations:

**Seam A — shell coordinator (high severity):** `ClickableRegionManager.openCommandBriefingModal()` read `state.political.international_visibility_pressure` and `state.political.ivp_consequences_active` directly (lines 589–591) to decide whether to decorate the Command Briefing modal with an IVP footer button. This was a shell coordinator reading deep operational state, violating the principle that shell handoff logic should not own data interpretation.

**Seam B — modal bypass (undocumented):** `IvpBreakdownModal.ts` read `gameState.political.international_visibility_pressure`, `gameState.political.ivp_consequences_active`, and `gameState.military.sarajevo_tunnel_operational` directly, with no boundary comment. All three reads were war-phase-only, but they bypassed `extractWarData()` silently.

**Seam C — undocumented boundary:** `CommandBriefingModal.ts` read `gameState.military?.last_briefing` (line 55) without any explanation. This read is architecturally acceptable (pre-computed engine packet, not raw operational data), but the absence of a comment made it indistinguishable from an accidental bypass.

## Audit findings

### Canonical before this pass

- `src/ui/warroom/data/war_data_extractor.ts`
  - raw player-safe operational snapshot owner
  - owned `observedEnemyTerritoryPct` (added Phase 5) but not IVP state
- `src/ui/warroom/components/IvpBreakdownModal.ts`
  - war-phase-only breakdown of `international_visibility_pressure`
  - read three raw fields without boundary documentation
- `src/ui/warroom/ClickableRegionManager.ts`
  - shell modal coordinator; already imported `extractWarData`
  - `openCommandBriefingModal()` read `political.*` directly for footer decision
- `src/ui/warroom/components/CommandBriefingModal.ts`
  - read `military.last_briefing` at line 55 — acceptable but undocumented

### Seam A — shell coordinator (CLOSED)

`openCommandBriefingModal()` extracted `ivp`, `composite`, and `hasConsequences` directly from `state.political.*`. The footer decision (whether to show the IVP button) depended on this raw extraction, meaning:

- shell coordinator was duplicating IVP awareness owned by the extractor
- if `international_visibility_pressure` structure changed, the shell would break independently of the modal
- testability was poor: shell launch tests needed to mock deep state structure

Fix: `extractWarData(state, getPlayerFaction(state))` called once at the top of the method; `snap.ivpState.composite` and `snap.ivpState.activeConsequenceIds.length > 0` replace the raw reads.

### Seam B — IvpBreakdownModal bypass (CLOSED)

Three direct reads removed:
- `this.gameState.political.international_visibility_pressure` → `snap.ivpState` (entire object replaced)
- `this.gameState.political.ivp_consequences_active` → `snap.ivpState.activeConsequenceIds`
- `this.gameState.military.sarajevo_tunnel_operational` → `snap.ivpState.sarajevoTunnelOperational`

`getIvpComponentContributions()` and `sortIvpConsequenceIds()` moved from modal to extractor; modal now consumes pre-computed `snap.ivpState.components` and `snap.ivpState.activeConsequenceIds`.

### Seam C — CommandBriefingModal boundary documented (DOCUMENTED)

Added class-level `DATA BOUNDARY:` JSDoc comment explaining that `military.last_briefing` is a pre-computed engine packet, not raw operational data, and that no further `military.*` or `political.*` reads are permitted.

## Design

### Canonical boundary after cleanup

- canonical raw snapshot owner (war phase):
  - `extractWarData(gameState, playerFaction)` in `src/ui/warroom/data/war_data_extractor.ts`
- IVP data entry point:
  - `extractIvpState(state: GameState): IvpStateSnapshot` (internal sub-extractor)
  - wired into `extractWarData()` return as `ivpState: IvpStateSnapshot`
- allowed in `IvpBreakdownModal`:
  - `this.gameState.meta.turn` — timeline display (meta.* permitted per Phase 5 rule)
  - `getPlayerFaction(this.gameState)` — player-safe entry point
  - `extractWarData(this.gameState, pf).ivpState` — sole data entry point
- forbidden in `IvpBreakdownModal`:
  - direct reads of `gameState.political.*` or `gameState.military.*`
- allowed in `ClickableRegionManager.openCommandBriefingModal`:
  - `extractWarData(state, getPlayerFaction(state)).ivpState` — sole IVP data entry point
- allowed in `CommandBriefingModal`:
  - `gameState.military.last_briefing` — documented exception; pre-computed engine packet

### Snapshot contract extension

`WarDataSnapshot` gained one new field:

```typescript
/** IVP diplomatic pressure summary (Tier 2: publicly observable). */
ivpState: IvpStateSnapshot;
```

`IvpStateSnapshot` interface:

```typescript
export interface IvpStateSnapshot {
    composite: number;                  // composite IVP score 0..1
    activeConsequenceIds: string[];     // sorted active consequence IDs
    lastMajorShift: number | null;      // turn index of last major shift
    components: IvpComponentContribution[];  // deterministic component breakdown
    sarajevoTunnelOperational: boolean; // siege visibility modifier flag
}
```

Tier 2 classification: IVP is publicly observable diplomatic pressure. All sides observe international reactions. No fog-of-war guard needed.

`extractIvpState()` is null-safe: absent `international_visibility_pressure` returns `{ composite: 0, activeConsequenceIds: [], lastMajorShift: null, components: [], sarajevoTunnelOperational: false }`.

## Implementation

### `src/ui/warroom/data/war_data_extractor.ts`

- Added `InternationalVisibilityPressure` to `game_state.js` import block
- Added new import block: `IvpComponentContribution`, `getIvpComponentContributions`, `sortIvpConsequenceIds` from `patron_pressure.js`
- Added `IvpStateSnapshot` interface in snapshot sub-interfaces section
- Added `extractIvpState()` sub-extractor before `extractWarData()`
- Added `ivpState: IvpStateSnapshot` field to `WarDataSnapshot`
- Wired `const ivpState = extractIvpState(gameState)` in `extractWarData()` extraction block + return

### `src/ui/warroom/components/IvpBreakdownModal.ts`

- Removed `getIvpComponentContributions` and `sortIvpConsequenceIds` from `patron_pressure.js` imports
- Added `extractWarData` import from `../data/war_data_extractor.js`
- Added class-level `DATA BOUNDARY:` comment
- `render()`: `snap = extractWarData(this.gameState, pf)`; `ivpSnap = snap.ivpState`
- All three direct raw reads replaced with `ivpSnap.*` equivalents

### `src/ui/warroom/ClickableRegionManager.ts`

- Added `getPlayerFaction` import from `./components/warroom_utils.js`
- `openCommandBriefingModal()`: replaced lines 589–591 with `snap = extractWarData(state, getPlayerFaction(state) as FactionId)` + `snap.ivpState.*`

### `src/ui/warroom/components/CommandBriefingModal.ts`

- Added `DATA BOUNDARY:` JSDoc comment before class declaration documenting the `military.last_briefing` exception

## Tests

`tests/ivp_breakdown_modal_boundary.test.ts` — 10 new tests:

1. **IvpBreakdownModal has DATA BOUNDARY comment** — source contains `DATA BOUNDARY:` and `extractWarData()`
2. **does not read political.international_visibility_pressure directly** — source scan
3. **does not read political.ivp_consequences_active directly** — source scan
4. **does not read military.sarajevo_tunnel_operational directly** — source scan
5. **ClickableRegionManager does not read state.political.international_visibility_pressure** — source scan
6. **ClickableRegionManager does not read state.political.ivp_consequences_active** — source scan
7. **extractWarData returns correct ivpState.composite** — 0.55 from IVP state fixture
8. **extractWarData returns correct ivpState.activeConsequenceIds** — contains `drina_blockade`
9. **extractWarData returns sarajevoTunnelOperational from military state** — true
10. **extractWarData returns safe defaults when IVP state is absent** — composite=0, empty arrays, null

## Verification

- `npx.cmd tsc --noEmit -p tsconfig.json`: clean — zero errors
- `npm.cmd run test:vitest`: **214 suites, 2990 tests — all pass** (was 213/2980 before Phase 6)
- `npm.cmd run build`: clean

## Residual drift

Minimal. All Warroom modal surfaces are now either:
- snapshot-first with `DATA BOUNDARY:` comment (`IvpBreakdownModal`, `DiplomacyModal`, `MagazineModal`, `FactionOverviewPanel`)
- documented with explicit boundary exceptions (`CommandBriefingModal`)

No raw `political.*` or `military.*` reads remain in any Warroom modal surface without a boundary-exception comment.

The only remaining `ReportsModal` Phase 0 path (`gatherMunicipalityIntel()`) reads `political.municipalities` and `political.political_controllers` for pre-war organizational-penetration display. This is Phase 0-only (pre-fog-of-war) and is consistent with the Phase 0 rules established in Phase 4 — Phase 0 surfaces are explicitly not required to route through `extractWarData()`. It is noted here for completeness.

---

## Integration notes

### PROJECT_LEDGER.md entry

```
**[2026-04-07] v0.8-to-v0.9 Commander Explanation Surfaces Phase 6 - IVP Boundary Seam COMPLETE**

- **Summary:** Closed the IVP data boundary seam. `extractWarData()` now owns `ivpState: IvpStateSnapshot`
  (composite, activeConsequenceIds, lastMajorShift, components, sarajevoTunnelOperational). Shell coordinator
  `ClickableRegionManager.openCommandBriefingModal()` no longer reads `political.*` directly — replaced with
  `snap.ivpState.*`. `IvpBreakdownModal` reads exclusively via snapshot — three direct `political.*` and
  `military.*` reads removed. `CommandBriefingModal` `military.last_briefing` boundary exception documented
  with class-level `DATA BOUNDARY:` comment. 10 new boundary tests.
- **Files changed:** src/ui/warroom/data/war_data_extractor.ts, src/ui/warroom/components/IvpBreakdownModal.ts,
  src/ui/warroom/ClickableRegionManager.ts, src/ui/warroom/components/CommandBriefingModal.ts,
  tests/ivp_breakdown_modal_boundary.test.ts (new).
- **Verification:** tsc clean, 2990/2990 vitest (214 files), build clean.
- **Report:** docs/40_reports/implemented/20260407_V08TO09_IVP_BOUNDARY_SEAM.md
```

### MASTER_ROADMAP.md mark-done line

Locate the Commander Explanation Surfaces section. Mark Phase 6 as complete:

```
- [x] Phase 6 — IVP Boundary Seam (2026-04-07): shell seam closed; IvpBreakdownModal snapshot-first; CommandBriefingModal documented; ivpState added to WarDataSnapshot; 10 tests
```

### architect_notes.md board note

```
## IVP modal boundary — CLOSED (2026-04-07)

Phase 6 complete. IVP data boundary seam closed.

WarDataSnapshot.ivpState now owned by extractIvpState() in war_data_extractor.ts. IvpBreakdownModal
reads exclusively via snapshot. ClickableRegionManager.openCommandBriefingModal() reads ivpState from
snapshot instead of raw political.*. CommandBriefingModal boundary exception (military.last_briefing)
documented with DATA BOUNDARY: comment.

All Warroom modal surfaces (FactionOverviewPanel, ReportsModal, MagazineModal, DiplomacyModal,
IvpBreakdownModal, CommandBriefingModal) are now either snapshot-first with DATA BOUNDARY: comments or
have exceptions explicitly documented. No undocumented raw political.* or military.* reads remain
in any war-phase Warroom surface.

WarDataSnapshot.ivpState is available to all future modal consumers needing IVP data without adding
new raw-state reads.
```
