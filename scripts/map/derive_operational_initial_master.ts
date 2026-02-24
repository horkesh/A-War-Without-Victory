import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

function run() {
    const src = JSON.parse(readFileSync(resolve('data/source/settlements_initial_master.json'), 'utf8'));
    const map = JSON.parse(readFileSync(resolve('data/derived/operational/canonical_to_operational_map.json'), 'utf8'));

    const out: Record<string, any> = {};

    for (const s of src.settlements) {
        const osid = map[s.sid] || map['S' + s.sid];
        if (!osid) continue;

        if (!out[osid]) {
            out[osid] = {
                sid: osid,
                mun1990_id: s.mun1990_id,
                political_controller: [],
                contested_control: [],
                control_status: [],
                stability_score: []
            };
        }

        out[osid].political_controller.push(s.political_controller);
        out[osid].contested_control.push(s.contested_control);
        out[osid].control_status.push(s.control_status);
        if (s.stability_score !== null && s.stability_score !== undefined) {
            out[osid].stability_score.push(s.stability_score);
        }
    }

    const mergeModes = (arr: any[]) => {
        if (arr.length === 0) return null;
        const counts = new Map<any, number>();
        let maxCount = 0;
        let mode = arr[0];

        for (const item of arr) {
            const current = (counts.get(item) || 0) + 1;
            counts.set(item, current);
            if (current > maxCount) {
                maxCount = current;
                mode = item;
            }
        }
        return mode;
    };

    for (const k in out) {
        out[k].political_controller = mergeModes(out[k].political_controller);
        out[k].contested_control = out[k].contested_control.some((v: any) => v === true);
        out[k].control_status = mergeModes(out[k].control_status);

        const scores = out[k].stability_score;
        out[k].stability_score = scores.length > 0
            ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
            : null;
    }

    const res = {
        meta: {
            schema_version: 1,
            settlement_count: Object.keys(out).length
        },
        settlements: Object.values(out)
    };

    writeFileSync(resolve('data/derived/operational/operational_initial_master.json'), JSON.stringify(res, null, 2));
    console.log(`Wrote ${res.settlements.length} operational settlements to master file.`);
}

run();
