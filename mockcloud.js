// injected before page scripts; uses exposed __m(op,args)
window.__RETURN_MS=8000;window.__BEAT_MS=1000;window.__AWAY_MS=3000;
window.__CARD_BASE='http://t.test/cards/';
window.__CLOUD=(()=>{const C={ok:true,google:false};
 C.uid=sessionStorage.getItem('uid')||('u'+Math.random().toString(36).slice(2,8));sessionStorage.setItem('uid',C.uid);
 C.ready=Promise.resolve(C.uid);
 const call=(op,...a)=>window.__m(op,a);
 C.get=async p=>{const r=await call('get',p);return r?JSON.parse(r.d):null};
 C.set=async(p,d,merge)=>{await call('set',p,JSON.stringify(d),!!merge)};
 C.del=p=>call('del',p);
 C.newId=c=>Math.random().toString(36).slice(2,12);
 C.watch=(p,cb)=>{let last=-1,stop=false;const tick=async()=>{if(stop)return;const r=await call('get',p);const v=r?r.v:0;if(v!==last){last=v;cb(r?JSON.parse(r.d):null)}};tick();const i=setInterval(tick,120);return()=>{stop=true;clearInterval(i)}};
 C.watchQuery=(c,q,cb)=>{let last='',stop=false;const tick=async()=>{if(stop)return;const all=await call('list',c);const sig=all.map(x=>x.id+':'+x.v).join();if(sig===last)return;last=sig;
   let l=all.map(x=>Object.assign({id:x.id},JSON.parse(x.d)));if(q.where){const[f,op,v]=q.where;l=l.filter(x=>x[f]===v)}if(q.orderBy){const[f,d]=q.orderBy;l.sort((a,b)=>(d==='desc'?-1:1)*((a[f]||0)-(b[f]||0)))}if(q.limit)l=l.slice(0,q.limit);cb(l)};tick();const i=setInterval(tick,200);return()=>{stop=true;clearInterval(i)}};
 C.txn=async fn=>{for(let a=0;a<8;a++){const reads={},writes={};let wrote=false;
   const res=await fn(async p=>{if(wrote)throw new Error('read after write');const r=await call('get',p);reads[p]=r?r.v:0;return r?JSON.parse(r.d):null},(p,d)=>{wrote=true;writes[p]=JSON.stringify(d)});
   const ok=await call('commit',reads,writes);if(ok)return res;await new Promise(r=>setTimeout(r,30+Math.random()*60))}throw new Error('txn failed')};
 C.signInGoogle=async()=>{throw {code:'mock'}};
 return C})();
