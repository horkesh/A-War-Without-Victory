# Frame observer repair

Verdict: corrected implementation passes all focused checks. No native game, browser, build, package, campaign, gameplay, calibration, or baseline run was started.

The opt-in collector now starts only after the fresh or resume path resolves the final gameplay `Frame`. It validates exact iframe target identity through `Target.getTargetInfo`, enables the Network domain before returning to initial evidence or gameplay actions, and records bounded target and post-attachment coverage provenance.

Exact-frame navigation/detach, exact-URL replacement, owner-page loss, and unexpected CDP session close remain observable and fatal throughout asynchronous body flush until collector-owned detach begins. Ordinary network ingestion stops when finalization starts. Collector-owned detach is expected, idempotent, and nonfatal. An unexpected close during setup retains `runtime-error` and its inconsistency receipt.

The extracted production orchestration helper is executed with fakes for both fresh and resume paths. Each fixture proves frame resolution, lifecycle construction, and awaited readiness occur before the caller's first action, with no Advance/turn dispatch. Disabled mode remains inert. Completed `playTurns` evidence retains exact object identity on later failure without synthetic partial evidence or manifest construction.

Final evidence:

- `final-focused-01`: 158/158 passed, child/wrapper exit 0.
- `final-typecheck-01`: child/wrapper exit 0.
- `correction-syntax-01`: both changed CommonJS production files passed, child/wrapper exit 0.
- final `git diff --check`: exit 0.
- tracked diff: 4 files, 457 insertions / 53 deletions.

All prior RED and failed correction attempts remain preserved, including the independent `CORRECTION_REQUIRED` review and the test-loader/type-annotation failures that led to the final evidence. No commit or push was made. Exact hashes and evidence paths are in `RESULT.json`.
