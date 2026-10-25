/* ================= settings: language, theme, ready-made characters, players online ================= */
function langButtons(el){
  el.innerHTML='';
  for(const [k,n] of LANGS){const b=document.createElement('button');b.type='button';b.textContent=n;b.lang=k;b.setAttribute('aria-pressed',String(k===LANG));
    b.onclick=()=>{if(k!==LANG)setLang(k)};el.appendChild(b)}
}
langButtons($('homeLangs'));
function renderSettings(){
  const el=$('pfSettings');
  el.innerHTML='<h3>'+TR('Postavke')+'</h3><div class="seg-label">'+TR('Jezik')+'</div><div class="seg" id="setLang" role="group" aria-label="'+TR('Jezik')+'"></div>'+
    '<div class="seg-label" style="margin-top:12px">'+TR('Tema')+'</div><div class="theme-pick" id="setTheme" role="group" aria-label="'+TR('Tema')+'"></div>';
  langButtons($('setLang'));
  const tp=$('setTheme');
  for(const k of Object.keys(THEMES)){
    const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed',String(k===THEME));
    b.innerHTML='<img alt="" loading="lazy" src="'+THEMES[k].thumb+'"><span>'+esc(TR(k==='split'?'Split':'Zadar'))+'</span>';
    b.onclick=()=>{applyTheme(k);[...tp.children].forEach(x=>x.setAttribute('aria-pressed',String(x===b)))};
    tp.appendChild(b);
  }
}
function renderAvPick(){
  const el=$('avPick');el.innerHTML='';
  for(const [id,name] of AVATARS){
    const v='av:'+id,b=document.createElement('button');b.type='button';b.title=TR(name);b.setAttribute('aria-label',TR(name));
    b.setAttribute('aria-pressed',String(pendingAvatar===v));
    b.innerHTML='<img alt="" src="'+AV_URL[v]+'">';
    b.onclick=()=>{pendingAvatar=v;$('pfAv').src=AV_URL[v];[...el.children].forEach(x=>x.setAttribute('aria-pressed',String(x===b)))};
    el.appendChild(b);
  }
}

/* players online: everyone with the page open marks "seen" once a minute */
const SEEN_MS=window.__SEEN_MS||60000,ONLINE_WINDOW=window.__ONLINE_WINDOW||150000;
let presenceT=null;
function markSeen(){if(Cloud.ok&&document.visibilityState!=='hidden')Cloud.set('players/'+Cloud.uid,{seen:Date.now()},true).catch(()=>{})}
async function refreshOnline(){
  if(!Cloud.ok)return;
  try{
    const l=await Cloud.query('players',{where:['seen','>',Date.now()-ONLINE_WINDOW],limit:500});
    const n=Math.max(1,l.length),el=$('onlineNow');
    el.querySelector('span').textContent=TR('Trenutno online:')+' '+n;el.hidden=false;
  }catch(e){console.warn('online',e)}
}
function startPresence(){
  if(presenceT||!Cloud.ok)return;
  markSeen();setTimeout(refreshOnline,800);
  presenceT=setInterval(()=>{markSeen();refreshOnline()},SEEN_MS);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){markSeen();refreshOnline()}});
}
