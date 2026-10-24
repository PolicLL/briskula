/* ================= tournaments ================= */
let tourCfg=Object.assign({size:8,target:1,duplo:true},store('brisk-tourcfg')||{});
const ROUND_N=n=>({2:'Finale',4:'Polufinale',8:'Četvrtfinale',16:'Osmina finala',32:'Šesnaestina finala'}[n]||'Kolo');
function openTours(){
  const f=$('tourForm');f.innerHTML='<label class="field">Naziv turnira<input id="tName" maxlength="32" placeholder="npr. Kup Konobe"></label>';
  seg(f,'size','Broj igrača',[[4,'4'],[8,'8'],[16,'16'],[32,'32']],tourCfg);
  seg(f,'target','Meč do',[[1,'1 pobjede'],[2,'2 pobjede'],[3,'3 pobjede']],tourCfg);
  seg(f,'duplo','Način',[[true,'Na duplo'],[false,'Klasično']],tourCfg);
  stopWatch('tours');
  unsubs.tours=Cloud.watchQuery('tournaments',{orderBy:['createdAt','desc'],limit:30},list=>{
    const el=$('tourList');if(!list){el.innerHTML='<p class="empty">Turniri se ne mogu učitati.</p>';return}
    if(!list.length){el.innerHTML='<p class="empty">Još nema turnira. Otvori prvi.</p>';return}
    el.innerHTML='';
    for(const T of list){
      const row=document.createElement('div');row.className='row';
      const st=T.status==='signup'?'<span class="pill green">Prijave '+T.entrants.length+'/'+T.size+'</span>':T.status==='running'?'<span class="pill">U tijeku</span>':'<span class="pill blue">Završen</span>';
      row.innerHTML='<div class="grow"><b>'+esc(T.name)+'</b><small>'+T.size+' igrača · '+(T.duplo?'na duplo':'klasično')+' · meč do '+T.target+(T.status==='done'&&T.champion!=null?' · prvak: '+esc(T.entrants[T.champion].name):'')+'</small></div>'+st;
      const b=document.createElement('button');b.className='btn small';b.textContent='Otvori';b.onclick=()=>{show('tour');openTour(T.id)};row.appendChild(b);el.appendChild(row);
    }
  });
}
$('tourCreate').onclick=async()=>{
  store('brisk-tourcfg',tourCfg);
  const name=($('tName').value.trim()||('Turnir '+P.name)).slice(0,32);
  const id=Cloud.newId('tournaments');
  const T={name,size:tourCfg.size,target:tourCfg.target,duplo:tourCfg.duplo,status:'signup',createdBy:Cloud.uid,createdAt:Date.now(),
    entrants:[Object.assign(mySeatInfo(),{bot:false})],matches:[],round:0,champion:null,awarded:{}};
  try{await Cloud.set('tournaments/'+id,T);show('tour');openTour(id)}catch(e){toast('Turnir se ne može otvoriti.')}
};
function seatFromEntrant(e){return e.bot?{uid:null,name:e.name,avatar:null,bot:true,diff:e.diff||'hard',level:null}:{uid:e.uid,name:e.name,avatar:e.avatar||null,level:e.level||1,bot:false}}
function simulateSeries(target,duplo){ // bot vs bot: play real (fast) games
  const w=[0,0],score=[0,0];let g=0;
  while(w[0]<target&&w[1]<target&&g<15){let S=newDeal({N:2,duplo},g%2,1);
    while(S.phase!=='over'){if(S.phase==='resolve'){S=applyResolve(S);continue}const s=seatToPlay(S);S=applyPlay(S,s,heur(S.hands[s],S.table.map(x=>x.c),S.leader,s,S.ts,2,S.k,.15))}
    const r=seatResult(S,0);if(r===1)w[0]++;else if(r===0)w[1]++;g++}
  if(w[0]===w[1])w[Math.random()<.5?0:1]=target;
  return w;
}
// fills in automatic matches and opens rooms for human ones; returns rooms to create
function tourAdvance(T,tid){
  const rooms=[];
  while(true){
    const ms=T.matches.map((m,i)=>Object.assign(m,{_i:i})).filter(m=>m.r===T.round);
    for(const m of ms){
      if(m.w!=null||m.room)continue;
      const A=T.entrants[m.a],B=T.entrants[m.b];
      if(A.bot&&B.bot){const sc=simulateSeries(T.target,T.duplo);m.score=sc;m.w=sc[0]>sc[1]?m.a:m.b;continue}
      const id=Cloud.newId('rooms');
      const S=newDeal({N:2,duplo:T.duplo,show:'always'},(Math.random()*2)|0,1);
      rooms.push({id,data:{name:T.name+' · '+ROUND_N(T.size>>T.round),N:2,duplo:T.duplo,show:'always',target:T.target,status:'playing',
        hostUid:A.bot?B.uid:A.uid,seats:[seatFromEntrant(A),seatFromEntrant(B)],wins:[0,0],Sj:JSON.stringify(S),tour:{tid,mi:m._i},createdAt:Date.now(),updatedAt:Date.now()}});
      m.room=id;
    }
    T.matches.forEach(m=>delete m._i);
    if(!ms.every(m=>m.w!=null))break;
    const winners=ms.map(m=>m.w);
    if(winners.length===1){T.champion=winners[0];T.status='done';break}
    T.round++;
    for(let i=0;i<winners.length;i+=2)T.matches.push({r:T.round,a:winners[i],b:winners[i+1],w:null,room:null,score:null});
  }
  return rooms;
}
function tourRecord(T,tid,mi,winSeat,score){ // called inside a transaction with T loaded
  const m=T.matches[mi];if(!m||m.w!=null)return [];
  m.w=winSeat===0?m.a:m.b;m.score=score;
  return tourAdvance(T,tid);
}
let TOUR=null;
function openTour(tid){
  stopWatch('tour');$('scr-tour').innerHTML='<p class="empty">Učitavam…</p>';
  unsubs.tour=Cloud.watch('tournaments/'+tid,T=>{if(T===undefined)return;if(!T){$('scr-tour').innerHTML='<p class="empty">Turnir ne postoji.</p>';return}TOUR=Object.assign({id:tid},T);renderTour();maybeAward()});
}
function renderTour(){
  const T=TOUR,el=$('scr-tour'),me=Cloud.uid;
  const myIdx=T.entrants.findIndex(e=>e.uid===me);
  let h='<h2>'+esc(T.name)+'</h2><p class="fine" style="margin-top:-6px">'+T.size+' igrača · '+(T.duplo?'na duplo':'klasično')+' · meč do '+T.target+' pobjede · prvak dobiva '+T.size*5+' bodova</p>';
  if(T.status==='done'&&T.champion!=null){const c=T.entrants[T.champion];h+='<div class="notice"><span><b>Prvak: '+esc(c.name)+'</b>'+(c.uid===me?' (to si ti!)':'')+'</span></div>'}
  if(T.status==='signup'){
    h+='<div class="card-box"><h3>Prijavljeni ('+T.entrants.length+'/'+T.size+')</h3><div class="list">';
    T.entrants.forEach(e=>{h+='<div class="row"><img class="av" alt="" src="'+avSrc(e)+'"><div class="grow"><b>'+esc(e.name)+(e.uid===me?' (ti)':'')+'</b><small>Razina '+(e.level||1)+'</small></div></div>'});
    h+='</div><p class="fine">Prazna mjesta popunit će botovi kad organizator pokrene turnir.</p><div class="acts" style="display:grid;gap:8px">';
    if(myIdx<0&&T.entrants.length<T.size)h+='<button class="btn primary" id="tJoin">Prijavi se</button>';
    if(myIdx>=0&&T.createdBy!==me)h+='<button class="btn" id="tLeave">Odjavi se</button>';
    if(T.createdBy===me)h+='<button class="btn primary" id="tStart">Pokreni turnir'+(T.entrants.length<T.size?' (botovi popune '+(T.size-T.entrants.length)+')':'')+'</button>';
    h+='<button class="btn" id="tLink">Kopiraj poveznicu turnira</button></div></div>';
  }
  if(T.matches.length){
    const mine=T.matches.find(m=>m.r===T.round&&m.w==null&&m.room&&(T.entrants[m.a].uid===me||T.entrants[m.b].uid===me));
    if(mine&&T.status==='running')h+='<div class="notice"><span><b>Tvoj meč je spreman.</b> '+esc(ROUND_N(T.size>>T.round))+'</span><button class="btn primary small" id="tPlay">Igraj</button></div>';
    h+='<h3 class="sec">Ždrijeb</h3><div class="bracket">';
    const rounds=Math.log2(T.size);
    for(let r=0;r<rounds;r++){
      const ms=T.matches.filter(m=>m.r===r);
      h+='<div class="round"><h4>'+ROUND_N(T.size>>r)+'</h4>';
      if(!ms.length){for(let i=0;i<(T.size>>(r+1));i++)h+='<div class="match"><div class="p"><span>—</span></div><div class="p"><span>—</span></div></div>'}
      for(const m of ms){const A=T.entrants[m.a],B=T.entrants[m.b],my=A.uid===me||B.uid===me;
        const pl=(E,idx,si)=>'<div class="p'+(m.w===idx?' w':'')+'"><span>'+esc(E.name)+(E.uid===me?' (ti)':'')+'</span><span>'+(m.score?m.score[si]:(m.room&&m.w==null?'•':''))+'</span></div>';
        h+='<div class="match'+(my?' mine':'')+'">'+pl(A,m.a,0)+pl(B,m.b,1)+'</div>'}
      h+='</div>';
    }
    h+='</div>';
  }
  el.innerHTML=h;
  const on=(id,fn)=>{const b=$(id);if(b)b.onclick=fn};
  on('tJoin',()=>tourSignup(true));on('tLeave',()=>tourSignup(false));on('tStart',tourStart);
  on('tLink',()=>{const url=location.origin+location.pathname+'#turnir='+T.id;(navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(()=>toast('Poveznica turnira je kopirana.'),()=>prompt('Kopiraj poveznicu:',url))});
  on('tPlay',()=>{const m=T.matches.find(m=>m.r===T.round&&m.w==null&&m.room&&(T.entrants[m.a].uid===me||T.entrants[m.b].uid===me));if(m)openRoom(m.room)});
}
async function tourSignup(join){
  const tid=TOUR.id;
  const res=await Cloud.txn(async(get,set)=>{const T=await get('tournaments/'+tid);if(!T||T.status!=='signup')return 'closed';
    const i=T.entrants.findIndex(e=>e.uid===Cloud.uid);
    if(join){if(i>=0)return 'ok';if(T.entrants.length>=T.size)return 'full';T.entrants.push(Object.assign(mySeatInfo(),{bot:false}))}
    else{if(i<0)return 'ok';T.entrants.splice(i,1)}
    set('tournaments/'+tid,T);return 'ok'}).catch(()=>'err');
  if(res!=='ok')toast(res==='full'?'Turnir je popunjen.':res==='closed'?'Prijave su zatvorene.':'Pokušaj ponovno.');
}
async function tourStart(){
  const tid=TOUR.id;
  await Cloud.txn(async(get,set)=>{const T=await get('tournaments/'+tid);if(!T||T.status!=='signup'||T.createdBy!==Cloud.uid)return;
    const used=new Set(T.entrants.map(e=>e.name));const names=shuffle(BOT_NAMES.filter(n=>!used.has(n)));
    while(T.entrants.length<T.size)T.entrants.push({uid:null,name:'Bot '+(names.pop()||T.entrants.length),avatar:null,bot:true,diff:Math.random()<.5?'hard':'normal'});
    shuffle(T.entrants);
    T.matches=[];for(let i=0;i<T.size;i+=2)T.matches.push({r:0,a:i,b:i+1,w:null,room:null,score:null});
    T.round=0;T.status='running';
    const rooms=tourAdvance(T,tid);
    set('tournaments/'+tid,T);for(const r of rooms)set('rooms/'+r.id,r.data);
  }).catch(e=>{console.warn(e);toast('Turnir se ne može pokrenuti.')});
}
async function maybeAward(){
  const T=TOUR;if(!T||T.status!=='done'||T.champion==null||!Cloud.uid)return;
  const fin=T.matches.find(m=>m.r===Math.log2(T.size)-1);if(!fin)return;
  const meIdx=T.entrants.findIndex(e=>e.uid===Cloud.uid);if(meIdx<0||(T.awarded||{})[Cloud.uid])return;
  let pts=0,tw=0;if(meIdx===T.champion){pts=T.size*5;tw=1}else if(meIdx===fin.a||meIdx===fin.b)pts=T.size*2;
  if(!pts)return;
  const ok=await Cloud.txn(async(get,set)=>{const T2=await get('tournaments/'+T.id);const pl=await get('players/'+Cloud.uid)||{name:P.name};
    if(!T2||(T2.awarded||{})[Cloud.uid])return false;T2.awarded=Object.assign({},T2.awarded,{[Cloud.uid]:true});
    pl.points=(pl.points||0)+pts;pl.tWins=(pl.tWins||0)+tw;pl.level=levelOf(pl.points);pl.name=P.name;pl.updatedAt=Date.now();
    set('tournaments/'+T.id,T2);set('players/'+Cloud.uid,pl);return true}).catch(()=>false);
  if(ok){P.points+=pts;P.tWins=(P.tWins||0)+tw;saveLocalProfile();renderMe();toast((tw?'Osvojio si turnir! ':'Finale! ')+'+'+pts+' bodova')}
}
function watchMyTournaments(){
  stopWatch('mytours');
  unsubs.mytours=Cloud.watchQuery('tournaments',{where:['status','==','running'],limit:30},list=>{
    const n=$('homeNotice');if(!list){n.hidden=true;return}
    const me=Cloud.uid;const hit=list.find(T=>T.matches.some(m=>m.r===T.round&&m.w==null&&m.room&&(T.entrants[m.a].uid===me||T.entrants[m.b].uid===me)));
    if(!hit){n.hidden=true;return}
    n.hidden=false;n.innerHTML='<span><b>Turnir „'+esc(hit.name)+'“:</b> tvoj meč je spreman.</span><button class="btn primary small" id="hnGo">Otvori</button>';
    $('hnGo').onclick=()=>{show('tour');openTour(hit.id)};
  });
}

/* ================= leaderboard ================= */
function openLead(){
  stopWatch('lead');
  const tb=$('leadTable').querySelector('tbody');tb.innerHTML='<tr><td colspan="6" class="n">Učitavam…</td></tr>';
  unsubs.lead=Cloud.watchQuery('players',{orderBy:['points','desc'],limit:100},list=>{
    if(!list){tb.innerHTML='<tr><td colspan="6" class="n">Rang lista se ne može učitati.</td></tr>';return}
    tb.innerHTML='';
    list.forEach((p,i)=>{const tr=document.createElement('tr');if(p.id===Cloud.uid)tr.className='me';
      tr.innerHTML='<td class="n">'+(i+1)+'</td><td><span class="who"><img class="av" alt="" src="'+avSrc(p)+'">'+esc(p.name||'Igrač')+'</span></td><td><span class="pill">'+levelOf(p.points||0)+'</span></td><td class="hide-s">'+(p.games||0)+'</td><td>'+(p.wins||0)+'</td><td><b>'+(p.points||0)+'</b></td>';
      tb.appendChild(tr)});
    if(!list.length)tb.innerHTML='<tr><td colspan="6" class="n">Još nitko nije igrao.</td></tr>';
  });
}

/* ================= profile screen ================= */
let pendingAvatar;
function openProfile(){
  pendingAvatar=P.avatar||null;
  $('pfAv').src=avSrc(P);$('pfName').value=P.name;
  const l=levelOf(P.points),a=levelFloor(l),b=levelFloor(l+1);
  $('pfLevel').textContent='Razina '+l;$('pfPts').textContent=P.points+' bodova';$('pfBar').style.width=Math.round(100*(P.points-a)/(b-a))+'%';$('pfNext').textContent='Još '+(b-P.points)+' do razine '+(l+1);
  $('pfStats').innerHTML=[['Partije',P.games],['Pobjede',P.wins],['Uspješnost',P.games?Math.round(100*P.wins/P.games)+'%':'—'],['Turniri',P.tWins||0]].map(([k,v])=>'<div class="stat"><b>'+v+'</b><small>'+k+'</small></div>').join('');
  const acc=$('pfAccount');
  if(!Cloud.ok)acc.innerHTML='<p class="fine" style="margin:0">Bez veze s poslužiteljem profil se sprema samo na ovom uređaju.</p>';
  else if(Cloud.google)acc.innerHTML='<h3>Račun</h3><p class="fine" style="margin:0">Povezano s Google računom'+(Cloud.email?' ('+esc(Cloud.email)+')':'')+'. Isti profil imaš na svakom uređaju.</p>';
  else{acc.innerHTML='<h3>Isti profil na mobitelu i laptopu</h3><p class="fine" style="margin:0 0 10px">Poveži Google račun, pa se na drugom uređaju prijavi istim računom.</p><button class="btn wide" id="pfGoogle">Poveži Google račun</button>';
    $('pfGoogle').onclick=async()=>{try{await Cloud.signInGoogle();await syncProfileFromCloud();openProfile();toast('Google račun je povezan.')}catch(e){toast('Povezivanje nije uspjelo'+(e&&e.code?' ('+e.code+')':'')+'.')}}}
}
$('avFile').onchange=e=>{
  const f=e.target.files&&e.target.files[0];if(!f)return;
  const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=c.height=112;const x=c.getContext('2d');const s=Math.min(img.width,img.height);
    x.drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,112,112);pendingAvatar=c.toDataURL('image/jpeg',.82);$('pfAv').src=pendingAvatar;URL.revokeObjectURL(img.src)};
  img.onerror=()=>toast('Ta slika se ne može učitati.');img.src=URL.createObjectURL(f);e.target.value='';
};
$('avReset').onclick=()=>{pendingAvatar=null;$('pfAv').src=defAvatar($('pfName').value||P.name)};
$('pfSave').onclick=async()=>{
  const n=$('pfName').value.trim().slice(0,18);if(!n){toast('Upiši ime.');return}
  P.name=n;P.avatar=pendingAvatar;saveLocalProfile();renderMe();
  if(Cloud.ok){try{await Cloud.set('players/'+Cloud.uid,{name:P.name,avatar:P.avatar||null,updatedAt:Date.now()},true)}catch(e){toast('Spremljeno samo na ovom uređaju.');return}}
  toast('Profil je spremljen.');
};
