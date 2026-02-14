# Historical fidelity Apr 1992 — Success criteria checklist

**Reference:** `docs/40_reports/HISTORICAL_FIDELITY_APR1992_RESEARCH_PLAN.md` §11 and Historical Mirror Solution plan.

| Criterion | Target | Evidence artifact |
|-----------|--------|-------------------|
| (1) Historical initialization | Canonical Apr 1992 scenarios use `init_control_mode: "ethnic_1991"`; asymmetry comes from deterministic battle pressure (not municipal institutional pre-assignment) | `data/scenarios/historical_mvp_apr1992_52w.json`, `data/scenarios/apr1992_50w_bots.json`, `data/scenarios/apr1992_phase_ii_4w.json`, `data/scenarios/historical_mvp_apr1992_phase_ii_20w.json`, `src/sim/phase_ii/battle_resolution.ts` |
| (2) Historical reference snapshot | Deterministic `dec1992` reference file exists with all 110 mun1990 entries | `data/source/municipalities_1990_initial_political_controllers_dec1992.json` |
| (3) Battle-driven trajectory diagnostics | `run_summary.json` includes `vs_historical` and `anchor_checks` blocks for Apr 1992 starts | `runs/<run_id>/run_summary.json` |
| (4) Control-share tolerance (52w) | Final share close to Dec 1992 envelope: RS 0.65-0.75, RBiH 0.20-0.28, HRHB 0.08-0.12 | `runs/<run_id>/run_summary.json` `vs_historical.counts_by_controller` |
| (5) Anchor pass checks | Zvornik=RS, Bijeljina=RS, Srebrenica=RBiH, Sapna=RBiH (connected stronghold), Bihac=RBiH, Banja Luka=RS, Tuzla=RBiH | `runs/<run_id>/run_summary.json` `anchor_checks` |
| (6) Determinism gate | Same seed, same scenario, same horizon => identical final hash and `run_summary` content | Repeated run pair for `apr1992_historical_52w` |

## Acceptance run protocol

1. Run `apr1992_historical_52w.json` once and archive artifacts (`run_summary.json`, `control_delta.json`, `end_report.md`, replay files).
2. Run it a second time with identical config.
3. Confirm:
   - `final_state_hash` matches.
   - `vs_historical` block present and stable.
   - `anchor_checks` pass rate is acceptable (target: all listed anchors pass).
4. Record final accepted run id in `docs/PROJECT_LEDGER.md`.
