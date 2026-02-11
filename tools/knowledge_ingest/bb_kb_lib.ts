import { existsSync } from "node:fs";

export type SourceRef = {
  volume_id: string;
  page_number: number;
  evidence_span: string;
  block_type?: string;
  offsets?: { start: number; end: number };
};

export type Location = {
  location_id: string;
  name: string;
  type?: string;
  admin_area?: string | "unknown";
  aliases?: string[];
  sources?: SourceRef[];
};

export type Unit = {
  unit_id: string;
  name: string;
  faction?: string;
  type?: string;
  parent_unit_id?: string | "unknown";
  aliases?: string[];
  sources?: SourceRef[];
};

export type Event = {
  event_id: string;
  name: string;
  event_type?: string;
  start_date?: string | "unknown";
  end_date?: string | "unknown";
  date_precision?: "day" | "month" | "year" | "unknown";
  sources?: SourceRef[];
};

export type Fact = {
  fact_id: string;
  fact_type: string;
  subject_id: string | "unknown";
  object_id: string | "unknown";
  value: number | string | "unknown";
  unit?: string | "unknown";
  date?: string | "unknown";
  date_precision?: "day" | "month" | "year" | "unknown";
  sources: SourceRef[];
  quote: string;
  confidence?: "high" | "medium" | "low";
  conflict_group_id?: string | null;
  notes?: string | "unknown";
};

export type ProposedFact = Fact;

export type MapCatalogEntry = {
  map_id: string;
  volume_id: string;
  page_number: number;
  caption: string | "unknown";
  image_path: string;
  sources: SourceRef[];
  linked_locations?: string[];
  linked_events?: string[];
  scale_text?: string | "unknown";
  legend_text?: string | "unknown";
};

export type IndexBundle = {
  facets: {
    years: string[];
    factions: string[];
    unit_types: string[];
    event_types: string[];
    fact_types: string[];
    volume_ids: string[];
  };
  timeline: Array<{ date: string; date_precision: string; id: string; kind: "event" | "fact" }>;
  geography: Array<{ location_id: string; name: string; admin_area?: string | "unknown"; type?: string }>;
  map_index: Array<{ map_id: string; volume_id: string; page_number: number; caption: string | "unknown"; image_path: string }>;
  alias_index: Array<{ alias: string; canonical_id: string; type: "location" | "unit" }>;
};

export type ValidationResult = { ok: boolean; errors: string[] };

function normalizeYear(date: string | undefined): string | null {
  if (!date || date === "unknown") return null;
  const match = date.match(/\b(19\d{2}|20\d{2})\b/);
  return match ? match[1] : null;
}

export function buildIndexes(params: {
  locations: Location[];
  units: Unit[];
  events: Event[];
  facts: Fact[];
  maps: MapCatalogEntry[];
}): IndexBundle {
  const years = new Set<string>();
  const factions = new Set<string>();
  const unitTypes = new Set<string>();
  const eventTypes = new Set<string>();
  const factTypes = new Set<string>();
  const volumeIds = new Set<string>();
  const aliasIndex: Array<{ alias: string; canonical_id: string; type: "location" | "unit" }> = [];

  for (const event of params.events) {
    if (event.event_type) eventTypes.add(event.event_type);
    const year = normalizeYear(event.start_date);
    if (year) years.add(year);
    for (const src of event.sources || []) {
      if (src.volume_id) volumeIds.add(src.volume_id);
    }
  }

  for (const fact of params.facts) {
    factTypes.add(fact.fact_type);
    const year = normalizeYear(fact.date as string | undefined);
    if (year) years.add(year);
    for (const src of fact.sources || []) {
      if (src.volume_id) volumeIds.add(src.volume_id);
    }
  }

  for (const unit of params.units) {
    if (unit.faction) factions.add(unit.faction);
    if (unit.type) unitTypes.add(unit.type);
    if (unit.aliases) {
      for (const alias of unit.aliases) {
        aliasIndex.push({ alias, canonical_id: unit.unit_id, type: "unit" });
      }
    }
    for (const src of unit.sources || []) {
      if (src.volume_id) volumeIds.add(src.volume_id);
    }
  }

  for (const location of params.locations) {
    if (location.aliases) {
      for (const alias of location.aliases) {
        aliasIndex.push({ alias, canonical_id: location.location_id, type: "location" });
      }
    }
    for (const src of location.sources || []) {
      if (src.volume_id) volumeIds.add(src.volume_id);
    }
  }

  for (const map of params.maps) {
    if (map.volume_id) volumeIds.add(map.volume_id);
  }

  const timeline: IndexBundle["timeline"] = [];
  for (const event of params.events) {
    if (event.start_date && event.start_date !== "unknown") {
      timeline.push({
        date: event.start_date,
        date_precision: event.date_precision || "unknown",
        id: event.event_id,
        kind: "event"
      });
    }
  }
  for (const fact of params.facts) {
    if (fact.date && fact.date !== "unknown") {
      timeline.push({
        date: fact.date as string,
        date_precision: (fact.date_precision as string) || "unknown",
        id: fact.fact_id,
        kind: "fact"
      });
    }
  }

  timeline.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    return a.id.localeCompare(b.id);
  });

  const geography = params.locations
    .map((loc) => ({
      location_id: loc.location_id,
      name: loc.name,
      admin_area: loc.admin_area,
      type: loc.type
    }))
    .sort((a, b) => a.location_id.localeCompare(b.location_id));

  const mapIndex = params.maps
    .map((map) => ({
      map_id: map.map_id,
      volume_id: map.volume_id,
      page_number: map.page_number,
      caption: map.caption,
      image_path: map.image_path
    }))
    .sort((a, b) => {
      if (a.volume_id !== b.volume_id) return a.volume_id.localeCompare(b.volume_id);
      return a.page_number - b.page_number;
    });

  const facets = {
    years: Array.from(years).sort(),
    factions: Array.from(factions).sort(),
    unit_types: Array.from(unitTypes).sort(),
    event_types: Array.from(eventTypes).sort(),
    fact_types: Array.from(factTypes).sort(),
    volume_ids: Array.from(volumeIds).sort()
  };

  const sortedAliases = aliasIndex.sort((a, b) => {
    if (a.alias !== b.alias) return a.alias.localeCompare(b.alias);
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.canonical_id.localeCompare(b.canonical_id);
  });

  return {
    facets,
    timeline,
    geography,
    map_index: mapIndex,
    alias_index: sortedAliases
  };
}

export function validateCanonicalFacts(facts: Fact[]): ValidationResult {
  const errors: string[] = [];
  facts.forEach((fact, idx) => {
    if (!fact.sources || fact.sources.length === 0) {
      errors.push(`Fact missing sources: ${fact.fact_id || idx}`);
      return;
    }
    const hasValidSource = fact.sources.some(
      (src) => typeof src.volume_id === "string" && typeof src.page_number === "number"
    );
    if (!hasValidSource) {
      errors.push(`Fact missing volume/page: ${fact.fact_id || idx}`);
    }
  });
  return { ok: errors.length === 0, errors };
}

export function validateMapCatalog(
  maps: MapCatalogEntry[],
  opts?: { fileExists?: (path: string) => boolean }
): ValidationResult {
  const errors: string[] = [];
  const exists = opts?.fileExists ?? existsSync;
  maps.forEach((map, idx) => {
    if (!exists(map.image_path)) {
      errors.push(`Missing map image: ${map.map_id || idx} -> ${map.image_path}`);
    }
  });
  return { ok: errors.length === 0, errors };
}
