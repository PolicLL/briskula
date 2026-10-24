const {client,chromium,store}=require('./harness.js');
(async()=>{const b=await chromium.launch();
const A=await client(b,1100,760,'A'),B=await client(b,390,844,'B');await A.waitForTimeout(500);
await A.click('[data-go=lobby]');await A.waitForTimeout(300);
await A.click('#roomForm .seg[aria-label="Broj igrača"] button:text-is("4 (2 na 2)")');
await A.click('#roomCreate');await A.waitForTimeout(800);
console.log('A panel:',(await A.textContent('#panel')).slice(0,80));
await B.click('[data-go=lobby]');await B.waitForTimeout(800);
const jb=await B.$('#roomList button');console.log('B sees room:',!!jb);await jb.click();await B.waitForTimeout(800);
console.log('B panel:',(await B.textContent('#panel')).slice(0,120));
await A.waitForTimeout(400);await B.screenshot({path:'on_wait.png'});
await A.click('#wFill');await A.waitForTimeout(1200);
let moves=0,shot=false;
for(let k=0;k<700;k++){
  let moved=false;
  for(const p of [A,B]){const btn=await p.$('#meHand.active button.card');if(btn&&await p.$eval('#overlay',o=>o.hidden)){await btn.click();moves++;moved=true;await p.waitForTimeout(200)}}
  if(moves>=4&&!shot){await B.waitForTimeout(400);await B.screenshot({path:'on_B.png'});await A.screenshot({path:'on_A.png'});shot=true}
  const overA=!(await A.$eval('#overlay',o=>o.hidden)),overB=!(await B.$eval('#overlay',o=>o.hidden));
  if(overA&&overB&&moves>5)break;
  if(!moved)await A.waitForTimeout(250);
}
await A.waitForTimeout(1000);
console.log('moves',moves,'\nA:',(await A.textContent('#panel')).slice(0,70),'\nB:',(await B.textContent('#panel')).slice(0,70));
const pl=[...store.entries()].filter(([k])=>k.startsWith('players/')).map(([k,r])=>{const d=JSON.parse(r.d);return d.name+' g'+d.games+' w'+d.wins+' p'+d.points});
console.log('players',pl,'errs',A.errs,B.errs);
await b.close()})();
