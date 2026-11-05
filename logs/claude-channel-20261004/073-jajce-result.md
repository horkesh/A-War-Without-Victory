# [073] Retained Jajce / Mistral 2 launch-readiness audit — result (Claude f75b0a11, read-only)

Verdict: **EXPLICIT MISSING-INPUT GATE** for the launch delay; **bound measured finding** that the Barevo/Lupnica shortfall in n30/n37/n39 is a 2-week schedule shift plus end-of-horizon participant loss, not a retained rejection. No correction proposed.

Runs: `runs/apr1992_definitive_188w__6deb5845c150c196__w188_{n25,n29,n30,n37,n39}`; weekly_report `week_index` = completed turn (temporal rows use turn=week+1). Commands saved before each run: `073-{mistral,battles,prep}.command.txt`; scripts `073-*.cjs`; outputs `073-*-out.json`, compact views `073-compact.txt`, `073-battles-compact.txt`; exits `073-{mistral,battles,prep}.exit.txt` all 0. (The two compact formatter scripts have no recorded exit file; stderr logs only.) Sources: `operation_diagnostics`, `battles`, `operation_aars.json`, `final_save.json`.

## Measured
1. **Planning → execution (Mistral 2, hvo_tomislavgrad, t175):** planning starts w175 in all five. First `execution` row: **n25 w178, n29 w178, n30/n37/n39 w180**. (Mistral 1 t160 behaves identically in n30/n37/n39 and was completed w168–170.)
2. **Planning-phase differences:** n30/n37/n39 current_objectives change w176 (prekaja_2 → drvar_2) and stay planning w176–177; n29 keeps prekaja_2; n25 shows no change w175–177. Participants: n25 3→5 by w178 (adds hvo_1st_guard_abb, hvo_3rd_guard_jastrebovi); n29 already 6 at w175; n30/37/39 3 at w175, 4 at w180 (adds hvo_2nd_guard_mechanized; **not** the two guard brigades n25 had).
3. **Execution chain is identical but shifted:** target orders per week — n25: Brdjani w178 … Bravnice w182/183, Vinac w184, Jajce_3 w185, **Lupnica w186, Barevo w187** (battles on bravnice w183, vinac w184, jajce_3 w185, lupnica w186, barevo w187; all decisive, defender RS). n30/37/39: battles bravnice w185, vinac w186, jajce_3 w187 — one objective per week, exactly +2 weeks. n29 matches n25 timing (Lupnica w186, Barevo w187) and holds both.
4. **Horizon:** n30/37/39 at w188 still target Lupnica but `eligible_attacker_count=0, attack_attempt_count=0`, participants 4→2 (hv_112th_infantry_1995, hv_1st_hgz_1995 gone). n25/n29 also lose 112th/HGZ at w188 but had already finished Lupnica/Barevo (w186/187). So **no Lupnica/Barevo order/attack exists in n30/37/39 before w188**; no skipped-order row (arrays empty).
5. Distinction: planning (w175+), execution (first execution row), ordinary combat (battles rows). Jajce town = n25 w185, n30+ w187.

## Static source (NOT an executed-branch claim)
`operation_preparation.ts` sub-phases intel_gathering → force_staging (ASSEMBLY_THRESHOLD or ASSEMBLY_TIMEOUT) → supply_check (supplyReadiness ≥0.7, or ≥0.5 with aggressiveness ≥4) → assessment (score vs goThreshold) → ready (lines ~985–1064). Any of these could explain a 2-week hold; none has a retained receipt.

## Missing (unreported, not zero)
`preparation_sub_phase`, `preparation_turns_elapsed`, intel confidence/probe, supply_readiness, assessment score/threshold, assembled-brigade count at w175–180: **0 hits** in weekly_report for n25/n30/n37 (073-prep-out.json); final_save search by `operation_name` /Mistral 2/ matched nothing (search shape only — not proof the op is absent from saves; Mistral 2 may be stored under another key/ended). Why participants differ (guard brigades attached in n25 vs 2nd Guard Mech in n30+); why objective switched w176; HGZ/112th disappearance cause at w188 (no withdrawal receipt). Majdan (majdan_2), Varošluk and Stari Majdan not conflated; Barevo/Lupnica here are Jajce-axis only.

## Cheapest next check (needs authorization; not run)
Opt-in per-turn receipt of Mistral 2's preparation sub-phase/elapsed/assembled count/supply_readiness/assessment score for w175–180 from a run that reaches w180 (n29→n30 is the retained transition; a prefix from a retained save at ≤w174 if one exists, else full-horizon). Alternatively read an existing mid-run save at w175–180 if one was retained (none inspected). Chronology alone does not identify which gate held n30+ two weeks.
