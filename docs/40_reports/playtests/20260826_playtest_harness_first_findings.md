# Playtest harness — build report and first findings

**Date:** 2026-08-26
**Lane:** playthrough / friction discovery (record-only), run in parallel with the Codex master-roadmap lane
**Branch / worktree:** `lane/playtest-harness` @ `F:/AWWV-worktrees/playtest-harness`
**Status:** harness built and running; `historical` 188w complete; `counterfactual` 188w complete to t180 at time of writing; `passive` queued

> **Record-only lane.** Nothing here was fixed. No engine source was touched. This
> document is evidence, not a change log, and a finding appearing here is not a claim
> that anyone has triaged it.

---

## 1. What was built

`tools/playtest/` — a playthrough harness that drives the real player-decision seam
under a swappable **policy**, runs **probes** every turn, and records findings into a
deduplicated **ledger**.

| File | Role |
| --- | --- |
| `types.ts` | `Finding` / `Policy` / `Probe` / `RunConfig` contracts |
| `findings.ts` | Recorder — fingerprint, dedup, cross-run merge |
| `policies.ts` | `historical`, `counterfactual`, `staff`, `passive`, `seeded:<n>` |
| `probes.ts` | 11 probes, each encoding a defect class this repo has already produced |
| `run_headless.ts` | Driver |
| `rollup.ts` | Ledger → Markdown |
| `TODO.md` | Known gaps in the harness itself |

```bash
npm run playtest -- --faction RBiH --policy counterfactual --turns 188
npm run playtest:rollup
```

Built on `tools/ai_play/president_playthrough.ts` (the determinism-proven seam), not
replacing it. Output is shaped to slot into `TEMPLATE.md`'s convention rather than
inventing a second one.

### What this lane can and cannot see

**Can:** engine defects, malformed event data, dead levers, deadlocks, missing
player-facing text, turn cost, resource-economy failures.

**Cannot:** anything about the UI — layout, clipping, discoverability, whether a
value is rendered at all. **Most friction is UI friction.** The headless driver is
the cheap high-volume half. Its finding count must not be read as coverage.

### Horizon discipline

Runs are **188 turns**. The desktop campaign has exactly one start
(`DesktopScenarioKey` is a single-member union, `'apr_1992'`); the retired
`apr1992_definitive_{40,52,104}w.json` files belong to the scenario-runner pipeline,
which this harness does not use. Anything under 188 prints a build-loop warning and
sets `full_campaign: false` in its summary, so a short run can never be quoted as
coverage. Early 52-turn results from this session were withdrawn on that basis.

---

## 1a. 🔴 CRITICAL — the desktop app cannot start a campaign

**Confidence: certain.** Reproduced by hand and then independently by the UI driver.
Screenshot: `tools/playtest/evidence/20260826_ui_campaign_start_blocked.png`.

Launch the app, click **New Campaign**, click any faction. The player is shown, in
red, on the Choose Your Side screen:

> **Invalid decisionMode. Use emergent or historical.**

The picker stays up. No campaign starts. This is every faction, every launch.

### Mechanism

The 2026-08-23 case-file commit (`72062041c`, plan Task 3) extended
`StartNewCampaignPayload` with `decisionMode: 'emergent' | 'historical'` and added
validation that rejects an unknown mode:

```js
// src/desktop/electron-main.cjs:2087-2091
if (scenarioKey !== undefined && scenarioKey !== 'apr_1992') { ... }   // tolerates undefined
if (decisionMode !== 'emergent' && decisionMode !== 'historical') {     // does NOT
    return { ok: false, error: 'Invalid decisionMode. Use emergent or historical.' };
}
```

`decisionMode` has no `undefined` escape hatch, unlike `scenarioKey` directly above it.

There are **two** campaign-start callers. The commit updated one:

| Caller | Sends `decisionMode`? | Is it the desktop entry point? |
| --- | --- | --- |
| `src/ui/map/components/MainMenu.tsx` (case-file flow) | yes | **no** |
| `src/ui/warroom/warroom.ts:508` (side picker) | **no** — `{ playerFaction, scenarioKey }` | **yes** |

Electron's main window loads `awwv://warroom/index.html`
(`electron-main.cjs:1042,1066`), so the un-updated caller is the one every player hits.

### Why no existing gate caught it

- **Headless cannot see it.** `president_playthrough.startCampaign` calls
  `desktop_sim.startNewCampaign` directly, bypassing the IPC validation layer that
  produces this error. All three 188-turn runs passed while the shipped app could not
  begin a game.
- `tests/ui/warroom_launch_screen_contract.test.ts` pins the launch screen's *layout*
  (`mm-stage`, `--mm-scale`, media queries) and never clicks anything.
- The case-file plan's own tests target the map app's boot, not the warroom's.

**This is the finding that justifies the UI lane existing.**

## 1b. The case-file opening flow is unreachable from the desktop launch path

**Confidence: high.** Traced empirically — launch → `main-menu` → `side-picker`,
and `MainMenu.tsx` never renders in the Electron app.

The 2026-08-23 plan states its goal as *"Replace the instant faction picker with a
functional, accessible case-file opening."* The warroom's `showSidePicker()` **is** an
instant faction picker, and it is what the desktop app still shows. The landing →
factions → dossier → mode sequence was built in `src/ui/map/components/MainMenu.tsx`,
which renders only when the map app boots to `appScreen === 'mainMenu'` (`App.tsx:529`)
— a state the packaged desktop path does not reach.

Both surfaces are live and maintained, so this is not dead code on either side. It
needs a ruling: is the warroom shell the intended entry (and the case-file flow is for
the map-standalone context), or is the warroom menu shadowing the intended opening?
1a is a bug under either reading.

## 2. Findings — engine and data

### 2.1 The president faces almost no decisions

**Confidence: high.** Measured identically at 52 and 188 turns.

| Policy | Decisions | Turns | Per 10 turns |
| --- | --- | --- | --- |
| `historical` | 26 | 188 | **1.4** |

The president decides roughly **once every seven weeks**. For a surface whose stated
premise is that the player governs by deciding, the overwhelming majority of the war
is pressing Advance with nothing to weigh.

Whether that is correct pacing is a **design call, not a defect** — but it was not
previously measured, and it cannot be argued about until it is. Probe:
`decision-cadence`, floor configurable via `PLAYTEST_DECISION_FLOOR`.

### 2.2 The three major peace plans show the player no stakes

**Confidence: high.** Reproduced under both `historical` and `counterfactual`.

- `vance_owen_plan_1993`
- `owen_stoltenberg_plan_1993`
- `contact_group_plan_1994`

No option on any of the three carries `dimension_shifts`, so the decision modal can
quantify nothing. The three largest political decisions of the war are presented as
unlabelled choices; the player learns the cost only afterwards. Probe:
`option-stakes-gap`.

### 2.3 Operation directives are rejected with reasons the player never sees

**Confidence: high — 28 measured instances in a single campaign.**

Under `counterfactual` (which orders attacks at enemy-held OSIDs every turn), the
engine rejected 28 directives, each time writing
`corps_command[id].op_directive_rejection = { target_osid, reason, turn }`.

This confirms and **quantifies** the 2026-08-05 Pyrrhic panel finding: the field is
computed, persisted, projected to the client, and read by nothing under `src/ui/`.
The president spends Command Authority, receives nothing, and is told nothing. Probe:
`discarded-explanation`.

Previously this was a code-reading observation. It is now a count.

### 2.4 Four recurring leadership-gesture events have no authored historical default

**Confidence: high on the fact; the interpretation is a question, not a defect.**

- `address_to_nation_rbih` (4 options)
- `visit_to_front_rbih` (5 options)
- `strategic_posture_review_rbih` (4 options)
- `decorate_a_unit_rbih` (3 options)

Plus, under `counterfactual` only: `csq_third_party_mediation_offered`.

Without `historical_default_response_id` the R8 choice policy cannot rank these, so a
"historical" playthrough is silently guessing. **However**, history genuinely offers
no default for "did the president visit the front in week 44" — so this is plausibly
by design. Recorded as `kind: question`, not `bug`. Needs a ruling: either author a
default or record explicitly that none exists.

### 2.5 Command Authority cannot fund an aggressive president

**Confidence: medium. Real signal, unrealistic policy.**

Of 1,813 raw findings under `counterfactual`, **1,775 (~97%) are
`insufficient_command_authority` refusals** — 891 on `replace_co`, 876 on
`request_op`.

The caveat is large: `counterfactual` attempts both levers on every corps every turn,
which no human would do. That inflates the count enormously. What the number does
establish is the **ceiling** — CA income supports only a small fraction of continuous
lever use. Whether that ceiling is correctly placed is a balance question this lane
cannot answer.

### 2.6 The historical policy found only two operation authorizations in the whole war

**Confidence: low — open question, not a finding.**

`historical` reported `lever_attempts: 2` across 188 turns, both proposal
acceptances. Either RBiH genuinely receives almost no pre-planned operation
authorizations, or `acceptOperationAuthorizations` matches too narrowly
(it filters `HISTORICAL_OP:` and `APPROVE_OP:` prefixes). **Not yet investigated.**

---

## 3. Findings — defects in the harness itself

Recorded with the same seriousness as engine findings. Three of these would have
produced false engine findings if left unexamined.

### 3.1 Dayton is never resolved — driver off-by-one 🔴

**Measured, not inferred.** For the desktop campaign `war_start_turn = 0` and
`DAYTON_TRIGGER_WEEK = 188`, so `shouldInitiateDayton` becomes true during the
**last** advance of a 188-turn run. The driver checks `pending_dayton` at the top of
each turn, so the packet is created and the loop exits without ever seeing it.

Every run so far ended with an unresolved Dayton menu, `game_over: false`, and the
entire endgame / verdict / cost-ledger path **untested** — while the summary read
`turns_played: 188, full_campaign: true`.

This is why adding `resolveDayton` to the loop changed nothing and the final state
hash stayed byte-identical across the fix.

**Near-miss:** this was one step from being reported as an engine finding
("the campaign runs the full war and Dayton never comes"). It is not. It is the loop.

**Fix:** resolve after the loop ends, then re-run end-of-run probes. Do *not* run 189
turns — that hides it.

### 3.2 Command-Authority probe false-positives 🟠

`historical` tripped "CA never spent" (HIGH) and "CA at cap" (MEDIUM). Both are
noise. The policy never reaches for a CA-costing lever, so of course nothing is spent.

A first fix gating on `leverAttempts` was **insufficient**: `resolveProposal` and
`localSupport` cost no CA, so `lever_attempts: 2` passed the gate anyway.

**Fix:** count only CA-costing levers (`request_op`, `stop_op`, `replace_co`,
`force_launch`, `elite_deploy`).

**Both findings are marked UNCONFIRMED in the ledger pending this fix.**

### 3.3 Fingerprint normalizer splits one defect into two 🟡

`insufficient_command_authority (15.5/25)` and `(20/25)` produce **different**
fingerprints — `(#.#/#)` vs `(#/#)` — because the normalizer replaces digit runs
without unifying decimals. One defect, two ledger lines, both occurrence counts
understated.

**Fix:** normalize decimals and integers to the same token.

### 3.4 No crash resilience 🟠

`mergeIntoLedger()` runs only at the last line of `main()`. A run that dies at turn
181 of 188 contributes **nothing** to the permanent ledger. Demonstrated
accidentally: a run died at t81 and lost everything.

A findings harness that loses its findings on failure is the one outcome it exists to
prevent.

**Fix:** merge in a `finally`; make `record()` non-fatal.

### 3.5 `counterfactual` was measuring political agency only

Found and fixed during the build loop. The policy fired `replace_co` but never
ordered an attack — the exact blind spot that made the 2026-08-05 RS run report
`operations_launched: 0` without saying so. Now targets enemy-held OSIDs. Finding
2.3 above exists **because** of this fix.

---

## 4. Withdrawn

- **All 52-turn results.** A run stopping at week 52 never reaches Srebrenica, Storm,
  Deliberate Force or Dayton — the window where attrition compounds and where 20 of 24
  RS brigade destructions fall. Quoting them was the 40w false-green in a new costume.
- **"Command Authority never spent" / "at cap"** — see 3.2, pending fix.

---

## 5. Open items

Carried in `tools/playtest/TODO.md`:

1. Crash resilience (3.4)
2. Electron driver not built — the UI half of the lane is entirely unexercised
3. Only RBiH run; RS and HRHB untouched (HRHB especially, given `hvo_passivity_analysis`)
4. Dayton off-by-one (3.1)
5. CA probe gate (3.2)
6. Fingerprint normalizer (3.3)
7. Investigate `lever_attempts: 2` (2.6)

**Fixes are deliberately not applied while a comparison batch is running** — all
policies in a batch must execute identical harness code to be comparable.

---

## 6. Method note

Policies and probes are independent axes. Five policies × eleven probes from six
files, and adding either is a small local edit. **Adding a probe is how a one-off
discovery becomes a permanent guard** — finding 2.1 began as an unstructured
observation during the build loop and is now a check every future run inherits.

Runs are deterministic: no `Math.random()` anywhere in `tools/playtest/`; `seeded`
uses an explicit mulberry32 whose seed is recorded. The ledger carries no wall-clock
timestamps and sorts by (severity, surface, fingerprint), so a re-run that finds the
same things produces a byte-identical file — a clean `git diff` after a run means
nothing new broke.
