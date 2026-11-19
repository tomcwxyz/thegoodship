// Shipyard conversational discovery: pure, browser-safe state and demo helpers.
// Live AI replies come from /api/shipyard/conversation; this file never calls an AI service.
export const FIELDS = Object.freeze([
  ['problem','What needs to change'],
  ['people','Who it affects'],
  ['currentApproach','What happens now'],
  ['outcome','What better looks like'],
  ['constraints','Things to bear in mind']
]);

export function blankNotes() {
  return Object.fromEntries(FIELDS.map(([key])=>[key,{value:'',source:'',kind:'unknown'}]));
}
export function cleanText(value,max=900){
  return typeof value==='string' ? value.trim().slice(0,max) : '';
}
export function updateNotes(current,patch,source='conversation'){
  const next={...blankNotes(),...current};
  if(!patch || typeof patch!=='object')return next;
  for(const [field] of FIELDS){
    const provided=patch[field];
    if(!provided || typeof provided!=='object')continue;
    const value=cleanText(provided.value);
    if(!value)continue;
    next[field]={value,source:cleanText(provided.quote||provided.source,200)||source,kind:'emerging'};
  }
  return next;
}
export function knownCount(notes) {
  return FIELDS.filter(([key])=>Boolean(cleanText(notes?.[key]?.value))).length;
}
export function briefFromConversation(notes,history=[]){
  const lines=['SHIPYARD — IDEA TO EXPLORE','',
    'This is a working interpretation of a conversation, not a confirmed specification.',''];
  for(const [key,label] of FIELDS){
    lines.push(label,cleanText(notes?.[key]?.value)||'Still to explore','');
  }
  lines.push('Possible routes to consider',
    '• Improve the current way of working, rather than building anything new.',
    '• Explore an existing or open-source tool.',
    '• Test the smallest useful prototype before committing to a full system.','',
    'Unresolved details should be checked with the person who described the idea.',
    'No prototype or price is sent without a personal Good Ship review.');
  return lines.join('\n');
}

// Not represented as AI. This is an offline, gap-aware demonstration used when
// the live conversation endpoint has not been securely enabled.
export function previewReply(message,notes,asked=[]){
  const text=cleanText(message,1600);
  const lower=text.toLowerCase();
  const patch={};
  const missing=key=>!cleanText(notes?.[key]?.value);
  let focus='';
  if(missing('problem')){
    patch.problem={value:text,quote:text.slice(0,120)};
  } else if(asked.at(-1)==='people'){
    patch.people={value:text,quote:text.slice(0,120)};
  } else if(asked.at(-1)==='currentApproach'){
    patch.currentApproach={value:text,quote:text.slice(0,120)};
  } else if(asked.at(-1)==='outcome'){
    patch.outcome={value:text,quote:text.slice(0,120)};
  } else if(asked.at(-1)==='constraints'){
    patch.constraints={value:text,quote:text.slice(0,120)};
  } else if(/\b(actually|correction|rather than|not quite|i meant|we meant)\b/.test(lower)){
    // Corrections remain visible in transcript instead of silently overriding
    // a possibly different field in an offline demo.
  }
  const next=updateNotes(notes,patch);
  for(const [key] of FIELDS){
    if(!cleanText(next[key]?.value)){focus=key;break;}
  }
  const questions={
    people:'Who would notice the biggest difference if this worked better?',
    currentApproach:'What happens at the moment? I’m interested in the bits that take time or cause frustration.',
    outcome:'If things were working well a few months from now, what would be different?',
    constraints:'Is there anything we should be careful about — budget, existing systems, data, or your team’s time?'
  };
  let reply='';
  if(focus){
    const lead=asked.length===0
      ? 'That gives us something concrete to explore.'
      : 'That helps. I’m building up the picture as we go.';
    reply=lead+' '+questions[focus];
  } else {
    reply='We have the beginnings of a useful brief. Would it help to explore a simpler option, or would you like to review what I’ve understood? You can also correct anything that feels off.';
    focus='review';
  }
  // The preview must not claim it understands corrections or personalised nuances.
  return {reply,patch,focus,preview:true};
}

export function submissionFields(notes,history=[]){
  const problem=cleanText(notes?.problem?.value,2000);
  const outcome=cleanText(notes?.outcome?.value,1200);
  return {
    problem:problem.length>=20 ? problem : 'An early idea that needs more discussion: '+(problem||'No clear problem described yet'),
    people:cleanText(notes?.people?.value,1000),
    currentApproach:cleanText(notes?.currentApproach?.value,1200),
    outcome:outcome.length>=10 ? outcome : 'The desired outcome still needs exploring with the enquirer.',
    direction:'unsure',
    priority:'unsure',
    conversation:history.slice(-24).filter(m=>['user','assistant'].includes(m.role)).map(m=>({
      role:m.role,content:cleanText(m.content,1800)
    })),
    emergingNotes:Object.fromEntries(FIELDS.map(([key])=>[key,cleanText(notes?.[key]?.value)])),
    needsClarification:!problem || !outcome
  };
}
