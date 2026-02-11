import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import {
  AssetEntry,
  MANIFEST_PATH,
  loadManifest,
  writeManifest,
  normalizePath,
  isAssetFamily,
  hashFileSha256
} from '../lib/manifest.js';
import { readPngMeta } from '../lib/png.js';

const CONTEXT = 'phase a1.0 asset worker pipeline + mcp tools + deterministic postprocess';

type GenerateArgs = {
  asset_id: string;
  family: string;
  prompt: string;
  width?: number;
  height?: number;
  transparent?: boolean;
  overwrite?: boolean;
  notes?: string;
};

type PostprocessArgs = {
  input: string;
  output: string;
  trim?: boolean;
  resize?: string;
  alphaThreshold?: number;
  overwrite?: boolean;
};

function upsertEntry(entries: AssetEntry[], entry: AssetEntry): AssetEntry[] {
  const index = entries.findIndex((asset) => asset.asset_id === entry.asset_id);
  if (index === -1) {
    return [...entries, entry];
  }
  const existing = entries[index];
  const updated: AssetEntry = {
    ...existing,
    family: entry.family ?? existing.family,
    source_path: entry.source_path ?? existing.source_path,
    raw_path: entry.raw_path ?? existing.raw_path,
    derived_paths: existing.derived_paths?.length ? existing.derived_paths : entry.derived_paths,
    prompt: entry.prompt ?? existing.prompt,
    generator: entry.generator ?? existing.generator,
    params: { ...entry.params, ...(existing.params || {}) },
    created_at: existing.created_at ?? entry.created_at,
    sha256_source: entry.sha256_source ?? existing.sha256_source,
    sha256_derived: entry.sha256_derived ?? existing.sha256_derived,
    notes: entry.notes ?? existing.notes
  };

  const next = [...entries];
  next[index] = updated;
  return next;
}

async function generateImage(args: GenerateArgs): Promise<string> {
  if (!isAssetFamily(args.family)) {
    throw new Error(`Unknown family: ${args.family}`);
  }
  if (!args.asset_id || !args.prompt) {
    throw new Error('asset_id and prompt are required.');
  }

  const outputPath = resolve(`assets/sources/${args.family}/${args.asset_id}.png`);
  if (existsSync(outputPath) && !args.overwrite) {
    throw new Error(`Output already exists (use overwrite): ${outputPath}`);
  }

  const manifest = loadManifest(MANIFEST_PATH);
  const entryBase: AssetEntry = {
    asset_id: args.asset_id,
    family: args.family,
    source_path: normalizePath(`assets/sources/${args.family}/${args.asset_id}.png`),
    raw_path: null,
    derived_paths: [],
    prompt: args.prompt,
    generator: 'openai_images',
    params: {
      width: args.width,
      height: args.height,
      transparent: args.transparent ?? false,
      style_refs: []
    },
    created_at: 'v1',
    sha256_source: null,
    sha256_derived: null,
    notes: args.notes ?? null
  };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const updated = upsertEntry(manifest.assets || [], {
      ...entryBase,
      generator: 'openai_images (not configured)',
      notes: args.notes ?? 'Generator not configured; no file created.'
    });
    writeManifest({ ...manifest, assets: updated }, MANIFEST_PATH);
    throw new Error('generator not configured');
  }

  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
  const size = args.width && args.height ? `${args.width}x${args.height}` : '1024x1024';

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      prompt: args.prompt,
      size,
      response_format: 'b64_json'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI image generation failed: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as { data: Array<{ b64_json: string }> };
  const b64 = payload.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('OpenAI response missing image data.');
  }

  const buffer = Buffer.from(b64, 'base64');
  writeFileSync(outputPath, buffer);

  const meta = readPngMeta(outputPath);
  const sha256 = hashFileSha256(outputPath);
  const updated = upsertEntry(manifest.assets || [], {
    ...entryBase,
    params: {
      ...entryBase.params,
      width: meta.width,
      height: meta.height,
      transparent: args.transparent ?? meta.hasTransparentPixels
    },
    sha256_source: sha256
  });
  writeManifest({ ...manifest, assets: updated }, MANIFEST_PATH);

  return normalizePath(`assets/sources/${args.family}/${args.asset_id}.png`);
}

function postprocessPng(args: PostprocessArgs): void {
  const commandArgs = [
    'tools/asset_worker/post/postprocess_png.ts',
    '--in',
    args.input,
    '--out',
    args.output
  ];
  if (args.trim) commandArgs.push('--trim');
  if (args.resize) commandArgs.push('--resize', args.resize);
  if (args.alphaThreshold !== undefined) commandArgs.push('--alphaThreshold', `${args.alphaThreshold}`);
  if (args.overwrite) commandArgs.push('--overwrite');

  const result = spawnSync('tsx', commandArgs, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error('Postprocess failed.');
  }
}

function validateAssets(): void {
  const result = spawnSync('tsx', ['tools/asset_worker/validate/validate_assets.ts'], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error('Asset validation failed.');
  }
}

async function main(): Promise<void> {

  const server = new Server(
    { name: 'awwv-asset-worker', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'asset_generate_image',
        description: 'Generate a PNG asset via provider and register in manifest.',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: { type: 'string' },
            family: { type: 'string', enum: ['hq', 'props', 'crests', 'papers'] },
            prompt: { type: 'string' },
            width: { type: 'number' },
            height: { type: 'number' },
            transparent: { type: 'boolean' },
            overwrite: { type: 'boolean' },
            notes: { type: 'string' }
          },
          required: ['asset_id', 'family', 'prompt']
        }
      },
      {
        name: 'asset_postprocess_png',
        description: 'Run deterministic PNG postprocess.',
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' },
            output: { type: 'string' },
            trim: { type: 'boolean' },
            resize: { type: 'string' },
            alphaThreshold: { type: 'number' },
            overwrite: { type: 'boolean' }
          },
          required: ['input', 'output']
        }
      },
      {
        name: 'asset_validate',
        description: 'Validate the asset manifest and referenced files.',
        inputSchema: { type: 'object', properties: {} }
      }
    ]
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    try {
      if (name === 'asset_generate_image') {
        const outputPath = await generateImage(request.params.arguments as GenerateArgs);
        return {
          content: [{ type: 'text', text: `Generated: ${outputPath}` }]
        };
      }
      if (name === 'asset_postprocess_png') {
        postprocessPng(request.params.arguments as PostprocessArgs);
        return { content: [{ type: 'text', text: 'Postprocess complete.' }] };
      }
      if (name === 'asset_validate') {
        validateAssets();
        return { content: [{ type: 'text', text: 'Validation complete.' }] };
      }
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    } catch (error) {
      return {
        content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
        isError: true
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
