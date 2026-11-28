import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve("out");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".txt": "text/plain; charset=utf-8" };

createServer(async (request, response) => {
  let path;
  try { path = decodeURIComponent(new URL(request.url, "http://127.0.0.1:4173").pathname); }
  catch { response.writeHead(400).end(); return; }
  if (!path.startsWith("/firstsong/")) { response.writeHead(404).end(); return; }
  let file = resolve(root, "." + path.slice("/firstsong".length));
  if (file !== root && !file.startsWith(root + sep)) { response.writeHead(404).end(); return; }
  try {
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    await stat(file);
    response.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
}).listen(4173, "127.0.0.1");
