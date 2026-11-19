// Guided discovery v1: plain-language structured intake, no LLM calls and no background
// prototype generation. Private reviews happen separately from public submissions.
const form=document.querySelector('#idea-form');
const steps=[...document.querySelectorAll('[data-step]')];
const byId=id=>document.getElementById(id);
const back=byId('back'),next=byId('next'),send=byId('send');
let current=0,enabled=false,turnstileId=null,turnstileToken='';
const choice=name=>form.querySelector('input[name="'+name+'"]:checked')?.value || '';
const value=id=>byId(id).value.trim();

const directionLabels={
  unsure:'Explore alternatives first',
  improve:'Improve an existing tool or process',
  small:'Try a small working prototype',
  explore:'Start small with a bigger idea'
};
const priorityLabels={
  simplicity:'Ease of use',ownership:'Ownership and independence',
  speed:'Speed to a useful result',cost:'Low ongoing costs',unsure:'Not sure yet'
};

function buildBrief() {
  return [
    'SHIPYARD — IDEA TO EXPLORE',
    '',
    'The problem',
    value('problem'),
    '',
    'Who this is for',
    value('people') || 'Not specified',
    '',
    'How things work now',
    value('currentApproach') || 'Not specified',
    '',
    'A better outcome',
    value('outcome'),
    '',
    'What matters most',
    priorityLabels[choice('priority')] || 'Not specified',
    '',
    'An initial direction',
    directionLabels[choice('direction')] || 'Not specified',
    '',
    'We may recommend a simpler process or an existing tool instead of bespoke development.'
  ].join('\n');
}

function moveTo(index) {
  current=Math.max(0,Math.min(steps.length-1,index));
  steps.forEach((step,i)=>step.hidden=i!==current);
  byId('step-label').textContent='Step '+(current+1)+' of '+steps.length;
  byId('progress').setAttribute('aria-valuenow',String(current+1));
  byId('progress-fill').style.width=((current+1)/steps.length*100)+'%';
  back.hidden=current===0;
  next.hidden=current===steps.length-1;
  send.hidden=current!==steps.length-1;
  if(current===steps.length-1) byId('summary').textContent=buildBrief();
  byId('message').textContent='';
  document.querySelector('main').scrollIntoView({block:'start',behavior:'instant'});
  const heading=steps[current].querySelector('h2');
  heading?.setAttribute('tabindex','-1');
  heading?.focus({preventScroll:true});
}

function validStep() {
  const controls=[...steps[current].querySelectorAll('textarea[required],input[required]')];
  for(const control of controls) {
    if (control.type==='radio') {
      if (!choice(control.name)) {
        control.reportValidity();
        return false;
      }
    } else if (!control.checkValidity()){
      control.reportValidity();
      return false;
    }
  }
  return true;
}

back.addEventListener('click',()=>moveTo(current-1));
next.addEventListener('click',()=>{if(validStep())moveTo(current+1)});

byId('copy').addEventListener('click',async()=>{
  try{
    await navigator.clipboard.writeText(buildBrief());
    byId('message').textContent='Your brief has been copied.';
  }catch{
    byId('message').textContent='Copying was blocked by your browser. You can select the brief above to copy it.';
  }
});

async function initialiseSubmission() {
  try {
    const response=await fetch('/api/shipyard/config',{headers:{accept:'application/json'}});
    if (!response.ok) throw new Error('config unavailable');
    const config=await response.json();
    enabled=config.enabled===true && typeof config.siteKey==='string' && !!config.siteKey;
    if (!enabled) throw new Error('intake not configured');

    const script=document.createElement('script');
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async=true;
    script.onload=()=>{
      if(!window.turnstile) return;
      turnstileId=window.turnstile.render('#turnstile',{
        sitekey:config.siteKey,
        callback:token=>{turnstileToken=token;},
        'expired-callback':()=>{turnstileToken='';},
        'error-callback':()=>{turnstileToken='';}
      });
      byId('captcha-wrap').hidden=false;
      send.disabled=false;
    };
    script.onerror=()=>{enabled=false;byId('offline-note').hidden=false;send.disabled=true;};
    document.head.append(script);
  } catch {
    enabled=false;
    byId('offline-note').hidden=false;
    send.disabled=true;
  }
}

form.addEventListener('submit',async event=>{
  event.preventDefault();
  if (current!==steps.length-1 || !enabled || send.disabled) return;
  if (!validStep()) return;
  if (!turnstileToken) {
    byId('message').textContent='Please complete the anti-spam check first.';
    return;
  }
  const submission={
    problem:value('problem'),
    people:value('people'),
    currentApproach:value('currentApproach'),
    outcome:value('outcome'),
    direction:choice('direction'),
    priority:choice('priority'),
    contactName:value('contactName'),
    contactEmail:value('contactEmail'),
    organisation:value('organisation'),
    consent:byId('consent').checked,
    companyWebsite:'', // Honeypot reserved for future automated clients.
    turnstileToken
  };
  send.disabled=true;send.textContent='Submitting…';
  try{
    const response=await fetch('/api/shipyard/ideas',{
      method:'POST',
      headers:{'content-type':'application/json',accept:'application/json'},
      body:JSON.stringify(submission)
    });
    const data=await response.json();
    if(!response.ok || data.ok!==true) throw new Error(data.error || 'Something went wrong');
    form.hidden=true;
    byId('finish').hidden=false;
    byId('finish').focus();
  }catch(error){
    byId('message').textContent=error.message || 'We could not send your idea.';
    turnstileToken='';
    if(turnstileId!==null && window.turnstile) window.turnstile.reset(turnstileId);
  }finally{
    send.disabled=!enabled;
    send.textContent='Send for human review';
  }
});
initialiseSubmission();
moveTo(0);
