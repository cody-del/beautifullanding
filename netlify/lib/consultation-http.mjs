import {submitConsultation} from './consultation.mjs';

// At most 5 leads per visitor per 15 minutes. Kept in memory, so it resets when
// the function instance is recycled; it slows a flood rather than stopping it.
export function createRateLimiter({windowMs = 15 * 60 * 1000, max = 5} = {}) {
  const recent = new Map();
  return (key, now = Date.now()) => {
    if (recent.size > 1000) {
      for (const [stale, times] of recent) if (now - times.at(-1) >= windowMs) recent.delete(stale);
    }
    const times = (recent.get(key) ?? []).filter(time => now - time < windowMs);
    const limited = times.length >= max;
    if (!limited) times.push(now);
    recent.set(key, times);
    return limited;
  };
}

export function createConsultationHandler(submit = submitConsultation, rateLimited = createRateLimiter()) {
  return async (request, context) => {
    const send = (status, body, headers = {}) => Response.json(body, {
      status, headers: {'Cache-Control': 'no-store', ...headers},
    });
    if (request.method !== 'POST') return send(405, {error: 'Method not allowed.'}, {Allow: 'POST'});
    if (request.headers.get('origin') !== new URL(request.url).origin) return send(403, {error: 'Invalid origin.'});
    // form.js always sends JSON; anything else is not this page's form.
    if (!request.headers.get('content-type')?.startsWith('application/json')) return send(415, {error: 'Please call (260) 222-6467 to request your free quote.'});
    if (Number(request.headers.get('content-length')) > 8192) return send(413, {error: 'Request too large.'});
    let data;
    try {
      const reader = request.body?.getReader();
      if (!reader) return send(400, {error: 'Invalid request.'});
      const chunks = [];
      let size = 0;
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 8192) {
          await reader.cancel();
          return send(413, {error: 'Request too large.'});
        }
        chunks.push(value);
      }
      data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return send(400, {error: 'Invalid request.'});
    }
    const ip = context?.ip ?? request.headers.get('x-nf-client-connection-ip') ?? 'unknown';
    const result = await submit(data, {rateLimited: () => rateLimited(ip)});
    return send(result.status, result.body);
  };
}
