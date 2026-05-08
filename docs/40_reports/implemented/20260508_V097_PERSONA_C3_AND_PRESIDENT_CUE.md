# V0.9.7+ Persona C3 Structural Fix + President Cue Enrichment

**Date:** 2026-05-08
**Lane:** LANE-NIGHTSHIFT-V097-PERSONA-C3-STRUCTURAL-AND-PRESIDENT-CUE
**Ring:** 0 (tooling-only QA harness; no engine touch; no §6 surface)
**Faction symmetry:** identical computation for RBiH/RS/HRHB; no per-faction branches.

## Summary

Two file-disjoint v0.9.7+ followups carried from the cb13e605-bis empirical
iteration (`docs/40_reports/implemented/20260507_D3_PERSONA_SUPPRESSOR_VALIDATION.md`):

1. **Lane 1 — C3 structural fix:** prune routine op-lifecycle states from the
   corps-CO and army-CO briefing user prompts. The C3 noise cluster (op-
   lifecycle commentary) was structurally resistant to prompt-only suppression
   because the briefing surfaced these states verbatim. Structural fix: don't
   surface routine state.

2. **Lane 2 — president cue enrichment:** add 5 deterministic military-
   pressure cues to `buildPresidentUserPrompt` so the persona has concrete
   grounds for verb choice. Root cause of the cb13e605-bis 100%
   `no_directive` saturation hypothesised as the prompt being too coarse
   (territory-only).

Both lanes ship in this branch as 2 independently-reviewable commits.

## Lane 1 — C3 structural fix

### Files

- `tools/claude_plays_vrs/api_corps_commander.ts` — `buildCorpsStatePrompt`.
- `tools/claude_plays_vrs/api_commander.ts` — `buildStatePrompt` (per-corps section).

### Decision-relevance rule

A `CorpsOperation` is **decision-relevant** iff:
- `phase === 'execution'` (active fighting always relevant), OR
- `last_result === 'failed'` (recent setback warrants attention), OR
- the corps' `status_reason` is set to a meaningful (non-`unknown`) value.

Routine ops (`phase === 'planning' | 'recovery'` with no `status_reason` and
no failed `last_result`) are pruned.

### Pruning behaviour — corps-CO prompt

| Condition | Old emit | New emit |
|---|---|---|
| All ops routine | `Status: unknown \| Trace:` line + per-op `Active operation: <name> (planning)` per op | Single line: `Operations: N active (all routine planning/recovery — no decisions required this turn)` |
| Some decision-relevant | All ops verbosely with status/trace | Decision-relevant ops verbosely with `last_result` if present; routine ops collapsed to `Other operations (routine): name1, name2` |
| `status_reason === 'unknown'` and trace empty | `Status: unknown \| Trace: ` line ALWAYS emitted | Line suppressed entirely |

### Pruning behaviour — army-CO prompt (per-corps section)

| Condition | Old emit | New emit |
|---|---|---|
| Routine op + unknown status + empty trace | `op: <name> (planning) \| status: unknown \| trace:` | `op: <name> (planning, routine)` |
| Decision-relevant op | `op: <name> (execution) \| status: unknown \| trace:` | `op: <name> (execution[, last_result=...])` (status/trace appended only if meaningful) |
| No op + meaningful status | `no operation \| status: unknown \| trace:` | `no operation \| status: <reason>` |
| No op + no meaningful status | `no operation \| status: unknown \| trace:` | (line suppressed) |

### Sample before/after — corps-CO prompt (1st Corps probe at turn 1)

**Before (cb13e605-bis baseline):**

```
Turn: 1. Corps: arbih_1st_corps. Faction: RBiH.
Current stance: balanced
Status: unknown | Trace:
Active operation: probe_arbih_1st_corps_t1 (planning)

Brigades: 8 | Personnel: 24000 | Avg Cohesion: 50 | Avg Morale: 50
...
```

**After:**

```
Turn: 1. Corps: arbih_1st_corps. Faction: RBiH.
Current stance: balanced
Operations: 1 active (all routine planning/recovery — no decisions required this turn)

Brigades: 8 | Personnel: 24000 | Avg Cohesion: 50 | Avg Morale: 50
...
```

The dominant C3 noise driver (`Status: unknown | Trace:` + verbose
per-op `(planning)` enumeration with `'unknown'` filler) is gone. The model
sees a one-line summary that does not invite per-op commentary.

## Lane 2 — president cue enrichment

### File

- `tools/claude_plays_vrs/api_president.ts` — new helper `computePresidentCues`,
  appended into `buildPresidentUserPrompt` between TERRITORY and RECENT EVENTS.

### Cues added (5)

1. **Corps fronts under threat** — count of `state.military.corps_front_sectors`
   entries owned by this faction with `threat_ratio > 1.5`.
2. **OSIDs lost to enemy (last 4 turns)** — count of
   `state.political.control_events` where `from === faction && to !== faction`
   and `turn >= currentTurn − 4`.
3. **Operations in execution** — count of corps `active_operations` with
   `phase === 'execution'` for this faction's corps (sorted iteration).
4. **War exhaustion** — current `state.political.war_exhaustion[faction]`
   value (canonical monotonic accumulator).
5. **Patron-pressure events (recent)** — count of trailing
   `state.military.fired_event_ids` whose id contains `'patron'`
   (substring match; faction-symmetric — no per-faction event-id branching).

### Sample after — president user prompt (RS, turn 8)

```
Turn: 8. Faction: RS (Republika Srpska).

TERRITORY (OSID count):
  RBiH: 213 OSIDs (29.9%)
  RS: 423 OSIDs (59.4%)
  HRHB: 76 OSIDs (10.7%)

MILITARY-PRESSURE CUES (last 4 turns):
  Corps fronts under threat (threat_ratio > 1.5): 2
  OSIDs lost to enemy: 7
  Operations in execution: 3
  War exhaustion: 142
  Patron-pressure events (recent): 1

RECENT EVENTS (last 5): jna_dissolution, vrs_corps_activation, ...
```

The persona now has 5 concrete numerical signals it can reason against to
pick `hold_corridor` (high ops_in_execution + recent loss), `consolidate_drina`
(high corps_under_threat), `maintain_siege` (low pressure on multiple cues),
`accept_ceasefire` (high exhaustion), etc., rather than defaulting to
`no_directive`.

## AC verdicts

| AC | Verdict | Evidence |
|---|---|---|
| AC-G1 (persona-prompt-restructure tests pass; suppressor markers intact) | PASS | `tests/persona_prompt_restructure.test.ts` 7/7 PASS — no persona JSON files touched |
| AC-typecheck-clean | PASS | `npx tsc --noEmit` produced no output |
| AC-vitest-clean (lane + adjacent) | PASS | 50/50 across 5 suites: persona_prompt_restructure (7), d1_persona_infrastructure (14), d2_persona_telemetry_wire (6), api_commander_directive_context (7), a4_army_co_roster_personalities (16) |
| AC-G3 (40w hash byte-stable to `86ebf26ae0271465`) | PASS | `npm run sim:scenario:run:40w` → final_state_hash `86ebf26ae0271465` byte-identical |
| AC-faction-symmetric | PASS | Both lanes use single code path for RBiH/RS/HRHB; no per-faction branches |
| AC-Ring-0 | PASS | Tooling-only (`tools/claude_plays_vrs/`); no `src/` engine source touched; no §6 surface |

## 40w hash byte-stable verification

```
outDir: runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1746
final_state_hash: 86ebf26ae0271465
```

Default-OFF persona path: env-flag-gated. `producePresidentDirective` returns
null when `CLAUDE_AS_PRESIDENT_*` env flags are unset; no Anthropic SDK calls;
no GameState mutation; the new cue helper is never called. Byte-stability is
trivial under the env-flag-gated discipline.

## Parent's exact validation command

The agent does not run the validation 40w persona-on run (FORAWWV §XVI long-
subprocess discipline — agent-spawned long-running processes die with the
agent). Parent owns the validation:

```bash
set -a && source .env && set +a && \
CLAUDE_AS_PRESIDENT_RBiH=true CLAUDE_AS_PRESIDENT_RS=true \
CLAUDE_AS_PRESIDENT_HRHB=true CLAUDE_AS_ARMY_CO_RBiH=true \
CLAUDE_AS_ARMY_CO_RS=true CLAUDE_AS_ARMY_CO_HRHB=true \
CLAUDE_AS_ALL=true \
node_modules/.bin/tsx tools/claude_plays_vrs/run_three_commanders.ts \
  --mode api --corps-api --model claude-haiku-4-5-20251001 \
  > runs/three_commanders/validation_v097_persona_cue_log.txt 2>&1 &
```

After completion (~47 min wallclock, ~$1.76 spend):

```bash
python3 tools/d3_validation_compare.py
```

Compare the resulting `runs/three_commanders/diagnostic_report.json` against:

- **cb13e605-bis baseline:** `runs/three_commanders/diagnostic_report.json`
  is currently the cb13e605-bis snapshot (226 obs, 171 noise, 55 genuine);
  before launching the validation run, COPY it sideways:
  `cp runs/three_commanders/diagnostic_report.json runs/three_commanders/diagnostic_report_cb13e605_bis.json`.
- **Original baseline:** `runs/three_commanders/diagnostic_report_baseline_d3_pre_cb13e605.json` (253 obs, 186 noise).
- **cb13e605-only:** `runs/three_commanders/diagnostic_report_cb13e605_only.json` (274 obs, 195 noise).

## Expected verdict (this lane)

| Metric | Baseline | cb13e605-bis | This lane (expected) |
|---|---|---|---|
| C3 cluster | 35 | 61 (+74%) | <60 (target: <35; structural prune should crater C3 because the surface is gone) |
| President `no_directive` rate | n/a (baseline pre-D1) | 100% | <100% (target: <60%; cues give the model concrete grounds) |
| Total noise | 186 | 171 (-8%) | <171 (target: <100, MARGINAL territory) |

Specifically: C3 should drop dramatically because the model can no longer
comment on `Status: unknown | Trace:` lines or per-op `(planning)` enumeration —
those don't exist in the prompt anymore. Genuine signal % should rise as
president verbs pick up alternatives to `no_directive`.

## Sensitive-history compliance

- Ring 0 / tooling-only QA harness; no engine touch; no §6 surface.
- Faction-symmetric mechanism: identical pruning rule and identical cue
  computation for all 3 factions; no per-faction branches.
- The president cue computation reads only canonical state slots
  (`corps_front_sectors`, `control_events`, `corps_command.active_operations`,
  `war_exhaustion`, `fired_event_ids`) — no genocide-adjacent narrative
  surface introduced.

## Commits

Two commits, file-disjoint:

1. **`6cebf13e`** — `feat(tools): persona C3 structural fix — prune routine op-lifecycle from briefing prompt`
   - `tools/claude_plays_vrs/api_corps_commander.ts`
   - `tools/claude_plays_vrs/api_commander.ts`

2. **`37b5843a`** — `feat(tools): persona president-cue enrichment — military-pressure signals in user prompt`
   - `tools/claude_plays_vrs/api_president.ts`

Both pushed in lane order. Parent owns the post-commit 40w persona-on
validation run.
