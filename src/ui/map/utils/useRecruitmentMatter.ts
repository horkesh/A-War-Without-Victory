/**
 * The recruitment matter for the surfaces that list the president's matters (Command
 * Surface, Desk, toolbar, Advance review, warroom docket). One read of the UI store so
 * every surface counts the same matter.
 */

import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { deriveRecruitmentMatter, type RecruitmentMatter } from '../data/recruitmentMatter';
import { buildMunicipalityDisplayNameMap } from './municipalityDisplayName';

export interface RecruitmentMatterInput {
  recruitmentMatter: RecruitmentMatter | null;
  municipalityNames: Readonly<Record<string, string>>;
}

export function useRecruitmentMatterInput(): RecruitmentMatterInput {
  const watch = useGameStore((s) => s.recruitmentWatch);
  const playerFaction = useGameStore((s) => s.loadedGameState?.player_faction ?? null);
  const turn = useGameStore((s) => s.loadedGameState?.turn ?? null);
  const osidPropertiesMap = useGameStore((s) => s.osidPropertiesMap);
  const municipalityNames = useMemo(() => buildMunicipalityDisplayNameMap(osidPropertiesMap), [osidPropertiesMap]);
  const recruitmentMatter = useMemo(
    () => deriveRecruitmentMatter(watch, { playerFaction, turn }),
    [watch, playerFaction, turn],
  );
  return useMemo(() => ({ recruitmentMatter, municipalityNames }), [recruitmentMatter, municipalityNames]);
}
