const {client,chromium,store}=require('./harness.js');
(async()=>{const b=await chromium.launch();
const A=await client(b,1100,760,'A'),B=await client(b,390,844,'B');await A.waitForTimeout(500);
await A.click('[data-go=tours]');await A.waitForTimeout(300);
await A.fill('#tName','Kup Konobe');await A.click('#tourForm .seg[aria-label="Broj igrača"] button:text-is("8")');
await A.click('#tourForm .seg[aria-label="Način"] button:text-is("Klasično")');
await A.click('#tourCreate');await A.waitForTimeout(700);
await B.click('[data-go=tours]');await B.waitForTimeout(800);await B.click('#tourList button');await B.waitForTimeout(600);await B.click('#tJoin');await B.waitForTimeout(600);
await A.waitForTimeout(500);await A.click('#tStart');await A.waitForTimeout(1200);
await A.screenshot({path:'tour_A.png'});
const tid=[...store.keys()].find(k=>k.startsWith('tournaments/')).split('/')[1];
const getT=()=>JSON.parse(store.get('tournaments/'+tid).d);
let shot=false;
for(let it=0;it<3000;it++){
  for(const p of [A,B]){
    const cur=await p.evaluate(()=>CUR);
    if(cur==='tour'){const b=await p.$('#tPlay >> visible=true');if(b)await b.click();continue}
    if(cur!=='game'){await p.evaluate(t=>{show('tour');openTour(t)},tid);continue}
    const ov=!(await p.$eval('#overlay',o=>o.hidden));
    if(ov){const et=await p.$('#endTour');if(et){await et.click();continue}const nx=await p.$('#endNext');if(nx){await nx.click();continue}}
    const c=await p.$('#meHand.active button.card');if(c&&!ov)await c.click();
  }
  if(!shot&&it===40){await B.screenshot({path:'tour_Bgame.png'});shot=true}
  if(it%30===0){const T=getT();if(T.status==='done'){console.log('DONE champ',T.entrants[T.champion].name);break}
    if(it%300===0)console.log('it',it,'round',T.round,T.matches.map(m=>m.r+':'+(m.w==null?'?':m.w)).join(' '))}
  await A.waitForTimeout(120);
}
for(const p of [A,B]){await p.evaluate(t=>{show('tour');openTour(t)},tid)}
await A.waitForTimeout(1500);await A.screenshot({path:'tour_end.png'});await B.screenshot({path:'tour_endB.png'});
const pl=[...store.entries()].filter(([k])=>k.startsWith('players/')).map(([k,r])=>{const d=JSON.parse(r.d);return d.name+' g'+d.games+' w'+d.wins+' p'+d.points+' t'+(d.tWins||0)});
const T=getT();console.log('final',T.matches.map(m=>m.r+':'+m.a+'v'+m.b+'>'+m.w+' '+JSON.stringify(m.score)).join(' | '));
console.log('players',pl,'awarded',T.awarded,'errs',A.errs,B.errs);
await b.close()})();
