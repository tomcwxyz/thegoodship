import {respond,authorisedAdmin,publicReviewState} from '../../../_lib/shipyard.mjs';

export async function onRequestGet({request,env}) {
  const admin=await authorisedAdmin(request,env);
  if (!admin) return respond({ok:false,error:'Not authorised'},403);
  if (!env.SHIPYARD_DB) return respond({ok:false,error:'Shipyard storage is not configured'},503);
  try {
    const result=await env.SHIPYARD_DB.prepare(
      `SELECT i.*, r.review_version, r.prototype_url, r.prototype_notes,
              r.ship_it_pence, r.learn_ship_pence, r.quote_notes, r.private_notes,
              r.prototype_approved_version, r.quote_approved_version,
              r.prototype_approved_by, r.quote_approved_by, r.reviewed_at
         FROM shipyard_ideas i
         INNER JOIN shipyard_reviews r ON r.idea_id=i.id
         ORDER BY i.created_at DESC LIMIT 100`
    ).all();
    const ideas=(result.results || []).map(row=>({...row,approvals:publicReviewState(row)}));
    return respond({ok:true,ideas,admin});
  } catch {return respond({ok:false,error:'Could not load the review queue'},503);}
}
