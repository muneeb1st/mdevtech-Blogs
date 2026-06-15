#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PUBLIC_DIR } from './lib.mjs';

const port = Number(process.env.PORT || 4173);
const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.xml', 'application/xml; charset=utf-8']
]);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    let filePath = path.join(PUBLIC_DIR, decodeURIComponent(url.pathname));
    if (!filePath.startsWith(PUBLIC_DIR)) throw new Error('Blocked path traversal');
    const stat = await fs.stat(filePath).catch(() => null);
    if (stat?.isDirectory()) filePath = path.join(filePath, 'index.html');
    const data = await fs.readFile(filePath);
    res.writeHead(200, { 'content-type': types.get(path.extname(filePath)) || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});

server.listen(port, () => console.log(`Serving ${PUBLIC_DIR} at http://localhost:${port}`));
