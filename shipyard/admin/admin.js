import {createDemoApi} from './demo.js';
const demoMode=new URLSearchParams(window.location.search).get('demo')==='1';
const apiFetch=demoMode ? createDemoApi() : fetch;
// Private Shipyard review UI. Never sends mail or publishes anything.
const get=id=>document.getElementById(id);
const fields=['prototypeUrl','prototypeNotes','shipIt','learnShip','quoteNotes','privateNotes'];
let ideas=[],selected=null,busy=false;
const formatMoney=pence=>pence==null ? '' : (pence/100).toFixed(2);
const text=(id,value)=>{get(id).textContent=value || '—';};
const statusLabel={new:'New',reviewing:'Reviewing',needs_detail:'Needs more information',declined:'Not proceeding',internally_approved:'Approved internally'};

function toSavedForm(idea) {
  return {
    prototypeUrl:idea.prototype_url || '',
    prototypeNotes:idea.prototype_notes || '',
    shipIt:formatMoney(idea.ship_it_pence),
    learnShip:formatMoney(idea.learn_ship_pence),
    quoteNotes:idea.quote_notes || '',
    privateNotes:idea.private_notes || ''
  };
}
function currentForm() {return Object.fromEntries(fields.map(key=>[key,get(key).value.trim()]));}
function isDirty() {
  if(!selected)return false;
  const saved=toSavedForm(selected),current=currentForm();
  return fields.some(key=>current[key]!==saved[key]);
}
function approvalControls() {
  if(!selected) return;
  const dirty=isDirty();
  const approvals=selected.approvals || {};
  text('prototype-check', 'Prototype: '+(approvals.prototypeApproved ? 'approved for this version' : 'not approved'));
  text('quote-check', 'Quote: '+(approvals.quoteApproved ? 'approved for this version' : 'not approved'));
  get('approve-prototype').disabled=busy || dirty || !selected.prototype_url || approvals.prototypeApproved;
  get('approve-quote').disabled=busy || dirty || (!selected.ship_it_pence && !selected.learn_ship_pence) || !selected.quote_notes || approvals.quoteApproved;
  get('internal-ready').disabled=busy || dirty || !approvals.prototypeApproved || !approvals.quoteApproved || selected.state==='internally_approved';
  get('save-review').disabled=busy;
  get('save-state').disabled=busy;
  if(dirty) {
    text('prototype-check','Prototype: save changes before approval. Previous approvals will be cleared.');
    text('quote-check','Quote: save changes before approval. Previous approvals will be cleared.');
  }
}
function renderList() {
  const list=get('list-items');
  list.replaceChildren();
  text('count','('+ideas.length+')');
  if(!ideas.length) {const p=document.createElement('p');p.textContent='No enquiries yet.';list.append(p);return;}
  for(const idea of ideas) {
    const button=document.createElement('button');
    button.type='button';button.className='idea-button'+(selected?.id===idea.id ? ' active' : '');
    const title=document.createElement('strong');title.textContent=(idea.problem || '').slice(0,85);
    const meta=document.createElement('small');
    meta.textContent=(statusLabel[idea.state] || idea.state)+' · '+new Date(idea.created_at).toLocaleDateString('en-GB');
    button.append(title,meta);
    button.addEventListener('click',()=>select(idea.id));
    list.append(button);
  }
}
function select(id) {
  selected=ideas.find(idea=>idea.id===id) || null;
  get('detail').hidden=!selected;
  if(!selected) return;
  text('detail-title',selected.contact_name || selected.organisation || 'An idea to explore');
  text('idea-status',statusLabel[selected.state] || selected.state);
  text('idea-date','Received '+new Date(selected.created_at).toLocaleString('en-GB'));
  text('idea-problem',selected.problem);
  text('idea-people',selected.people);
  text('idea-current',selected.current_approach);
  text('idea-outcome',selected.outcome);
  text('idea-direction',selected.direction);
  text('idea-priority',selected.priority);
  text('idea-contact',[selected.contact_name,selected.contact_email].filter(Boolean).join(' · '));
  text('idea-organisation',selected.organisation);
  get('state').value=selected.state;
  const preview=get('open-preview');
  preview.hidden=!selected.prototype_url;
  if(selected.prototype_url)preview.href=selected.prototype_url;
  else preview.removeAttribute('href');
  const saved=toSavedForm(selected);
  for(const key of fields)get(key).value=saved[key];
  text('review-message','');
  renderList();
  approvalControls();
}
async function load(keepId) {
  busy=true;
  const response=await apiFetch('/api/shipyard/admin/ideas',{headers:{accept:'application/json'}});
  const data=await response.json();
  if(!response.ok || !data.ok) throw new Error(data.error || 'Unable to load reviews');
  ideas=data.ideas || [];
  busy=false;
  get('workspace').hidden=false;
  get('notice').textContent=demoMode ? 'SIMULATION: all three enquiries and all approvals are fictional. Changes are never saved or sent.' : 'Signed in as '+data.admin+'. This is an internal queue — no deliveries are enabled.';
  select(keepId || ideas[0]?.id);
  renderList();
}
async function action(name,extra={}) {
  if(!selected || busy)return;
  if(name!=='save' && isDirty()) {text('review-message','Save your changes first.');return;}
  const id=selected.id;
  busy=true;approvalControls();
  text('review-message','Saving…');
  try{
    const response=await apiFetch('/api/shipyard/admin/review',{
      method:'POST',
      headers:{'content-type':'application/json',accept:'application/json'},
      body:JSON.stringify({action:name,id,version:selected.review_version,...extra})
    });
    const data=await response.json();
    if(!response.ok || !data.ok)throw new Error(data.error || 'Could not save changes');
    await load(id);
    text('review-message', name==='save' ? 'Draft saved. Both approvals are reset for this version.' : 'Review updated. Nothing has been sent.');
  }catch(error){
    busy=false;approvalControls();
    text('review-message',error.message || 'Could not save.');
  }
}
get('reload').addEventListener('click',()=>load(selected?.id).catch(error=>text('notice',error.message)));
for(const key of fields) get(key).addEventListener('input',approvalControls);
get('save-review').addEventListener('click',()=>action('save',currentForm()));
get('save-state').addEventListener('click',()=>action('set_status',{state:get('state').value}));
get('approve-prototype').addEventListener('click',()=>{
  if(window.confirm('Have you opened and tested this exact saved prototype and reviewed its security, limitations and sample data? This will only record your approval; nothing will be sent.'))
    action('approve_prototype',{confirmed:true});
});
get('approve-quote').addEventListener('click',()=>{
  if(window.confirm('Have you checked the exact saved estimate, scope, VAT position, hosting and support assumptions? This will only record your approval; nothing will be sent.'))
    action('approve_quote',{confirmed:true});
});
get('internal-ready').addEventListener('click',()=>{
  if(window.confirm('Record this as internally approved? Nothing will be emailed or published.'))
    action('set_status',{state:'internally_approved'});
});
load().catch(error=>{
  get('workspace').hidden=true;
  text('notice',error.message + '. The admin queue needs Cloudflare Access identity and a separate Shipyard database configured.');
});
