import {respond, validateIdea, sameOriginJson, readSmallJSON} from '../../_lib/shipyard.mjs';

export async function onRequestPost({request,env}) {
  // Never accept data when any privacy/abuse-control dependency is unconfigured.
  if (env.SHIPYARD_INTAKE_ENABLED !== 'true' || !env.SHIPYARD_DB || !env.SHIPYARD_TURNSTILE_SECRET || !env.SHIPYARD_TURNSTILE_SITE_KEY)
    return respond({ok:false,error:'Enquiries are not open yet. Please use the booking link.'},503);
  if (!sameOriginJson(request)) return respond({ok:false,error:'Invalid request origin'},403);

  let submitted;
  try {submitted=await readSmallJSON(request);} catch{return respond({ok:false,error:'Invalid or oversized submission'},400);}
  if (submitted.companyWebsite) return respond({ok:true,received:true}); // Honeypot: store nothing.
  const validation=validateIdea(submitted);
  if (!validation.ok) return respond({ok:false,error:validation.error},400);

  const turnstileToken=typeof submitted.turnstileToken === 'string' ? submitted.turnstileToken.slice(0,2048) : '';
  if (!turnstileToken) return respond({ok:false,error:'Please complete the anti-spam check'},400);

  let verification;
  try {
    const payload=new FormData();
    payload.set('secret',String(env.SHIPYARD_TURNSTILE_SECRET));
    payload.set('response',turnstileToken);
    const ip=request.headers.get('cf-connecting-ip');
    if (ip) payload.set('remoteip',ip);
    const check=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',body:payload,signal:AbortSignal.timeout(5000)
    });
    if (!check.ok) throw new Error('turnstile unavailable');
    verification=await check.json();
  } catch{return respond({ok:false,error:'The verification service is temporarily unavailable'},503);}
  if (verification.success !== true || verification.hostname !== new URL(request.url).hostname)
    return respond({ok:false,error:'Verification failed. Please try again.'},400);

  const idea=validation.idea, id=crypto.randomUUID(), at=new Date().toISOString();
  try {
    await env.SHIPYARD_DB.batch([
      env.SHIPYARD_DB.prepare(
        `INSERT INTO shipyard_ideas
        (id,created_at,contact_name,contact_email,organisation,problem,people,current_approach,outcome,direction,priority,consent_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(id,at,idea.contactName,idea.contactEmail,idea.organisation,idea.problem,idea.people,
        idea.currentApproach,idea.outcome,idea.direction,idea.priority,at,at),
      env.SHIPYARD_DB.prepare('INSERT INTO shipyard_reviews (idea_id) VALUES (?)').bind(id),
      env.SHIPYARD_DB.prepare(
        `INSERT INTO shipyard_audit (id,idea_id,at,actor,action) VALUES (?,?,?,?,?)`
      ).bind(crypto.randomUUID(),id,at,'enquirer','submitted')
    ]);
  } catch{return respond({ok:false,error:'We could not save your idea. Please try again.'},503);}

  // No email is sent from this endpoint (or anywhere else in this release).
  return respond({ok:true,received:true},201);
}
