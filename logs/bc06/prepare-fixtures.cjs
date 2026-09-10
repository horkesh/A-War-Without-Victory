'use strict';
// Local action fixtures only: load an existing startup save and set bounded
// player-action inputs. No turn pipeline, scenario run, or source artifact write.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = process.cwd();
const out = path.join(root, 'logs/bc06');
const source = path.join(root, 'data/derived/startup/apr_1992_initial_save.json');
const bytes = fs.readFileSync(source);
const original = JSON.parse(bytes);
const cases = [];
for (const faction of ['RBiH','RS','HRHB']) {
  for (const count of [0,2]) {
    const state = structuredClone(original);
    const suffix = faction.toLowerCase();
    state.meta.turn = 90;
    state.meta.player_faction = faction;
    state.meta.autonomy_level = 0;
    state.meta.pending_proposal_reviews = [];
    state.military.pending_event_decisions = [];
    state.military.pending_event_notifications = [];
    state.military.event_decision_log = [];
    state.military.event_fire_counts = {};
    state.military.event_last_fired_turn = {};
    state.military.command_authority = {current:100,max:100,spent_this_turn:0,lifetime_spent:0};
    state.military.general_supply_reserve = {RBiH:50,RS:50,HRHB:50};
    for (const f of Object.values(state.military.formations)) {
      if(f.status === 'active') { f.morale=50; f.cohesion=50; }
    }
    const eventId = `strategic_posture_review_${suffix}`;
    if(count) {
      state.military.event_fire_counts[eventId] = count;
      state.military.event_last_fired_turn[eventId] = 82;
    }
    const file = `fixture-${suffix}-${count+1}.json`;
    fs.writeFileSync(path.join(out,file),JSON.stringify(state));
    cases.push({file,faction,eventId,priorCount:count,turn:90,
      sampleFormation:Object.values(state.military.formations).find(f=>f.faction===faction&&f.status==='active'&&f.kind==='brigade'&&!f.id.startsWith('jna_'))?.id});
  }
}
fs.writeFileSync(path.join(out,'fixture-provenance.json'),JSON.stringify({source,
  sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex'),
  scope:'synthetic turn-90 player action fixtures; no campaign chronology claim',cases},null,2));
console.log(JSON.stringify(cases,null,2));
