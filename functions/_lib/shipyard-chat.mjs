// Shared infrastructure for bounded, stateless-in-content Shipyard conversations.
// Anonymous session tokens and usage counters live in a dedicated D1 table.
// Conversation text is NOT stored here; the client sends limited recent context.
import {sameOriginJson,readSmallJSON,respond} from './shipyard.mjs';

export const CHAT_LIMIT=14;
export const CHAT_DURATION_SECONDS=60*45;

export function chatAvailable(env){
  return env.SHIPYARD_CONVERSATION_ENABLED==='true' &&
    Boolean(env.SHIPYARD_DB && env.SHIPYARD_TURNSTILE_SITE_KEY &&
      env.SHIPYARD_TURNSTILE_SECRET && env.SHIPYARD_CHAT_API_KEY);
}
export function disabled(){
  return respond({ok:false,error:'Conversational discovery is in preview mode. You can still explore and copy a brief.'},503);
}
export function secureWrite(request){return sameOriginJson(request);}
export async function digestToken(value){
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash)).map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
export function randomToken(){
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  // URL-safe 256-bit token, never placed in a URL.
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export async function verifyTurnstile(request,env,token,remoteFetch=fetch){
  if(typeof token!=='string'||token.length<15||token.length>2048)return false;
  const params=new FormData();
  params.set('secret',String(env.SHIPYARD_TURNSTILE_SECRET));
  params.set('response',token);
  const ip=request.headers.get('cf-connecting-ip');
  if(ip)params.set('remoteip',ip);
  const result=await remoteFetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
    method:'POST',body:params,signal:AbortSignal.timeout(5000)
  });
  if(!result.ok)return false;
  const data=await result.json();
  return data.success===true && data.hostname===new URL(request.url).hostname;
}

const FIELD_NAMES=['problem','people','currentApproach','outcome','constraints'];
export function cleanHistory(value){
  if(!Array.isArray(value)||value.length<1||value.length>20)return null;
  const messages=[];
  let total=0;
  for(const message of value){
    if(!message||!['user','assistant'].includes(message.role)||
      typeof message.content!=='string'||message.content.trim().length<1||
      message.content.length>1500)return null;
    total+=message.content.length;
    messages.push({role:message.role,content:message.content.trim()});
  }
  if(total>13000 || messages.at(-1).role!=='user')return null;
  return messages;
}
export function cleanNotes(notes){
  const result={};
  if(!notes||typeof notes!=='object'||Array.isArray(notes))return result;
  for(const field of FIELD_NAMES){
    const value=notes[field]?.value;
    if(typeof value==='string' && value.trim().length<=900)
      result[field]=value.trim();
  }
  return result;
}
export function safeModelAnswer(output,userMessage){
  if(!output || typeof output!=='object' || typeof output.reply!=='string')
    throw new Error('Invalid model response');
  const reply=output.reply.trim().slice(0,900);
  if(reply.length<10)throw new Error('Empty model response');
  const patch={};
  for(const field of FIELD_NAMES){
    const entry=output.patch?.[field];
    if(!entry||typeof entry.value!=='string'||typeof entry.quote!=='string')continue;
    const value=entry.value.trim().slice(0,900);
    const quote=entry.quote.trim().slice(0,200);
    // The quotation must match words that the enquirer actually said in this turn.
    if(!value||quote.length<3||!userMessage.toLowerCase().includes(quote.toLowerCase()))continue;
    patch[field]={value,quote};
  }
  return {
    reply,patch,
    focus:FIELD_NAMES.includes(output.focus) ? output.focus : 'exploring',
    ready:output.ready===true,
    model:true
  };
}
export async function readChatJson(request,max=22000){return readSmallJSON(request,max);}
