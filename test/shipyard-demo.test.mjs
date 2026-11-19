import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoApi} from '../shipyard/admin/demo.js';

async function call(api, method, body) {
  const options=method==='POST' ? {method,body:JSON.stringify(body)} : {};
  const response=await api('/api/shipyard/admin/'+(method==='POST'?'review':'ideas'),options);
  return {status:response.status,...await response.json()};
}

test('admin simulator contains only fictional .test enquirers and no delivery actions',async()=>{
  const api=createDemoApi();
  const result=await call(api,'GET');
  assert.equal(result.ok,true);
  assert.equal(result.ideas.length,3);
  assert.ok(result.ideas.every(idea=>idea.contact_email.endsWith('.test')));
  assert.ok(result.ideas.every(idea=>idea.approvals.deliveryEnabled===false));
  const sending=await api('/api/shipyard/admin/send',{method:'POST',body:'{}'});
  assert.equal(sending.status,404);
});

test('admin simulator enforces versioned separate approvals, and does not send',async()=>{
  const api=createDemoApi();
  let rows=(await call(api,'GET')).ideas;
  const id=rows[0].id;
  const post=(action,more,version)=>call(api,'POST',{id,version,action,...more});
  assert.equal((await post('set_status',{state:'internally_approved'},0)).status,400);
  assert.equal((await post('approve_quote',{confirmed:true},0)).status,400);
  assert.equal((await post('save',{
    prototypeUrl:'https://preview.example.org/',
    prototypeNotes:'Fictional proof of concept',
    shipIt:'2000.00',learnShip:'2400.00',
    quoteNotes:'Indicative price, excluding VAT and hosting.',
    privateNotes:'Demo note'
  },0)).status,200);
  rows=(await call(api,'GET')).ideas;
  assert.equal(rows[0].review_version,1);
  assert.equal(rows[0].ship_it_pence,200000);
  assert.equal(rows[0].approvals.prototypeApproved,false);
  assert.equal((await post('approve_prototype',{confirmed:true},0)).status,409);
  assert.equal((await post('approve_prototype',{confirmed:true},1)).status,200);
  assert.equal((await post('set_status',{state:'internally_approved'},1)).status,400);
  assert.equal((await post('approve_quote',{confirmed:true},1)).status,200);
  assert.equal((await post('set_status',{state:'internally_approved'},1)).status,200);
  rows=(await call(api,'GET')).ideas;
  assert.equal(rows[0].state,'internally_approved');
  assert.deepEqual(rows[0].approvals,{
    prototypeApproved:true,quoteApproved:true,deliveryEnabled:false
  });
  assert.equal((await post('save',{
    prototypeUrl:'https://preview.example.org/v2',
    shipIt:'2200',learnShip:'2500',quoteNotes:'New price and scope'
  },1)).status,200);
  rows=(await call(api,'GET')).ideas;
  assert.equal(rows[0].review_version,2);
  assert.equal(rows[0].state,'reviewing');
  assert.equal(rows[0].approvals.prototypeApproved,false);
  assert.equal(rows[0].approvals.quoteApproved,false);
  assert.equal(rows[0].approvals.deliveryEnabled,false);
});

test('simulation makes no external requests or real storage changes',async()=>{
  const prior=globalThis.fetch;
  globalThis.fetch=()=>{throw new Error('Network should never be used in demo mode');};
  try{
    const first=createDemoApi();
    const a=(await call(first,'GET')).ideas;
    await call(first,'POST',{id:a[0].id,action:'set_status',state:'declined',version:0});
    assert.equal((await call(first,'GET')).ideas[0].state,'declined');
    assert.equal((await call(createDemoApi(),'GET')).ideas[0].state,'new');
  }finally{globalThis.fetch=prior;}
});
