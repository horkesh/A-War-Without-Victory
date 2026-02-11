mun1990_id semantics decision note
Status: Approved decision note (implementation to follow in a separate phase)
Scope: Municipality identity semantics for 1990 (pre-war) municipality framework
Applies to: All simulation logic, derived artifacts, audits, controller initialization, and any future institution systems
1) Decision
mun1990_id is a stable, canonical municipality identifier for pre-1991 / 1990 opštine.
It MUST be:
•	lowercase
•	ASCII-only
•	diacritic-stripped
•	snake_case (underscores between words)
•	deterministically derived from the municipality’s canonical 1990 name (or an explicitly curated canonical key list)
Example:
•	Municipality full name: Lištica
•	mun1990_id: listica
This field is a key, not a label.
2) What mun1990_id is NOT
mun1990_id must never contain:
•	diacritics (č ć đ š ž)
•	mixed case
•	spaces or hyphens
•	display names (e.g., “Lištica”, “Stari Grad Sarajevo”)
•	post-1995 municipality codes or labels
Display names are allowed elsewhere, but not in mun1990_id.
3) Related fields and their meaning
To prevent future drift, municipality identity must be expressed via distinct fields:
•	mun1990_id
Canonical key used by simulation logic, joins, indexing, and all identity comparisons.
•	mun1990_name (or equivalent)
Human-readable 1990 municipality name (may contain diacritics). Used only for UI, reporting, and documentation.
•	mun_code / mun_post1995_code (if present)
Codes from donor datasets or post-1995 systems. These are inputs to remap logic, never canonical keys for the simulation layer.
If a file currently stores a display name in mun1990_id, that is a schema/semantic error and must be corrected in the generating pipeline.
4) Canonical source of truth
The canonical list of 1990 municipalities is data/source/municipalities_1990_registry_110.json.
That registry defines:
•	the authoritative municipality set (110)
•	the canonical key (mun1990_id or an equivalent stable id field)
•	the display name field (human-readable)
Derived artifacts must conform to the registry keys.
5) Deterministic normalization rule
Where deterministic derivation is required, normalize municipality names to mun1990_id using:
•	trim whitespace
•	Unicode NFD normalize
•	strip combining diacritics
•	lowercase
•	replace any sequence of non-alphanumeric characters with _
•	collapse repeated _
•	trim leading/trailing _
However:
If the registry already provides a canonical mun1990_id, use it directly rather than re-deriving.
Derivation is only for diagnostics and for mapping external sources, not for defining canon.
6) Invariants (must hold everywhere)
Any artifact or state that includes mun1990_id must satisfy:
•	Every settlement maps to exactly one mun1990_id that exists in the registry (except explicitly defined Phase 6E.2 exceptions).
•	Any remap from post-1995 municipality identifiers must resolve to a valid registry mun1990_id, deterministically.
•	Political controller initialization must key on mun1990_id, never on display names or post-1995 codes.
•	No subsystem may rely on display names for joins.
7) Implication from Phase C audit
The Phase C political controller remap audit failing at ~50% resolution indicates a semantic mismatch:
•	settlements_index_1990.json appears to contain display names in mun1990_id (e.g., “Lištica”), which violates this decision.
•	Controller mapping and remap tables expect canonical keys (e.g., listica).
This must be fixed by correcting the pipeline that writes settlements_index_1990.json to ensure mun1990_id is always the canonical key.
This is a data semantics correction, not a mechanics change.
8) Migration / correction policy (implementation guidance)
When correcting existing derived outputs:
•	Do not rewrite raw source history.
•	Fix the generator that produces the derived file(s).
•	Regenerate derived artifacts deterministically.
•	Add/extend audits to prevent regression:
o	assert mun1990_id is ASCII snake_case
o	assert mun1990_id ∈ registry
o	assert display names live in a separate field
9) Non-goals
This decision does not:
•	change municipality set cardinality (still 110 canonical, 109 observed due to Phase 6E.2 Milići exception)
•	alter any mechanics
•	resolve political controller mapping coverage by adding new controllers
•	reinterpret post-1995 boundaries or municipal splits
It strictly defines identity semantics and join discipline.
10) Next step placeholder
A future phase will:
•	identify the generator writing display names into mun1990_id
•	correct it to emit canonical keys from the registry
•	re-run the Phase C audit until controller coverage is complete (or explicitly-null where allowed)
Note: If this correction reveals a systemic design insight (e.g., a deeper mismatch between municipality identity layers), a FORAWWV addendum may be required.

