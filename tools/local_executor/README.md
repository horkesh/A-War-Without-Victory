# Local-model executor harness

A planner (a strong hosted model) writes the task and declares what acceptance means.
A local model executes it. This directory holds the parts that make that safe.

**The executor never certifies itself.** That is the whole design.

## Why, measured rather than assumed

Benchmarked on this machine (AMD RX 7800 XT 16 GB, Ryzen 7 5700X, DDR4-2400) on 2026-09-10:

| model | generation | **prompt processing** | fits in VRAM |
|---|---|---|---|
| `qwen3.5:9b` | 43–48 tok/s | **352 tok/s** | yes, entirely |
| `qwen3-coder:30b-a3b-q4_K_M` | 12 tok/s | **8 tok/s** | no — 6.3 GB spills to RAM |

Prompt speed decides this, not generation speed: a coding agent spends most of its budget
*reading*. At 8 tok/s, feeding it a 25K-token file takes ~50 minutes. The 30B MoE looks better
on paper and loses badly here, because MoE offload depends on fast system RAM and this box has
DDR4-2400 in a mismatched kit. **Use a model that fits entirely in VRAM.**

Two settings matter enormously:

- **`think: false`** — same task, 3,971 tokens/92 s with thinking on versus 136 tokens/**3.0 s**
  with it off. A 30x difference for identical output.
- **`num_ctx: 32768`** — Ollama defaults to 4096, which is a chat demo, not an agent.

## The finding that justifies the gate

Asked for a deterministic comparator, the 30B model returned `a.id.localeCompare(b.id)`.
That is **locale-dependent**, violating this repo's first sacred rule, in a repo that has
`strictCompare` precisely to avoid it — and it looked *more* professional than the correct
answer. No unit test would have caught it.

The executor's failure mode here is not bad TypeScript. It is plausible work that is silently
wrong. Everything below exists for that.

## `gate.mjs` — the acceptance oracle

```bash
npm run gate:local -- --tests tests/foo.test.ts,tests/bar.test.ts
```

It checks, in order:

1. **That acceptance was declared at all.** No `--tests` → exit **2**. A gate with nothing to
   prove is not a passing gate.
2. **That `tests/` was not modified.** This repo has many source-string assertion tests, so
   "fix the test" is the tempting wrong move and the one that destroys the safety net. Requires
   an explicit `--allow-test-edits` from the planner.
3. **Determinism on changed `src/` files only** — bans `Math.random`, `Date.now`, `new Date()`
   and `.localeCompare(` in *added* lines, so the executor is judged on its own work.
4. `npx tsc --noEmit`
5. The declared test files
6. `node tools/validate_open_gates.cjs`

Exit 0 pass, 1 fail, 2 invoked wrongly. Verified in both directions: it passes a clean tree and
fails on an injected `Math.random`.

## Running the model

```powershell
ollama serve                 # usually already running as a service
ollama list                  # confirm the model is present
```

Point Claude Code at it **in a separate terminal** — this env var replaces the driving model
entirely, so setting it in your planner session loses the planner:

```powershell
$env:ANTHROPIC_BASE_URL = "http://localhost:11434"
$env:ANTHROPIC_AUTH_TOKEN = "ollama"
claude --model qwen3.5:9b
```

Ollama has spoken the Anthropic Messages API since v0.14; no proxy is needed. It detects the
AMD card through ROCm natively on Windows — no WSL2, despite what most guides still say.

## What to give it, and what never to

**Give it:** mechanical refactors with a named test oracle; i18n string plumbing; scripted
transforms where the planner supplies the assertion; dead-code and import hygiene; ledger-entry
drafting from a diff.

**Never give it:** anything calibration-touching (188w runs, pins, floors); canon, §6, FORAWWV,
the enclave guard; determinism-sensitive engine code without a fingerprint diff; and anything
where "looks right" is the only available check.

**Context is the binding constraint.** At 32K this repo is not explorable — `App.tsx` alone is
~25K tokens. Hand the executor exact file paths and an exact task. Never "go look at the
warroom code".

## What to send it, and what to keep — measured over four dispatches (2026-09-10/11)

The split is sharper than "small tasks vs large ones". Across four real delegations the model was
**reliable at enumeration and structure, and unreliable at predicting behaviour.**

| dispatch | outcome |
|---|---|
| `bosnianPlaceNames.ts` | boundary semantics correct as proposed; cleanup was efficiency + dead code |
| pipe-guard test tables | tables right; decision helper rewritten |
| receipt checker | unusable — see below |
| npm scripts + CI step | accepted with two naming edits |
| edge-case list | 5 of 9 expectations wrong; the CASE LIST found a real defect |

**The failure mode is always the same shape: it defaults to reporting success.**

- the pipe-guard test helper had `catch { return 'quiet' }`, which would have passed the entire
  quiet group against a crashed hook
- the receipt checker's `resolveCitation` returned `true` on its main path — a validator that
  could not fail

Both are false-green generators, the exact class this repo keeps getting burned by. So:

**NEVER delegate the oracle.** The thing that decides pass/fail — an acceptance predicate, a
validator's core, a test's expected value — is the planner's. Delegate the inputs, the tables,
the scaffolding, the wiring, the enumeration of cases.

**Derive expectations, do not accept them.** The edge-case dispatch is the template worth
copying: ask the model for the CASES ONLY, run them through the real implementation, print what
happens, then judge each result by hand before pinning it. That run cost one dispatch and caught
a genuine defect — a citation like `logs/EXAMPLE/a{ x , y }.log` truncated at the first space — that the
hand-written tests never reached. Its own guesses about those same cases were mostly wrong.

**Watch for self-narration.** When a draft starts writing "Re-evaluating...", "Wait, if I have..."
or "Re-reading the prompt:" into the code, it is reasoning in the output instead of deciding. That
draft needs rewriting, not patching — it happened in both rejected dispatches and neither was
salvageable by editing.

**Do not delegate shell.** Both hook guards were written by the planner. Every bug in them was a
quoting bug — single vs double quotes, heredoc bodies, `stash@{0}` split by a brace separator.
That is the worst possible fit for a small model, and the review cost would exceed writing it.

## Harness defects found by using it (2026-09-11)

Three, all found within an hour of dispatching in earnest. Each was a FALSE GREEN — the dispatch
reported success while doing less than asked.

1. **`--read a.sh b.sh c.sh` sent one file and silently dropped two.** `--read` took a single
   value; the rest became stray argv and were ignored. `CLAUDE.md` documented `--read <files>`,
   plural, so the documented interface and the implementation disagreed. The model then answered
   confidently about two hooks it had never seen, and nothing in the output said so.
   → Both forms now work, and **any argument the parser does not understand refuses the
   dispatch.** Nothing is sent unless every argument is understood.

2. **"Is ollama running?" was printed while ollama was running.** `local:check` reported READY one
   command later; the model had simply been cold and the first load timed out. A wrong diagnosis
   costs more than no diagnosis.
   → On failure the tool now probes `/api/tags` and says which of three things actually happened:
   server unreachable, model not installed (HTTP 404 — `ollama pull`), or a cold-load timeout
   (retry, the second attempt hits a warm model).

3. **A 404 was being reported as a cold load.** The first version of fix 2 blamed the cold model
   for a missing one — repeating the exact failure it existed to prevent, one branch down.

The pattern worth keeping: **a harness that reports success while doing less than asked is the
same defect class as the delegated code that reports success regardless.** Both were caught the
same way — by checking what actually happened instead of reading the exit line.

## Correction: "it enumerates well" needs a qualifier (2026-09-11)

A later dispatch tested that claim and it did not survive intact. Asked to propose test cases for
three hooks — with the instruction to *read each hook's `jq` expressions and use THOSE field
names* — it produced 42 cases, of which **27 were inert**: they fed `tool_input.command` to a hook
that reads `tool_input.file_path`, so they exercised nothing and all returned silence.

The silence was the dangerous part. Fourteen quiet results for `guard_dirty_citation` look exactly
like "this hook is dead" — and the hook is not dead; it had fired on the planner twice that same
session. **A case that probes the wrong field does not fail, it just proves nothing**, which is
the same false-green shape as everything else on this page.

So the qualifier: **it enumerates well when it already understands the interface, and it does not
reliably learn the interface from the source you hand it.** When the cases must match a
non-obvious contract, state the contract in the spec explicitly — field names, payload shape,
which key each hook reads — rather than telling it to go and find them.

And verify enumeration the same way as everything else: a batch of cases that all come back
silent means the CASES are wrong until proven otherwise, not the code under test.

### `--expect json`

Added the same day, for a related reason: a dispatch asked for JSON returned an array whose second
element had lost its opening brace. Nothing noticed until a parse error surfaced later, in a
different tool, long after the dispatch had been recorded as successful. `--expect json` parses
the reply at the source and exits 3 with the offending excerpt. Re-dispatching then produced valid
JSON on the first retry — the check cost nothing and removed a whole class of silent damage.

## Three ways enumeration fails, and the rule that covers all three (2026-09-11)

The "it enumerates well" claim was corrected once already on this page. A second round of testing
corrected it again, and the three failures together finally name the real boundary.

| attempt | cases | inert | why |
|---|---|---|---|
| find the field names yourself | 42 | 27 | fed `command` to a hook that reads `file_path` |
| field names GIVEN, free-form JSON | 12 | 0 | correct — but produced 2 cases when 12 were asked |
| field names GIVEN, schema-constrained | 12 | 12 | every `file_path` was invented; none exist in this repo |

The third is the instructive one. Twelve well-formed, plausible cases — `src/main.ts`,
`src/lib/utils.ts`, `temp/new_experiment.js` — and **not one of those paths exists here**. All
twelve returned silence, which is indistinguishable from "this hook is dead" for a hook that had
fired on the planner twice that same session. Fed real paths, the hook is exactly right: it warns
for untracked-and-existing, warns for tracked-but-modified, stays silent for tracked-and-clean.

**THE RULE: it can supply case SHAPES; it cannot supply case DATA that must correspond to real
state.** Paths, patterns, identifiers, expected values, anything whose truth lives in the repo
rather than in the prompt — those come from the repo. Ask for the shape, fill in the data
yourself, and derive every expectation by execution.

**And a corollary about silence.** A batch of cases that ALL come back quiet means the cases are
wrong until proven otherwise. Silence is the one result that looks the same whether you measured
something or nothing.

### Schema notes

`--schema` constrains decoding, so a malformed or incomplete object cannot be produced. It does
NOT constrain quantity unless you say so: a spec asking for 12 cases against a schema with no
`minItems` returned 2, and the reply was perfectly valid. **Put the count in the schema
(`minItems`), not in the prose** — the schema is enforced and the prose is a suggestion.

### The ledger

`logs/local_executor/dispatches.jsonl`, written by every dispatch; `npm run local:ledger` reports
it. The verdict is set afterwards by the planner (`npm run local:verdict -- <id> <verdict>`),
never by the dispatch itself — a dispatch that judged its own output would record effort as
success, and every entry would read green.

Verdicts: **accepted** (used as produced), **edited** (structure kept, substance corrected),
**rewritten** (discarded). The point is to stop writing routing rules from memory: the claim this
section corrects twice survived precisely because nothing was counting.

## Verifying quotes is the technique that made it trustworthy (2026-09-11)

The routing rules above say it cannot supply data that must match real state. One change makes a
large part of that tractable: **require verbatim quotes, then check them mechanically.**

Three dispatches used it. Asked which lane is active, it answered R7 with four supporting quotes —
all four verbatim at MASTER_ROADMAP lines 7, 10, 44 and 51. Asked to summarise the six guards, it
classified blocking-vs-advisory **6/6 correctly** and every proof quote was real. Neither result
required trusting it: the claims were checkable, so they were checked.

That is the practical form of the rule. It cannot be trusted to be right, but it CAN be asked to
make its claims falsifiable, and a falsifiable claim costs a script to verify.

### The verifier needs allow-cases too, and mine did not have them

Checking those quotes produced **two false accusations of fabrication**, both mine:

1. The model escapes backticks and dollar signs for JSON. `\`$?\`` is not byte-identical to
   `` `$?` ``, and a strict comparison called a faithful quote invented.
2. A quote can span two adjacent lines of the source. Stitching them with `\n` and dropping the
   `**` markers between is still a real quote of a real entry, and a line-at-a-time comparison
   cannot see it.

Both times the first verdict was "INVENTED" and both times the text was genuinely there. So the
verifier must strip escaping and compare against the whole entry rather than a single line —
which is the same lesson the guards taught: **a checker's false positives cost more than its
misses, because a checker that cries wolf stops being run.** Verify the verifier before scoring
the tool.

## How this page stops being the authority (2026-09-11)

Everything above is PROSE, which is the weakest thing in this repo. The claim "it enumerates
well" survived two corrections because nothing was counting. So the routing question now has a
mechanical answer and this page is demoted to commentary:

```
npm run local:ledger
```

Every dispatch records its `--kind` (extract / table / wiring / logic / prose). Every outcome is
recorded afterwards by the planner with `npm run local:verdict`. The report groups accept / edit /
rewrite by kind. **When a row there disagrees with this page, this page is wrong.**

It already does. The first six dispatches say:

| kind | n | accepted | edited | rewritten |
|---|---|---|---|---|
| extract | 3 | 2 | 1 | 0 |
| table | 2 | 0 | 1 | 1 |

Which inverts the original guess. Extraction from files you supply — *with verbatim quotes* — is
its strongest measured mode. Enumeration, which this page called its strength, has yet to produce
an accepted result. Four judged dispatches per kind are required before the report will draw any
verdict, because firing at n=2 is exactly the over-claiming that produced the sentence it is
correcting.

### The technique that makes extraction safe

`npm run local:verify-quotes -- <answer.json> --field <prop> --source-field <prop>`

Ask for verbatim quotes, then check them. It cannot be trusted to be right; it CAN be asked to
make its claims falsifiable, and a falsifiable claim costs one command to check.

The tolerances in that checker were all earned by false accusations — it escapes backticks for
JSON, and a quote may be stitched from two adjacent lines with `**` dropped. Both were called
"INVENTED" by a hand-rolled check before the text turned out to be there.
`tests/local_executor_verify_quotes.test.ts` pins the tolerances AND pins that it still rejects a
paraphrase, a fabrication, and a quote too short to mean anything — because a tolerant verifier is
one step from a rubber stamp, and a rubber stamp launders a guess into a fact.

### What is still prose, honestly

The boundaries — never delegate the oracle, it supplies shapes not data, a uniformly silent batch
means the cases are wrong — are still written rules. They are tier 5. The ledger will eventually
say whether they hold; until it has the rows, they are the best available guess and should be
read as such.
