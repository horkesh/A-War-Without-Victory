# APWB Cut — Substrate Consumer Pre-Clear Audit

**Date:** 2026-05-21
**Scope:** Pre-clear the `docs/plans/2026-05-21-apwb-cut-and-debuff-replacement-plan.md` §6 stop-gate — "STOP if `targets_friendly_overrides` has any consumer outside the two APWB ops" + symmetric check on the `'Operacija Tigar-Sloboda'` name.
**Method:** Repo-wide grep against current main (cc1ee204).
**Outcome:** **PRE-CLEARED.** Both substrates have zero consumers outside the cut scope.

---

## 1. `targets_friendly_overrides` consumers

### 1.1 Schema declaration (1 site — deletes with the cut)

| File:Line | Role |
|---|---|
| `src/sim/combat/operation_opportunities.ts:243` | `OperationOpportunityDef` field declaration |
| `src/sim/combat/operation_opportunities.ts:977-989` | Override filter logic at `buildCorpsOperation` |

### 1.2 Op-def consumers (2 sites — both within cut scope)

| File:Line | Op |
|---|---|
| `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:570` | `TIGAR_SLOBODA_94_OPPORTUNITY` — sets `targets_friendly_overrides: TIGAR_SLOBODA_OBJECTIVES` |
| `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:849` | `APWB_PRESSURE_94_OPPORTUNITY` — sets `targets_friendly_overrides: APWB_PRESSURE_OBJECTIVES` |

Both ops are explicitly named in the APWB cut plan §2.1 as deletion targets. No other op-def in the catalog directory consumes the field.

### 1.3 Test consumers (delete alongside the substrate)

| File | Role |
|---|---|
| `tests/operation_opportunities_substrate.test.ts` (lines 592, 630-757, 872-887) | Phase 1 substrate tests — describe block "LANE C Phase 1 Substrate A (targets_friendly_overrides)" |
| `tests/operation_opportunities_catalog.test.ts:708-710` | Catalog-coverage test asserting overrides may be set |

Both files delete cleanly when the substrate goes; no test orphaning.

### 1.4 Documentation references (not consumers)

`docs/PROJECT_LEDGER.md`, `docs/PROJECT_LEDGER_KNOWLEDGE.md`, `docs/PROJECT_LEDGER_ARCHIVE_2026Q2.md`, `docs/plans/2026-05-21-{apwb-cut,tier1-painted-target-anchors}-plan.md`, `docs/40_reports/implemented/20260501_LANE_C_FIFTH_CORPS_OPPORTUNITY_FAMILY.md`, `docs/research/2026-05-01-late-war-operation-opportunity-research.md`, `.claude/napkin.md`.

These are historical/design records of the substrate's introduction (commit chain `14dc48e1` → `77e68d0a` → `34211f9c` → … → close-out) plus the new cut plans. Doc references don't gate the cut — they get cross-referenced from the cut's ledger entry, not edited.

### 1.5 Verdict

`targets_friendly_overrides` is consumed by exactly **two op defs**, both inside the cut scope. The substrate primitive can be retired cleanly per APWB cut plan §6.

---

## 2. `'Operacija Tigar-Sloboda'` / `tigar_sloboda` references

### 2.1 Code consumers (2 sites — both within cut scope)

| File:Line | Role |
|---|---|
| `src/sim/combat/operation_names.ts:128` | Operation name pool entry `'Operacija Tigar-Sloboda'` (the only canonical-name reference) |
| `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` | `TIGAR_SLOBODA_94_OPPORTUNITY` def + axes + objective lists + predicates |

The op-name pool entry is consumed only by the Tigar-Sloboda op def. Deleting both is clean.

### 2.2 Save-data references (in-progress run artifact, expected to drift)

`data/derived/latest_run_final_save.json` lines 128998-129232 contain ~10 references to `opportunity_id: "tigar_sloboda_94"` from the latest run's opportunity ledger. This is a **transient generated artifact**; once the op def is deleted, subsequent runs will produce a save without Tigar-Sloboda entries. The artifact is gitignored per `docs/20_engineering/GENERATED_ARTIFACT_OWNERSHIP.md`. No action needed — the file regenerates.

### 2.3 Documentation references (not consumers)

`docs/research/2026-05-01-late-war-operation-opportunity-research.md` (BB2 p.533 citation), `docs/plans/late-war-5th-corps-opportunities-design.md` (§4.1 Tigar-Sloboda 94 design section), `docs/40_reports/implemented/20260501_LANE_C_*.md`, multiple ledger entries.

Per APWB cut plan §3 Files-to-touch, the design-doc references in `late-war-5th-corps-opportunities-design.md` and `late-war-operation-opportunity-system-design.md` get a "2026-05-21 withdrawn" annotation. No deletion required.

### 2.4 Verdict

`'Operacija Tigar-Sloboda'` is consumed by exactly **one op def + one name-pool entry**, both inside the cut scope. The name can be retired cleanly.

---

## 3. Pre-clear summary

| Stop-gate | Status |
|---|---|
| `targets_friendly_overrides` has zero consumers outside APWB cut scope | **CLEARED** |
| `'Operacija Tigar-Sloboda'` name has zero consumers outside APWB cut scope | **CLEARED** |
| `tigar_sloboda_94` opportunity-id has zero non-cut consumers (excluding gitignored save artifact) | **CLEARED** |

Stream B can proceed when (a) Codex's current `src/sim/combat/*` H1 + perf wave closes, AND (b) the consequence-event schema check confirms Path A's existing-kind composition is achievable (already concluded in `docs/40_reports/audits/20260521_PLAN_OPEN_QUESTIONS_RESEARCH.md` Q2.1).

---

## 4. Tangentially-related observations (not blockers)

### 4.1 Other LANE C 5th-Corps ops NOT in cut scope

The LANE C 5th-Corps opportunity family (`docs/40_reports/implemented/20260501_LANE_C_FIFTH_CORPS_OPPORTUNITY_FAMILY.md`) introduced **six** new entries in `FIFTH_CORPS_OPPORTUNITIES`:

- Tigar-Sloboda 94 (T1) — **DELETED by cut**
- APWB Pressure 94 (T1) — **DELETED by cut**
- Una 94 (T3) — **OUT OF CUT SCOPE** (not APWB-coupled at code level; uses normal enemy-controller filter)
- Breza 94 (T3) — **OUT OF CUT SCOPE**
- Pauk 94/95 (T3) — **OUT OF CUT SCOPE**
- Grmeč 94 (T1 precursor) — **OUT OF CUT SCOPE** (depends on `apwb_defeated` flag, which the cut's `csq_abdic_defeated_1994` continues to set per Path A §2.3)

Net: 2 of 6 LANE C entries delete; 4 remain. The remaining 4 are unaffected by the substrate retirement because they don't consume `targets_friendly_overrides`.

### 4.2 Grmeč 94 dependency preserved

The cut explicitly preserves the `apwb_defeated` flag chain (cut plan §2.3 + §8 Q2.4: "persistent within v1.0 scope"). Grmeč 94's gating predicate reading `apwb_defeated` continues to work — it just reads the flag from the new `csq_abdic_defeated_1994` consequence event instead of from the deleted APWB Pressure 94's exit_class.

If Grmeč 94's predicate reads anything more specific than the boolean flag (e.g. APWB Pressure 94's specific opportunity-ledger exit_class), a small predicate adjustment is needed. Investigation owner: ops-expert at cut execution time.

### 4.3 No further investigation needed for this audit

This pre-clear focused on the substrate stop-gate. The Grmeč predicate-detail check (4.2) is an implementation-time concern, not a precondition for cut authorization.
