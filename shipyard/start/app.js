import {FIELDS,blankNotes,updateNotes,briefFromConversation,previewReply,submissionFields,cleanText} from './conversation.mjs';

// Conversation-first Shipyard journey. A public preview uses a clearly-labelled
// local guide. Configured production uses a server-side LLM with bounded sessions.
const el=id=>document.getElementById(id);
const state={
  history:[],notes:blankNotes(),asked:[],pending:false,chatEnabled:false,
  intakeEnabled:false,sessionToken:'',chatTurns:0,chatLimit:14,
  chatCaptchaToken:'',intakeCaptchaToken:'',chatSiteKey:'',intakeSiteKey:'',
  intakeCaptchaId:null,chatCaptchaId:null
};
const welcome='What have you been thinking about making, changing or fixing? It can be a half-formed idea or a frustration at work. Tell me a bit about it, in your own words.';
const LABELS=Object.fromEntries(FIELDS);

function message(role,content){
  const article=document.createElement('article');
  article.className='message '+(role==='user'?'visitor':'guide');
  article.setAttribute('aria-label',role==='user'?'You said':'Shipyard said');
  const label=document.createElement('div');label.className='who';
  label.textContent=role==='user'?'You':'Shipyard';
  const bubble=document.createElement('div');bubble.className='bubble';
  bubble.textContent=content;
  article.append(label,bubble);
  el('messages').append(article);
  el('messages').scrollTop=el('messages').scrollHeight;
  state.history.push({role:role==='user'?'user':'assistant',content:cleanText(content,1500)});
}

function renderNotes(){
  const list=el('notes-list');
  list.replaceChildren();
  for(const [key,label] of FIELDS){
    const saved=state.notes[key]||{value:'',source:'',kind:'unknown'};
    const section=document.createElement('section');section.className='note';
    const heading=document.createElement('div');heading.className='note-head';
    const strong=document.createElement('strong');strong.textContent=label;
    const edit=document.createElement('button');edit.type='button';edit.textContent=saved.value?'Correct':'Add';
    edit.setAttribute('aria-label',(saved.value?'Correct ':'Add ')+label.toLowerCase());
    heading.append(strong,edit);
    const value=document.createElement('div');value.className='note-value'+(!saved.value?' empty':'');
    value.textContent=saved.value||'Still exploring';
    const editor=document.createElement('div');editor.className='edit-box';
    const text=document.createElement('textarea');
    text.maxLength=900;text.value=saved.value; text.setAttribute('aria-label','Edit '+label.toLowerCase());
    const save=document.createElement('button');save.type='button';save.className='btn';save.textContent='Save note';
    const cancel=document.createElement('button');cancel.type='button';cancel.className='btn btn-secondary';cancel.textContent='Cancel';
    editor.append(text,save,cancel);
    edit.addEventListener('click',()=>{editor.classList.add('open');text.focus();});
    cancel.addEventListener('click',()=>editor.classList.remove('open'));
    save.addEventListener('click',()=>{
      state.notes[key]={value:text.value.trim(),kind:'corrected',source:'Edited by you'};
      renderNotes();
    });
    section.append(heading,value,editor);
    list.append(section);
  }
  const hasWords=state.history.some(m=>m.role==='user');
  el('review').disabled=!hasWords;
  el('copy').disabled=!hasWords;
}

function sayStatus(content){el('status').textContent=content;}
function previewLabel(){
  el('mode').textContent='Guided preview · not live AI';
  el('mode-note').textContent='This preview uses a simple, gap-aware guide, not a live language model. You can try the conversation and copy your brief. We’re developing the more natural AI-assisted version.';
  el('mode-note').hidden=false;
}

function showReview(){
  if(!state.history.some(m=>m.role==='user'))return;
  el('workspace').hidden=true;
  el('review-screen').hidden=false;
  el('brief').textContent=briefFromConversation(state.notes,state.history);
  el('review-title').focus?.();
  window.scrollTo({top:0,behavior:'instant'});
}

async function copyBrief(){
  const value=briefFromConversation(state.notes,state.history);
  try{
    await navigator.clipboard.writeText(value);
    sayStatus('Your idea brief has been copied.');
    el('submit-status').textContent='Your idea brief has been copied.';
  }catch{
    sayStatus('Copying was blocked. Open Review my idea and select the brief to copy it.');
    el('submit-status').textContent='Select the brief above to copy it.';
  }
}

function newTurnstile(siteKey,target,callback){
  if(!siteKey)return Promise.reject(new Error('Verification is not configured'));
  return new Promise((resolve,reject)=>{
    const render=()=>{
      if(!window.turnstile)return reject(new Error('Verification did not load'));
      try{resolve(window.turnstile.render(target,{
        sitekey:siteKey,
        callback,
        'expired-callback':()=>callback(''),
        'error-callback':()=>callback('')
      }));}catch(e){reject(e)}
    };
    if(window.turnstile){render();return;}
    let existing=document.querySelector('script[data-shipyard-turnstile]');
    if(!existing){
      existing=document.createElement('script');
      existing.setAttribute('data-shipyard-turnstile','1');
      existing.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      existing.async=true;
      document.head.append(existing);
    }
    existing.addEventListener('load',render,{once:true});
    existing.addEventListener('error',()=>reject(new Error('Verification unavailable')),{once:true});
  });
}

async function initialise(){
  message('assistant',welcome);
  renderNotes();
  el('mode').textContent='Loading…';
  let configIssue='';
  try{
    const response=await fetch('/api/shipyard/conversation/config',{headers:{accept:'application/json'}});
    const contentType=response.headers.get('content-type')||'';
    if(!response.ok||!contentType.includes('application/json')){
      configIssue='The AI endpoint is not available at this preview URL.';
    }else{
      const data=await response.json();
      state.chatEnabled=data.enabled===true;
      state.chatSiteKey=data.siteKey||'';
      state.chatLimit=Math.min(14,Number(data.maxTurns)||14);
      if(!state.chatEnabled)configIssue='The AI endpoint is deployed, but this environment has not enabled the conversation service.';
    }
  }catch{configIssue='The AI endpoint could not be reached from this deployment.';}
  if(state.chatEnabled){
    el('mode').textContent='AI-assisted conversation';
    el('mode-note').textContent='Messages are sent to our AI provider to guide this conversation. Please avoid personal, confidential or sensitive data. Nothing is stored as an enquiry unless you choose to submit it for review.';
    el('mode-note').hidden=false;
    el('verification').hidden=false;
    try{
      state.chatCaptchaId=await newTurnstile(state.chatSiteKey,'#chat-turnstile',token=>{
        state.chatCaptchaToken=token;
      });
    }catch{sayStatus('Verification is unavailable; please use the copyable guided preview.');state.chatEnabled=false;el('verification').hidden=true;previewLabel();}
  }else {
    previewLabel();
    if(location.hostname.endsWith('.netlify.app')){
      el('mode-note').textContent='This is a static Netlify preview. It cannot run Shipyard’s Cloudflare Pages Functions or read its settings. Open a Cloudflare Pages preview ending in .pages.dev to test live AI.';
    }else if(configIssue && location.hostname.endsWith('.pages.dev')){
      el('mode-note').textContent=configIssue+' Check the Cloudflare Pages Preview environment bindings, secrets and exact “true” flag, then redeploy the preview branch.';
    }else if(configIssue){
      el('mode-note').textContent=configIssue+' You can still try the guided demonstration and copy the brief.';
    }
  }

  try{
    const response=await fetch('/api/shipyard/config',{headers:{accept:'application/json'}});
    if(response.ok){
      const config=await response.json();
      state.intakeEnabled=config.enabled===true;
      state.intakeSiteKey=config.siteKey||'';
    }
  }catch{state.intakeEnabled=false;}
  el('intake-closed').hidden=state.intakeEnabled;
  el('review-form').hidden=!state.intakeEnabled;
}

async function startChatSession(){
  if(state.sessionToken)return;
  if(!state.chatCaptchaToken)throw new Error('Complete the verification above first.');
  const res=await fetch('/api/shipyard/conversation/start',{
    method:'POST',headers:{'content-type':'application/json',accept:'application/json'},
    body:JSON.stringify({turnstileToken:state.chatCaptchaToken})
  });
  const result=await res.json();
  if(!res.ok||!result.ok)throw new Error(result.error||'Could not start the conversation');
  state.sessionToken=result.sessionToken;
  el('verification').hidden=true;
}

async function respond(){
  if(state.chatEnabled && state.chatTurns>=state.chatLimit)
    throw new Error('This conversation has reached its limit. You can review or copy your idea now.');
  if(!state.chatEnabled){
    const latest=state.history.at(-1).content;
    const result=previewReply(latest,state.notes,state.asked);
    state.asked.push(result.focus);
    return result;
  }
  await startChatSession();
  const response=await fetch('/api/shipyard/conversation/message',{
    method:'POST',headers:{'content-type':'application/json',accept:'application/json'},
    body:JSON.stringify({
      sessionToken:state.sessionToken,
      history:state.history.slice(-20),
      notes:state.notes
    })
  });
  const result=await response.json();
  if(!response.ok || result.ok!==true)
    throw new Error(result.error||'The guide could not respond');
  state.chatTurns++;
  return result;
}

el('chat-form').addEventListener('submit',async event=>{
  event.preventDefault();
  if(state.pending)return;
  const input=el('message-input'),value=input.value.trim();
  if(!value)return;
  if(state.chatEnabled && !state.sessionToken && !state.chatCaptchaToken){
    sayStatus('Please complete the verification above before sending.');
    return;
  }
  state.pending=true;el('send').disabled=true;
  input.value='';sayStatus('Thinking about what you said…');
  message('user',value);
  el('starters').hidden=true;
  try{
    const answer=await respond();
    state.notes=updateNotes(state.notes,answer.patch);
    message('assistant',answer.reply);
    renderNotes();
    sayStatus(answer.ready?'You can review your idea whenever you like.':'');
  }catch(error){
    // Preserve the person's message and allow retry without duplicating it.
    sayStatus(error.message||'The guide is not responding. Your words are still here.');
    if(state.chatEnabled){
      const retry=document.createElement('button');
      // No automatic mode switching: never impersonate a live AI with scripted replies.
      retry.type='button';retry.className='btn btn-secondary';
      retry.textContent='Retry my last message';
      retry.addEventListener('click',async()=>{
        retry.remove();
        state.pending=true;el('send').disabled=true;sayStatus('Trying again…');
        try{const answer=await respond();state.notes=updateNotes(state.notes,answer.patch);message('assistant',answer.reply);renderNotes();sayStatus('');}
        catch(e){sayStatus(e.message||'Still unavailable. You can review your idea.');}
        finally{state.pending=false;el('send').disabled=false;}
      },{once:true});
      el('status').after(retry);
    }
  }finally{state.pending=false;el('send').disabled=false;input.focus();}
});

document.querySelectorAll('[data-starter]').forEach(button=>{
  button.addEventListener('click',()=>{
    el('message-input').value=button.getAttribute('data-starter');
    el('message-input').focus();
  });
});
el('review').addEventListener('click',showReview);
el('copy').addEventListener('click',copyBrief);
el('copy-brief').addEventListener('click',copyBrief);
el('return').addEventListener('click',()=>{
  el('review-screen').hidden=true;el('workspace').hidden=false;
  el('message-input').focus();window.scrollTo({top:0,behavior:'instant'});
});

async function ensureIntakeCaptcha(){
  if(!state.intakeEnabled || state.intakeCaptchaId!==null)return;
  try{
    state.intakeCaptchaId=await newTurnstile(state.intakeSiteKey,'#intake-captcha',token=>{
      state.intakeCaptchaToken=token;
    });
  }catch{el('submit-status').textContent='Could not load verification. Please copy your brief or book a conversation.';}
}
el('review').addEventListener('click',ensureIntakeCaptcha);

el('review-form').addEventListener('submit',async event=>{
  event.preventDefault();
  if(!state.intakeEnabled)return;
  if(!el('review-form').reportValidity())return;
  if(!state.intakeCaptchaToken){
    el('submit-status').textContent='Complete the verification check to submit your enquiry.';
    return;
  }
  const submit=el('submit-review');submit.disabled=true;
  el('submit-status').textContent='Submitting for review…';
  try{
    const fields=submissionFields(state.notes,state.history);
    const payload={...fields,contactName:el('contactName').value.trim(),
      contactEmail:el('contactEmail').value.trim(),
      organisation:el('organisation').value.trim(),
      consent:el('consent').checked,companyWebsite:'',
      turnstileToken:state.intakeCaptchaToken};
    const response=await fetch('/api/shipyard/ideas',{
      method:'POST',headers:{'content-type':'application/json',accept:'application/json'},
      body:JSON.stringify(payload)
    });
    const answer=await response.json();
    if(!response.ok||answer.ok!==true)throw new Error(answer.error||'Could not submit your idea');
    el('review-screen').hidden=true;el('finish').hidden=false;
    el('finish').focus();
  }catch(error){
    el('submit-status').textContent=error.message||'Please try again.';
    state.intakeCaptchaToken='';
    if(state.intakeCaptchaId!==null&&window.turnstile)window.turnstile.reset(state.intakeCaptchaId);
  }finally{submit.disabled=false;}
});
initialise();
