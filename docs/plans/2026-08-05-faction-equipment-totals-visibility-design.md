# Faction Equipment Totals Visibility — Design Note

**Date:** 2026-08-05
**Source:** Pyrrhic panel (ui-ux-developer, game-designer, modern-wargame-expert), convened on owner request
**Scope:** `src/ui/warroom/components/FactionOverviewPanel.ts`, `src/ui/map/components/CorpsCard.tsx` — design only, no implementation in this note
**Status:** Proposed — not yet wired into MASTER_ROADMAP.md / COMMAND_BOARD.md

## Problem

Faction-wide current equipment holdings (tanks/artillery/AA currently held across all active brigades) are not visible anywhere today. Equipment *lost* (cumulative) is shown faction-wide in the Warroom Faction Overview panel's CASUALTIES quadrant. Equipment *held* is visible only one brigade at a time (`FormationDetail.tsx`, tactical map) or one corps at a time (`CorpsCard.tsx`, which already sums tanks/artillery per corps via `getEquipmentSummary()`). No faction-wide rollup exists.

## Panel discussion (condensed)

- **ui-ux-developer:** the corps-level summation logic already exists (`CorpsCard.tsx:105-114`) — a faction total is one more rollup, not a new mechanic. Recommends against a new panel/modal; the accepted command-surface design retires `StrategicDashboard` specifically for being a duplicate-metrics surface, so folding into existing screens is the right direction.
- **game-designer:** no canon blocker (Game Bible/Rulebook are silent). Flagged an altitude tension — raw stockpile counts read as general-level inventory management, arguably below the president's vantage point — but noted the *existing* Faction Overview panel already shows exact own-faction KIA/WIA/Equipment-Lost integers, so exact counts would not be a new precedent, just an extension of one.
- **modern-wargame-expert:** genre convention (HOI4) favors a persistent top-bar stockpile counter, but that exists there because the player directly spends it (production/deployment). In AWWV the number is informational, not operative, so a persistent HUD element would be the wrong altitude. Recommends the existing "check when you look" scan/drill-down pattern instead of new always-on chrome.

## Decision

Resolves the game-designer's open call: **show exact counts**, consistent with the existing Equipment-Lost precedent, but **pair them with an embargo/maintenance-derived readiness indicator** so the number carries the mechanic behind it rather than reading as pure inventory tally.

Two lines, wherever this ships:

1. **Equipment Held** — `T:{tanks} A:{artillery} AA:{aa}`, exact integers summed from `composition.tanks/artillery/aa_systems` across active formations. Mirrors the existing `Equipment Lost` line's format exactly (`FactionOverviewPanel.ts:414`).
2. **Heavy Equipment Readiness** — a status word + percentage derived from `equipment_state.operational_heavy / total_heavy` summed faction-wide (e.g. "68% Operational"), bucketed the same way Supply status already is (Adequate/Strained/Critical, `FactionOverviewPanel.ts:423-426`). This is the number that actually reflects embargo access and maintenance capacity (`src/state/embargo.ts`, `src/state/heavy_equipment.ts`) — the presidentially-relevant consequence, not the raw item count.

## Where it ships

1. **Faction Overview panel** (Warroom, `commander_coatrack` → `FactionOverviewPanel.ts`), MILITARY quadrant (`:395-405`) — add both lines. Cheapest, ships alongside the existing quadrant pattern.
2. **Army HQ corps list** (tactical map, `src/ui/map`) — a faction-wide header above the per-corps `CorpsCard` rows, extending `getEquipmentSummary()` to sum across all corps instead of one. Same two-line format, as the drill-down counterpart.

No new panel, no new modal, no persistent HUD element (all three roles converged against the last one).

## Data notes / risks

- `equipment_state.total_heavy`/`operational_heavy` is an **abstract readiness pool**, not a per-weapon-type breakdown — it does not map 1:1 onto `composition.tanks/artillery/aa_systems`. The readiness line must be labeled/scoped as "heavy equipment" in general, never attributed to a specific weapon type, to avoid implying false precision. (This distinction was the subject of the conversation that produced this note — see prior turns for the full mechanism.)
- Follow the existing "Unreported" convention (`2026-07-30-presidential-judgment-loop-design.md:48`): if a contributing formation doesn't report a metric, the aggregate must say so rather than silently treating the missing value as zero.
- Own-faction only, Tier 1 exact — no cross-faction visibility, consistent with the existing fog-of-war design in `FactionOverviewPanel.ts` and `DiplomacyModal.ts`.
- Readiness-band thresholds (what counts as "Adequate" vs. "Strained" vs. "Critical" heavy-equipment readiness) are not fixed by this note — needs a short game-designer follow-up to set numeric bands, ideally reusing whatever thresholds already exist for the Supply status bucketing if they're generic enough to carry over.

## Acceptance (for whoever implements)

- Faction Overview MILITARY quadrant shows both lines for the player's own faction.
- Army HQ corps list shows a faction-wide header with the same two lines, above existing per-corps equipment rows.
- No new modal, no new panel, no persistent HUD chrome added.
- Readiness-band thresholds confirmed with game-designer before ship (open item above).
- EN/BCS localization parity maintained for both new lines.
