# Combat-fatigue single-owner implementation report

Canon and the approved preimplementation review required one per-battle fatigue owner: attackers +2 in defended combat or +0.5 without a defending formation, primary defender +1, cap 30, with `ops` initialization preserved. The implementation removed the earlier inline resolver writes and unused `recordFormationFatigue` import, retaining `applyCombatFatigue` as the sole writer. Maintained coverage now exercises the real resolver for defended combat, two attackers sharing a battle, and an undefended target; helper coverage retains initialization, cap, and primary-defender checks.

Attempts 001–003 never reached combat: 001 rejected mismatched Windows path forms (child/wrapper 1/1); 002 reached Vitest but the temporary test was outside maintained discovery (1/1, no tests); 003 failed on a Windows absolute-path ESM URL (2/2). Their original launchers and streams remain preserved.

Attempt 004 used the standard Vitest entrypoint and produced the required real-resolver RED: 0/1 passed, attacker fatigue 4 rather than 2 and defender 2 rather than 1 (1/1). Attempt 005 added edge coverage before production edits: 17/21 passed; the four failures were the duplicate defended charge, duplicate multi-attacker charge, undefended 2.5 rather than 0.5, and helper undefended 2 rather than 0.5 (1/1). After the minimal patch, attempt 006 passed 21/21 (0/0). Attempt 007 passed the focused resolver set 51/51 (0/0).

Attempt 008 was rejected by wrapper usage validation before directory creation because child argv lacked `{evidenceDir}`. No child or check ran; `GAP_ATTEMPT_008.v1.json` records the conversation-recovered output and missing bytes. Attempt 009 ran non-incremental TypeScript (`--noEmit --incremental false`) and passed in 49.2 seconds with empty streams (0/0).

Limits: focused tests and typecheck only. This evidence does not qualify control capture, campaign calibration, a full suite, package/native runtime, baselines, or release readiness. No such claim is made.
