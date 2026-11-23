## 2026-11-22 — §6 D1 stage 2: staff and bots follow the side's paramilitary standing order; the RS policy card at t1 (hash-moving)

Signed §6 design (owner-delegated §6 panels, unanimous; record row in `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §6, "§6 D1 stage 2, round 4a ... rounds 4 and 4s").

**Change.**
- One resolver, `resolveNonManualParamilitaryPolicy` (`src/sim/combat/paramilitary_policy.ts`), gates every non-manual rear-pocket spawn. A human side at Assisted, Delegated or Observer follows its own standing order (ruling A1: nothing is sent in its name before its card applies an answer). Bots follow their card's decided answer, else the card's historical default.
- Round 4a fix (b): `rs_paramilitary_policy_1992` fires at t1, `priority` 101 after the goals card; its goals gate and the goals options' stale enables are removed. This restores live RS parity (4/4/7/17 → 0/0/0/0).
- Round 4 R3 (display only): the receipt cause credits a card answer only once the card has applied it.
- Round 4s, owner rule 2026-11-22: a side with no policy card (HRHB) and no own decision on record follows the bot's historical default at levels 1-3; new receipt cause `historical_default_staff`; no-card disclosure strings, EN and BCS.
- Copy and sources rewritten through the §4 copy panels; HISTORICAL_TIMELINE_MASTER Bijeljina/Zvornik dates corrected.

**Measured** (188w, at b03574fdd):
- Headless historical 694/694/692/664, emergent 694/694/693/663; matched 664/663; stranded 0/4; battles 473/474 (2.52 a week, floor 2.35); engine-health gate --strict PASS in both modes.
- final_state_hash historical `6d2659c4f82bb8d0` (repeat run identical), emergent `7bc0f5c99247bf12`. Baselines re-pinned (all eight artifacts move against main; against D1 before fix (b) only the card-at-t1 entries move).
- Live: RS and RBiH at Delegated/Observer 0/0/0/0; HRHB 0/1/3/14 with its first difference at Doljani t75/76, as on main.
- Battles against main (493/494) are −4.1%: a recorded §6-design divergence (orchestrator ruling 2026-11-22), with the code-fact proof in the PR body.
