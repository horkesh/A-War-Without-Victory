# PDF source-read receipt

- Input: `C:\Users\User\.codex\worktrees\october-calibration-checkpoint\A-War-Without-Victory\docs\Balkan_BattlegroundsII.pdf`
- SHA-256: `e7a0b2f9eb696429fb502ccfb77e77ac0ae409f2b431a8a1e95bc53da1287bf7`
- Failed prerequisite attempt: `pdftotext -f 465 -l 479 -layout <input> -`; exit 1 because `pdftotext` was unavailable; no output files.
- Read-only Python check: bundled Python + `pdfplumber`; exit 0; 607 pages; pages 465/479 contained no extracted text, establishing that the earlier folio conversion targeted the wrong PDF pages.
- Visual source command: bundled `pdftoppm.exe -f 446 -l 446 -png -r 150 <input> <absolute-output-prefix>` and the same for page 460; both exits 0.
- Outputs: `BB2_pdf446-446.png` (100,648 bytes), `BB2_pdf460-460.png` (280,841 bytes).
- Visual result: PDF p.446 bears printed folio 427 and contains Chart 1; PDF p.460 bears printed folio 441 and contains Annex 45 endnote 9. Both match the source-bound KB extracts.
