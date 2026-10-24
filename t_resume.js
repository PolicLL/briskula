const {client,chromium,store}=require('./harness.js');
(async()=>{const b=await chromium.launch();
const A=await client(b,1000,760,'A'),B=await client(b,390,844,'B');await A.waitForTimeout(400);
await A.click('[data-go=lobby]');await A.waitForTimeout(300);await A.click('#roomCreate');await A.waitForTimeout(700);
await B.click('[data-go=lobby]');await B.waitForTimeout(700);await (await B.$('#roomList button')).click();await B.waitForTimeout(700);
await A.click('#wStart');await A.waitForTimeout(1200);
// B leaves mid-game
await B.click('#gMenu');await B.click('#gmLeave');await B.waitForTimeout(1500);
console.log('B home notice:',await B.$eval('#resumeNotice',e=>e.hidden?'(hidden)':e.innerText.replace(/\n/g,' ')));
await A.waitForTimeout(1500);console.log('A away bar:',await A.$eval('#awayBar',e=>e.hidden?'(hidden)':e.innerText));
await A.screenshot({path:'away_A.png'});await B.screenshot({path:'resume_B.png'});
await B.click('#resumeGo');await B.waitForTimeout(2500);
console.log('after resume A bar:',await A.$eval('#awayBar',e=>e.hidden?'(hidden)':e.innerText),'| B screen',await B.evaluate(()=>CUR),'B hand',await B.$$eval('#meHand button',x=>x.length));
// B leaves again and does not return
await B.click('#gMenu');await B.click('#gmLeave');await A.waitForTimeout(11000);
console.log('A panel:',(await A.textContent('#panel')).slice(0,90));
const R=[...store.entries()].filter(([k])=>k.startsWith('rooms/')).map(([k,r])=>JSON.parse(r.d))[0];console.log('room',R.status,R.wins,JSON.parse(R.Sj).forfeit);
await B.evaluate(()=>show('home'));await B.waitForTimeout(1500);console.log('B notice now:',await B.$eval('#resumeNotice',e=>e.hidden?'(hidden)':e.innerText));
const pl=[...store.entries()].filter(([k])=>k.startsWith('players/')).map(([k,r])=>{const d=JSON.parse(r.d);return d.name+' g'+d.games+' w'+d.wins+' p'+d.points+' room:'+d.activeRoom});
console.log(pl,'errs',A.errs,B.errs);
// local resume
const C=await client(b,390,844,'C');await C.waitForTimeout(300);await C.click('[data-go=local]');await C.click('#localStart');await C.waitForTimeout(800);
await C.click('#backBtn');await C.waitForTimeout(500);console.log('C local notice:',await C.$eval('#resumeNotice',e=>e.hidden?'(hidden)':e.innerText.replace(/\n/g,' ')));
await C.click('#resumeGo');await C.waitForTimeout(600);console.log('C resumed:',await C.evaluate(()=>CUR),await C.$$eval('#meHand button',x=>x.length),'errs',C.errs);
await b.close()})();
