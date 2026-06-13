# SRK strangle ACTIVATION — task #34 (re-floor lane), 2026-06-13

**Goal:** flip `AWWV_SRK_STRANGLE_POSTURE` default OFF→ON and re-floor. Standup P1, validated-GO.
Doctrine: VRS Sarajevo-Romanija Corps STRANGLES the urban core (siege) rather than assaults it (Galić Appeal §389). Suppresses VRS organic CAPTURE intent vs the 4 Sarajevo urban-core municipalities (centar/novi_grad/novo/stari_grad_sarajevo) by merging their RBiH-held OSIDs into `last_contained_osids_by_faction.RS`.

## Runs of record (flag-ON)
- 188w flag-ON: `runs/apr1992_definitive_188w__acb538b04d79af3c__w188_n17` — final hash `d0a7c668f56aa837`.
- 188w flag-OFF pair: `…__w188_n16` (RS_contained=0). One-change pair vs n17 (RS_contained=4).
- 40w flag-ON: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n18` — final hash `3b53ac6d26878e86`.

## Panel verdicts (2026-06-13)
- **Scenario-tester — GO.** matched_osids 658 (=floor), anchors 30/30, engine-health 7/7 PASS (dead_ops 32, ghost 2, stranded 4, consist 3, K:W 3.847). control_delta + formation_delta BYTE-IDENTICAL vs flag-OFF (n16-vs-n17, SHA `5fc1c2f270639d59` / `068673982c962095`). **Classification: INERT** — SRK already strangles emergently; this codifies/guards the pattern, not a territory-mover. Only the new `last_contained_osids_by_faction.RS` observer field moves the full-save hash.
- **Historian — GO-WITH-GUARD.** Doctrine historically exact (Galić §389 / D. Milošević siege-not-assault; outer-ring carve-out correct). §6 bright line intact (siege IS the crime, did NOT capture; holding core is §6-correct; no reward). Drina Corps owns Srebrenica/Žepa rupture floor — zero coupling to SRK.

## Guards (both DISCHARGED)
- **G1 (scenario-tester): 40w flag-ON structural fingerprint byte-identical.** ✅ `OK structural fingerprint 78af6fc7a3278a3e matches expected` (flag ON). Horizon coverage closed (40w + 188w both byte-identical).
- **G2 (historian → Engine reviewer): authorize_op urban-core capture penalty code-traced.** ✅ DISCHARGED. Chain: `displacement_takeover.ts` (0.70 frac, RS-attributed) → `displacement_event_log.ts` (RS aggregates) → `scoring.ts:227-250` computeAtrocitySubScore → `scoring.ts:311-337` war_cost_index ×0.85 → `scoring.ts:344-355` capGradeByCost (≥0.45→A,≥0.60→B,≥0.78→C) → `classifyOutcome` hollow_victory. Exercised by `tests/free_war_ethics_bright_line.test.ts`. Emergent-mode-gated (correct — both override + strangle are Free-War constructs; historical 52w byte-identical preserved).

## OPEN — CI re-bless scope (scenario-tester investigating)
Flipping default-ON means CI runs WITH the flag → the new `last_contained_osids_by_faction.RS` field moves **final_save SHA** for the golden manifest baselines (apr1992_52w + baseline_ops_4w + noop_4w pinned in `data/derived/scenario/baselines/manifest.json`). Need: confirm final_save SHA moves (control_delta/formation_delta stay identical) → activation = (a) flip default + (b) `test:baselines --update` re-capture. Awaiting precise SHA evidence + minimal merge recipe.

## CI re-bless scope — CONFIRMED (scenario-tester, raw SHA evidence)
Flag-ON moves **2 artifacts per golden scenario** (final_save + run_summary), all others byte-identical. Flag-OFF control = 24/24 MATCH (flag is sole driver). Surgical diff: 4 diff leaves all in `last_contained_osids_by_faction.RS`; run_summary moves only via embedded `final_state_hash`. Two-part re-bless is the established #360/#365/#392/#402 pattern.
- apr1992_52w: final_save 2238616a→c6e93a99, run_summary d0c76ec4→ecb21217
- baseline_ops_4w: final_save 7d8316be→e44ef716, run_summary fc7ac08d→3a7a8371
- noop_4w: final_save 2a492782→fbef8ed7, run_summary 941d6033→3938fdd0

## Implementation — DONE (branch feat/srk-strangle-activation)
1. ✅ Flipped default in `contain_posture_gate.ts`: `return raw !== 'false' && raw !== '0';` (ON unless explicitly disabled). Header comment updated.
2. ✅ Tests: default-OFF→default-ON assertions updated + explicit-disable (false/0) case added; header comment updated. `srk_strangle.ts` header updated. 20/20 pass.
3. ✅ Caveat clear: no hardcoded full-save hash literals in tests/ (grep 3e68b23e/f08f4052/d0a7c668/2238616a/7d8316be/2a492782 = none).
4. ✅ Re-bless DONE: manifest.json diff = exactly 6 hash lines (final_save+run_summary × 3 scenarios), matching scenario-tester's predicted SHAs byte-for-byte. No control/formation/activity moved. 6 ins / 6 del.
5. Smoke triad: ✅ tsc exit 0 · ✅ desktop:map:build (21.16s) · ✅ `test:baselines` no-env = "all scenarios match" (re-bless self-consistent) · ⏳ full vitest in flight.
6. PENDING: commit + PR + ledger re-floor note + CALIBRATION_MASTER + memory.

NOTE (Windows invocation): npm scripts use bare tsx/vite/vitest which DON'T resolve → use `node node_modules/tsx/dist/cli.mjs`, `node node_modules/vite/bin/vite.js`, `node node_modules/vitest/vitest.mjs run`, `node node_modules/typescript/bin/tsc`. Baseline re-bless env = `UPDATE_BASELINES=1` (not --update).
