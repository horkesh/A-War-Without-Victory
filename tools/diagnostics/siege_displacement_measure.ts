/**
 * DA1 measurement (siege displacement lane, 2026-11-13): humanitarian and manpower
 * figures from a final save, for before/after comparison of the pressure path.
 *
 * Read-only. Usage: npx tsx tools/diagnostics/siege_displacement_measure.ts <final_save.json> [--json]
 */
import { readFileSync } from 'node:fs';
import { deserializeState } from '../../src/state/serialize.js';

const WATCH_MUNS = [
    'centar_sarajevo', 'novi_grad_sarajevo', 'novo_sarajevo', 'stari_grad_sarajevo', 'ilidza', 'vogosca', 'hadzici', 'ilijas',
    'gorazde', 'srebrenica', 'rogatica', 'bihac', 'cazin', 'velika_kladusa', 'bosanska_krupa', 'maglaj', 'tesanj',
    'mostar', 'zenica', 'tuzla', 'travnik', 'vitez', 'busovaca', 'konjic', 'olovo', 'gradacac', 'brcko', 'doboj', 'zvornik',
];

function main(): void {
    const path = process.argv[2];
    if (!path) throw new Error('usage: siege_displacement_measure.ts <final_save.json>');
    const state = deserializeState(readFileSync(path, 'utf8'));
    const d = state.displacement;

    const cc = d.civilian_casualties ?? {};
    const aggregates = d.displacement_humanitarian_aggregates ?? {};
    const causedRows: Array<{ caused_by: string; people: string; created: number; killed: number; received: number }> = [];
    for (const by of Object.keys(aggregates).sort()) {
        for (const people of Object.keys(aggregates[by]).sort()) {
            const r = aggregates[by][people];
            causedRows.push({ caused_by: by, people, created: r.refugees_created, killed: r.civilian_casualties_caused, received: r.refugees_received });
        }
    }

    let out = 0, inn = 0, lost = 0, orig = 0;
    const byMun: Record<string, { orig: number; out: number; in: number; lost: number; remaining: number }> = {};
    for (const [mun, s] of Object.entries(d.displacement_state ?? {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
        out += s.displaced_out; inn += s.displaced_in; lost += s.lost_population; orig += s.original_population;
        if (WATCH_MUNS.includes(mun)) {
            byMun[mun] = { orig: s.original_population, out: s.displaced_out, in: s.displaced_in, lost: s.lost_population, remaining: s.original_population - s.displaced_out - s.lost_population + s.displaced_in };
        }
    }

    const pools = state.military.militia_pools ?? {};
    const poolsByFaction: Record<string, { available: number; committed: number }> = {};
    for (const k of Object.keys(pools).sort()) {
        const p = pools[k] as { faction?: string; available?: number; committed?: number };
        const f = String(p.faction ?? 'none');
        poolsByFaction[f] ??= { available: 0, committed: 0 };
        poolsByFaction[f].available += p.available ?? 0;
        poolsByFaction[f].committed += p.committed ?? 0;
    }

    const log = d.displacement_event_log ?? [];
    const eventsByCauser: Record<string, { events: number; displaced: number; killed: number; fled: number }> = {};
    for (const e of log) {
        const k = String(e.caused_by ?? '_unrecorded');
        eventsByCauser[k] ??= { events: 0, displaced: 0, killed: 0, fled: 0 };
        eventsByCauser[k].events += 1;
        eventsByCauser[k].displaced += e.displaced ?? 0;
        eventsByCauser[k].killed += e.killed ?? 0;
        eventsByCauser[k].fled += e.fled_abroad ?? 0;
    }


    const result = {
        save: path,
        turn: state.meta.turn,
        civilian_casualties: cc,
        aggregates_by_causer_people: causedRows,
        displacement_state_totals: { original: orig, displaced_out: out, displaced_in: inn, lost_population: lost, muns: Object.keys(d.displacement_state ?? {}).length },
        watch_muns: byMun,
        event_log: { length: log.length, by_causer: eventsByCauser },
        militia_pools_by_faction: poolsByFaction,
    };
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

main();
