## 2026-11-25 — §4 copy pass for the player-override model: the copy states the rule as the engine has it (EN and BCS)

Authority: the player-override model (#864-#866; owner rulings 2026-11-22, 2026-11-23, 2026-11-25) and the orchestrator's Codex intake ruling (2026-11-25: #866 r4695825817 and r4695825823 MUST-FIX, in this change). Copy sitting (lane C s11): historian and narrative designer, two independent seats, unanimous SIGN ALL in round 2. Record: SENSITIVE_HISTORY_DESIGN_GATE.md §6, "§4 copy pass for the player-override model".

**Change.**
- i18n (EN and BCS): the autonomy level descriptions (Full Control, Assisted, Delegated, and the no-card variants including Observer), the paramilitary rule lines (`eventDecision.paramilitaryPolicyRule`, `paramilitaryReview.policyHint`/`policyHintNoCard`, `formationDetail.command.autonomyHint`), the halt receipt's automatic variants and the historical-default sweep receipts. They now say: the staff run the faction at every level; silence is the staff's historical default; an explicit act outranks it and a refusal is durable; the halt card waits at the pause at every level; the level decides only what is surfaced.
- Level-0 recruitment: the Full Control "decision" matter and "Not now" are removed (`recruitmentMatter.ts`, `recruitmentMatterCopy.ts`, 8 keys); Full Control gets the weekly staff notice and the Recruitment hold, like every other level (`RecruitmentModal.recruitmentHoldAvailable(0)`, `inboxItems.ts`, `presidentialDecisionRoom.ts`).
- `GameStateAdapter.ts` `newestOwnParamilitaryActUpTo`: a default sweep after a Review each order is attributed to the staff (a Review each standing order is not an explicit answer to the sweep). Display only; reads no new state.
- Tests: the recruitment, copy-pin and receipt tests re-pinned to the signed strings with "was:" notes; `tests/paramilitary_receipt_cause.test.ts` gains the attribution cases.
- Canon: SHDG §6 copy-pass record; the player-override record's "Open for the §4 copy pass" list closed. FORAWWV unchanged. No GameState field added. No engine path changed.

**Measured.** Headless is unchanged by construction. The PR body lists the CI 188w hash against main and the EN/BCS screenshots.
