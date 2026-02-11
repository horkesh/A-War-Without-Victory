/**
 * Parse Claude export (conversations.json) and emit AWWV-relevant conversations
 * as one Markdown file per conversation in docs/knowledge/AWWV/raw/
 *
 * Usage: npx tsx tools/knowledge_ingest/parse_claude_export.ts
 */

import * as fs from "fs";
import * as path from "path";

const KNOWLEDGE_ROOT = path.join(process.cwd(), "docs", "knowledge");
const CONVERSATIONS_JSON = path.join(KNOWLEDGE_ROOT, "Claude", "conversations.json");
const RAW_OUT = path.join(KNOWLEDGE_ROOT, "AWWV", "raw");

const AWWV_INCLUDE = [
  /AWWV|War Without Victory/i,
  /Bosnia.*199[1-5]|199[1-5].*Bosnia|Bosnian War|Bosnia war simulation/i,
  /wargame.*(Bosnia|map|phase|rulebook)|(Bosnia|map|phase|rulebook).*wargame/i,
  /Rulebook|rulebook/i,
  /Phase\s*[0-9A-Za-z]|phase\s*[0-9A-Za-z]/i,
  /map pipeline|terrain pipeline|settlement.*(map|polygon|graph)|municipality.*(map|coverage|audit)/i,
  /determinism|engine invariant|invariant/i,
  /formation.*(game|sim)|front.*(edge|region)|AOR|supply.*sim|displacement.*sim/i,
  /terrain.*(pipeline|scalar|DEM|OSM)/i,
  /canon.*(map|settlement)|canonical/i,
  /Game Coordinate|game state|serialize|Godot.*(map|game)/i,
  /isolated settlement|settlement graph|contact graph|adjacency/i,
  /exhaustion|negotiation|patron|sanctions|legitimacy|external pressure/i,
];

const AWWV_EXCLUDE = [
  /Italy.*[Rr]oad|[Tt]ravel|UNDP.*(post|nomination|award|comms)/i,
  /Gents?[^a-z]|Tweet|Facebook|social media/i,
  /LEAD (projekat|project)|SDG3BiH|Visibility (plan|guidelines)/i,
  /Roman Empire|Open Positions in Rome|Molekularne simulacije/i,
  /Translate to English|PDF to Word|Document (conversion|review)/i,
  /Apartment Renovation|3D.*Bathroom|T-shirt|Postcard Design/i,
  /Rome–Umbria–Tuscany|road trip itinerary/i,
  /HTML brochure|File reading request|Data file extraction/i,
];

function isAWWVRelevant(name: string, summary: string, contentSample: string): boolean {
  const combined = (name + " " + summary + " " + contentSample).slice(0, 8000);
  if (AWWV_EXCLUDE.some((p) => p.test(combined))) return false;
  return AWWV_INCLUDE.some((p) => p.test(combined));
}

type ChatMessage = {
  uuid?: string;
  text?: string;
  content?: Array<{ type?: string; text?: string }>;
  sender?: string;
  created_at?: string;
};

type ClaudeConv = {
  uuid: string;
  name: string;
  summary?: string;
  created_at?: string;
  updated_at?: string;
  chat_messages?: ChatMessage[];
};

function getMessageText(msg: ChatMessage): string {
  if (typeof msg.text === "string" && msg.text.trim()) return msg.text;
  if (Array.isArray(msg.content)) {
    const parts = msg.content
      .filter((c): c is { text: string } => c && typeof (c as { text?: string }).text === "string")
      .map((c) => (c as { text: string }).text);
    if (parts.length) return parts.join("\n");
  }
  return "";
}

function slugify(title: string): string {
  return title
    .replace(/\s+/g, "_")
    .replace(/[^\w\-]/g, "")
    .slice(0, 50);
}

function toYMD(createdAt: string | undefined): string {
  if (!createdAt) return "unknown";
  try {
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return "unknown";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "unknown";
  }
}

function confidence(name: string, summary: string, contentSample: string): "high" | "medium" | "low" {
  const t = (name + " " + summary + " " + contentSample).toLowerCase();
  if (/awwv|war without victory|bosnia.*199[1-5]|rulebook|phase\s*\d|map pipeline|determinism|engine invariant/.test(t))
    return "high";
  if (/wargame|settlement|municipality|formation|front|terrain|canon/.test(t)) return "medium";
  return "low";
}

function inferTags(name: string, summary: string, contentSample: string): string[] {
  const tags: string[] = [];
  const s = (name + " " + summary + " " + contentSample).toLowerCase();
  if (/rulebook|phase\s*[0-9a-z]/.test(s)) tags.push("phases");
  if (/map|terrain|settlement|municipality|pipeline|geography|substrate/.test(s)) tags.push("map_and_geography");
  if (/determinism|engine|invariant|simulation|exhaustion|supply/.test(s)) tags.push("systems");
  if (/negotiation|treaty|ceasefire/.test(s)) tags.push("negotiation");
  if (/patron|external pressure|sanctions|arms embargo/.test(s)) tags.push("external_pressure_and_patrons");
  if (/political control|legitimacy|authority/.test(s)) tags.push("political_control");
  if (/canon|canonical/.test(s)) tags.push("engine_and_determinism");
  if (/formation|brigade|front|militia/.test(s)) tags.push("design");
  return tags.length ? tags : ["general"];
}

function main() {
  if (!fs.existsSync(CONVERSATIONS_JSON)) {
    console.error("Missing:", CONVERSATIONS_JSON);
    process.exit(1);
  }
  fs.mkdirSync(RAW_OUT, { recursive: true });

  console.log("Reading Claude conversations.json...");
  const raw = fs.readFileSync(CONVERSATIONS_JSON, "utf8");
  let conversations: ClaudeConv[];
  try {
    conversations = JSON.parse(raw) as ClaudeConv[];
  } catch (e) {
    console.error("JSON parse failed:", e);
    process.exit(1);
  }

  console.log("Total conversations:", conversations.length);
  let written = 0;
  let skipped = 0;

  for (const conv of conversations) {
    const name = conv.name || "Untitled";
    const summary = conv.summary || "";
    const messages = conv.chat_messages || [];
    const contentSample = summary + " " + messages.map((m) => getMessageText(m)).join(" ").slice(0, 4000);
    if (!isAWWVRelevant(name, summary, contentSample)) {
      skipped++;
      continue;
    }
    const dateStr = toYMD(conv.created_at);
    const slug = slugify(name) || "untitled";
    const uid = (conv.uuid || "").slice(0, 8);
    const baseName = uid ? `${dateStr}_claude_${slug}_${uid}.md` : `${dateStr}_claude_${slug}.md`;
    const conf = confidence(name, summary, contentSample);
    const tags = inferTags(name, summary, contentSample);

    const header = `---
title: ${name.replace(/\n/g, " ")}
date: ${dateStr}
source: claude
confidence: ${conf}
primary_topics: [${tags.join(", ")}]
---

`;
    const body = messages
      .map((m) => {
        const text = getMessageText(m);
        if (!text.trim()) return "";
        const who = m.sender === "human" ? "**User**" : "**Assistant**";
        return `${who}\n\n${text.trim()}\n`;
      })
      .filter(Boolean)
      .join("---\n\n");
    const content = header + (body || "\n⚠ CONTEXT GAP: No message bodies extracted; summary may be the only content.\n");
    const outPath = path.join(RAW_OUT, baseName);
    fs.writeFileSync(outPath, content, "utf8");
    written++;
    console.log("Wrote:", baseName);
  }

  console.log("Done. Written:", written, "Skipped:", skipped);
}

main();
