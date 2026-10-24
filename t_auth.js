// welcome screen, guest name, register, log out, log in again
const {client,chromium,store}=require('./harness.js');
(async()=>{const b=await chromium.launch();
const A=await client(b,390,844,'A');await A.goto('http://t.test/?welcome');await A.waitForTimeout(700);
const txt=async s=>(await A.$eval(s,e=>e.hidden?'(hidden)':e.innerText.replace(/\n+/g,' | '))).slice(0,160);
console.log('welcome:',await txt('#overlay'));
await A.screenshot({path:'auth_welcome.png'});
await A.click('#aDice');const n1=await A.inputValue('#aName');await A.fill('#aName','Duje Test');await A.click('#aGo');await A.waitForTimeout(400);
console.log('dice gave',n1,'| me:',await A.textContent('#meName'),await A.textContent('#meLv'),'| overlay',await txt('#overlay'));
// play one local game quickly to get points
await A.click('[data-go=local]');await A.click('#localStart');await A.waitForTimeout(400);
for(let k=0;k<900;k++){if(await A.$('#endMenu'))break;const c=await A.$('#meHand.active button.card');if(c)await c.click();await A.waitForTimeout(60)}
await A.click('#endMenu',{timeout:90000});await A.waitForTimeout(300);
const ptsGuest=await A.evaluate(()=>P.points);
// register from profile
await A.click('#meChip');await A.waitForTimeout(300);console.log('profile acc:',await txt('#pfAccount'));
await A.click('#pfReg');await A.fill('#aUser','x');await A.fill('#aPw','123');await A.click('#aGo');console.log('bad input err:',await txt('#aErr'));
await A.fill('#aUser','Duje_Split');await A.fill('#aPw','tajna123');await A.fill('#aPw2','tajna124');await A.click('#aGo');console.log('mismatch err:',await txt('#aErr'));
await A.fill('#aPw2','tajna123');await A.click('#aGo');await A.waitForTimeout(600);
console.log('after register: me',await A.textContent('#meName'),await A.textContent('#meLv'),'| acc:',await txt('#pfAccount'),'| name disabled',await A.$eval('#pfName',e=>e.disabled));
const uid1=await A.evaluate(()=>Cloud.uid);const d1=JSON.parse(store.get('players/'+uid1).d);console.log('db player',d1.name,d1.registered,d1.points,'guest pts',ptsGuest,'| usernames',[...store.keys()].filter(k=>k.startsWith('usernames/')));
// second client tries the same name
const B=await client(b,390,844,'B');await B.waitForTimeout(400);
await B.evaluate(()=>openAuth('register'));await B.fill('#aUser','duje_split');await B.fill('#aPw','abcdef');await B.fill('#aPw2','abcdef');await B.click('#aGo');await B.waitForTimeout(400);
console.log('B taken err:',(await B.textContent('#aErr')));
// log out
await A.click('#pfLogout');await A.waitForTimeout(600);console.log('after logout: me',await A.textContent('#meName'),await A.textContent('#meLv'),'| overlay',await txt('#overlay'));
await A.click('#aGo');await A.waitForTimeout(300);
// log in with wrong then right password
await A.evaluate(()=>openAuth('login'));await A.fill('#aUser','Duje_Split');await A.fill('#aPw','krivo12');await A.click('#aGo');await A.waitForTimeout(300);console.log('wrong pw:',await txt('#aErr'));
await A.fill('#aPw','tajna123');await A.click('#aGo');await A.waitForTimeout(600);
console.log('after login: me',await A.textContent('#meName'),await A.textContent('#meLv'),'pts',await A.evaluate(()=>P.points),'uid same',(await A.evaluate(()=>Cloud.uid))===uid1);
await A.evaluate(()=>show('lead'));await A.waitForTimeout(600);console.log('lead:',(await A.$eval('#leadTable tbody',e=>e.innerText.replace(/\s+/g,' '))).slice(0,200));
await A.screenshot({path:'auth_lead.png'});
console.log('errs',A.errs,B.errs);await b.close()})();
