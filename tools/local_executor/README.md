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
a genuine defect — a citation like `logs/a{ x , y }.log` truncated at the first space — that the
hand-written tests never reached. Its own guesses about those same cases were mostly wrong.

**Watch for self-narration.** When a draft starts writing "Re-evaluating...", "Wait, if I have..."
or "Re-reading the prompt:" into the code, it is reasoning in the output instead of deciding. That
draft needs rewriting, not patching — it happened in both rejected dispatches and neither was
salvageable by editing.

**Do not delegate shell.** Both hook guards were written by the planner. Every bug in them was a
quoting bug — single vs double quotes, heredoc bodies, `stash@{0}` split by a brace separator.
That is the worst possible fit for a small model, and the review cost would exceed writing it.
