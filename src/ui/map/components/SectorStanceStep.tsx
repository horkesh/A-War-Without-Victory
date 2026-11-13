/**
 * SectorStanceStep: the sector (OG) panel's stance step for posture model option 2.
 *
 * Shows who sets the OG's stance, any open stance matter for this OG or its corps
 * (with the same Confirm / Countermand / Constrain answers as the Command Surface),
 * and any presidential hold in force (or pending under a Main Staff delay, or
 * suspended because an operation is running here). The president never sets an OG
 * stance directly. Lazily mounted by CorpsFrontPanel under its stance rows, so it and
 * its detail copy stay out of the map entry chunk.
 */

import type { LoadedGameState } from '../data/types';
import { stanceMatterTitle } from '../data/stanceMatterCopy';
import {
  stanceDetailText,
  stanceHoldLine,
  stanceMatterEvidence,
  stanceMatterExplanation,
} from '../data/stanceMatterDetail';
import { StanceMatterActions } from './StanceMatterActions';

export interface SectorStanceStepProps {
  sectorId: string;
  corpsId: string;
  gameState: LoadedGameState;
}

export function SectorStanceStep({ sectorId, corpsId, gameState }: SectorStanceStepProps) {
  const matters = (gameState.stanceMatters ?? []).filter((matter) => (
    matter.scope === 'og' ? matter.sectorId === sectorId : matter.corpsId === corpsId
  ));
  const holds = (gameState.stanceHolds ?? []).filter((hold) => (
    hold.scope === 'og' ? hold.sectorId === sectorId : hold.corpsId === corpsId
  ));
  const turn = gameState.turn ?? 0;

  return (
    <div className="col-span-2 flex flex-col gap-2" data-testid="sector-stance-step">
      <p className="text-[14px]">{stanceDetailText('step.whoSets')}</p>
      {holds.map((hold) => (
        <p key={hold.matterId} className="text-[14px] font-semibold" data-testid="sector-stance-hold">
          {stanceDetailText(hold.scope === 'og' ? 'step.holdOg' : 'step.holdCorps', { line: stanceHoldLine(hold, turn) })}
        </p>
      ))}
      {matters.length === 0 && holds.length === 0 && (
        <p className="text-[14px]">{stanceDetailText('step.noMatter')}</p>
      )}
      {matters.map((matter) => (
        <div key={matter.id} className="flex flex-col gap-2 rounded border border-[#3a4150] bg-[#11151c] p-3 text-[#e8dcbc]" data-testid="sector-stance-matter">
          <div className="text-[15px] font-bold">{stanceMatterTitle(matter)}</div>
          <p className="text-[14px]">{stanceMatterExplanation(matter)}</p>
          <ul className="flex flex-col gap-1 text-[14px] text-[#cfc3a6]">
            {stanceMatterEvidence(matter).map((line) => <li key={line}>{line}</li>)}
          </ul>
          <StanceMatterActions matter={matter} />
        </div>
      ))}
    </div>
  );
}

export default SectorStanceStep;
