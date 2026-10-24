/* ================= cloud adapter (Firebase compat; tests inject window.__CLOUD) ================= */
const FIREBASE_CONFIG=window.__FIREBASE_CONFIG||__FBCONFIG__;
// accounts are "username + password"; Firebase needs an email, so the username is turned into a private address nobody sees
const nameKey=n=>String(n).trim().toLowerCase();
const emailOf=n=>'u'+[...new TextEncoder().encode(nameKey(n))].map(b=>b.toString(16).padStart(2,'0')).join('')+'@igraci.briskula.app';
const Cloud=(()=>{
  if(window.__CLOUD)return window.__CLOUD;
  const C={ok:false,uid:null,ready:null,google:false,registered:false};
  let db=null,auth=null;
  C.ready=new Promise(res=>{
    try{
      if(typeof firebase==='undefined'||!FIREBASE_CONFIG||!FIREBASE_CONFIG.apiKey){res(null);return}
      firebase.initializeApp(FIREBASE_CONFIG);db=firebase.firestore();auth=firebase.auth();
      let done=false;
      auth.onAuthStateChanged(u=>{
        if(u){C.uid=u.uid;C.ok=true;C.registered=!u.isAnonymous;C.google=u.providerData.some(p=>p.providerId==='google.com');C.email=u.email||null;if(!done){done=true;res(u.uid)}else C.onUser&&C.onUser()}
        else auth.signInAnonymously().catch(()=>{if(!done){done=true;res(null)}});
      });
      setTimeout(()=>{if(!done){done=true;res(null)}},12000);
    }catch(e){res(null)}
  });
  const ref=p=>db.doc(p);
  C.get=async p=>{const s=await ref(p).get();return s.exists?s.data():null};
  C.set=(p,d,merge)=>ref(p).set(d,merge?{merge:true}:{});
  C.del=p=>ref(p).delete();
  C.newId=c=>db.collection(c).doc().id;
  C.watch=(p,cb)=>ref(p).onSnapshot(s=>cb(s.exists?s.data():null),()=>cb(undefined));
  C.watchQuery=(c,q,cb)=>{let x=db.collection(c);if(q.where)x=x.where(...q.where);if(q.orderBy)x=x.orderBy(...q.orderBy);if(q.limit)x=x.limit(q.limit);
    return x.onSnapshot(s=>cb(s.docs.map(d=>Object.assign({id:d.id},d.data()))),()=>cb(null))};
  // fn(get,set) — all gets before sets; return value passed through
  C.txn=fn=>db.runTransaction(t=>fn(async p=>{const s=await t.get(ref(p));return s.exists?s.data():null},(p,d)=>t.set(ref(p),d)));
  C.signInGoogle=async()=>{
    const prov=new firebase.auth.GoogleAuthProvider();
    try{await auth.currentUser.linkWithPopup(prov)}
    catch(e){
      if(e.code==='auth/credential-already-in-use'||e.code==='auth/email-already-in-use'){const cred=firebase.auth.GoogleAuthProvider.credentialFromError(e);await auth.signInWithCredential(cred)}
      else throw e;
    }
    const u=auth.currentUser;C.uid=u.uid;C.google=true;C.email=u.email||null;return u.uid;
  };
  C.signOut=async()=>{await auth.signOut()};
  const bad=e=>/user-not-found|wrong-password|invalid-credential|invalid-login|invalid-email/.test(e&&e.code||'');
  C.register=async(name,pw)=>{
    const key=nameKey(name);
    if(await C.get('usernames/'+key))throw {code:'taken'};
    const cred=firebase.auth.EmailAuthProvider.credential(emailOf(name),pw);
    const cur=auth.currentUser;let u;
    try{u=cur&&cur.isAnonymous?(await cur.linkWithCredential(cred)).user:(await auth.createUserWithEmailAndPassword(emailOf(name),pw)).user}
    catch(e){if(/email-already-in-use|credential-already-in-use/.test(e.code||''))throw {code:'taken'};throw e}
    C.uid=u.uid;C.registered=true;
    await C.set('usernames/'+key,{uid:u.uid,name:String(name).trim(),createdAt:Date.now()});
    return u.uid;
  };
  C.login=async(name,pw)=>{
    try{const r=await auth.signInWithEmailAndPassword(emailOf(name),pw);C.uid=r.user.uid;C.registered=true;return C.uid}
    catch(e){if(bad(e))throw {code:'bad'};throw e}
  };
  C.logout=async()=>{
    await auth.signOut();   // the auth listener signs in again as a new guest
    await new Promise(r=>{const t=setInterval(()=>{const u=auth.currentUser;if(u&&u.isAnonymous){clearInterval(t);r()}},100);setTimeout(()=>{clearInterval(t);r()},10000)});
    const u=auth.currentUser;C.uid=u?u.uid:null;C.registered=false;
  };
  return C;
})();
