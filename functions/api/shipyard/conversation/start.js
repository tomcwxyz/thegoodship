import {respond} from '../../../_lib/shipyard.mjs';
import {chatAvailable,disabled,secureWrite,readChatJson,verifyTurnstile,randomToken,digestToken,CHAT_LIMIT,CHAT_DURATION_SECONDS} from '../../../_lib/shipyard-chat.mjs';

export async function onRequestPost({request,env}){
  if(!chatAvailable(env))return disabled();
  if(!secureWrite(request))return respond({ok:false,error:'Invalid request origin'},403);
  let body;
  try{body=await readChatJson(request,3000);}catch{return respond({ok:false,error:'Invalid request'},400);}
  let verified=false;
  try{verified=await verifyTurnstile(request,env,body.turnstileToken);}catch{return respond({ok:false,error:'Could not verify this session'},503);}
  if(!verified)return respond({ok:false,error:'Please complete the anti-spam check'},400);
  const token=randomToken(),hash=await digestToken(token);
  const now=Math.floor(Date.now()/1000);
  try {
    // Prune expired anonymous tickets opportunistically. No conversation text is saved.
    await env.SHIPYARD_DB.prepare('DELETE FROM shipyard_chat_tickets WHERE expires_epoch<?').bind(now).run();
    await env.SHIPYARD_DB.prepare(
      `INSERT INTO shipyard_chat_tickets (token_hash,issued_epoch,expires_epoch,turns_used,last_call_epoch)
       VALUES (?,?,?,?,?)`
    ).bind(hash,now,now+CHAT_DURATION_SECONDS,0,0).run();
  }catch{return respond({ok:false,error:'Conversational discovery is temporarily unavailable'},503);}
  return respond({ok:true,sessionToken:token,maxTurns:CHAT_LIMIT,expiresInSeconds:CHAT_DURATION_SECONDS});
}
