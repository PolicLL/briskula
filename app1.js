/* ================= basics ================= */
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function store(k,v){try{if(v===undefined)return JSON.parse(localStorage.getItem(k));localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let toastT;function toast(t,ms){const e=$('toast');e.textContent=t;e.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>e.hidden=true,ms||2600)}
const CARD_BASE='https://cdn.jsdelivr.net/gh/ivan17039/briskula-card-game@067eb1086bda501110d2cc885ad0a0711d85b95a/public/cards_img/';
const IMG=(()=>{const F={S:'Spadi',C:'Kupe',D:'Dinari',B:'Bati'},R={1:'As',10:'Fanat',11:'Konj',12:'Kralj'},o={};
  for(const s in F)for(const r of [1,2,3,4,5,6,7,10,11,12])o[s+r]=(window.__CARD_BASE||CARD_BASE)+F[s]+'/'+(R[r]||r)+F[s]+'.jpg';
  setTimeout(()=>{for(const k in o){const i=new Image();i.src=o[k]}},300);return o})();
const BOT_NAMES=['Ante','Mate','Jure','Šime','Frane','Duje','Roko','Ive','Stipe','Toni','Luce','Kate','Zlata','Ivka','Bepo','Nediljko','Marin','Tonći','Jakov','Paško','Vinko','Lovre','Dinko','Mile','Krste','Bariša','Jozo','Grgo','Petar','Dane','Nikša','Joško'];
const DIFF_N={easy:'lagan',normal:'srednji',hard:'jak'};
function hashCol(s){let h=0;for(const ch of String(s))h=(h*31+ch.charCodeAt(0))|0;const hues=[200,12,140,35,265,330,170,55];return 'hsl('+hues[Math.abs(h)%hues.length]+' 45% 42%)'}
function defAvatar(name,bot){
  const ini=bot?'B':(String(name||'?').trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?');
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="'+(bot?'#3b4652':hashCol(name))+'"/>'+
    (bot?'<rect x="18" y="22" width="28" height="22" rx="6" fill="#d8a74a"/><circle cx="27" cy="33" r="3.5" fill="#1b1a17"/><circle cx="37" cy="33" r="3.5" fill="#1b1a17"/><rect x="30" y="13" width="4" height="9" fill="#d8a74a"/>':
    '<text x="32" y="41" font-family="Georgia,serif" font-size="26" font-weight="700" fill="#f2e9d4" text-anchor="middle">'+esc(ini)+'</text>')+'</svg>';
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
const avSrc=p=>(p&&p.avatar)||defAvatar(p&&p.name,p&&p.bot);
const levelOf=pts=>Math.floor(Math.sqrt(Math.max(0,pts)/10))+1;
const levelFloor=l=>10*(l-1)*(l-1);

/* ================= profile ================= */
let P=Object.assign({name:'',avatar:null,points:0,games:0,wins:0,draws:0,tWins:0},store('brisk-profile')||{});
if(!P.name)P.name='Igrač '+(1000+Math.floor(Math.random()*9000));
function saveLocalProfile(){store('brisk-profile',P)}
saveLocalProfile();
const mySeatInfo=()=>({uid:Cloud.uid||null,name:P.name,avatar:P.avatar||null,level:levelOf(P.points),bot:false});
async function syncProfileFromCloud(){
  if(!Cloud.ok)return;
  try{
    const d=await Cloud.get('players/'+Cloud.uid);
    if(d){Object.assign(P,{name:d.name||P.name,avatar:d.avatar||null,points:d.points||0,games:d.games||0,wins:d.wins||0,draws:d.draws||0,tWins:d.tWins||0})}
    else await Cloud.set('players/'+Cloud.uid,{name:P.name,avatar:P.avatar||null,points:P.points,games:P.games,wins:P.wins,draws:P.draws||0,tWins:P.tWins||0,level:levelOf(P.points),updatedAt:Date.now()});
    saveLocalProfile();renderMe();
  }catch(e){console.warn('profile sync',e)}
}
async function addStats(d){ // d: {points,games,wins,draws,tWins}
  const apply=o=>{for(const k in d)o[k]=(o[k]||0)+d[k];o.level=levelOf(o.points);return o};
  if(Cloud.ok){
    try{await Cloud.txn(async(get,set)=>{const cur=await get('players/'+Cloud.uid)||{name:P.name,avatar:P.avatar||null};apply(cur);cur.name=P.name;cur.avatar=P.avatar||null;cur.updatedAt=Date.now();set('players/'+Cloud.uid,cur)})}
    catch(e){console.warn('stats',e)}
  }
  apply(P);saveLocalProfile();renderMe();
}
function renderMe(){
  $('meAv').src=avSrc(P);$('meName').textContent=P.name;$('meLv').textContent='Razina '+levelOf(P.points);
}

/* ================= navigation ================= */
const SCREENS=['home','local','lobby','tours','tour','lead','profile','rules','game'];
let CUR='home',unsubs={};
function stopWatch(k){if(unsubs[k]){try{unsubs[k]()}catch(e){}delete unsubs[k]}}
function show(name){
  if(CUR==='game'&&name!=='game')leaveGameView();
  if(CUR==='lobby'&&name!=='lobby')stopWatch('rooms');
  if(CUR==='lead')stopWatch('lead');
  if(CUR==='tour'&&name!=='tour')stopWatch('tour');
  CUR=name;
  for(const s of SCREENS)$('scr-'+s).hidden=s!==name;
  $('backBtn').hidden=name==='home';
  const titles={home:'Briškula',local:'Protiv botova',lobby:'Online',tours:'Turniri',tour:'Turnir',lead:'Rang lista',profile:'Profil',rules:'Pravila',game:'Briškula'};
  $('barTitle').textContent=titles[name];
  if(name==='lobby')openLobby();if(name==='tours')openTours();if(name==='lead')openLead();if(name==='profile')openProfile();if(name==='local')buildLocalForm();
  if(name==='game')sizeCards();
  if(name==='home')checkResume();
}
$('backBtn').onclick=()=>{if(CUR==='tour')show('tours');else if(CUR==='game')confirmLeaveGame();else show('home')};
$('meChip').onclick=()=>{if(CUR==='game')return toast('Profil je dostupan izvan igre.');show('profile')};
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{const g=b.dataset.go;if(['lobby','tours','lead'].includes(g)&&!Cloud.ok){toast('Online značajke trenutno nisu dostupne. Provjeri internet.');return}show(g)});

/* segmented controls */
function seg(container,key,label,opts,state,onchange){
  const w=document.createElement('div');w.innerHTML='<div class="seg-label">'+esc(label)+'</div>';
  const s=document.createElement('div');s.className='seg';s.setAttribute('role','group');s.setAttribute('aria-label',label);
  for(const [v,t] of opts){const b=document.createElement('button');b.type='button';b.textContent=t;b.setAttribute('aria-pressed',String(state[key]===v));
    b.onclick=()=>{state[key]=v;[...s.children].forEach(x=>x.setAttribute('aria-pressed','false'));b.setAttribute('aria-pressed','true');onchange&&onchange()};s.appendChild(b)}
  w.appendChild(s);container.appendChild(w);return w;
}
function gameOptionsForm(el,st,extra){
  el.innerHTML='';
  seg(el,'N','Broj igrača',[[2,'2'],[3,'3'],[4,'4 (2 na 2)']],st,()=>{dup.hidden=st.N!==2});
  const dup=seg(el,'duplo','Način (2 igrača)',[[true,'Na duplo'],[false,'Klasično']],st);dup.hidden=st.N!==2;
  seg(el,'show','Prikaz bodova',[['always','Uvijek'],['end','Tek pred kraj']],st);
  if(extra)extra(el);
}
