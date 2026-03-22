# Integration Audit Findings — 2026-03-22

> Results of 4 parallel research agents examining cross-cutting concerns across the roadmap.

---

## 1. Version Tracking Drift

**Severity:** Low (housekeeping)
**Action:** Task 4 in v0.6.0 gate plan

- VERSIONING.md claims v0.3.1. Reality: v0.5.4 (package.json, git tags, ledger all agree)
- Status table contradicts ledger on 4 items (events, scenarios, diplomacy, test counts)
- v0.6.0 code merged to main but no tag/bump yet (correct — awaiting gate sign-off)
- Fix: update VERSIONING.md milestone tracking. 10-minute task.

---

## 2. AI Commander + Event System Integration

**Severity:** Medium (v0.6.2 scope)
**Design needed:** Yes (prompt builder changes)

### Current State
- 14 files in `src/sim/ai_commander/`, mostly complete
- Formula bot reads event constraints + aggression mods correctly
- Claude prompts are **blind** to event state:
  - Only `fired_event_ids` (bare IDs, no context) in army prompt
  - Active constraints: not serialized
  - Aggression modifiers: not serialized
  - Pending decisions: not exposed
  - Doctrine overrides: `getActiveDoctrineOverride()` exists but called nowhere

### 3-Phase Integration Plan
| Phase | Scope | Effort | Impact |
|-------|-------|--------|--------|
| **A: Prompt Awareness** | Add event titles, constraints, aggression mods to `buildArmyPrompt()` and `buildCorpsPrompt()` | 2 hrs | Claude understands context |
| **B: Event Decisions** | `generateEventDecision()` — Claude responds to events instead of `pickBotResponseV1()` | 4 hrs | Claude makes event decisions in character |
| **C: Constraint Validation** | Post-generation validation, fallback to formula if Claude violates constraints | 3 hrs | Zero invalid decisions |

### Key Files
- `src/sim/ai_commander/prompt_builder.ts:143-149` — where event IDs are currently serialized
- `src/sim/events/event_constraints.ts:24-82` — constraint bus functions
- `src/sim/combat/bot_corps_directives.ts:71-77` — event aggression bonus reading
- `src/sim/events/bot_response.ts:12-53` — current bot decision logic

### Tests Needed
- Prompt includes event context when events active
- Constraint validation rejects illegal AI decisions
- Fallback to formula bot when Claude violates

---

## 3. Dayton Synthesis — Dual Dimension Crisis

**Severity:** High (architectural confusion)
**Design needed:** Yes (requires brainstorm before implementation)

### The Problem: Two Parallel Systems

| System | Dimensions | Computed? | Used? | Where |
|--------|-----------|-----------|-------|-------|
| **NegotiationCapital** (old) | 5: military_position, humanitarian_standing, international_credibility, military_effectiveness, political_cohesion | ✅ Per-turn | ✅ Dayton budget | `compute_capital.ts` |
| **StrategicDimensions** (new) | 6: military_credibility, territorial_legitimacy, international_standing, patron_confidence, internal_cohesion, negotiating_leverage | ❌ Initialized at 50, never updated | ❌ Display only | `strategic_dimensions.ts` |

### What's Missing for "dimensions → capital budget"
1. **No connection** between StrategicDimensions and Dayton capital budget
2. **Package costs are static** — hardcoded in `territorial_packages.ts` and `institutional_packages.ts`, no modifier from dimensions
3. **Event flags not read by Dayton** — `sets_flags` exists but no flag→cost logic
4. **Territory split is OSID-count not area-weighted** — should use `osid_areas.json`
5. **Verdict scoring ignores StrategicDimensions** — grades based only on old NegotiationCapital

### Design Decision Needed
**Option A: Merge** — StrategicDimensions replaces NegotiationCapital. The 6 dimensions drive the capital budget directly. Old 5-field computation folded into base_value updates.
- Pro: Single source of truth. Events shift dimensions → dimensions drive Dayton.
- Con: Requires rewriting compute_capital.ts mapping.

**Option B: Layer** — StrategicDimensions are a metagame overlay. NegotiationCapital remains the Dayton budget source. Dimensions modify package costs as multipliers.
- Pro: Less risk, existing Dayton code unchanged.
- Con: Two systems to maintain, confusing for players.

**Recommendation:** Option A. The whole v0.6.x vision is "political wargame" — one unified dimension system that events feed and Dayton reads.

### Key Files
- `src/sim/negotiation/compute_capital.ts` (344 lines) — old per-turn computation
- `src/sim/events/strategic_dimensions.ts` (52 lines) — new 6-dim store
- `src/sim/negotiation/dayton_negotiation.ts` (397 lines) — orchestrator
- `src/sim/negotiation/territorial_packages.ts` (146 lines) — static costs
- `src/state/negotiation_types.ts` (297 lines) — all types

---

## 4. v0.6.0 Merge Gate — Remaining Items

**Severity:** Critical (blocks version tag)
**Plan written:** `docs/plans/2026-03-22-v060-gate-completion-plan.md`

| Item | Status | Effort |
|------|--------|--------|
| Event Decision IPC wiring | ❌ NOT DONE | 1 hr |
| Pressure indicators | ❌ STUB (hardcoded false) | 30 min |
| Consequence event notification | ❌ NOT DONE | 30 min |
| VERSIONING.md fix | ❌ STALE | 10 min |
| Pending decisions in briefing | ❌ NOT DONE | 20 min |

### Event Decision IPC Gap Detail
- `EventDecisionModal.tsx` renders with `onRespond(eventId, responseId)` callback
- No `respondToEventDecision` in `useIPC.ts`
- No Electron handler in `electron-main.cjs`
- Player can see decisions but clicking does nothing
- **This is the single biggest blocker** — the metagame loop is broken without it

### Pressure Indicator Gap Detail
- `PresidentialToolbar` accepts `pressureWarning: boolean` prop
- App.tsx passes hardcoded `false`
- No derivation from `state.military.event_readiness`
- The "TENSIONS RISING" badge that was designed never fires

---

## 5. Warroom ↔ Events Transition

**Severity:** Low (v0.7+ scope, but design principle matters now)
**Action:** Keep event decision logic presentation-agnostic

### Current State
- Event decisions appear as map overlay modals (`EventDecisionModal.tsx`)
- Warroom is separate Vite app (vanilla TS + canvas), can't render React
- v0.7+ plan: warroom migrates to React, event decisions become "desk documents"

### Design Principle for v0.6.x
Event decision handling must be **logic-only** (which event, which options, which effects) with presentation as a separate concern. The current `EventDecisionModal.tsx` is already well-separated:
- Props: `eventId`, `title`, `description`, `options[]`, `onRespond()`
- No business logic in the component — pure display
- Transition to warroom in v0.7+: same data, different visual wrapper

**No action needed now.** Architecture is already correct.

---

## 6. Items Not Yet Scoped (Need Design Before Planning)

| Item | Version | Design Needed |
|------|---------|--------------|
| Dayton dimension→capital pipeline | v0.6.3 | **Full brainstorm** — merge vs layer decision, cost modifiers |
| Game Timeline component | v0.6.2 | Design notes exist, implementation plan needed |
| Operation Commander SITREP | v0.6.2 | Concept documented, implementation plan needed |
| AI Commander event awareness | v0.6.2 | Prompt builder changes (3-phase plan above) |
| Tutorial / onboarding | v0.8 | Not designed at all |
| Steam page / capsule art | v0.8 | External (user + Gemini) |
| Anthropic pitch video | After v0.6.3 | 2-min demo of Claude-as-Mladić |
