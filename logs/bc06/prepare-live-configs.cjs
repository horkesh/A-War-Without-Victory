'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve('logs/bc06');
const events=JSON.parse(fs.readFileSync('data/scenarios/events/war_1993.json','utf8'));
const cases=JSON.parse(fs.readFileSync(path.join(root,'fixture-provenance.json'),'utf8')).cases;
const at=(path,equals)=>({path,equals});
for(const c of cases) {
  const def=events.find(e=>e.id===c.eventId);
  const choice=def.response_options[c.priorCount===0?0:3];
  const fields=[at(['military','event_fire_counts',c.eventId],c.priorCount+1),
    at(['military','command_authority','current'],90),
    at(['military','command_authority','spent_this_turn'],10),
    at(['military','event_last_fired_turn',c.eventId],90),
    at(['military','pending_event_decisions'],[]),
    at(['military','event_decision_log'],[{event_id:c.eventId,response_id:choice.id,decision_source:'player',faction:c.faction,turn:90}])];
  // Assert authored simple effects against fixed fixture values, independently
  // of the production effect applier. Broader effects remain in saved evidence.
  for(const e of choice.effects??[]) {
    if(e.kind==='morale_change') fields.push(at(['military','formations',c.sampleFormation,'morale'],50+e.delta));
    if(e.kind==='cohesion_change') fields.push(at(['military','formations',c.sampleFormation,'cohesion'],50+e.delta));
    if(e.kind==='supply_delta') fields.push(at(['military','general_supply_reserve',c.faction],50+e.delta));
  }
  for(const [flag,value] of Object.entries(choice.sets_flags??{})) fields.push(at(['military','event_flags',flag],value));
  const config={reviewed:true,caseId:`live-${c.faction.toLowerCase()}-${c.priorCount+1}-01`,fixture:path.join(root,c.file),
    loadSteps:[{buttonName:'Assume responsibility'},{buttonName:'Field Records'},{buttonName:'Resume bc06-proof-fixture'}],
    before:[at(['meta','turn'],90),at(['military','pending_event_decisions'],[])],
    steps:[{selector:'[data-testid="toolbar-route-desk"]',frameUrlIncludes:'http'},
      {buttonRegex:'^Command surface$'},{buttonRegex:'Command & Personnel'},
      {selector:'[data-testid="decision-room-priority-card-command:strategic-posture-review"] button',buttonRegex:'Dossier'},
      {selector:'[data-testid="decision-room-active-dossier"]',inspectOnly:true},
      {buttonRegex:'^(Issue \\(10\\)|Authorize)$'},
      {selector:`[data-testid="event-decision-response"][aria-label="Choose response: ${choice.label}"]`,
        ...(c.priorCount===0?{absentSelectors:[`[data-testid="event-decision-response"][aria-label="Choose response: ${def.response_options[3].label}"]`]}:{})},
    ],after:fields.filter(f=>f.path[1]!=='event_flags'),persisted:fields,expectsMutation:true,
    repeatAction:'initiateStrategicPostureReview',repeatReason:'on_cooldown'};
  // Select exactly the Dossier button; the other button opens its action route.
  config.steps[3].selector='[data-testid="decision-room-priority-card-command:strategic-posture-review"] button:first-of-type';
  fs.writeFileSync(path.join(root,`config-${c.faction.toLowerCase()}-${c.priorCount+1}.json`),JSON.stringify(config,null,2));
}
console.log(`Prepared ${cases.length} visible posture proofs.`);
