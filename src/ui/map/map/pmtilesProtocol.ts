import maplibregl from 'maplibre-gl';
import type { AddProtocolAction } from 'maplibre-gl';
import { Protocol } from 'pmtiles';

let pmtilesRegistered = false;

function isAlreadyRegistered(error: unknown): boolean {
  return error instanceof Error && /already\s+registered/i.test(error.message);
}

export function ensurePmtilesProtocol(): void {
  if (pmtilesRegistered) return;

  const pmtilesProtocol = new Protocol();
  const tileHandler: AddProtocolAction = async (params, abortController) => {
    try {
      return await pmtilesProtocol.tilev4(params, abortController);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      console.error('[PMTiles] tile error', params.url, error);
      throw error;
    }
  };

  try {
    maplibregl.addProtocol('pmtiles', tileHandler);
  } catch (error) {
    if (!isAlreadyRegistered(error)) throw error;
  }
  pmtilesRegistered = true;
}
