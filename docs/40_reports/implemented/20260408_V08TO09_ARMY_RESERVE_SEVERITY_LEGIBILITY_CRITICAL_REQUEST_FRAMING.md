# Army Reserve Severity Legibility / Critical Request Framing

Date: 2026-04-08
Lane: `Army Reserve Severity Legibility / Critical Request Framing`

## Candidate seams considered

1. Expose reserve severity framing consistently across toolbar, Army HQ handoff, and Army Reserve desk using one canonical presentation rule.
2. Only improve the toolbar copy/color treatment for reserve pressure.
3. Broaden command-shell alert hierarchy around reserve pressure and adjacent military warnings.

## Lane chosen

I chose the first seam: reserve request criticality already existed in the underlying request priority data, but the player-facing framing was inconsistent and mostly color-driven. This was the highest-value bounded step because it made the same severity rule legible across all three relevant surfaces without creating a new owner, a new queue, or louder alert spam.

## Why the other seams were deferred

- Toolbar-only improvement was too narrow. It would have made the signal louder without making the boundary and severity story coherent across the Army HQ handoff and the reserve desk.
- Broader alert hierarchy redesign was too large for a bounded implementation lane and would have drifted into command-shell product reshaping.

## Problem boundary

Reserve requests are already owned by the Army Reserve desk and summarized by `armyReserveQueue`. The remaining gap was severity legibility:

- what counts as critical was not surfaced as a canonical UI rule
- the toolbar distinguished urgency mainly by color
- Army HQ handoff language did not clearly tell the player when reserve pressure was immediate versus routine
- the reserve desk request cards did not use one shared severity framing contract

This lane keeps ownership unchanged:

- reserve management remains outside presidential review
- `armyReserveQueue` remains the canonical summary owner
- request `priority` remains the canonical severity input

## Design

The post-cleanup contract is:

- `priority >= 75` remains the canonical threshold for `critical`
- one helper module owns reserve severity presentation rules for:
  - toolbar wording
  - Army HQ reserve-attention summary wording
  - per-request reserve desk framing
- the presidential review queue stays separate
- Army HQ continues to act as a handoff surface, not a second reserve-management desk

## Implementation

### Exact seam fixed

Critical reserve requests existed in data but were under-explained in the player-facing UI. I introduced one canonical severity presentation rule and routed the toolbar signal, Army HQ handoff copy, and reserve desk request framing through it.

### Exact files changed

- `src/ui/map/utils/armyReserveSeverity.ts`
- `src/ui/map/data/types.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/components/PresidentialToolbar.tsx`
- `src/ui/map/components/army_hq/PresidentialAttentionPanel.tsx`
- `src/ui/map/components/ArmyReservePanel.tsx`
- `tests/army_reserve_severity_legibility.test.ts`
- `tests/ui_map_game_state_adapter.test.ts`
- `tests/army_hq_presidential_review_coherence.test.ts`

### What changed

- Added `src/ui/map/utils/armyReserveSeverity.ts` as the canonical severity framing owner.
  - `classifyArmyReserveSeverity(priority)`
  - `getArmyReserveToolbarSignal(...)`
  - `getArmyReserveAttentionSummary(...)`
  - `getArmyReserveRequestSeverityCopy(priority)`
- Extended `pendingReserveRequests` in the UI-facing types to include `severityBand`.
- Updated `GameStateAdapter` so reserve requests derive `severityBand` directly from the canonical threshold.
- Updated `PresidentialToolbar` so army-level reserve attention uses helper-driven labels and titles.
  - critical requests now read as `CRITICAL RESERVE REQUEST(S)` instead of being distinguished only by color
  - toolbar signaling still routes through `armyReserveQueue`, not presidential review
- Updated `PresidentialAttentionPanel` so Army HQ handoff copy explicitly says when critical reserve pressure needs immediate army attention versus routine reserve review.
- Updated `ArmyReservePanel` so:
  - the pending request area starts with a severity-aware summary card
  - every request card carries a consistent severity label and explanatory detail
  - critical versus routine framing is no longer implicit in the raw priority bar alone

## Verification

### Targeted verification

- `npx.cmd vitest run tests/army_reserve_severity_legibility.test.ts`
  - Passed: `6/6`
- `npx.cmd tsx --test tests\ui_map_game_state_adapter.test.ts`
  - Passed: `16/16`
- `npx.cmd vitest run tests/army_reserve_severity_legibility.test.ts tests/army_hq_presidential_review_coherence.test.ts`
  - Passed: `10/10`

### Full required verification

- `npm.cmd run test:vitest`
  - Passed: `218/218` files, `3030/3030` tests
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - Passed
- `npm.cmd run build`
  - Passed

### Verification notes

- Full Vitest still emits the same pre-existing non-blocking stderr/anomaly warnings from unrelated integration coverage. They were unchanged by this lane.
- No new nondeterministic ordering or queue ownership was introduced.

## Resulting ownership / attention story

After this change, the player-facing reserve story is easier to explain:

- `REVIEW / REVIEWS` means presidential military review work
- `RESERVE REQUEST / RESERVE REQUESTS` means army-level reserve pressure
- critical reserve pressure is explicitly framed as immediate army attention
- routine reserve pressure is framed as reserve review work, not as a generic alert
- the toolbar signals army pressure, Army HQ explains the handoff, and the Army Reserve desk owns the actual management surface

## Residual risks

- The critical threshold is now much more legible, but the underlying `priority` rationale is still only indirectly visible through corps request description and purpose.
- The reserve desk still shows severity primarily through summary/detail language, labels, and the existing priority bar; it does not yet explain *why* a specific request crossed the critical threshold in player-facing causal terms.
- Any broader shell-wide alert hierarchy across Army HQ, reserve pressure, and other non-presidential military attention is still a larger product question, not part of this bounded lane.

## Integration notes for protected docs

### `docs/PROJECT_LEDGER.md`

Add:

`2026-04-08 - Army Reserve Severity Legibility / Critical Request Framing: introduced one canonical reserve severity presentation contract, sourced from request priority and applied consistently across PresidentialToolbar, Army HQ Presidential Attention handoff copy, and ArmyReservePanel request cards. Reserve requests now derive a stable severityBand (`critical` at priority >= 75, otherwise `routine`), the army-level toolbar signal explicitly names critical reserve requests instead of relying on color alone, Army HQ explains when reserve pressure needs immediate army attention versus routine reserve review, and the reserve desk gives each request one consistent severity label and explanatory detail without folding reserve urgency back into presidential review.`

### `docs/plans/MASTER_ROADMAP.md`

Mark complete only if wording matches:

- reserve criticality is now presented through one canonical UI framing rule
- toolbar, Army HQ handoff, and Army Reserve desk all use the same severity contract
- presidential review remains separate from reserve management
- no claim of broader command-shell alert redesign

Recommended next lane:

- `Army Reserve Cause Legibility / Why This Is Critical`

### `.claude/architect_notes.md`

Add:

`When an urgency source is already owned by one queue, improve legibility by centralizing its presentation rule rather than adding more badges or alternate summaries. In AWWV, reserve request priority remains the sole severity input, armyReserveQueue remains the summary owner, and one helper-driven framing contract now controls how toolbar signals, Army HQ handoffs, and reserve-desk request cards describe critical versus routine reserve pressure.`

## Stop reason

I stopped because the severity/legibility contract lane is complete. The next meaningful step is no longer the same framing fix; it would be a new lane about explaining *why* a reserve request is critical, which is a separate player-facing causality problem.

## Recommended next lane

`Army Reserve Cause Legibility / Why This Is Critical`

That lane would be worthwhile because this sweep made severity visible and consistent, but not yet fully causal from the player's point of view.
