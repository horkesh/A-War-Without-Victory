# Historical-mode selector repair review

Date: 2026-10-24  
Verdict: **GO for one replacement RBiH turn-1 diagnostic**

The implementation chain is consistent across production source, retained package evidence, and the harness:

- `MainMenu` passes the English localized title to `ModeRadio`.
- `ModeRadio` exposes that title as its radio `aria-label`.
- The retained packaged DOM and screenshot expose the unselected historical radio as `Let history run as it did`.
- The harness now selects that exact radio by role, waits for visibility, clicks it, requires `aria-checked=true`, captures `command-mode-historical-selected`, and only then clicks Begin.

The focused test now models both packaged accessible names and rejects nonexistent radio labels. The preserved RED failed on the old `Historical` selector for that reason; GREEN passes with the packaged name. The implementer preflight reports 87/87 focused tests and nonincremental TypeScript passing. Independent targeted rerun of the production-shaped startup test returned exit 0 (1 passed, 82 skipped).

The correction is harness/test only and does not require a package rebuild. One replacement turn-1 launch answers the new question: can the harness now select the visible packaged historical option and reach the already-approved t0/t1 diagnostic gates? The prior attempt remains a strict retained failure. All full-campaign gates remain unreached.
