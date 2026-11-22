// Integration tests using a real SQLite engine, not a D1 mock that simply
// reports all SQL statements as successful. This catches schema/SQL drift.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {webcrypto} from 'node:crypto';
import {onRequestPost as start} from '../functions/api/shipyard/conversation/start.js';
import {onRequestPost as talk} from '../functions/api/shipyard/conversation/message.js';
import {onRequestPost as submit} from '../functions/api/shipyard/ideas.js';
globalThis.crypto ??= webcrypto;

const schema=await readFile(new URL('../shipyard/schema.sql',import.meta.url),'utf8');
class SQLiteD1 {
  constructor(){this.db=new DatabaseSync(':memory:');this.db.exec(schema);}
  prepare(sql){
    const db=this.db;
    return {
      sql,values:[],
      bind(...values){this.values=values;return this;},
      async run(){const x=db.prepare(sql).run(...this.values);return {meta:{changes:Number(x.changes)}};},
      async first(){return db.prepare(sql).get(...this.values)||null;},
      async all(){return {results:db.prepare(sql).all(...this.values)};}
    };
  }
  async batch(statements){
    this.db.exec('BEGIN');
    try{
      const results=[];
      for(const statement of statements){
        const result=this.db.prepare(statement.sql).run(...statement.values);
        results.push({meta:{changes:Number(result.changes)}});
      }
      this.db.exec('COMMIT');
      return results;
    }catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  close(){this.db.close();}
}
const env=db=>({
  SHIPYARD_DB:db,
  SHIPYARD_INTAKE_ENABLED:'true',
  SHIPYARD_CONVERSATION_ENABLED:'true',
  SHIPYARD_TURNSTILE_SITE_KEY:'test-site',
  SHIPYARD_TURNSTILE_SECRET:'test-secret',
  SHIPYARD_CHAT_API_KEY:'test-provider-key',
  SHIPYARD_CHAT_MODEL:'gpt-4o-mini',
  SHIPYARD_CHAT_DAILY_LIMIT:'2'
});
const request=(path,payload)=>new Request('https://good-ship.co.uk'+path,{
  method:'POST',headers:{origin:'https://good-ship.co.uk','content-type':'application/json'},
  body:JSON.stringify(payload)
});
async function withFetch(fake,fn){
  const old=globalThis.fetch;
  globalThis.fetch=fake;
  try{return await fn();}finally{globalThis.fetch=old;}
}

test('D1 schema and three actual AI calls enforce a shared daily limit',async()=>{
  const db=new SQLiteD1();
  const variables=env(db);
  let aiCalls=0;
  try {
    await withFetch(async(url,options)=>{
      if(url.includes('siteverify'))return new Response(JSON.stringify({success:true,hostname:'good-ship.co.uk'}));
      assert.equal(url,'https://api.openai.com/v1/chat/completions');
      assert.equal(options.headers.authorization,'Bearer test-provider-key');
      aiCalls++;
      return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({
        reply:'That is helpful. What would change for the people involved?',
        patch:{problem:{value:'The team has to copy data between tools',quote:'copy data between tools'}},
        focus:'people',ready:false
      })}}]}));
    },async()=>{
      const sessions=[];
      for(let i=0;i<3;i++){
        const response=await start({request:request('/api/shipyard/conversation/start',{
          turnstileToken:'a-valid-test-token-for-each-session-'+i
        }),env:variables});
        assert.equal(response.status,200);
        sessions.push((await response.json()).sessionToken);
      }
      for(let i=0;i<3;i++){
        const response=await talk({request:request('/api/shipyard/conversation/message',{
          sessionToken:sessions[i],
          history:[{role:'user',content:'We copy data between tools every week and lose time.'}],
          notes:{}
        }),env:variables});
        assert.equal(response.status,i===2?429:200);
        if(i<2){
          const message=await response.json();
          assert.equal(message.patch.problem.value,'The team has to copy data between tools');
        }
      }
      assert.equal(aiCalls,2,'the third call must never reach the provider');
      const today='daily-budget:'+new Date().toISOString().slice(0,10);
      const budget=db.db.prepare('SELECT turns_used FROM shipyard_chat_tickets WHERE token_hash=?').get(today);
      assert.equal(budget.turns_used,2);
      assert.equal(db.db.prepare('SELECT COUNT(*) AS n FROM shipyard_chat_tickets').get().n,4);
    });
  }finally{db.close();}
});

test('a consented enquiry with a transcript over the old size limit saves atomically',async()=>{
  const db=new SQLiteD1();
  try {
    const conversation=Array.from({length:12},(_,i)=>({
      role:i%2===0?'user':'assistant',
      content:'Our fictional team is exploring how to reduce duplicated admin work. '+('Example detail. '.repeat(32))
    }));
    const idea={
      problem:'Our team is frustrated by duplicated administrative work across different spreadsheets.',
      outcome:'We can coordinate the work much more easily each week.',
      people:'Volunteers and the co-ordinator',
      currentApproach:'Several spreadsheets',
      direction:'unsure',priority:'unsure',contactName:'Example Tester',
      contactEmail:'tester@example.org',organisation:'Fictional Group',
      consent:true,turnstileToken:'a-test-turnstile-token',companyWebsite:'',
      conversation,emergingNotes:{problem:'Duplicated admin'},needsClarification:false
    };
    assert.ok(JSON.stringify(idea).length>8500,'this reproduces the previous request-size bug');
    await withFetch(async()=>new Response(JSON.stringify({success:true,hostname:'good-ship.co.uk'})),async()=>{
      const response=await submit({request:request('/api/shipyard/ideas',idea),env:env(db)});
      assert.equal(response.status,201,JSON.stringify(await response.clone().json()));
    });
    const row=db.db.prepare('SELECT * FROM shipyard_ideas').get();
    assert.equal(row.contact_email,'tester@example.org');
    assert.equal(JSON.parse(row.conversation_json).length,12);
    assert.equal(db.db.prepare('SELECT COUNT(*) AS n FROM shipyard_reviews').get().n,1);
    assert.equal(db.db.prepare('SELECT COUNT(*) AS n FROM shipyard_audit').get().n,1);
  }finally{db.close();}
});
