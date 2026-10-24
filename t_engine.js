const E=require('./engine.js');global.performance=require('perf_hooks').performance;
function game(cfg,diffs,starter){let S=E.newDeal(cfg,starter);let mt=0;
 while(S.phase!=='over'){ if(S.phase==='resolve'){S=E.applyResolve(S);continue}
  const s=E.seatToPlay(S);const t=Date.now();const c=E.botChoose(S,s,diffs[s]);mt=Math.max(mt,Date.now()-t);S=E.applyPlay(S,s,c);if(!S)throw 'illegal';}
 const tot=S.pts.reduce((a,b)=>a+b,0);if(tot!==(cfg.N===3?120:120))throw 'pts '+tot;
 return [S,mt];}
const cases=[[{N:2},['hard','normal'],30],[{N:2,duplo:true},['hard','normal'],30],[{N:3},['hard','normal','normal'],30],[{N:4},['hard','normal','hard','normal'],30]];
for(const [cfg,d,n] of cases){let w=0,mt=0,sp=0;for(let i=0;i<n;i++){const [S,m]=game(cfg,d,i%cfg.N);mt=Math.max(mt,m);const r=E.seatResult(S,0);w+=r;sp+=E.teamPoints(S)[0]}
 console.log(JSON.stringify(cfg),'hard seat0 score',w+'/'+n,'avg pts',(sp/n).toFixed(1),'max ms',mt)}
