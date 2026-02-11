/**
 * Parse ChatGPT export (conversations.json) and emit AWWV-relevant conversations
 * as one Markdown file per conversation in docs/knowledge/AWWV/raw/
 *
 * Usage: npx tsx tools/knowledge_ingest/parse_chatgpt_export.ts
 */

import * as fs from "fs";
import * as path from "path";

const KNOWLEDGE_ROOT = path.join(process.cwd(), "docs", "knowledge");
const CONVERSATIONS_JSON = path.join(KNOWLEDGE_ROOT, "ChatGPT", "conversations.json");
const RAW_OUT = path.join(KNOWLEDGE_ROOT, "AWWV", "raw");

// Strong signals: conversation is clearly about AWWV
const AWWV_INCLUDE = [
  /AWWV|War Without Victory/i,
  /Bosnia.*199[1-5]|199[1-5].*Bosnia|Bosnian War|Bosnia war simulation/i,
  /wargame.*(Bosnia|map|phase|rulebook)|(Bosnia|map|phase|rulebook).*wargame/i,
  /Rulebook|rulebook/i,
  /Phase\s*[0-9A-Za-z]|phase\s*[0-9A-Za-z]|Phase [0-9]|phase [0-9]/i,
  /map pipeline|terrain pipeline|settlement.*(map|polygon|graph)|municipality.*(map|coverage|audit)/i,
  /determinism|engine invariant|invariant/i,
  /Balkan Battlegrounds|battlegrounds/i,
  /formation.*(game|sim)|front.*(edge|region)|AOR|supply.*sim|displacement.*sim/i,
  /terrain.*(pipeline|scalar|DEM|OSM)/i,
  /canon.*(map|settlement)|canonical/i,
  /Project Handover|Project Handoff|project continuation.*(AWWV|wargame|simulation)/i,
  /Game Coordinate|game state|serialize|Godot.*(map|game)/i,
  /isolated settlement|settlement graph|contact graph|adjacency/i,
  /Doboj.*stress|Jajce.*stress|recruitment.*1991/i,
  /Rulebook (Comparison|Naming)|Rulebook analysis/i,
];

// Exclude: travel, UNDP comms, Gents, social media, unrelated personal
const AWWV_EXCLUDE = [
  /Italy.*[Rr]oad|[Tt]ravel.*(plan|offer|agent|suggestions)|[Ss]easide|[Aa]irbnb/i,
  /UNDP.*(post|nomination|award|comms|digital|invitation|Tweet|Facebook)/i,
  /Gents?[^a-z]|Gentlemen.*Trip|Wingman|Club name/i,
  /Tweet|Facebook.*post|social media|Pratea objava|objava za (dogaaj|Facebook|video)/i,
  /LEAD (projekat|project)|SDG3BiH|Visibility (plan|guidelines)/i,
  /KPI preformulacija|infografike|Dizajnerske instrukcije/i,
  /radionica|nabavk|Pregled dokumenata radionice/i,
  /Roman Empire|Open Positions in Rome/i,
  /Molekularne simulacije|Missions? files availability/i,
  /Translate to English|PDF to Word|Document (conversion|review|feedback)/i,
  /Apartment Renovation|3D.*Bathroom|T-shirt Mockup|Postcard Design/i,
  /Reference Form|Communications Officer (Application|Interview)/i,
  /Pixar|Photo (transformation|request)|Stadio Milano/i,
  /EU4MEG|EU donacija|BIM Coordinator|Geek vs Nerd/i,
  /Storyboard for reel|Campaign (video|suggestions)|Event brief/i,
  /Povratna informacija o najavi|Tekstovi za video|Saetak dokumenta/i,
  /Edukativni film|Proitaj edukativni|Pratea objava za (dogaaj|studiju)/i,
  /Poveanje ugovora|Prevod na engleski|Jaanje (uloge|zajednice)/i,
  /Projekti lokalnih zajednica|UNDP Mine Action|Excel file formatting/i,
];

function isAWWVRelevant(title: string, contentSample: string): boolean {
  const combined = (title + " " + contentSample).slice(0, 5000);
  if (AWWV_EXCLUDE.some((p) => p.test(combined))) return false;
  return AWWV_INCLUDE.some((p) => p.test(combined));
}

type MessageNode = {
  id: string;
  message: {
    author?: { role?: string };
    content?: { content_type?: string; parts?: string[]; text?: string };
    create_time?: number | null;
  } | null;
  parent: string | null;
  children: string[];
};

type Conv = {
  title: string;
  create_time: number;
  update_time?: number;
  mapping: Record<string, MessageNode>;
};

function getMessageText(node: MessageNode): string {
  if (!node?.message?.content) return "";
  const c = node.message.content;
  if (c.content_type === "text" && Array.isArray(c.parts)) {
    return c.parts
      .filter((p): p is string => typeof p === "string")
      .join("\n");
  }
  if (typeof (c as { text?: string }).text === "string") {
    return (c as { text: string }).text;
  }
  return "";
}

function getRole(node: MessageNode): "user" | "assistant" | "system" {
  const role = node?.message?.author?.role;
  if (role === "user" || role === "assistant" || role === "system")
    return role;
  return "assistant";
}

function walkMessages(conv: Conv): { role: string; text: string }[] {
  const rootId = "client-created-root";
  const mapping = conv.mapping;
  const root = mapping[rootId];
  if (!root?.children?.length) return [];

  const out: { role: string; text: string }[] = [];
  const visited = new Set<string>();

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = mapping[nodeId];
    if (!node) return;
    if (node.message?.content) {
      const text = getMessageText(node);
      if (text.trim()) {
        out.push({ role: getRole(node), text });
      }
    }
    for (const cid of node.children || []) {
      visit(cid);
    }
  }

  for (const cid of root.children) {
    visit(cid);
  }
  return out;
}

function slugify(title: string): string {
  return title
    .replace(/\s+/g, "_")
    .replace(/[^\w\-]/g, "")
    .slice(0, 60);
}

function toYMD(createTime: number): string {
  const d = new Date(createTime * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function confidence(title: string, contentSample: string): "high" | "medium" | "low" {
  const t = (title + " " + contentSample).toLowerCase();
  if (/awwv|war without victory|bosnia.*199[1-5]|rulebook|phase\s*\d|map pipeline|determinism|engine invariant/.test(t))
    return "high";
  if (/wargame|settlement|municipality|formation|front|terrain|canon/.test(t))
    return "medium";
  return "low";
}

function inferTags(title: string, contentSample: string): string[] {
  const tags: string[] = [];
  const s = (title + " " + contentSample).toLowerCase();
  if (/rulebook|phase\s*[0-9a-z]|phase\s*[0-9]/.test(s)) tags.push("phases");
  if (/map|terrain|settlement|municipality|pipeline|geography|substrate/.test(s)) tags.push("map_and_geography");
  if (/determinism|engine|invariant|simulation|exhaustion|supply/.test(s)) tags.push("systems");
  if (/negotiation|treaty|ceasefire/.test(s)) tags.push("negotiation");
  if (/patron|external pressure|sanctions|arms embargo/.test(s)) tags.push("external_pressure_and_patrons");
  if (/political control|legitimacy|authority/.test(s)) tags.push("political_control");
  if (/canon|canonical/.test(s)) tags.push("engine_and_determinism");
  if (/design|mechanic|ui|ux|formation|brigade|front/.test(s)) tags.push("design");
  if (/decision|rationale|assumption/.test(s)) tags.push("decision");
  return tags.length ? tags : ["general"];
}

function main() {
  if (!fs.existsSync(CONVERSATIONS_JSON)) {
    console.error("Missing:", CONVERSATIONS_JSON);
    process.exit(1);
  }
  fs.mkdirSync(RAW_OUT, { recursive: true });

  console.log("Reading conversations.json...");
  const raw = fs.readFileSync(CONVERSATIONS_JSON, "utf8");
  let conversations: Conv[];
  try {
    conversations = JSON.parse(raw) as Conv[];
  } catch (e) {
    console.error("JSON parse failed:", e);
    process.exit(1);
  }

  console.log("Total conversations:", conversations.length);
  let written = 0;
  let skipped = 0;

  for (const conv of conversations) {
    const title = conv.title || "Untitled";
    const messages = walkMessages(conv);
    const contentSample = messages.map((m) => m.text).join(" ").slice(0, 3000);
    if (!isAWWVRelevant(title, contentSample)) {
      skipped++;
      continue;
    }
    const dateStr = toYMD(conv.create_time);
    const slug = slugify(title) || "untitled";
    const slugShort = slug.slice(0, 50);
    const baseName = `${dateStr}_chatgpt_${slugShort}.md`;
    const conf = confidence(title, contentSample);
    const tags = inferTags(title, contentSample);

    const header = `---
title: ${title.replace(/\n/g, " ")}
date: ${dateStr}
source: chatgpt
confidence: ${conf}
primary_topics: [${tags.join(", ")}]
---

`;
    const body = messages
      .map((m) => {
        const who = m.role === "user" ? "**User**" : "**Assistant**";
        return `${who}\n\n${m.text.trim()}\n`;
      })
      .join("---\n\n");
    const content = header + body;
    const outPath = path.join(RAW_OUT, baseName);
    fs.writeFileSync(outPath, content, "utf8");
    written++;
    console.log("Wrote:", baseName);
  }

  console.log("Done. Written:", written, "Skipped:", skipped);
}

main();
