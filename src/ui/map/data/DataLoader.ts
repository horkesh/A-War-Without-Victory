import type { FeatureCollection } from 'geojson';

interface PoliticalControlPayload {
  by_settlement_id?: Record<string, string | null>;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function loadOperationalSettlements(): Promise<FeatureCollection> {
  return fetchJson<FeatureCollection>('/data/derived/operational/operational_settlements.geojson');
}

export async function loadOperationalPoliticalControl(): Promise<Record<string, string | null>> {
  const payload = await fetchJson<PoliticalControlPayload>('/data/derived/operational/operational_political_control.json');
  return payload.by_settlement_id ?? {};
}

export async function loadLatestRunSave(): Promise<unknown> {
  return fetchJson<unknown>('/data/derived/latest_run_final_save.json');
}

/** Fetch latest run save as raw text. Use with loadSave(text) to parse after yielding so UI can show loading state. */
export async function loadLatestRunSaveAsText(): Promise<string> {
  const response = await fetch('/data/derived/latest_run_final_save.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch latest run save: HTTP ${response.status}`);
  }
  return response.text();
}
