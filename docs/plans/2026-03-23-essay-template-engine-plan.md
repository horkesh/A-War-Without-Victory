# Essay Template Engine — v0.7.1 Implementation Plan

**Date:** 2026-03-23
**Status:** Draft
**Depends on:** Essay Codex (complete, 96 essays), Event System (v0.6.0 metagame fields)

---

## 1. Problem Statement

The Codex currently holds 96 static essays in `data/scenarios/essays/essay_index.json`. Every essay is a fixed block of canonical historical text that unlocks when its corresponding event fires. The content never changes regardless of what the player does. This is a missed opportunity: the Bosnian War's trajectory was shaped by decisions that the player is now making differently. The Codex should reflect both what happened historically and what is happening in the player's war.

**Design principle:** Canonical content is NEVER modified. It is the permanent historical substrate. Dynamic sections are *inserted between* canonical paragraphs, clearly distinguished, and driven by game state flags and conditions that the event system already supports.

---

## 2. Extended Essay Schema

### 2.1 Current Schema (preserved exactly)

```typescript
interface EssayEntry {
    id: string;
    event_id: string;
    title: string;
    year: number;
    category: 'military' | 'political' | 'humanitarian' | 'diplomatic';
    sources: string[];
    generated: boolean;
    content: string; // canonical historical text — NEVER modified at runtime
}
```

### 2.2 New Fields

```typescript
interface DynamicEssay extends EssayEntry {
    // === Unlock control ===
    unlock_condition: 'prologue' | 'event_fired' | 'turn_reached';
    unlock_event_id?: string;   // for event_fired — defaults to event_id if omitted
    unlock_turn?: number;       // for turn_reached

    // === Tier classification ===
    tier: 1 | 2 | 3 | 4;
    // 1 = FIXED: international scaffold, no dynamic content
    // 2 = CONDITIONAL: may not fire in player's war; ghost if not fired
    // 3 = SHAPEABLE: fires but details change based on player actions
    // 4 = AHISTORICAL: template-generated, exists only in player's war

    // === Dynamic content injection ===
    dynamic_sections?: DynamicSection[];

    // === Ghost display ===
    ghost_when?: string;
    // Condition expression ID (evaluated against game state).
    // When true AND the essay's event has NOT fired, show as ghost.
    // Ghost = greyed out with "In the historical war..." header.
    // If omitted, locked essays show nothing (current behavior).
}

interface DynamicSection {
    id: string;
    insert_after_paragraph: number;
    // 0-indexed. -1 = prepend before first paragraph.
    // Paragraphs = content.split('\n\n').

    condition: string;
    // Flag expression evaluated against state.military.event_flags.
    // Syntax: simple boolean algebra on flag names.
    //   "flag_name"                   — truthy check
    //   "NOT flag_name"               — falsy check
    //   "flag_a AND flag_b"           — conjunction
    //   "flag_a OR flag_b"            — disjunction
    //   "flag_a AND NOT flag_b"       — mixed
    //   "ALWAYS"                      — unconditional (shows whenever essay is unlocked)
    //
    // Flags come from event_types.ts sets_flags on EventDefinition
    // and EventResponseOption. Already stored on
    // state.military.event_flags: Record<string, string | number | boolean>.

    content: string;
    // The injected paragraph text. Written at dev time.
    // May contain {placeholders} resolved from game state at render time:
    //   {faction_territory_pct:RS}  — "49.4%"
    //   {turn_week}                 — "Week 34"
    //   {event_turn:event_id}       — turn the event fired
    //   {flag:flag_name}            — raw flag value

    variant?: 'divergence' | 'context' | 'outcome';
    // Visual treatment hint:
    //   divergence — "In the historical war... In your war..."
    //   context    — supplementary information unlocked by player action
    //   outcome    — describes what happened as a result of player choice

    divergence_note?: string;
    // Short label for divergence variant, e.g.:
    // "Historically, Operation Corridor succeeded in June 1992.
    //  In your war, the corridor was never opened."
}
```

### 2.3 Condition Expression Evaluator

A lightweight evaluator — NOT a full expression parser. Supports:

```
ALWAYS
flag_name                          → event_flags[flag_name] is truthy
NOT flag_name                      → event_flags[flag_name] is falsy or absent
flag_a AND flag_b                  → both truthy
flag_a OR flag_b                   → either truthy
flag_a AND NOT flag_b              → mixed
(flag_a OR flag_b) AND flag_c      → parenthesized grouping
```

Implementation: tokenize on whitespace, recursive descent with AND/OR/NOT/parens. ~80 lines. Pure function, deterministic, no side effects.

```typescript
// src/sim/events/condition_expression.ts
export function evaluateExpression(
    expr: string,
    flags: Record<string, string | number | boolean>
): boolean;
```

---

## 3. Tier Classification — All 96 Essays

### Tier 1: FIXED (~30 essays)

International scaffold events. These happen regardless of player action — Security Council resolutions, peace plans, NATO decisions. No dynamic sections needed.

| # | event_id | Rationale |
|---|----------|-----------|
| 0 | `independence_referendum_1992` | Pre-game. Always unlocked. |
| 4 | `arms_embargo_impact_1992` | International policy, not player-driven |
| 11 | `jna_withdrawal_1992` | Scripted JNA departure |
| 17 | `concentration_camps_revealed_1992` | Media revelation, externally driven |
| 18 | `london_conference_1992` | Diplomatic, fixed timeline |
| 22 | `turajlic_assassination_1993` | Political assassination, fixed |
| 24 | `vance_owen_plan_1993` | Diplomatic plan, fixed |
| 25 | `us_envoy_appointed_1993` | US policy, fixed |
| 26 | `un_resolution_808_tribunal_1993` | UNSC resolution, fixed |
| 31 | `un_nfz_enforcement_1993` | NATO enforcement, fixed |
| 35 | `un_resolution_819_srebrenica_1993` | UNSC resolution, fixed |
| 36 | `un_resolution_820_sanctions_1993` | UNSC resolution, fixed |
| 40 | `un_safe_areas_declared_1993` | UNSC resolution, fixed |
| 44 | `icty_established_1993` | Tribunal creation, fixed |
| 46 | `un_resolution_836_force_1993` | UNSC resolution, fixed |
| 48 | `operation_sharp_guard_1993` | NATO naval, fixed |
| 55 | `owen_stoltenberg_plan_1993` | Diplomatic plan, fixed |
| 58 | `markale_massacre_1994` | Fixed-turn event |
| 59 | `nato_ultimatum_sarajevo_1994` | NATO policy, fixed |
| 60 | `nato_shoots_down_planes_1994` | NATO enforcement, fixed |
| 61 | `washington_agreement_1994` | Diplomatic agreement, fixed |
| 63 | `contact_group_plan_1994` | Diplomatic plan, fixed |
| 64 | `anti_sniping_agreement_1994` | Agreement, fixed |
| 66 | `coha_ceasefire_begins_1995` | Diplomatic, fixed |
| 69 | `tuzla_gate_massacre_1995` | Fixed-turn massacre |
| 70 | `un_hostage_crisis_1995` | Fixed-turn crisis |
| 71 | `rapid_reaction_force_1995` | International deployment, fixed |
| 75 | `second_markale_massacre_1995` | Fixed-turn event |
| 79 | `dayton_talks_begin_1995` | Diplomatic, fixed |
| 90 | `dayton_signed_1995` | Diplomatic, fixed |
| 91 | `nato_air_strike_threat_1993` | NATO policy, fixed |

**Total: 31**

### Tier 2: CONDITIONAL (~18 essays)

Events with trigger conditions that depend on game state. If the condition never fires, the essay appears as a ghost — the player can still read the historical account but it is marked as "what happened in the real war, not yours."

| # | event_id | Condition dependency |
|---|----------|---------------------|
| 5 | `bijeljina_massacre_1992` | Pre-game prologue (always fires, but early-war framing) |
| 19 | `hvo_arbih_tensions_rise_1992` | Turn 20-40 window |
| 23 | `gornji_vakuf_clashes_1993` | `alliance_below` condition |
| 29 | `croat_bosniak_war_begins_1993` | `alliance_below` condition |
| 30 | `ahmici_massacre_1993` | `alliance_below` condition |
| 33 | `sovici_doljani_attack_1993` | Requires croat-bosniak war |
| 34 | `trusina_killings_1993` | Requires croat-bosniak war |
| 42 | `vitez_kiseljak_pockets_1993` | Requires croat-bosniak war |
| 45 | `battle_of_travnik_1993` | `faction_controls_municipality` condition |
| 49 | `hvo_detention_camps_1993` | Requires croat-bosniak war |
| 53 | `battle_of_bugojno_1993` | `faction_controls_municipality` condition |
| 56 | `abdic_apwb_declared_1993` | Political event, conditional |
| 92 | `grabovica_uzdol_massacres_1993` | Requires active operations |
| 93 | `bosnian_assembly_rejects_os_1993` | Political, conditional |
| 94 | `abdic_karadzic_pact_1993` | Requires Abdic event chain |
| 95 | `stupni_do_massacre_1993` | Requires HVO-ARBiH conflict |
| 20 | `jajce_falls_1992` | `faction_controls_municipality` (turn 40-52) |
| 62 | `gorazde_crisis_1994` | Enclave must still exist |

**Total: 18**

### Tier 3: SHAPEABLE (~33 essays)

The event fires in most/all playthroughs, but the details differ based on player decisions. These get `dynamic_sections` that inject player-war context alongside the canonical text.

| # | event_id | What shapes it |
|---|----------|----------------|
| 1 | `rs_strategic_goals` | Player response to the Six Goals decision |
| 2 | `rbih_state_identity` | Player faction identity choices |
| 3 | `hrhb_political_goal` | Player/bot HB political direction |
| 6 | `battle_of_the_barracks_sarajevo` | Outcome varies by player action |
| 7 | `battle_of_the_barracks_tuzla` | Outcome varies |
| 8 | `battle_of_the_barracks_zenica` | Outcome varies |
| 9 | `battle_of_the_barracks_visoko` | Outcome varies |
| 10 | `sarajevo_siege_begins_1992` | Siege intensity, player response |
| 12 | `mostar_liberation_1992` | Territory control outcomes |
| 13 | `srebrenica_enclave_forms_1992` | Enclave survival trajectory |
| 14 | `drina_cleansing_decision_1992` | RS player choice on ethnic cleansing |
| 15 | `drina_valley_ethnic_cleansing_1992` | Depends on cleansing decision |
| 16 | `operation_corridor_1992` | Corridor success/failure |
| 21 | `kravica_attack_1993` | Territory control at time |
| 27 | `vrs_cerska_offensive_1993` | Offensive outcome |
| 28 | `morillon_enters_srebrenica_1993` | Enclave status |
| 32 | `croatia_herceg_bosna_control_1993` | HB political consolidation |
| 37 | `east_mostar_siege_1993` | Siege dynamics |
| 38 | `central_bosnia_fighting_1993` | Territory outcomes |
| 39 | `srebrenica_shelling_1993` | Enclave status |
| 41 | `srebrenica_demilitarization_1993` | Enclave trajectory |
| 43 | `rs_assembly_rejects_voplan_1993` | RS political state |
| 47 | `operation_neretva_93_1993` | Operation outcome |
| 50 | `sarajevo_tunnel_completed_1993` | Siege trajectory |
| 51 | `operation_lukavac_93` | Operation outcome |
| 52 | `maglaj_enclave_blockade_1993` | Enclave trajectory |
| 54 | `markale_area_shelling_1993` | Siege status |
| 57 | `mostar_bridge_destroyed_1993` | Croat-Bosniak war state |
| 65 | `bihac_crisis_1994` | 5th Corps status, enclave |
| 67 | `coha_expires_1995` | Military balance at ceasefire end |
| 72 | `srebrenica_falls_1995` | Enclave defense outcome |
| 73 | `zepa_falls_1995` | Enclave defense outcome |
| 76 | `nato_deliberate_force_1995` | Military situation triggering NATO |

**Total: 33**

### Tier 4: AHISTORICAL (~14 essays)

Military operations and events whose nature is entirely determined by player/bot action. The canonical content describes what happened historically; dynamic sections describe the player's version. If the player's war diverges significantly, these essays become predominantly dynamic.

| # | event_id | Why ahistorical potential |
|---|----------|--------------------------|
| 68 | `operation_flash_1995` | Croatian military op, outcome varies |
| 74 | `operation_storm_1995` | Croatian military op, outcome varies |
| 77 | `federation_ground_offensive_1995` | Entirely shaped by player ops |
| 80 | `sarajevo_exclusion_zone_1994` | Depends on siege state |
| 81 | `belgrade_embargo_rs_1994` | RS political trajectory |
| 82 | `bihac_5th_corps_offensive_1994` | Player-driven offensive |
| 83 | `operation_cincar_1994` | Player-driven operation |
| 84 | `carter_ceasefire_1994` | Negotiation state |
| 85 | `operation_summer_95` | Player-driven operation |
| 86 | `karadzic_mladic_split_1995` | RS internal politics |
| 87 | `operation_mistral_2_1995` | Player-driven operation |
| 88 | `operation_sana_1995` | Player-driven operation |
| 89 | `us_halts_federation_advance_1995` | Depends on federation gains |
| 78 | `ceasefire_1995` | Depends on military balance |

**Total: 14**

**Grand total: 31 + 18 + 33 + 14 = 96** (all essays classified)

---

## 4. Pre-game / Prologue Essays

Essays unlocked at game start (before any turns):

| event_id | Justification |
|----------|---------------|
| `independence_referendum_1992` | No matching game event. Pre-war context essential for understanding. `unlock_condition: 'prologue'` |
| `bijeljina_massacre_1992` | No matching game event. War's opening act precedes player agency. `unlock_condition: 'prologue'` |

These are the only two essays whose `event_id` has no matching entry in `data/scenarios/events/`. They must be unconditionally available.

**Near-prologue essays** (fire turns 1-5, essentially guaranteed):

| event_id | Fires turn | Notes |
|----------|------------|-------|
| `rs_strategic_goals` | 1-3 | Fires as first decision event. Contains pre-game context but is mechanically tied to the RS goals decision. Keep as `event_fired`. |
| `rbih_state_identity` | 2-5 | Political identity, near-guaranteed. Keep as `event_fired`. |
| `hrhb_political_goal` | 3-7 | Political identity, near-guaranteed. Keep as `event_fired`. |
| `arms_embargo_impact_1992` | 3-6 | International policy context. Keep as `event_fired`. |

---

## 5. Essay Renderer

### 5.1 Rendering Pipeline

```
Input: essay (DynamicEssay), gameState (GameState)
Output: rendered paragraphs with source annotations

1. Split essay.content by '\n\n' → canonical_paragraphs[]
2. For each dynamic_section in essay.dynamic_sections:
   a. Evaluate condition against state.military.event_flags
   b. If true, resolve {placeholders} in content
   c. Mark for insertion after canonical_paragraphs[insert_after_paragraph]
3. Build final paragraph list:
   - Walk canonical_paragraphs in order
   - After each paragraph, insert any matching dynamic_sections (sorted by id for determinism)
   - Dynamic paragraphs tagged with variant for CSS treatment
4. Return { paragraphs: RenderedParagraph[], mode: 'historical' | 'your_war' }
```

```typescript
// src/codex/essay_renderer.ts

interface RenderedParagraph {
    text: string;
    type: 'canonical' | 'dynamic';
    variant?: 'divergence' | 'context' | 'outcome';
    divergence_note?: string;
}

interface RenderResult {
    paragraphs: RenderedParagraph[];
    has_dynamic_content: boolean;
    active_section_count: number;
}

export function renderEssay(
    essay: DynamicEssay,
    flags: Record<string, string | number | boolean>,
    mode: 'historical' | 'your_war'
): RenderResult;
```

### 5.2 Mode Toggle

- **"Historical"** mode: canonical paragraphs only. No dynamic inserts. Pure historical record. Default for Tier 1 essays.
- **"Your War"** mode: canonical + active dynamic sections interleaved. Default for Tier 3/4 essays when dynamic sections exist.

The toggle is per-essay, remembered in UI state (not persisted to save file).

### 5.3 Ghost Rendering

When an essay is Tier 2+ and its event has NOT fired:

1. Check `ghost_when` condition (if present). If `ghost_when` evaluates to true OR if the essay's unlock turn window has passed, show as ghost.
2. Ghost display: full canonical text visible but rendered in muted/desaturated style.
3. Header banner: *"In the historical war, this event occurred. In your war, it did not."*
4. No dynamic sections rendered for ghosts (no player-war context to show).

If `ghost_when` is absent and the event hasn't fired, the essay shows as "Locked" (current behavior — title only, no content).

**Ghost activation heuristic:** For Tier 2 essays, set `ghost_when` to activate after the event's `turn_max` has passed. This means: once the window for the event to fire has closed, the essay becomes a ghost rather than staying permanently locked.

---

## 6. Codex UI Design

### 6.1 Main Panel (modify existing `CodexPanel.tsx`)

Current layout preserved: modal overlay, sidebar + content split. Changes:

**Sidebar enhancements:**
- Essay cards get a third state: **unlocked** (bright), **ghost** (desaturated, italic title, spectral icon), **locked** (dim, title only)
- Tier badge: small pip (T1/T2/T3/T4) on each card for dev mode only
- Ghost count added to year header: "1993 — 12/42 unlocked, 3 ghosts"
- Dynamic indicator: small amber dot on cards that have active dynamic sections in "Your War" mode

**Content viewer enhancements:**
- Toggle switch top-right of content area: "Historical" | "Your War"
  - Only visible for essays with `dynamic_sections`
  - Defaults to "Your War" for Tier 3/4, "Historical" for Tier 1/2
- Dynamic paragraphs rendered with distinct treatment:
  - Left amber border (2px)
  - Slightly different paper tint (warmer)
  - Variant label above paragraph:
    - `divergence`: "YOUR WAR" label + `divergence_note` in italics
    - `context`: "ADDITIONAL CONTEXT" label
    - `outcome`: "OUTCOME" label
- Ghost essays: entire content area gets CSS `opacity: 0.55`, sepia filter, banner at top

### 6.2 Visual Treatment Specs

```css
/* Dynamic paragraph insert */
.dynamic-paragraph {
    border-left: 2px solid #d4a026;
    padding-left: 12px;
    margin-left: -14px;
    background: rgba(212, 160, 38, 0.04);
}

/* Ghost essay overlay */
.ghost-essay {
    filter: sepia(0.3) brightness(0.85);
    position: relative;
}
.ghost-essay::before {
    content: "This event occurred in the historical war but not in yours.";
    display: block;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.06);
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    font-style: italic;
    font-size: 9px;
    color: #666;
}
```

### 6.3 Keyboard / Navigation

- Existing: `Escape` closes panel
- New: `H` toggles Historical/Your War mode
- New: `G` toggle ghost visibility (show/hide ghost essays in sidebar)
- New: arrow keys navigate sidebar list

---

## 7. Migration Strategy

### 7.1 Backward Compatibility

All new fields are **optional** with sensible defaults:

| Field | Default if absent |
|-------|-------------------|
| `unlock_condition` | `'event_fired'` |
| `unlock_event_id` | Falls back to `event_id` |
| `unlock_turn` | `undefined` (not used) |
| `tier` | `1` |
| `dynamic_sections` | `[]` (no dynamic content) |
| `ghost_when` | `undefined` (locked, not ghost) |

This means the existing `essay_index.json` works unchanged. The CodexPanel applies defaults at load time.

### 7.2 Migration Phases

**Phase 1 — Schema extension (no content changes):**
Add `tier` and `unlock_condition` to all 96 essays. Automated script reads the tier classification above and patches `essay_index.json`. No `dynamic_sections` yet.

**Phase 2 — Ghost activation:**
Add `ghost_when` to Tier 2 essays. Simple turn-based expressions: e.g., `"turn_past:52"` for `jajce_falls_1992` (turn_max=52).

**Phase 3 — Dynamic sections for Tier 3:**
Author 2-3 dynamic sections per Tier 3 essay. This is the bulk of the content work (~66-99 sections across 33 essays). Each section needs a condition expression tied to existing event flags.

**Phase 4 — Tier 4 templates:**
Author dynamic sections for Tier 4 essays. These are more divergent — may have 4-5 sections each with different condition branches.

### 7.3 Flag Dependency Mapping

Dynamic sections depend on `event_flags`. Current flag-setting events must be audited:
- Which events currently set flags via `sets_flags`?
- Which `EventResponseOption` entries set flags via `sets_flags`?
- What new flags need to be added to events to support dynamic sections?

This audit is a prerequisite for Phase 3. The flag vocabulary must be documented.

---

## 8. Files to Create / Modify

### New Files

| File | Purpose |
|------|---------|
| `src/codex/essay_types.ts` | `DynamicEssay`, `DynamicSection`, `RenderedParagraph`, `RenderResult` type definitions |
| `src/codex/essay_renderer.ts` | `renderEssay()` — merges canonical + dynamic content |
| `src/codex/condition_expression.ts` | `evaluateExpression()` — flag expression evaluator |
| `src/codex/essay_renderer.test.ts` | Unit tests for renderer + expression evaluator |
| `tools/migrate_essays_tier.cjs` | One-shot script to add `tier`/`unlock_condition` to all 96 essays |

### Modified Files

| File | Change |
|------|--------|
| `data/scenarios/essays/essay_index.json` | Add new fields to each essay object (phased) |
| `src/ui/map/components/CodexPanel.tsx` | Ghost state, dynamic paragraph rendering, mode toggle, keyboard shortcuts |
| `src/ui/map/store/gameStore.ts` | Expose `event_flags` from game state for condition evaluation |
| `src/ui/map/data/GameStateAdapter.ts` | Add `eventFlags` derivation alongside existing `firedEvents` |

### Files NOT Modified

| File | Reason |
|------|--------|
| `src/sim/events/event_types.ts` | Already has `sets_flags`, `event_flags`, `flag_equals` — no changes needed |
| `src/sim/events/evaluate_events.ts` | Flag setting already implemented |
| `src/state/game_state.ts` | `event_flags` field already exists on `MilitaryState` |
| `data/scenarios/events/*.json` | Event definitions unchanged (may need flag additions in Phase 3, but that is content work, not schema) |

---

## 9. Implementation Order

```
Phase 1: Schema + Types + Defaults        [1 session]
  - Create src/codex/essay_types.ts
  - Create src/codex/condition_expression.ts + tests
  - Create src/codex/essay_renderer.ts + tests
  - Run migration script to add tier/unlock_condition to essay_index.json
  - Smoke test: tsc + vitest + desktop:map:build

Phase 2: CodexPanel Ghost + Mode Toggle   [1 session]
  - Wire GameStateAdapter.eventFlags
  - Add ghost rendering to CodexPanel
  - Add Historical/Your War toggle
  - Add keyboard shortcuts
  - Smoke test triad

Phase 3: Dynamic Content Authoring        [2-3 sessions]
  - Audit event flag vocabulary
  - Author dynamic_sections for Tier 3 essays (33 essays)
  - Author dynamic_sections for Tier 4 essays (14 essays)
  - QA pass: verify all conditions are reachable

Phase 4: Polish + Integration Tests       [1 session]
  - End-to-end test: run 52w scenario, verify correct essays unlock
  - Verify ghost transitions (event window passes → ghost activates)
  - Verify dynamic sections render correctly for divergent playthroughs
  - Performance: ensure Codex open/close is instant (no heavy recomputation)
```

---

## 10. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Flag vocabulary is too sparse — not enough flags set by current events to drive dynamic sections | Audit first (Phase 3 prerequisite). Add flags to events as needed — backward compatible since `sets_flags` is already supported. |
| Dynamic content authoring is labor-intensive (47 essays x 2-3 sections) | Start with highest-impact Tier 3 essays (Srebrenica, Corridor, Siege of Sarajevo). Tier 4 can ship with fewer sections. |
| Condition expression evaluator becomes a maintenance burden | Keep it deliberately simple — no arithmetic, no comparisons, just boolean flag algebra. Complex conditions belong in the event system, not the essay system. |
| Ghost essays spoil the historical narrative for players who want to discover it | Ghost visibility toggle (G key). Default: ghosts hidden until the player explicitly requests them. |
| Performance with 96 essays x N dynamic sections evaluated every frame | Evaluate only on essay selection (not per-frame). Memoize with `useMemo` keyed on `event_flags` reference. |

---

## 11. Example: Tier 3 Essay with Dynamic Sections

```json
{
    "id": "essay_operation_corridor_1992",
    "event_id": "operation_corridor_1992",
    "title": "Operation Corridor: The Lifeline Through the Posavina",
    "year": 1992,
    "category": "military",
    "tier": 3,
    "unlock_condition": "event_fired",
    "sources": ["ICTY Brdanin IT-99-36 para. 219-224", "BB Vol 2 Ch 7"],
    "generated": true,
    "content": "In June 1992, the VRS launched Operation Corridor to open...[canonical text unchanged]",
    "dynamic_sections": [
        {
            "id": "corridor_outcome_success",
            "insert_after_paragraph": 4,
            "condition": "corridor_secured",
            "content": "In your war, the corridor was secured as it was historically. VRS forces linked Krajina to the eastern territories, establishing the supply line that would sustain RS operations for the remainder of the conflict.",
            "variant": "outcome"
        },
        {
            "id": "corridor_outcome_failure",
            "insert_after_paragraph": 4,
            "condition": "NOT corridor_secured",
            "content": "In your war, the corridor was never fully secured. Without this lifeline, the Krajina Serbs faced isolation from Belgrade, fundamentally altering the strategic balance in northwestern Bosnia.",
            "variant": "divergence",
            "divergence_note": "Historically, the corridor was opened by mid-June 1992. Your war diverged."
        },
        {
            "id": "corridor_heavy_casualties",
            "insert_after_paragraph": 5,
            "condition": "corridor_secured AND corridor_high_casualties",
            "content": "The cost of opening the corridor proved heavier than expected. VRS forces suffered significant attrition, weakening the units that would later be needed for operations elsewhere along the Posavina front.",
            "variant": "context"
        }
    ]
}
```

---

## 12. Example: Tier 2 Essay with Ghost

```json
{
    "id": "essay_ahmici_massacre_1993",
    "event_id": "ahmici_massacre_1993",
    "title": "The Ahmici Massacre: The Day a Village Died",
    "year": 1993,
    "category": "humanitarian",
    "tier": 2,
    "unlock_condition": "event_fired",
    "ghost_when": "turn_past:70",
    "sources": ["ICTY Blaskic IT-95-14 Judgment", "ICTY Kordic IT-95-14/2"],
    "generated": true,
    "content": "On 16 April 1993, HVO forces attacked the village of Ahmici...[canonical text]"
}
```

If the Croat-Bosniak war never begins (alliance never drops below threshold), the Ahmici event never fires. After turn 70, the essay becomes a ghost: visible, readable, but marked as belonging to the historical war only.

---

## 13. Done Gate

- [ ] `DynamicEssay` type defined and exported
- [ ] `evaluateExpression()` implemented with 20+ unit tests
- [ ] `renderEssay()` implemented with tests for all modes (historical, your_war, ghost)
- [ ] All 96 essays classified with `tier` and `unlock_condition`
- [ ] CodexPanel renders ghosts, dynamic inserts, and mode toggle
- [ ] At least 10 Tier 3 essays have authored dynamic_sections
- [ ] Smoke test triad passes: `tsc --noEmit` + `vitest run` + `desktop:map:build`
- [ ] No changes to canonical essay content
- [ ] No changes to event system core
- [ ] Ledger entry appended
