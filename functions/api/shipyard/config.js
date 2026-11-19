import {respond} from '../../_lib/shipyard.mjs';

// Public configuration contains only the public Turnstile site key.
// Fail closed: no submissions unless both D1 and bot protection are configured.
export async function onRequestGet({env}) {
  const enabled = Boolean(env.SHIPYARD_DB && env.SHIPYARD_TURNSTILE_SITE_KEY && env.SHIPYARD_TURNSTILE_SECRET);
  return respond({enabled, siteKey:enabled ? String(env.SHIPYARD_TURNSTILE_SITE_KEY) : null});
}
