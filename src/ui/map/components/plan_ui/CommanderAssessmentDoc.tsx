import { getArmyCrest } from '../../utils/factionAssets';

interface CommanderAssessmentDocProps {
  assessment: {
    recommendation: 'launch' | 'delay' | 'abort';
    sections: {
      enemy: string;
      ownForces: string;
      assessment: string;
    };
  } | null;
  faction: string;
  corpsName: string;
  sectorName: string;
  commanderName?: string;
  turn: number;
}

const FACTION_ARMY_NAMES: Record<string, string> = {
  RBiH: 'ARMIJA REPUBLIKE BOSNE I HERCEGOVINE',
  RS: 'VOJSKA REPUBLIKE SRPSKE',
  HRHB: 'HRVATSKO VIJEĆE OBRANE',
};

const FACTION_CLASSIFICATION: Record<string, string> = {
  RBiH: 'POVJERLJIVO',
  RS: 'СТРОГО ПОВЕРЉИВО',
  HRHB: 'POVJERLJIVO',
};

export function CommanderAssessmentDoc({
  assessment, faction, corpsName, sectorName, commanderName, turn
}: CommanderAssessmentDocProps) {
  const crestSrc = getArmyCrest(faction);
  const armyName = FACTION_ARMY_NAMES[faction] ?? faction;
  const classification = FACTION_CLASSIFICATION[faction] ?? 'CONFIDENTIAL';
  const refNumber = `G2/${String(turn).padStart(3, '0')}-95`;

  if (!assessment) {
    return (
      <div className="bg-[#ebe1cd] paper-grain rounded p-4 border border-[rgba(180,160,130,0.3)] shadow-[inset_0_2px_8px_rgba(0,0,0,0.08)]"
           style={{ transform: 'rotate(-0.3deg)' }}>
        <p className="text-[11px] text-[#2a2520]/50 font-mono italic text-center py-6">
          Assign forces and objectives to generate assessment...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#ebe1cd] paper-grain rounded border border-[rgba(180,160,130,0.3)] shadow-[inset_0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden"
         style={{ transform: 'rotate(-0.3deg)' }}>
      {/* Document header */}
      <div className="px-4 pt-3 pb-2 border-b border-[#c8b99a]/40 flex items-start justify-between">
        <div className="flex items-start gap-2">
          {crestSrc && (
            <img src={crestSrc} alt="" className="w-5 h-5 opacity-50 mt-0.5" style={{ filter: 'saturate(0.5)' }} />
          )}
          <div>
            <div className="text-[8px] font-mono font-bold text-[#2a2520]/60 uppercase tracking-wider leading-none">
              {armyName}
            </div>
            <div className="text-[7px] font-mono text-[#2a2520]/40 uppercase tracking-wider mt-0.5">
              {corpsName} / {sectorName}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[8px] font-mono font-bold text-[#8a2020] uppercase tracking-wider"
               style={{ transform: 'rotate(-2deg)' }}>
            {classification}
          </div>
          <div className="text-[7px] font-mono text-[#2a2520]/40 mt-0.5">
            Ref. {refNumber}
          </div>
        </div>
      </div>

      {/* Document title */}
      <div className="px-4 pt-2 pb-1">
        <div className="text-[9px] font-mono font-bold text-[#2a2520]/70 uppercase tracking-[0.15em] text-center">
          G-2 Intelligence Assessment
        </div>
      </div>

      {/* Sections */}
      <div className="px-4 pb-3 space-y-2">
        <div>
          <span className="text-[9px] font-mono font-bold text-[#2a2520]/80">1. ENEMY: </span>
          <span className="text-[10px] font-mono text-[#2a2520]/70 leading-relaxed">
            {assessment.sections.enemy}
          </span>
        </div>
        <div>
          <span className="text-[9px] font-mono font-bold text-[#2a2520]/80">2. OWN FORCES: </span>
          <span className="text-[10px] font-mono text-[#2a2520]/70 leading-relaxed">
            {assessment.sections.ownForces}
          </span>
        </div>
        <div>
          <span className="text-[9px] font-mono font-bold text-[#2a2520]/80">3. ASSESSMENT: </span>
          <span className="text-[10px] font-mono text-[#2a2520]/70 leading-relaxed">
            {assessment.sections.assessment}
          </span>
        </div>
      </div>

      {/* Signature */}
      <div className="px-4 pb-3 pt-1 border-t border-[#c8b99a]/20">
        <div className="text-[8px] font-mono text-[#2a2520]/50 uppercase tracking-wider">
          {commanderName ? `G-2 Officer / ${commanderName}` : 'G-2 Officer'}
        </div>
      </div>
    </div>
  );
}
