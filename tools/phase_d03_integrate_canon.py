# Phase D0.3 — Integrate canon v0.3 docs + invariant clarifications
# Creates v0.3.0 copies, applies version bump, weekly turn, invariant clarifications, phase refs, rulebook note, CANON update.
from pathlib import Path
import re

DOCS = Path("docs")

def must(p: Path):
    if not p.exists():
        raise SystemExit(f"Missing: {p}")

# Required inputs
for f in [
    "CANON.md", "Phase_0_Specification_v0_3_0.md", "Phase_I_Specification_v0_3_0.md",
    "Canon_v0_3_Change_Proposal.md", "Systems_Manual_v0_2_7.md", "Rulebook_v0_2_7.md",
    "Engine_Invariants_v0_2_7.md", "Phase_Specifications_v0_2_7.md", "Game_Bible_v0_2_7.md",
]:
    must(DOCS / f)


def bump_version(txt: str) -> str:
    txt = re.sub(r"\bv0\.2\.7\b", "v0.3.0", txt)
    txt = re.sub(r"\bv0_2_7\b", "v0_3_0", txt)
    return txt


def ensure_weekly_turn(txt: str) -> str:
    weekly_line = "One game turn equals one week."
    if weekly_line in txt:
        return txt
    lines = txt.splitlines()
    out = []
    inserted = False
    for line in lines:
        out.append(line)
        if not inserted and re.match(r"^#\s+", line):
            out.append("")
            out.append(weekly_line)
            inserted = True
    if not inserted:
        out = [weekly_line, ""] + lines
    return "\n".join(out)


def add_engine_invariants_clarifications(txt: str) -> str:
    strain = "Control Strain is reversible; Exhaustion is irreversible and must never be reduced by any system."
    jna = "JNA transition and withdrawal effects may increase escalation pressure but must not, by themselves, satisfy the war-start escalation threshold."
    if strain in txt and jna in txt:
        return txt
    # Insert after "## 8. Exhaustion Invariants" block (after the bullet list, before ## 9)
    marker = "## 9. Political Control Invariants"
    if marker not in txt:
        return txt + "\n\n" + strain + "\n\n" + jna + "\n"
    if strain not in txt:
        txt = txt.replace(
            marker,
            strain + "\n\n" + jna + "\n\n" + marker,
            1,
        )
    elif jna not in txt:
        txt = txt.replace(
            marker,
            jna + "\n\n" + marker,
            1,
        )
    return txt


def wire_phase_specs(txt: str) -> str:
    ref0 = "Phase 0 Specification: docs/Phase_0_Specification_v0_3_0.md"
    refI = "Phase I Specification: docs/Phase_I_Specification_v0_3_0.md"
    if ref0 in txt and refI in txt:
        return txt
    ins = "\n\n## v0.3.0 phase specifications\n\n" + ref0 + "\n\n" + refI + "\n"
    lines = txt.splitlines()
    out = []
    inserted = False
    for line in lines:
        out.append(line)
        if not inserted and re.match(r"^#\s+", line):
            out.append(ins)
            inserted = True
    if not inserted:
        out.append(ins)
    return "\n".join(out)


def add_rulebook_note_on_prewar_flips(txt: str) -> str:
    line = "Municipalities cannot flip control through violence until the war-start escalation threshold is satisfied (pre-war degradation may occur, but control does not transfer)."
    if line in txt:
        return txt
    m = re.search(r"^(#+\s+Political [Cc]ontrol.*)$", txt, flags=re.MULTILINE)
    if m:
        idx = m.end(0)
        txt = txt[:idx] + "\n\n" + line + "\n" + txt[idx:]
        return txt
    if "One game turn equals one week." in txt:
        parts = txt.split("One game turn equals one week.", 1)
        if len(parts) == 2:
            return parts[0] + "One game turn equals one week.\n\n" + line + "\n\n" + parts[1]
    return txt + "\n\n" + line + "\n"


targets = {
    "Systems_Manual_v0_3_0.md": ("Systems_Manual_v0_2_7.md", []),
    "Rulebook_v0_3_0.md": ("Rulebook_v0_2_7.md", ["rulebook_note"]),
    "Engine_Invariants_v0_3_0.md": ("Engine_Invariants_v0_2_7.md", ["invariants"]),
    "Phase_Specifications_v0_3_0.md": ("Phase_Specifications_v0_2_7.md", ["phase_specs"]),
    "Game_Bible_v0_3_0.md": ("Game_Bible_v0_2_7.md", []),
}

for out_name, (src_name, extras) in targets.items():
    src_path = DOCS / src_name
    out_path = DOCS / out_name
    txt = src_path.read_text(encoding="utf-8")
    txt = bump_version(txt)
    txt = ensure_weekly_turn(txt)
    if "invariants" in extras:
        txt = add_engine_invariants_clarifications(txt)
    if "phase_specs" in extras:
        txt = wire_phase_specs(txt)
    if "rulebook_note" in extras:
        txt = add_rulebook_note_on_prewar_flips(txt)
    out_path.write_text(txt, encoding="utf-8")
    print(f"Wrote {out_path.name}")

# Update CANON.md
canon_path = DOCS / "CANON.md"
canon = canon_path.read_text(encoding="utf-8")
canon = canon.replace("v0.2.7", "v0.3.0")
refs = [
    "docs/Systems_Manual_v0_3_0.md",
    "docs/Rulebook_v0_3_0.md",
    "docs/Engine_Invariants_v0_3_0.md",
    "docs/Phase_Specifications_v0_3_0.md",
    "docs/Game_Bible_v0_3_0.md",
    "docs/Phase_0_Specification_v0_3_0.md",
    "docs/Phase_I_Specification_v0_3_0.md",
]
for r in refs:
    if r not in canon:
        canon += "\n" + r
if "One game turn equals one week." not in canon:
    canon += "\n\nOne game turn equals one week.\n"
canon_path.write_text(canon, encoding="utf-8")
print("Updated CANON.md")
