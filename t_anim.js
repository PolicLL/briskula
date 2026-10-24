const {client,chromium}=require('./harness.js');
(async()=>{const b=await chromium.launch();const p=await client(b,390,844,'A');await p.waitForTimeout(400);
await p.click('[data-go=local]');await p.click('.seg[aria-label="Broj igrača"] button:text-is("4 (2 na 2)")');await p.click('#localStart');await p.waitForTimeout(500);
// count hand DOM replacements
await p.evaluate(()=>{window.__repl=0;new MutationObserver(m=>{for(const r of m)window.__repl+=r.removedNodes.length}).observe(document.getElementById('meHand'),{childList:true})});
let moves=0,shots=0;
for(let k=0;k<400;k++){if(!(await p.$eval('#overlay',o=>o.hidden)))break;const c=await p.$('#meHand.active button.card');
 if(c){await c.click();moves++;if(moves===2&&shots===0){for(const t of [60,200,400]){await p.waitForTimeout(t===60?60:t-60);await p.screenshot({path:'anim_'+t+'.png',clip:{x:0,y:250,width:390,height:330}})}shots=1}}await p.waitForTimeout(150)}
console.log('moves',moves,'hand removals',await p.evaluate(()=>window.__repl),'errs',p.errs);await b.close()})();
