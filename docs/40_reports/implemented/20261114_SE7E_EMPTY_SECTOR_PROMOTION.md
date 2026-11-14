# SE7E: an empty front sector promotes an eligible reserve or rear brigade

Date: 2026-11-14. Lane SE7E (register SD15; RF realism-audit fix). Branch `claude/amazing-clarke-z50rpc`.

Status: IN PROGRESS. This report is filled in as the lane proceeds.

## 1. Reproduction on main

Main `887310d` (after #617/#622/#611), cloud session, `npm run sim:scenario:run:188w`:

- `final_state_hash` `4ff4a7665c0a35b5` (same as the RF-F1 pin).
- Checkpoints 712 / 709 / 710 / 705 (`node tools/verify_checkpoints.cjs`, exit 0, guard intact; enclave and Farz P1/P-A/P-B pass).
- Strict health (`node tools/engine_health_gate.cjs --horizon 188w --strict`) PASS.
- Battles per week 2.697 (RS 0.952, RBiH 1.441, HRHB 0.303).
- `node tools/validate_run_consistency.cjs` exit 1, one failure: `subseg:sector:arbih_1st_corps:4:0` in `sector:arbih_1st_corps:4` stays `gap=true` across 4 edges with legal donors `arbih_123rd_light` (sector 3 reserve), `arbih_164th_mountain` (sector 3 front), `arbih_146th_light` (own reserve), `arbih_147th_light` and `arbih_185th_light` (own rear), all 3 hops.
