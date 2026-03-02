'use strict';

const fs = require('fs');
const path = require('path');

function isPathInside(baseDir, filePath) {
  const base = path.resolve(baseDir);
  const target = path.resolve(filePath);
  const rel = path.relative(base, target);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function parseByteRange(rangeHeader, totalSize) {
  if (typeof rangeHeader !== 'string' || !rangeHeader.startsWith('bytes=')) return null;
  const value = rangeHeader.slice('bytes='.length).trim();
  const match = /^(\d*)-(\d*)$/.exec(value);
  if (!match) return 'invalid';

  const startRaw = match[1];
  const endRaw = match[2];

  let start;
  let end;

  if (startRaw === '' && endRaw === '') return 'invalid';
  if (startRaw === '') {
    const suffixLength = Number(endRaw);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return 'invalid';
    start = Math.max(totalSize - suffixLength, 0);
    end = totalSize - 1;
  } else {
    start = Number(startRaw);
    end = endRaw === '' ? totalSize - 1 : Number(endRaw);
  }

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= totalSize) {
    return 'invalid';
  }
  end = Math.min(end, totalSize - 1);
  return { start, end };
}

function contentTypeForExt(ext) {
  const types = {
    '.json': 'application/json',
    '.geojson': 'application/geo+json',
    '.png': 'image/png',
    '.pmtiles': 'application/octet-stream',
    '.pbf': 'application/x-protobuf',
  };
  return types[ext] || 'application/octet-stream';
}

function resolveDerivedRelativePath(segs) {
  if (segs[0] === 'app' && segs[1] === 'data' && segs[2] === 'derived') {
    return segs.slice(3).join(path.sep);
  }
  if (segs[0] === 'data' && segs[1] === 'derived') {
    return segs.slice(2).join(path.sep);
  }
  return null;
}

function buildDataDerivedResponse(request, dataDerivedDir, segs) {
  const rel = resolveDerivedRelativePath(segs);
  if (rel == null) return null;

  const filePath = path.join(dataDerivedDir, rel);
  if (!isPathInside(dataDerivedDir, filePath)) {
    return new Response(null, { status: 403 });
  }

  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return new Response('Not Found', { status: 404 });

    const ext = path.extname(rel).toLowerCase();
    const contentType = contentTypeForExt(ext);
    const totalSize = stat.size;
    const rangeHeader = request?.headers?.get?.('range') || null;
    const parsedRange = parseByteRange(rangeHeader, totalSize);

    if (parsedRange === null) {
      const body = fs.readFileSync(filePath);
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(totalSize),
          'Accept-Ranges': 'bytes',
        },
      });
    }

    if (parsedRange === 'invalid') {
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${totalSize}` },
      });
    }

    const { start, end } = parsedRange;
    const length = end - start + 1;
    const chunk = Buffer.alloc(length);
    let fd = null;
    try {
      fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, chunk, 0, length, start);
    } finally {
      if (fd !== null) fs.closeSync(fd);
    }

    return new Response(chunk, {
      status: 206,
      headers: {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Content-Length': String(length),
      },
    });
  } catch (e) {
    if (e && e.code === 'ENOENT') return new Response('Not Found', { status: 404 });
    throw e;
  }
}

module.exports = {
  buildDataDerivedResponse,
  isPathInside,
  parseByteRange,
};
