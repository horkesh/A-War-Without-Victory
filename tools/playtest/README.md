# `tools/playtest/` — the playthrough findings harness

Plays campaigns through the real player-decision seam under a swappable **policy**,
runs a set of **probes** every turn, and records everything into a deduplicated
**findings ledger**.

> **This is a record-only lane.** The harness never edits engine source and never
> fixes anything. It produces evidence. Fixes are somebody else's commit — which is
> what makes it safe to run continuously alongside other people's work on the engine.

## Quick start

```bash
# One campaign, historical choices, full war
node node_modules/tsx/dist/cli.mjs tools/playtest/run_headless.ts \
  --faction RBiH --policy historical --turns 188

# Render the ledger for humans
node node_modules/tsx/dist/cli.mjs tools/playtest/rollup.ts
```

## The four pieces

| File | Role |
| --- | --- |
| `types.ts` | `Finding`, `Policy`, `Probe`, `RunConfig` — the contracts |
| `findings.ts` | The recorder: fingerprint, dedup, cross-run merge |
| `policies.ts` | *How would this president play?* — the outcome axis |
| `probes.ts` | *What counts as a finding?* — the detection axis |
| `run_headless.ts` | The driver |
| `rollup.ts` | Ledger → readable Markdown |

Policies and probes are independent. Five policies × ten probes is fifty
combinations from six files, and adding either one is a small, local edit.

## Policies

| Id | What it does | What it's for |
| --- | --- | --- |
| `historical` | Authored default → staff rec → first option | The baseline. If the *intended* playthrough is broken, everything is |
| `counterfactual` | The counterfactual option, else any non-default | Stresses branches the authored path never touches — where the event-data defects live |
| `staff` | Always the CoS recommendation | The trusting president; finds missing or self-contradicting staff advice |
| `passive` | Answer only what blocks, fire nothing | The floor case. Deadlocks show up here first and cheapest |
| `seeded:<n>` | Reproducible pseudo-random walk | Broadest coverage. Vary the seed to widen it |

`seeded` uses an explicit mulberry32 PRNG. There is no `Math.random()` anywhere in
this directory — a run must replay.

## Probes

Each probe encodes a defect **class** this repo has already produced at least once,
so the next instance is caught automatically instead of being rediscovered in prose
several months later.

| Probe | Catches |
| --- | --- |
| `nonfinite-numeric` | NaN/Infinity in state — the `pool_multiplier` class, which surfaces far from its cause |
| `lever-noop` | Lever returns `ok:true`, spends Command Authority, changes nothing — the `forceLaunch` field-path class |
| `lever-refusal` | Refusals, recorded for *frequency*: a reason that fires 188 times is a design problem |
| `decision-shape` | Zero options, duplicate option ids, no authored historical default |
| `decision-text-gap` | A decision requiring a response with no situation, assessment or narrative |
| `option-stakes-gap` | No option carries `dimension_shifts` — the player chooses blind |
| `turn-time` | Per-turn and whole-campaign turn cost against a budget |
| `command-authority` | Never spent (levers gated shut) or pinned at cap (income wasted) |
| `discarded-explanation` | The engine writes a rejection reason no UI reads — the `op_directive_rejection` class |
| `advance-deadlock` | A blocking decision nothing can answer |

**Adding a probe is the main way to grow this.** Implement `Probe`, add it to
`defaultProbes()`, and every future run inherits the check.

## What this lane cannot see

Headless finds engine defects, malformed data, dead levers, deadlocks, missing
text, turn cost. It **cannot see the UI** — layout, clipping, discoverability,
whether a value is rendered at all. Most *friction* is UI friction. This driver is
the cheap high-volume half; an Electron driver is the other half, and neither
substitutes for the other. Do not let the fast lane's finding count be mistaken for
coverage.

## The ledger

- `docs/40_reports/playtests/findings/FINDINGS.jsonl` — one line per distinct
  finding, sorted by (severity, surface, fingerprint). **Committed.**
- `docs/40_reports/playtests/findings/FINDINGS.md` — the rollup, generated.
- `tmp-playtest/<runId>/` — per-run raw log, summary, decision log. Not committed.

The ledger holds **no wall-clock timestamps**, so a re-run that finds the same
things produces a byte-identical file. A clean `git diff` after a run means nothing
new broke; that is the point.

Findings dedup on a **fingerprint** — `sha1(kind|surface|probe|normalized(title))`,
where normalization flattens digits and quoted ids. The same defect at turn 5 and
turn 90 is one ledger line with `occurrences: 2`, not two findings.

### Triage

The harness only ever writes `status: "open"`. A human sets `status` to `triaged`,
`fixed`, `wontfix` or `duplicate` by editing the JSONL, then re-runs `rollup.ts`.
A `fixed` entry that reappears in a later run gets its occurrence count bumped —
which is exactly the regression signal you want.

## Relationship to the existing tools

- Built on `tools/ai_play/president_playthrough.ts` — the determinism-proven seam.
  This harness adds policy/probe/recorder around it; it does not replace it.
- `tools/ai_play/run_rbih_best_outcome.ts` remains the worked *outcome-comparison*
  study. This is the *defect-finding* counterpart.
- Output is shaped to slot into `docs/40_reports/playtests/TEMPLATE.md` (bugs before
  friction; a "three worst friction moments" section) rather than inventing a
  second convention.
