# Run summary template (default scenario: apr1992_historical_52w)

When the user asks to run scenarios, use **npm run sim:scenario:run:default** (runs apr1992_historical_52w with --unique --video --map; each run gets a new folder and is replay-ready). Or **data/scenarios/apr1992_historical_52w.json** with **--unique** so each run creates a new folder. At the end, report:

1. **Control flips** — Total settlement flips, net change by faction, top municipalities by flips, main direction changes (e.g. RBiH→RS, RS→RBiH).
2. **Municipalities** — Whether municipalities are being “formed” (no — they are fixed 110 mun1990); interpret as: territorial consolidation (flips per municipality, front-active/pressure-eligible activity), brigade AoR coverage (settlements per faction), displacement (mun-level).
3. **AI bots and orders** — Phase II attack resolution: orders processed, flips applied, defender-present vs defender-absent battles; bot benchmark pass/fail; use of army/corps/brigade layers (standing orders → corps stance → brigade attack orders).

Reference: run_summary.json (phase_ii_attack_resolution, bot_benchmark_evaluation, anchor_checks), end_report.md (control changes, Phase II weekly rollup, army strengths).
