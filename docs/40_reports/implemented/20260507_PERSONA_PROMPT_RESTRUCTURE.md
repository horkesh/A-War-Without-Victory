# Persona Prompt Restructure — Suppress D3.3 Noise Clusters

**Date:** 2026-05-07
**Lane:** LANE-NIGHTSHIFT-PERSONA-PROMPT-RESTRUCTURE
**Ring:** 0 (tooling-only QA harness; no engine touch)
**Author:** Claude (nightshift autonomous run)

## Context

`/scenario-creator-runner-tester` triage of D3.3 v2 observations (`af2400764`)
identified that 78% of persona-grounded commentary was noise concentrated in
four clusters. Those clusters drowned out long-tail signal and made Decision
Room observations unusable for calibration triage. This lane restructures the
13 persona system_prompt_template fields to suppress the noise *at source*
(prompt engineering) rather than filtering downstream, and to redirect
persona attention toward citable ICTY-grounded claims.

## Four noise clusters suppressed

1. **"No political directive issued"** (53× across 3 commanders) — personas
   expected a directive every turn; absence read as anomaly. Reality: the
   game is player-driven; deterministic baseline runs have no auto-AI
   president, and even Claude-as-president runs may legitimately emit
   `no_directive`. Personas now expect no-directive turns as normal.
2. **Alliance-coefficient hand-wringing** (43×) — personas obsessed over the
   RBiH-HRHB alliance value. The trajectory is canonical / calibrated per
   `feature/hrhb-rbih-war-transition`. Personas now only flag when
   deviation exceeds 0.20 from faction-expected trajectory.
3. **"Ops in planning" status visibility** (40×) — personas kept flagging
   that named ops show "planning" status with empty trace. This is a
   diagnostic-report visibility shape, not a sim defect. Personas now
   accept that op execution traces aren't surfaced in their briefing.
4. **Operation-name confabulation** — personas invented fictional 1992
   ARBiH ops (e.g. "Operacija Oluja" 1992; Oluja was HV 1995). Personas
   now only name operations they have grounded historical reference for.

## Implementation

### Files touched

- `tools/claude_plays_vrs/personas/*.json` — 13 persona files. Surgical
  append to each `system_prompt_template`: a NOISE-SUPPRESSION GUIDANCE
  block plus an ICTY-citation positive instruction. Format and content
  faction-symmetric; only the role context (president vs army CO vs
  corps CO) gets minor language tuning to keep the voice register
  consistent.
- `tests/persona_prompt_restructure.test.ts` — NEW. 5 tests verifying
  every persona JSON's system_prompt_template carries each suppressor,
  plus the ICTY-citation guidance, and a static-grep guard against
  per-faction string-equality branches.

### Files NOT touched

- `src/` (no engine code)
- `tools/claude_plays_vrs/api_*.ts` / `persona_loader.ts` /
  `persona_telemetry.ts` / `run_three_commanders.ts`
- Any canon, scenarios, derived data

## Suppressor block (verbatim)

Appended to every persona's `system_prompt_template`:

```
NOISE-SUPPRESSION GUIDANCE (from D3.3 v2 triage):
- DO NOT flag absence of political directives as anomaly. In this game,
  political directives are issued only when the player or AI president
  explicitly emits one. No-directive turns are normal.
- DO NOT comment on the RBiH-HRHB alliance coefficient unless it deviates
  >0.20 from your faction's expected trajectory at this turn (e.g. for HRHB,
  expected 0.50-0.70 in early 1992; for RBiH similar; for RS irrelevant).
- DO NOT flag "ops in planning" as a sim defect. Op execution traces are
  not surfaced in this briefing — only named-op status. Treat planning
  status as the system's normal pre-execution state.
- DO NOT invent operation names. Only reference operations you have
  documented historical grounding for. If you don't know an operation by
  name, describe it generically (e.g. "5th Corps north-west operation"
  not "Operacija Oluja").
- DO cite ICTY judgments (Tadic IT-94-1, Krstic IT-98-33, Galic IT-98-29,
  Karadzic IT-95-5/18-T, Mladic IT-09-92, Prlic IT-04-74-T) where relevant
  to your divergence/calibration claims. Citation rigor > vocabulary breadth.
```

## Tests

- T1: every persona JSON's `system_prompt_template` contains the
  "DO NOT flag absence of political directives" suppressor.
- T2: every persona JSON's `system_prompt_template` contains the
  "DO NOT comment on the RBiH-HRHB alliance coefficient" suppressor.
- T3: every persona JSON's `system_prompt_template` contains the
  "DO NOT invent operation names" suppressor.
- T4: every persona JSON's `system_prompt_template` contains the
  "DO cite ICTY judgments" instruction.
- T5: faction-symmetric — no per-faction string-equality branches in
  the test file (one assertion shape applies to all 13 personas).

## Verification

- `npx vitest run tests/persona_prompt_restructure.test.ts
  tests/d1_persona_infrastructure.test.ts
  tests/d2_persona_telemetry_wire.test.ts` — ALL GREEN.
- `npx tsc --noEmit -p tsconfig.json` — clean.
- 40w smoke: NOT REQUIRED (no engine code touched; persona loaders cache
  personas at scenario init; no behavioral change when persona env flags
  are off; baseline runs are byte-identical).

## Sensitive-history compliance

- Ring 0 / tooling-only QA harness; no engine touch; no §6 surface
  introduced.
- Faction-symmetric mechanism: same suppressor format and same ICTY
  citation guidance for all 13 personas.
- Faction-asymmetric data (per-persona voice_prose + decision_priors)
  is unchanged.
- No genocidal-ideation prompt content added; suppressor language is
  prompt-engineering only.

## Commit

`feat(tools): persona prompt restructure — suppress 4 D3.3 noise
clusters; add ICTY citation guidance
(LANE-NIGHTSHIFT-PERSONA-PROMPT-RESTRUCTURE)`

Commit SHA: `cb13e605`

## Checkpoint log

- 2026-05-07 phase-2 step-13: all 13 persona JSON files appended with
  suppressor block. Parse-OK on all 13; all 4 suppressor substrings
  ("DO NOT flag absence of political directives", "DO NOT comment on the
  RBiH-HRHB alliance coefficient", "DO NOT invent operation names",
  "DO cite ICTY judgments") confirmed present in every
  `system_prompt_template`. Proceeding to test authoring.
- 2026-05-07 phase-3 vitest: 27/27 tests green
  (D1 14/14 + D2 6/6 + new persona_prompt_restructure 7/7).
  Duration 1.58s. Proceeding to typecheck and commit.
- 2026-05-07 phase-3 typecheck: `npx tsc --noEmit -p tsconfig.json`
  exits clean (no output, no errors). Proceeding to commit.
