# ADR-0008: Source-available under the PolyForm Noncommercial licence

## Status

**Accepted 2026-11-14 (owner request).** The owner asked for a licence file and then asked that it follow the Mandate repository (`horkesh/Mandate`, decision 0014, accepted the same day).

## Context

- The repository `horkesh/A-War-Without-Victory` is public on GitHub and had no licence. Public code without a licence is "all rights reserved" by default: anyone may read it, but nobody may use, copy or modify it.
- A War Without Victory is meant to become a commercial game.
- Licences only loosen safely. Code released under a permissive licence stays under it forever for every version released that way. A restrictive licence can be relaxed later.

## Decision

A War Without Victory is licensed under the **PolyForm Noncommercial License 1.0.0**. `LICENSE.md` holds the official text, byte-identical to Mandate's, with the required notice "Copyright 2026 horkesh (https://github.com/horkesh)".

- Anyone may read, study, modify and share the code for noncommercial purposes: personal study, hobby projects, mods, research, and use by charities, schools and public bodies.
- Commercial use stays with the owner, who can grant separate commercial licences.

Rejected (as for Mandate):
- **All rights reserved** (the first draft of this change). It's the most protective, but gives readers of a public repository no right to study or mod.
- **MIT or another permissive open-source licence.** Anyone could sell a game built on the engine, and that grant could never be withdrawn for the versions released under it.

## Consequences

- `package.json` declares `"license": "PolyForm-Noncommercial-1.0.0"` (its SPDX identifier), and the README names the licence.
- Outside contributions would need a contributor agreement before they could be accepted, so the owner keeps the right to license commercially.
- Third-party code, data and assets keep their own licences and must not be committed unless those licences allow it. This covers OpenStreetMap-derived map data (ODbL 1.0, attribution required), the VSCO 2 CE audio samples (CC0, see `docs/audio/LICENSES/`), fonts and npm dependencies. A full third-party notices file and visible OSM attribution on the war map are separate work, tracked as register item LIC1 and the R9 licence/SBOM gate.
- Packaging is unchanged. Shipping `LICENSE.md` with the installer belongs to the R9 licence/SBOM gate.
- The owner may relax the licence later, for example to a permissive one, by superseding this record. Tightening it applies only to future versions.
