import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { EquipmentSummary } from '../../src/ui/map/components/army_hq/EquipmentSummary';
import { summarizeOwnEquipment } from '../../src/ui/shared/equipmentSummary';
import { parseGameState } from '../../src/ui/map/data/GameStateAdapter';
import { extractWarData } from '../../src/ui/warroom/data/war_data_extractor';
const formationReports = { own:{id:'own',faction:'RS',kind:'brigade',status:'active',composition:{tanks:5,artillery:0},equipment_state:{operational_heavy:3,total_heavy:4}}, other:{id:'other',faction:'HRHB',kind:'brigade',status:'active',composition:{tanks:900},equipment_state:{operational_heavy:900,total_heavy:900}} };
const raw: any = { meta:{ turn:1, phase:'war', player_faction:'RS' }, political:{political_controllers:{}}, military:{formations:formationReports}, displacement:{}, factions:[] };
it('projects the same own-only equipment aggregate at both reporting boundaries', () => {
 const expected = summarizeOwnEquipment(Object.values(formationReports), 'RS');
 expect(parseGameState(raw).equipmentSummary).toEqual(expected);
 expect(extractWarData(raw,'RS').ownForces.equipmentSummary).toEqual(expected);
 expect(parseGameState({...raw,meta:{...raw.meta,player_faction:null}}).equipmentSummary?.brigadeCount).toBe(0);
});
it('renders holdings and completeness without the dead heavy-equipment pool (realism audit F9)', () => {
 const summary = summarizeOwnEquipment(Object.values(formationReports), 'RS');
 const html = renderToStaticMarkup(h(EquipmentSummary,{summary}));
 expect(html).toContain('5'); expect(html).toContain('No staff report'); expect(html).toContain('1 / 1');
 expect(html).not.toContain('75%'); expect(html).not.toContain('equipment-operational-pool'); expect(html).not.toMatch(/abstract|pool/i);
});

it('marks holdings from incomplete reporting as partial', () => {
 const rows = [...Object.values(formationReports), {faction:'RS',kind:'brigade',status:'active',composition:{tanks:2}}];
 const html = renderToStaticMarkup(h(EquipmentSummary,{summary:summarizeOwnEquipment(rows, 'RS')}));
 expect(html).toContain('0 reported (partial)'); expect(html).toContain('2 / 2'); expect(html).toContain('1 / 2');
 expect(html).not.toContain('7 reported (partial)');
});
