import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

const dataDir = path.resolve(__dirname, '../../../data');
const mapRoot = path.resolve(__dirname, '.');

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-data',
      configureServer(server) {
        server.middlewares.use('/data', (req, res, next) => {
          const url = req.url ?? '/';
          const filePath = path.join(dataDir, url.split('?')[0]);
          if (!filePath.startsWith(dataDir)) {
            next();
            return;
          }
          fs.stat(filePath, (err, stat) => {
            if (err || !stat.isFile()) {
              next();
              return;
            }
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes: Record<string, string> = {
              '.pmtiles': 'application/octet-stream',
              '.geojson': 'application/geo+json',
              '.json': 'application/json',
              '.pbf': 'application/x-protobuf',
            };
            const contentType = mimeTypes[ext] || 'application/octet-stream';
            const rangeHeader = req.headers.range;

            if (rangeHeader) {
              const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
              if (match) {
                const start = parseInt(match[1], 10);
                const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
                const chunkSize = end - start + 1;
                res.writeHead(206, {
                  'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                  'Accept-Ranges': 'bytes',
                  'Content-Length': chunkSize,
                  'Content-Type': contentType,
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
                });
                fs.createReadStream(filePath, { start, end }).pipe(res);
              } else {
                res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
                res.end();
              }
            } else {
              res.writeHead(200, {
                'Content-Length': stat.size,
                'Content-Type': contentType,
                'Accept-Ranges': 'bytes',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
              });
              fs.createReadStream(filePath).pipe(res);
            }
          });
        });
      },
    },
  ],
  root: mapRoot,
  server: {
    port: 3002,
    fs: {
      allow: ['..', '../..', '../../..'],
    },
  },
  publicDir: false,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
