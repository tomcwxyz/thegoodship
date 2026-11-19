import {respond} from '../../../_lib/shipyard.mjs';
import {chatAvailable,CHAT_LIMIT} from '../../../_lib/shipyard-chat.mjs';
export async function onRequestGet({env}){
  return respond({enabled:chatAvailable(env),siteKey:chatAvailable(env) ? String(env.SHIPYARD_TURNSTILE_SITE_KEY) : null,maxTurns:CHAT_LIMIT});
}
