export interface PlayerSafeThreatPresentation {
  label: string;
  summary: string;
  toneClass: string;
}

export function getPlayerSafeThreatPresentation(ratio: number): PlayerSafeThreatPresentation {
  if (ratio > 2.0) {
    return { label: 'OVERMATCHED', summary: 'critical pressure', toneClass: 'text-red-500 font-black' };
  }
  if (ratio > 1.5) {
    return { label: 'VULNERABLE', summary: 'heavy pressure', toneClass: 'text-red-400 font-bold' };
  }
  if (ratio > 1.2) {
    return { label: 'PRESSURE', summary: 'rising pressure', toneClass: 'text-amber-500' };
  }
  if (ratio < 0.5) {
    return { label: 'SUPERIOR', summary: 'clear advantage', toneClass: 'text-emerald-500 font-bold' };
  }
  if (ratio < 0.8) {
    return { label: 'FAVORABLE', summary: 'advantage held', toneClass: 'text-green-500' };
  }
  return { label: 'BALANCED', summary: 'balanced pressure', toneClass: 'text-green-400' };
}
