interface OpsTerrainMap {
    getSource: (id: string) => unknown;
    setTerrain: (terrain: { source: string; exaggeration: number }) => unknown;
}

export function enableOpsMapTerrainIfAvailable(map: OpsTerrainMap): boolean {
    if (!map.getSource('terrain-dem')) return false;
    map.setTerrain({ source: 'terrain-dem', exaggeration: 2.5 });
    return true;
}
