# Player-Knowledge Integrity Wave 2

**Date:** 2026-04-03
**Lane:** Next Priority Lane 2 — "Continue player-knowledge integrity beyond adapter wave 1"

## What Was Changed

### P0 — RawIntelTab demoted to debug-only (Option A)

**File:** `src/ui/map/components/ops_modal/G2Phase.tsx`

The "Raw Intel" tab was removed from the normal operations G2 Assessment clipboard. It exposed:
- `overall.estimatedCasualties.toLocaleString()` — exact integer (e.g. "12,456")
- `overall.forceRatio.toFixed(2)` — 2-decimal ratio (e.g. "1.23:1")
- `axis.defenseStrength.toLocaleString()` — raw engine defense power per axis
- `axis.forceRatio.toFixed(2)` — per-axis exact ratio
- `getRecommendationReasoning()` — embedded exact ratios in reasoning string

Changes:
- `G2Tab` type narrowed from `'assessment' | 'raw_intel' | 'map_legend'` to `'assessment' | 'map_legend'`
- "Raw Intel" tab button removed from the tab bar
- Render branch simplified: only `NarrativeTab` shown for `activeTab === 'assessment'`
- Import of `RawIntelTab` removed from G2Phase.tsx
- The `RawIntelTab.tsx` component is **preserved in the codebase** but not rendered

**File:** `src/ui/map/components/ops_modal/RawIntelTab.tsx`

Added a prominent doc comment explaining:
- Why it is not rendered in normal play
- What exact engine values it exposes and why that violates Presidential Command Doctrine
- How to safely expose it again (explicit debug mode gate, never direct tab reinstatement)

The canonical player-facing G2 surface remains **NarrativeTab** (already player-safe, uses commander assessment sections with qualified language).

### P1 — generateThreatAssessment strength language softened

**File:** `src/ui/map/components/army_hq/generateThreatAssessment.ts`

**Problem:** `describeStrength()` returned `strengthCategories[last].toUpperCase()` — raw engine enum values (`DENSE`, `FORTRESS`, `THIN`, `MODERATE`) as player-facing fact. Also: `Confidence ${Math.round(bestConf * 100)}%` exposed exact percentage.

**Fix:**
- Added `STRENGTH_DISPLAY` map translating engine enum → qualified uncertainty language:
  - `thin` → `"limited enemy presence (assessed)"`
  - `moderate` → `"moderate enemy strength (estimated)"`
  - `dense` → `"significant enemy presence (estimated)"`
  - `fortress` → `"heavily fortified (assessed)"`
  - unknown fallback → `"enemy presence reported (estimated)"`
- Added `describeConfidence()` bucketing confidence into three labels:
  - ≥0.8 → `"High confidence"`
  - ≥0.5 → `"Moderate confidence"`
  - <0.5 → `"Low confidence"`
- Replaced exact `Confidence ${Math.round(bestConf * 100)}%` with `describeConfidence(bestConf)` in the detail string

### Simplify Pass Findings

Grep for `DENSE|FORTRESS|THIN|strength_category` across `src/ui/` found three other locations — all confirmed **out of scope**:
- `CorpsFrontPanel.tsx` `StrengthBadge` — own-sector defensive strength (player-safe own-force data)
- `warroom_utils.ts` `strengthCategoryLabel()` — own brigade personnel strength label (player-safe)
- `Tooltip.tsx` / `tooltipPlayerSafe.ts` — own-force sector density labels (player-safe)

None describe enemy state; all describe own-force state the president legitimately knows.

`ThreatBadge` in `CorpsFrontPanel.tsx` shows `ratio.toFixed(2):1` for own-sector force balance — already gated behind `intel_confidence < 0.4 ? REDACTED`. Noted as potential wave 3 softening candidate (qualitative-only "Force Balance" label) but out of scope here.

## Regression Tests Added

**File:** `tests/player_knowledge_integrity.test.ts` — 6 new tests in wave 2 suite:

1. Does not emit raw engine enum strings (`DENSE`, `FORTRESS`, `THIN`, `MODERATE`)
2. Uses uncertainty-qualified language (`estimated`/`assessed`) for known strength categories
3. Uses uncertainty-qualified language for `fortress` category specifically
4. Does not emit exact confidence percentages (e.g. `73%`)
5. Emits bucketed confidence labels (High/Moderate/Low) at correct thresholds
6. Handles unknown future `strength_category` values gracefully without echoing raw enum

All 12 tests in the file pass (6 wave 1 + 6 wave 2).

## Verification

- `npx tsc --noEmit` — clean
- `npm run test:vitest tests/player_knowledge_integrity.test.ts` — 12/12 pass
- `npm run test:vitest` (full) — 20 pre-existing failures unchanged, 0 new failures
- Vite build — clean (pre-existing chunk size warning unrelated)
- `check_claude_governance.ps1` — OK

## Completion Block

```
Canonical owner:      PLAYER_VISIBLE_STATE.md (contract) + generateThreatAssessment.ts (canonical staff synthesis)
Demoted path:         RawIntelTab exact numbers (force ratio, casualties, defense strength) in normal play
Player-visible truth: Threat assessment uses qualified uncertainty language; force ratio is bucketed not precise; casualty estimates are ranges not point values
Canonical UI surface: Army HQ Threat Assessment (generateThreatAssessment); Operations prediction (NarrativeTab only)
Done means:           RawIntelTab demoted (file preserved, not rendered); generateThreatAssessment uses uncertainty language; regression tests pass; tsc + vitest + vite + governance clean
```
