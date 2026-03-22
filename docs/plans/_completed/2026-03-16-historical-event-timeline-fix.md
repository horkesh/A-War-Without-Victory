# Historical Event Timeline Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all chronological errors in historical events, add causal dependency chaining (`requires_events`), and replace broken/anachronistic events with historically accurate ones.

**Architecture:** Extend `EventTrigger` with a `requires_events` field that gates event firing on prior events having already fired. Correct all 41 event turn numbers to match verified historical dates. Replace 3 structurally broken events. Add 5 missing events to fill causal gaps.

**Tech Stack:** TypeScript types, JSON event data, Vitest tests.

**Historical date methodology:** Turn 0 = April 6, 1992. Each turn = 1 week. Formula: `turn = Math.round((target_date - April_6_1992) / 7)`.

---

## Task 1: Extend EventTrigger with `requires_events`

**Files:**
- Modify: `src/sim/events/event_types.ts:10-17` (EventTrigger interface)
- Modify: `src/sim/events/event_types.ts:147-153` (triggerMatches function)
- Test: `tests/events_evaluate.test.ts`

**Step 1: Write the failing test**

Add to `tests/events_evaluate.test.ts`:

```typescript
it('skips event when requires_events prerequisite not met', () => {
    const state = createMinimalWarState();
    state.military.fired_event_ids = [];
    const events: EventDefinition[] = [
        {
            id: 'prerequisite_event',
            trigger: { turn_min: 5, turn_max: 5, phase: 'war' },
            effect: { kind: 'narrative', text: 'Prerequisite fires.' },
            once: true,
        },
        {
            id: 'dependent_event',
            trigger: { turn_min: 6, turn_max: 10, phase: 'war', requires_events: ['prerequisite_event'] },
            effect: { kind: 'narrative', text: 'Dependent fires.' },
            once: true,
        },
    ];
    // Turn 6: prerequisite has NOT fired yet → dependent should NOT fire
    const result = evaluateEvents(state, createDummyRng(), 6, events);
    expect(result.fired.map(f => f.id)).not.toContain('dependent_event');
});

it('fires event when requires_events prerequisite is met', () => {
    const state = createMinimalWarState();
    state.military.fired_event_ids = ['prerequisite_event'];
    const events: EventDefinition[] = [
        {
            id: 'dependent_event',
            trigger: { turn_min: 6, turn_max: 10, phase: 'war', requires_events: ['prerequisite_event'] },
            effect: { kind: 'narrative', text: 'Dependent fires.' },
            once: true,
        },
    ];
    const result = evaluateEvents(state, createDummyRng(), 6, events);
    expect(result.fired.map(f => f.id)).toContain('dependent_event');
});

it('requires ALL listed events in requires_events (not just one)', () => {
    const state = createMinimalWarState();
    state.military.fired_event_ids = ['event_a']; // Only one of two
    const events: EventDefinition[] = [
        {
            id: 'needs_both',
            trigger: { turn_min: 6, turn_max: 10, phase: 'war', requires_events: ['event_a', 'event_b'] },
            effect: { kind: 'narrative', text: 'Needs both.' },
            once: true,
        },
    ];
    const result = evaluateEvents(state, createDummyRng(), 6, events);
    expect(result.fired.map(f => f.id)).not.toContain('needs_both');
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/events_evaluate.test.ts`
Expected: FAIL — `requires_events` not recognized on EventTrigger type; `triggerMatches` ignores it.

**Step 3: Extend EventTrigger type**

In `src/sim/events/event_types.ts`, add `requires_events` to the interface:

```typescript
/** Trigger: when to consider firing (turn range + optional prerequisites). */
export interface EventTrigger {
    /** Inclusive. Omit for no lower bound. */
    turn_min?: number;
    /** Inclusive. Omit for no upper bound. */
    turn_max?: number;
    /** Require this phase. */
    phase?: 'war';
    /** All listed event IDs must have already fired (checked against fired_event_ids). */
    requires_events?: string[];
}
```

**Step 4: Update triggerMatches to evaluate requires_events**

In `src/sim/events/event_types.ts`, update the function:

```typescript
/** Check if trigger matches current state (deterministic). */
export function triggerMatches(def: EventDefinition, state: GameState, currentTurn: number): boolean {
    const t = def.trigger;
    if (t.turn_min != null && currentTurn < t.turn_min) return false;
    if (t.turn_max != null && currentTurn > t.turn_max) return false;
    if (t.phase != null && state.meta.phase !== t.phase) return false;
    if (t.requires_events != null && t.requires_events.length > 0) {
        const firedIds = state.military.fired_event_ids ?? [];
        if (!t.requires_events.every(id => firedIds.includes(id))) return false;
    }
    return true;
}
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/events_evaluate.test.ts`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/sim/events/event_types.ts tests/events_evaluate.test.ts
git commit -m "feat(events): add requires_events prerequisite chaining to EventTrigger"
```

---

## Task 2: Fix war_1992.json — correct dates, replace broken events

**Files:**
- Modify: `data/scenarios/events/war_1992.json`

**Historical corrections (all dates verified against primary sources):**

| Event ID | Old Turn | New Turn | Historical Date | Change |
|---|---|---|---|---|
| `arms_embargo_impact_1992` | 4 | 4 | May 1992 | ✓ No change |
| `jna_withdrawal_1992` | 5 | 5 | May 19, 1992 | ✓ No change |
| `sarajevo_siege_begins_1992` | 6 | 6 | May 1992 | ✓ No change |
| `un_convoys_begin_1992` | 8 | 8 | Jun/Jul 1992 | ✓ No change |
| `srebrenica_enclave_forms_1992` | 10 | 10 | Jun 1992 | ✓ No change |
| `mostar_siege_begins_1992` | 15 | **DELETED** | — | **REPLACED** by `mostar_liberation_1992` at turn 10 |
| `concentration_camps_revealed_1992` | 12 | **18** | Aug 5-6, 1992 | +6 weeks |
| `drina_valley_ethnic_cleansing_1992` | 13 | 13 | May-Jul 1992 | ✓ No change (ongoing) |
| `operation_corridor_1992` | 14 | **12** | Jun 24, 1992 | -2 weeks |
| `posavina_corridor_fighting_1992` | 16 | 16 | Jul-Aug 1992 | ✓ No change |
| `london_conference_1992` | 18 | **21** | Aug 26-29, 1992 | +3 weeks |
| `bihac_isolation_deepens_1992` | 20 | 20 | Late 1992 | ✓ No change |
| `hvo_arbih_tensions_rise_1992` | 24 | **29** | Oct 23, 1992 (Prozor) | +5 weeks |
| `jajce_falls_1992` | 28 | **30** | Oct 29, 1992 | +2 weeks |
| `first_un_safe_areas_1992` | 30 | **DELETED** | — | **MOVED** to 1993 file as `un_safe_areas_declared_1993` (UNSCR 819, Apr 16, 1993) |

**New events:**

| Event ID | Turn | Historical Date | Replaces |
|---|---|---|---|
| `mostar_liberation_1992` | 10 | Jun 12, 1992 | `mostar_siege_begins_1992` |

**Step 1: Write corrected war_1992.json**

Replace the entire file with the corrected version. Key changes:
1. DELETE `mostar_siege_begins_1992` — anachronistic (HVO siege was May 1993, not Jul 1992)
2. ADD `mostar_liberation_1992` at turn 10 — HVO + ARBiH jointly liberate Mostar from JNA; city begins to divide along ethnic lines
3. DELETE `first_un_safe_areas_1992` — UNSCR safe area resolutions were April-May 1993
4. Correct all turn numbers per table above
5. Fix narrative for `hvo_arbih_tensions_rise_1992` — specify Prozor as location (first major clash)
6. Fix `jajce_falls_1992` at turn 30

**New `mostar_liberation_1992` event (replaces the broken siege event):**

```json
{
    "id": "mostar_liberation_1992",
    "title": "HVO and ARBiH Jointly Liberate Mostar",
    "narrative": "In a rare display of cooperation, HVO and ARBiH forces jointly drive the JNA from Mostar after weeks of fierce fighting. The city is liberated but not unified — the HVO quickly asserts control over the western bank while the ARBiH consolidates in the east. The seeds of a future division are planted even in the moment of shared victory.",
    "category": "military",
    "trigger": { "turn_min": 10, "turn_max": 10, "phase": "war" },
    "once": true,
    "effect": { "kind": "morale_change", "faction": "RBiH", "delta": 3 },
    "effects": [
        { "kind": "morale_change", "faction": "HRHB", "delta": 5 },
        { "kind": "narrative", "text": "Mostar is liberated from the JNA. HVO and ARBiH celebrate together, but the HVO moves quickly to assert control over the western bank." }
    ]
}
```

**Updated `hvo_arbih_tensions_rise_1992` (corrected turn + narrative):**

```json
{
    "id": "hvo_arbih_tensions_rise_1992",
    "title": "HVO-ARBiH Clash at Prozor",
    "narrative": "The fragile alliance between the HVO and ARBiH fractures openly at Prozor in central Bosnia. HVO forces attack Bosniak civilians and ARBiH positions in a calculated bid to assert Croat control over the town. Further clashes erupt near Novi Travnik. The incidents mark the first serious military confrontation between the two nominal allies.",
    "category": "political",
    "trigger": { "turn_min": 29, "turn_max": 29, "phase": "war" },
    "once": true,
    "effect": { "kind": "alliance_change", "delta": -0.1 },
    "effects": [
        { "kind": "narrative", "text": "HVO and ARBiH forces clash at Prozor and Novi Travnik. The fragile alliance between Croats and Bosniaks shows deepening cracks." }
    ]
}
```

**Step 2: Run event loader to verify JSON parses**

Run: `npx vitest run tests/events_evaluate.test.ts`
Expected: PASS (existing tests should still pass; new events are valid JSON)

**Step 3: Commit**

```bash
git add data/scenarios/events/war_1992.json
git commit -m "fix(events): correct 1992 event chronology — Mostar, camps, London Conference, Jajce, Prozor"
```

---

## Task 3: Fix war_1993.json — correct dates, add missing events, add requires_events

**Files:**
- Modify: `data/scenarios/events/war_1993.json`

**Historical corrections:**

| Event ID | Old Turn | New Turn | Historical Date | Change |
|---|---|---|---|---|
| `vance_owen_plan_1993` | 40 | **39** | Jan 2, 1993 | -1 week |
| `srebrenica_shelling_1993` | 44 | **49** | Mar 11-12, 1993 (Morillon) | +5 weeks |
| `croat_bosniak_war_begins_1993` | 48 | **54** | Apr 16, 1993 | +6 weeks |
| `ahmici_massacre_1993` | 48 | **54** | Apr 16, 1993 | +6 weeks, ADD `requires_events` |
| `central_bosnia_fighting_1993` | 50 | **58** | May-Jun 1993 | +8 weeks, ADD `requires_events` |
| `operation_neretva_93_1993` | 52 | **75** | Sep 14, 1993 | +23 weeks, ADD `requires_events` |
| `owen_stoltenberg_plan_1993` | 58 | **70** | Aug 1993 | +12 weeks |
| `rbih_5th_corps_bihac_1993` | 65 | **DELETED** | — | **REPLACED** by `abdic_apwb_declared_1993` (Sep 27 = turn 77) |
| `markale_area_shelling_1993` | 68 | 68 | Ongoing 1993 | ✓ No change |
| `mostar_bridge_destroyed_1993` | 70 | **83** | Nov 9, 1993 | +13 weeks, ADD `requires_events` |

**New events:**

| Event ID | Turn | Historical Date | Purpose |
|---|---|---|---|
| `gornji_vakuf_clashes_1993` | 40 | Jan 11, 1993 | First major HVO-ARBiH clash; precursor to full war |
| `un_safe_areas_declared_1993` | 54 | Apr 16, 1993 (UNSCR 819) | Replaces premature `first_un_safe_areas_1992` |
| `east_mostar_siege_1993` | 57 | May 9, 1993 | The actual HVO siege; requires Croat-Bosniak war |
| `abdic_apwb_declared_1993` | 77 | Sep 27, 1993 | Replaces broken 5th Corps event; Abdic splits Bihac pocket |

**Dependency chains (requires_events):**

| Event | Requires |
|---|---|
| `ahmici_massacre_1993` | `["croat_bosniak_war_begins_1993"]` |
| `central_bosnia_fighting_1993` | `["croat_bosniak_war_begins_1993"]` |
| `east_mostar_siege_1993` | `["croat_bosniak_war_begins_1993"]` |
| `operation_neretva_93_1993` | `["croat_bosniak_war_begins_1993"]` |
| `mostar_bridge_destroyed_1993` | `["east_mostar_siege_1993"]` |

**Step 1: Write corrected war_1993.json**

**New `gornji_vakuf_clashes_1993`:**
```json
{
    "id": "gornji_vakuf_clashes_1993",
    "title": "HVO-ARBiH Fighting Erupts at Gornji Vakuf",
    "narrative": "Heavy fighting breaks out between HVO and ARBiH forces in Gornji Vakuf as the HVO attempts to establish control over the town in line with the proposed Vance-Owen provincial boundaries. The clashes — involving tanks, artillery, and infantry — mark a significant escalation beyond the sporadic incidents of late 1992.",
    "category": "military",
    "trigger": { "turn_min": 40, "turn_max": 40, "phase": "war" },
    "once": true,
    "effect": { "kind": "alliance_change", "delta": -0.15 },
    "effects": [
        { "kind": "narrative", "text": "HVO and ARBiH forces fight a pitched battle at Gornji Vakuf. The Vance-Owen provincial map becomes a pretext for Croat territorial grabs." }
    ]
}
```

**New `un_safe_areas_declared_1993` (replaces premature 1992 event):**
```json
{
    "id": "un_safe_areas_declared_1993",
    "title": "UN Declares Safe Areas",
    "narrative": "The UN Security Council passes Resolution 819, declaring Srebrenica a safe area, followed by Resolution 824 extending protection to Sarajevo, Tuzla, Zepa, Gorazde, and Bihac. The resolutions promise protection without committing adequate military force to deliver it — a fatal gap between mandate and means that will have catastrophic consequences.",
    "category": "diplomatic",
    "trigger": { "turn_min": 54, "turn_max": 54, "phase": "war" },
    "once": true,
    "effect": { "kind": "morale_change", "faction": "RBiH", "delta": 3 },
    "effects": [
        { "kind": "patron_pressure", "faction": "RS", "delta": 5 },
        { "kind": "narrative", "text": "Six UN safe areas are declared. The promise of protection raises hope among besieged populations, but no credible enforcement mechanism exists." }
    ]
}
```

**Updated `croat_bosniak_war_begins_1993` (turn 48→54):**
```json
{
    "id": "croat_bosniak_war_begins_1993",
    "title": "Croat-Bosniak War Erupts",
    "narrative": "Full-scale fighting erupts between the HVO and the ARBiH across central Bosnia and Herzegovina. Emboldened by the Vance-Owen provincial map and Croatian political pressure, HVO forces launch coordinated offensives to secure territories claimed for Herceg-Bosna. What began as sporadic clashes at Prozor and Gornji Vakuf escalates into systematic ethnic cleansing on both sides, opening a devastating second front for the Bosnian government.",
    "category": "military",
    "trigger": { "turn_min": 54, "turn_max": 54, "phase": "war" },
    "once": true,
    "effect": { "kind": "alliance_change", "delta": -0.5 },
    "effects": [
        { "kind": "morale_change", "faction": "HRHB", "delta": 5 },
        { "kind": "narrative", "text": "The Croat-Bosniak alliance collapses. HVO and ARBiH forces engage in open warfare across central Bosnia." }
    ]
}
```

**Updated `ahmici_massacre_1993` (turn 48→54, add requires_events):**
```json
{
    "id": "ahmici_massacre_1993",
    "title": "Ahmici Massacre",
    "narrative": "HVO forces, supported by the Jokers special police unit, launch a coordinated dawn attack on the Bosniak village of Ahmici in the Lasva Valley. Over 100 civilians are killed, including women and children, and the village is systematically burned. The massacre becomes one of the most documented war crimes of the conflict and a defining atrocity of the Croat-Bosniak war.",
    "category": "humanitarian",
    "trigger": { "turn_min": 54, "turn_max": 54, "phase": "war", "requires_events": ["croat_bosniak_war_begins_1993"] },
    "once": true,
    "effect": { "kind": "humanitarian_impact", "faction": "HRHB", "war_crimes_delta": 3 },
    "effects": [
        { "kind": "negotiation_capital", "faction": "HRHB", "dimension": "international_credibility", "delta": -25 },
        { "kind": "narrative", "text": "The Ahmici massacre shocks the international community. HVO credibility suffers a devastating blow." }
    ]
}
```

**New `east_mostar_siege_1993` (the actual HVO siege):**
```json
{
    "id": "east_mostar_siege_1993",
    "title": "HVO Besieges East Mostar",
    "narrative": "HVO forces impose a complete blockade on the eastern bank of Mostar, cutting off the Bosniak population from food, water, and medical supplies. Systematic shelling targets the densely populated old town. An estimated 55,000 Bosniaks are trapped in increasingly desperate conditions as the HVO seeks to drive them from the city entirely.",
    "category": "military",
    "trigger": { "turn_min": 57, "turn_max": 57, "phase": "war", "requires_events": ["croat_bosniak_war_begins_1993"] },
    "once": true,
    "effect": { "kind": "humanitarian_impact", "faction": "HRHB", "war_crimes_delta": 2 },
    "effects": [
        { "kind": "supply_delta", "faction": "HRHB", "delta": -5 },
        { "kind": "patron_pressure", "faction": "HRHB", "delta": 5 },
        { "kind": "narrative", "text": "East Mostar is besieged. 55,000 Bosniaks are trapped as HVO forces impose a total blockade on the eastern bank." }
    ]
}
```

**Updated `central_bosnia_fighting_1993` (turn 50→58, add requires_events):**
```json
{
    "id": "central_bosnia_fighting_1993",
    "title": "Central Bosnia Engulfed in Three-Way War",
    "narrative": "Central Bosnia becomes a patchwork of overlapping front lines as VRS, HVO, and ARBiH forces fight simultaneously. Towns like Travnik, Vitez, and Busovaca change hands or are divided street by street. The three-way nature of the conflict creates impossible tactical situations and widespread civilian suffering.",
    "category": "military",
    "trigger": { "turn_min": 58, "turn_max": 58, "phase": "war", "requires_events": ["croat_bosniak_war_begins_1993"] },
    "once": true,
    "effect": { "kind": "narrative", "text": "Three-way fighting engulfs central Bosnia. The overlapping front lines create a humanitarian catastrophe." },
    "effects": [
        { "kind": "morale_change", "faction": "RBiH", "delta": -3 }
    ]
}
```

**Updated `owen_stoltenberg_plan_1993` (turn 58→70):**
```json
{
    "id": "owen_stoltenberg_plan_1993",
    "title": "Owen-Stoltenberg Plan Proposed",
    "narrative": "International mediators David Owen and Thorvald Stoltenberg present a new peace plan proposing a loose union of three ethnic republics. The plan effectively legitimizes ethnic partition and is seen by the Bosnian government as rewarding aggression. Negotiations continue through the autumn amid ongoing fighting on all fronts.",
    "category": "diplomatic",
    "trigger": { "turn_min": 70, "turn_max": 70, "phase": "war" },
    "once": true,
    "requires_player_response": true,
    "bot_response_logic": "capital_based",
    "effect": { "kind": "narrative", "text": "The Owen-Stoltenberg Plan proposes a tripartite union of ethnic republics. Each faction must weigh the costs of acceptance or rejection." },
    "response_options": [
        {
            "id": "accept",
            "label": "Accept the Owen-Stoltenberg Framework",
            "description": "Accepting brings international relief but concedes the principle of a unified Bosnia.",
            "effects": [
                { "kind": "negotiation_capital", "faction": "RBiH", "dimension": "international_credibility", "delta": 5 },
                { "kind": "patron_pressure", "faction": "RBiH", "delta": -5 }
            ]
        },
        {
            "id": "reject",
            "label": "Reject Ethnic Partition",
            "description": "Rejection defends sovereignty but prolongs the war and frustrates mediators.",
            "effects": [
                { "kind": "negotiation_capital", "faction": "RBiH", "dimension": "international_credibility", "delta": -5 },
                { "kind": "morale_change", "faction": "RBiH", "delta": 2 }
            ]
        }
    ]
}
```

**Updated `operation_neretva_93_1993` (turn 52→75, add requires_events):**
```json
{
    "id": "operation_neretva_93_1993",
    "title": "Operation Neretva '93",
    "narrative": "The ARBiH launches Operation Neretva '93 against HVO positions in Herzegovina and the Neretva Valley. The offensive aims to break the HVO siege of East Mostar and secure a corridor to the coast. Fierce fighting erupts around Jablanica and along the Neretva River as the ARBiH attempts to exploit its growing numerical advantage.",
    "category": "military",
    "trigger": { "turn_min": 75, "turn_max": 75, "phase": "war", "requires_events": ["croat_bosniak_war_begins_1993"] },
    "once": true,
    "effect": { "kind": "narrative", "text": "The ARBiH launches Operation Neretva '93, striking at HVO positions in the Neretva Valley and around Mostar." },
    "effects": [
        { "kind": "morale_change", "faction": "RBiH", "delta": 3 }
    ]
}
```

**New `abdic_apwb_declared_1993` (replaces broken 5th Corps event):**
```json
{
    "id": "abdic_apwb_declared_1993",
    "title": "Fikret Abdic Declares Autonomous Province",
    "narrative": "Fikret Abdic, the powerful Bihac businessman who actually won more votes than Izetbegovic in the 1990 presidential election, declares the Autonomous Province of Western Bosnia centered on Velika Kladusa. His breakaway entity, backed by both the VRS and the Republic of Serbian Krajina, opens a new internal front that splits the Bihac pocket and diverts 5th Corps resources away from the external siege.",
    "category": "political",
    "trigger": { "turn_min": 77, "turn_max": 77, "phase": "war" },
    "once": true,
    "effect": { "kind": "morale_change", "faction": "RBiH", "delta": -5 },
    "effects": [
        { "kind": "narrative", "text": "Abdic declares the Autonomous Province of Western Bosnia. The Bihac pocket is now fighting a war within a war." }
    ]
}
```

**Updated `mostar_bridge_destroyed_1993` (turn 70→83, add requires_events):**
```json
{
    "id": "mostar_bridge_destroyed_1993",
    "title": "Stari Most Destroyed in Mostar",
    "narrative": "HVO forces destroy the iconic Stari Most, the 16th-century Ottoman bridge spanning the Neretva River in Mostar. The deliberate demolition of this UNESCO-recognized cultural monument becomes a global symbol of the war's cultural devastation. The act draws widespread international condemnation and deepens the stigma on the Bosnian Croat war effort.",
    "category": "humanitarian",
    "trigger": { "turn_min": 83, "turn_max": 83, "phase": "war", "requires_events": ["east_mostar_siege_1993"] },
    "once": true,
    "effect": { "kind": "humanitarian_impact", "faction": "HRHB", "war_crimes_delta": 1 },
    "effects": [
        { "kind": "negotiation_capital", "faction": "HRHB", "dimension": "international_credibility", "delta": -10 },
        { "kind": "narrative", "text": "The Stari Most is destroyed by HVO shelling. The loss of the iconic bridge becomes a symbol of cultural destruction." }
    ]
}
```

**Step 2: Run tests**

Run: `npx vitest run tests/events_evaluate.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add data/scenarios/events/war_1993.json
git commit -m "fix(events): correct 1993 chronology — Ahmici, Mostar siege, Op Neretva, Stari Most, add Gornji Vakuf/Abdic/safe areas"
```

---

## Task 4: Fix war_1994.json — correct dates, add requires_events

**Files:**
- Modify: `data/scenarios/events/war_1994.json`

**Historical corrections:**

| Event ID | Old Turn | New Turn | Historical Date | Change |
|---|---|---|---|---|
| `markale_massacre_1994` | 92 | **96** | Feb 5, 1994 | +4 weeks |
| `nato_ultimatum_sarajevo_1994` | 92 | **96** | Feb 9, 1994 | +4 weeks, ADD `requires_events` |
| `nato_shoots_down_planes_1994` | 94 | **99** | Feb 28, 1994 | +5 weeks, fix "four"→"five" aircraft |
| `washington_agreement_1994` | 96 | **102** | Mar 18, 1994 | +6 weeks, ADD `requires_events` |
| `anti_sniping_agreement_1994` | 98 | **123** | Aug 14, 1994 | +25 weeks |
| `gorazde_crisis_1994` | 100 | **105** | Apr 6-23, 1994 | +5 weeks |
| `contact_group_plan_1994` | 108 | **117** | Jul 5-6, 1994 | +9 weeks |
| `bihac_crisis_1994` | 130 | **135** | Nov 4-20, 1994 | +5 weeks |

**Dependency chains:**

| Event | Requires |
|---|---|
| `nato_ultimatum_sarajevo_1994` | `["markale_massacre_1994"]` |
| `washington_agreement_1994` | `["croat_bosniak_war_begins_1993"]` |

**Step 1: Write corrected war_1994.json**

Key changes beyond turn numbers:

**Fix `nato_shoots_down_planes_1994` narrative — five aircraft, not four:**
```json
{
    "id": "nato_shoots_down_planes_1994",
    "title": "NATO Shoots Down Serb Aircraft",
    "narrative": "NATO fighters shoot down five VRS J-21 Jastreb aircraft violating the no-fly zone over Bosnia near Banja Luka. The incident, NATO's first combat action in its history, signals a shift from passive observation to active enforcement. The VRS command begins to factor NATO air power into its operational calculations.",
    "category": "military",
    "trigger": { "turn_min": 99, "turn_max": 99, "phase": "war" },
    "once": true,
    "effect": { "kind": "patron_pressure", "faction": "RS", "delta": 5 },
    "effects": [
        { "kind": "morale_change", "faction": "RS", "delta": -3 },
        { "kind": "narrative", "text": "NATO shoots down five VRS aircraft. The alliance demonstrates its willingness to use force for the first time." }
    ]
}
```

**Fix `anti_sniping_agreement_1994` — moved from turn 98 to turn 123 (Aug 1994):**
```json
{
    "id": "anti_sniping_agreement_1994",
    "title": "Anti-Sniping Agreement in Sarajevo",
    "narrative": "An anti-sniping agreement is reached for Sarajevo, aiming to reduce the daily toll of civilians killed by snipers along the city's exposed boulevards and intersections. Compliance is sporadic, but the agreement represents a small step in civilian protection and provides UNPROFOR with additional monitoring authority.",
    "category": "diplomatic",
    "trigger": { "turn_min": 123, "turn_max": 123, "phase": "war" },
    "once": true,
    "effect": { "kind": "narrative", "text": "An anti-sniping agreement is signed for Sarajevo. Compliance is uneven but civilian casualties decrease temporarily." }
}
```

**Add requires_events to `nato_ultimatum_sarajevo_1994`:**
```json
{
    "id": "nato_ultimatum_sarajevo_1994",
    "title": "NATO Issues Ultimatum on Sarajevo",
    "narrative": "In the aftermath of Markale, NATO issues an ultimatum demanding the withdrawal of all VRS heavy weapons from a 20-kilometer exclusion zone around Sarajevo within ten days, or face air strikes. The ultimatum marks NATO's first credible threat of force and fundamentally changes the calculation for the VRS around the capital.",
    "category": "diplomatic",
    "trigger": { "turn_min": 96, "turn_max": 96, "phase": "war", "requires_events": ["markale_massacre_1994"] },
    "once": true,
    "effect": { "kind": "patron_pressure", "faction": "RS", "delta": 10 },
    "effects": [
        { "kind": "narrative", "text": "NATO demands VRS withdrawal of heavy weapons from around Sarajevo. The threat of air strikes becomes credible for the first time." }
    ]
}
```

**Add requires_events to `washington_agreement_1994`:**
Add `"requires_events": ["croat_bosniak_war_begins_1993"]` to its trigger.

**Step 2: Run tests**

Run: `npx vitest run tests/events_evaluate.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add data/scenarios/events/war_1994.json
git commit -m "fix(events): correct 1994 chronology — Markale, NATO, Washington, Gorazde, Contact Group, Bihac"
```

---

## Task 5: Fix war_1995.json — correct dates, add requires_events, fix ordering

**Files:**
- Modify: `data/scenarios/events/war_1995.json`

**Historical corrections:**

| Event ID | Old Turn | New Turn | Historical Date | Change |
|---|---|---|---|---|
| `srebrenica_falls_1995` | 168 | **170** | Jul 11, 1995 | +2 weeks |
| `zepa_falls_1995` | 170 | **172** | Jul 25, 1995 | +2 weeks, ADD `requires_events` |
| `operation_storm_1995` | 172 | **174** | Aug 4, 1995 | +2 weeks |
| `second_markale_massacre_1995` | 176 | **177** | Aug 28, 1995 | +1 week |
| `nato_deliberate_force_1995` | 177 | 177 | Aug 30, 1995 | ✓ No change |
| `federation_ground_offensive_1995` | 178 | **179** | Sep 1995 | +1 week, ADD `requires_events` |
| `dayton_talks_begin_1995` | 184 | **186** | Nov 1, 1995 | +2 weeks |
| `ceasefire_1995` | 186 | **183** | Oct 12, 1995 | **-3 weeks (ORDER REVERSED — ceasefire came BEFORE Dayton)** |

**Critical fix: Ceasefire and Dayton are REVERSED in the current file.**
- The ceasefire took effect October 12, 1995 (turn 183)
- Dayton talks began November 1, 1995 (turn 186)
- Current file has Dayton at 184 and ceasefire at 186 — backwards.

**Dependency chains:**

| Event | Requires |
|---|---|
| `zepa_falls_1995` | `["srebrenica_falls_1995"]` |
| `federation_ground_offensive_1995` | `["washington_agreement_1994", "nato_deliberate_force_1995"]` |

**Step 1: Write corrected war_1995.json**

Key changes beyond turn numbers:

1. Fix ceasefire/Dayton ordering (ceasefire turn 183, Dayton turn 186)
2. Add `requires_events` to zepa and federation offensive
3. Correct all turn numbers

**Step 2: Run tests**

Run: `npx vitest run tests/events_evaluate.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add data/scenarios/events/war_1995.json
git commit -m "fix(events): correct 1995 chronology — Srebrenica, Zepa, Storm, fix ceasefire/Dayton ordering"
```

---

## Task 6: Comprehensive event loading + integration test

**Files:**
- Create: `tests/event_timeline_integrity.test.ts`

**Step 1: Write integrity tests**

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

function loadEvents(filename: string) {
    const raw = readFileSync(join(__dirname, '..', 'data', 'scenarios', 'events', filename), 'utf-8');
    return JSON.parse(raw);
}

describe('Event timeline historical integrity', () => {
    const all1992 = loadEvents('war_1992.json');
    const all1993 = loadEvents('war_1993.json');
    const all1994 = loadEvents('war_1994.json');
    const all1995 = loadEvents('war_1995.json');
    const allEvents = [...all1992, ...all1993, ...all1994, ...all1995];

    it('no event IDs are duplicated across files', () => {
        const ids = allEvents.map((e: any) => e.id);
        const dupes = ids.filter((id: string, i: number) => ids.indexOf(id) !== i);
        expect(dupes).toEqual([]);
    });

    it('all once-only events have unique IDs', () => {
        const onceIds = allEvents.filter((e: any) => e.once).map((e: any) => e.id);
        expect(new Set(onceIds).size).toBe(onceIds.length);
    });

    it('events within each file are sorted by turn_min', () => {
        for (const [name, events] of [['1992', all1992], ['1993', all1993], ['1994', all1994], ['1995', all1995]] as const) {
            for (let i = 1; i < events.length; i++) {
                const prev = events[i - 1].trigger.turn_min ?? 0;
                const curr = events[i].trigger.turn_min ?? 0;
                expect(curr, `${name}: ${events[i].id} (turn ${curr}) should not precede ${events[i - 1].id} (turn ${prev})`).toBeGreaterThanOrEqual(prev);
            }
        }
    });

    // CAUSAL INTEGRITY: events must not fire before their prerequisites
    it('requires_events references point to events with earlier turn_min', () => {
        const turnMap = new Map(allEvents.map((e: any) => [e.id, e.trigger.turn_min ?? 0]));
        for (const event of allEvents) {
            const reqs = event.trigger?.requires_events;
            if (!reqs) continue;
            for (const reqId of reqs) {
                expect(turnMap.has(reqId), `${event.id} requires unknown event ${reqId}`).toBe(true);
                const reqTurn = turnMap.get(reqId)!;
                const eventTurn = event.trigger.turn_min ?? 0;
                expect(eventTurn, `${event.id} (turn ${eventTurn}) must fire after prerequisite ${reqId} (turn ${reqTurn})`).toBeGreaterThanOrEqual(reqTurn);
            }
        }
    });

    // CHRONOLOGICAL GUARDRAILS: prevent future regressions
    it('Croat-Bosniak war cannot start before Vance-Owen plan', () => {
        const vanceOwen = allEvents.find((e: any) => e.id === 'vance_owen_plan_1993');
        const cbWar = allEvents.find((e: any) => e.id === 'croat_bosniak_war_begins_1993');
        expect(cbWar.trigger.turn_min).toBeGreaterThan(vanceOwen.trigger.turn_min);
    });

    it('East Mostar siege requires Croat-Bosniak war', () => {
        const siege = allEvents.find((e: any) => e.id === 'east_mostar_siege_1993');
        expect(siege.trigger.requires_events).toContain('croat_bosniak_war_begins_1993');
    });

    it('Stari Most destruction requires East Mostar siege', () => {
        const bridge = allEvents.find((e: any) => e.id === 'mostar_bridge_destroyed_1993');
        expect(bridge.trigger.requires_events).toContain('east_mostar_siege_1993');
    });

    it('Zepa requires Srebrenica', () => {
        const zepa = allEvents.find((e: any) => e.id === 'zepa_falls_1995');
        expect(zepa.trigger.requires_events).toContain('srebrenica_falls_1995');
    });

    it('ceasefire fires before Dayton talks', () => {
        const ceasefire = allEvents.find((e: any) => e.id === 'ceasefire_1995');
        const dayton = allEvents.find((e: any) => e.id === 'dayton_talks_begin_1995');
        expect(ceasefire.trigger.turn_min).toBeLessThan(dayton.trigger.turn_min);
    });

    it('Washington Agreement requires Croat-Bosniak war', () => {
        const wa = allEvents.find((e: any) => e.id === 'washington_agreement_1994');
        expect(wa.trigger.requires_events).toContain('croat_bosniak_war_begins_1993');
    });

    it('NATO ultimatum requires Markale massacre', () => {
        const ult = allEvents.find((e: any) => e.id === 'nato_ultimatum_sarajevo_1994');
        expect(ult.trigger.requires_events).toContain('markale_massacre_1994');
    });

    it('Federation ground offensive requires both Washington and Deliberate Force', () => {
        const fgo = allEvents.find((e: any) => e.id === 'federation_ground_offensive_1995');
        expect(fgo.trigger.requires_events).toContain('washington_agreement_1994');
        expect(fgo.trigger.requires_events).toContain('nato_deliberate_force_1995');
    });

    it('no anachronistic Mostar siege event exists in 1992 file', () => {
        expect(all1992.find((e: any) => e.id === 'mostar_siege_begins_1992')).toBeUndefined();
    });

    it('no premature UN safe areas event exists in 1992 file', () => {
        expect(all1992.find((e: any) => e.id === 'first_un_safe_areas_1992')).toBeUndefined();
    });

    it('Mostar liberation event exists in 1992', () => {
        expect(all1992.find((e: any) => e.id === 'mostar_liberation_1992')).toBeDefined();
    });

    it('all events have required fields', () => {
        for (const event of allEvents) {
            expect(event.id, 'event missing id').toBeTruthy();
            expect(event.trigger, `${event.id} missing trigger`).toBeTruthy();
            expect(event.effect, `${event.id} missing effect`).toBeTruthy();
            expect(event.once, `${event.id} should be once-only`).toBe(true);
        }
    });
});
```

**Step 2: Run tests**

Run: `npx vitest run tests/event_timeline_integrity.test.ts`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add tests/event_timeline_integrity.test.ts
git commit -m "test(events): add timeline integrity tests — causal ordering, chronology guardrails"
```

---

## Task 7: Run full test suite to verify no regressions

**Step 1: Run all event tests**

Run: `npx vitest run tests/events_evaluate.test.ts tests/event_decisions.test.ts tests/event_effects.test.ts tests/event_timeline_integrity.test.ts`
Expected: ALL PASS

**Step 2: Run full vitest suite**

Run: `npm run test:vitest`
Expected: 932+ tests pass, no regressions

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No new errors (the `requires_events` field is optional so all existing code compiles)

**Step 4: Commit if any fixes needed**

---

## Complete Event Manifest (post-fix)

### war_1992.json (14 events, was 16)

| # | Turn | ID | Category | New? |
|---|---|---|---|---|
| 1 | 4 | `arms_embargo_impact_1992` | military | |
| 2 | 5 | `jna_withdrawal_1992` | military | |
| 3 | 6 | `sarajevo_siege_begins_1992` | military | |
| 4 | 8 | `un_convoys_begin_1992` | diplomatic | |
| 5 | 10 | `srebrenica_enclave_forms_1992` | military | |
| 6 | 10 | `mostar_liberation_1992` | military | **NEW** |
| 7 | 12 | `operation_corridor_1992` | military | turn 14→12 |
| 8 | 13 | `drina_valley_ethnic_cleansing_1992` | humanitarian | |
| 9 | 16 | `posavina_corridor_fighting_1992` | military | |
| 10 | 18 | `concentration_camps_revealed_1992` | humanitarian | turn 12→18 |
| 11 | 20 | `bihac_isolation_deepens_1992` | military | |
| 12 | 21 | `london_conference_1992` | diplomatic | turn 18→21 |
| 13 | 29 | `hvo_arbih_tensions_rise_1992` | political | turn 24→29 |
| 14 | 30 | `jajce_falls_1992` | territorial | turn 28→30 |

**Deleted:** `mostar_siege_begins_1992` (anachronistic), `first_un_safe_areas_1992` (premature)

### war_1993.json (14 events, was 12)

| # | Turn | ID | Category | Requires | New? |
|---|---|---|---|---|---|
| 1 | 39 | `vance_owen_plan_1993` | diplomatic | | turn 40→39 |
| 2 | 40 | `gornji_vakuf_clashes_1993` | military | | **NEW** |
| 3 | 49 | `srebrenica_shelling_1993` | humanitarian | | turn 44→49 |
| 4 | 54 | `croat_bosniak_war_begins_1993` | military | | turn 48→54 |
| 5 | 54 | `ahmici_massacre_1993` | humanitarian | `croat_bosniak_war_begins_1993` | turn 48→54 |
| 6 | 54 | `un_safe_areas_declared_1993` | diplomatic | | **NEW** (from 1992) |
| 7 | 57 | `east_mostar_siege_1993` | military | `croat_bosniak_war_begins_1993` | **NEW** |
| 8 | 58 | `central_bosnia_fighting_1993` | military | `croat_bosniak_war_begins_1993` | turn 50→58 |
| 9 | 68 | `markale_area_shelling_1993` | humanitarian | | |
| 10 | 70 | `owen_stoltenberg_plan_1993` | diplomatic | | turn 58→70 |
| 11 | 75 | `operation_neretva_93_1993` | military | `croat_bosniak_war_begins_1993` | turn 52→75 |
| 12 | 77 | `abdic_apwb_declared_1993` | political | | **NEW** |
| 13 | 83 | `mostar_bridge_destroyed_1993` | humanitarian | `east_mostar_siege_1993` | turn 70→83 |

**Deleted:** `rbih_5th_corps_bihac_1993` (wrong year, replaced by `abdic_apwb_declared_1993`)

### war_1994.json (8 events, unchanged count)

| # | Turn | ID | Category | Requires |
|---|---|---|---|---|
| 1 | 96 | `markale_massacre_1994` | humanitarian | | turn 92→96 |
| 2 | 96 | `nato_ultimatum_sarajevo_1994` | diplomatic | `markale_massacre_1994` | turn 92→96 |
| 3 | 99 | `nato_shoots_down_planes_1994` | military | | turn 94→99; "four"→"five" aircraft |
| 4 | 102 | `washington_agreement_1994` | diplomatic | `croat_bosniak_war_begins_1993` | turn 96→102 |
| 5 | 105 | `gorazde_crisis_1994` | military | | turn 100→105 |
| 6 | 117 | `contact_group_plan_1994` | diplomatic | | turn 108→117 |
| 7 | 123 | `anti_sniping_agreement_1994` | diplomatic | | turn 98→123 |
| 8 | 135 | `bihac_crisis_1994` | military | | turn 130→135 |

### war_1995.json (8 events, unchanged count)

| # | Turn | ID | Category | Requires |
|---|---|---|---|---|
| 1 | 170 | `srebrenica_falls_1995` | humanitarian | | turn 168→170 |
| 2 | 172 | `zepa_falls_1995` | territorial | `srebrenica_falls_1995` | turn 170→172 |
| 3 | 174 | `operation_storm_1995` | military | | turn 172→174 |
| 4 | 177 | `second_markale_massacre_1995` | humanitarian | | turn 176→177 |
| 5 | 177 | `nato_deliberate_force_1995` | military | | ✓ |
| 6 | 179 | `federation_ground_offensive_1995` | military | `washington_agreement_1994`, `nato_deliberate_force_1995` | turn 178→179 |
| 7 | 183 | `ceasefire_1995` | diplomatic | | **turn 186→183 (ORDER FIX)** |
| 8 | 186 | `dayton_talks_begin_1995` | diplomatic | | **turn 184→186 (ORDER FIX)** |

---

## Design Notes for Future Work

### Events kept as fixed-turn despite being "emergent"

The following events describe military outcomes that the sim should theoretically produce organically. They are kept as fixed-turn events because:
1. The OOB and doctrine make them effectively predetermined in every run
2. They carry important narrative/diplomatic effects the sim doesn't model structurally
3. Converting to state-triggered events requires enclave/territorial detection logic that doesn't exist yet

| Event | Why Kept | Future Conversion |
|---|---|---|
| `operation_corridor_1992` | VRS always takes Brčko corridor | When supply flow is modeled through territorial connectivity |
| `jajce_falls_1992` | VRS always takes Jajce by ~w30 | When we can detect municipality control flip |
| `srebrenica_falls_1995` | The genocide is the scripted event, not just the fall | When enclave collapse triggers narrative |
| `zepa_falls_1995` | Same as above | Same as above |
| `operation_neretva_93_1993` | ARBiH always attacks here post-CB-war | When bot op reporting feeds events |
| `federation_ground_offensive_1995` | Always happens after Storm + Deliberate Force | When late-war territorial sweep is detectable |

### State-triggered event conditions (future enhancement)

When the sim matures, extend `EventTrigger` with:
```typescript
interface EventTrigger {
    // ... existing fields ...
    requires_faction_controls?: {
        faction: FactionId;
        municipality: string;
        min_fraction: number;  // e.g. 0.8 = 80% of municipality OSIDs
    };
    requires_alliance_below?: number;
    requires_enclave_status?: {
        enclave_id: string;
        status: 'fallen' | 'besieged' | 'active';
    };
}
```

This would allow events like "Jajce Falls" to fire when VRS actually controls Jajce, not at a fixed turn. **Not in scope for this plan.**
