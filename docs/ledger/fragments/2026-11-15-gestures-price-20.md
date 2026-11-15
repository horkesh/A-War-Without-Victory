## 2026-11-15 — Held step 1: presidential gestures cost 20 Authority (was 10)

- **What.** Front visit, address to the nation, decoration and strategic posture review now cost 20 Authority each. The constants are `FRONT_VISIT_COST`, `ADDRESS_NATION_COST`, `DECORATE_UNIT_COST` and `STRATEGIC_POSTURE_REVIEW_COST`, in `src/desktop/autonomy_ipc_contract.cjs` and `src/ui/map/utils/commandAuthority.ts`.
- **Why.** It is the first step of the ratified held tuning order (Fable consult 1; L7 #670), taken on its measured trigger. In the first three-President run, the engaged President never fell below 65.5 Authority. No new seat was needed; the ratification record names the step.
- **Docs.** Systems Manual §6.4, proposal §5D (price row, gestures bullet, test spec with the new Stop-op, step note), ratification record.
- **Player path only.** The prices are charged only in the desktop gesture handlers. Headless and bots never debit.
- **Proof.** The PR has the 40-week headless artifact hashes against main, and the three-President rerun.
