// checks that the game screen fits phone screens with no scrolling or clipping
const {client,chromium}=require('./harness.js');
const sizes=process.env.SZ?JSON.parse(process.env.SZ):[[320,568],[360,640],[375,667],[390,844],[412,915],[360,560],[667,375],[844,390],[768,1024]];
const modes=[['2 duplo',2,true],['2',2,false],['3',3,false],['4',4,false]];
(async()=>{const b=await chromium.launch();let bad=0;
for(const [w,h] of sizes)for(const [name,N,dup] of modes){
 const p=await client(b,w,h,'F');await p.waitForTimeout(200);
 await p.click('[data-go=local]');
 await p.click('.seg[aria-label="Broj igrača"] button:text-is("'+(N===4?'4 (2 na 2)':String(N))+'")');
 if(N===2)await p.click('.seg[aria-label="Način (2 igrača)"] button:text-is("'+(dup?'Na duplo':'Klasično')+'")');
 await p.click('#localStart');await p.waitForTimeout(400);
 let worst=null;
 for(let k=0;k<(+process.env.K||300);k++){
  if(!(await p.$eval('#overlay',o=>o.hidden)))break;
  const m=await p.evaluate(()=>{const vw=innerWidth,vh=innerHeight,out=[];
   const de=document.documentElement;if(de.scrollWidth>vw+1||de.scrollHeight>vh+1)out.push('doc '+de.scrollWidth+'x'+de.scrollHeight);
   const g=document.getElementById('scr-game');if(g.scrollHeight>g.clientHeight+1||g.scrollWidth>g.clientWidth+1)out.push('game scroll '+g.scrollWidth+'x'+g.scrollHeight+' in '+g.clientWidth+'x'+g.clientHeight);
   for(const e of g.querySelectorAll('.card,.badge,.mini,.chip,.status,.trump-label,.deck-count,.who,.awaybar,.icon')){if(e.closest('[hidden]'))continue;const r=e.getBoundingClientRect();if(!r.width)continue;
     if(r.left<-1||r.top<-1||r.right>vw+1||r.bottom>vh+1)out.push(e.className.split(' ')[0]+' '+[r.left,r.top,r.right,r.bottom].map(Math.round).join(','))}
   // overlaps between hand and status / table
   const hand=document.getElementById('meHand').getBoundingClientRect(),st=document.getElementById('status').getBoundingClientRect(),tb=document.querySelector('.tablerow').getBoundingClientRect(),op=document.getElementById('opps').getBoundingClientRect();
   const cards=[...document.querySelectorAll('#meHand .card')].map(c=>c.getBoundingClientRect());
   if(cards.length&&Math.min(...cards.map(c=>c.top))<st.bottom-2)out.push('hand overlaps status');
   if(tb.top<op.bottom-2)out.push('table overlaps opps '+Math.round(op.bottom-tb.top));
   if(st.top<tb.bottom-2)out.push('status overlaps table '+Math.round(tb.bottom-st.top));
   return out});
  if(m.length&&!worst)worst=m.slice(0,4);
  const c=await p.$('#meHand.active button.card');if(c)await c.click();await p.waitForTimeout(40);
 }
 const cw=await p.evaluate(()=>getComputedStyle(document.getElementById('scr-game')).getPropertyValue('--cw'));
 if(worst)bad++;
 console.log(w+'x'+h,name.padEnd(8),'cw',parseFloat(cw).toFixed(0),worst?'BAD '+worst.join(' | '):'ok',p.errs.length?p.errs:'');
 if(process.env.SHOT)await p.screenshot({path:'fit_'+w+'x'+h+'_'+N+(dup?'d':'')+'.png'});
 await p.context().close();
}
console.log('bad',bad);await b.close()})();
