const {client,chromium}=require('./harness.js');
(async()=>{const b=await chromium.launch();
for(const [N,dup,w,h] of [[2,true,390,844],[3,false,390,844],[4,false,1100,760]]){
 const p=await client(b,w,h,'L');await p.waitForTimeout(300);
 await p.click('[data-go=local]');
 const segBtn=async(label,txt)=>{await p.click('.seg[aria-label="'+label+'"] button:text-is("'+txt+'")')};
 await segBtn('Broj igrača',N===4?'4 (2 na 2)':String(N));if(N===2)await segBtn('Način (2 igrača)','Na duplo');
 await segBtn('Botovi','Srednji');
 await p.click('#localStart');await p.waitForTimeout(600);
 let shot=false,moves=0;
 for(let k=0;k<600;k++){
  if(!(await p.$eval('#overlay',o=>o.hidden)))break;
  const btn=await p.$('#meHand.active button.card');
  if(btn){await btn.click();moves++;if(moves===3&&!shot){await p.waitForTimeout(500);await p.screenshot({path:'loc'+N+'.png'});shot=true}}
  await p.waitForTimeout(150);
 }
 await p.waitForTimeout(800);
 console.log('N',N,'moves',moves,'end:',(await p.textContent('#panel')).slice(0,60),'errs',p.errs);
 await p.screenshot({path:'loc'+N+'end.png'});
 await p.context().close();
}
await b.close()})();
