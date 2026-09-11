# Guards

Six hooks. Three refuse an action; three warn about one. Each exists because a specific thing went
wrong, usually more than once, and each says so in its own header — read the file before changing
it, because the header is the argument for its existence.

Registered in `.claude/settings.json`. `tests/hook_registry.test.ts` pins that every registered
hook exists, is reachable by a relative path, survives an empty payload, and that the blocking set
is exactly the three below.

## The three that refuse

| guard | refuses | instead | the incident |
|---|---|---|---|
| `guard_stash_pop.sh` | `git stash pop/apply/drop` with no `stash@{N}`, and `git stash clear` outright | name the ref, or `git checkout HEAD -- <file>` | 2026-08-31 and again 2026-09-10: a stray pop took a foreign stash 22 entries deep. The second time, the warning was written **in the stash message itself**, and was read and ignored. |
| `guard_pipe_exit_code.sh` | reading `$?` after a pipeline ending in a pure display filter (`tail`, `sed`, `head`, `cut`, `wc`…) | `cmd > /tmp/out.log 2>&1; rc=$?`, or `${PIPESTATUS[0]}`, or `set -o pipefail` | 2026-08-26 twice, 2026-09-03 again: a build that died with MODULE_NOT_FOUND reported 0, and a stale `dist` was served to a capture rig. This guard was ADVISORY for all three. |
| `guard_inline_script.sh` | a multi-line script passed to `node -e` / `python -c` | a script file, a one-liner, or `node - <<'EOF'` | 2026-09-11: in this harness the multi-line form exits 0 with empty stdout AND empty stderr. Three turns were spent reading that silence as a real empty result. |

`grep` is deliberately **absent** from the pipe guard's filter list: `cmd | grep -q x; if [ $? -eq 0 ]`
asks grep a question and reads grep's answer, which is legitimate. Only filters with no meaningful
status are refused.

## The three that warn

| guard | warns about | instead | the incident |
|---|---|---|---|
| `guard_scope_drift.sh` | spending a 188-week run or a threshold blessing | check it against `.claude/current-lane.txt`; queue a new lane rather than following it | 2026-08-26: a session opened on a nine-item lane needing zero runs, followed a legitimate finding, and spent three 188-week runs and five failed hypotheses elsewhere — completing 1 of 9. No single step was wrong, which is why nothing stopped it. |
| `guard_lookup_absence.sh` | searching for a field pinned to a literal (`field = 'value'`) | search the bare `field =` and read every hit | 2026-08-26: `readiness = 'active'` returned 2 hits and produced "nothing restores readiness". The real write was `formation.readiness = deriveReadinessState(formation)`, and the wrong hypothesis became a plan prerequisite. |
| `guard_dirty_citation.sh` | reading a file that is modified or untracked, before citing it | `git show HEAD:<file>`, and say which ref you read | 2026-08-26: a packet cited `pre_planned_operations.ts:1163` "[SOURCE-VERIFIED at HEAD]" from a tree that was +69/-5. Every seat that re-checked landed in unrelated code. |

`guard_scenario_artifacts.sh` is a seventh, separate thing: it routes scenario-run interpretation
to the specialist seat. It is advisory and shares the matching rule below.

## One matching rule, because three guards got it wrong separately

`lib/command_segments.sh` answers "is this text a command, or prose ABOUT a command?" — heredoc
bodies removed, quoted text blanked, split on shell separators. **A real invocation begins a
segment; a prose mention never does.**

It is shared because two guards shipped the same bug: `guard_stash_pop` denied
`echo 'git stash pop is dangerous'` on its first day, and `guard_scope_drift` fired on a quoted
mention — which then chained the orchestrator hook into demanding an expert analysis of a run that
never happened.

Braces are deliberately NOT separators: they would split `stash@{0}` in half and make the stash
guard deny the explicit-ref form it exists to encourage.

## If you are adding one

1. State the failure as a predicate over a concrete ACTION, not as advice.
2. Find the earliest point that predicate is decidable.
3. Install at the strongest tier available there — refusing beats warning; a warning that is read
   and stepped over is a log entry, and the pipe guard proves it three times.
4. **Write the ALLOW cases first.** Every defect in these guards was found by an allow-case, never
   by a deny-case. A guard that blocks real work gets switched off, and a switched-off guard
   protects nothing.
5. Prove it fires by mutation, and prove the escape route works. An escape route nobody verified
   is how a guard ends up bypassed.
6. Record which tier you actually reached, so nobody believes a written rule is protecting them.

The tier ladder and the full conversion recipe are in `.claude/napkin.md` under Curation Rules.

---

*Descriptions in the two tables above were drafted by the local executor from the guard sources,
and every "blocking" classification and supporting quote was verified mechanically against the
files before this page was written — see `tools/local_executor/README.md`.*
