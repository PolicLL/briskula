const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const store=new Map();
function m(op,a){
 if(op==='get'){const r=store.get(a[0]);return r?{v:r.v,d:r.d}:null}
 if(op==='set'){const [p,d,merge]=a;const cur=store.get(p);let data=d;if(merge&&cur)data=JSON.stringify(Object.assign(JSON.parse(cur.d),JSON.parse(d)));store.set(p,{v:(cur?cur.v:0)+1,d:data});return true}
 if(op==='del'){store.delete(a[0]);return true}
 if(op==='list'){const c=a[0]+'/';return [...store.entries()].filter(([k])=>k.startsWith(c)&&k.split('/').length===2).map(([k,r])=>({id:k.split('/')[1],v:r.v,d:r.d}))}
 if(op==='commit'){const [reads,writes]=a;for(const p in reads){const r=store.get(p);if((r?r.v:0)!==reads[p])return false}for(const p in writes){const cur=store.get(p);store.set(p,{v:(cur?cur.v:0)+1,d:writes[p]})}return true}
}
// tests: node t_local.js (needs: npm i playwright)
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace('<script src="https://www.gstatic.com','<script>'+fs.readFileSync('mockcloud.js','utf8')+'</script><script data-x src="https://www.gstatic.com');
const cardDir=process.env.CARD_DIR||'';   // optional local copy of the card images
async function client(b,w,h,name){const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,hasTouch:w<600});
 await ctx.exposeFunction('__m',(op,a)=>m(op,a));
 await ctx.route(/gstatic|googleapis|wikimedia/,r=>r.abort());
 await ctx.route('http://t.test/**',r=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/cards/')){if(!cardDir)return r.fulfill({status:404,body:''});const f=path.join(cardDir,decodeURIComponent(u.pathname.slice(7)));return r.fulfill({body:fs.readFileSync(f),contentType:'image/jpeg'})}return r.fulfill({body:html,contentType:'text/html'})});
 const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('console',x=>{if(x.type()==='error'&&!/ERR_FAILED|net::|404/.test(x.text()))p.errs.push(x.text())});
 await p.goto('http://t.test/');p.name=name;return p}
module.exports={client,store,chromium};
