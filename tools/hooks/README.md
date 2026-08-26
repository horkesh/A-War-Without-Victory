# Guardrails — mechanical, not remembered

**Why these exist.** On 2026-08-26 a review produced ~21 wrong claims. The rules that would have
prevented the two worst were **already written and had been read at session start**:

- napkin `0m` — *"before recording an absence, name WHICH lookup you ran and what it could not have
  seen"* — but all eight of its examples are historical-source lookups, so it did not fire on a code
  grep.
- The 2026-08-25 life lesson — *"print the field's distribution before gating on it"* — restated as a
  discovery a day later.

**A written rule that is read and does not fire is not a guardrail.** These are the mechanical
versions. They fail loudly and cheaply, at the moment of the mistake, instead of costing a
70-minute 188-week run to discover.

---

## `guard_lookup_absence.sh` — PostToolUse on `Grep|Bash`

Fires when a search pattern looks for a field assigned a **literal** (`foo = 'bar'`, `foo: "bar"`).
Such a pattern cannot match an assignment of a **computed** value.

**The incident:** `readiness = 'active'` returned 2 hits → "nothing in the war pipeline restores
readiness". The real exit was `formation.readiness = deriveReadinessState(formation)`
(`src/state/formation_lifecycle.ts:364`), which contains no literal. That false absence was promoted
to a plan prerequisite and took a full seat round plus 232 counter-examples to kill.

**Known benign fires:** any command whose text happens to contain both a search tool and a quoted
assignment — e.g. a heredoc that *quotes* this incident. Sensitive beats dead; ignore it when you are
not about to claim an absence.

## `guard_dirty_citation.sh` — PostToolUse on `Read|Grep`

Fires when the file you just read is **modified in the working tree**. Line numbers and contents from
a dirty tree are not HEAD — and in a repo where several agents share one checkout, that is the normal
case.

**The incident:** the RE packet cited `pre_planned_operations.ts:1163` tagged `[SOURCE-VERIFIED at
HEAD]`, from a tree that was +69/−5. The true HEAD lines were 1231/1260/1262/1263. Every seat that
re-checked at HEAD landed in unrelated code. The same packet also restated prose about a gap that had
been closed two days earlier.

**What to do:** re-read as `git show HEAD:<path>`, say which ref you read, and prefer a **grep
anchor** over a line number in any document that outlives today.

## `whowrites.mjs` — a tool, run it by hand

```bash
node tools/hooks/whowrites.mjs readiness      # every writer, classified, across src/
node tools/hooks/whowrites.mjs cohesion       # flags the per-turn owner
```

Answers **"who writes this field, and does a per-turn pass own it?"** — enumerating every assignment
form (assign, compound, object-literal, delete, destructure), classifying each right-hand side
(LITERAL / FUNCTION RESULT / expression), and cross-referencing writers against the modules the turn
pipeline imports.

**THE RULE IT ENFORCES: a field owned by a per-turn recompute cannot carry a persistent penalty.**
Three proposed mechanics in one review would each have been a silent no-op:

| mechanic | field | per-turn owner that erases it |
|---|---|---|
| cohesion dilution on replacement | `cohesion` | `cohesion_drift.ts` faction floor clamp |
| rebuild latency on `readiness` (**the obvious way to build it**) | `readiness` | `formation_lifecycle.ts:364` |
| consolidation-sweep gate (2026-08-25) | `to_control` | reads `'controlled'` for every municipality |

Run it **before** hanging a mechanic on a field. Both 2026-08-26 failures are caught by one command.

---

## Verification

All three were pipe-tested with positive **and** negative controls before being wired in, then proven
live:

| guard | positive | negative |
|---|---|---|
| lookup-absence | fires on `readiness = 'active'` | silent on `readiness =`, on unrelated patterns, and on a non-search Bash command containing `=` |
| dirty-citation | fires on a dirty file, absolute and relative paths, valid JSON | silent on a clean file, on directories, on missing paths |
| whowrites | finds `formation_lifecycle.ts:364` and flags it FUNCTION RESULT + PER-TURN OWNER | declarations (`const x = …`) excluded as reads, not writes |

**Editing these:** keep a negative control for every change. A guard that fires on everything gets
ignored, and *a permanently-red gate is worse than a missing one* — this repo's own lesson. Review or
disable them via `/hooks`.
