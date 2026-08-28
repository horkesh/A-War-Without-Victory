# Packaged Probe Recovery Implementation Plan

> **ARCHIVED — DO NOT EXECUTE:** This rejected instrumentation plan is retained only as negative evidence. Continuing authority is limited to the separately locked alternate-proof discovery contract in section 3.

**Historical rejected goal:** Make the existing packaged-runtime probe bounded and phase-observable so one authorized run yields one of eight exact diagnostic classes without changing the game engine or normal desktop runtime. This goal is closed and grants no authority.

**Historical rejected architecture:** Keep the existing executable, runtime-probe branch, manifest, and validation owner. Add deterministic probe-only phase markers around the current linear awaits in `electron-main.cjs`; make the existing wrapper forward output live, retain the last marker, enforce one 900,000 ms executable watchdog, and terminate the full process tree on timeout. An external coordinator owns the 1,200,000 ms pre-sentinel and 960,000 ms post-sentinel clocks. This rejected design is retained only as negative evidence and is not executable authority.

**Historical rejected tech stack:** Electron main process (CommonJS), Node.js 22 wrapper (ES module), Vitest contract tests, Windows `taskkill.exe` for bounded packaged-process-tree termination.

**Terminal status:** Instrumentation is CLOSED/REJECTED at the valid sole R2 RED. The frozen matrix
and implementation tasks below are retained as negative evidence and historical design, not
executable authority. No production edit, GREEN, syntax check, diff verification, package/probe
invocation, candidate, or R3 occurred. Packaged invocation count is zero; the consumed RED and
unused package authority are nontransferable. Auxiliary recovery may proceed only to a
separately locked, docs-only/read-only alternate-proof discovery after this receipt closes.

---

## 1. Authority and non-goals

Owner authorization on 2026-08-28 opens one auxiliary recovery lane because P2B's mandatory
clean-base packaged probe ended **NO VERDICT**. Orchestrator owns sequencing and scope; Architect
owns symbol/hunk boundaries. Platform Specialist is the sole implementation owner. Build Engineer,
Architect, and QA are independent reviewers; none may co-implement. Product Manager owns every
lock transition and the living-audit update.

The rejected instrumentation lane:

- is recorded under the `RE` safety-control namespace only;
- is outside RE's seven outcomes and eight packets;
- earns no RE completion credit;
- does not automatically or retroactively satisfy P2B's clean-base or candidate probe;
- does not authorize P2B implementation, P3, long campaigns, calibration, performance work, or
  ordinary desktop/runtime changes.

Its historical implementation allowlist was:

- `src/desktop/electron-main.cjs`
- `tools/desktop_packaged_runtime_probe.mjs`
- `tests/desktop_packaged_runtime_probe.test.ts`

The existing denylist remains binding:

- `data/scenarios/**`
- `data/calibration/**`
- `data/source/calibration/**`
- `data/reference/**`
- `data/refs/**`
- `docs/10_canon/FORAWWV.md`

Also prohibited: normal IPC or state changes, application lifecycle changes outside the existing
probe terminal branch, map-server implementation changes, UI changes, build configuration or
package-script changes, a second launch path, a new service/module/flag, retry logic, timestamps,
random identifiers, partial simulation output, a long run, or diagnosis/fix of gameplay behavior.

## 2. Evidence and bounded hypothesis

The authoritative incident receipt remains in the living audit and must not be rewritten. Platform
inspection found that `tools/desktop_packaged_runtime_probe.mjs` currently has no watchdog, full-tree
termination, live stdout/stderr forwarding, phase receipt, or partial progress evidence; its
manifest exists only after the entire in-app sequence finishes. Build inspection confirmed the
chain `desktop:package:probe` → `desktop:package:dir` → wrapper and identified unbounded observation
boundaries at `sim.startNewCampaign`, `startMapServer`/`server.listen`, renderer
`executeJavaScript`/IPC in `waitForTacticalMapInteraction`, and the wrapper's wait for child
`close`. Existing tests assert source contracts but cannot identify the last reached runtime phase.

The exact base also emits the existing Army-HQ manual-chunk circular-dependency warning. A
non-ancestor commit, `98f54ccb4`, records a packaged temporal-dead-zone error, `Cannot access 'ir'
before initialization`. That is the leading trigger **hypothesis**, not proof of this hang and not
authority to edit chunking, UI code, build configuration, or normal runtime. The one-shot phase
receipt decides where any subsequent packet would begin; this packet does not guess or repair the
hypothesis.

## 3. Exact lock sequence and amendment

### Lock 1 — historical authorization transition

The historical Lock 1 was:

- task: `RE-PROBE-RECOVERY-TRANSITION`
- packet: `authorize-auxiliary-packaged-probe-recovery`
- base: `c57ecffaf4774b9801d8ef6f4774463f7c0ef52e`
- exact 14-document allowlist: current-lane declaration; lock; RE plan; recovery plan; living
  audit; calibration master; reports index; master roadmap; command board; plans index; docs index;
  active-task governance; project ledger; and knowledge ledger
- long runs: false
- out-of-scope implementation: stop-and-queue

Orchestrator, Architect, Process QA, and Reports Custodian reviewed that 14-file staged transition
before its single docs commit. It is retained only as custody history.

### Rejected Lock 2 and rejected final Lock 2 R2 (historical)

The first Lock 2, `RE-PROBE-RECOVERY-INSTRUMENTATION` /
`one-shot-packaged-runtime-phase-localization`, was rejected at specification review before a
candidate commit or packaged invocation. Final R2 then used the historical lock below:

The docs-only amendment `RE-PROBE-RECOVERY-AMENDMENT` /
`record-rejected-lock2-and-bind-final-instrumentation-attempt`, based on
`9d23044e1253bbd0d5b66e2ee45cb7081d7e884d`, committed before Product Manager drafted the final
Lock 2 R2. R2 used a fresh exact-base lock and the full successor-lock review/re-pin/check custody:

- task: `RE-PROBE-RECOVERY-INSTRUMENTATION-R2`
- packet: `behavior-first-coordinator-and-wrapper-settlement`
- base: the exact amendment commit (no placeholder may remain)
- exact allowlist:
  - `src/desktop/electron-main.cjs`
  - `tools/desktop_packaged_runtime_probe.mjs`
  - `tests/desktop_packaged_runtime_probe.test.ts`
  - `docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json`
  - `docs/plans/2026-08-28-packaged-probe-recovery-plan.md`
  - `docs/40_reports/audits/20260826_RE_LEAN_ENGINE_INTEGRITY_EXECUTION.md`
- same denylist as Lock 1
- long runs: false; `maximum_clean_pairs_per_exact_commit: 1` is an inert checker-required schema
  value; actual campaign run/pair budget is zero, and the single packaged invocation is not a clean
  pair
- one packaged invocation on the exact candidate commit; no retry
- out-of-scope implementation: stop-and-queue

R2 reached its valid sole RED and was rejected there. Its RED is consumed; its unused package
authority is nontransferable. No production file was edited, no GREEN/syntax/diff/package/probe was
run, no candidate exists, and no R3 is authorized. The six paths, symbol/hunk boundaries, clocks,
eight classes, LOC caps, and frozen matrix remain historical negative evidence only.

### Lock 3 — historical intended receipt, not reached

This intended post-invocation lock was never reached because R2 stopped at RED and packaged
invocation count remained zero:

- task: `RE-PROBE-RECOVERY-RECEIPT`
- packet: `record-one-shot-packaged-probe-recovery-result`
- base: the exact Lock-2-R2 candidate commit that consumed the invocation
- exact five-file allowlist: `docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json`, this recovery
  plan, `docs/40_reports/audits/20260826_RE_LEAN_ENGINE_INTEGRITY_EXECUTION.md`,
  `src/desktop/README.md`, and `docs/PROJECT_LEDGER.md`
- long runs false; checker-required maximum clean pairs `1`, actual run/pair budget zero
- out-of-scope implementation: stop-and-queue

These retained Lock-3 terms are historical only and authorize no probe, remediation, P2B restart,
or P3 work.

### Surviving alternate-proof discovery contract

After the zero-execution stop receipt closes, Product Manager may draft a separate fresh exact-base
docs-only lock only for:

- task: `RE-PACKAGED-PROOF-ALTERNATE-DISCOVERY`
- packet: `select-no-instrumentation-p2b-proof-route`
- owners: Technical Architect, Orchestrator, Platform, Build, QA, and Process
- execution: read-only inspection and docs-only receipt; no run

The discovery must return exactly one result: (a) a zero-in-app-instrumentation external proof route
that preserves every P2B obligation; (b) a separately scoped root-cause-remediation prerequisite
with exact files, tests, and required authorization; or (c) an explicit P2B blocker. It authorizes
no code or test edit, build, package, Electron/probe execution, TDZ/chunk fix, or R3. Any route beyond
discovery requires its own exact-base reviewed lock and authority.

### Historical instrumentation custody sequence — not executable

The following sequence records how the rejected instrumentation locks were governed. It grants no
current transition, implementation, test, or run authority.

Lock 1 is the bootstrap transition and uses this exact order:

1. Product Manager stages the complete 14-document synchronized transition, including Lock 1.
2. Orchestrator, Architect, Process QA, and Reports Custodian review the exact staged bytes and
   staged SHA-256 identities.
3. The coordinator re-pins the existing worktree-local governance hook to the accepted Lock-1
   bytes/hash.
4. Run the existing working-tree and staged-scope checks against that pin; both must pass.
5. Commit the reviewed transition. No Lock-2 payload edit is permitted during bootstrap.

For successor amendment → Lock 2 R2 and Lock 2 R2 → Lock 3 custody, use this order without overlap:

1. Product Manager proves a clean HEAD and drafts only the successor lock against that exact HEAD.
2. Orchestrator, Architect, and Process QA review the exact proposed lock bytes and SHA-256.
3. The coordinator re-pins the existing worktree-local governance hook to those accepted exact
   bytes/hash.
4. Run the existing working-tree and staged-scope checks; both must accept the new pin and exact
   allowlist.
5. Only then may the allowlisted payload files be edited.

Lock 3 is not a retrospective formality: its lock bytes must be reviewed and re-pinned before any
receipt, `src/desktop/README.md`, or ledger edit. A payload edit before pin acceptance invalidates
custody and stops the lane.

## 4. Historical rejected terminal and observability contract

Sections 4–6 record the superseded R2 design only. They grant no current classification, receipt,
implementation, P2B-transition, or Architect-decision authority; the terminal R2 receipt and the
fresh-lock alternate-discovery contract in section 3 control all continuing work.

| Boundary | Current evidence | Current bound | Required recovery behavior |
|---|---|---:|---|
| npm root/package build | npm/electron-builder output | none | coordinator owns 1,200,000 ms from npm-root start to exact wrapper sentinel |
| wrapper start | no explicit receipt | none | first direct-main observable action emits exact sentinel with LF; coordinator switches to 960,000 ms fail-safe |
| packaged executable spawn | no explicit phase receipt | none | wrapper arms its 900,000 ms child watchdog only from the child process `'spawn'` event, never from `spawn()` return; first in-app row is `probe-enter` |
| `sim.startNewCampaign` | no progress marker | none | fixed `sim-start-begin/end` rows |
| `startMapServer` / `server.listen` | no probe-mode server marker | none | fixed `map-server-listen-begin/end` rows; do not change server |
| route inventory fetches | final manifest only | individual HTTP fetch 5 s | fixed `route-fetch-begin/end` rows; keep current fetch behavior |
| main/operational/sandbox window load | final manifest only | 15 s per `waitForWindowLoad` | fixed named `*-begin/end` rows; keep current waits |
| tactical interaction `executeJavaScript` | final manifest only | none | fixed named interaction `*-begin/end` rows; outer watchdog remains final bound |
| desktop-session readiness | renderer promise only | nominal 5 s polling | fixed named session-ready `*-begin/end` rows; no UI/session change |
| state/turn-report/reaction pushes | final manifest only | several existing 5 s waits | deterministic phase markers; no IPC or payload change |
| endgame window/DOM | final manifest only | existing load and polling bounds | fixed named `*-begin/end` rows; no UI change |
| manifest write | only at successful end | none needed | fixed `manifest-write-begin/end` rows; preserve exact manifest schema and validator |
| executable termination / child `close` | wrapper waits indefinitely | none | wrapper 900,000 ms spawn-to-close watchdog, one full-tree kill, stable terminal receipt; coordinator 960,000 ms post-sentinel fail-safe owns wrapper failure/race margin |

The wrapper's first direct-main observable action must be this exact line, including the trailing LF:

```text
AWWV_DESKTOP_RUNTIME_PROBE_WRAPPER_STARTED {"schema_version":1}
```

The external coordinator owns the npm root. Its 1,200,000 ms pre-sentinel timer starts with the
single `npm.cmd run desktop:package:probe` invocation. Receipt of the exact sentinel atomically
cancels that timer and starts one 960,000 ms post-sentinel fail-safe. The wrapper independently
arms one 900,000 ms watchdog only from the child process `'spawn'` event, never from `spawn()`
return. No clock extends, restarts, races into a second classification, or authorizes retry.

Terminal settlement has one owner and this precedence:

The 5,000 ms cleanup values are Architect-supplied from the existing
`map_transition_profile` `closeElectronApplication` path, four UI-harness precedents, and the
2026-05-09 Windows process-cleanup report. They are cleanup bounds only, never classification time.

1. A valid wrapper terminal settles the diagnostic class. The coordinator records it and never
   reclassifies it. Atomically cancel the 960,000 ms classification fail-safe and freeze the class.
2. After a valid wrapper terminal, allow exactly 5,000 ms for natural npm-root exit. If the root is
   still alive, kill its full tree once and record `post_terminal_cleanup_forced: true` without
   changing class. Verify exit under a separate 5,000 ms cleanup-verification bound. Failure to
   verify exit records `post_terminal_cleanup_failure: true`; it is a custody/cleanup failure, not
   a ninth diagnostic class.
3. If npm root closes and all captured output drains before any valid wrapper terminal, cancel the
   960,000 ms timer and let the coordinator settle exactly one receipt using the table below with
   `wrapper_terminal_present: false`.
4. The 960,000 ms fail-safe may settle only while npm root is alive and no wrapper terminal has
   settled. It records `coordinator_fail_safe_triggered: true`, classifies from the marker stream,
   emits one coordinator terminal receipt with `wrapper_terminal_present: false`, and kills the npm
   tree once.

The settlement gate is atomic. Wrapper terminal observation wins if present in captured output
before drained npm close settlement; otherwise drained close wins before the fail-safe. A settled
class is immutable. Wrapper-terminal observation, drained npm close, or coordinator fail-safe
settlement cancels the classification timer; cleanup timers never classify.

Recovery classification is exactly:

| Diagnostic class | Required facts |
|---|---|
| **PACKAGE_FAILURE** | before sentinel, captured npm output/exit positively proves `desktop:package:dir` failed and the wrapper command was never entered |
| **PACKAGE_NO_VERDICT** | sentinel is absent when the 1,200,000 ms timer fires; record the last proven npm stage and do not call it a package hang without positive proof; kill npm tree once |
| **NONREPRODUCIBLE_GREEN** | child closes with code 0 before cutoff and the unchanged existing full-manifest validation passes |
| **LOCALIZED_FAILURE** | a valid ordered marker stream exists, then before cutoff the child exits nonzero, the manifest is malformed/invalid, or existing validation fails |
| **PRE_MARKER_FAILURE** | executable spawn/error/nonzero occurs before the first valid marker; package failure is excluded into `PACKAGE_FAILURE` |
| **LOCALIZED_NO_VERDICT** | wrapper watchdog or coordinator post-sentinel fail-safe occurs with a valid marker stream; record localization, kill the owning full tree once, and exit 124 where wrapper owns termination |
| **PRE_MARKER_NO_VERDICT** | wrapper watchdog or coordinator post-sentinel fail-safe occurs without any valid marker; kill the owning full tree once and exit 124 where wrapper owns termination |
| **INSTRUMENTATION_INVALID** | marker JSON/prefix/phase/sequence is malformed, duplicated, skipped, or out of order; this class takes precedence over localized failure/no-verdict interpretation |

Before-sentinel npm nonzero is not automatically `PACKAGE_FAILURE`. If captured output proves
packaging completed or wrapper entry occurred but the sentinel is absent, classify
`INSTRUMENTATION_INVALID`. Any other before-sentinel exit lacking positive package-failure proof is
also `INSTRUMENTATION_INVALID`. After sentinel, drained npm close with no wrapper terminal is
`LOCALIZED_FAILURE` for a valid marker stream plus nonzero result, `PRE_MARKER_FAILURE` for nonzero
before any marker, and `INSTRUMENTATION_INVALID` for an invalid stream or a zero exit missing its
required terminal. The post-sentinel fail-safe yields `LOCALIZED_NO_VERDICT` for a valid stream,
`PRE_MARKER_NO_VERDICT` for no marker, or `INSTRUMENTATION_INVALID` for an invalid stream.

The rejected design required every class to stop. Its conditional `NONREPRODUCIBLE_GREEN` route to
Lock 3 or a fresh P2B lock was never reached and is now superseded; it grants no current transition
authority. P2B remains held pending the separately locked alternate-proof discovery.
For a valid stream plus child nonzero, malformed or invalid manifest, or existing validation failure before cutoff, the class is
`LOCALIZED_FAILURE`, with `last_observed_marker`, `last_completed_stage`,
`next_expected_marker`, exact child/wrapper result, error, and manifest presence/validation recorded.

## 5. Historical rejected deterministic phase-marker protocol

Add one probe-only emitter adjacent to the existing runtime-probe helpers in
`src/desktop/electron-main.cjs`:

```js
function emitRuntimeProbePhase(sequence, phase) {
  if (!RUNTIME_PROBE_MODE) return;
  process.stdout.write(
    `AWWV_DESKTOP_RUNTIME_PROBE_PHASE ${JSON.stringify({ sequence, phase })}\n`,
  );
}
```

Rules:

- Object key order is literal `sequence`, then `phase`.
- Each phase uses the following explicit unique integer constant and stable ID; there is no runtime
  counter or event-derived ordering:

| Sequence | Phase ID | Sequence | Phase ID |
|---:|---|---:|---|
| 1 | `probe-enter` | 2 | `required-files` |
| 3 | `sim-start-begin` | 4 | `sim-start-end` |
| 5 | `map-server-listen-begin` | 6 | `map-server-listen-end` |
| 7 | `map-base-resolve-begin` | 8 | `map-base-resolve-end` |
| 9 | `route-fetch-begin` | 10 | `route-fetch-end` |
| 11 | `main-window-load-begin` | 12 | `main-window-load-end` |
| 13 | `operational-window-load-begin` | 14 | `operational-window-load-end` |
| 15 | `operational-interaction-begin` | 16 | `operational-interaction-end` |
| 17 | `operational-session-ready-begin` | 18 | `operational-session-ready-end` |
| 19 | `sandbox-window-load-begin` | 20 | `sandbox-window-load-end` |
| 21 | `sandbox-interaction-begin` | 22 | `sandbox-interaction-end` |
| 23 | `operational-state-push-begin` | 24 | `operational-state-push-end` |
| 25 | `operational-turn-report-push-begin` | 26 | `operational-turn-report-push-end` |
| 27 | `operational-renderer-reaction-begin` | 28 | `operational-renderer-reaction-end` |
| 29 | `sandbox-state-push-begin` | 30 | `sandbox-state-push-end` |
| 31 | `sandbox-turn-report-push-begin` | 32 | `sandbox-turn-report-push-end` |
| 33 | `endgame-window-load-begin` | 34 | `endgame-window-load-end` |
| 35 | `endgame-session-ready-begin` | 36 | `endgame-session-ready-end` |
| 37 | `endgame-state-push-begin` | 38 | `endgame-state-push-end` |
| 39 | `endgame-dom-begin` | 40 | `endgame-dom-end` |
| 41 | `manifest-write-begin` | 42 | `manifest-write-end` |
| 43 | `probe-body-complete` | — | — |

- Emit each literal marker immediately at its named boundary. An `*-end` marker is never emitted
  from a `finally` block after failure.
- No timestamp, duration, PID, port, path dependent on the machine, RNG, counter, stack trace, or
  simulation value appears in a phase marker.
- Markers are observation only: no new promise, IPC, renderer bridge, state field, manifest field,
  application branch, or changed ordering.
- The wrapper parses only lines beginning with the exact prefix. Unknown, duplicate, skipped, or
  out-of-order rows classify `INSTRUMENTATION_INVALID`; they never alter the running application.
- `last_observed_marker` is the last valid row received. `last_completed_stage` is `required-files`
  after row 2 or the stable stem of the latest valid `*-end` row; `probe-enter` alone completes no
  stage, and row 43 completes `probe-body`. `next_expected_marker` is the next literal row in the
  table, or null after row 43.

When the wrapper settles an outcome, it emits exactly one terminal line after classification:

```text
AWWV_DESKTOP_RUNTIME_PROBE_TERMINAL {"classification":"<wrapper-observable class>","last_observed_marker":{"sequence":N,"phase":"<fixed phase>"},"last_completed_stage":"<stable stage or null>","next_expected_marker":{"sequence":N,"phase":"<fixed phase>"}}
```

Use literal key order `classification`, `last_observed_marker`, `last_completed_stage`, then
`next_expected_marker`. Null is permitted where no marker/stage exists. Details remain in forwarded
stdout/stderr and the thrown error; the terminal receipt gains no timestamp or unstable value.
`PACKAGE_FAILURE` and `PACKAGE_NO_VERDICT` occur before the wrapper sentinel, so their coordinator
receipts record `wrapper_started: false` and terminal line absent by design.

## 6. Historical rejected Architect-owned symbol/hunk boundary

Allowed hunks in `src/desktop/electron-main.cjs` are limited to one guarded marker emitter adjacent
to `getRuntimeProbeManifestPath` and literal marker calls inside `runPackagedRuntimeProbe`. Do not
edit `RUNTIME_PROBE_MODE`, any wait/arm/collect helper, shared constructor, probe option, map-server
function, or the `app.whenReady` terminal branch. The Electron path may add no helper beyond the
single emitter and no control-flow change.

No hunk was allowed in normal IPC handlers, simulation code, UI/renderers, `startMapServer`, normal
application startup/quit behavior, map-server routing, package configuration, or shared runtime
logic. Inability to fit the boundary would have stopped R2; it does not queue another
instrumentation decision now.

The same wrapper file must become import-safe and expose behavioral seams for an imported
supervisor, incremental marker parser, diagnostic classifier, and the unchanged manifest validator.
Direct execution remains the sole canonical command. Tests import those seams from
`tools/desktop_packaged_runtime_probe.mjs`; do not add a dependency, test-only environment launch
path, sibling wrapper, or another file.

Hard size caps are independent and cannot be offset by deletions elsewhere:

- `src/desktop/electron-main.cjs`: gross additions ≤55 lines;
- wrapper: net addition ≤260 lines and final file ≤600 lines;
- existing probe test: net addition ≤350 lines;
- three-file combined net addition ≤665 lines;
- deletion headroom is zero: deleting unrelated or pre-existing code never raises a cap.

## 7. Rejected R2 matrix and implementation tasks — historical negative evidence only

The jointly frozen matrix embodied by the valid sole RED and every step below are non-executable
history. They must not be dispatched, resumed, corrected, rerun, or used to claim authority for
production work, a package/probe invocation, candidate acceptance, or R3.

### Historical Task 1 record: install final Lock 2 R2 and prove the exact boundary

**Files:**

- Modify: `docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json`
- Modify later for evidence only: `docs/40_reports/audits/20260826_RE_LEAN_ENGINE_INTEGRITY_EXECUTION.md`

**Step 1:** After the amendment commit, at clean HEAD, Product Manager drafts only Lock 2 R2 with
the exact task/packet in section 3, amendment commit as `base_commit`, six-path allowlist, denylist,
no-long-run rule, one-shot budget, LOC caps, and stop-and-queue policy.

**Step 2:** Orchestrator, Architect, and Process QA approve the exact proposed lock bytes and
SHA-256. Re-pin the existing worktree-local hook, then run the existing working-tree and staged
scope checks. Do not touch payload files before all three reviews and both checks pass.

**Step 3:** Produce a proposed symbol/hunk list using:

```powershell
rg -n "RUNTIME_PROBE_MODE|function getRuntimeProbeManifestPath|function waitFor|function arm|function collect|async function runPackagedRuntimeProbe|AWWV_DESKTOP_RUNTIME_PROBE_(?:OK|FAIL)" src/desktop/electron-main.cjs tools/desktop_packaged_runtime_probe.mjs
```

**Step 4:** Architect and the original specification reviewer jointly freeze the complete behavioral
matrix and return GO before tests or implementation. Any ambiguity or normal-runtime hunk abandons
the instrumentation approach; no R3 is authorized.

### Historical Task 2 record: write the failing marker and wrapper-bound tests

**Files:**

- Modify: `tests/desktop_packaged_runtime_probe.test.ts`
- Inspect: `src/desktop/electron-main.cjs`
- Inspect: `tools/desktop_packaged_runtime_probe.mjs`

**Step 1:** Extend the existing test with behavioral, import-safe coverage. Source-boundary
assertions may protect the narrow Electron hunk, but wrapper supervision must be tested by importing
the parser, classifier, supervisor, and unchanged validator seams. Require:

- exact wrapper-started sentinel as the first direct-main observable write and exact LF;
- exact fixed `{ sequence, phase }` rows, all 43 constants/IDs, and exact
  `AWWV_DESKTOP_RUNTIME_PROBE_PHASE` prefix;
- probe-only emitter guard;
- each named begin/end marker bracketing its current await in the exact table order, with all state,
  turn-report, and renderer-reaction pushes separate;
- immediate `process.stdout.write`/`process.stderr.write` forwarding from child streams;
- one `900_000` ms watchdog armed only from the child process `'spawn'` event, never from
  `spawn()` return;
- one Windows full-tree termination using `taskkill.exe` arguments `/pid`, child PID string, `/t`,
  `/f` without shell interpolation;
- clearing the watchdog on child error/close;
- exit 124 and the correct localized/pre-marker no-verdict class only on watchdog expiry;
- `NONREPRODUCIBLE_GREEN` only after code 0 plus existing manifest parsing and every existing
  validation;
- all eight classes and terminal-owner precedence through the imported pure classifier. Coordinator
  cases must prove: positive package-failure attribution; completed-package/wrapper-entry without
  sentinel → `INSTRUMENTATION_INVALID`; 1,200,000 ms `PACKAGE_NO_VERDICT` with last proven npm
  stage; wrapper-terminal class freeze; drained npm close without terminal; 960,000 ms fail-safe
  marker-based attribution; 5,000 ms natural-close grace; one forced cleanup plus separate 5,000 ms
  verification; exact forced/failure fields and cleanup failure without reclassification;
- exactly one terminal receipt and no automatic retry.

Behavioral fixtures must cover marker JSON split across stdout chunks, multiple markers in one
chunk, malformed/duplicate/skipped/out-of-order rows, child-close versus watchdog races in both
orders, kill success/failure/late-close with exactly one kill and one terminal receipt, no-marker
and localized timeouts, nonzero child, malformed/invalid/valid manifests, unchanged validator
success/failure, import without launching a process, wrapper-terminal/npm-close/fail-safe races,
and every coordinator attribution row above. The RED test bytes must implement the jointly frozen
matrix; production work may begin only after Architect and the original specification reviewer
confirm that exact correspondence.

**Step 2:** Prepend the coordinator-provisioned Node directory to `PATH`; do not download or resolve
Node through `npx`. Run `node --version` and require exactly `v22.23.0`. Any other output stops.

**Step 3:** Run the sole focused RED:

```powershell
node node_modules/vitest/vitest.mjs run tests/desktop_packaged_runtime_probe.test.ts
```

Expected: FAIL only on the new marker/live-forwarding/watchdog/tree-kill/terminal assertions; all
pre-existing packaged-probe assertions remain green. Record failing assertion names in the audit
draft. If an old assertion fails, stop and resolve provenance rather than changing it.

### Historical Task 3 record: add probe-only phase markers

**Files:**

- Modify: `src/desktop/electron-main.cjs`
- Test: `tests/desktop_packaged_runtime_probe.test.ts`

**Step 1:** Add `emitRuntimeProbePhase` exactly as section 5 specifies.

**Step 2:** Wrap only the existing operations in the fixed stage order with the literal numbered
begin/end calls. Do not extract normal-runtime code or alter awaits, timeouts, payloads, window options,
manifest construction, failure filtering, or teardown order.

**Step 3:** Do not run the test yet. The packet budget permits one RED and one GREEN only; continue
directly to the wrapper implementation.

### Historical Task 4 record: bound and expose the existing wrapper

**Files:**

- Modify: `tools/desktop_packaged_runtime_probe.mjs`
- Test: `tests/desktop_packaged_runtime_probe.test.ts`

**Step 1:** Forward every child stdout chunk to `process.stdout` and every stderr chunk to
`process.stderr` as received while retaining the existing strings for validation/error output.

**Step 2:** Parse exact `{ sequence, phase }` rows incrementally, including lines split across
chunks, verify against the 43-row table, and retain the ordered rows, `sequence_valid`,
`last_observed_marker`, `last_completed_stage`, and `next_expected_marker`. Do not send anything
back into Electron.

**Step 3:** Make the module import-safe. Direct-main execution first writes the exact wrapper
sentinel, then starts the existing probe flow. Arm one `900_000` ms watchdog only from the child
process `'spawn'` event, never from `spawn()` return. Importing the module performs no write, spawn, timer,
manifest read, or filesystem mutation.

**Step 4:** On expiry, atomically consume the timeout path, classify
`LOCALIZED_NO_VERDICT`, `PRE_MARKER_NO_VERDICT`, or `INSTRUMENTATION_INVALID` from the marker stream,
emit one terminal receipt, invoke `taskkill.exe` directly once for the full child tree, and finish
with code 124 after the kill attempt settles. Never retry or treat a partial/present manifest as
success.

**Step 5:** On error/close before expiry, clear the watchdog exactly once. Preserve all existing
manifest checks through the imported unchanged validator and apply the eight-class table exactly.
A valid stream plus child nonzero,
malformed/invalid manifest, or existing validation failure is `LOCALIZED_FAILURE`, not a generic
failure.

**Step 6:** Confirm `node --version` is still exactly `v22.23.0`, then run the sole focused GREEN:

```powershell
node node_modules/vitest/vitest.mjs run tests/desktop_packaged_runtime_probe.test.ts
```

Expected: all tests pass. No correction or rerun is permitted.

### Historical Task 5 record: static verification before consuming the run

**Files:** the exact three implementation paths only.

**Step 1:** With the same provisioned Node `v22.23.0` first in `PATH`, run exactly:

```powershell
node --check src/desktop/electron-main.cjs
node --check tools/desktop_packaged_runtime_probe.mjs
git diff --check
```

Expected: exit 0 for all commands.

**Step 2:** Do not run typecheck, desktop sim build, balanced tests, another focused test, or any
other verification command. This auxiliary packet's bounded budget is the sole RED, sole GREEN,
both `node --check` commands, and `git diff --check`.

**Step 3:** Platform Specialist is the sole implementer. Orchestrator reviews scope/sequencing;
Architect reviews exact hunks and proves normal mode remains inert; the original specification
reviewer verifies the frozen behavioral matrix; Build Engineer independently reviews command
chain/live forwarding; QA independently reviews TDD/classifications; Process QA verifies custody
and budget. Acceptance must be unanimous. No reviewer co-implements and no packaged execution
occurs during review. Any rejection abandons this instrumentation approach and authorizes no R3.

**Step 4:** Enforce every independent LOC cap, then stage only changed paths from the six-path Lock
2 R2 allowlist. Compute the normal canonical staged payload digest over the three code/test paths and
run the repository staged-scope checks. Any extra path, cap breach, or forbidden hunk stops the
packet.

### Historical Task 6 record: commit candidate, consume the one-shot proof, and clean up

**Files:** no new source path.

**Step 1:** Commit the reviewed Lock-2-R2 packet. The one-shot run is permitted only on that exact
clean commit with the provisioned Node `v22.23.0` first in `PATH`; verify the version again and do
not use `npx`.

**Step 2:** The external coordinator arms its 1,200,000 ms pre-sentinel timer before invoking exactly
once:

```powershell
npm.cmd run desktop:package:probe
```

Authorization is consumed when the command starts. Do not invoke the wrapper or packaged
executable separately. The exact sentinel switches the coordinator atomically to its 960,000 ms
post-sentinel fail-safe. The wrapper arms its 900,000 ms watchdog only from the child process
`'spawn'` event, never from `spawn()` return. No timeout extends or races into retry/acceptance.

**Step 3:** Classify only by section 4. The receipt must capture: exact Lock-2-R2 candidate commit;
clean-tree status before invocation; exact Node version; literal command; package start/result and
whether/when the exact sentinel was observed; pre-sentinel timer result; post-sentinel fail-safe
result and `coordinator_fail_safe_triggered`; `last_proven_npm_stage`; whether captured output
positively proves `desktop:package:dir` failed, packaging completed, or wrapper command entry;
`terminal_owner`; `wrapper_terminal_present`; settlement event/precedence; 5,000 ms natural-close
grace result; `post_terminal_cleanup_forced`; root-tree kill result/count; separate 5,000 ms cleanup-
verification result; `post_terminal_cleanup_failure`; any custody/cleanup failure; packaged executable path; executable spawn observation
and wrapper-watchdog start; ordered `{ sequence, phase }` rows; `sequence_valid`;
`last_observed_marker`; `last_completed_stage`; `next_expected_marker`; exact child
exit/signal/error; exact wrapper exit/error; terminal receipt;
last forwarded stdout and stderr; manifest path, presence, parse result, and unchanged full
validation result; timeout/tree-kill invocation/result/count; generated-output cleanup result;
post-cleanup process census and Git status; invocation count; and final eight-value diagnostic
class. Timestamps belong in the audit receipt, never marker output or program logic.

**Step 4:** After any diagnostic class, confirm no packaged process remains and remove only the
generated ignored `dist/` and `dist-packaged/` trees after resolving their absolute paths inside
this worktree. Do not delete any tracked path. Run `git status --short`.

**Step 5:** Do not rerun. Every class stops. Only after QA accepts the Lock-3 receipt and Architect
plus Orchestrator explicitly accept `NONREPRODUCIBLE_GREEN` may Product Manager draft a fresh
exact-base P2B lock through ordinary review/re-pin/check custody; it is not retroactive proof. The
other seven classes keep P2B held and, only after Lock 3 review, permit one bounded
source-cited proposal. A normal-mode failure, TDZ evidence, or required
out-of-scope hunk does not authorize a fix here.

### Historical Task 7 record: mandatory Lock 3 closeout and P2B disposition

**Files:**

- Modify evidence only: `docs/40_reports/audits/20260826_RE_LEAN_ENGINE_INTEGRITY_EXECUTION.md`
- Modify control only if Architect authorizes a later transition:
  `docs/30_planning/_task_artifacts/RE_SCOPE_LOCK.json`

**Step 1:** Product Manager must install Lock 3 exactly as section 3 specifies on the exact
candidate commit. Orchestrator, Architect, and Process QA approve its exact bytes/hash; the existing
hook is re-pinned; working/staged checks pass. No receipt, desktop README, or ledger content is
edited before that custody sequence completes.

**Step 2:** QA verifies every required receipt field, the diagnostic class, one-shot count, cleanup,
clean tree, exact payload digest, and absence of retry. Architect verifies the lane changed no
normal runtime authority; Orchestrator verifies scope and sequencing; Reports Custodian verifies
the living audit remains the single evidence record.

**Step 3:** Product Manager closes the auxiliary packet for every class. Only if QA accepts the
receipt and both Architect and Orchestrator explicitly accept `NONREPRODUCIBLE_GREEN` may Product
Manager draft a fresh exact-base P2B lock through ordinary review/re-pin/check custody. P2B still
requires its own base/candidate proof; every other class leaves P2B held and P3 waiting.

## 8. Determinism and engine-health checklist

- [ ] Probe markers use the exact 43-row `{ sequence, phase }` table, literal integer constants,
      fixed JSON key order, and no runtime counter/time/PID/port/RNG.
- [ ] Instrumentation executes only when `RUNTIME_PROBE_MODE` is true.
- [ ] Normal IPC, simulation state, renderer, UI, map server, package scripts, and build config are
      unchanged.
- [ ] Existing manifest schema and every existing validator remain unchanged.
- [ ] No retry, new launch path, dependency, module, service, persisted field, or compatibility
      layer is added.
- [ ] Coordinator owns one 1,200,000 ms pre-sentinel timer and one 960,000 ms post-sentinel
      fail-safe; wrapper owns one 900,000 ms spawn-to-close watchdog; no clock extends or retries,
      and the owning full tree is killed once on timeout.
- [ ] The eight diagnostic classes are mutually exclusive and exactly one terminal receipt owner
      settles: wrapper when its valid terminal is present, otherwise coordinator on attributed npm
      close or a coordinator timer. Every class stops; only `NONREPRODUCIBLE_GREEN` may open fresh
      P2B lock drafting after QA receipt acceptance, explicit Architect/Orchestrator acceptance, and
      ordinary lock custody.
- [ ] Wrapper terminal, drained npm close, and coordinator fail-safe use atomic first-settlement
      precedence; wrapper-settled class is never reclassified. Post-terminal cleanup uses 5,000 ms
      natural-exit grace plus a separate 5,000 ms verification bound and records cleanup failure
      outside the eight-class taxonomy.
- [ ] `PACKAGE_FAILURE` requires positive `desktop:package:dir` failure proof; completed package or
      wrapper entry without sentinel is `INSTRUMENTATION_INVALID`; `PACKAGE_NO_VERDICT` records only
      the last proven npm stage and makes no unsupported hang claim.
- [ ] Tests are RED before code and GREEN after minimal code.
- [ ] Exact-file and symbol/hunk reviews both pass.
- [ ] `maximum_clean_pairs_per_exact_commit: 1` is checker-inert because `permitted: false`; actual
      campaign run/pair budget is zero and the single packaged invocation is not a clean pair.
- [ ] Recovery receives no RE credit and cannot satisfy P2B without a fresh lock.

## 9. Stop conditions

Stop immediately on stale base, dirty provenance, any fourth implementation file, any normal-mode
behavioral change, package-script/build-config/UI/map-server/IPC/state/simulation edit, need to fix
the circular chunk or TDZ hypothesis, inability to kill the full process tree deterministically,
test requiring an environment-dependent branch, marker reordering of current work, new packaged
failure outside this scope, absent Node 22, second-run request, generated tracked artifact, or any
canon/scenario/calibration/reference need. Outside final R2, record the evidence and queue one bounded
amendment; do not improvise. Any R2 stop or failed gate abandons this instrumentation approach and
authorizes no R3 implementation attempt; only a docs-only stop receipt and an Architect/Orchestrator-
owned alternate packaged-proof strategy may follow.
