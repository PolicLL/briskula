/* ================= game controller (local + online share it) ================= */
let G=null;   // {mode,seats,me,S,cfg,roomId,R,anim,...}
let gTimers=[];
const gLater=(fn,ms)=>{gTimers.push(setTimeout(fn,ms))};
const gClear=()=>{gTimers.forEach(clearTimeout);gTimers=[]};

/* ---- local games ---- */
let localCfg=Object.assign({N:2,duplo:true,show:'always',diff:'hard'},store('brisk-localcfg')||{});
function buildLocalForm(){gameOptionsForm($('localForm'),localCfg,el=>seg(el,'diff',TR('Botovi'),[['easy',TR('Lagani')],['normal',TR('Srednji')],['hard',TR('Jaki')]],localCfg))}
$('localStart').onclick=()=>{store('brisk-localcfg',localCfg);startLocal(localCfg)};
function botSeat(i,diff){const used=new Set();let n;do{n=BOT_NAMES[(Math.random()*BOT_NAMES.length)|0]}while(used.has(n));return {uid:null,name:n,avatar:null,bot:true,diff:diff||'hard',level:null}}
function startLocal(cfg){
  gClear();store('brisk-localgame',null);
  const names=shuffle(BOT_NAMES.slice());
  const seats=[mySeatInfo()];for(let i=1;i<cfg.N;i++)seats.push({uid:null,name:names[i],avatar:null,bot:true,diff:cfg.diff});
  G={mode:'local',cfg:Object.assign({},cfg),seats,me:0,S:null,anim:{enter:null,drawn:new Set(),collect:null},series:null,countedGids:new Set()};
  show('game');
  setState(newDeal(cfg,(Math.random()*cfg.N)|0,1));
}

/* ---- state pipeline with animations ---- */
function setState(nS,force){
  if(!G)return;
  const prev=G.S;
  if(!force&&prev&&nS.gid===prev.gid&&nS.rev<=prev.rev)return;
  if(G.collecting){G.pendingState=nS;return}
  if(prev&&prev.gid===nS.gid&&prev.phase==='resolve'&&nS.table.length===0&&prev.table.length){
    G.collecting=true;G.anim.collect=trickWinner(prev);G.anim.enter=null;render();
    setTimeout(()=>{if(!G)return;G.collecting=false;G.anim.collect=null;const p=G.pendingState||nS;G.pendingState=null;applyNow(prev,p)},460);
    return;
  }
  applyNow(prev,nS);
}
function applyNow(prev,nS){
  const me=G.me>=0?G.me:0;
  if(prev&&prev.gid===nS.gid){
    const was=new Set(prev.hands[me]);G.anim.drawn=new Set(nS.hands[me].filter(c=>!was.has(c)));
    const last=nS.table[nS.table.length-1];G.anim.enter=(last&&!prev.table.some(x=>x.c===last.c))?last.c:null;
  }else{G.anim={enter:null,drawn:new Set(nS.hands[me]),collect:null};$('overlay').hidden=true;$('meHand').innerHTML='';$('table').innerHTML='';$('table').dataset.n=''}
  G.S=nS;G.lastChange=Date.now();
  if(G.mode==='local')saveLocalGame(false);
  render();
  if(nS.phase==='over')onGameOver();
  step();
}
const isHost=()=>G.mode==='local'||(G.R&&G.R.hostUid===Cloud.uid);
function needsController(){
  const S=G.S;if(!S)return false;
  if(S.phase==='resolve')return true;
  if(S.phase==='play'){const s=seatToPlay(S);return !!(G.seats[s]&&G.seats[s].bot)}
  return false;
}
function step(){
  gClear();
  if(!G||!G.S||G.collecting)return;
  if(G.mode==='online'&&G.R&&G.R.status!=='playing')return;
  if(!isHost())return;              // the watchdog covers a missing host
  controllerAct(false);
}
function controllerAct(now){
  const S=G.S;if(!S)return;
  if(S.phase==='resolve'){gLater(()=>{if(G&&G.S===S)commit(applyResolve(S))},now?50:(S.N*S.k>=3?1300:1100));return}
  if(S.phase==='play'){const s=seatToPlay(S),st=G.seats[s];
    if(st&&st.bot)gLater(()=>{if(!G||G.S!==S)return;const c=botChoose(S,s,st.diff||'hard');commit(applyPlay(S,s,c))},now?50:(st.diff==='hard'?240:650));
    return}
  if(S.phase==='over'&&G.mode==='online'&&G.R&&G.R.status==='playing')gLater(()=>{if(G&&G.S===S)nextGameOnline()},now?50:9000);
}
function commit(nS){
  if(!nS||!G)return;
  if(G.mode==='local')return setState(nS);
  commitOnline(nS);
}
function humanPlay(c){
  const S=G.S;if(!S||S.phase!=='play'||seatToPlay(S)!==G.me||G.pending)return;
  commit(applyPlay(S,G.me,c));
}

/* ---- game over, stats, series ---- */
function onGameOver(){
  const S=G.S;if(G.me<0)return;
  const key='brisk-counted';const done=store(key)||[];
  const r=seatResult(S,G.me);let award=0;
  if(!done.includes(S.gid)){
    const humans=G.seats.filter((s,i)=>i!==G.me&&s&&!s.bot).length;
    if(humans>0)award=r===1?15:r===.5?4:1;
    else{const d=G.seats.find((s,i)=>i!==G.me&&s&&s.bot);const w={easy:4,normal:6,hard:10}[(d&&d.diff)||'hard'];award=r===1?w:r===.5?3:1}
    done.push(S.gid);store(key,done.slice(-80));
    addStats({points:award,games:1,wins:r===1?1:0,draws:r===.5?1:0});
  }
  G.lastAward=award;
  setTimeout(()=>{if(G&&G.S===S)showGameEnd(r,award)},700);
}
function showGameEnd(r,award){
  const S=G.S,tp=teamPoints(S),me=G.me;
  let title=r===1?TR('Pobjeda!'):r===.5?TR('Neriješeno'):TR('Poraz');
  let line;
  if(S.N===4){const mt=me%2;line=tp[mt]+' <span>–</span> '+tp[1-mt]}
  else if(S.N===2)line=tp[me]+' <span>–</span> '+tp[1-me];
  else line=S.pts.map((p,i)=>(i===me?'<b>'+p+'</b>':p)).join(' <span>·</span> ');
  let sub=(S.forfeit!=null?esc(seatName(S.forfeit))+TR(' je napustio igru. '):'')+(award?'+'+award+TR(' bodova na rang listi'):'');
  const R=G.R,online=G.mode==='online';
  let seriesHtml='';
  if(online&&R){
    const tw=R.wins||[],names=teamNames();
    seriesHtml=TR('<p>Meč do ')+R.target+' '+(R.target===1?TR('pobjede'):TR('pobjede'))+': '+names.map((n,i)=>esc(n)+' '+(tw[i]||0)).join(' · ')+'</p>';
    if(R.status==='done'){const wt=(R.wins||[]).findIndex(x=>x>=R.target);title=wt===(S.N===4?me%2:me)?TR('Meč je tvoj!'):TR('Meč je gotov');}
  }
  $('panel').innerHTML='<h2>'+title+'</h2><div class="final">'+line+'</div>'+(sub?'<p>'+sub+'</p>':'')+seriesHtml+
    '<div class="acts">'+
    (online?(R&&R.status==='playing'?TR('<button class="btn primary" id="endNext">Sljedeća partija</button>'):'')+(R&&R.tour?TR('<button class="btn" id="endTour">Na turnir</button>'):'')
            :TR('<button class="btn primary" id="endNext">Nova partija</button>'))+
    TR('<button class="btn" id="endMenu">Izbornik</button></div>');
  $('overlay').hidden=false;
  const n=$('endNext');if(n){n.onclick=()=>{if(online)nextGameOnline();else{$('overlay').hidden=true;setState(newDeal(G.cfg,(G.S.starter+1)%G.S.N,1))}};n.focus()}
  const t=$('endTour');if(t)t.onclick=()=>{const tid=G.R.tour.tid;show('tour');openTour(tid)};
  $('endMenu').onclick=()=>{$('overlay').hidden=true;show('home')};
}
function teamNames(){
  const S=G.S||{N:G.R?G.R.N:2},me=Math.max(0,G.me);
  if(S.N===4)return me%2===0?[TR('Mi'),TR('Vi')]:[TR('Vi'),TR('Mi')];
  return G.seats.map((s,i)=>i===G.me?TR('Ti'):(s?s.name:'—'));
}

/* ---- sizing & rendering ---- */
function sizeCards(force){
  // Fit everything on one screen: work out card sizes from the space we have, then check the result and shrink if anything still spills over.
  const scr=$('scr-game');if(scr.hidden||!G||!G.S)return;
  const S=G.S,cs=getComputedStyle(scr);
  const Wa=scr.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),Ha=scr.clientHeight;
  const key=[Wa,Ha,S.N,S.k,S.hs].join();
  if(!force&&sizeCards.key===key)return;sizeCards.key=key;
  const hs=S.hs,total=S.N*S.k,short=Ha<430;
  scr.classList.toggle('short',short);
  const mw=Math.max(9,Math.min(22,Wa*(S.N===4?.04:.055),Ha*.028));
  const miniH=mw*1.816*(S.N===4?1.9:1);              // partner's face-up cards are bigger (4 players, last hands)
  const fixed=(short?30:38)+4+6+40+4+6+22+(short?30:40)+(short?6:16)+8+6; // bar, badges, labels, status, gaps
  let cw=Math.min(120,(Wa-8*(hs-1))/hs);
  let tw=Math.min(cw*.95,(Wa-12-6*(total-1))/(total+1.4));
  const room=(Ha-fixed-miniH)/1.816;
  if(cw+tw>room){const f=room/(cw+tw);cw*=f;tw*=f}
  const apply=f=>{const c=Math.floor(cw*f),t=Math.floor(tw*f);
    scr.style.setProperty('--cw',c+'px');scr.style.setProperty('--tw',t+'px');scr.style.setProperty('--dw',Math.floor(t*.8)+'px');scr.style.setProperty('--mw',mw.toFixed(1)+'px')};
  let f=1;apply(f);
  for(let i=0;i<8;i++){
    const r=scr.getBoundingClientRect(),hand=$('meHand').getBoundingClientRect(),tr=document.querySelector('.tablerow');
    const fb=document.querySelector('.felt').getBoundingClientRect().bottom,tb=tr.getBoundingClientRect(),op=$('opps').getBoundingClientRect();
    const over=scr.scrollWidth>scr.clientWidth+1||tr.scrollWidth>tr.clientWidth+1||hand.bottom>r.bottom+1||scr.scrollHeight>scr.clientHeight+1||tb.bottom>fb+1||tb.top<op.bottom-1;
    if(!over)break;f*=.93;apply(f);
  }
}
addEventListener('resize',()=>{clearTimeout(window.__rz);window.__rz=setTimeout(()=>{sizeCards(true);drawScene()},120)});
function relPos(seat){const N=G.S.N,me=Math.max(0,G.me),r=(seat-me+N)%N;if(r===0)return 'b';if(N===2)return 't';if(N===3)return r===1?'r':'l';return ['b','r','t','l'][r]}
function faceEl(c,tag){const el=document.createElement(tag||'div');el.className='card';el.style.backgroundImage='url("'+IMG[ID[c]]+'")';el.setAttribute('aria-label',NAME[c]);el.title=NAME[c]+(PT[c]?' · '+PT[c]+TR(' bod.'):'');return el}
function seatName(s){if(s===G.me)return TR('Ti');const st=G.seats[s];return st?st.name:'—'}
function render(){
  if(!G||!G.S)return;
  const S=G.S,N=S.N,me=Math.max(0,G.me),vis=pointsVisible(S);
  // score chips
  const ch=$('scoreChips');ch.innerHTML='';
  const tp=teamPoints(S);
  const mk=(label,val,cls)=>{const c=document.createElement('span');c.className='chip '+(cls||'');c.innerHTML=esc(label)+' <b>'+(vis?val:'?')+'</b>';ch.appendChild(c)};
  if(N===4){const mt=me%2;mk(TR('Mi'),tp[mt],mt?'tB':'tA');mk(TR('Vi'),tp[1-mt],mt?'tA':'tB')}
  else for(let i=0;i<N;i++){const s=(me+i)%N;mk(i===0?TR('Ti'):seatName(s),S.pts[s])}
  const sc=$('seriesChip');
  if(G.mode==='online'&&G.R&&G.R.target>1){sc.hidden=false;sc.textContent=TR('Meč ')+(G.R.wins||[]).join('–')+TR(' (do ')+G.R.target+')'}else sc.hidden=true;
  // opponents row
  const op=$('opps');op.innerHTML='';op.className='opps n'+N;
  const order=N===2?[(me+1)%2]:N===3?[(me+2)%3,(me+1)%3]:[(me+3)%4,(me+2)%4,(me+1)%4];
  const toPlay=S.phase==='play'?seatToPlay(S):-1;
  for(const s of order){
    const st=G.seats[s]||{name:'—'},d=document.createElement('div');
    d.className='opp'+(s===toPlay?' turn':'')+(N===4?(s%2===me%2?' tA':' tB'):'');
    const partner=N===4&&s===(me+2)%4;
    const sub=(partner?TR('Partner · '):'')+(st.bot?TR('Bot, ')+(DIFF_N[st.diff]||''):(st.level?TR('Razina ')+st.level:''))+(vis&&N!==4?' · '+S.pts[s]+' b.':'');
    d.innerHTML='<div class="badge"><img alt="" src="'+avSrc(st)+'"><span class="bt"><b>'+esc(st.name||'—')+'</b><small>'+esc(sub)+'</small></span></div><div class="minis"></div>';
    const mi=d.querySelector('.minis');
    const showFaces=partner&&revealActive(S)&&G.me>=0;
    for(const c of S.hands[s]){let m;if(showFaces){m=document.createElement('div');m.className='mini face';m.style.backgroundImage='url("'+IMG[ID[c]]+'")';m.title=NAME[c]}else{m=document.createElement('div');m.className='mini'+(G.anim.drawn.has(c)?' drawn':'')}mi.appendChild(m)}
    op.appendChild(d);
  }
  // deck
  const dz=$('deckzone');dz.innerHTML='';
  if(S.deck.length){
    const tr=faceEl(S.trump);tr.classList.add('trump');dz.appendChild(tr);
    if(S.deck.length>1){const st=document.createElement('div');st.className='stack';const layers=Math.min(4,Math.ceil((S.deck.length-1)/8));
      for(let i=0;i<layers;i++){const b=document.createElement('div');b.className='card back';b.style.transform='translate('+(-i*1.5)+'px,'+(-i*1.5)+'px)';st.appendChild(b)}dz.appendChild(st)}
    const n=document.createElement('div');n.className='deck-count';n.textContent=S.deck.length;dz.appendChild(n);
  }
  const lab=document.createElement('div');lab.className='trump-label';lab.innerHTML=TR('Briškula: <b>')+SUIT_N[S.ts]+'</b>';dz.appendChild(lab);
  // table: one fixed slot per card of the trick, so nothing shifts when a card lands
  const tb=$('table'),total=S.N*S.k;
  if(tb.dataset.n!==String(total)){tb.innerHTML='';tb.dataset.n=total;
    for(let i=0;i<total;i++){const sl=document.createElement('div');sl.className='slot empty';sl.innerHTML='<div class="ph"></div><span class="who"></span>';tb.appendChild(sl)}}
  const T=S.table.map(x=>x.c),wi=T.length?winIdx(T,S.ts):-1;
  [...tb.children].forEach((sl,i)=>{
    const play=S.table[i],seat=(S.leader+i)%S.N;
    const who=sl.querySelector('.who');who.textContent=seatName(play?play.p:seat);
    let card=sl.querySelector('.card');
    if(play){
      if(!card||card.dataset.c!==String(play.c)){
        if(card)card.remove();
        card=faceEl(play.c);card.dataset.c=play.c;sl.insertBefore(card,who);
        if(G.anim.enter===play.c)card.classList.add(play.p===G.me?'e-b':'e-t');
      }
      sl.classList.remove('empty');
    }else{if(card)card.remove();sl.classList.add('empty')}
    sl.classList.toggle('win',i===wi&&G.anim.collect===null&&T.length>1);
    sl.classList.toggle('next',!play&&S.phase==='play'&&i===S.table.length);
    sl.classList.remove('c-b','c-t');
    if(G.anim.collect!==null&&play)sl.classList.add(G.anim.collect===G.me?'c-b':'c-t');
  });
  // my hand: keep the same buttons between renders so nothing flickers
  const mh=$('meHand');
  const canPlay=G.me>=0&&S.phase==='play'&&toPlay===G.me&&!G.pending&&(G.mode==='local'||(G.R&&G.R.status==='playing'));
  mh.classList.toggle('active',canPlay);
  const have=new Map([...mh.children].map(b=>[b.dataset.c,b]));
  const want=G.me>=0?S.hands[G.me]:[];
  for(const [k,b] of have)if(!want.includes(+k)){b.remove();have.delete(k)}
  want.forEach((c,i)=>{
    let b=have.get(String(c));
    if(!b){b=faceEl(c,'button');b.type='button';b.dataset.c=c;b.onclick=()=>humanPlay(c);
      if(SUIT[c]===S.ts){b.classList.add('trumpcard');b.title+=TR(' · briškula')}
      if(G.anim.drawn.has(c))b.classList.add('drawn')}
    b.disabled=!canPlay;
    if(mh.children[i]!==b)mh.insertBefore(b,mh.children[i]||null);
  });
  // animations play once; later re-renders must not replay them
  G.anim.enter=null;G.anim.drawn=new Set();
  $('status').innerHTML='<span>'+statusHTML(toPlay)+'</span>';
  sizeCards();
}
function statusHTML(toPlay){
  const S=G.S;
  if(G.mode==='online'&&G.R&&G.R.status==='lobby')return TR('Čeka se početak igre.');
  if(S.phase==='over')return TR('Partija je gotova.');
  const T=S.table.map(x=>x.c);
  const who=s=>s===G.me?TR('Ti'):(S.N===4&&G.me>=0&&s===(G.me+2)%4?TR('Partner (')+esc(seatName(s))+')':esc(seatName(s)));
  if(S.phase==='resolve'){const w=trickWinner(S);return (w===G.me?TR('Nosiš ti'):who(w)+TR(' nosi'))+' <em>+'+sumPts(T)+'</em>'}
  let s='';
  if(!S.table.length){
    if(S.last)s+=(S.last.w===G.me?TR('Ti si nosio'):who(S.last.w)+TR(' je nosio'))+' <em>+'+S.last.pts+'</em>. ';
    else s+=TR('Briškula je <em>')+SUIT_N[S.ts]+'</em>. ';
    if(S.last&&!S.deck.length&&S.hands[toPlay]&&S.hands[toPlay].length===S.hs)s+=(S.N===4?TR('Špil je prazan, partneri vide karte. '):TR('Špil je prazan. '));
  }else{
    const l=S.table[S.table.length-1];if(l.p!==G.me)s+=who(l.p)+TR(' baca <em>')+NAME[l.c]+'</em>. ';
  }
  if(toPlay===G.me)s+=S.table.length?TR('Tvoj potez.'):TR('Ti igraš prvi.');
  else{const st=G.seats[toPlay];s+=st&&st.bot?'<span class="thinking">'+esc(st.name)+TR(' razmišlja</span>'):TR('Čeka se ')+who(toPlay)+'…'}
  return s;
}
$('gMenu').onclick=()=>{
  const online=G&&G.mode==='online';
  $('panel').innerHTML=TR('<h2>Igra</h2><div class="acts">')+
    (online?TR('<button class="btn" id="gmLink">Kopiraj poveznicu sobe</button>'):TR('<button class="btn" id="gmNew">Nova partija</button>'))+
    TR('<button class="btn" id="gmRules">Pravila</button><button class="btn" id="gmLeave">')+(online?TR('Napusti sobu'):TR('Izađi u izbornik'))+TR('</button><button class="btn primary" id="gmClose">Nastavi igru</button></div>');
  $('overlay').hidden=false;
  $('gmClose').onclick=()=>{$('overlay').hidden=true};
  $('gmRules').onclick=()=>{$('overlay').hidden=true;showRulesPanel()};
  if($('gmNew'))$('gmNew').onclick=()=>{$('overlay').hidden=true;startLocal(G.cfg)};
  if($('gmLink'))$('gmLink').onclick=()=>copyRoomLink();
  $('gmLeave').onclick=()=>{$('overlay').hidden=true;online?leaveRoom():show('home')};
};
function showRulesPanel(){$('panel').innerHTML=TR('<h2>Pravila</h2>')+$('scr-rules').querySelector('.rules').outerHTML+TR('<div class="acts"><button class="btn primary" id="rpClose">Natrag na igru</button></div>');$('overlay').hidden=false;$('rpClose').onclick=()=>{$('overlay').hidden=true}}
function confirmLeaveGame(){if(G&&G.mode==='online')$('gMenu').click();else show('home')}
function leaveGameView(){if(G&&G.mode==='local')saveLocalGame(true);gClear();stopWatch('room');clearInterval(window.__wd);G=null;$('overlay').hidden=true;$('meHand').innerHTML='';$('table').innerHTML='';$('table').dataset.n=''}
