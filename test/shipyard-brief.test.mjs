import test from 'node:test';
import assert from 'node:assert/strict';
import {createBrief,possibleRoutes} from '../shipyard/start/brief.mjs';

const base={
  problem:'We are stuck between spreadsheets and emails',
  people:'A small local team',
  currentApproach:'Separate spreadsheets',
  outcome:'Everyone can see what needs doing',
  direction:'unsure',
  priority:'ownership'
};

test('discovery brief includes the person’s actual problem and three sensible routes',()=>{
  const brief=createBrief(base);
  assert.match(brief,/stuck between spreadsheets/);
  assert.match(brief,/Everyone can see/);
  assert.match(brief,/Make the current approach easier/);
  assert.match(brief,/Adapt a tool that already exists/);
  assert.match(brief,/Build the smallest useful thing/);
  assert.match(brief,/hosting, data portability/i);
  assert.match(brief,/human review/i);
});

test('suggestions remain non-binding and adapt to what matters',()=>{
  const suggestions=possibleRoutes({...base,currentApproach:'',priority:'cost'});
  assert.equal(suggestions.routes.length,3);
  assert.match(suggestions.routes[0].description,/manual process or spreadsheet/);
  assert.match(suggestions.note,/ongoing licence, hosting and maintenance costs/);
  const speed=possibleRoutes({...base,priority:'speed'});
  assert.match(speed.note,/quickest demonstration/);
});

test('empty optional answers remain legible and safely escaped as plain text',()=>{
  const text=createBrief({...base,people:'',currentApproach:''});
  assert.match(text,/Who this is for\nNot specified/);
  assert.match(text,/How things work now\nNot specified/);
  const untrusted='<script>alert("not executed")</script>';
  assert.ok(createBrief({...base,problem:untrusted}).includes(untrusted));
  // The browser renders the brief with textContent, never innerHTML.
});
