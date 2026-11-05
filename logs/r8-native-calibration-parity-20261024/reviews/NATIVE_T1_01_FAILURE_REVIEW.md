# Native RBiH turn-1 attempt 01 failure review

Date: 2026-10-24  
Verdict: **FAILED before campaign creation; selector defect isolated**

The retained packaged screen exposes radio accessible names `Let it run from here` and `Let history run as it did`. The harness waited 30 seconds for a radio named exactly `Historical`, which does not exist. The command-mode screenshot (`5b5790bc798efc2305282da491fa7a89c6d9722d20ca74ee909ac9e1ca96f5df`) and the captured button inventory agree: Emergent remained selected and the historical option remained unselected.

The wrapper and child both exited 1 without timeout. Progress contains exactly four opening events: launch screen, side picker, faction dossier, and command mode. It contains no initial evidence, autosave, campaign-mode receipt, or turn state, so no campaign was created and no state advanced.

All observed console, page-error, network-failure, and expected-abort arrays are empty. Main-process stderr contains only the two debugger teardown lines already classified by the harness. This attempt exposes no new engine, canonical-state, network, media, or control-outcome failure category.

The smallest correction is harness/test only: use the actual packaged historical radio accessible name while retaining role lookup, `aria-checked=true`, and the post-selection screenshot. The cheap test must model both production labels and demonstrate that the old selector fails while the corrected selector chooses the second radio. No retry is justified before that focused proof passes.
