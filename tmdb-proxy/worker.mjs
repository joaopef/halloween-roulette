const TMDB_ORIGIN = 'https://api.themoviedb.org/3/';
const ALLOWED_ORIGINS = new Set([
  'https://joaopef.github.io',
  'http://localhost:4173',
  'http://127.0.0.1:4173'
]);
const WINDOW_MS = 60_000;
const REQUESTS_PER_WINDOW = 90;

function json(body, status, origin, retryAfter = null) {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Vary': 'Origin' });
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Accept, Content-Type');
    headers.set('Access-Control-Max-Age', '86400');
    headers.set('Access-Control-Expose-Headers', 'Retry-After');
  }
  if (retryAfter) headers.set('Retry-After', retryAfter);
  return new Response(JSON.stringify(body), { status, headers });
}

function languageParam(value) {
  return value === 'pt-PT' || value === 'en-US' ? value : null;
}

function upstreamPath(path, incoming) {
  const search = path === 'search/movie';
  const details = /^movie\/\d+$/.test(path);
  const recommendations = /^movie\/\d+\/recommendations$/.test(path);
  if (!search && !details && !recommendations) return null;
  const target = new URL(path, TMDB_ORIGIN);
  const language = languageParam(incoming.searchParams.get('language'));
  if (language) target.searchParams.set('language', language);
  if (search) {
    const query = (incoming.searchParams.get('query') ?? '').trim().slice(0, 120);
    if (!query) return { error: 400, message: 'A movie title is required.' };
    target.searchParams.set('query', query);
    target.searchParams.set('include_adult', 'false');
    target.searchParams.set('page', '1');
    const year = incoming.searchParams.get('primary_release_year');
    if (year && /^\d{4}$/.test(year)) target.searchParams.set('primary_release_year', year);
  } else if (details) {
    // Search cards need the verified external IMDb ID alongside TMDB details.
    target.searchParams.set('append_to_response', 'external_ids,credits');
  } else {
    target.searchParams.set('page', '1');
  }
  return target;
}

async function allowRequest(env, request) {
  if (!env.RATE_LIMITER) return false;
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return false;
  const secretKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.TMDB_API_READ_ACCESS_TOKEN), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', secretKey, new TextEncoder().encode(ip));
  const opaqueName = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  const stub = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName(opaqueName));
  const response = await stub.fetch('https://rate-limit.internal/check', { method: 'POST' });
  return { allowed: response.ok, retryAfter: response.headers.get('Retry-After') };
}

export class CinemaRateLimiter {
  constructor(state) { this.state = state; }
  async fetch(request) {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const now = Date.now();
    const bucketStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;
    const allowed = await this.state.storage.transaction(async transaction => {
      const previous = await transaction.get('bucket');
      const count = previous?.bucketStart === bucketStart ? previous.count : 0;
      if (count >= REQUESTS_PER_WINDOW) return false;
      await transaction.put('bucket', { bucketStart, count: count + 1 });
      return true;
    });
    if (!allowed) {
      return new Response('Rate limit exceeded', { status: 429, headers: { 'Retry-After': String(Math.ceil((bucketStart + WINDOW_MS - now) / 1000)) } });
    }
    return new Response('OK', { status: 200 });
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return json({ error: 'Origin not allowed.' }, 403, origin);
    if (request.method === 'OPTIONS') {
      const response = json({}, 200, origin);
      return new Response(null, { status: 204, headers: response.headers });
    }
    if (request.method !== 'GET') return json({ error: 'Only GET is supported.' }, 405, origin);
    if (!env.TMDB_API_READ_ACCESS_TOKEN) return json({ error: 'TMDB access token is not configured.' }, 503, origin);
    if (!env.RATE_LIMITER) return json({ error: 'Rate limiter is not configured.' }, 503, origin);
    try {
      const incoming = new URL(request.url);
      const route = incoming.pathname.replace(/^\/+/, '').replace(/\/+$/, '').replace(/^3\//, '');
      const target = upstreamPath(route, incoming);
      if (!target) return json({ error: 'Endpoint not allowed.' }, 404, origin);
      if (target.error) return json({ error: target.message }, target.error, origin);
      const limit = await allowRequest(env, request);
      if (!limit) return json({ error: 'Rate limiter unavailable.' }, 503, origin);
      if (!limit.allowed) return json({ error: 'Request limit reached.' }, 429, origin, limit.retryAfter || '60');
      const response = await fetch(target, {
        method: 'GET',
        headers: { Accept: 'application/json', Authorization: `Bearer ${env.TMDB_API_READ_ACCESS_TOKEN}` },
        signal: AbortSignal.timeout(8000)
      });
      const body = await response.text();
      return new Response(body, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'application/json; charset=utf-8',
          'Cache-Control': 'no-store', 'Vary': 'Origin',
          'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Accept, Content-Type', 'Access-Control-Max-Age': '86400',
          'Access-Control-Expose-Headers': 'Retry-After',
          ...(response.headers.get('Retry-After') ? { 'Retry-After': response.headers.get('Retry-After') } : {})
        }
      });
    } catch {
      return json({ error: 'The movie catalogue request failed.' }, 502, origin);
    }
  }
};
