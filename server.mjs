import http from 'node:http';
import { stat } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const allowed = ['index.html', 'styles.css', 'app.js', 'content.js'].includes(relative)
      || relative.startsWith('assets/')
      || relative.startsWith('Song/')
      || relative.startsWith('song/');
    let filename = path.resolve(root, relative);
    if (!existsSync(filename) && relative.startsWith('song/')) {
      const altFilename = path.resolve(root, 'Song/' + relative.slice(5));
      if (existsSync(altFilename)) filename = altFilename;
    }
    if (!allowed || !filename.startsWith(root + path.sep)) { res.writeHead(404); res.end('Not found'); return; }
    const info = await stat(filename);
    if (!info.isFile()) throw new Error('Not a file');

    const ext = path.extname(filename).toLowerCase();
    const contentType = mime[ext] || 'application/octet-stream';
    const range = req.headers.range;

    if (range) {
      const match = range.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : info.size - 1;
        if (start < info.size && end < info.size && start <= end) {
          const chunksize = end - start + 1;
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${info.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': contentType,
            'Cache-Control': 'no-cache'
          });
          if (req.method === 'HEAD') {
            res.end();
          } else {
            createReadStream(filename, { start, end }).pipe(res);
          }
          return;
        }
      }
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': info.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    createReadStream(filename).pipe(res);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Birthday website: http://localhost:${port}`));
server.on('error', error => { console.error(error.message); process.exit(1); });
