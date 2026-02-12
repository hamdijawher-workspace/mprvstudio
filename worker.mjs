const STATE_KEY = "mprv_state_v1";

let memoryState = null;

function json(value, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(value, null, 2), { ...init, headers });
}

function text(value, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "text/plain; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(value, { ...init, headers });
}

function unauthorized() {
  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="MPRV Admin", charset="UTF-8"',
      "Cache-Control": "no-store"
    }
  });
}

function parseBasicAuth(header) {
  if (!header || !header.startsWith("Basic ")) {
    return null;
  }
  try {
    const decoded = atob(header.slice(6));
    const idx = decoded.indexOf(":");
    if (idx < 0) {
      return null;
    }
    return { username: decoded.slice(0, idx), password: decoded.slice(idx + 1) };
  } catch {
    return null;
  }
}

function isAuthorized(request, env) {
  const header = request.headers.get("Authorization") || "";

  if (header.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    return Boolean(env.ADMIN_TOKEN) && token && token === env.ADMIN_TOKEN;
  }

  const creds = parseBasicAuth(header);
  if (!creds) {
    return false;
  }
  if (!env.ADMIN_USER || !env.ADMIN_PASS) {
    return false;
  }
  return creds.username === env.ADMIN_USER && creds.password === env.ADMIN_PASS;
}

async function readState(env) {
  if (env.MPRV_KV) {
    const raw = await env.MPRV_KV.get(STATE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return memoryState;
}

async function writeState(env, nextState) {
  const payload = {
    weeklyConfigOverride: nextState?.weeklyConfigOverride ?? null,
    productOverrides: nextState?.productOverrides && typeof nextState.productOverrides === "object"
      ? nextState.productOverrides
      : {},
    creatorPicksOverride: Array.isArray(nextState?.creatorPicksOverride) ? nextState.creatorPicksOverride : [],
    updatedAt: new Date().toISOString()
  };

  if (env.MPRV_KV) {
    await env.MPRV_KV.put(STATE_KEY, JSON.stringify(payload));
  } else {
    memoryState = payload;
  }

  return payload;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/state") {
      if (request.method === "GET") {
        const state = (await readState(env)) || {
          weeklyConfigOverride: null,
          productOverrides: {},
          creatorPicksOverride: [],
          updatedAt: null
        };
        return json(state, { status: 200 });
      }

      if (request.method === "PUT") {
        if (!isAuthorized(request, env)) {
          return unauthorized();
        }

        let body;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body." }, { status: 400 });
        }

        const saved = await writeState(env, body);
        const note = env.MPRV_KV ? "saved" : "saved_in_memory_only";
        return json({ ok: true, mode: note, state: saved }, { status: 200 });
      }

      return json({ error: "Method not allowed." }, { status: 405 });
    }

    if (path === "/admin" || path.startsWith("/admin/")) {
      if (!env.ADMIN_USER || !env.ADMIN_PASS) {
        return text(
          "Admin is disabled: set ADMIN_USER and ADMIN_PASS in Cloudflare Worker settings.",
          { status: 403 }
        );
      }
      if (!isAuthorized(request, env)) {
        return unauthorized();
      }
    }

    if (!env.ASSETS) {
      return text("Missing ASSETS binding.", { status: 500 });
    }

    // Serve static site from ./public
    return env.ASSETS.fetch(request);
  }
};

