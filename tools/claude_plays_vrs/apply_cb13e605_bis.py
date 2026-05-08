#!/usr/bin/env python3
"""Strengthen NOISE-SUPPRESSION GUIDANCE C2 + C3 bullets across all 13 personas.

Per LANE-NIGHTSHIFT-D3-PERSONA-VALIDATION-V3 empirical FAIL (-4.8% reduction):
- C2 alliance hand-wringing got worse (+9%) due to loophole in "unless deviates >0.20"
- C3 ops-in-planning got worse (+51%) due to model finding adjacent angles (recovery/no-trace/etc)

Replaces these two bullets with broader, loophole-free versions.
Faction-symmetric (identical across all 13 files).
"""

import json
from pathlib import Path

PERSONA_DIR = Path("tools/claude_plays_vrs/personas")

OLD_C2 = (
    'DO NOT comment on the RBiH-HRHB alliance coefficient unless it deviates >0.20 '
    "from your faction's expected trajectory at this turn (e.g. for HRHB, expected "
    "0.50-0.70 in early 1992; for RBiH similar; for RS irrelevant)."
)

NEW_C2 = (
    "DO NOT comment on alliance coefficients (RBiH-HRHB or any other) UNLESS the "
    "deviation from historical trajectory exceeds 0.30 AND the deviation triggers "
    "a concrete decision in your turn (e.g. switching from cooperation to opposition). "
    "General 'this seems lower/higher than expected' commentary is noise — alliance "
    "values are a slow narrative variable, not per-turn signal. Examples to NEVER "
    "emit: 'coefficient at 0.40 is lower than expected', 'cooperation remained "
    "nominally 0.50-0.65', 'fragile at X.XX'."
)

OLD_C3 = (
    'DO NOT flag "ops in planning" as a sim defect. Op execution traces are not '
    "surfaced in this briefing — only named-op status. Treat planning status as "
    "the system's normal pre-execution state."
)

NEW_C3 = (
    "DO NOT comment on operation lifecycle status (planning, recovery, suspended, "
    "in-progress, completed, no-trace) UNLESS the status directly informs a decision "
    "you must make this turn. Op lifecycle states are normal and visible to you for "
    "context — they are not bugs, gaps, or anomalies. Specifically: never flag 'no "
    "trace provided', 'unclear status', 'execution details missing', 'reconstituted "
    "without explanation', or 'recovery status without confirmation' — the briefing "
    "intentionally surfaces only named-op state."
)


def main() -> int:
    files = sorted(PERSONA_DIR.glob("*.json"))
    print(f"Found {len(files)} persona files")

    for fp in files:
        data = json.loads(fp.read_text(encoding="utf-8"))
        tpl = data.get("system_prompt_template")
        if not tpl:
            print(f"  SKIP {fp.name}: no system_prompt_template")
            continue
        if OLD_C2 not in tpl or OLD_C3 not in tpl:
            print(f"  SKIP {fp.name}: missing OLD bullets (already amended?)")
            continue
        tpl = tpl.replace(OLD_C2, NEW_C2)
        tpl = tpl.replace(OLD_C3, NEW_C3)
        data["system_prompt_template"] = tpl
        fp.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"  AMENDED {fp.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
