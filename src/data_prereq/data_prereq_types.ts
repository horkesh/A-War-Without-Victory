/**
 * Phase H1.2: Types for data prerequisites checker (check-only, no generation).
 */

export interface DataPrereq {
  id: string;
  description: string;
  /** Paths relative to repo root. */
  required_paths: string[];
  remediation: {
    /** Exact commands the user should run. */
    commands: string[];
    /** Short bullet points; no timestamps. */
    notes?: string[];
  };
}
