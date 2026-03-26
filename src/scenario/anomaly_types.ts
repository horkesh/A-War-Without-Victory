/**
 * Anomaly detection types for post-run analysis.
 * Pure data interfaces — no logic, no side effects.
 */

export interface AnomalyReport {
    category: 'territorial' | 'deployment' | 'combat' | 'logistics' | 'operational' | 'timeline' | 'faction';
    severity: 'critical' | 'warning' | 'info';
    type: string;
    description: string;
    turn?: number;
    entities?: string[];
}
