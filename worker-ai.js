/* ============================================================
   WAR DESK — Cloudflare Worker v2.0
   - v2.0: Origin whitelist + KV rate limiting + CORS
           Geen client-side AUTH_TOKEN meer nodig.
   - Routes:
     POST /ai         → AI proxy (beveiligd)
     GET  /x?user=X   → X/Twitter proxy
     GET  /?url=X     → Algemene CORS proxy
     GET  /health     → Health check
   ============================================================ */

const ALLOWED_ORIGINS = [
  "https://wardesk.pages.dev",
  "https://wardesk.hassanbadri814.workers.dev",
  "https://hassanbadri814.github.io",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5500",
  "http://localhost:3000"
];

const RATE_LIMIT = {
  AI_PER_HOUR: 40,
  PROXY_PER_HOUR: 200,
  X_PER_HOUR: 60
};

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Max-Age": "86400"
};

/* ============================================================
   Helpers
   ============================================================ */
function getClientIp(request) {
  return request.headers.get("CF-Connecting-IP") ||
         request.headers.get("X-Real-IP") ||
         request.headers.get("X-Forwarded-For")?.split(",")[0].trim() ||
         "unknown";
}

function isOriginAllowed(origin, referer) {
  if (!origin && !referer) return false;

  var check = origin || "";
  if (!check && referer) {
    try {
      var u = new URL(referer);
      check = u.origin;
    } catch (e) { return false; }
  }

  /* Exacte match */
  for (var i = 0; i < ALLOWED_ORIGINS.length; i++) {
    if (check === ALLOWED_ORIGINS[i]) return true;
  }

  /* Subdomein van pages.dev / workers.dev (voor preview deployments) */
  try {
    var url = new URL(check);
    if (url.hostname.endsWith(".wardesk.pages.dev")) return true;
    if (url.hostname === "wardesk.pages.dev") return true;
    if (url.hostname.endsWith(".hassanbadri814.workers.dev")) return true;
  } catch (e) {}

  return false;
}

function buildCorsHeaders(origin) {
  var headers = Object.assign({}, CORS_HEADERS);
  if (origin && isOriginAllowed(origin, null)) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else {
    /* Fallback: eerste toegestane origin (voor requests zonder Origin header) */
    headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGINS[0];
  }
  headers["Vary"] = "Origin";
  return headers;
}

function jsonResponse(data, status, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }, extraHeaders || {})
  });
}

/* ============================================================
   Rate limiting via KV
   ============================================================ */
async function checkRateLimit(env, ip, bucket, limit) {
  if (!env || !env.RATE_LIMIT_KV) {
    /* Geen KV beschikbaar — skip rate limiting (development) */
    return { allowed: true, remaining: -1, resetAt: 0 };
  }

  var now = Date.now();
  var windowStart = now - (now % 3600000); /* 1 uur venster */
  var key = "rl:" + bucket + ":" + ip + ":" + windowStart;

  var raw;
  try {
    raw = await env.RATE_LIMIT_KV.get(key);
  } catch (e) {
    return { allowed: true, remaining: -1, resetAt: 0 };
  }

  var count = raw ? parseInt(raw, 10) : 0;
  if (isNaN(count)) count = 0;

  if (count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: windowStart + 3600000
    };
  }

  /* Increment (KV is eventually consistent, dus kan wat afwijken
     bij gelijktijdige requests, maar dat is acceptabel) */
  try {
    await env.RATE_LIMIT_KV.put(key, String(count + 1), {
      expirationTtl: 3700
    });
  } catch (e) {}

  return {
    allowed: true,
    remaining: Math.max(0, limit - count - 1),
    resetAt: windowStart + 3600000
  };
}

/* ============================================================
   AI proxy — de hoofdfunctie
   ============================================================ */
async function handleAi(request, env) {
  var origin = request.headers.get("Origin");
  var referer = request.headers.get("Referer");
  var corsHeaders = buildCorsHeaders(origin);

  /* CORS preflight */
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  /* Alleen POST */
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  /* Origin check */
  if (!isOriginAllowed(origin, referer)) {
    return jsonResponse({
      error: "Origin niet toegestaan",
      hint: "Deze API accepteert alleen requests vanaf het WAR DESK domein."
    }, 403, corsHeaders);
  }

  /* Rate limit */
  var ip = getClientIp(request);
  var rl = await checkRateLimit(env, ip, "ai", RATE_LIMIT.AI_PER_HOUR);
  if (!rl.allowed) {
    var resetIn = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 60000));
    return jsonResponse({
      error: "Rate limit bereikt",
      hint: "Probeer het over " + resetIn + " minuten opnieuw.",
      resetAt: rl.resetAt
    }, 429, Object.assign({}, corsHeaders, {
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": String(Math.floor(rl.resetAt / 1000))
    }));
  }

  /* Body lezen en limiteren */
  var body;
  try {
    body = await request.text();
  } catch (e) {
    return jsonResponse({ error: "Kon request body niet lezen" }, 400, corsHeaders);
  }

  if (body.length > 200000) {
    return jsonResponse({ error: "Request te groot (max 200KB)" }, 413, corsHeaders);
  }

  /* Payload valideren */
  var payload;
  try {
    payload = JSON.parse(body);
  } catch (e) {
    return jsonResponse({ error: "Ongeldige JSON" }, 400, corsHeaders);
  }

  if (!payload || typeof payload.message !== "string" || !payload.message.trim()) {
    return jsonResponse({ error: "Geen geldige 'message' in payload" }, 400, corsHeaders);
  }

  if (payload.message.length > 4000) {
    payload.message = payload.message.slice(0, 4000);
  }

  /* Doorsturen naar de AI backend.
     Vervang AI_BACKEND_URL door jouw echte AI service URL.
     Als je geen aparte backend hebt en dit endpoint IS de AI,
     kun je hier de AI-logica direct uitvoeren. */
  var AI_BACKEND_URL = env.AI_BACKEND_URL || "";

  if (!AI_BACKEND_URL) {
    /* Geen backend geconfigureerd — retourneer nette foutmelding */
    return jsonResponse({
      error: "AI backend niet geconfigureerd",
      hint: "Zet AI_BACKEND_URL in de Worker environment variables."
    }, 503, corsHeaders);
  }

  try {
    var aiResponse = await fetch(AI_BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "WAR-DESK/1.0"
      },
      body: JSON.stringify(payload)
    });

    /* Stream doorgeven aan de client */
    var responseHeaders = Object.assign({}, corsHeaders);
    var contentType = aiResponse.headers.get("Content-Type");
    if (contentType) responseHeaders["Content-Type"] = contentType;
    responseHeaders["X-RateLimit-Remaining"] = String(rl.remaining);
    responseHeaders["X-RateLimit-Reset"] = String(Math.floor(rl.resetAt / 1000));

    return new Response(aiResponse.body, {
      status: aiResponse.status,
      headers: responseHeaders
    });

  } catch (e) {
    return jsonResponse({
      error: "AI backend onbereikbaar",
      detail: e.message || "onbekende fout"
    }, 502, corsHeaders);
  }
}

/* ============================================================
   X/Twitter proxy
   ============================================================ */
async function handleX(request, env) {
  var origin = request.headers.get("Origin");
  var referer = request.headers.get("Referer");
  var corsHeaders = buildCorsHeaders(origin);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!isOriginAllowed(origin, referer)) {
    return jsonResponse({ error: "Origin niet toegestaan" }, 403, corsHeaders);
  }

  var ip = getClientIp(request);
  var rl = await checkRateLimit(env, ip, "x", RATE_LIMIT.X_PER_HOUR);
  if (!rl.allowed) {
    return jsonResponse({ error: "Rate limit bereikt" }, 429, corsHeaders);
  }

  var url = new URL(request.url);
  var user = url.searchParams.get("user");
  if (!user || !/^[A-Za-z0-9_]{1,15}$/.test(user)) {
    return jsonResponse({ error: "Ongeldige user parameter" }, 400, corsHeaders);
  }

  try {
    var r = await fetch("https://nitter.net/" + user + "/rss", {
      headers: { "User-Agent": "Mozilla/5.0 WAR-DESK" }
    });
    if (!r.ok) {
      return jsonResponse({ error: "Bron gaf HTTP " + r.status }, r.status, corsHeaders);
    }
    var text = await r.text();
    return new Response(text, {
      status: 200,
      headers: Object.assign({}, corsHeaders, {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300"
      })
    });
  } catch (e) {
    return jsonResponse({ error: "Kon X feed niet ophalen", detail: e.message }, 502, corsHeaders);
  }
}

/* ============================================================
   Algemene proxy
   ============================================================ */
async function handleProxy(request, env) {
  var origin = request.headers.get("Origin");
  var referer = request.headers.get("Referer");
  var corsHeaders = buildCorsHeaders(origin);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!isOriginAllowed(origin, referer)) {
    return jsonResponse({ error: "Origin niet toegestaan" }, 403, corsHeaders);
  }

  var ip = getClientIp(request);
  var rl = await checkRateLimit(env, ip, "proxy", RATE_LIMIT.PROXY_PER_HOUR);
  if (!rl.allowed) {
    return jsonResponse({ error: "Rate limit bereikt" }, 429, corsHeaders);
  }

  var url = new URL(request.url);
  var target = url.searchParams.get("url");
  if (!target) {
    return jsonResponse({ error: "Geen url parameter" }, 400, corsHeaders);
  }

  /* Alleen http(s) toestaan */
  if (!/^https?:\/\//i.test(target)) {
    return jsonResponse({ error: "Ongeldige URL (alleen http/https)" }, 400, corsHeaders);
  }

  /* Blokkeer bekende kwaadaardige hosts */
  var blocked = ["localhost", "127.0.0.1", "0.0.0.0", "169.254.", "10.", "192.168."];
  for (var i = 0; i < blocked.length; i++) {
    if (target.indexOf(blocked[i]) !== -1) {
      return jsonResponse({ error: "URL niet toegestaan" }, 403, corsHeaders);
    }
  }

  try {
    var targetUrl = new URL(target);
    var method = request.method;
    var options = {
      method: method,
      headers: {
        "User-Agent": "Mozilla/5.0 WAR-DESK",
        "Accept": "*/*"
      }
    };

    /* POST body doorgeven */
    if (method === "POST") {
      options.headers["Content-Type"] = request.headers.get("Content-Type") || "application/json";
      options.body = await request.text();
    }

    var r = await fetch(targetUrl.toString(), options);
    var responseHeaders = Object.assign({}, corsHeaders);
    var ct = r.headers.get("Content-Type");
    if (ct) responseHeaders["Content-Type"] = ct;

    return new Response(r.body, {
      status: r.status,
      headers: responseHeaders
    });
  } catch (e) {
    return jsonResponse({ error: "Proxy fout", detail: e.message }, 502, corsHeaders);
  }
}

/* ============================================================
   Health check
   ============================================================ */
async function handleHealth(request, env) {
  var hasKv = !!(env && env.RATE_LIMIT_KV);
  var hasBackend = !!(env && env.AI_BACKEND_URL);

  return jsonResponse({
    status: "ok",
    version: "v2.0",
    timestamp: new Date().toISOString(),
    features: {
      kv: hasKv,
      aiBackend: hasBackend,
      originWhitelist: ALLOWED_ORIGINS.length
    }
  }, 200, buildCorsHeaders(request.headers.get("Origin")));
}

/* ============================================================
   Main handler
   ============================================================ */
export default {
  async fetch(request, env, ctx) {
    var url = new URL(request.url);
    var path = url.pathname;

    /* Preflight voor alle routes */
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: buildCorsHeaders(request.headers.get("Origin"))
      });
    }

    if (path === "/ai") {
      return handleAi(request, env);
    }

    if (path === "/x") {
      return handleX(request, env);
    }

    if (path === "/health") {
      return handleHealth(request, env);
    }

    if (path === "/" || path === "") {
      if (url.searchParams.has("url")) {
        return handleProxy(request, env);
      }
      return jsonResponse({
        name: "WAR DESK Worker",
        version: "v2.0",
        routes: ["/ai", "/x", "/health", "/?url=..."]
      }, 200, buildCorsHeaders(request.headers.get("Origin")));
    }

    return jsonResponse({ error: "Route niet gevonden: " + path }, 404);
  }
};