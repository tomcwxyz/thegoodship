// In-browser demonstration of the *review* process. No network, persistence or real
// enquiries. Used by /shipyard/admin/?demo=1 on static pull-request previews.
// This module is NOT an alternative admin authentication mechanism.
const examples = [
  {
    id:'11111111-1111-4111-8111-111111111111',
    created_at:'2026-11-19T09:15:00.000Z',
    contact_name:'Alex Example',contact_email:'alex@example.test',
    organisation:'A fictional neighbourhood charity',
    problem:'We coordinate around 35 volunteers in a collection of spreadsheets. It is difficult to see which shifts still need people, especially when plans change.',
    people:'Volunteers and two coordinators',
    current_approach:'Shared spreadsheets and email updates',
    outcome:'Anyone planning shifts can see what is covered and what still needs help.',
    direction:'small', priority:'simplicity',state:'new',
    needs_clarification:0,
    conversation_json:JSON.stringify([
      {role:'assistant',content:'What have you been thinking about making, changing or fixing?'},
      {role:'user',content:'We have about 35 volunteers but our shift spreadsheet is a nightmare whenever somebody changes plans.'},
      {role:'assistant',content:'It sounds like shifts get difficult when plans change. Who needs to see what is covered?'},
      {role:'user',content:'Two coordinators and the volunteers who sign up for shifts.'},
      {role:'assistant',content:'What would a good result look like for the coordinators?'},
      {role:'user',content:'They would see immediately which shifts need covering and who can help.'}
    ]),
    emerging_notes_json:JSON.stringify({
      problem:'Shift changes are difficult to coordinate with spreadsheets',
      people:'Volunteers and two coordinators',
      outcome:'See which shifts still need cover'
    }),
    review_version:0,prototype_url:'',prototype_notes:'',
    ship_it_pence:null,learn_ship_pence:null,quote_notes:'',
    private_notes:'',prototype_approved_version:null,quote_approved_version:null
  },
  {
    id:'22222222-2222-4222-8222-222222222222',
    created_at:'2026-11-18T10:20:00.000Z',
    contact_name:'Robin Example',contact_email:'robin@example.test',
    organisation:'A fictional social enterprise',
    problem:'Our quarterly reporting takes days to assemble from separate project and finance records. Different funders ask for different formats.',
    people:'Programme lead and finance colleague',
    current_approach:'Spreadsheet exports and manually edited documents',
    outcome:'A reliable overview of evidence and report deadlines with a straightforward export.',
    direction:'unsure',priority:'ownership',state:'reviewing',
    review_version:1,prototype_url:'',prototype_notes:'',
    ship_it_pence:null,learn_ship_pence:null,quote_notes:'',
    private_notes:'An existing reporting system may be more appropriate.',
    prototype_approved_version:null,quote_approved_version:null
  },
  {
    id:'33333333-3333-4333-8333-333333333333',
    created_at:'2026-11-17T15:45:00.000Z',
    contact_name:'Sam Example',contact_email:'sam@example.test',
    organisation:'A fictional community hub',
    problem:'We want to help local groups learn about what is happening in their area without asking them to use several complicated platforms.',
    people:'Local groups, hub staff and residents',
    current_approach:'Several public directories and informal lists',
    outcome:'A simple searchable list of local opportunities that people can maintain.',
    direction:'improve',priority:'cost',state:'needs_detail',
    review_version:0,prototype_url:'',prototype_notes:'',
    ship_it_pence:null,learn_ship_pence:null,quote_notes:'',
    private_notes:'Ask whether an existing directory can be reused.',
    prototype_approved_version:null,quote_approved_version:null
  }
];

function withApprovals(idea) {
  const approved=(field)=>idea[field]===idea.review_version;
  return {...idea,approvals:{
    prototypeApproved:!!idea.prototype_url && approved('prototype_approved_version'),
    quoteApproved:!!idea.quote_notes &&
      (Number.isInteger(idea.ship_it_pence) && idea.ship_it_pence > 0 ||
       Number.isInteger(idea.learn_ship_pence) && idea.learn_ship_pence > 0) &&
      approved('quote_approved_version'),
    deliveryEnabled:false
  }};
}
const json=(obj,status=200)=>new Response(JSON.stringify(obj),{
  status,headers:{'content-type':'application/json'}
});
const money=value=>{
  if(!value)return null;
  if(!/^\d{1,7}(\.\d{1,2})?$/.test(String(value)))throw new Error('Enter a valid amount');
  const [pence,decimals='']=String(value).split('.');
  return Number(pence)*100 + Number(decimals.padEnd(2,'0'));
};

export function createDemoApi() {
  const ideas=structuredClone(examples);
  return async function demoApi(path,options={}) {
    if(path==='/api/shipyard/admin/ideas' && !options.method)
      return json({ok:true,admin:'DEMO ONLY (no real account)',ideas:ideas.map(withApprovals)});
    if(path!=='/api/shipyard/admin/review' || options.method!=='POST')
      return json({ok:false,error:'Demo supports review only — no sending or publishing'},404);
    let payload;
    try{payload=JSON.parse(options.body)}catch{return json({ok:false,error:'Invalid data'},400);}
    const idea=ideas.find(row=>row.id===payload.id);
    if(!idea)return json({ok:false,error:'Example not found'},404);
    if(payload.version!==idea.review_version)return json({ok:false,error:'Reload the current example before editing'},409);
    switch(payload.action){
      case 'save':
        try{
          const url=String(payload.prototypeUrl||'').trim();
          if(url && !/^https:\/\//.test(url))throw new Error('Use an HTTPS preview URL');
          idea.prototype_url=url;
          idea.prototype_notes=String(payload.prototypeNotes||'').slice(0,3000);
          idea.ship_it_pence=money(payload.shipIt);
          idea.learn_ship_pence=money(payload.learnShip);
          idea.quote_notes=String(payload.quoteNotes||'').slice(0,3000);
          idea.private_notes=String(payload.privateNotes||'').slice(0,3000);
        }catch(e){return json({ok:false,error:e.message},400);}
        idea.review_version++;
        idea.prototype_approved_version=null;
        idea.quote_approved_version=null;
        if(idea.state==='internally_approved')idea.state='reviewing';
        return json({ok:true,deliveryEnabled:false});
      case 'approve_prototype':
        if(payload.confirmed!==true || !idea.prototype_url)return json({ok:false,error:'Review the prototype first'},400);
        idea.prototype_approved_version=idea.review_version;
        return json({ok:true,deliveryEnabled:false});
      case 'approve_quote':
        if(payload.confirmed!==true || !idea.quote_notes ||
          !(idea.ship_it_pence>0 || idea.learn_ship_pence>0))return json({ok:false,error:'Check price and assumptions first'},400);
        idea.quote_approved_version=idea.review_version;
        return json({ok:true,deliveryEnabled:false});
      case 'set_status':
        if(!['new','reviewing','needs_detail','declined','internally_approved'].includes(payload.state))
          return json({ok:false,error:'Invalid status'},400);
        if(payload.state==='internally_approved' &&
          (!withApprovals(idea).approvals.prototypeApproved || !withApprovals(idea).approvals.quoteApproved))
          return json({ok:false,error:'Approve the saved prototype and quote first'},400);
        idea.state=payload.state;
        return json({ok:true,deliveryEnabled:false});
      default:
        return json({ok:false,error:'Unknown action'},400);
    }
  };
}
