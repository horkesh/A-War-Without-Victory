# Task manifest format

A task manifest is the DELEGABLE part of a plan, as data. The plan document stays the authority
and carries the reasoning; the manifest carries only what can be handed to an executor and checked
mechanically.

## Where this format came from

Three sources, in descending order of weight.

**1. `tools/local_executor/TASK_TEMPLATE.md` — this repo, already battle-tested.** It contributes
the distinction a first draft of this format got wrong: *files you may EDIT* and *files you may
READ* are different lists, and collapsing them invites an executor to rewrite context it was only
meant to consult. It also contributes `out_of_scope` and `report_back`.

**2. SWE-bench, the widely-used benchmark for exactly this problem shape** — give a model a
bounded repository task and decide mechanically whether it succeeded. Two of its fields were
missing here and both are load-bearing:

- **`fails_now`** (their `FAIL_TO_PASS`) — the test that currently FAILS and must pass afterwards.
  SWE-bench *excludes* any instance without such a transition, because a task whose test already
  passes cannot demonstrate anything. That is this repo's "prove it fires by mutation" rule,
  reached independently by a different community, which is about as much corroboration as a
  practice of this kind gets.
- **`must_not_break`** (their `PASS_TO_PASS`) — tests passing before AND after. This repo's most
  frequent failure is precisely a change that satisfies its own test and breaks a neighbour: the
  CI install-contract test, `inbox_dedup`, and `main` going red twice in two days. The first
  draft of this format had no field for it.

`base_commit` comes from the same place. A manifest written against files that have since moved
is stale, and staleness is mechanically detectable rather than a thing to notice.

**3. Measurements from this repo's own ledger** (`tools/local_executor/README.md`) — `kind` for
routing, `tokens` for whether the inputs fit a 32K context, and contracts stated explicitly
because a dispatch told to infer field names produced 42 cases of which 27 exercised nothing.

Reviewed and rejected: TOML per a 2026 registered report on specification-driven generation — the
study has no results yet, and switching serialisation formats for an unevaluated proposal would
cost consistency with `open_gates.yml` and `plan_index.yml` for nothing.

## The model never reads this file

The manifest is DATA. `tools/render_task_prompt.cjs` renders it into the prose shape of
`TASK_TEMPLATE.md`, which is what the executor actually receives — small models read prose
instructions better than they read YAML, and rendering keeps one source of truth instead of a
schema and a prompt that drift apart.

## Fields

| field | required | meaning |
|---|---|---|
| `owning_plan` | yes | the plan this derives from. It wins on any disagreement. |
| `base_commit` | yes | the commit the manifest was written against; staleness is checked from it |
| `lane`, `gate` | yes | which lane and open gate this serves |
| `not_delegable` | yes | judgement work this manifest deliberately does not cover |
| `tasks[].id` | yes | stable identifier |
| `tasks[].kind` | yes | extract / table / wiring / logic / prose — matches the ledger's categories |
| `tasks[].edit` | yes | exact paths the executor may modify. May be empty for a read-only task. |
| `tasks[].read` | yes | exact paths it may consult but must not change |
| `tasks[].change` | yes | one paragraph. If it needs more, it is too big — split it. |
| `tasks[].fails_now` | yes | test(s) that currently FAIL and must pass. A task without one is invalid. |
| `tasks[].must_not_break` | yes | test(s) passing before and after |
| `tasks[].out_of_scope` | yes | the adjacent things it might drift into |
| `tasks[].status` | yes | open / blocked / done |

`not_delegable` is required and may not be empty. A manifest that silently omitted the judgement
work would read as though the whole plan were machine-executable, which is the one claim this
format exists to avoid making.

## Two disciplines learned by running the first manifest

**A task must not duplicate its own plan.** `WR01-T2` asked the executor to find the tests pinning
the date. The owning plan already listed all four, with line ranges and current assertions, in a
table. Two dispatches were spent before anyone checked. The cost is not just the dispatches: a
re-derivation can DISAGREE with the plan, and then there are two answers and no authority. Before
writing a task, read the plan for the answer.

**Never put a directory in `read`.** `WR01-T2` originally listed `tests/ui`. The dispatcher then
chose files with a truncated grep, and the model returned four perfectly verified quotes from a
test about army HQ timing copy. A directory is an invitation to guess which files matter, and the
guess is not recorded anywhere. Name the files.

**Quote verification proves provenance, not relevance.** Both of those dispatches verified 100% —
the quotes were real, in the files named. Verification cannot tell you the answer was to the right
question. That check remains the planner's.
