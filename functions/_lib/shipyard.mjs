// Shipyard intake helpers. No external packages; compatible with Cloudflare Pages Functions.
export const IDEA_STATES = Object.freeze(['new','reviewing','needs_detail','declined','internally_approved']);

export function respond(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer'
    }
  });
}

function shortText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max + 1) : '';
}

export function validateIdea(body) {
  if (!body || Array.isArray(body) || typeof body !== 'object') return {ok:false, error:'Invalid submission'};
  const idea = {
    problem: shortText(body.problem, 2000),
    people: shortText(body.people, 1000),
    currentApproach: shortText(body.currentApproach, 1200),
    outcome: shortText(body.outcome, 1200),
    direction: shortText(body.direction, 30),
    priority: shortText(body.priority, 30),
    contactName: shortText(body.contactName, 100),
    contactEmail: shortText(body.contactEmail, 254).toLowerCase(),
    organisation: shortText(body.organisation, 150)
  };
  if (idea.problem.length < 20 || idea.problem.length > 2000 || idea.outcome.length < 10 || idea.outcome.length > 1200)
    return {ok:false,error:'Describe the problem and what a better outcome would look like'};
  if (idea.people.length > 1000 || idea.currentApproach.length > 1200 || idea.contactName.length > 100 || idea.organisation.length > 150)
    return {ok:false,error:'One of the answers is too long'};
  if (!['unsure','improve','small','explore'].includes(idea.direction) ||
      !['simplicity','ownership','speed','cost','unsure'].includes(idea.priority))
    return {ok:false,error:'Choose valid options for your project'};
  if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(idea.contactEmail) || idea.contactEmail.length > 254)
    return {ok:false,error:'Enter a valid email address'};
  if (body.consent !== true) return {ok:false,error:'You need to agree to us using your information to review this enquiry'};
  if (shortText(body.companyWebsite, 250)) return {ok:false,error:'Invalid submission'};
  return {ok:true,idea};
}

export function sameOriginJson(request) {
  const origin = request.headers.get('origin');
  const type = request.headers.get('content-type') || '';
  if (!origin || !type.toLowerCase().startsWith('application/json')) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

export async function readSmallJSON(request, maxBytes = 8500) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > maxBytes) throw new Error('too_large');
  const body = await request.text();
  if (new TextEncoder().encode(body).length > maxBytes) throw new Error('too_large');
  return JSON.parse(body);
}

function b64u(str) {
  if (!/^[A-Za-z0-9_-]+$/.test(str)) throw new Error('bad JWT encoding');
  const padded = str.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4 - str.length % 4) % 4);
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
}

export async function authorisedAdmin(request, env, fetcher = fetch, now = Date.now()) {
  const team = String(env.SHIPYARD_ACCESS_TEAM_DOMAIN || '').replace(/\/$/,'');
  const aud = String(env.SHIPYARD_ACCESS_AUD || '');
  const allow = String(env.SHIPYARD_ADMIN_EMAILS || '').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(team) || !aud || !allow.length) return null;

  const jwt = request.headers.get('cf-access-jwt-assertion');
  if (!jwt || jwt.length > 8000) return null;
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    const decoder = new TextDecoder();
    const header = JSON.parse(decoder.decode(b64u(parts[0])));
    const payload = JSON.parse(decoder.decode(b64u(parts[1])));
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return null;
    if (payload.iss !== team || !(Array.isArray(payload.aud) ? payload.aud.includes(aud) : payload.aud === aud)) return null;
    const timestamp = Math.floor(now / 1000);
    if (!Number.isFinite(payload.exp) || payload.exp <= timestamp ||
        (payload.nbf != null && (!Number.isFinite(payload.nbf) || payload.nbf > timestamp)) ||
        (payload.iat != null && (!Number.isFinite(payload.iat) || payload.iat > timestamp + 60))) return null;
    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
    if (!allow.includes(email)) return null;

    // The verification endpoint is fixed by server configuration, never by an untrusted JWT.
    const keysResponse = await fetcher(team + '/cdn-cgi/access/certs', {headers:{accept:'application/json'}, signal:AbortSignal.timeout(5000)});
    if (!keysResponse.ok) return null;
    const jwks = await keysResponse.json();
    const key = Array.isArray(jwks.keys) ? jwks.keys.find(k=>k.kid === header.kid && k.kty === 'RSA' && k.alg === 'RS256') : null;
    if (!key) return null;
    const publicKey = await crypto.subtle.importKey('jwk', key, {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'}, false, ['verify']);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, b64u(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
    return valid ? email : null;
  } catch {
    return null;
  }
}

export function safePreviewUrl(value) {
  if (typeof value !== 'string' || value.length > 500) return '';
  if (!value.trim()) return '';
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    if (url.hostname === 'localhost' || url.hostname.endsWith('.local') ||
      url.hostname.match(/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/)) return '';
    return url.toString();
  } catch {return '';}
}

export function publicReviewState(review) {
  const version = Number(review?.review_version || 0);
  const hasPrototype = Boolean(review?.prototype_url);
  const hasPrice = (Number.isInteger(review?.ship_it_pence) && review.ship_it_pence > 0) ||
    (Number.isInteger(review?.learn_ship_pence) && review.learn_ship_pence > 0);
  return {
    prototypeApproved: hasPrototype && review.prototype_approved_version === version,
    quoteApproved: hasPrice && Boolean(review?.quote_notes) && review.quote_approved_version === version,
    // Delivery is intentionally unavailable until an independently designed and
    // tested email outbox with an additional explicit sign-off is implemented.
    deliveryEnabled: false
  };
}
