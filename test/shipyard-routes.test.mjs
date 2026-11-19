import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {onRequestGet as config} from '../functions/api/shipyard/config.js';
import {onRequestPost as submitIdea} from '../functions/api/shipyard/ideas.js';
import {onRequestGet as listIdeas} from '../functions/api/shipyard/admin/ideas.js';
import {onRequestPost as reviewIdea} from '../functions/api/shipyard/admin/review.js';

globalThis.crypto ??= webcrypto;

const valid = {
  problem:'Our small team spends several hours every week tracking work in multiple spreadsheets.',
  outcome:'Everyone can see their work clearly and avoid chasing updates.',
  people:'Six volunteers and two coordinators',
  currentApproach:'Email and spreadsheets',
  direction:'small',
  priority:'simplicity',
  contactName:'Pilot Tester',
  contactEmail:'pilot@example.org',
  organisation:'Fictional Community Project',
  consent:true,
  turnstileToken:'turnstile-test-token'
};
const url='https://good-ship.co.uk/api/shipyard/ideas';
const uuid='123e4567-e89b-12d3-a456-426614174000';

function request(path, body, origin='https://good-ship.co.uk', jwt=null) {
  const headers={'origin':origin,'content-type':'application/json','accept':'application/json'};
  if(jwt) headers['cf-access-jwt-assertion']=jwt;
  return new Request('https://good-ship.co.uk'+path,{
    method:'POST',headers,body:JSON.stringify(body)
  });
}

class FakeD1 {
  constructor(row=null) {
    this.row=row;
    this.queries=[];
    this.batches=[];
    this.results=[];
    this.changeCount=1;
  }
  prepare(sql){
    const self=this;
    return {
      sql,values:[],
      bind(...values){this.values=values;return this;},
      async first(){self.queries.push({sql:this.sql,values:this.values});return self.row;},
      async all(){self.queries.push({sql:this.sql,values:this.values});return {results:self.results};},
      async run(){self.queries.push({sql:this.sql,values:this.values});return {meta:{changes:self.changeCount}}}
    };
  }
  async batch(statements){
    this.batches.push(statements.map(s=>({sql:s.sql,values:s.values})));
    return statements.map(()=>({meta:{changes:this.changeCount}}));
  }
}

async function withFakeFetch(fake, run) {
  const previous=globalThis.fetch;
  globalThis.fetch=fake;
  try{return await run();}
  finally{globalThis.fetch=previous;}
}

test('public intake stays closed without all three infrastructure settings',async()=>{
  const r=await config({env:{SHIPYARD_DB:{},SHIPYARD_TURNSTILE_SITE_KEY:'site',SHIPYARD_TURNSTILE_SECRET:'secret'}});
  assert.equal((await r.json()).enabled,false);
  const result=await submitIdea({request:request('/api/shipyard/ideas',valid),env:{}});
  assert.equal(result.status,503);
});

test('public intake rejects cross-origin and missing consent',async()=>{
  const db=new FakeD1();
  const env={SHIPYARD_DB:db,SHIPYARD_TURNSTILE_SITE_KEY:'site',SHIPYARD_TURNSTILE_SECRET:'secret',SHIPYARD_INTAKE_ENABLED:'true'};
  const cross=await submitIdea({request:request('/api/shipyard/ideas',valid,'https://attacker.example'),env});
  const consent=await submitIdea({request:request('/api/shipyard/ideas',{...valid,consent:false}),env});
  assert.equal(cross.status,403);
  assert.equal(consent.status,400);
  assert.equal(db.batches.length,0);
});

test('invalid Turnstile verification never writes an enquiry',async()=>{
  const db=new FakeD1(),env={SHIPYARD_DB:db,SHIPYARD_TURNSTILE_SITE_KEY:'site',SHIPYARD_TURNSTILE_SECRET:'secret'};
  await withFakeFetch(async()=>new Response(JSON.stringify({success:false,hostname:'good-ship.co.uk'})),async()=>{
    const result=await submitIdea({request:request('/api/shipyard/ideas',valid),env});
    assert.equal(result.status,400);
  });
  assert.equal(db.batches.length,0);
});

test('valid submission stores a private idea, review placeholder and audit, with no email',async()=>{
  const db=new FakeD1(),env={SHIPYARD_DB:db,SHIPYARD_TURNSTILE_SITE_KEY:'site',SHIPYARD_TURNSTILE_SECRET:'secret'};
  let fetchCalls=0;
  await withFakeFetch(async(endpoint,options)=>{
    fetchCalls++;
    assert.equal(endpoint,'https://challenges.cloudflare.com/turnstile/v0/siteverify');
    assert.equal(options.method,'POST');
    return new Response(JSON.stringify({success:true,hostname:'good-ship.co.uk'}),{status:200});
  },async()=>{
    const result=await submitIdea({request:request('/api/shipyard/ideas',valid),env});
    assert.equal(result.status,201);
    assert.deepEqual(await result.json(),{ok:true,received:true});
  });
  assert.equal(fetchCalls,1,'only bot verification is allowed as an outbound request');
  assert.equal(db.batches.length,1);
  const batch=db.batches[0];
  assert.equal(batch.length,3);
  assert.match(batch[0].sql,/INSERT INTO shipyard_ideas/);
  assert.match(batch[1].sql,/INSERT INTO shipyard_reviews/);
  assert.match(batch[2].sql,/INSERT INTO shipyard_audit/);
  assert.ok(!JSON.stringify(batch).includes('turnstile-test-token'),'verification token must not be stored');
});

test('storage failures do not pretend to accept a submission',async()=>{
  const db=new FakeD1();db.batch=async()=>{throw Error('private database not reachable')};
  const env={SHIPYARD_DB:db,SHIPYARD_TURNSTILE_SITE_KEY:'site',SHIPYARD_TURNSTILE_SECRET:'secret'};
  await withFakeFetch(async()=>new Response(JSON.stringify({success:true,hostname:'good-ship.co.uk'})),async()=>{
    const result=await submitIdea({request:request('/api/shipyard/ideas',valid),env});
    assert.equal(result.status,503);
    assert.doesNotMatch(JSON.stringify(await result.json()),/private database not reachable/);
  });
});

const team='https://shipyard-tests.cloudflareaccess.com';
const adminEnv={SHIPYARD_ACCESS_TEAM_DOMAIN:team,SHIPYARD_ACCESS_AUD:'shipyard-audience',SHIPYARD_ADMIN_EMAILS:'owner@example.org'};
async function signingFixture(){
  const pair=await webcrypto.subtle.generateKey({
    name:'RSASSA-PKCS1-v1_5',modulusLength:2048,
    publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'
  },true,['sign','verify']);
  const publicKey=await webcrypto.subtle.exportKey('jwk',pair.publicKey);
  publicKey.kid='test-signing-key';publicKey.alg='RS256';
  const now=Math.floor(Date.now()/1000);
  const head=Buffer.from(JSON.stringify({alg:'RS256',kid:'test-signing-key'})).toString('base64url');
  const claims=Buffer.from(JSON.stringify({
    iss:team,aud:'shipyard-audience',email:'owner@example.org',iat:now,exp:now+600
  })).toString('base64url');
  const input=head+'.'+claims;
  const signature=await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,Buffer.from(input));
  return {jwt:input+'.'+Buffer.from(signature).toString('base64url'),fetch:async endpoint=>{
    assert.equal(endpoint,team+'/cdn-cgi/access/certs');
    return new Response(JSON.stringify({keys:[publicKey]}),{status:200});
  }};
}

test('anonymous callers cannot read the private queue or change reviews',async()=>{
  const db=new FakeD1();
  const env={...adminEnv,SHIPYARD_DB:db};
  const list=await listIdeas({request:new Request('https://good-ship.co.uk/api/shipyard/admin/ideas'),env});
  const write=await reviewIdea({request:request('/api/shipyard/admin/review',{id:uuid,version:0,action:'approve_quote'}),env});
  assert.equal(list.status,403);
  assert.equal(write.status,403);
  assert.equal(db.queries.length,0);
  assert.equal(db.batches.length,0);
});

test('authenticated owner can read private queue only after signature verification',async()=>{
  const signed=await signingFixture();
  const db=new FakeD1();
  db.results=[{
    id:uuid,review_version:0,contact_email:'pilot@example.org',
    problem:valid.problem,prototype_url:'',prototype_approved_version:null,
    quote_approved_version:null
  }];
  const env={...adminEnv,SHIPYARD_DB:db};
  await withFakeFetch(signed.fetch,async()=>{
    const req=new Request('https://good-ship.co.uk/api/shipyard/admin/ideas',{
      headers:{'cf-access-jwt-assertion':signed.jwt}
    });
    const result=await listIdeas({request:req,env});
    assert.equal(result.status,200);
    const data=await result.json();
    assert.equal(data.ideas.length,1);
    assert.equal(data.ideas[0].contact_email,'pilot@example.org');
    assert.equal(data.ideas[0].approvals.deliveryEnabled,false);
    assert.equal(data.admin,'owner@example.org');
  });
});

test('review actions require explicit human confirmations, saved versions, and both approvals',async()=>{
  const signed=await signingFixture();
  const db=new FakeD1({
    review_version:2,
    prototype_url:'https://preview.example.org/',
    ship_it_pence:250000,
    learn_ship_pence:300000,
    quote_notes:'Indicative, includes assumptions and VAT position',
    prototype_approved_version:null,
    quote_approved_version:null,
    state:'reviewing'
  });
  const env={...adminEnv,SHIPYARD_DB:db};
  const post=(body)=>request('/api/shipyard/admin/review',{id:uuid,version:2,...body},'https://good-ship.co.uk',signed.jwt);
  await withFakeFetch(signed.fetch,async()=>{
    assert.equal((await reviewIdea({request:post({action:'approve_prototype'}),env})).status,400);
    assert.equal((await reviewIdea({request:post({action:'approve_quote'}),env})).status,400);
    assert.equal((await reviewIdea({request:post({action:'set_status',state:'internally_approved'}),env})).status,400);
    assert.equal((await reviewIdea({request:post({action:'approve_prototype',confirmed:true}),env})).status,200);
    assert.equal((await reviewIdea({request:post({action:'approve_quote',confirmed:true}),env})).status,200);
    const reviewBatch=db.batches.at(-1);
    assert.match(reviewBatch[0].sql,/quote_approved_version/);
  });
});

test('saving edits invalidates previous approvals and changes the version',async()=>{
  const signed=await signingFixture();
  const db=new FakeD1({
    review_version:7,prototype_url:'https://preview.example.org/',
    ship_it_pence:123000,quote_notes:'Old scope',
    prototype_approved_version:7,quote_approved_version:7,
    state:'internally_approved'
  });
  const env={...adminEnv,SHIPYARD_DB:db};
  await withFakeFetch(signed.fetch,async()=>{
    const input={id:uuid,version:7,action:'save',prototypeUrl:'https://preview.example.org/',
      prototypeNotes:'Checked manually',shipIt:'1400.00',learnShip:'2100.00',
      quoteNotes:'Revised quote and support',privateNotes:'Internal only'};
    const response=await reviewIdea({request:request('/api/shipyard/admin/review',input,'https://good-ship.co.uk',signed.jwt),env});
    assert.equal(response.status,200);
    const statements=db.batches.at(-1);
    assert.match(statements[0].sql,/prototype_approved_version=NULL,quote_approved_version=NULL/);
    assert.match(statements[0].sql,/review_version=review_version\+1/);
    assert.match(statements[1].sql,/state='reviewing'/);
    assert.match(JSON.stringify(statements),/140000/);
    assert.match(JSON.stringify(statements),/210000/);
  });
});
