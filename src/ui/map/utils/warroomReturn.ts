export function isEmbeddedTacticalMap(search: string): boolean {
    return new URLSearchParams(search).get('embedded') === '1';
}

export function shouldShowWarroomReturn(search: string, ipcAvailable: boolean): boolean {
    return ipcAvailable || isEmbeddedTacticalMap(search);
}
