import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
var dataDir = path.resolve(__dirname, '../../../data');
var mapRoot = path.resolve(__dirname, '.');
export default defineConfig({
    plugins: [
        react(),
        {
            name: 'serve-data',
            configureServer: function (server) {
                server.middlewares.use('/data', function (req, res, next) {
                    var _a;
                    var url = (_a = req.url) !== null && _a !== void 0 ? _a : '/';
                    var filePath = path.join(dataDir, url.split('?')[0]);
                    if (!filePath.startsWith(dataDir)) {
                        next();
                        return;
                    }
                    fs.stat(filePath, function (err, stat) {
                        if (err || !stat.isFile()) {
                            next();
                            return;
                        }
                        var ext = path.extname(filePath).toLowerCase();
                        var mimeTypes = {
                            '.pmtiles': 'application/octet-stream',
                            '.geojson': 'application/geo+json',
                            '.json': 'application/json',
                            '.pbf': 'application/x-protobuf',
                        };
                        var contentType = mimeTypes[ext] || 'application/octet-stream';
                        var rangeHeader = req.headers.range;
                        if (rangeHeader) {
                            var match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
                            if (match) {
                                var start = parseInt(match[1], 10);
                                var end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
                                var chunkSize = end - start + 1;
                                res.writeHead(206, {
                                    'Content-Range': "bytes ".concat(start, "-").concat(end, "/").concat(stat.size),
                                    'Accept-Ranges': 'bytes',
                                    'Content-Length': chunkSize,
                                    'Content-Type': contentType,
                                    'Access-Control-Allow-Origin': '*',
                                    'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
                                });
                                fs.createReadStream(filePath, { start: start, end: end }).pipe(res);
                            }
                            else {
                                res.writeHead(416, { 'Content-Range': "bytes */".concat(stat.size) });
                                res.end();
                            }
                        }
                        else {
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
