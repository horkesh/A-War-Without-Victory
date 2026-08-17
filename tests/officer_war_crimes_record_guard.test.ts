import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * WAR-CRIMES RECORD GUARD
 *
 * `war_crimes_record` is the only place the simulation states that a named, real commander
 * was indicted or convicted by a real court. It is not decoration: it is read at
 * `src/scenario/oob_loader.ts`, `src/sim/combat/officer_system.ts`, and surfaced to the
 * player twice through `src/ui/map/data/GameStateAdapter.ts`. Losing one of these entries
 * quietly rewrites what the game says about the war.
 *
 * A count-only guard is not enough — it would still permit swapping one commander's record
 * onto another, or softening a `verdict` in place. This guard therefore pins three separate
 * properties:
 *
 *   1. SUPERSET  — the live set of ids carrying a record contains every pinned id.
 *   2. CONTENT   — for every pinned id, `court` / `verdict` / `charges` are unchanged.
 *   3. ALLOWLIST — a removal is possible, but only via a named entry carrying a reason.
 *                  Never silently.
 *
 * `sentence` and `summary` are intentionally NOT pinned: they are editable prose. The court,
 * the verdict, and the charges are the adjudicated facts and are pinned exactly.
 *
 * Adding new records is always allowed — the pin is a floor, not a freeze.
 *
 * AN EMPTY PINNED FIELD IS AN ASSERTION, NOT A GAP.
 *
 * `charges: ""` does not mean "we haven't filled this in yet". It means: this court made no
 * charge, and the empty field is the finding. The guard reads a live record as
 * `record[field] ?? ''`, so an absent field and an empty pin compare equal — which is
 * precisely how an empty pin does its work. It holds the emptiness in place.
 *
 * This matters most for the man who is named but never accused. `officer:hvo_siljeg` is
 * named in the ICTY's Prlić findings and was never charged by anyone; the ICTY conviction
 * and 10-year sentence that once sat in his record existed nowhere but the record itself.
 * The most likely future damage to that entry is not deletion — it is someone reading the
 * blank as an omission and helpfully filling it in with charges no court ever brought.
 * The empty pin is what stops that, and it is the reason `charges: ""` must never be
 * "tidied up" to a placeholder, a `null`, or a removed key.
 *
 * So: filling an asserted-empty field is held to the same bar as removing a record whole.
 * Both need a named, sourced justification recorded here — an allowlist entry for a removal,
 * an inline source note on the pin for a value change (see the two corrected pins below for
 * the pattern). Neither may land as a silent diff.
 *
 * See docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md.
 */

const OFFICERS_PATH = ['data', 'scenarios', 'officers', 'apr1992_officers.json'];
const BRIGADES_PATH = ['data', 'source', 'oob_brigades.json'];

interface WarCrimesRecord {
    court?: string;
    verdict?: string;
    charges?: string;
    sentence?: string;
    summary?: string;
}

interface PinnedRecord {
    name: string;
    court: string;
    verdict: string;
    charges: string;
}

/**
 * Pinned baseline, captured 2026-08-16 at `514d379e3`, re-pinned the same day after
 * `/historian` and R7P2-Records corrected the two entries below.
 *
 * Those two (`officer:vrs_zivanovic`, `officer:hvo_siljeg`) had already been deleted once, by
 * a provenance rule that read a blank `court_record_citation` as grounds to remove the
 * finding. That rule is now a non-blocking TODO; this list is why the deletion cannot recur
 * unnoticed. Restoring them then exposed a second problem: the restored content was itself
 * wrong. The guard caught that too — it went red on five fields, which is what sent the
 * question to the historians rather than letting the wrong text sit.
 *
 * To REMOVE an entry from playable data: LEAVE it on this list and add a `REMOVAL_ALLOWLIST`
 * entry stating why. The pin stays so the list keeps a record of what was removed and on
 * whose reasoning — deleting the pin along with the record would erase both at once.
 * To ADD an entry: just add it here (or don't — the guard is a floor).
 */
const PINNED_WAR_CRIMES_RECORDS: Readonly<Record<string, PinnedRecord>> = {
    "elite_commander:rs_65th_protection_motorized_regiment": { name: "Milomir Savčić", court: "BiH State Court", verdict: "indicted", charges: "Aiding and abetting genocide (Srebrenica)" },
    "officer:arbih_alagic": { name: "Mehmed Alagić", court: "ICTY", verdict: "died_before_trial", charges: "Violations of laws of war (murder, cruel treatment, wanton destruction)" },
    "officer:arbih_delic": { name: "Rasim Delić", court: "ICTY", verdict: "convicted", charges: "Violations of laws of war (cruel treatment by mujahedin fighters)" },
    "officer:arbih_dudakovic": { name: "Atif Dudaković", court: "BiH State Court", verdict: "indicted", charges: "Crimes against humanity (murder, persecution of Serb civilians)" },
    "officer:arbih_hadzihasanovic": { name: "Enver Hadžihasanović", court: "ICTY", verdict: "convicted", charges: "Violations of laws of war (command responsibility)" },
    "officer:arbih_halilovic": { name: "Sefer Halilović", court: "ICTY", verdict: "acquitted", charges: "Violations of laws of war (command responsibility for Grabovica and Uzdol massacres)" },
    "officer:arbih_mahmuljin": { name: "Sakib Mahmuljin", court: "BiH State Court", verdict: "convicted", charges: "War crimes against prisoners of war" },
    "officer:arbih_oric": { name: "Naser Orić", court: "ICTY", verdict: "acquitted", charges: "Violations of laws of war (murder and cruel treatment of Serb prisoners)" },
    "officer:hvo_blaskic": { name: "Tihomir Blaškić", court: "ICTY", verdict: "convicted", charges: "Crimes against humanity (persecution), violations of laws of war" },
    "officer:hvo_blaskic_2": { name: "Tihomir Blaškić (army)", court: "ICTY", verdict: "convicted", charges: "Crimes against humanity (persecution), violations of laws of war" },
    "officer:hvo_cerkez": { name: "Mario Čerkez", court: "ICTY", verdict: "convicted", charges: "Crimes against humanity (persecution), violations of laws of war" },
    "officer:hvo_kordic": { name: "Dario Kordić", court: "ICTY", verdict: "convicted", charges: "Crimes against humanity (persecution, murder, deportation), unlawful attacks on civilians, wanton destruction" },
    "officer:hvo_naletlic": { name: "Mladen Naletilić \"Tuta\"", court: "ICTY", verdict: "convicted", charges: "Crimes against humanity (persecution, murder, rape), grave breaches of Geneva Conventions" },
    "officer:hvo_orsolc": { name: "Ivo Oršolić", court: "BiH State Court", verdict: "indicted", charges: "Crimes against Serbian civilians in Orašje area 1992-1993" },
    "officer:hvo_petkovic": { name: "Milivoj Petković", court: "ICTY", verdict: "convicted", charges: "Crimes against humanity (persecution, murder, deportation), violations of laws of war" },
    "officer:hvo_petkovic_2": { name: "Milivoj Petković (2nd tenure)", court: "ICTY", verdict: "convicted", charges: "Crimes against humanity (persecution, murder, deportation), violations of laws of war" },
    "officer:hvo_praljak": { name: "Slobodan Praljak", court: "ICTY", verdict: "convicted", charges: "Crimes against humanity, destruction of Stari Most (Old Bridge of Mostar)" },
    "officer:hvo_rajic": { name: "Ivica Rajić", court: "ICTY", verdict: "convicted", charges: "Grave breaches of Geneva Conventions, violations of laws of war" },
    // CORRECTED 2026-08-16 (R7P2-Records, ICTY Prlić et al. Vol. 2 §135). The BiH State Court
    // conviction and 10-year sentence previously pinned here existed nowhere but this data
    // record. The ICTY named him expressly in its findings but never charged him, so the
    // record is converted, not removed. `charges: ""` is the asserted absence — see header.
    "officer:hvo_siljeg": { name: "Željko Šiljeg", court: "ICTY", verdict: "named_in_findings", charges: "" },
    "officer:vrs_blagojevic": { name: "Vidoje Blagojević", court: "ICTY", verdict: "convicted", charges: "Crimes against humanity (persecution, inhumane acts), aiding forcible transfer" },
    "officer:vrs_d_milosevic": { name: "Dragomir Milošević", court: "ICTY", verdict: "convicted", charges: "Crimes against humanity (murder, inhumane acts), terror, unlawful attacks on civilians" },
    "officer:vrs_galic": { name: "Stanislav Galić", court: "ICTY", verdict: "convicted", charges: "Crimes against humanity (murder, inhumane acts), terror against civilian population" },
    "officer:vrs_krstic": { name: "Radislav Krstić", court: "ICTY", verdict: "convicted", charges: "Aiding and abetting genocide, crimes against humanity (persecution, murder)" },
    "officer:vrs_miletic": { name: "Radivoje Miletić", court: "ICTY", verdict: "convicted", charges: "Crimes against humanity (persecution, forcible transfer, murder)" },
    "officer:vrs_mladic": { name: "Ratko Mladić", court: "ICTY", verdict: "convicted", charges: "Genocide, crimes against humanity, violations of laws of war" },
    "officer:vrs_obrenovic": { name: "Dragan Obrenović", court: "ICTY", verdict: "convicted", charges: "Persecution as crime against humanity" },
    "officer:vrs_pandurevic": { name: "Vinko Pandurević", court: "ICTY", verdict: "convicted", charges: "Aiding and abetting murder and persecution" },
    "officer:vrs_talic": { name: "Momir Talić", court: "ICTY", verdict: "died_before_trial", charges: "Crimes against humanity (persecution), violations of laws of war" },
    "officer:vrs_tolimir": { name: "Zdravko Tolimir", court: "ICTY", verdict: "convicted", charges: "Genocide, conspiracy to commit genocide, crimes against humanity" },
    // CORRECTED 2026-08-16 (/historian; Canon-S6 corrected its own earlier ruling). The ICTY
    // never indicted him — it recorded his command only in judgements against other men. The
    // Court of BiH did: crimes against humanity covering Srebrenica and Žepa, confirmed
    // December 2021, international arrest warrant outstanding since 2023. The `verdict` was
    // right all along; the court and the charges were not.
    "officer:vrs_zivanovic": { name: "Milenko Živanović", court: "BiH State Court", verdict: "indicted", charges: "Crimes against humanity (Srebrenica and Žepa, July 1995)" },
};

/**
 * Named removals. Key = pinned record key, value = the reason it may leave playable data.
 *
 * "The provenance harness flagged it" is NOT a reason — an uncited finding needs a citation,
 * not a deletion. Legitimate reasons look like: the officer is no longer in the game at all,
 * or the historical finding itself was shown to be wrong (with the source that shows it).
 */
const REMOVAL_ALLOWLIST: Readonly<Record<string, string>> = {};

interface LiveRecord {
    name: string;
    record: WarCrimesRecord;
}

function collectLiveRecords(): Map<string, LiveRecord> {
    const officers = JSON.parse(readFileSync(join(process.cwd(), ...OFFICERS_PATH), 'utf8')) as {
        officers: Array<{ id: string; name: string; war_crimes_record?: WarCrimesRecord }>;
    };
    const brigades = JSON.parse(readFileSync(join(process.cwd(), ...BRIGADES_PATH), 'utf8')) as Array<{
        id: string;
        elite_commander?: { name?: string; war_crimes_record?: WarCrimesRecord } | null;
    }>;

    const live = new Map<string, LiveRecord>();
    for (const officer of officers.officers) {
        if (officer.war_crimes_record == null) continue;
        live.set(`officer:${officer.id}`, { name: officer.name, record: officer.war_crimes_record });
    }
    for (const brigade of brigades) {
        const record = brigade.elite_commander?.war_crimes_record;
        if (record == null) continue;
        live.set(`elite_commander:${brigade.id}`, { name: brigade.elite_commander?.name ?? '', record });
    }
    return live;
}

function sorted(values: Iterable<string>): string[] {
    return [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

describe('war_crimes_record guard', () => {
    const live = collectLiveRecords();

    it('holds a superset of the pinned record ids — a removal is never silent', () => {
        const missing = sorted(Object.keys(PINNED_WAR_CRIMES_RECORDS).filter((key) => !live.has(key)));
        const unexplained = missing.filter((key) => REMOVAL_ALLOWLIST[key] == null);

        // Discriminating assertion: pinned id absent from live data with no allowlist entry.
        expect(unexplained).toEqual([]);
    });

    it('preserves court, verdict, and charges verbatim for every pinned record', () => {
        const drift: Array<{ record_key: string; field: string; pinned: string; live: string }> = [];

        for (const recordKey of sorted(Object.keys(PINNED_WAR_CRIMES_RECORDS))) {
            const entry = live.get(recordKey);
            if (!entry) continue; // absence is the superset test's business, not this one's
            const pinned = PINNED_WAR_CRIMES_RECORDS[recordKey];
            for (const field of ['court', 'verdict', 'charges'] as const) {
                const actual = entry.record[field] ?? '';
                if (actual !== pinned[field]) {
                    drift.push({ record_key: recordKey, field, pinned: pinned[field], live: actual });
                }
            }
            // Catches a record moved onto the wrong commander even when the wording survives.
            if (entry.name !== pinned.name) {
                drift.push({ record_key: recordKey, field: 'name', pinned: pinned.name, live: entry.name });
            }
        }

        // Discriminating assertion: any in-place edit to an adjudicated fact, or a record
        // relocated onto a different commander, appears here.
        expect(drift).toEqual([]);
    });

    it('requires every allowlisted removal to carry a reason and to actually be a removal', () => {
        const withoutReason = sorted(Object.entries(REMOVAL_ALLOWLIST)
            .filter(([, reason]) => reason.trim().length === 0)
            .map(([recordKey]) => recordKey));
        const notPinned = sorted(Object.keys(REMOVAL_ALLOWLIST)
            .filter((recordKey) => PINNED_WAR_CRIMES_RECORDS[recordKey] == null));
        const stillPresent = sorted(Object.keys(REMOVAL_ALLOWLIST).filter((recordKey) => live.has(recordKey)));

        // Discriminating assertions: a blank excuse, an allowlist entry for something that
        // was never pinned, and a stale entry left behind after the record came back.
        expect(withoutReason).toEqual([]);
        expect(notPinned).toEqual([]);
        expect(stillPresent).toEqual([]);
    });

    it('records the two entries that were already deleted once, at their corrected values', () => {
        // Regression pin. These were stripped while both officers stayed playable, because a
        // blank court_record_citation was read as "unsourced, therefore false". They were then
        // restored verbatim — and the restored text turned out to be wrong in both directions,
        // so these are the corrected findings, not the ones that were deleted.
        expect(live.get('officer:vrs_zivanovic')?.record).toMatchObject({
            court: 'BiH State Court',
            verdict: 'indicted',
            charges: 'Crimes against humanity (Srebrenica and Žepa, July 1995)',
        });

        const siljeg = live.get('officer:hvo_siljeg')?.record;
        expect(siljeg).toMatchObject({ court: 'ICTY', verdict: 'named_in_findings' });
        // Asserted absence, stated separately because there is no field to match against:
        // named in the Prlić findings, charged by nobody. Anything here is a fabrication.
        expect(siljeg?.charges ?? '').toBe('');
    });
});
