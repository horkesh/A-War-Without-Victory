#!/usr/bin/env python3
"""
Phase H1.2.2: Extract 1990 municipal election winners from DOCX → municipality→controller mapping.
Deterministic: no timestamps, stable key ordering, strict party→controller mapping.
Output schema: { "version": "extract1990_v1", "mappings": { "<post1995_code>": "RBiH"|"RS"|"HRHB" } }.
Keys = post1995_code (from municipality_post1995_to_mun1990); values = canonical controller.
Party→controller (from ledger 6B.2): SDA→RBiH, SK-SDP→RBiH, SDS→RS, HDZ BiH→HRHB.
"""

import argparse
import json
import re
import sys
from pathlib import Path

# Optional: python-docx (fail loudly if missing)
try:
    from docx import Document as DocxDocument
except ImportError:
    sys.stderr.write(
        "Error: python-docx is required. Install with: pip install python-docx\n"
    )
    sys.exit(1)

# Canonical controller enum (no null in extraction; unmapped municipalities are omitted)
CONTROLLERS = ("RBiH", "RS", "HRHB")

# Party name / abbreviation → controller (deterministic; do not guess unknown)
PARTY_TO_CONTROLLER = {
    "SDA": "RBiH",
    "SK-SDP": "RBiH",
    "SDS": "RS",
    "HDZ BiH": "HRHB",
    "HDZ": "HRHB",  # common abbreviation
}


def normalize_cell_text(text):
    """Normalize for matching: strip, collapse whitespace, remove footnotes [1], [a], etc."""
    if not text or not isinstance(text, str):
        return ""
    t = text.strip()
    t = re.sub(r"\s+", " ", t)
    t = re.sub(r"\s*\[[^\]]*\]\s*", "", t)  # footnotes [1], [a]
    t = t.strip()
    return t


def normalize_municipality_name(name):
    """Normalize municipality name for lookup: remove entity suffixes (FBiH)/(RS), hyphens→space."""
    t = normalize_cell_text(name)
    t = re.sub(r"\s*\((?:FBiH|RS)\)\s*$", "", t, flags=re.IGNORECASE)
    t = re.sub(r"-", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def party_to_controller(party_raw):
    """Map party string to controller. Returns None if unknown (caller should fail)."""
    p = normalize_cell_text(party_raw)
    if not p:
        return None
    # Exact match first
    if p in PARTY_TO_CONTROLLER:
        return PARTY_TO_CONTROLLER[p]
    # Normalize for key match (strip parentheses content for display variants)
    p_norm = re.sub(r"\s*\([^)]*\)\s*", "", p).strip()
    if p_norm in PARTY_TO_CONTROLLER:
        return PARTY_TO_CONTROLLER[p_norm]
    return None


def load_municipality_index(remap_path):
    """
    Load remap JSON and build (normalized_name, display_name) -> [post1995_codes].
    We need to map DOCX municipality names to post1995_code. Remap has post1995_code -> mun1990_name.
    Also rows have post1995_name. Build: for each row, (normalized(mun1990_name), post1995_code), (normalized(post1995_name), post1995_code).
    Return dict: normalized_key -> list of post1995_codes (sorted for determinism).
    """
    path = Path(remap_path)
    if not path.exists():
        raise FileNotFoundError(f"Municipality index/remap not found: {remap_path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    rows = data.get("rows") or []
    index_by_code = data.get("index_by_post1995_code") or {}
    # Build name -> [codes]. From rows we have post1995_code, post1995_name, mun1990_name.
    name_to_codes = {}
    for row in rows:
        code = row.get("post1995_code")
        if not code:
            continue
        for key in (
            row.get("mun1990_name"),
            row.get("post1995_name"),
        ):
            if key:
                norm = normalize_municipality_name(key)
                if norm:
                    name_to_codes.setdefault(norm, []).append(code)
    for code, name in (index_by_code or {}).items():
        if name:
            norm = normalize_municipality_name(name)
            if norm:
                name_to_codes.setdefault(norm, []).append(code)
    # Deduplicate and sort per key
    for k in name_to_codes:
        name_to_codes[k] = sorted(set(name_to_codes[k]))
    return name_to_codes


def get_cell_text(cell):
    """Get cell text (for merged cells, python-docx often gives text only in first cell)."""
    return (cell.text or "").strip()


def find_table_with_headers(doc, municipality_headers=("općina", "opcina"), party_headers=("stranka",)):
    """Find first table that has header row containing municipality and party column names."""
    for table in doc.tables:
        if not table.rows:
            continue
        header_row = table.rows[0]
        header_texts = [get_cell_text(cell) for cell in header_row.cells]
        header_lower = [t.lower() for t in header_texts]
        has_muni = any(
            any(h in t or t in h for h in municipality_headers for t in header_lower)
        )
        has_party = any(
            any(h in t or t in h for h in party_headers for t in header_lower)
        )
        if has_muni and has_party:
            return table, header_texts
    return None, []


def extract_pairs_from_table(table, header_texts):
    """
    Yield (municipality_name, party_name) from table. Skip header row.
    Support 4-column layout: općina left, stranka left, općina right, stranka right.
    Use first two columns as primary; if empty, use next two (or single pair if 2-col).
    """
    municipality_keywords = ("općina", "opcina")
    party_keywords = ("stranka",)
    rows = table.rows
    if not rows:
        return
    for row_idx, row in enumerate(rows):
        if row_idx == 0:
            continue
        cells = row.cells
        if len(cells) < 2:
            continue
        # Try first two columns as (muni, party)
        muni_a, party_a = get_cell_text(cells[0]), get_cell_text(cells[1])
        if muni_a and party_a:
            yield muni_a, party_a
        if len(cells) >= 4:
            muni_b, party_b = get_cell_text(cells[2]), get_cell_text(cells[3])
            if muni_b and party_b:
                yield muni_b, party_b


def main():
    parser = argparse.ArgumentParser(
        description="Extract 1990 municipal winners from DOCX to municipality_political_controllers JSON"
    )
    parser.add_argument("--input", required=True, help="Path to DOCX file")
    parser.add_argument("--output", required=True, help="Path to output JSON file")
    parser.add_argument(
        "--index",
        required=True,
        help="Path to municipality_post1995_to_mun1990.json (for name→code mapping)",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        sys.stderr.write(f"Error: DOCX not found: {input_path}\n")
        sys.exit(1)

    name_to_codes = load_municipality_index(args.index)

    doc = DocxDocument(str(input_path))
    table, header_texts = find_table_with_headers(doc)
    if table is None:
        sys.stderr.write(
            "Error: No table found with Općina/Stranka-style headers in DOCX.\n"
        )
        sys.exit(1)

    # Collect (post1995_code, controller) for each row; allow multiple codes per name (parent expansion)
    mapping = {}
    unknown_parties = set()
    unmatched_municipalities = set()

    for muni_name, party_name in extract_pairs_from_table(table, header_texts):
        controller = party_to_controller(party_name)
        if controller is None:
            if party_name:
                unknown_parties.add(party_name)
            continue
        norm_name = normalize_municipality_name(muni_name)
        if not norm_name:
            continue
        codes = name_to_codes.get(norm_name)
        if not codes:
            unmatched_municipalities.add(muni_name)
            continue
        for code in codes:
            mapping[code] = controller

    if unknown_parties:
        sys.stderr.write(
            f"Error: Unknown party names (cannot map to RBiH/RS/HRHB): {sorted(unknown_parties)}\n"
        )
        sys.exit(1)

    if not mapping:
        sys.stderr.write(
            "Error: Mapping is empty. Check DOCX table structure and index.\n"
        )
        sys.exit(1)

    # Deterministic output: sort keys
    out = {
        "version": "extract1990_v1",
        "mappings": dict(sorted(mapping.items())),
    }
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(out, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    if unmatched_municipalities:
        sys.stderr.write(
            f"Warning: Unmatched municipalities (not in index): {sorted(unmatched_municipalities)}\n"
        )


if __name__ == "__main__":
    main()
