/* ================= cards & rules (pure) ================= */
const SUIT_L=['S','C','D','B'];
const SUIT_N=['Špade','Kupe','Dinari','Bastoni'];
const RANKS=[1,3,12,11,10,7,6,5,4,2];          // strongest → weakest
const RANK_N={1:'As',3:'Trica',12:'Kralj',11:'Konj',10:'Fanat',7:'Sedmica',6:'Šestica',5:'Petica',4:'Četvorka',2:'Dvica'};
const PTS_BY_R={1:11,3:10,12:4,11:3,10:2};
const SUIT=[],STR=[],PT=[],ID=[],NAME=[];
for(let s=0;s<4;s++)for(let i=0;i<10;i++){const c=s*10+i,r=RANKS[i];SUIT[c]=s;STR[c]=10-i;PT[c]=PTS_BY_R[r]||0;ID[c]=SUIT_L[s]+r;NAME[c]=RANK_N[r]+' '+SUIT_N[s];}
const ALL=[...Array(40).keys()];
const TWO_OF_COINS=2*10+9;                       // removed in 3-player games
const beats=(b,a,t)=>SUIT[b]===SUIT[a]?STR[b]>STR[a]:SUIT[b]===t;
function winIdx(T,t){let bi=0;for(let i=1;i<T.length;i++)if(beats(T[i],T[bi],t))bi=i;return bi}
function sumPts(T){let s=0;for(const c of T)s+=PT[c];return s}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]]}return a}
const teamOf=(N,s)=>N===4?s%2:s;
const sameTeam=(N,a,b)=>teamOf(N,a)===teamOf(N,b);

// cfg: {N:2|3|4, duplo:bool, show:'always'|'end'}
function newDeal(cfg,starter,rev){
  const N=cfg.N,k=(N===2&&cfg.duplo)?2:1,hs=k===2?4:3;
  let deck=shuffle(ALL.filter(c=>!(N===3&&c===TWO_OF_COINS)));
  const hands=[...Array(N)].map(()=>[]);
  for(let i=0;i<hs;i++)for(let j=0;j<N;j++)hands[(starter+j)%N].push(deck.shift());
  const trump=deck.shift();deck.push(trump);
  return {v:3,N,k,hs,show:cfg.show||'always',deck,trump,ts:SUIT[trump],hands,table:[],seen:[],
    pts:Array(N).fill(0),tricks:Array(N).fill(0),leader:starter,turn:starter,starter,phase:'play',last:null,
    rev:rev||1,gid:Math.random().toString(36).slice(2,9)};
}
const clone=S=>JSON.parse(JSON.stringify(S));
const seatToPlay=S=>(S.leader+S.table.length)%S.N;
function applyPlay(S,seat,c){ // returns new state or null if illegal
  if(S.phase!=='play'||seatToPlay(S)!==seat||!S.hands[seat].includes(c))return null;
  const n=clone(S);n.hands[seat].splice(n.hands[seat].indexOf(c),1);n.table.push({p:seat,c});n.seen.push(c);n.rev++;
  if(n.table.length===n.N*n.k)n.phase='resolve';else n.turn=seatToPlay(n);
  return n;
}
function applyResolve(S){
  if(S.phase!=='resolve')return null;
  const n=clone(S),T=n.table.map(x=>x.c),w=n.table[winIdx(T,n.ts)].p,p=sumPts(T);
  n.pts[w]+=p;n.tricks[w]++;n.last={w,pts:p};n.table=[];
  for(let j=0;j<n.N*n.k&&n.deck.length;j++)n.hands[(w+j)%n.N].push(n.deck.shift());
  n.leader=n.turn=w;n.rev++;
  n.phase=n.hands.every(h=>!h.length)?'over':'play';
  return n;
}
const trickWinner=S=>S.table.length?S.table[winIdx(S.table.map(x=>x.c),S.ts)].p:-1;
function teamPoints(S){if(S.N!==4)return S.pts.slice();return [S.pts[0]+S.pts[2],S.pts[1]+S.pts[3]]}
// result per seat: 1 win, 0.5 draw, 0 loss
function seatResult(S,seat){
  if(S.forfeit!=null)return sameTeam(S.N,seat,S.forfeit)?0:1;
  const tp=teamPoints(S),me=tp[teamOf(S.N,seat)];
  if(S.N===3){const mx=Math.max(...tp),cnt=tp.filter(x=>x===mx).length;return me<mx?0:cnt>1?.5:1}
  return me>60?1:me===60?.5:0;
}
const revealActive=S=>S.N===4&&S.deck.length===0;   // partners see each other's cards for the last hands
const pointsVisible=S=>S.show!=='end'||S.deck.length===0||S.phase==='over';

/* ================= AI ================= */
const cost=(c,t)=>PT[c]+(SUIT[c]===t?7+STR[c]*.6:0)+STR[c]*.05;
function cheapest(h,t){let b=h[0],bc=1e9;for(const c of h){const v=cost(c,t);if(v<bc){bc=v;b=c}}return b}
// position-aware heuristic for any number of players
function heur(h,T,lead,me,t,N,k,eps){
  if(eps&&Math.random()<eps)return h[(Math.random()*h.length)|0];
  if(!T.length)return cheapest(h,t);
  const bi=winIdx(T,t),B=T[bi],owner=(lead+bi)%N,P=sumPts(T),total=N*k;
  let oppAfter=false;for(let i=T.length+1;i<total;i++)if(!sameTeam(N,(lead+i)%N,me)){oppAfter=true;break}
  if(sameTeam(N,owner,me)){
    if(!oppAfter){let b=-1,bp=-1;for(const c of h)if(SUIT[c]!==t&&PT[c]>bp){bp=PT[c];b=c}return b>=0?b:cheapest(h,t)}
    return cheapest(h,t);
  }
  let take=-1,tp=-1,win=-1,wc=1e9;
  for(const c of h){if(beats(c,B,t)){const cc=cost(c,t);if(SUIT[c]!==t&&PT[c]>tp){tp=PT[c];take=c}if(cc<wc){wc=cc;win=c}}}
  if(take>=0&&(!oppAfter||STR[take]>=9||P>=10))return take;
  if(win>=0&&(P>=10||(P>=2&&PT[win]===0)))return win;
  if(take>=0)return take;
  return cheapest(h,t);
}
// light-weight simulation state: {H:[[...]],d:[...],di,lead,T:[...],pts:[...]}
function simDrawAndScore(st,N,k,t){
  const w=(st.lead+winIdx(st.T,t))%N;st.pts[w]+=sumPts(st.T);
  for(let j=0;j<N*k&&st.di<st.d.length;j++)st.H[(w+j)%N].push(st.d[st.di++]);
  st.lead=w;st.T=[];
}
function rollout(st,N,k,t,eps){
  st={H:st.H.map(h=>h.slice()),d:st.d,di:st.di,lead:st.lead,T:st.T.slice(),pts:st.pts.slice()};
  while(true){
    if(st.T.length===N*k){simDrawAndScore(st,N,k,t);continue}
    const who=(st.lead+st.T.length)%N,h=st.H[who];if(!h.length)break;
    const c=heur(h,st.T,st.lead,who,t,N,k,eps);h.splice(h.indexOf(c),1);st.T.push(c);
  }
  return st.pts;
}
function valueFor(pts,N,me){
  if(N===4){const m=pts[me%2]+pts[me%2+2];return m+(m>60?40:m===60?20:0)}
  if(N===2){const m=pts[me];return m+(m>60?40:m===60?20:0)}
  const m=pts[me],o=Math.max(...pts.filter((_,i)=>i!==me));return m-o*.6+(m>o?30:0);
}
// exact alpha-beta for two sides (2p, or 4p teams), fully known position
function solve(st,N,k,t,me,a,b){
  if(st.T.length===N*k){
    const n={H:st.H,d:st.d,di:st.di,lead:st.lead,T:st.T,pts:st.pts.slice()};
    if(st.di<st.d.length)n.H=st.H.map(h=>h.slice());
    simDrawAndScore(n,N,k,t);return solve(n,N,k,t,me,a,b);
  }
  const who=(st.lead+st.T.length)%N,h=st.H[who];
  if(!h.length)return valueFor(st.pts,N,me);
  const max=sameTeam(N,who,me);let best=max?-1e9:1e9;
  for(let i=0;i<h.length;i++){
    const H=st.H.slice();H[who]=h.slice(0,i).concat(h.slice(i+1));
    const v=solve({H,d:st.d,di:st.di,lead:st.lead,T:st.T.concat(h[i]),pts:st.pts},N,k,t,me,a,b);
    if(max){if(v>best)best=v;if(best>a)a=best}else{if(v<best)best=v;if(best<b)b=best}
    if(a>=b)break;
  }
  return best;
}
function botChoose(S,seat,diff){
  const N=S.N,k=S.k,t=S.ts,hand=S.hands[seat],T=S.table.map(x=>x.c),lead=S.leader;
  if(hand.length===1)return hand[0];
  if(diff==='easy')return heur(hand,T,lead,seat,t,N,k,.35);
  if(diff==='normal')return heur(hand,T,lead,seat,t,N,k,0);
  // hard: determinized search over what this seat can't see
  const known=new Set([...hand,...S.seen]);if(S.deck.length)known.add(S.trump);
  const partner=N===4?(seat+2)%4:-1,seePartner=revealActive(S);
  if(seePartner)S.hands[partner].forEach(c=>known.add(c));
  const unknown=ALL.filter(c=>!known.has(c)&&!(N===3&&c===TWO_OF_COINS));
  const others=[];for(let s=0;s<N;s++)if(s!==seat&&!(seePartner&&s===partner))others.push(s);
  const deckN=S.deck.length,twoSided=N!==3;
  const exact=twoSided&&deckN<=(N===2?(k===2?4:6):4);
  const sums=new Array(hand.length).fill(0);
  const t0=performance.now(),budget=exact?650:(N===2?520:420);let it=0;
  do{
    shuffle(unknown);let pos=0;const H=[];
    for(let s=0;s<N;s++){
      if(s===seat)H[s]=hand.slice();
      else if(seePartner&&s===partner)H[s]=S.hands[s].slice();
      else{H[s]=unknown.slice(pos,pos+S.hands[s].length);pos+=S.hands[s].length}
    }
    const d=unknown.slice(pos);if(deckN)d.push(S.trump);
    for(let i=0;i<hand.length;i++){
      const m=hand[i],H2=H.slice();H2[seat]=hand.filter(c=>c!==m);
      const st={H:H2,d,di:0,lead,T:T.concat(m),pts:S.pts.slice()};
      sums[i]+=exact?solve(st,N,k,t,seat,-1e9,1e9):valueFor(rollout(st,N,k,t,.08),N,seat);
    }
    it++;
    if(deckN===0&&!others.length)break;
  }while(performance.now()-t0<budget&&it<5000);
  let bi=0;for(let i=1;i<hand.length;i++)if(sums[i]>sums[bi]+1e-9||(Math.abs(sums[i]-sums[bi])<1e-9&&cost(hand[i],t)<cost(hand[bi],t)))bi=i;
  return hand[bi];
}
if(typeof module!=='undefined')module.exports={newDeal,applyPlay,applyResolve,botChoose,heur,seatResult,teamPoints,PT,SUIT,ALL,seatToPlay,winIdx,trickWinner,revealActive};
