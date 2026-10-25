// English / Italian UI, characters, themes, players online
const {client,chromium,store}=require('./harness.js');
const HR=/[čćžšđČĆŽŠĐ]|\b(je|igra|igrač|bodova|soba|turnir|pobjed|razina|tvoj|nosi|baca|čeka|botovi|izbornik|prijav|registr|lozink|gost)\w*/i;
async function leftovers(p){return p.evaluate(src=>{const re=new RegExp(src,'i');const out=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  while(w.nextNode()){const n=w.currentNode,el=n.parentElement;if(!el||el.closest('[hidden]')||/SCRIPT|STYLE/.test(el.nodeName))continue;const r=el.getBoundingClientRect();if(!r.width)continue;
   const t=n.nodeValue.trim();if(t&&re.test(t)&&!/Briškula|Bariša|Šime|Paško|Nikša|Joško|Tonći|Šjor|Pošip|Peškafondo|Hrvatski|Lavanda/.test(t))out.push(t.slice(0,60))}return out},HR.source)}
(async()=>{const b=await chromium.launch();
for(const L of ['en','it']){
 const p=await client(b,390,844,L);await p.evaluate(l=>localStorage.setItem('brisk-lang',l),L);await p.reload();await p.waitForTimeout(1500);
 console.log(L,'home:',(await p.textContent('.hero')).replace(/\s+/g,' ').trim(),'| lang attr',await p.evaluate(()=>document.documentElement.lang));
 console.log(' leftovers home',await leftovers(p));
 await p.screenshot({path:'i18n_home_'+L+'.png'});
 for(const s of ['rules','lobby','tours','lead']){await p.evaluate(x=>show(x),s);await p.waitForTimeout(500);const l=await leftovers(p);if(l.length)console.log(' leftovers',s,l)}
 await p.evaluate(()=>show('profile'));await p.waitForTimeout(400);console.log(' leftovers profile',await leftovers(p));
 await p.click('#avPick button:nth-child(2)');await p.click('#pfSave');await p.waitForTimeout(300);
 console.log(' avatar now',await p.evaluate(()=>P.avatar),(await p.getAttribute('#meAv','src')).slice(0,30));
 await p.click('#setTheme button:nth-child(2)');await p.waitForTimeout(300);
 console.log(' theme',await p.evaluate(()=>document.documentElement.dataset.theme+' '+getComputedStyle(document.body).getPropertyValue('--brass')));
 await p.screenshot({path:'i18n_profile_'+L+'.png',fullPage:false});
 await p.evaluate(()=>show('local'));await p.waitForTimeout(200);console.log(' leftovers local',await leftovers(p));
 await p.click('#localStart');await p.waitForTimeout(500);
 let shot=false;
 for(let k=0;k<900;k++){if(await p.$('#endMenu'))break;const c=await p.$('#meHand.active button.card');if(c){await c.click();if(!shot&&k>6){await p.waitForTimeout(700);console.log(' status:',await p.textContent('#status'),'| leftovers game',await leftovers(p));await p.screenshot({path:'i18n_game_'+L+'.png'});shot=true}}await p.waitForTimeout(60)}
 await p.waitForSelector('#endMenu',{timeout:90000});console.log(' end:',(await p.textContent('#panel')).replace(/\s+/g,' '),'| leftovers',await leftovers(p));
 console.log(' errs',p.errs);await p.context().close();
}
// online count with two players
const A=await client(b,390,844,'A'),B=await client(b,390,844,'B');await A.waitForTimeout(1500);await A.evaluate(()=>refreshOnline());await A.waitForTimeout(400);
console.log('online:',await A.textContent('#onlineNow'),await A.$eval('#onlineNow',e=>e.hidden));
await b.close()})();
