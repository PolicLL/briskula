/* ================= accounts: register, log in, or play as a guest ================= */
const USER_RE=/^[A-Za-z0-9ČĆŽŠĐčćžšđ_.-]{3,15}$/;
let authMode='guest',authFirst=false;
function authErr(e){
  const c=(e&&e.code)||'';
  if(c==='taken')return TR('To korisničko ime je zauzeto. Odaberi drugo.');
  if(c==='bad')return TR('Pogrešno korisničko ime ili lozinka.');
  if(/weak-password/.test(c))return TR('Lozinka mora imati barem 6 znakova.');
  if(/too-many-requests/.test(c))return TR('Previše pokušaja. Pričekaj malo pa probaj opet.');
  if(/network/.test(c))return TR('Nema veze s poslužiteljem. Provjeri internet.');
  if(/operation-not-allowed|admin-restricted/.test(c))return TR('Registracija trenutno nije dostupna.');
  return TR('Nešto nije uspjelo')+(c?' ('+c+')':'')+TR('. Probaj opet.');
}
function openAuth(mode,opts){
  authMode=mode||'guest';authFirst=!!(opts&&opts.first);
  const online=Cloud.ok;if(!online)authMode='guest';
  const tabs=[['guest',TR('Gost')],['login',TR('Prijava')],['register',TR('Registracija')]];
  const p=$('panel');
  p.innerHTML='<h2>'+(authFirst?TR('Dobro došao!'):TR('Račun'))+'</h2>'+
    '<p>'+(online?TR('Registriraj se da ti se bodovi i razina čuvaju pod tvojim imenom, ili igraj kao gost.'):TR('Trenutno nema veze s poslužiteljem, pa možeš igrati kao gost.'))+'</p>'+
    (online?TR('<div class="seg auth-tabs" role="group" aria-label="Način ulaska">')+tabs.map(([k,t])=>'<button type="button" data-m="'+k+'" aria-pressed="'+(k===authMode)+'">'+t+'</button>').join('')+'</div>':'')+
    '<form class="form" id="authForm" novalidate></form>';
  p.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{authMode=b.dataset.m;p.querySelectorAll('[data-m]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderAuthForm()});
  renderAuthForm();
  $('overlay').hidden=false;
}
function renderAuthForm(){
  const f=$('authForm'),m=authMode;
  let h='';
  if(m==='guest')h=TR('<label class="field">Tvoje ime u igri<span class="inrow"><input id="aName" maxlength="18" autocomplete="nickname" value="')+esc(Cloud.registered?randomGuestName():P.name)+TR('"><button type="button" class="btn" id="aDice">Nasumično</button></span></label>');
  else{
    h=TR('<label class="field">Korisničko ime<input id="aUser" maxlength="15" autocomplete="username" autocapitalize="off" spellcheck="false"></label>')+
      TR('<label class="field">Lozinka<input id="aPw" type="password" autocomplete="')+(m==='login'?'current-password':'new-password')+'"></label>';
    if(m==='register')h+=TR('<label class="field">Ponovi lozinku<input id="aPw2" type="password" autocomplete="new-password"></label><p class="hint">3 do 15 znakova: slova, brojke, točka, crtica ili _. Lozinka barem 6 znakova.')+(Cloud.registered?'':TR(' Bodovi koje si skupio kao gost ostaju tvoji.'))+'</p>';
  }
  h+='<p class="err" id="aErr" role="alert"></p><button class="btn primary wide" type="submit" id="aGo">'+({guest:TR('Igraj kao gost'),login:TR('Prijavi se'),register:TR('Registriraj se')}[m])+'</button>'+
    (authFirst?'':TR('<button class="btn ghost wide" type="button" id="aClose">Zatvori</button>'));
  f.innerHTML=h;
  if($('aDice'))$('aDice').onclick=()=>{$('aName').value=randomGuestName()};
  if($('aClose'))$('aClose').onclick=closeAuth;
  f.onsubmit=e=>{e.preventDefault();submitAuth()};
  const first=f.querySelector('input');if(first&&matchMedia('(pointer:fine)').matches)first.focus();
}
function closeAuth(){$('overlay').hidden=true;store('brisk-welcomed',1);if(CUR==='profile')openProfile()}
async function submitAuth(){
  const err=t=>{$('aErr').textContent=t||''},go=$('aGo');err('');
  if(authMode==='guest'){
    const n=$('aName').value.trim().slice(0,18);if(!n)return err(TR('Upiši ime ili klikni Nasumično.'));
    if(Cloud.ok&&Cloud.registered){go.disabled=true;await logoutUser(true);go.disabled=false}
    P.name=n;saveLocalProfile();renderMe();
    if(Cloud.ok)Cloud.set('players/'+Cloud.uid,{name:n,updatedAt:Date.now()},true).catch(()=>{});
    closeAuth();toast(TR('Igraš kao ')+n+'.');return;
  }
  const user=$('aUser').value.trim(),pw=$('aPw').value;
  if(!USER_RE.test(user))return err(TR('Korisničko ime: 3 do 15 znakova, slova, brojke, točka, crtica ili _.'));
  if(pw.length<6)return err(TR('Lozinka mora imati barem 6 znakova.'));
  if(authMode==='register'&&pw!==$('aPw2').value)return err(TR('Lozinke se ne podudaraju.'));
  go.disabled=true;go.textContent=TR('Pričekaj…');
  try{
    if(authMode==='register'){
      if(Cloud.registered)await logoutUser(true);
      await Cloud.register(user,pw);
      P.name=user;saveLocalProfile();
      await Cloud.set('players/'+Cloud.uid,{name:user,username:user.toLowerCase(),registered:true,avatar:P.avatar||null,points:P.points||0,games:P.games||0,wins:P.wins||0,draws:P.draws||0,tWins:P.tWins||0,level:levelOf(P.points||0),createdAt:Date.now(),updatedAt:Date.now()},true);
      renderMe();closeAuth();toast(TR('Registracija je uspjela. Dobro došao, ')+user+'!');
    }else{
      await Cloud.login(user,pw);
      P=Object.assign({name:user,avatar:null,points:0,games:0,wins:0,draws:0,tWins:0},{});
      await syncProfileFromCloud();
      if(P.name!==user&&nameKey(P.name)!==nameKey(user)){P.name=user;saveLocalProfile();renderMe()}
      Cloud.set('players/'+Cloud.uid,{registered:true,updatedAt:Date.now()},true).catch(()=>{});
      closeAuth();toast(TR('Bok, ')+P.name+'!');
    }
  }catch(e){console.warn('auth',e);err(authErr(e));go.disabled=false;go.textContent=authMode==='register'?TR('Registriraj se'):TR('Prijavi se')}
}
async function logoutUser(silent){
  if(!Cloud.ok)return;
  const old=P;
  P={name:randomGuestName(),avatar:null,points:0,games:0,wins:0,draws:0,tWins:0};saveLocalProfile();
  try{await Cloud.logout()}catch(e){P=old;saveLocalProfile();toast(TR('Odjava nije uspjela.'));return}
  await syncProfileFromCloud();renderMe();
  if(silent===true)return;
  toast(TR('Odjavljen si.'));
  if(CUR==='profile')openProfile();
  openAuth('guest',{first:true});
}
function maybeWelcome(){
  if(store('brisk-welcomed')||CUR!=='home'||!$('overlay').hidden)return;
  if(Cloud.ok&&Cloud.registered){store('brisk-welcomed',1);return}
  if(/soba=|turnir=/.test(location.hash))return;
  openAuth('guest',{first:true});
}
