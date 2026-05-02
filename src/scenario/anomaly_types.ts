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
    /**
     * Optional sub-classification within a `type`. Used when distinct root
     * causes share an anomaly type and need to be routed to different
     * specialists (e.g., empty_contested_sector subtype `pool_exhausted`
     * routes to formation/operations expert, `misallocated` to corps-army
     * commander). When present, consumers may emit one report per subtype.
     * LANE-2026-05-02-B3-ANOMALY-SECTOR-SUBTYPE.
     */
    subtype?: string;
}
