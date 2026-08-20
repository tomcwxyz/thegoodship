const pptxgen = require('pptxgenjs');
const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'The Good Ship';
pptx.subject = 'Designing how we work together';
pptx.title = 'Designing how we work together';
pptx.company = 'The Good Ship';
pptx.lang = 'en-GB';
pptx.theme = { headFontFace: 'Georgia', bodyFontFace: 'Arial', lang: 'en-GB' };
pptx.defineSlideMaster({
  title: 'BASE',
  background: { color: 'F5F0E8' },
  objects: [
    { text: { text: 'the good ship · framework', options: { x: 0.62, y: 7.07, w: 2.4, h: 0.18, fontFace: 'Arial', fontSize: 8, color: '758093', margin: 0 } } },
  ],
  slideNumber: { x: 12.25, y: 7.02, w: 0.45, h: 0.2, fontFace: 'Arial', fontSize: 8, color: '758093', align: 'right' }
});

const C={navy:'1B2A4A',cream:'F5F0E8',cream2:'EBE4D8',teal:'2D8B7A',teal2:'3AA08D',amber:'D4993D',amber2:'E0AD56',coral:'C75B3A',blue:'8BA4B8',ink:'243556',white:'FEFCF9',grey:'758093',green:'6F8F78'};
const SH=pptx.ShapeType;

function addTitle(slide,kicker,title,sub){
  if(kicker) slide.addText(kicker,{x:.62,y:.45,w:4.2,h:.22,fontFace:'Arial',fontSize:9,bold:true,color:C.teal,charSpacing:1.5,margin:0});
  slide.addText(title,{x:.62,y:.78,w:11.9,h:.72,fontFace:'Georgia',fontSize:28,bold:true,color:C.navy,margin:0});
  if(sub) slide.addText(sub,{x:.64,y:1.58,w:11.6,h:.46,fontFace:'Arial',fontSize:12,color:C.ink,margin:0});
}
function addPill(slide,text,x,y,w,color=C.teal,fill='FFFFFF',fs=9){
  slide.addShape(SH.roundRect,{x,y,w,h:.35,fill:{color:fill,transparency:fill==='FFFFFF'?100:0},line:{color,width:1.2},radius:.08});
  slide.addText(text,{x:x+.06,y:y+.08,w:w-.12,h:.14,fontFace:'Arial',fontSize:fs,bold:true,color,align:'center',margin:0});
}
function addBlob(slide,x,y,w,h,fill,label,sub,labelColor=C.navy){
  slide.addShape(SH.ellipse,{x:x-.08,y:y-.05,w:w+.16,h:h+.1,fill:{color:C.teal,transparency:84},line:{color:C.teal,transparency:65,width:1}});
  slide.addShape(SH.ellipse,{x,y,w,h,fill:{color:C.cream2},line:{color:'D8CCBA',width:1.2}});
  slide.addShape(SH.ellipse,{x:x+.12,y:y+.1,w:w-.24,h:h-.2,fill:{color:fill,transparency:8},line:{color:fill,transparency:35,width:.8}});
  slide.addText(label,{x:x+.12,y:y+h*.34,w:w-.24,h:.26,fontFace:'Arial',fontSize:13,bold:true,color:labelColor,align:'center',margin:0});
  if(sub) slide.addText(sub,{x:x+.18,y:y+h*.56,w:w-.36,h:.42,fontFace:'Arial',fontSize:8.5,color:labelColor,align:'center',valign:'mid',margin:0,fit:'shrink'});
}
function addArrow(slide,x1,y1,x2,y2,color=C.amber,dash='dash'){
  slide.addShape(SH.line,{x:x1,y:y1,w:x2-x1,h:y2-y1,line:{color,width:1.4,dashType:dash,beginArrowType:'none',endArrowType:'triangle',transparency:5}});
}
function addCard(slide,x,y,w,h,title,body,accent=C.teal){
  slide.addShape(SH.roundRect,{x,y,w,h,fill:{color:C.white},line:{color:'DDD4C7',width:.8},radius:.06});
  slide.addShape(SH.rect,{x,y,w:.06,h,fill:{color:accent},line:{color:accent}});
  slide.addText(title,{x:x+.18,y:y+.14,w:w-.34,h:.22,fontFace:'Arial',fontSize:10,bold:true,color:C.navy,margin:0});
  slide.addText(body,{x:x+.18,y:y+.45,w:w-.34,h:h-.57,fontFace:'Arial',fontSize:9.2,color:C.ink,margin:0,fit:'shrink',valign:'top'});
}
function addFooterTag(slide,text){
  slide.addText(text,{x:9.2,y:7.05,w:2.8,h:.18,fontFace:'Arial',fontSize:8,bold:true,color:C.amber,align:'right',margin:0});
}

// 1 — Cover
{
  const s=pptx.addSlide('BASE'); s.background={color:C.navy};
  s.addText('THE GOOD SHIP · FRAMEWORK',{x:.7,y:.55,w:4,h:.2,fontFace:'Arial',fontSize:9,bold:true,color:C.amber2,charSpacing:1.6,margin:0});
  s.addText('Designing how\nwe work together',{x:.7,y:1.25,w:7.2,h:1.65,fontFace:'Georgia',fontSize:38,bold:true,color:C.cream,margin:0});
  s.addText('Not everything needs collaboration.',{x:.72,y:3.15,w:6.4,h:.45,fontFace:'Arial',fontSize:18,bold:true,color:C.teal2,margin:0});
  s.addText('Five modes for designing relationships, openness, control, reciprocity, governance and exit.',{x:.72,y:3.78,w:6.4,h:.75,fontFace:'Arial',fontSize:13,color:C.cream,margin:0});
  s.addText("More isn't better. Choose what the work actually needs.",{x:.72,y:5.18,w:5.9,h:.44,fontFace:'Arial',fontSize:12,bold:true,color:C.amber2,margin:0});
  addBlob(s,8.15,1.05,1.7,1.08,C.teal,'CONNECT','');
  addBlob(s,10.35,1.85,1.7,1.08,C.coral,'COMMONS','');
  addBlob(s,9.15,3.05,1.8,1.15,C.amber,'COLLABORATE','');
  addBlob(s,7.55,4.55,1.75,1.1,C.blue,'COORDINATE','');
  addBlob(s,10.3,4.7,1.8,1.12,C.green,'COOPERATE','');
  addArrow(s,9.5,2.03,9.8,3.12,C.amber2);
  addArrow(s,10.8,4.13,11.0,4.7,C.teal2);
  s.addText('modes, not stages',{x:8.55,y:6.15,w:3.2,h:.3,fontFace:'Arial',fontSize:10,bold:true,color:C.cream,align:'center',margin:0});
}

// 2 — Archipelago
{
  const s=pptx.addSlide('BASE'); addTitle(s,'THE ARCHIPELAGO','Five modes. Not stages.','You can use several at once, and move between them.');
  addBlob(s,.9,2.45,2.05,1.35,C.teal,'CONNECT','Know, learn, refer, exchange.');
  addBlob(s,9.92,2.15,2.18,1.45,C.coral,'COMMONS','Contribute to and steward something others can use.');
  addBlob(s,5.48,2.86,2.35,1.5,C.amber,'COLLABORATE','Make and own important things together.');
  addBlob(s,2.16,4.72,2.22,1.42,C.blue,'COORDINATE','Adjust what you do around one another.');
  addBlob(s,8.2,4.7,2.22,1.42,C.green,'COOPERATE','Contribute distinct things towards something shared.');
  addArrow(s,2.75,3.55,5.56,3.55,C.amber2,'dash'); addArrow(s,7.72,3.48,9.95,2.95,C.teal2,'dash');
  addArrow(s,4.3,5.05,5.9,4.2,C.blue,'dash'); addArrow(s,7.48,4.1,8.5,4.7,C.coral,'dash');
  addPill(s,'NOT A MATURITY MODEL',5.2,6.15,2.95,C.coral,C.cream,9);
  addFooterTag(s,'more ≠ better');
}

// 3 — Choose the lightest mode
{
  const s=pptx.addSlide('BASE'); addTitle(s,'DESIGN PRINCIPLE','Choose the lightest mode the work needs','The modes differ in interdependence, what must be shared, and what infrastructure is worth paying for.');
  const xs=[.62,3.15,5.68,8.21,10.74];
  const data=[
    ['CONNECT','We benefit from knowing and learning from one another.','Useful contact · trust · easy exchange',C.teal],
    ['COORDINATE','We adjust what we do because of what others are doing.','Visibility · roles · hand-offs · boundaries',C.blue],
    ['COOPERATE','We contribute distinct things towards something shared.','Outcome · commitments · ownership of pieces',C.green],
    ['COLLABORATE','We make and own important things together.','Shared decisions · trust · time · repair',C.amber],
    ['COMMONS','We contribute to and steward something others can use and shape.','Licences · standards · stewardship · contribution rules',C.coral]
  ];
  data.forEach((d,i)=>{
    s.addShape(SH.roundRect,{x:xs[i],y:2.3,w:2.05,h:3.3,fill:{color:C.white},line:{color:'DDD4C7',width:.7},radius:.05});
    s.addShape(SH.ellipse,{x:xs[i]+.68,y:2.55,w:.68,h:.46,fill:{color:d[3],transparency:8},line:{color:d[3],width:.8}});
    s.addText(d[0],{x:xs[i]+.12,y:3.2,w:1.8,h:.28,fontFace:'Arial',fontSize:11,bold:true,color:C.navy,align:'center',margin:0});
    s.addText(d[1],{x:xs[i]+.15,y:3.65,w:1.75,h:.78,fontFace:'Arial',fontSize:9,color:C.ink,align:'center',margin:0,fit:'shrink'});
    s.addText('Needs',{x:xs[i]+.15,y:4.65,w:1.75,h:.2,fontFace:'Arial',fontSize:8,bold:true,color:d[3],align:'center',margin:0});
    s.addText(d[2],{x:xs[i]+.15,y:4.95,w:1.75,h:.55,fontFace:'Arial',fontSize:8.5,color:C.ink,align:'center',margin:0,fit:'shrink'});
  });
  s.addText('Sometimes a referral is exactly what is needed. Turning it into a “collaboration” would just add meetings.',{x:1.4,y:6.05,w:10.5,h:.42,fontFace:'Georgia',italic:true,fontSize:13,color:C.coral,align:'center',margin:0});
}

// 4 — Environment
{
  const s=pptx.addSlide('BASE'); addTitle(s,'TWO ORTHOGONAL CHOICES','Design the environment around the mode','Open is not the same as collaborative. Distributed is not the same as open.');
  s.addText('HOW OPEN?',{x:.8,y:2.35,w:2.2,h:.25,fontFace:'Arial',fontSize:10,bold:true,color:C.teal,margin:0});
  const open=[['Closed','What stays private?'],['Visible','What can others see?'],['Participatory','Who can shape it?'],['Reusable','Who can take and adapt it?']];
  open.forEach((d,i)=>{let x=.8+i*2.85; s.addShape(SH.roundRect,{x,y:2.85,w:2.3,h:1.0,fill:{color:i===3?C.teal:C.white},line:{color:i===3?C.teal:'D8D0C3',width:.8},radius:.06}); s.addText(d[0],{x:x+.12,y:3.04,w:2.06,h:.22,fontFace:'Arial',fontSize:11,bold:true,color:i===3?C.white:C.navy,align:'center',margin:0}); s.addText(d[1],{x:x+.12,y:3.38,w:2.06,h:.24,fontFace:'Arial',fontSize:8.5,color:i===3?C.white:C.ink,align:'center',margin:0}); if(i<3) addArrow(s,x+2.3,3.35,x+2.75,3.35,C.grey,'dash');});
  s.addText('Process: open working   ·   Outputs: Creative Commons   ·   Software: open source',{x:1.1,y:4.08,w:10.7,h:.27,fontFace:'Arial',fontSize:10,color:C.ink,align:'center',margin:0});
  s.addText('WHERE DOES CONTROL SIT?',{x:.8,y:4.78,w:3.1,h:.25,fontFace:'Arial',fontSize:10,bold:true,color:C.amber,margin:0});
  const ctrl=[['Led','Clear authority'],['Shared','Decisions held together'],['Federated','Common rules + local autonomy'],['Distributed','No single centre required']];
  ctrl.forEach((d,i)=>{let x=.8+i*2.85; s.addShape(SH.roundRect,{x,y:5.25,w:2.3,h:.95,fill:{color:i===2?C.amber:C.white},line:{color:i===2?C.amber:'D8D0C3',width:.8},radius:.06}); s.addText(d[0],{x:x+.12,y:5.42,w:2.06,h:.22,fontFace:'Arial',fontSize:11,bold:true,color:i===2?C.white:C.navy,align:'center',margin:0}); s.addText(d[1],{x:x+.12,y:5.73,w:2.06,h:.24,fontFace:'Arial',fontSize:8.3,color:i===2?C.white:C.ink,align:'center',margin:0,fit:'shrink'}); if(i<3) addArrow(s,x+2.3,5.7,x+2.75,5.7,C.grey,'dash');});
  s.addText('Decentralised ≠ collaborative   ·   Open ≠ decentralised   ·   Reusable ≠ participatory',{x:1.2,y:6.55,w:10.9,h:.3,fontFace:'Arial',fontSize:10,bold:true,color:C.coral,align:'center',margin:0});
}

// 5 — Contribution and reciprocity
{
  const s=pptx.addSlide('BASE'); addTitle(s,'CONTRIBUTION & RECIPROCITY','What flows between us?','The mode describes how you are relating. Reciprocity describes what flows.');
  addBlob(s,5.05,2.45,3.15,1.8,C.cream2,'THE ARRANGEMENT','Contributions do not need to be equal — but should be intentional, understood and reasonably fair.');
  const nodes=[['KNOWLEDGE',1.1,2.35,C.teal],['TIME',.9,4.7,C.amber],['MONEY',3.0,5.55,C.coral],['LABOUR',5.3,5.75,C.blue],['ACCESS',8.0,5.55,C.green],['RELATIONSHIPS',10.35,4.55,C.teal2],['LEGITIMACY',10.45,2.25,C.amber2],['INFRASTRUCTURE',8.1,1.55,C.coral]];
  nodes.forEach(([t,x,y,c],i)=>{ addPill(s,t,x,y,1.75,c,C.white,8.3); const cx=x+.875,cy=y+.175,tx=6.62,ty=3.35; addArrow(s,cx,cy,tx,ty,c,'dash'); if(i%2===0) addArrow(s,tx,ty,cx,cy,c,'dash'); });
  s.addText('One-way exchange presented as “collaboration” deserves scrutiny.',{x:2.35,y:6.57,w:8.65,h:.3,fontFace:'Georgia',italic:true,fontSize:13,color:C.coral,align:'center',margin:0});
}

// 6 — Infrastructure
{
  const s=pptx.addSlide('BASE'); addTitle(s,'GOVERNANCE & PRACTICE','Different modes need different infrastructure','The question is not “how collaborative are we?” but “what do we need to make this mode work well?”');
  const rows=[
    ['CONNECT','Light social infrastructure','Who stays connected? How?','Weak ties disappear when key people leave.'],
    ['COORDINATE','Information + role infrastructure','Who does what? What needs visibility?','Hidden work, duplication and broken hand-offs.'],
    ['COOPERATE','Commitment + delivery infrastructure','Who owns which piece? What is promised?','Shared goal, unequal load or vague accountability.'],
    ['COLLABORATE','Relational + decision infrastructure','Who can decide? How do we disagree and repair?','One party controls the important choices.'],
    ['COMMONS','Stewardship + contribution infrastructure','Who can use, change, contribute, maintain or fork?','Open to use, closed to meaningful influence.']
  ];
  const x=[.7,2.35,5.08,8.1],w=[1.45,2.55,2.82,4.45];
  ['MODE','WHAT IT NEEDS','GOVERNANCE QUESTION','WATCH OUT FOR'].forEach((h,i)=>s.addText(h,{x:x[i],y:2.28,w:w[i],h:.23,fontFace:'Arial',fontSize:8.5,bold:true,color:C.grey,margin:0}));
  rows.forEach((r,ri)=>{const y=2.68+ri*.72; if(ri%2===0) s.addShape(SH.rect,{x:.62,y:y-.09,w:12.05,h:.64,fill:{color:C.white},line:{color:C.white}}); r.forEach((txt,i)=>s.addText(txt,{x:x[i],y,w:w[i],h:.48,fontFace:'Arial',fontSize:i===0?9.4:8.8,bold:i===0,color:i===0?[C.teal,C.blue,C.green,C.amber,C.coral][ri]:C.ink,margin:0,fit:'shrink',valign:'mid'})); });
  s.addText('Name the arrangement honestly. A commission, grant, procurement or consultation can be perfectly legitimate without pretending to be collaboration.',{x:.9,y:6.42,w:11.45,h:.4,fontFace:'Georgia',italic:true,fontSize:11.5,color:C.navy,align:'center',margin:0});
}

// 7 — Collaboration vs commons
{
  const s=pptx.addSlide('BASE'); addTitle(s,'A USEFUL DISTINCTION','Collaboration and commons are different','You collaborate with people. You contribute to, draw from and steward a commons.');
  const cols=[
    {x:.8,w:5.65,t:'COLLABORATE',c:C.amber,items:[['Centre of gravity','The relationship'],['Basic action','Make + decide together'],['Dependency','On one another'],['Infrastructure','Relationships · meetings · decisions · conflict / repair'],['Power question','Whose voice counts?'],['Exit','Change, loosen or leave the relationship']]},
    {x:6.9,w:5.65,t:'COMMONS',c:C.coral,items:[['Centre of gravity','The shared thing'],['Basic action','Contribute · use · steward'],['Dependency','On the shared resource / infrastructure'],['Infrastructure','Licences · standards · repositories · documentation · contribution rules'],['Power question','Who controls the commons?'],['Exit','Leave · hand over · archive · fork']]}
  ];
  cols.forEach(col=>{s.addShape(SH.roundRect,{x:col.x,y:2.25,w:col.w,h:4.15,fill:{color:C.white},line:{color:col.c,width:1.2},radius:.06}); s.addText(col.t,{x:col.x+.25,y:2.48,w:col.w-.5,h:.3,fontFace:'Arial',fontSize:15,bold:true,color:col.c,margin:0}); col.items.forEach((it,i)=>{let y=3.02+i*.54; s.addText(it[0],{x:col.x+.25,y,w:1.42,h:.22,fontFace:'Arial',fontSize:8,bold:true,color:C.grey,margin:0}); s.addText(it[1],{x:col.x+1.75,y,w:col.w-2,h:.31,fontFace:'Arial',fontSize:9.2,color:C.ink,margin:0,fit:'shrink'});});});
  addPill(s,'DIFFERENT INFRASTRUCTURE',5.17,6.63,3.0,C.navy,C.cream,9);
}

// 8 — Change and exit
{
  const s=pptx.addSlide('BASE'); addTitle(s,'CHANGE & EXIT','Every island needs a way off','Design how the relationship can change — before changing it becomes contentious.');
  const exits=[['FINISH',C.teal],['PAUSE',C.blue],['LEAVE',C.coral],['LOOSEN',C.green],['DEEPEN',C.amber],['HAND OVER',C.teal2],['FORK',C.coral],['CLOSE',C.grey]];
  exits.forEach((e,i)=>{let x=.78+(i%4)*3.05,y=2.35+Math.floor(i/4)*.7; addPill(s,e[0],x,y,2.45,e[1],C.white,9);});
  addCard(s,.78,4.08,3.78,1.9,'How will we know when?','Purpose achieved · conditions changed · costs outweigh value · participation is no longer meaningful · another mode now fits better.',C.teal);
  addCard(s,4.78,4.08,3.78,1.9,'Why?','Complete · changed · unsustainable · misaligned · unhealthy · evolving',C.amber);
  addCard(s,8.78,4.08,3.78,1.9,'How do we actually do it?','Decision · notice · commitments · data / IP / access · stewardship · communication',C.coral);
  s.addText('For a commons: can it be forked?',{x:4.1,y:6.37,w:5.1,h:.34,fontFace:'Georgia',italic:true,fontSize:14,bold:true,color:C.coral,align:'center',margin:0});
}

// 9 — Workshop canvas
{
  const s=pptx.addSlide('BASE'); addTitle(s,'WORKSHOP CANVAS','Before you set sail','Use these six questions to design the arrangement — then choose the mode, openness and distribution of control that fit.');
  const cards=[
    ['1','PURPOSE','What are we actually trying to achieve together?\nWhat would be different if this worked?',C.teal],
    ['2','POWER','Who has money, authority, information and the ability to walk away?\nWhat power differences need naming or balancing?',C.coral],
    ['3','DECISIONS','What gets decided together — and what does not?\nWho can commit the organisations involved?',C.amber],
    ['4','CONTRIBUTION & RECIPROCITY','What does each participant put in, and what can they draw from?\nWhat would feel unfair or extractive?',C.green],
    ['5','OPENNESS & OWNERSHIP','Who can see, use, change and share the work or outputs?\nWhat should remain private — and why?',C.blue],
    ['6','CHANGE & EXIT','How will we know when this arrangement should change?\nWho decides, and what happens to the work, money, data and relationships?',C.teal2]
  ];
  cards.forEach((c,i)=>{let x=.72+(i%3)*4.18,y=2.27+Math.floor(i/3)*1.78; s.addShape(SH.roundRect,{x,y,w:3.82,h:1.48,fill:{color:C.white},line:{color:'DDD4C7',width:.7},radius:.06}); s.addShape(SH.ellipse,{x:x+.18,y:y+.18,w:.48,h:.48,fill:{color:c[3]},line:{color:c[3]}}); s.addText(c[0],{x:x+.18,y:y+.29,w:.48,h:.14,fontFace:'Arial',fontSize:9,bold:true,color:C.white,align:'center',margin:0}); s.addText(c[1],{x:x+.82,y:y+.18,w:2.76,h:.25,fontFace:'Arial',fontSize:9,bold:true,color:C.navy,margin:0,fit:'shrink'}); s.addText(c[2],{x:x+.82,y:y+.52,w:2.75,h:.72,fontFace:'Arial',fontSize:8.6,color:C.ink,margin:0,fit:'shrink'});});
  s.addShape(SH.roundRect,{x:1.02,y:6.03,w:11.25,h:.68,fill:{color:C.navy},line:{color:C.navy},radius:.06});
  s.addText('Then choose:   MODE  ·  OPENNESS  ·  WHERE CONTROL SITS  ·  WHAT FLOWS  ·  HOW IT CHANGES',{x:1.3,y:6.27,w:10.7,h:.2,fontFace:'Arial',fontSize:10,bold:true,color:C.cream,align:'center',margin:0});
}

pptx.writeFile({ fileName: 'frameworks/collaboration-spectrum-slides.pptx' });
