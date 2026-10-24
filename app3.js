/* ================= online rooms ================= */
let roomCfg=Object.assign({N:2,duplo:true,show:'always',target:1},store('brisk-roomcfg')||{});
const nTeams=N=>N===4?2:N;
function openLobby(){
  gameOptionsForm($('roomForm'),roomCfg,el=>seg(el,'target','Meč do',[[1,'1 pobjede'],[2,'2 pobjede'],[3,'3 pobjede']],roomCfg));
  stopWatch('rooms');
  unsubs.rooms=Cloud.watchQuery('rooms',{where:['status','==','lobby'],limit:60},list=>{
    const el=$('roomList');
    if(!list){el.innerHTML='<p class="empty">Sobe se ne mogu učitati.</p>';return}
    const now=Date.now();list=list.filter(r=>now-(r.updatedAt||0)<3*3600e3).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    if(!list.length){el.innerHTML='<p class="empty">Nema otvorenih soba. Otvori svoju i pošalji poveznicu.</p>';return}
    el.innerHTML='';
    for(const r of list){
      const filled=r.seats.filter(Boolean).length,host=r.seats.find(s=>s&&s.uid===r.hostUid)||r.seats.find(Boolean)||{};
      const mine=r.seats.some(s=>s&&s.uid===Cloud.uid);
      const row=document.createElement('div');row.className='row';
      row.innerHTML='<img class="av" alt="" src="'+avSrc(host)+'"><div class="grow"><b>'+esc(r.name)+'</b><small>'+r.N+' igrača'+(r.N===2?(r.duplo?' · na duplo':' · klasično'):'')+(r.target>1?' · do '+r.target+' pobjede':'')+'</small></div><span class="pill">'+filled+'/'+r.N+'</span>';
      const b=document.createElement('button');b.className='btn small primary';b.textContent=mine?'Uđi':'Pridruži se';b.disabled=!mine&&filled>=r.N;b.onclick=()=>joinRoom(r.id);
      row.appendChild(b);el.appendChild(row);
    }
  });
}
$('roomCreate').onclick=async()=>{
  store('brisk-roomcfg',roomCfg);
  const id=Cloud.newId('rooms'),N=roomCfg.N;
  const seats=Array(N).fill(null);seats[0]=mySeatInfo();
  const R={name:P.name+' – soba',N,duplo:N===2?!!roomCfg.duplo:false,show:roomCfg.show,target:roomCfg.target,status:'lobby',hostUid:Cloud.uid,seats,
    wins:Array(nTeams(N)).fill(0),Sj:null,tour:null,createdAt:Date.now(),updatedAt:Date.now()};
  try{await Cloud.set('rooms/'+id,R);openRoom(id)}catch(e){toast('Soba se ne može otvoriti. Pokušaj ponovno.')}
};
async function joinRoom(id){
  try{
    const ok=await Cloud.txn(async(get,set)=>{
      const R=await get('rooms/'+id);if(!R)return 'gone';
      if(R.seats.some(s=>s&&s.uid===Cloud.uid))return 'in';
      if(R.status!=='lobby')return 'started';
      const i=R.seats.indexOf(null);if(i<0)return 'full';
      R.seats[i]=mySeatInfo();R.updatedAt=Date.now();set('rooms/'+id,R);return 'in';
    });
    if(ok==='in')openRoom(id);
    else toast(ok==='gone'?'Ta soba više ne postoji.':ok==='full'?'Soba je puna.':'Igra u toj sobi je već počela.');
  }catch(e){toast('Ne mogu ući u sobu. Pokušaj ponovno.')}
}
function openRoom(id){
  gClear();stopWatch('room');
  G={mode:'online',roomId:id,R:null,seats:[],me:-1,S:null,anim:{enter:null,drawn:new Set(),collect:null},lastChange:Date.now()};
  show('game');
  try{history.replaceState(null,'','#soba='+id)}catch(e){}
  unsubs.room=Cloud.watch('rooms/'+id,R=>onRoom(R));
  clearInterval(window.__wd);
  window.__wd=setInterval(()=>{ // take over when the host is gone
    if(!G||G.mode!=='online'||!G.R||G.me<0||isHost()||G.collecting)return;
    const stuck=G.R.status==='playing'&&(needsController()||(G.S&&G.S.phase==='over'));
    if(stuck&&Date.now()-G.lastChange>9000&&!gTimers.length){G.lastChange=Date.now();controllerAct(true)}
  },3000);
}
function onRoom(R){
  if(!G||G.mode!=='online')return;
  if(R===undefined)return;
  if(!R){toast('Soba je zatvorena.');show('lobby');return}
  const prevStatus=G.R&&G.R.status;
  G.R=R;G.seats=R.seats.map(s=>s||null);G.me=R.seats.findIndex(s=>s&&s.uid===Cloud.uid);
  if(R.status==='lobby'){gClear();G.S=null;renderWaiting();return}
  if(R.status==='closed'){endBeat(true);toast('Soba je zatvorena.');show('lobby');return}
  if(R.status==='playing'&&G.me>=0)startBeat(G.roomId);
  if(R.status==='done'&&startBeat.room===G.roomId)endBeat(true);
  const pk=R.seats.map(s=>s&&!s.bot?s.uid:'').join(',');if(pk!==G.presKey){G.presKey=pk;watchPresence()}
  if(R.Sj){
    const nS=JSON.parse(R.Sj);
    if(G.waitingShown){G.waitingShown=false;$('overlay').hidden=true}
    if(!G.S||nS.gid!==G.S.gid||nS.rev>G.S.rev){G.pending=false;setState(nS)}
    else{render();if(G.S.phase!=='over')step()}
  }
  if(R.status==='done'&&G.S&&G.S.phase==='over'&&$('overlay').hidden&&!G.doneShown){G.doneShown=true;showGameEnd(seatResult(G.S,Math.max(0,G.me)),G.lastAward||0)}
}
function renderWaiting(){
  const R=G.R,host=R.hostUid===Cloud.uid;
  G.waitingShown=true;
  let h='<h2>'+esc(R.name)+'</h2><p>'+R.N+' igrača'+(R.N===2?(R.duplo?', na duplo':', klasično'):'')+(R.N===4?', 2 na 2 (suigrači su mjesta 1 i 3, te 2 i 4)':'')+(R.target>1?', meč do '+R.target+' pobjede':'')+'</p><div class="seats">';
  R.seats.forEach((s,i)=>{
    h+='<div class="seatrow"><span class="pill'+(R.N===4?(i%2?' red':' blue'):'')+'">'+(i+1)+'</span>';
    if(s)h+='<img class="av" alt="" src="'+avSrc(s)+'"><div class="grow"><b>'+esc(s.name)+(s.uid===Cloud.uid?' (ti)':'')+'</b><small>'+(s.bot?'Bot, '+DIFF_N[s.diff||'hard']:s.uid===R.hostUid?'Domaćin':'Igrač')+'</small></div>'+(host&&s.bot?'<button class="btn small" data-rm="'+i+'">Ukloni</button>':'');
    else h+='<div class="grow"><small>Slobodno mjesto</small></div><button class="btn small ghost" data-mv="'+i+'">Sjedni</button>'+(host?'<button class="btn small" data-bot="'+i+'">Bot</button>':'');
    h+='</div>';
  });
  const full=R.seats.every(Boolean);
  h+='</div><div class="acts"><button class="btn" id="wLink">Kopiraj poveznicu za prijatelje</button>'+
    (host?'<button class="btn primary" id="wStart" '+(full?'':'disabled')+'>Kreni</button>'+(!full?'<button class="btn primary" id="wFill">Popuni botovima i kreni</button>':''):'<p>Čeka se da domaćin pokrene igru.</p>')+
    '<button class="btn ghost" id="wLeave">Napusti sobu</button></div>';
  $('panel').innerHTML=h;$('overlay').hidden=false;
  $('wLink').onclick=copyRoomLink;$('wLeave').onclick=leaveRoom;
  if($('wStart'))$('wStart').onclick=()=>startRoom(false);
  if($('wFill'))$('wFill').onclick=()=>startRoom(true);
  $('panel').querySelectorAll('[data-bot]').forEach(b=>b.onclick=()=>roomSeat(+b.dataset.bot,'bot'));
  $('panel').querySelectorAll('[data-mv]').forEach(b=>b.onclick=()=>roomSeat(+b.dataset.mv,'move'));
  $('panel').querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>roomSeat(+b.dataset.rm,null));
  $('status').textContent='Čeka se početak igre.';$('opps').innerHTML='';$('table').innerHTML='';$('meHand').innerHTML='';$('deckzone').innerHTML='';$('scoreChips').innerHTML='';
}
function copyRoomLink(){
  const url=location.origin+location.pathname+'#soba='+G.roomId;
  const done=()=>toast('Poveznica je kopirana. Pošalji je prijateljima.');
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(done,()=>prompt('Kopiraj poveznicu:',url));else prompt('Kopiraj poveznicu:',url);
}
async function roomSeat(i,what){
  const used=new Set(G.R.seats.filter(Boolean).map(s=>s.name));const name=shuffle(BOT_NAMES.filter(n=>!used.has(n)))[0];
  await Cloud.txn(async(get,set)=>{const R=await get('rooms/'+G.roomId);if(!R||R.status!=='lobby')return;
    if(what==='bot'&&!R.seats[i])R.seats[i]={uid:null,name,avatar:null,bot:true,diff:'hard',level:null};
    if(what===null&&R.seats[i]&&R.seats[i].bot)R.seats[i]=null;
    if(what==='move'&&!R.seats[i]){const j=R.seats.findIndex(s=>s&&s.uid===Cloud.uid);if(j>=0){R.seats[i]=R.seats[j];R.seats[j]=null}}
    R.updatedAt=Date.now();set('rooms/'+G.roomId,R)}).catch(()=>toast('Promjena nije spremljena.'));
}
async function startRoom(fill){
  await Cloud.txn(async(get,set)=>{const R=await get('rooms/'+G.roomId);if(!R||R.status!=='lobby')return;
    const used=new Set(R.seats.filter(Boolean).map(s=>s.name));const names=shuffle(BOT_NAMES.filter(n=>!used.has(n)));
    if(fill)R.seats=R.seats.map(s=>s||{uid:null,name:names.pop(),avatar:null,bot:true,diff:'hard',level:null});
    if(!R.seats.every(Boolean))return;
    const old=R.Sj?JSON.parse(R.Sj):null;
    R.Sj=JSON.stringify(newDeal({N:R.N,duplo:R.duplo,show:R.show},(Math.random()*R.N)|0,old?old.rev+1:1));
    R.status='playing';R.updatedAt=Date.now();set('rooms/'+G.roomId,R)}).catch(()=>toast('Igra se ne može pokrenuti.'));
}
async function commitOnline(nS){
  const base=G.S,id=G.roomId;G.pending=true;render();
  let ok=false;
  try{ok=await Cloud.txn(async(get,set)=>{
    const R=await get('rooms/'+id);if(!R||!R.Sj)return false;
    const cur=JSON.parse(R.Sj);if(cur.gid!==base.gid||cur.rev!==base.rev)return false;
    let T=null;
    if(nS.phase==='over'&&R.tour)T=await get('tournaments/'+R.tour.tid);
    R.Sj=JSON.stringify(nS);R.updatedAt=Date.now();
    let extra=[];
    if(nS.phase==='over'){
      R.wins=R.wins||Array(nTeams(R.N)).fill(0);
      for(let t=0;t<nTeams(R.N);t++){const seat=R.N===4?t:t;if(seatResult(nS,seat)===1)R.wins[t]++}
      if(R.wins.some(w=>w>=R.target)){R.status='done';
        if(T){const ws=R.wins.findIndex(w=>w>=R.target);extra=tourRecord(T,R.tour.tid,R.tour.mi,ws,R.wins.slice());}
      }
    }
    set('rooms/'+id,R);
    if(T&&extra){set('tournaments/'+R.tour.tid,T);for(const x of extra)set('rooms/'+x.id,x.data)}
    return true;
  })}catch(e){console.warn('commit',e)}
  if(!ok&&G){G.pending=false;render()}
}
async function nextGameOnline(){
  if(!G||!G.R)return;const id=G.roomId,gid=G.S&&G.S.gid;
  $('overlay').hidden=true;
  await Cloud.txn(async(get,set)=>{const R=await get('rooms/'+id);if(!R||R.status!=='playing'||!R.Sj)return;
    const cur=JSON.parse(R.Sj);if(cur.phase!=='over'||cur.gid!==gid)return;
    R.Sj=JSON.stringify(newDeal({N:R.N,duplo:R.duplo,show:R.show},(cur.starter+1)%R.N,cur.rev+1));R.updatedAt=Date.now();set('rooms/'+id,R)}).catch(()=>{});
}
async function leaveRoom(){
  const id=G&&G.roomId;if(!id){show('lobby');return}
  try{await Cloud.txn(async(get,set)=>{const R=await get('rooms/'+id);if(!R)return;
    const i=R.seats.findIndex(s=>s&&s.uid===Cloud.uid);if(i<0)return;
    if(R.status!=='lobby')return;            // mid-game the seat stays yours for a minute
    R.seats[i]=null;
    const humans=R.seats.filter(s=>s&&!s.bot);
    if(R.hostUid===Cloud.uid)R.hostUid=humans.length?humans[0].uid:null;
    if(!humans.length&&!R.tour)R.status='closed';
    R.updatedAt=Date.now();set('rooms/'+id,R)})}catch(e){}
  const playing=G&&G.R&&G.R.status==='playing'&&G.S&&G.S.phase!=='over';
  endBeat(!playing);
  try{history.replaceState(null,'',location.pathname)}catch(e){}
  if(playing){show('home');toast('Imaš 1 minutu da se vratiš u igru.')}else show(G&&G.R&&G.R.tour?'tours':'lobby');
}
