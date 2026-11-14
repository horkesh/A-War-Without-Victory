export interface DesktopSaveRecord {
    filename: string;
    turn: number;
    faction: 'RBiH' | 'RS' | 'HRHB' | null;
    modifiedAtMs: number;
}

export function listSaveRecords(savesDirectory: string): Promise<DesktopSaveRecord[]>;
export function resolveSaveRecordPath(savesDirectory: string, filename: string): string;
export function writeFileAtomically(filePath: string, contents: string): void;
