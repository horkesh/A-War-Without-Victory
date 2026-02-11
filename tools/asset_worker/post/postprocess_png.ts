import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';

import { readPng } from '../lib/png.js';

const CONTEXT = 'phase a1.0 asset worker pipeline + mcp tools + deterministic postprocess';

type ResizeOptions = {
  width: number;
  height: number;
};

type PostprocessOptions = {
  input: string;
  output: string;
  trim: boolean;
  resize?: ResizeOptions;
  alphaThreshold?: number;
  overwrite: boolean;
};

function parseArgs(argv: string[]): PostprocessOptions {
  const args = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const value = argv[i + 1];
      if (value && !value.startsWith('--')) {
        args.set(token, value);
        i++;
      } else {
        args.set(token, 'true');
      }
    }
  }

  const input = args.get('--in');
  const output = args.get('--out');
  if (!input || !output) {
    throw new Error('Usage: --in <path> --out <path> [--trim] [--resize WxH] [--alphaThreshold N] [--overwrite]');
  }

  const resizeArg = args.get('--resize');
  let resize: ResizeOptions | undefined;
  if (resizeArg) {
    const [wStr, hStr] = resizeArg.split('x');
    const width = Number.parseInt(wStr ?? '', 10);
    const height = Number.parseInt(hStr ?? '', 10);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new Error(`Invalid --resize value: ${resizeArg}`);
    }
    resize = { width, height };
  }

  const alphaThresholdArg = args.get('--alphaThreshold');
  let alphaThreshold: number | undefined;
  if (alphaThresholdArg !== undefined) {
    const parsed = Number.parseInt(alphaThresholdArg, 10);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 255) {
      throw new Error(`Invalid --alphaThreshold value: ${alphaThresholdArg}`);
    }
    alphaThreshold = parsed;
  }

  return {
    input,
    output,
    trim: args.has('--trim'),
    resize,
    alphaThreshold,
    overwrite: args.get('--overwrite') === 'true'
  };
}

function enforceRGBA(png: PNG): PNG {
  const output = new PNG({ width: png.width, height: png.height });
  png.data.copy(output.data);
  return output;
}

function applyAlphaThreshold(png: PNG, threshold: number): PNG {
  const output = enforceRGBA(png);
  for (let i = 0; i < output.data.length; i += 4) {
    if (output.data[i + 3] <= threshold) {
      output.data[i + 3] = 0;
    }
  }
  return output;
}

function trimTransparentBounds(png: PNG, threshold = 0): PNG {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) * 4 + 3;
      const alpha = png.data[idx];
      if (alpha > threshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return new PNG({ width: 1, height: 1 });
  }

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const output = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = ((y + minY) * png.width + (x + minX)) * 4;
      const dstIdx = (y * width + x) * 4;
      output.data[dstIdx] = png.data[srcIdx];
      output.data[dstIdx + 1] = png.data[srcIdx + 1];
      output.data[dstIdx + 2] = png.data[srcIdx + 2];
      output.data[dstIdx + 3] = png.data[srcIdx + 3];
    }
  }
  return output;
}

function resizeNearest(png: PNG, target: ResizeOptions): PNG {
  const output = new PNG({ width: target.width, height: target.height });
  for (let y = 0; y < target.height; y++) {
    const srcY = Math.min(png.height - 1, Math.floor((y * png.height) / target.height));
    for (let x = 0; x < target.width; x++) {
      const srcX = Math.min(png.width - 1, Math.floor((x * png.width) / target.width));
      const srcIdx = (srcY * png.width + srcX) * 4;
      const dstIdx = (y * target.width + x) * 4;
      output.data[dstIdx] = png.data[srcIdx];
      output.data[dstIdx + 1] = png.data[srcIdx + 1];
      output.data[dstIdx + 2] = png.data[srcIdx + 2];
      output.data[dstIdx + 3] = png.data[srcIdx + 3];
    }
  }
  return output;
}

function postprocessPng(options: PostprocessOptions): void {
  const inputPath = resolve(options.input);
  const outputPath = resolve(options.output);

  if (!existsSync(inputPath)) {
    throw new Error(`Input file not found: ${options.input}`);
  }
  if (existsSync(outputPath) && !options.overwrite) {
    throw new Error(`Output file exists (use --overwrite to replace): ${options.output}`);
  }

  let png = readPng(inputPath);
  png = enforceRGBA(png);

  if (options.alphaThreshold !== undefined) {
    png = applyAlphaThreshold(png, options.alphaThreshold);
  }
  if (options.trim) {
    png = trimTransparentBounds(png, options.alphaThreshold ?? 0);
  }
  if (options.resize) {
    png = resizeNearest(png, options.resize);
  }

  const buffer = PNG.sync.write(png);
  writeFileSync(outputPath, buffer);
}

function main() {

  const options = parseArgs(process.argv.slice(2));
  postprocessPng(options);
}

main();
