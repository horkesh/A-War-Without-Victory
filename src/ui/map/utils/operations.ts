import type { OperationView } from '../data/types';

/** Stable unique key for an operation (matches store selectedOperationKey format). */
export function getOperationId(op: OperationView): string {
  return `${op.corps_id}|${op.name}`;
}

/** Tailwind bg class for phase badge pill. */
export function getOperationPhaseBadgeClass(phase: string): string {
  switch (phase) {
    case 'planning':  return 'bg-yellow-700/80';
    case 'execution': return 'bg-red-800/80';
    case 'recovery':  return 'bg-neutral-600/80';
    default:          return 'bg-neutral-600/80';
  }
}

/** Tailwind classes (bg + border + text) for the phase timeline indicator. */
export function getOperationPhaseTone(phase: string): string {
  switch (phase) {
    case 'planning':  return 'bg-yellow-700/80 border-yellow-600/60 text-yellow-100';
    case 'execution': return 'bg-red-800/80 border-red-700/60 text-red-100';
    case 'recovery':  return 'bg-neutral-600/80 border-neutral-500/60 text-neutral-200';
    default:          return 'bg-neutral-600/80 border-neutral-500/60 text-neutral-200';
  }
}

export const OPERATION_PHASE_TIMELINE = ['planning', 'execution', 'recovery'] as const;
