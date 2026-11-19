import {respond,authorisedAdmin,sameOriginJson,readSmallJSON,safePreviewUrl,publicReviewState,IDEA_STATES} from '../../../_lib/shipyard.mjs';

function moneyToPence(value) {
  if (value === '' || value == null) return null;
  const text=String(value).trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(text)) throw new Error('Enter a valid GBP amount');
  const [pounds, pennies='']=text.split('.');
  const pence=Number(pounds)*100 + Number(pennies.padEnd(2,'0'));
  if (!Number.isSafeInteger(pence) || pence <= 0) throw new Error('Amount must be positive');
  return pence;
}

export async function onRequestPost({request,env}) {
  const admin=await authorisedAdmin(request,env);
  if (!admin) return respond({ok:false,error:'Not authorised'},403);
  if (!sameOriginJson(request)) return respond({ok:false,error:'Invalid request origin'},403);
  if (!env.SHIPYARD_DB) return respond({ok:false,error:'Shipyard storage is not configured'},503);
  let input;
  try{input=await readSmallJSON(request,5000);}catch{return respond({ok:false,error:'Invalid request'},400);}
  if (typeof input.id !== 'string' || !/^[0-9a-f-]{36}$/.test(input.id))
    return respond({ok:false,error:'Invalid idea'},400);
  if (!Number.isSafeInteger(input.version) || input.version < 0)
    return respond({ok:false,error:'Missing review version'},400);

  const action=input.action;
  const db=env.SHIPYARD_DB;
  const row=await db.prepare(
    'SELECT i.state, r.* FROM shipyard_ideas i JOIN shipyard_reviews r ON i.id=r.idea_id WHERE i.id=?'
  ).bind(input.id).first();
  if (!row) return respond({ok:false,error:'Idea not found'},404);
  if (row.review_version !== input.version) return respond({ok:false,error:'Someone has already changed this review. Reload before continuing.'},409);
  const at=new Date().toISOString();
  let statement, details={};
  try {
    switch(action){
      case 'save': {
        const proto=typeof input.prototypeUrl === 'string' ? input.prototypeUrl.trim() : '';
        const url=safePreviewUrl(proto);
        if (proto && !url) throw new Error('Enter a valid HTTPS prototype URL');
        const prototypeNotes=String(input.prototypeNotes || '').trim().slice(0,3000);
        const quoteNotes=String(input.quoteNotes || '').trim().slice(0,3000);
        const privateNotes=String(input.privateNotes || '').trim().slice(0,3000);
        const shipIt=moneyToPence(input.shipIt);
        const learnShip=moneyToPence(input.learnShip);
        statement=db.prepare(
          `UPDATE shipyard_reviews
            SET prototype_url=?, prototype_notes=?, ship_it_pence=?, learn_ship_pence=?,
                quote_notes=?, private_notes=?, review_version=review_version+1,
                prototype_approved_version=NULL,quote_approved_version=NULL,
                prototype_approved_by=NULL,quote_approved_by=NULL,reviewed_at=?
            WHERE idea_id=? AND review_version=?`
        ).bind(url,prototypeNotes,shipIt,learnShip,quoteNotes,privateNotes,at,input.id,input.version);
        details={invalidateApprovals:true};
        break;
      }
      case 'approve_prototype': {
        if (input.confirmed !== true) throw new Error('Explicit inspection confirmation is required');
        if (!row.prototype_url) throw new Error('Add and save a prototype URL first');
        statement=db.prepare(
          'UPDATE shipyard_reviews SET prototype_approved_version=?, prototype_approved_by=?,reviewed_at=? WHERE idea_id=? AND review_version=?'
        ).bind(input.version,admin,at,input.id,input.version);
        break;
      }
      case 'approve_quote': {
        if (input.confirmed !== true) throw new Error('Explicit pricing confirmation is required');
        if (!publicReviewState({...row,quote_approved_version:input.version}).quoteApproved)
          throw new Error('Add a cost and pricing assumptions before approving');
        statement=db.prepare(
          'UPDATE shipyard_reviews SET quote_approved_version=?, quote_approved_by=?,reviewed_at=? WHERE idea_id=? AND review_version=?'
        ).bind(input.version,admin,at,input.id,input.version);
        break;
      }
      case 'set_status': {
        const next=String(input.state || '');
        if (!IDEA_STATES.includes(next)) throw new Error('Unknown review state');
        if (next==='internally_approved' && (!publicReviewState(row).prototypeApproved || !publicReviewState(row).quoteApproved))
          throw new Error('Approve both prototype and quote before marking ready');
        if (next === 'internally_approved') {
          // Recheck approvals in SQL in the same batch as the state transition.
          statement=db.prepare(`
            UPDATE shipyard_ideas SET state=?,updated_at=? WHERE id=?
             AND EXISTS (
               SELECT 1 FROM shipyard_reviews r
                WHERE r.idea_id=shipyard_ideas.id AND r.review_version=?
                  AND r.prototype_approved_version=? AND r.quote_approved_version=?
                  AND r.prototype_url<>'' AND r.quote_notes<>''
                  AND (r.ship_it_pence>0 OR r.learn_ship_pence>0)
             )`
          ).bind(next,at,input.id,input.version,input.version,input.version);
        } else {
          statement=db.prepare(`
            UPDATE shipyard_ideas SET state=?,updated_at=? WHERE id=?
             AND EXISTS (SELECT 1 FROM shipyard_reviews r WHERE r.idea_id=shipyard_ideas.id AND r.review_version=?)`
          ).bind(next,at,input.id,input.version);
        }
        details={state:next};
        break;
      }
      default: throw new Error('Unknown action');
    }
  } catch(e){return respond({ok:false,error:e.message || 'Invalid review'},400);}

  try {
    const statements=[statement];
    if (action==='save') {
      // Apply invalidation atomically with the draft update.
      statements.push(db.prepare(`UPDATE shipyard_ideas SET state='reviewing',updated_at=?
        WHERE id=? AND state='internally_approved'`).bind(at,input.id));
    }
    statements.push(db.prepare(
      'INSERT INTO shipyard_audit (id,idea_id,at,actor,action,details) VALUES (?,?,?,?,?,?)'
    ).bind(crypto.randomUUID(),input.id,at,admin,action,JSON.stringify(details)));
    const changed=await db.batch(statements);
    if (changed[0]?.meta?.changes !== 1)
      return respond({ok:false,error:'Review was changed concurrently. Reload the queue.'},409);
    return respond({ok:true,deliveryEnabled:false});
  } catch {return respond({ok:false,error:'Could not save the review'},503);}
}
