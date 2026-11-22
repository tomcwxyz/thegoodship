import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {webcrypto} from 'node:crypto';
import {
  validateIdea, sameOriginJson, safePreviewUrl,
  authorisedAdmin, publicReviewState
} from '../functions/_lib/shipyard.mjs';

globalThis.crypto ??= webcrypto;
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const sample={
  problem:'Our organisation spends far too much time chasing updates between several spreadsheets.',
  people:'Coordinators and volunteers',currentApproach:'Spreadsheet and email',
  outcome:'We want a clearer picture of the work, with fewer missed updates.',
  direction:'small',priority:'simplicity',contactName:'Tester',
  contactEmail:'person@example.org',organisation:'A fictional charity',consent:true
};

test('validates a clear, consented idea and normalises email',()=>{
  const result=validateIdea({...sample,contactEmail:' PERSON@EXAMPLE.ORG '});
  assert.equal(result.ok,true);
  assert.equal(result.idea.contactEmail,'person@example.org');
});

test('refuses missing consent, malformed contact details and oversized fields',()=>{
  for(const changes of [
    {consent:false},{contactEmail:'a@'},{problem:'too short'},
    {problem:'p'.repeat(2001)},{direction:'invented'},
    {companyWebsite:'spam.example'}
  ]) assert.equal(validateIdea({...sample,...changes}).ok,false);
});

test('requires same-origin JSON writes',()=>{
  const make=(origin,contentType)=>new Request('https://good-ship.co.uk/api/shipyard/ideas',{
    method:'POST',headers:{origin,'content-type':contentType},body:'{}'
  });
  assert.equal(sameOriginJson(make('https://good-ship.co.uk','application/json')),true);
  assert.equal(sameOriginJson(make('https://attacker.example','application/json')),false);
  assert.equal(sameOriginJson(make('https://good-ship.co.uk','text/plain')),false);
});

test('rejects non-HTTPS, credential-bearing and local prototype URLs',()=>{
  for(const url of ['http://example.org','https://me:secret@example.org','https://localhost','https://127.0.0.1','nonsense'])
    assert.equal(safePreviewUrl(url),'');
  assert.equal(safePreviewUrl('https://preview.example.org/foo'),'https://preview.example.org/foo');
});

test('both approvals must match the unchanged version; delivery is never enabled',()=>{
  const base={
    review_version:3,prototype_url:'https://preview.example.org/',
    ship_it_pence:150000,learn_ship_pence:180000,quote_notes:'Assumptions, VAT and hosting',
    prototype_approved_version:3,quote_approved_version:3
  };
  assert.deepEqual(publicReviewState(base),{
    prototypeApproved:true,quoteApproved:true,deliveryEnabled:false
  });
  assert.equal(publicReviewState({...base,review_version:4}).prototypeApproved,false);
  assert.equal(publicReviewState({...base,review_version:4}).quoteApproved,false);
  assert.equal(publicReviewState({...base,quote_notes:''}).quoteApproved,false);
});

function enc(value) {
  return Buffer.from(typeof value==='string' ? value : JSON.stringify(value)).toString('base64url');
}
async function signedJWT(payload,privateKey) {
  const header=enc({alg:'RS256',kid:'test-key'});
  const content=header+'.'+enc(payload);
  const signature=await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5',privateKey,Buffer.from(content));
  return content+'.'+Buffer.from(signature).toString('base64url');
}

test('admin JWT requires valid signature, fixed issuer, audience and allowlisted identity',async()=>{
  const keys=await webcrypto.subtle.generateKey(
    {name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']
  );
  const key=await webcrypto.subtle.exportKey('jwk',keys.publicKey);
  key.kid='test-key';key.alg='RS256';
  const team='https://shipyard-test.cloudflareaccess.com';
  const env={
    SHIPYARD_ACCESS_TEAM_DOMAIN:team,
    SHIPYARD_ACCESS_AUD:'specific-audience',
    SHIPYARD_ADMIN_EMAILS:'owner@example.org'
  };
  const fetcher=async url=>{
    assert.equal(url,team+'/cdn-cgi/access/certs');
    return new Response(JSON.stringify({keys:[key]}),{status:200});
  };
  const now=1_800_000_000_000;
  const claims={
    iss:team,aud:'specific-audience',email:'owner@example.org',
    exp:Math.floor(now/1000)+3600,nbf:Math.floor(now/1000)-60
  };
  const req=jwt=>new Request('https://good-ship.co.uk/api/shipyard/admin/ideas',{
    headers:{'cf-access-jwt-assertion':jwt}
  });
  const valid=await signedJWT(claims,keys.privateKey);
  assert.equal(await authorisedAdmin(req(valid),env,fetcher,now),'owner@example.org');
  assert.equal(await authorisedAdmin(req(valid+'.tampered'),env,fetcher,now),null);
  for(const invalid of [
    {...claims,aud:'wrong'},{...claims,email:'stranger@example.org'},
    {...claims,iss:'https://attacker.cloudflareaccess.com'},
    {...claims,exp:Math.floor(now/1000)-1}
  ]) {
    assert.equal(await authorisedAdmin(req(await signedJWT(invalid,keys.privateKey)),env,fetcher,now),null);
  }
  assert.equal(await authorisedAdmin(req(valid),{...env,SHIPYARD_ADMIN_EMAILS:''},fetcher,now),null);
  assert.equal(await authorisedAdmin(new Request('https://good-ship.co.uk'),env,fetcher,now),null);
});

test('server route is deliberately missing email delivery and publication actions',()=>{
  const api=readFileSync(join(root,'functions/api/shipyard/admin/review.js'),'utf8');
  const intake=readFileSync(join(root,'functions/api/shipyard/ideas.js'),'utf8');
  const page=readFileSync(join(root,'shipyard/start/index.html'),'utf8');
  assert.match(api,/input\.confirmed !== true/);
  assert.match(api,/approve_prototype/);
  assert.match(api,/approve_quote/);
  assert.doesNotMatch(api+/\n/+intake,/sendEmail\s*\(|resend\.emails|smtp|createEmail\s*\(/i);
  assert.match(page,/personal review|person will consider|review my idea/i);
});
