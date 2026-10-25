/* ================= leaving a game and coming back (1 minute to return) ================= */
const RETURN_MS=window.__RETURN_MS||60000,BEAT_MS=window.__BEAT_MS||10000,AWAY_AFTER=window.__AWAY_MS||25000;
let beatT=null,PRES={};
const fmtLeft=ms=>{const s=Math.max(0,Math.ceil(ms/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};

// my own heartbeat while I sit at an online table
function startBeat(roomId){
  if(beatT&&startBeat.room===roomId)return;
  clearInterval(beatT);startBeat.room=roomId;
  const beat=()=>{if(Cloud.ok)Cloud.set('players/'+Cloud.uid,{activeRoom:roomId,hb:Date.now(),leftAt:null},true).catch(()=>{})};
  beat();beatT=setInterval(beat,BEAT_MS);
}
function endBeat(clearRoom){
  clearInterval(beatT);beatT=null;startBeat.room=null;
  if(Cloud.ok)Cloud.set('players/'+Cloud.uid,clearRoom?{activeRoom:null,hb:0,leftAt:null}:{hb:0,leftAt:Date.now()},true).catch(()=>{});
}
addEventListener('pagehide',()=>{if(beatT)endBeat(false);if(G&&G.mode==='local')saveLocalGame(true)});

// the other humans at the table
function watchPresence(){
  for(const k of Object.keys(unsubs))if(k.startsWith('pres:'))stopWatch(k);
  PRES={};
  if(!G||!G.R)return;
  G.R.seats.forEach(s=>{
    if(!s||s.bot||!s.uid||s.uid===Cloud.uid)return;
    const uid=s.uid;PRES[uid]={hb:undefined,seenAt:Date.now(),awaySince:null};
    unsubs['pres:'+uid]=Cloud.watch('players/'+uid,d=>{
      const p=PRES[uid];if(!p||!d||!G)return;
      const gone=d.hb===0||d.activeRoom!==G.roomId;
      if(d.hb!==p.hb||gone!==!!p.awaySince){p.hb=d.hb;p.seenAt=Date.now();p.awaySince=gone?(p.awaySince||Date.now()):null}
    });
  });
}
function awayList(){
  const now=Date.now(),out=[];
  if(!G||G.mode!=='online'||!G.R||G.R.status!=='playing'||!G.S||G.S.phase==='over')return out;
  G.R.seats.forEach((s,i)=>{const p=s&&PRES[s.uid];if(!p)return;
    let since=p.awaySince;if(!since&&now-p.seenAt>AWAY_AFTER)since=p.seenAt;
    if(since)out.push({seat:i,name:s.name,left:RETURN_MS-(now-since)})});
  return out;
}
setInterval(()=>{
  const bar=$('awayBar');
  if(!G||G.mode!=='online'||G.me<0){bar.hidden=true;return}
  const a=awayList();
  if(!a.length){bar.hidden=true;return}
  const x=a.sort((p,q)=>p.left-q.left)[0];
  const mine=G.S.N===4&&x.seat%2===G.me%2;
  bar.hidden=false;
  bar.innerHTML='<b>'+esc(x.name)+TR('</b> je izašao iz igre. Ima još <b class="cd">')+fmtLeft(x.left)+TR('</b> da se vrati')+(mine?TR(', inače vaš par gubi.'):TR(', inače pobjeđujete.'));
  if(x.left<=0&&!G.forfeitSent){G.forfeitSent=true;forfeitSeat(x.seat)}
},1000);
async function forfeitSeat(seat){
  const id=G.roomId,gid=G.S&&G.S.gid;
  try{await Cloud.txn(async(get,set)=>{
    const R=await get('rooms/'+id);if(!R||R.status!=='playing'||!R.Sj)return;
    const S=JSON.parse(R.Sj);if(S.gid!==gid||S.phase==='over')return;
    const T=R.tour?await get('tournaments/'+R.tour.tid):null;
    S.phase='over';S.forfeit=seat;S.rev++;
    R.wins=R.wins||Array(nTeams(R.N)).fill(0);
    const lose=R.N===4?seat%2:seat;
    for(let t=0;t<nTeams(R.N);t++)if(t!==lose)R.wins[t]=Math.max(R.wins[t],R.target);
    R.status='done';R.Sj=JSON.stringify(S);R.updatedAt=Date.now();
    let extra=[];if(T&&R.N===2)extra=tourRecord(T,R.tour.tid,R.tour.mi,1-seat,R.wins.slice());
    set('rooms/'+id,R);if(T){set('tournaments/'+R.tour.tid,T);for(const x of extra)set('rooms/'+x.id,x.data)}
  })}catch(e){console.warn('forfeit',e);G&&(G.forfeitSent=false)}
}

// local games against bots are kept for a minute too
function saveLocalGame(leaving){
  if(!G||G.mode!=='local'||!G.S)return;
  if(G.S.phase==='over'){store('brisk-localgame',null);return}
  store('brisk-localgame',{cfg:G.cfg,seats:G.seats,S:G.S,ts:Date.now(),left:!!leaving});
}
setInterval(()=>{if(G&&G.mode==='local'&&CUR==='game')saveLocalGame(false)},BEAT_MS);
function resumeLocal(L){
  gClear();
  G={mode:'local',cfg:L.cfg,seats:L.seats,me:0,S:null,anim:{enter:null,drawn:new Set(),collect:null}};
  show('game');setState(L.S,true);
}

// the "continue your game" card on the home screen
let resumeInfo=null,resumeT=null;
async function checkResume(){
  resumeInfo=null;
  const L=store('brisk-localgame');
  if(L&&L.S&&L.S.phase!=='over'){
    const left=RETURN_MS-(Date.now()-L.ts);
    if(left>0)resumeInfo={kind:'local',L,deadline:L.ts+RETURN_MS};
    else{store('brisk-localgame',null);addStats({points:1,games:1,wins:0,draws:0});toast(TR('Nedovršena partija protiv botova se računa kao poraz.'))}
  }
  if(!resumeInfo&&Cloud.ok){
    try{
      const me=await Cloud.get('players/'+Cloud.uid);
      if(me&&me.activeRoom){
        const R=await Cloud.get('rooms/'+me.activeRoom);
        const seat=R?R.seats.findIndex(s=>s&&s.uid===Cloud.uid):-1;
        const S=R&&R.Sj?JSON.parse(R.Sj):null;
        if(R&&R.status==='playing'&&seat>=0&&S&&S.phase!=='over'){
          const since=me.leftAt||me.hb||Date.now(),left=RETURN_MS-(Date.now()-since);
          if(left>0)resumeInfo={kind:'online',id:me.activeRoom,name:R.name,deadline:since+RETURN_MS};
          else{const humans=R.seats.filter((s,i)=>s&&!s.bot&&i!==seat).length;
            if(!humans){G={mode:'online',roomId:me.activeRoom,R,S,seats:R.seats,me:seat};await forfeitSeat(seat);G=null}
            Cloud.set('players/'+Cloud.uid,{activeRoom:null},true).catch(()=>{});toast(TR('Nisi se vratio u igru na vrijeme, pa se računa kao poraz.'))}
        }else if(!R||R.status!=='playing'){
          if(S&&S.forfeit===seat){const done=store('brisk-counted')||[];if(!done.includes(S.gid)){done.push(S.gid);store('brisk-counted',done.slice(-80));addStats({points:0,games:1,wins:0,draws:0});toast(TR('Nisi se vratio u igru na vrijeme, pa se računa kao poraz.'))}}
          Cloud.set('players/'+Cloud.uid,{activeRoom:null},true).catch(()=>{});
        }
      }
    }catch(e){console.warn('resume',e)}
  }
  renderResume();
}
function renderResume(){
  clearInterval(resumeT);
  const el=$('resumeNotice');
  if(!resumeInfo||CUR!=='home'){el.hidden=true;return}
  const draw=()=>{
    const left=resumeInfo.deadline-Date.now();
    if(left<=0){el.hidden=true;clearInterval(resumeT);const r=resumeInfo;resumeInfo=null;if(r.kind==='local'){store('brisk-localgame',null);addStats({points:1,games:1,wins:0,draws:0})}return}
    el.hidden=false;
    el.innerHTML=TR('<span><b>Nedovršena igra')+(resumeInfo.kind==='online'?': '+esc(resumeInfo.name):TR(' protiv botova'))+TR('</b><br><small>Vrati se za <b class="cd">')+fmtLeft(left)+TR('</b> ili gubiš partiju.</small></span><button class="btn primary small" id="resumeGo">Nastavi igru</button>');
    $('resumeGo').onclick=()=>{const r=resumeInfo;resumeInfo=null;clearInterval(resumeT);el.hidden=true;if(r.kind==='local')resumeLocal(r.L);else openRoom(r.id)};
  };
  draw();resumeT=setInterval(draw,1000);
}
