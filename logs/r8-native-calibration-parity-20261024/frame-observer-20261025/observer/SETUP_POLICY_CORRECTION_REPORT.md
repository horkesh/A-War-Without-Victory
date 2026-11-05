# Setup failure policy correction

Verdict: the single persistent setup-close-plus-timeout finding is corrected and the affected focused checks pass.

Root cause: `awaitReady` recorded setup timeout metadata and then unconditionally assigned `setup-error`, overwriting a previously recorded target-loss `runtime-error`. The earlier setup-promise catch used a separate assignment path, so setup failure precedence was duplicated.

Correction: `recordSetupFailure` is now the sole setup failure recorder for both the setup-promise catch and `awaitReady` timeout. It always records the applicable setup state and primary error while preserving any existing `runtime-error` or `over-cap`; all other setup failures become `setup-error`. The policy does not depend on the unexpected-session-close flag.

Executed regression: unresolved `Target.getTargetInfo` remains pending, then either CDP session close or external exact-frame loss is injected. `awaitReady` reaches its timeout, and `closeAndFlush` retains `runtime-error`, timeout setup metadata, and the exact lifecycle inconsistency.

Evidence:

- `setup-policy-red-01`: expected RED, exit 1; observed `setup-error` where `runtime-error` was required.
- `setup-policy-green-01`: 159/159 focused tests passed, child/wrapper exit 0.
- `setup-policy-typecheck-01`: child/wrapper exit 0.
- `setup-policy-syntax-01`: child/wrapper exit 0.
- final `git diff --check`: exit 0.
- tracked diff remains limited to four observer/harness files: 493 insertions / 59 deletions.

The prior implementation reports, failed attempts, independent review, and targeted `NO_GO` verification remain retained. No native game, browser, build, package, campaign, gameplay, calibration, baseline, tracked documentation, commit, or push was performed.
