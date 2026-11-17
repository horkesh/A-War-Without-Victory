## 2026-11-17 — Commander attribution hardening: departed officers never return; relief and replacement respect commands (measured, control-identical)

Pre-freeze fix (owner rule: no engine changes after 1.0). PR 1 of 2 from the commander-attribution trace; PR 2, the operation-commander pool restriction and the historian's commander table, follows separately. Calibration is held.

**Defects.**
- `releaseOperationCommander` and `releaseTacticalCommander` set the officer back to `reserve` whatever his status. A retired officer who still held an operation therefore returned to the pool when that operation ended, and retirement never cleared his operation.
- `relieveOfficer` drew replacements with no enclave or compatibility check.
- The desktop `accept-officer-replacement` could seat an officer who still held an operation or another corps.
- `deferUnauthorizedHistoricalOperationsForPlayer` dropped operations without releasing their commanders.

**Change.**
- Release returns only an officer still serving (`active`) to reserve; retirement clears his operation.
- Relief draws only enclave-compatible officers and ranks the compatible corps after home, the vacancy path's rule.
- The replacement handler refuses an officer holding another command or no longer serving, before changing anything. The outgoing commander's operation is cleared.
- Deferred operations release their commanders.

**Measured** (188w, against main runs at the same commit 34a2078d4, after #754; main historical d983d7bc665fdeb6 → branch c47dc1012008eec3, emergent 9454c52e328dd647 → 3400541d28e15e80):
- Control and formations are byte-identical in historical and hands-off emergent. Guards intact.
- 10 of 83 operation AARs differ in force-quality inputs: `faction_officer_maturity_normalized`, e.g. 0.7723 → 0.7496 for one op, with the knock-on traits (axis coordination, readiness, reserve response) and force ratio.
  - The exact cause (82-week probe on both versions): on main, Pašalić (4th Corps, availability ended at t80) is `retired` yet still commands the 4th Corps probe launched at t81 (`commander_officer_id: arbih_pasalic`; his `assigned_operation` is never cleared). With the fix he departs cleanly and the serving officer Malkić commands the probe. The probe's commander and the faction officer-maturity input change from there.
  - No outcome field changes. The only commander that changes is that probe's (Pašalić → Malkić); every AAR'd operation keeps its commander. Weekly reports diverge from week 82.
- The startup snapshot is unchanged (check passes).
- Live = headless on the officer pools: no commander holds a dropped operation at an RS, RBiH or HRHB campaign start. That was already true on main (standing auto-authorization defers nothing at start), so the deferral release is defensive.

**Tests.** `tests/officer_attribution_hardening.test.ts`:
- a retired officer stays retired on release (this failed on main);
- no leaked commanders at a campaign start, for each faction.
