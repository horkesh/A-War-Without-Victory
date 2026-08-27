# `tools/playtest/` — open items

## 1. No crash resilience (found 2026-08-26, self-inflicted repro)

A 188-turn `counterfactual` run died at turn 81. Cause was mine — I `rm -rf`'d
`tmp-playtest/` while the process was still writing into it — but the failure mode
it exposed is real and would recur on any mid-run crash:

- `FindingsRecorder` opens its run log once at construction and appends for the
  whole run. If that path becomes unwritable, `record()` throws from inside a probe
  loop and takes the whole run down.
- `mergeIntoLedger()` only runs at the very end of `main()`. A run that dies at
  turn 181 of 188 contributes **nothing** to the permanent ledger — 181 turns of
  findings discarded because the process didn't reach its last line.

Fix: wrap the run body in `try/finally`, merge into the ledger in the `finally`,
and make `record()` non-fatal (swallow + count write failures rather than throw).
A findings harness that loses its findings on failure is the one outcome it exists
to prevent.

**Do not apply while a comparison batch is running** — the three policies must
execute identical harness code to be comparable.

## 2. Electron driver not built yet — PREREQS NOW GREEN (2026-08-26)

Headless cannot see the UI. Most friction is UI friction. `run_electron.ts` is the
other half of this lane.

Launch path is **verified working** — see
`tools/playtest/evidence/20260826_ui_probe_mainmenu.png`. Three environment traps
cost an hour and are recorded so the driver handles them from line one:

1. **A worktree needs its own build.** `awwv://warroom/index.html` serves `Not Found`
   until `npm run desktop:release:check` has run IN THAT WORKTREE. `dist/` is not
   shared between worktrees.
2. **Never `firstWindow()`.** The app opens DevTools, and `firstWindow()` returns the
   DevTools window — its DOM has buttons, so the probe *looks* like it worked while
   reporting on the wrong window entirely. Select by `url().startsWith('awwv://')`
   and poll until it appears.
3. **Do NOT junction `node_modules` to another worktree.** See item 6.

**Design rule for the driver:** drive REAL DOM CLICKS, not `window.awwv.*`. Driving
IPC is just slow headless and finds nothing the headless lane cannot. The 2026-08-05
RS run made exactly this mistake — its own report records that the window sat on the
main menu the whole run and the screenshots were useless as UI evidence.

Shape: shallow but real. Fewer turns, every surface touched, screenshots at each.
First target — `op_directive_rejection`: headless proved 29 rejections carry a stored
reason with no reader in `src/ui/`; the Electron run turns that inference into a
screenshot of what the player actually sees after spending Command Authority.

## 6. Never share node_modules across worktrees (found 2026-08-26)

I junctioned this worktree's `node_modules` to the main tree's to save install time.
Mid-session it broke: `playwright/` was stripped to a bare `lib/` with no
`package.json` and `npm ls` reported empty, because the other lane was running an
install (version moved 0.9.6-alpha.1 to 0.9.9-beta.1 at the same time).

For a lane whose entire purpose is running in parallel with another agent, sharing
the dependency tree means their every install breaks this lane mid-run — including
`tsx`, so the headless harness dies too. Fixed with an isolated `npm install`.

Note `src/ui/map/node_modules` is a SEPARATE nested install with the same hazard.

## 3. Only RBiH exercised

RS and HRHB have not been run at all. HRHB especially — see the standing
`hvo_passivity_analysis` note — may behave differently enough that probes tuned on
RBiH miss things.

## 4. Dayton is never resolved — off-by-one in the driver (found 2026-08-26)

Measured, not inferred: for the desktop campaign `war_start_turn = 0` and
`DAYTON_TRIGGER_WEEK = 188`, so `shouldInitiateDayton` becomes true exactly when
`meta.turn` reaches 188 — i.e. during the LAST advance of a 188-turn run.

The driver checks `pending_dayton` at the TOP of each turn, before advancing. So the
packet is created by the final advance and the loop then exits without ever seeing
it. Every run has been ending with an unresolved Dayton menu, `game_over: false`,
and the whole endgame/verdict/cost-ledger path untested.

This is why adding `resolveDayton` to the loop changed nothing and the final state
hash stayed byte-identical.

Fix: after the loop ends, if `military.negotiation.pending_dayton` is set, resolve
it and re-run the end-of-run probes. Do NOT simply run 189 turns — that hides the
bug rather than fixing it.

## 5. Command-Authority probe still false-positives (found 2026-08-26)

The `leverAttempts` gate added earlier is not sufficient. `resolveProposal` and
`localSupport` cost NO Command Authority, so a policy that only accepts operation
authorizations reports `lever_attempts: 2` and still trips "CA never spent" — which
is what `historical` did, twice, at HIGH and MEDIUM.

Fix: count only CA-COSTING attempts (`request_op`, `stop_op`, `replace_co`,
`force_launch`, `elite_deploy`) toward the gate. Free levers must not count.

Until this lands, treat both `engine:command_authority` findings in the current
ledger as UNCONFIRMED.

---

## 7. Probe specs from the 2026-08-27 owner screenshot review — DESIGNED, NOT BUILT

The owner reviewed one screenshot and found five defects the harness missed entirely.
Four of the five are mechanically detectable; they are specified here so the classes get
caught automatically rather than needing a human to look at each screenshot.

**These are specs. Do not implement them while the instruction is record-only.**

### `ui-place-name-casing` (detectable, easy)
Scan rendered text for place-name patterns where a word after the first is lower-case:
`/\b[A-ZŠĐČĆŽ][a-zšđčćž]+ [a-zšđčćž]{3,}\b/` inside settlement/municipality labels, and
any `(all lower case)` parenthetical. Observed: "Donji dubovik (bosanska krupa)",
"Kozarska dubica". Expected: every word capitalised. Low false-positive risk if scoped to
labelled place fields rather than free prose.

### `ui-front-pair-self-reference` (detectable, medium)
A "front" whose two sides resolve to the same municipality is not a front. Parse the
priority-fronts string into `(settlement, municipality)` pairs and flag any pair where the
municipalities match — including across the 1990/RS rename map (bosanska dubica ==
kozarska dubica, bosanski novi == novi grad, and the rest). The rename table is the part
that needs care; without it this probe would miss the exact instance that prompted it.

### `ui-alliance-vs-hostile-accounting` (detectable, medium)
When the UI shows an alliance as active, assert that no allied faction's territory is
counted in a "hostile" total. Concretely: if the status bar shows ALLIED and friendly +
hostile == 100%, the hostile figure is a binary player-vs-rest computation and is wrong.
Must track a CHANGING relationship — the same campaign moves from "close coordination"
to "strained" within nine turns.

### `ui-font-family-drift` (detectable, easy)
Per surface, collect `getComputedStyle(el).fontFamily` over visible text nodes and report
the distinct count and the outliers. A surface using a display serif while its siblings
use monospace is the signal. Needs an allowed-set once the typographic system is decided,
otherwise it reports intentional contrast as a defect.

### Aesthetic quality — NOT detectable
"Screams AI slop design" is a judgement no probe will make. The only mechanism that
catches it is a human looking at the screen. This is an argument for the UI lane
producing a screenshot contact sheet per run for review, not for a cleverer probe.

### The general lesson
Every one of these was visible in a screenshot the harness had already captured and I had
already looked at. The probes were checking for *broken* things — empty surfaces, dead
controls, clipped text, error banners — and none of these five are broken in that sense.
They are **wrong content rendered correctly**, which is a whole detection category the
probe set does not cover.
