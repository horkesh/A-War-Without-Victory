## 2026-11-14 — Licence: PolyForm Noncommercial 1.0.0, as in Mandate (re-land of #612's second commit)

Owner decision (2026-11-14): the licence follows the Mandate repository. #612 auto-merged its first commit, a proprietary all-rights-reserved `LICENSE`, about a minute before the switch to PolyForm was pushed. So main carried the wrong licence, while the PR title said PolyForm. The steward found the mismatch in pass 8.

This change lands the switch:
- `LICENSE` (proprietary) is removed. `LICENSE.md` is the official PolyForm Noncommercial 1.0.0 text, byte-identical to Mandate's, with "Required Notice: Copyright 2026 horkesh".
- `package.json` declares `PolyForm-Noncommercial-1.0.0`.
- The README gains a Licence section: third-party licences, OSM under ODbL 1.0, and a no-affiliation note.
- ADR-0008 records the decision.
- The `THIRD_PARTY_NOTICES.md` header and its generator template (`tools/licensing/third_party_notices.mjs`) no longer call the game proprietary software of Pyrrhic Games.

The 2026-11-14 "Proprietary LICENSE file" entry in `PROJECT_LEDGER.md` is superseded by this one. No behaviour, data, save or packaging change. Bundling the licence into the installer stays with the R9 licence/SBOM gate.
