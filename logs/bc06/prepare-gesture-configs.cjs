'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve('logs/bc06');
const events=JSON.parse(fs.readFileSync('data/scenarios/events/war_1993.json','utf8'));
const original=JSON.parse(fs.readFileSync(path.join(root,'fixture-rbih-1.json'),'utf8'));
const sample='arbih_101st_mountain';
const other='arbih_102nd_motorized';
const cases=[
  {id:'visit-first',event:'visit_to_front_rbih',card:'front-visit',choice:'visit_sarajevo',count:0,method:'initiateFrontVisit'},
  {id:'visit-third',event:'visit_to_front_rbih',card:'front-visit',choice:'visit_press_rbih',count:2,method:'initiateFrontVisit'},
  {id:'address',event:'address_to_nation_rbih',card:'address-nation',choice:'address_defiance_rbih',count:0,method:'initiateAddressNation'},
  {id:'decorate',event:'decorate_a_unit_rbih',card:'decorate-unit',choice:'decorate_steadfast_rbih',count:0,method:'initiateDecorateUnit'},
];
const at=(path,equals)=>({path,equals});
for(const c of cases) {
  const state=structuredClone(original);
  if(c.count){state.military.event_fire_counts[c.event]=c.count;state.military.event_last_fired_turn[c.event]=80;}
  const fixture=path.join(root,`fixture-gesture-${c.id}.json`);
  fs.writeFileSync(fixture,JSON.stringify(state));
  const def=events.find(e=>e.id===c.event);
  const choice=def.response_options.find(o=>o.id===c.choice);
  const responseId=c.id==='decorate'?`${c.choice}__${sample}`:c.choice;
  const label=c.id==='decorate'?`Decorate ${state.military.formations[sample].name}`:choice.label;
  const fields=[at(['military','command_authority','current'],90),
    at(['military','event_fire_counts',c.event],c.count+1),at(['military','event_last_fired_turn',c.event],90),
    at(['military','pending_event_decisions'],[]),at(['military','event_decision_log'],[{event_id:c.event,response_id:responseId,decision_source:'player',faction:'RBiH',turn:90}])];
  for(const e of choice.effects??[]) {
    if(e.kind==='morale_change') fields.push(at(['military','formations',sample,'morale'],50+e.delta));
    if(e.kind==='cohesion_change') fields.push(at(['military','formations',sample,'cohesion'],50+e.delta));
  }
  if(c.id==='decorate') {
    if(!state.military.formations[other]) throw Error(`Missing non-target control ${other}`);
    fields.push(at(['military','formations',other,'morale'],50),at(['military','formations',other,'cohesion'],50));
  }
  const config={reviewed:true,caseId:`live-${c.id}-final-01`,fixture,
    loadSteps:[{buttonName:'Assume responsibility'},{buttonName:'Field Records'},{buttonName:'Resume bc06-proof-fixture'}],
    before:[at(['meta','turn'],90),at(['military','pending_event_decisions'],[])],
    steps:[{selector:'[data-testid="toolbar-route-desk"]',frameUrlIncludes:'http'},
      {buttonRegex:'^Command surface$'},{buttonRegex:'Command & Personnel'},
      {selector:`[data-testid="decision-room-priority-card-command:${c.card}"] button`,buttonRegex:'^Dossier$'},
      {buttonRegex:'^Issue \\(10\\)$'},
      {selector:`[data-testid="event-decision-response"][aria-label="Choose response: ${label}"]`,
        ...(c.id==='visit-first'?{absentSelectors:['[data-testid="event-decision-response"][aria-label="Choose response: Visit with international press"]']}:{})}],
    after:fields,persisted:fields,expectsMutation:true,repeatAction:c.method,repeatReason:'on_cooldown'};
  fs.writeFileSync(path.join(root,`config-gesture-${c.id}.json`),JSON.stringify(config,null,2));
}
console.log('Prepared four live gesture proofs, including a non-target decoration control.');
