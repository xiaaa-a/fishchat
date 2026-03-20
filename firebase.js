// ══════════════════════════════════════
// FIREBASE CONFIG
// ══════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyCPAkX7t5pz6xa4yFNCbFgOX9nw_dP08xM",
  authDomain: "fishchat-16a8c.firebaseapp.com",
  databaseURL: "https://fishchat-16a8c-default-rtdb.firebaseio.com",
  projectId: "fishchat-16a8c",
  storageBucket: "fishchat-16a8c.firebasestorage.app",
  messagingSenderId: "967914123953",
  appId: "1:967914123953:web:bec3465de38b2bacdbe890",
};

firebase.initializeApp(firebaseConfig);
const DB = firebase.database();

// ══════════════════════════════════════
// DB HELPERS (compat SDK - no module needed)
// ══════════════════════════════════════
async function dbGet(path) {
  try {
    const snap = await DB.ref(path).once('value');
    return snap.exists() ? snap.val() : null;
  } catch(e) {
    console.error('dbGet error:', e.code, e.message);
    throw e;
  }
}

async function dbSet(path, val) {
  try { await DB.ref(path).set(val); return true; }
  catch(e) {
    console.error('dbSet error:', e.code, e.message);
    throw e;
  }
}

async function dbUpd(path, val) {
  try { await DB.ref(path).update(val); return true; }
  catch(e) {
    console.error('dbUpd error:', e.code, e.message);
    throw e;
  }
}

async function dbPush(path, val) {
  try { await DB.ref(path).push(val); return true; }
  catch(e) {
    console.error('dbPush error:', e.code, e.message);
    throw e;
  }
}

function dbListen(path, cb) {
  const ref = DB.ref(path);
  ref.on('value', snap => cb(snap.exists() ? snap.val() : null));
  return () => ref.off('value');
}
