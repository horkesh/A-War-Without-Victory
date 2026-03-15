# Officer Roster Overhaul — Session Report (2026-03-15)

**Scope:** GUI corps selection highlighting, officer system bug fix, historical data corrections, 17 new officers added, elite brigade commanders, combat death policy established.

**Final roster:** 98 named officers (RS: 32, RBiH: 38, HRHB: 28).

---

## 1. GUI: Corps Selection Highlighting

**Problem:** Selecting a corps in the command panel or brigade panels had no map feedback — only individual unit selection worked.

**Fix:** Selecting a corps now:
- Highlights all its sectors on the map (same visual as sector selection)
- Turns unit icons white within the corps
- Pans/zooms the map to fit all corps sectors (`fitBounds`)
- Uses persistent selection (not transient hover)

**Technical detail:** Fixed 50ms animation loop — it now only runs for transient hover highlights, not persistent corps selection. This prevents unnecessary re-renders when a corps is selected and the user is inspecting the map.

**Files:** `src/ui/map/components/MapContainer.tsx`

---

## 2. Officer System Bug Fix — Wrong Initial Commander

**Bug:** `getFormationCommander()` and `getFactionArmyCommander()` in `src/ui/map/utils/officerUtils.ts` searched the static `namedOfficerData` array without checking the runtime `status === 'active'` field in `namedOfficerStateById`.

**Symptom:** Rasim Delić (available_from_turn 60) appeared as the initial ARBiH army commander instead of Sefer Halilović. The function found Delić first in the data array and returned him because it never checked whether he was active at the current turn.

**Fix:** Both functions now check `namedOfficerStateById[id].status === 'active'` before returning a match. Only officers whose runtime state confirms them as active are considered.

**Files:** `src/ui/map/utils/officerUtils.ts`

---

## 3. Officer Data Corrections (apr1992_officers.json)

### Spelling Fixes
| Before | After | Reason |
|--------|-------|--------|
| Čikotić | Cikotić | Correct Bosnian Latin spelling (no háček on C) |
| M. Hajrulahović | Mustafa Hajrulahović | Full first name for consistency |

### Historical Corrections

| Officer | Field | Before | After | Reason |
|---------|-------|--------|-------|--------|
| Tomanić / Borić (2KK) | succession order | Borić initial, Tomanić succeeds | Tomanić initial (turn 0-110), Borić succeeds | Historical order reversed — Tomanić commanded 2KK first |
| Živanović | war_crimes verdict | "convicted" | "indicted" | Never convicted by ICTY; case referred to BiH courts |
| Andrić | war_crimes_record | Present | REMOVED | Fabricated — never tried or convicted by any court |
| Arsić | war_crimes_record | Present | REMOVED | Fabricated — never convicted; record also wrongly cited Brčko (his AOR was Prijedor) |

### Combat Death Policy (New Design Rule)

Officers who died in combat no longer use `available_until_turn`. Instead:

- **`casualty_vulnerability`** handles KIA risk organically (higher values = more likely to die in simulation)
- **`available_until_turn`** is reserved for organizational replacements: political decisions, transfers, retirements

**Affected officers (available_until_turn removed):**

| Officer | Faction | Historical Death | casualty_vulnerability |
|---------|---------|-----------------|----------------------|
| Izet Nanić | RBiH | KIA Oct 1995 | 0.20 |
| Midhad Hujdur "Hujka" | RBiH | KIA Sep 1993 | 0.25 |
| Enver Šehović | RBiH | KIA Aug 1992 | 0.30 |

---

## 4. New Officers Added (17 total)

### ARBiH — Orden heroja oslobodilačkog rata Recipients (6 new + 3 already in roster)

All 9 recipients of Bosnia's highest military decoration are now in the officer roster.

| # | Name | Corps | Region | casualty_vulnerability | Notes |
|---|------|-------|--------|----------------------|-------|
| 1 | **Safet Hadžić** | 1st Corps | Sarajevo | 0.30 | KIA Apr 18, 1992 (Pretis factory). First senior ARBiH casualty |
| 2 | **Mehdin Hodžić** | 2nd Corps | Zvornik/Sapna | 0.30 | KIA May 10, 1992. Early Drina valley defense |
| 3 | **Hajrudin Mešić** | 2nd Corps | Teočak/Ugljevik | 0.25 | "Zmaj od Majevice" (Dragon of Majevica) |
| 4 | **Adil Bešić** | 5th Corps | Bihać | 0.25 | KIA Nov 28, 1992. Bihać pocket defense |
| 5 | **Safet Zajko** | 1st Corps | Sarajevo | 0.25 | 2nd Motorized Brigade commander |
| 6 | **Nesib Malkić** | 2nd Corps | Živinice | 0.20 | 210th Mountain Brigade |
| 7 | Midhad Hujdur "Hujka" | — | — | 0.25 | Already in roster |
| 8 | Enver Šehović | — | — | 0.30 | Already in roster |
| 9 | Izet Nanić | — | — | 0.20 | Already in roster (awarded 1998) |

### ARBiH — Critical Enclave Commanders (2 new)

| # | Name | Corps | Enclave | comp | def | Notes |
|---|------|-------|---------|------|-----|-------|
| 10 | **Zaim Imamović** | 1st Corps | Goražde | 5 | 5 | "Chess player of war". enclave_lock: gorazde |
| 11 | **Avdo Palić** | 2nd Corps | Žepa | 4 | 5 | Captured/executed Jul 1995. enclave_lock: zepa |

### HVO — New Officers (7)

| # | Name | Role | Notes |
|---|------|------|-------|
| 12 | **Dario Kordić** | Lašva Valley political-military chief | ICTY convicted, 25 years. origin: political |
| 13 | **Ivo Oršolić** | 106th Brigade Orašje | Posavina pocket. War crimes indicted |
| 14 | **Živko Totić** | Jure Frančetić Brigade, Zenica | Kidnapped Apr 1993 |
| 15 | **Ilija Nakić** | 3rd Guards "Jastrebovi" | From turn 100. Central Bosnia |
| 16 | **Stanko Sopta** | 2nd Guards "Knez Domagoj" | From turn 88. Herzegovina |
| 17 | **Mato Bilonjić** | 4th Guards "Sinovi Posavine" | From turn 130. Posavina |

---

## 5. Elite Brigade Commanders (oob_brigades.json)

New `elite_commander` field added to all 8 elite brigades. These commanders are permanent — they cannot die, cannot run operations, and cannot promote to corps command. They represent the iconic commander-unit pairing (e.g., Tirić and the Black Swans).

| Brigade | Faction | Elite Commander |
|---------|---------|----------------|
| Guards Brigade "Garda" | RBiH | Dževad Rađo |
| 120th "Crni Labudovi" (Black Swans) | RBiH | Hase Tirić |
| 1st Guards Motorized Brigade | RS | Zdravko Samardžić |
| 65th Protection Regiment | RS | Milomir Savčić |
| 1st Guards Brigade "ABB" | HRHB | Željko Glasnović |
| 2nd Guards "Knez Domagoj" | HRHB | Stanko Sopta |
| 3rd Guards "Jastrebovi" | HRHB | Ilija Nakić |
| 4th Guards "Sinovi Posavine" | HRHB | Mato Bilonjić |

Also fixed: 4th Guards "Sinovi Posavine" was missing `is_elite: true`.

---

## Design Rules Established

### 1. Combat Death Policy
- `available_until_turn` = organizational replacement (political, transfer, retirement)
- `casualty_vulnerability` = combat death risk (organic, probabilistic)
- Never use `available_until_turn` to model KIA — it creates a deterministic death date

### 2. Elite Commander vs Named Officer
- **Named officers** (`apr1992_officers.json`): Corps commanders and above. Can die, transfer, succeed each other. Drive operation preparation tempo via competence/aggressiveness.
- **Elite commanders** (`oob_brigades.json`, `elite_commander` field): Permanent brigade-level. Cannot die, cannot promote, cannot run ops. Represent iconic commander-unit bonds. Purely informational for display.

### 3. Orden heroja oslobodilačkog rata
Bosnia's highest military decoration. 9 total recipients — all now documented in the officer roster. 3 were KIA (Hadžić, Hodžić, Bešić), 3 survived (Mešić, Zajko, Malkić), 3 already in roster (Nanić, Hujdur, Šehović). The decoration is informational; no gameplay modifier.

---

## Files Modified

| File | Changes |
|------|---------|
| `data/source/apr1992_officers.json` | 17 new officers, spelling fixes, historical corrections, combat death policy |
| `data/source/oob_brigades.json` | `elite_commander` on 8 brigades, `is_elite: true` on 4th Guards |
| `src/ui/map/utils/officerUtils.ts` | Active status check in getFormationCommander + getFactionArmyCommander |
| `src/ui/map/components/MapContainer.tsx` | Corps selection highlighting + fitBounds |
