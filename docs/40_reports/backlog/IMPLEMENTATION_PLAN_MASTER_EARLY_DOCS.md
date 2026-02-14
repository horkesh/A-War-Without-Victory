# Implementation Plan: Master Early Docs Analysis Recommendations

**Source:** [MASTER_EARLY_DOCS_ANALYSIS_REPORT.md](MASTER_EARLY_DOCS_ANALYSIS_REPORT.md) (February 9, 2026)  
**Scope:** Recommendations derived from comparing early project PDFs to canon (current canon: v0.5.0).  
**Relationship to roadmap:** All work below is **post-MVP** (Phase 7). MVP scope remains frozen per [EXECUTIVE_ROADMAP.md](../30_planning/EXECUTIVE_ROADMAP.md) Phase 6.

---

## 1. Plan summary

| Phase | Focus | Est. effort | Priority |
|-------|--------|-------------|----------|
| **Phase A** | Critical path to playable single-player (AI + victory + production) | 15–18 days | Before next major release |
| **Phase B** | Post-launch polish (events, campaign branching, negotiation, coercion) | 12–17 days | v1.5 |
| **Phase C** | Future (multiplayer, UI polish, cascade) | 18–26 days | v2.0+ |

**Critical finding from report:** Without an AI opponent system there is no single-player gameplay—only a simulation viewer. AI is the blocking item for a playable release.

---

## 2. Phase A — Critical path (15–18 days)

**Goal:** Playable single-player: AI opponents, clear victory, optional production depth.

### 2.1 AI opponent system (10–13 days) — CRITICAL

**Owner:** Gameplay programmer + Game designer (design); Systems programmer (integration).  
**Canon/spec:** New spec required; align with [Systems_Manual](../10_canon/Systems_Manual_v0_5_0.md), [Phase I/II specs](../10_canon/).  
**Report ref:** §2.2, §10.1(1), §11.1.

| # | Task | Deliverable | Est. |
|---|------|-------------|------|
| A1.1 | Document faction-specific AI strategies (VRS early/late, ARBiH, HVO) | AI_STRATEGY_SPECIFICATION.md (or section in Systems_Manual) | 2–3 d |
| A1.2 | Define historical benchmark targets (e.g. VRS 70% by Dec 1992) | Same doc + scenario assertions | (included) |
| A1.3 | Design decision trees for strategic/tactical choices | Design section + interface types | (included) |
| A1.4 | Implement strategic AI (objective selection, force allocation) | `src/ai/` strategy modules | 2–3 d |
| A1.5 | Implement tactical AI (brigade assignments, posture selection) | Same; hook into turn_pipeline / bot harness | 3–4 d |
| A1.6 | Difficulty scaling (e.g. historical accuracy = medium) | Presets (easy/medium/hard) | 1 d |
| A1.7 | Testing and tuning vs historical runs | Tests + tuning notes | 1–2 d |

**Acceptance criteria:** Single-player scenario runs with 1 human + 2 AI factions; AI makes non-trivial decisions; difficulty affects aggressiveness/benchmark adherence.

**Dependencies:** Existing bot harness and scenario runner (e.g. `use_harness_bots`); formation and control state stable.

---

### 2.2 Victory conditions (1–2 days) — HIGH

**Owner:** Game designer (definition); Gameplay programmer (evaluation logic).  
**Canon/spec:** New VICTORY_CONDITIONS.md or subsection in scenario/canon docs.  
**Report ref:** §2.1, §10.1(2), §10.2 example.

| # | Task | Deliverable | Est. |
|---|------|-------------|------|
| A2.1 | Define victory conditions per scenario (primary/secondary, historical benchmark) | VICTORY_CONDITIONS.md + scenario JSON or schema | 0.5–1 d |
| A2.2 | Implement evaluation logic (win/loss/draw) | turn_pipeline or scenario_runner hook | 0.5 d |
| A2.3 | End-of-scenario summary (and optional UI) | Report field + optional UI | 0.5 d |

**Acceptance criteria:** At scenario end, evaluation runs and result (win/loss/draw per faction) is deterministic and persisted (e.g. in run summary).

**Dependencies:** Scenario end detection already present in runner.

---

### 2.3 Production facilities (2–3 days) — MEDIUM

**Owner:** Gameplay programmer; Formation-expert for historical facility list.  
**Canon/spec:** System 2 (Arms embargo); new data + optional System subsection.  
**Report ref:** §1.3, §10.1(3).

| # | Task | Deliverable | Est. |
|---|------|-------------|------|
| A3.1 | Define 5–10 critical facilities (Zenica, Vitez, Bugojno, Breza, Vogošća) | production_facilities.json or equivalent; settlement_id, type, base_capacity | 0.5–1 d |
| A3.2 | Implement capture/control effects on faction supply | calculateFactionProductionBonus; feed into supply/System 2 | 1 d |
| A3.3 | Production capacity per turn + condition/damage | State fields; integration with turn resolution | 0.5–1 d |
| A3.4 | Tests and balance pass | Tests; optional tuning doc | 0.5 d |

**Acceptance criteria:** Controlling a facility increases that faction’s supply bonus; loss of facility reduces it; no new nondeterminism.

**Dependencies:** System 2 parameters; settlement/municipality control state.

---

## 3. Phase B — Post-launch polish / v1.5 (12–17 days)

**Goal:** Replayability, narrative depth, negotiation depth, historical accuracy (coercion).

### 3.1 Event system (4–6 days)

**Report ref:** §2.3, §10.2(1).

| # | Task | Deliverable | Est. |
|---|------|-------------|------|
| B1.1 | Event framework (trigger types, conditions, effects) | Types + event registry; pipeline hook | 1–2 d |
| B1.2 | 10–20 historical events (e.g. Srebrenica, Markale) | Event definitions + narrative text | 1–2 d |
| B1.3 | 5–10 random events (convoy ambush, defections, etc.) | Same; probability and condition | 1 d |
| B1.4 | Testing and determinism (seeded RNG if random) | Tests; determinism audit | 0.5–1 d |

**Determinism:** Random events must use seeded RNG and stable ordering; same scenario + seed → same event sequence.

---

### 3.2 Campaign branching (5–7 days)

**Report ref:** §2.1, §10.2(2).

| # | Task | Deliverable | Est. |
|---|------|-------------|------|
| B2.1 | Scenario dependency graph (prerequisites, branches) | Schema + scenario metadata | 1–2 d |
| B2.2 | Unlock system (complete scenario → unlock branches) | Runtime + optional UI | 1–2 d |
| B2.3 | Alternative historical paths / “what-if” | Scenario definitions + docs | 2–3 d |

---

### 3.3 Negotiation counter-offers (3–4 days)

**Report ref:** §2.4, §10.2(3).

| # | Task | Deliverable | Est. |
|---|------|-------------|------|
| B3.1 | Counter-proposal system (accept/reject/counter) | State + System 7 extension | 1–2 d |
| B3.2 | Map-based territorial negotiation UI (optional) | UI spec + implementation | 1–2 d |
| B3.3 | Consequence preview (pre-agreement map) | Optional | 0.5 d |

---

### 3.4 Coercion event tracking (2–3 days)

**Report ref:** §7, §11.2.

| # | Task | Deliverable | Est. |
|---|------|-------------|------|
| B4.1 | CoercionEvent data structure + coercion_pressure_by_municipality | State + types | 0.5 d |
| B4.2 | Integration with Phase I flip mechanics (pressure component) | control_flip.ts (or equivalent) | 1 d |
| B4.3 | Historical data entry (e.g. Prijedor, Zvornik, Foča) | Scenario or init data | 0.5–1 d |
| B4.4 | Tests (e.g. Prijedor flip with historical coercion) | Test suite | 0.5 d |

**Determinism:** Coercion pressure is deterministic (no randomness in pressure calc).

---

## 4. Phase C — Future / v2.0+ (18–26 days)

- **Multiplayer architecture:** 15–20 d (client-server, async turns, hidden information). Report §2.5.  
- **UI polish:** 3–6 d (status icons ⚠️📊🔒📈📉, stability trends, atmosphere). Report §6.3, §10.3.  
- **Regional cascade mechanics:** 1 d (+15 when 3+ adjacent flips). Report §8. Defer unless playtesting shows flips too isolated.

---

## 5. Cross-cutting rules

- **Canon:** All new mechanics must align with [CANON.md](../10_canon/CANON.md) and relevant phase specs; no invention.  
- **Determinism:** No timestamps, no unseeded randomness; stable ordering for all collections (see [DETERMINISM_TEST_MATRIX](../20_engineering/DETERMINISM_TEST_MATRIX.md)).  
- **Ledger:** Each implemented feature gets a PROJECT_LEDGER entry; implementation plan doc does not replace ledger.  
- **Ordering:** Implement in Phase A → B → C; within Phase A, AI first (blocking), then victory conditions, then production if time.

---

## 6. Status and next steps

| Item | Status |
|------|--------|
| This plan created | Done |
| Phase A foundation (A1.1-A1.6, A2, A3) | Implemented |
| Phase A.7 benchmark/reporting closure | Implemented (benchmark eval + diagnostics + regression tests) |
| Phase B/C | Backlog |

**Next steps:**

1. **Product/Orchestrator:** Decide whether to tune benchmark targets, strategy parameters, or both for RBiH/HRHB early-war adherence; keep determinism constraints unchanged.  
2. **Gameplay programmer:** Continue calibration runs (30w and 50w) and record accepted parameter/target updates with before/after benchmark deltas.  
3. **Phase B owner team:** Start B1 event framework only after A1.7 calibration is accepted.

---

### 6.1 Execution board decisions (2026-02-10)

**A1.7 calibration stance (Orchestrator/PM):** Accept current benchmark contract and ship as-is. Turn-26 RS pass / RBiH–HRHB fail is accepted; further alignment (e.g. capability wired into flip, init/threshold tuning) is tracked as separate balancing work (see PROJECT_LEDGER and HISTORICAL_TRAJECTORY_VRS_ARBIH_ANALYSIS.md). No change to benchmark reporting contract or determinism.

**PM execution sequence (Phase 7):**

1. **B1** Event framework (trigger/effect, historical + random events; seeded RNG, stable ordering).  
2. **Partial systems wiring** in order: 2 (Arms Embargo) → 3 (Heavy Equipment) → 4 (Legitimacy) → 7 (Negotiation) → 9 (Tactical Doctrines) → 10 (Capability Progression).  
3. **B2–B4** Campaign branching, negotiation counter-offers, coercion event tracking (after B1 and as capacity allows).  
4. **GUI backlog** (P0/P1 warroom items) and map-only external handover in parallel or after as scoped.

---

### 6.2 Execution status update (2026-02-10)

| Item | Status |
|------|--------|
| B1.1-B1.3 Event framework core | Implemented |
| B1.4 Event tests/audit closure | Implemented (2026-02-10) |
| B4.1-B4.2 Coercion state + Phase I integration | Implemented |
| B4.3-B4.4 Historical data + tests | Implemented (2026-02-10) |
| B2 Campaign branching | Implemented (2026-02-10) |
| B3 Negotiation counter-offers | Not started |

**Related analysis:** `docs/40_reports/HISTORICAL_TRAJECTORY_VRS_ARBIH_ANALYSIS.md` informs follow-up calibration and capability/flip alignment work.

---

**Document version:** 1.2  
**Created:** 2026-02-09  
**Updated:** 2026-02-10 (Execution board §6.1 + status §6.2)  
**Source report:** MASTER_EARLY_DOCS_ANALYSIS_REPORT.md (Section 10–12)
