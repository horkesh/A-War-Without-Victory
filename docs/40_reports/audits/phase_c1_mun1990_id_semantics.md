# Phase C.1 mun1990_id semantics audit

**Task:** phase_c1_mun1990_id_semantics
**Rationale:** docs/FORAWWV_addendum_draft_mun1990_id.md

## Summary

| Metric | Value |
|--------|-------|
| Settlements total | 6146 |
| Invalid format count | 6146 |
| Not in registry count | 0 |

**Format requirement:** `mun1990_id` MUST match regex: `^[a-z0-9_]+$` (lowercase, ASCII, underscores only). Missing or empty is invalid.

**Registry:** Canonical list from `data/source/municipalities_1990_registry_110.json`. Any `mun1990_id` that passes format but is not in the registry is reported as not_in_registry.

---

## Examples (first 25 per class)

### Invalid format

- sid: `10014:100013`, mun1990_id: `Banja Luka`
- sid: `10014:100021`, mun1990_id: `Banja Luka`
- sid: `10014:100030`, mun1990_id: `Banja Luka`
- sid: `10014:100048`, mun1990_id: `Banja Luka`
- sid: `10014:100056`, mun1990_id: `Banja Luka`
- sid: `10014:100064`, mun1990_id: `Banja Luka`
- sid: `10014:100072`, mun1990_id: `Banja Luka`
- sid: `10014:100099`, mun1990_id: `Banja Luka`
- sid: `10014:100102`, mun1990_id: `Banja Luka`
- sid: `10014:100129`, mun1990_id: `Banja Luka`
- sid: `10014:100137`, mun1990_id: `Banja Luka`
- sid: `10014:100145`, mun1990_id: `Banja Luka`
- sid: `10014:100153`, mun1990_id: `Banja Luka`
- sid: `10014:100161`, mun1990_id: `Banja Luka`
- sid: `10014:100170`, mun1990_id: `Banja Luka`
- sid: `10014:100188`, mun1990_id: `Banja Luka`
- sid: `10014:100196`, mun1990_id: `Banja Luka`
- sid: `10014:100200`, mun1990_id: `Banja Luka`
- sid: `10014:100218`, mun1990_id: `Banja Luka`
- sid: `10014:164305`, mun1990_id: `Banja Luka`
- sid: `10049:100811`, mun1990_id: `Bihać`
- sid: `10049:100820`, mun1990_id: `Bihać`
- sid: `10049:100838`, mun1990_id: `Bihać`
- sid: `10049:100846`, mun1990_id: `Bihać`
- sid: `10049:100854`, mun1990_id: `Bihać`

### Not in registry

(none)

---

**Audit-only; no normalization applied.**

If this audit reveals additional systemic identity drift beyond mun1990_id (e.g. other id fields storing display names), **docs/FORAWWV.md may need an addendum** — do not edit automatically.