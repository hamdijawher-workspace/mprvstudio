#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 4333);
// Local-only secure server. Production is on Cloudflare Workers; do not hardcode secrets.
const ROOT = join(process.cwd(), "public");
const ADMIN_USER = process.env.ADMIN_USER || "";
const ADMIN_PASS = process.env.ADMIN_PASS || "";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

function unauthorized(res) {
  res.writeHead(401, {
    "WWW-Authenticate": 'Basic realm="MPRV Admin", charset="UTF-8"',
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end("Authentication required.");
}

function parseBasicAuth(header) {
  if (!header || !header.startsWith("Basic ")) {
    return null;
  }
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const idx = decoded.indexOf(":");
    if (idx < 0) {
      return null;
    }
    return {
      username: decoded.slice(0, idx),
      password: decoded.slice(idx + 1)
    };
  } catch {
    return null;
  }
}

function isAdminAuthorized(req) {
  if (!ADMIN_USER || !ADMIN_PASS) {
    return false;
  }
  const creds = parseBasicAuth(req.headers.authorization);
  if (!creds) {
    return false;
  }
  return creds.username === ADMIN_USER && creds.password === ADMIN_PASS;
}

function resolvePath(urlPath) {
  let pathname = urlPath.split("?")[0];
  if (pathname === "/") {
    pathname = "/index.html";
  }
  if (pathname.endsWith("/")) {
    pathname = `${pathname}index.html`;
  }
  const unsafe = normalize(pathname).replace(/^([.][.][/\\])+/, "");
  return join(ROOT, unsafe);
}

async function serveFile(req, res, pathToFile) {
  try {
    const data = await readFile(pathToFile);
    const type = MIME[extname(pathToFile).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": type.includes("text/html") ? "no-store" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  const urlPath = req.url || "/";

  if (urlPath.startsWith("/admin")) {
    if (!isAdminAuthorized(req)) {
      unauthorized(res);
      return;
    }
  }

  const target = resolvePath(urlPath);
  await serveFile(req, res, target);
});

server.listen(PORT, HOST, () => {
  console.log(`MPRV secure server running at http://${HOST}:${PORT}`);
  console.log(`Admin protected at http://${HOST}:${PORT}/admin/`);
});
