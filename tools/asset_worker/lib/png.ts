import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

export type PngMeta = {
  width: number;
  height: number;
  hasTransparentPixels: boolean;
  hasAlphaChannel: boolean;
};

export function readPngMeta(path: string): PngMeta {
  const buffer = readFileSync(path);
  const png = PNG.sync.read(buffer);
  const { width, height, data } = png;

  let hasTransparentPixels = false;
  let hasAlphaChannel = false;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 255) {
      hasTransparentPixels = true;
      hasAlphaChannel = true;
      break;
    }
    if (alpha !== 255) {
      hasAlphaChannel = true;
    }
  }

  return { width, height, hasTransparentPixels, hasAlphaChannel: hasAlphaChannel || hasTransparentPixels };
}

export function readPng(path: string): PNG {
  const buffer = readFileSync(path);
  return PNG.sync.read(buffer);
}
