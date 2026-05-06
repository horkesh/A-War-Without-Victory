# A5 — Army HQ Pushback UI (LANE-NIGHTSHIFT-A5-ARMY-HQ-PUSHBACK-UI)

**Lane:** `LANE-NIGHTSHIFT-A5-ARMY-HQ-PUSHBACK-UI`
**Date:** 2026-05-06
**Status:** SHIPPED
**DDR (authoritative):** `docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md` (`eee308e0`)
**Predecessors (cited):**
- A1 closeout: `docs/40_reports/implemented/20260506_A1_WIRE_CAMPAIGN_PLAN_TO_BRIEFING.md` (`18136710`)
- A2 closeout: `docs/40_reports/implemented/20260506_A2_ARMY_CO_LOOP_SUBSTRATE.md` (`ba6955bf`)
- A3 closeout: `docs/40_reports/implemented/20260506_A3_ARMY_LEVEL_ORDER_INTERPRETATION.md` (`c8ff93d8`)
- A4 closeout: `docs/40_reports/implemented/20260506_A4_ARMY_CO_ROSTER_PERSONALITIES.md` (`93c75b1d`)

---

## What A5 ships

A5 is the final A-lane in the DDR succession. It surfaces, in the existing
Pre-Advance Review shell (`AdvanceTurnModal`), three substrate-driven sections
that consume A2/A3/A4 outputs without engine-side changes:

1. **Mladić-class autonomous-launch warnings** (most urgent; rendered first).
2. **Army CO objections** for the current turn (army_directive_pushback events
   + decision-trace entries flagging PARTIAL/REFUSED compliance).
3. **Recent override history** with a relief-threshold badge per political
   leader (informational; rendered last).

When all three sections are empty, the panel returns `null` so the existing
Pre-Advance Review shell stays clean.

## Pre-Advance Review shell discovery

The Pre-Advance Review shell is `AdvanceTurnModal.tsx` per the existing
closeout (`docs/40_reports/implemented/20260502_PRE_ADVANCE_COMMAND_REVIEW.md`).
The modal is triggered by the Warroom shell's `wall_calendar_area` advance-turn
hotspot, renders inside the canonical shared `<Modal>` wrapper, and reads
`loadedGameState` + `osidDisplayNames` to project a Decision-Room-derived
review view (`buildPreAdvanceCommandReviewView`). The A5 panel is rendered
underneath the existing `Review Before Advance` priority-rows section, so
warnings/objections/overrides surface alongside (not in place of) the existing
priority dossier.

## Files touched (exclusive ownership)

NEW:
- `src/ui/components/ArmyCoPushbackPanel.tsx` (~330 LOC, standalone reusable
  component; only call-site is the modal wired below).
- `tests/a5_army_co_pushback_ui.test.ts` (10 tests, all GREEN).
- `docs/40_reports/implemented/20260506_A5_ARMY_HQ_PUSHBACK_UI.md` (this file).

MODIFIED:
- `src/ui/map/components/warroom/AdvanceTurnModal.tsx` (Pre-Advance Review
  shell — additive: new import + memoized data extraction + panel render
  inside the existing modal body. No existing surface mutated; no API change;
  panel rendered after the priority-rows section).

NOT touched:
- Any sim/state code (`src/sim/`, `src/state/`) — A5 is read-only display.
- A1/A2/A3/A4 source files (frozen post-ship).
- Roster JSON / OOB / scenarios — UI consumes existing fields.
- Adapter `GameStateAdapter.ts` — sibling lane file, out of A5 scope.
- Any other UI shell.

## Surface design

Per DDR Q3 + Q4 binding decisions:

### 1. Mladić-class autonomous-launch warnings

Two source-paths, deduplicated by officer id, deterministically sorted by
faction asc + officer id asc:

- **Pending event source:** `pendingOfficerEvents[]` filtered by
  `type === 'army_co_proposes_op'`. Officer must have
  `stubbornness >= STUBBORNNESS_AUTONOMOUS_THRESHOLD` (imported from A3 module
  — no hardcoded `4`).
- **Recent-launch source:** officers with `stubbornness >= threshold` AND
  `last_autonomous_launch_turn` within the last `RECENT_AUTONOMOUS_LAUNCH_WINDOW`
  turns (1; 1-turn-advance warning shape per brief).

Each warning surfaces:
- "WARNING: <name> (<faction>) is preparing an autonomous operation despite
  political directive."
- Stubbornness value vs threshold.
- Override cost (`ARMY_OVERRIDE_POLITICAL_CAPITAL_COST` = 2 from A3).
- Cooldown reference (`AUTONOMOUS_LAUNCH_COOLDOWN_TURNS` = 12 from A3).
- Source-attribution turn.

### 2. Army CO objections

Two source-paths, deduplicated by faction:

- **Decision-trace source:** `military.army_co_decision_traces[faction]` last
  entry whose rationale contains pushback keywords ("pushes back",
  "untenable", "asks for an override", "partial", "refused"). Mirrors A3's
  `buildArmyReason` wording.
- **Pending-event source:** `army_directive_pushback` events not already
  covered by a decision trace.

Each objection surfaces:
- "<faction> Main Staff (<officer name>): pushed back on directive — <campaign_role>."
- Rationale (line-clamped to 3 lines).
- Turn.

### 3. Override history (informational)

Per officer (specifically political leaders carrying `recent_overrides`):
- Count of overrides in the rolling `OVERRIDE_HISTORY_WINDOW` (12 turns).
- Badge "AT RELIEF THRESHOLD" when count `>= OVERRIDE_RELIEF_THRESHOLD` (3 per
  DDR auto-relief rule).

### Section ordering

`<details open>` elements rendered in order:
1. Warnings (red border, default open — most urgent).
2. Objections (amber border, default open).
3. Override history (neutral border, default closed — least urgent).

### Conditional render

When all three sections are empty, the component returns `null` (no empty
state markup) — keeps the modal body clean per brief.

## Constants (A3-imported, no hardcoded magic numbers)

| Constant | Value | Source module |
|---|---|---|
| `STUBBORNNESS_AUTONOMOUS_THRESHOLD` | 4 | `src/sim/combat/army_order_interpretation.ts` |
| `AUTONOMOUS_LAUNCH_COOLDOWN_TURNS` | 12 | `src/sim/combat/army_order_interpretation.ts` |
| `ARMY_OVERRIDE_POLITICAL_CAPITAL_COST` | 2 | `src/sim/combat/army_order_interpretation.ts` |
| `RECENT_AUTONOMOUS_LAUNCH_WINDOW` | 1 | A5 panel (1-turn-advance warning shape) |
| `OVERRIDE_RELIEF_THRESHOLD` | 3 | A5 panel (DDR auto-relief rule) |
| `OVERRIDE_HISTORY_WINDOW` | 12 | A5 panel (mirrors A3 cooldown window) |

T6 is the static-grep-by-behavior guard: an officer at `threshold-1` produces
no warning, an officer at `threshold` does — and the rendered text shows
`threshold ${STUBBORNNESS_AUTONOMOUS_THRESHOLD}`.

## Tests authored — 10/10 GREEN

| Test | Coverage |
|---|---|
| T1 | Panel renders nothing when no traces + no warnings + no overrides |
| T2 | Panel renders Mladić-class warning when officer with stubbornness=5 has recent autonomous launch |
| T3 | Panel renders army CO pushback for trace with PARTIAL/REFUSED rationale |
| T4 | Panel renders override history badge when recent_overrides.length >= 3 |
| T5 | Section ordering: warnings first, then objections, then override history |
| T6 | Panel reads STUBBORNNESS_AUTONOMOUS_THRESHOLD from A3 constants module (no hardcoded 4) |
| T7 | Panel handles missing fields gracefully (pre-A4 saves) |
| T8 | Faction-symmetric: same render path for RBiH / RS / HRHB officers |
| T9 | Pending `army_co_proposes_op` event surfaces as warning source |
| T10 | Pending `army_directive_pushback` event surfaces as objection when no trace exists |

## Verification

```
npx tsc --noEmit -p tsconfig.json
npx vitest run tests/a5_army_co_pushback_ui.test.ts \
                tests/a4_army_co_roster_personalities.test.ts \
                tests/a3_army_order_interpretation.test.ts \
                tests/a2_army_co_substrate.test.ts \
                tests/a1_army_hq_campaign_plan_wired.test.ts \
                tests/ui/pre_advance_command_review.test.ts
npm run desktop:map:build
```

Results:

- `tsc --noEmit` — **CLEAN**.
- A5 + predecessor + adjacent UI suites: **66/66 PASS**.
  - `a5_army_co_pushback_ui.test.ts` (10)
  - `a4_army_co_roster_personalities.test.ts` (16)
  - `a3_army_order_interpretation.test.ts` (14)
  - `a2_army_co_substrate.test.ts` (16)
  - `a1_army_hq_campaign_plan_wired.test.ts` (7)
  - `tests/ui/pre_advance_command_review.test.ts` (3)
- `npm run desktop:map:build` — **`✓ built in 17.08s`** (Electron map build
  completes; pre-existing chunk-size warning unchanged from A4).
- 40w determinism: NOT REQUIRED (read-only UI lane; no sim surface).

## Sensitive-history compliance

- **Ring 0/UI** — read-only display layer; no engine touch.
- **§6 surface:** A5 SURFACES warnings about Mladić-class behavior but does
  NOT change canonical paint anchor / rupture / OOB / Srebrenica/Žepa rupture
  data. UI display of substrate already cleared at A2/A3/A4 sign-off
  (substrate is canonical; A5 just reads it).
- **Faction-symmetric:** same component renders for all 3 factions; T8 covers
  RBiH / RS / HRHB symmetric path.
- **Display semantics historically grounded:** stubbornness ≥4 surfaces
  autonomous-launch warnings (per DDR; matches Mladić's documented
  insubordination at Vlasenica / Srebrenica per ICTY *Popović* IT-05-88-T).

## Determinism

- No `Math.random()`, `Date.now()`, `new Date()`, or locale-sort.
- All map iteration via `Object.keys(...).sort()`.
- Warning + objection + override-row arrays are stably sorted (faction asc,
  officer_id asc).
- React rendering is pure; same props → same DOM.

## Render snapshots (text-only DOM tree)

### Empty state (T1, T7)
```
<no DOM rendered>
```

### Mladić warning only (T2)
```
<section data-testid="army-co-pushback-panel" aria-label="Army HQ pushback">
  <div>Army HQ Pushback</div>
  <details data-testid="army-co-pushback-warnings" open aria-label="...autonomous-launch warnings">
    <summary>Autonomous-launch warning (1)</summary>
    <ul>
      <li data-testid="army-co-pushback-warning-mladic">
        WARNING: Mladic (RS) is preparing an autonomous operation...
        Stubbornness 5 / threshold 4 · Override cost: 2 political_capital · Cooldown 12t
        Source: last launch t30
      </li>
    </ul>
  </details>
</section>
```

### Decision-trace pushback (T3)
```
<section data-testid="army-co-pushback-panel" aria-label="Army HQ pushback">
  <div>Army HQ Pushback</div>
  <details data-testid="army-co-pushback-objections" open>
    <summary>Army CO objections (1)</summary>
    <ul>
      <li data-testid="army-co-pushback-objection-RS">
        RS Main Staff (Mladic): pushed back on directive — PRESS_OFFENSIVE.
        General Mladić pushes back on the political directive...
        Turn 30
      </li>
    </ul>
  </details>
</section>
```

### Override history with relief badge (T4)
```
<section data-testid="army-co-pushback-panel">
  <div>Army HQ Pushback</div>
  <details data-testid="army-co-pushback-overrides" (closed by default)>
    <summary>Override history (1)</summary>
    <ul>
      <li data-testid="army-co-pushback-override-karadzic">
        Karadzic (RS)
        3 / last 12t
        <span data-testid="army-co-pushback-relief-karadzic">At relief threshold</span>
      </li>
    </ul>
  </details>
</section>
```

### All three sections (T5)
```
<section data-testid="army-co-pushback-panel">
  <details data-testid="army-co-pushback-warnings" open>...</details>
  <details data-testid="army-co-pushback-objections" open>...</details>
  <details data-testid="army-co-pushback-overrides" (closed)>...</details>
</section>
```
Render-order proof: section ordering verified by `details` index in T5.

## Stop-and-ask conditions (none triggered)

- Pre-Advance Review shell located: `AdvanceTurnModal.tsx`. ✓
- A2/A3/A4 substrate field shapes match documented schema. ✓
- React Testing Library compatible: `@testing-library/react` already installed
  and used by `tests/modal_wrapper.test.ts` and 19 other test files. ✓

## Cross-references

- DDR (authoritative): `docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md` (`eee308e0`)
- A1 closeout: `docs/40_reports/implemented/20260506_A1_WIRE_CAMPAIGN_PLAN_TO_BRIEFING.md` (`18136710`)
- A2 closeout: `docs/40_reports/implemented/20260506_A2_ARMY_CO_LOOP_SUBSTRATE.md` (`ba6955bf`)
- A3 closeout: `docs/40_reports/implemented/20260506_A3_ARMY_LEVEL_ORDER_INTERPRETATION.md` (`c8ff93d8`)
- A4 closeout: `docs/40_reports/implemented/20260506_A4_ARMY_CO_ROSTER_PERSONALITIES.md` (`93c75b1d`)
- Pre-Advance Review shell precedent: `docs/40_reports/implemented/20260502_PRE_ADVANCE_COMMAND_REVIEW.md`
