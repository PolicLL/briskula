/* ================= Dalmatian backdrop: a photo of Split above a wooden table ================= */
// Photo: "Split harbor view", Ryan Matzner and Rachel Pestik, CC BY-SA 3.0 (Wikimedia Commons). Wood: Poly Haven "Wood table large", CC0.
const BG_SRC={split:window.__BG_SPLIT||'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Split_harbor_view.jpg/1920px-Split_harbor_view.jpg',
  wood:window.__BG_WOOD||'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Wood_table_large_diff_8k_%28JPG%29.jpg/1280px-Wood_table_large_diff_8k_%28JPG%29.jpg'};
const BGI={};
for(const k in BG_SRC){const i=new Image();i.decoding='async';i.onload=()=>{BGI[k]=i;drawScene()};i.src=BG_SRC[k]}
function drawScene(){
  const cv=$('bg'),dpr=Math.min(2,window.devicePixelRatio||1),W=innerWidth,H=innerHeight;
  cv.width=W*dpr;cv.height=H*dpr;const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
  let seed=7;const R=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const hz=Math.round(Math.max(130,Math.min(H*.27,300))),tableY=hz+Math.round(Math.max(36,H*.06));
  let gr;
  if(BGI.split){   // the photo, cropped to fill the strip above the table
    const im=BGI.split,s=Math.max(W/im.width,tableY/im.height),dw=im.width*s,dh=im.height*s;
    g.drawImage(im,(W-dw)*.42,(tableY-dh)*.62,dw,dh);
    gr=g.createLinearGradient(0,0,0,tableY);gr.addColorStop(0,'rgba(12,20,40,.35)');gr.addColorStop(.35,'rgba(12,20,40,.05)');gr.addColorStop(.8,'rgba(255,170,90,.08)');gr.addColorStop(1,'rgba(20,10,0,.35)');g.fillStyle=gr;g.fillRect(0,0,W,tableY);
  }else{
    gr=g.createLinearGradient(0,0,0,hz);gr.addColorStop(0,'#1d2b52');gr.addColorStop(.45,'#5b4a7a');gr.addColorStop(.78,'#d9795a');gr.addColorStop(1,'#f4b56a');g.fillStyle=gr;g.fillRect(0,0,W,hz);
    const sx=W*.68;gr=g.createRadialGradient(sx,hz-6,2,sx,hz-6,90);gr.addColorStop(0,'#fff1c4');gr.addColorStop(.18,'#ffd27acc');gr.addColorStop(1,'#ffd27a00');g.fillStyle=gr;g.fillRect(0,0,W,hz);
    g.fillStyle='#ffffffaa';for(let i=0;i<40;i++){const x=R()*W,y=R()*hz*.35;g.fillRect(x,y,R()<.2?1.5:1,R()<.2?1.5:1)}
    const island=(x0,x1,h,col)=>{g.fillStyle=col;g.beginPath();g.moveTo(x0,hz);for(let x=x0;x<=x1;x+=6){const t=(x-x0)/(x1-x0);g.lineTo(x,hz-h*Math.sin(Math.PI*t)**.7*(.85+.15*Math.sin(x*.05)))}g.lineTo(x1,hz);g.fill()};
    island(W*.35,W*1.05,hz*.09,'#6a4f6e');island(W*.55,W*1.2,hz*.06,'#584260');island(-W*.1,W*.3,hz*.05,'#6f5470');
    gr=g.createLinearGradient(0,hz,0,tableY);gr.addColorStop(0,'#c98a68');gr.addColorStop(.25,'#2f5f86');gr.addColorStop(1,'#123552');g.fillStyle=gr;g.fillRect(0,hz,W,tableY-hz);
    for(let i=0;i<70;i++){const y=hz+2+R()*(tableY-hz-4),sp=12+(y-hz)*1.2,x=sx+(R()-.5)*sp*2;g.fillStyle='rgba(255,214,140,'+(0.25+R()*.5)*(1-(y-hz)/(tableY-hz))+')';g.fillRect(x,y,4+R()*14,1.2)}
    const townW=Math.min(W*.42,360);let x=0;const stone=['#d9c9a8','#cbb894','#e2d4b6','#bfa982'];
    while(x<townW){const w=26+R()*30,h=hz*.1+R()*hz*.13,y=hz-h+hz*.05;g.fillStyle=stone[(R()*4)|0];g.fillRect(x,y,w,hz+20-y);
      g.fillStyle='#b4502e';g.beginPath();g.moveTo(x-3,y);g.lineTo(x+w/2,y-h*.28);g.lineTo(x+w+3,y);g.fill();
      g.fillStyle='#3b2a1f';for(let k=0;k<2;k++)g.fillRect(x+5+k*(w-14)*.8,y+h*.25,5,8);g.fillStyle='#5f7c4a';g.fillRect(x+4,y+h*.25,2,8);x+=w-2}
    const bx=townW*.62,bw=Math.max(18,townW*.07),bh=hz*.62,by=hz+hz*.05-bh;
    g.fillStyle='#e6dabf';g.fillRect(bx,by,bw,bh);g.fillStyle='#d5c6a4';g.fillRect(bx-2,by+bh*.35,bw+4,3);g.fillRect(bx-2,by+bh*.62,bw+4,3);
    g.fillStyle='#3a2c24';for(const f of [.12,.42,.7]){g.beginPath();g.ellipse(bx+bw/2,by+bh*f+6,bw*.22,7,0,Math.PI,0);g.rect(bx+bw*.28,by+bh*f+6,bw*.44,10);g.fill()}
    g.fillStyle='#b4502e';g.beginPath();g.moveTo(bx-3,by);g.lineTo(bx+bw/2,by-bh*.22);g.lineTo(bx+bw+3,by);g.fill();
    const cyp=(cx,h)=>{g.fillStyle='#1f2f22';g.beginPath();g.ellipse(cx,hz+hz*.05-h/2,h*.09,h/2,0,0,Math.PI*2);g.fill()};cyp(townW+14,hz*.34);cyp(townW+30,hz*.26);cyp(townW*.3,hz*.3);
    g.fillStyle='#cdbb98';g.fillRect(0,hz+hz*.05,townW+40,6);
  }
  if(BGI.wood){   // real wood planks, tiled
    const im=BGI.wood,k=Math.max(.35,Math.min(.9,Math.max(W,H)/im.width*.8)),pat=g.createPattern(im,'repeat');
    pat.setTransform(new DOMMatrix([k,0,0,k,W/2-im.width*k/2,tableY]));g.fillStyle=pat;g.fillRect(0,tableY,W,H-tableY);
    g.fillStyle='rgba(60,25,5,.18)';g.fillRect(0,tableY,W,H-tableY);
  }else{
    gr=g.createLinearGradient(0,tableY,0,H);gr.addColorStop(0,'#6b4426');gr.addColorStop(1,'#3b2414');g.fillStyle=gr;g.fillRect(0,tableY,W,H-tableY);
    const plank=Math.max(56,(H-tableY)/7);
    for(let y=tableY;y<H;y+=plank){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,y,W,2);g.fillStyle='rgba(255,220,170,.08)';g.fillRect(0,y+2,W,1);
      for(let k=0;k<26;k++){const gy=y+4+R()*(plank-8),amp=1+R()*3;g.strokeStyle='rgba('+(R()<.5?'30,15,5':'200,150,100')+','+(0.05+R()*.08)+')';g.lineWidth=.6+R()*1.2;g.beginPath();for(let gx=0;gx<=W;gx+=20)g.lineTo(gx,gy+Math.sin(gx*.01+k)*amp);g.stroke()}
      if(R()<.6){const kx=R()*W,ky=y+plank*(.3+R()*.4);g.strokeStyle='rgba(30,15,5,.25)';for(let r=3;r<16;r+=3){g.beginPath();g.ellipse(kx,ky,r*2.2,r*.6,0,0,Math.PI*2);g.stroke()}}
      g.fillStyle='rgba(0,0,0,.3)';g.fillRect(R()*W,y,2,plank)}
  }
  // table edge: a lit rim and a shadow cast onto the table
  gr=g.createLinearGradient(0,tableY-7,0,tableY);gr.addColorStop(0,'#3a2212');gr.addColorStop(.5,'#8a5a32');gr.addColorStop(1,'#c99a62');g.fillStyle=gr;g.fillRect(0,tableY-7,W,7);
  gr=g.createLinearGradient(0,tableY,0,tableY+24);gr.addColorStop(0,'rgba(0,0,0,.55)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,tableY,W,24);
  gr=g.createRadialGradient(W/2,(tableY+H)/2,Math.min(W,H)*.2,W/2,(tableY+H)/2,Math.max(W,H)*.75);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.55)');g.fillStyle=gr;g.fillRect(0,tableY,W,H-tableY);
}

/* ================= start-up ================= */
drawScene();renderMe();checkResume();
$('cloudNote').textContent='Povezujem se…';
Cloud.ready.then(async uid=>{
  const dot=$('netDot');
  if(!uid){dot.className='net off';$('cloudNote').textContent='Online igra, turniri i rang lista trenutno nisu dostupni. Igra protiv botova radi i bez interneta.';maybeWelcome();return}
  dot.className='net on';$('cloudNote').textContent='';
  await syncProfileFromCloud();
  watchMyTournaments();
  if(CUR==='home')checkResume();
  renderMe();maybeWelcome();
  Cloud.onUser=()=>{syncProfileFromCloud()};
  const h=location.hash;let m;
  if((m=h.match(/soba=([A-Za-z0-9]+)/)))joinRoom(m[1]);
  else if((m=h.match(/turnir=([A-Za-z0-9]+)/))){show('tour');openTour(m[1])}
});
