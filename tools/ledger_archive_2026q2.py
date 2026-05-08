#!/usr/bin/env python3
"""Aggressive ledger archival: move all entries dated 2026-04-XX out of
PROJECT_LEDGER.md into PROJECT_LEDGER_ARCHIVE_2026Q2.md.

Live ledger (`docs/PROJECT_LEDGER.md`) is NOT strictly date-sorted because
entries were sometimes appended out of order. This script does a block-based
parse to handle that.

Strategy:
1. Parse live ledger into entry blocks delimited by `## [YYYY-MM-DD]` headers.
2. Capture pre-amble (anything before the first dated header — typically empty).
3. Split blocks: keep entries dated >= 2026-05-01 in live; move 2026-04-* to a
   fresh `PROJECT_LEDGER_ARCHIVE_2026Q2.md` file (Q2 = Apr-Jun 2026).
4. Sort moved blocks by date descending (newest first) before writing archive.
5. Live ledger keeps its original order (no resort) since entry order matters
   less than presence-vs-absence.
6. Add a pointer header at the top of live ledger linking to archives.

The Q1 archive at `PROJECT_LEDGER_ARCHIVE_2026Q1.md` (Jan-Mar 2026, with one
2026-04-02 stray) is left untouched — the new Q2 archive picks up from
2026-04-15 forward (the oldest 2026-04 entries currently in live).
"""

from __future__ import annotations

import re
from pathlib import Path

LIVE = Path("docs/PROJECT_LEDGER.md")
NEW_ARCHIVE = Path("docs/PROJECT_LEDGER_ARCHIVE_2026Q2.md")
CUTOFF_PREFIX = "2026-04"  # Move any block dated 2026-04-XX
DATE_HEADER = re.compile(r"^## \[(\d{4}-\d{2}-\d{2})\]")


def parse_blocks(text: str) -> tuple[list[str], list[tuple[str, str]]]:
    """Return (preamble_lines, [(date_str, full_block_text), ...])."""
    lines = text.splitlines(keepends=True)
    preamble: list[str] = []
    blocks: list[tuple[str, list[str]]] = []
    current_date: str | None = None
    current_lines: list[str] = []
    for line in lines:
        m = DATE_HEADER.match(line)
        if m:
            if current_date is not None:
                blocks.append((current_date, current_lines))
            current_date = m.group(1)
            current_lines = [line]
        elif current_date is None:
            preamble.append(line)
        else:
            current_lines.append(line)
    if current_date is not None:
        blocks.append((current_date, current_lines))
    return preamble, [(d, "".join(b)) for d, b in blocks]


def main() -> int:
    text = LIVE.read_text(encoding="utf-8")
    preamble, blocks = parse_blocks(text)
    keep_blocks: list[tuple[str, str]] = []
    move_blocks: list[tuple[str, str]] = []
    for date_str, body in blocks:
        if date_str.startswith(CUTOFF_PREFIX):
            move_blocks.append((date_str, body))
        else:
            keep_blocks.append((date_str, body))

    print(f"Total blocks: {len(blocks)}")
    print(f"Keep (post-cutoff, 2026-05+): {len(keep_blocks)}")
    print(f"Move (2026-04-*): {len(move_blocks)}")

    if not move_blocks:
        print("Nothing to move; aborting.")
        return 0

    move_blocks.sort(key=lambda kv: kv[0], reverse=True)
    archive_header = (
        "# Project Ledger Archive — 2026 Q2 (April–June)\n\n"
        "Archived from `docs/PROJECT_LEDGER.md` 2026-05-08 to keep the live\n"
        "ledger scannable. Entries are reverse-chronological (newest first).\n"
        "The 2026-Q1 archive (`PROJECT_LEDGER_ARCHIVE_2026Q1.md`) covers the\n"
        "earlier band (Jan–Mar 2026 + one 2026-04-02 stray). This Q2 archive\n"
        "picks up from 2026-04-15 forward.\n\n"
        "---\n\n"
    )
    NEW_ARCHIVE.write_text(archive_header + "".join(b for _, b in move_blocks), encoding="utf-8")
    print(f"Wrote {NEW_ARCHIVE} ({sum(len(b) for _, b in move_blocks)} bytes)")

    pointer_block = (
        "<!-- LEDGER ARCHIVE POINTERS -->\n"
        "<!-- Older entries archived to:\n"
        "     - `docs/PROJECT_LEDGER_ARCHIVE_2026Q1.md` (Jan–Mar 2026 + 2026-04-02 stray)\n"
        "     - `docs/PROJECT_LEDGER_ARCHIVE_2026Q2.md` (April 2026; archived 2026-05-08)\n"
        "-->\n\n"
    )
    new_live_text = pointer_block + "".join(preamble) + "".join(b for _, b in keep_blocks)
    LIVE.write_text(new_live_text, encoding="utf-8")
    print(f"Wrote {LIVE} ({len(new_live_text)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
