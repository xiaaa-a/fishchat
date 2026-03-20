// ══════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════
const AVATARS = ['🐟','🐠','🦈','🐬','🐡','🦑','🦞','🦀','🐙','🦋','🌊','⭐','🌙','🔥','💎','🌸','🍄','🦊','🐺','🐉'];
const GRP_EMOJIS = ['🌊','🐬','🦈','🐉','⚓','🎨','🎭','🎪','🌸','🔥'];

const FISH = [
  {id:'minnow', name:'小鯽魚', icon:'🐟', rarity:'common',    val:1,  w:38},
  {id:'carp',   name:'大鯉魚', icon:'🎏', rarity:'common',    val:2,  w:28},
  {id:'bass',   name:'鱸魚',   icon:'🐠', rarity:'uncommon',  val:4,  w:14},
  {id:'eel',    name:'海鰻',   icon:'🐍', rarity:'uncommon',  val:5,  w:10},
  {id:'tuna',   name:'鮪魚',   icon:'🐋', rarity:'rare',      val:10, w:6 },
  {id:'puffer', name:'河豚',   icon:'🐡', rarity:'rare',      val:12, w:5 },
  {id:'octo',   name:'大章魚', icon:'🐙', rarity:'epic',      val:20, w:3 },
  {id:'shark',  name:'鯊魚',   icon:'🦈', rarity:'epic',      val:25, w:2 },
  {id:'dragon', name:'龍魚',   icon:'🐉', rarity:'legendary', val:60, w:.8},
  {id:'mermaid',name:'人魚尾', icon:'🧜', rarity:'legendary', val:100,w:.2},
];
const RODS = [
  {id:'bamboo',name:'基本竹竿',icon:'🎋',desc:'新手入門',     price:0,  bonus:0},
  {id:'iron',  name:'鐵製釣竿',icon:'⚙️',desc:'上鉤率 +10%', price:15, bonus:.10},
  {id:'gold',  name:'黃金釣竿',icon:'✨',desc:'稀有魚 +20%',  price:40, bonus:.20},
  {id:'dragon',name:'龍紋釣竿',icon:'🐲',desc:'傳說魚 +35%',  price:100,bonus:.35},
];
const RAR = {
  common:   {lbl:'普通',   cls:'r-c', rc:'rc-common'},
  uncommon: {lbl:'不常見', cls:'r-u', rc:'rc-uncommon'},
  rare:     {lbl:'稀有',   cls:'r-r', rc:'rc-rare'},
  epic:     {lbl:'史詩',   cls:'r-e', rc:'rc-epic'},
  legendary:{lbl:'傳說',   cls:'r-l', rc:'rc-legendary'},
};

// ══════════════════════════════════════
// SESSION
// ══════════════════════════════════════
const S = {
  uid: null, prof: null,
  room: null,
  view: 'chat',
  grpEmoji: '🌊',
  sellSel: {},
};

let msgUnsub = null;

function today(){ return new Date().toISOString().slice(0,10); }
function roomId(a,b){ return [a,b].sort().join('__'); }
function q(id){ return document.getElementById(id); }

// ══════════════════════════════════════
// AUTH
// ══════════════════════════════════════
function switchTab(t) {
  q('tc-login').style.display = t === 'login' ? 'block' : 'none';
  q('tc-reg').style.display   = t === 'reg'   ? 'block' : 'none';
  q('tab-login').classList.toggle('on', t === 'login');
  q('tab-reg').classList.toggle('on',   t === 'reg');
  q('loginErr').textContent = '';
  q('regErr').textContent = '';
}

async function doLogin() {
  const user = q('lUser').value.trim();
  const pass = q('lPass').value.trim();
  q('loginErr').textContent = '';
  if (!user || !pass) { q('loginErr').textContent = '請填寫帳號和密碼'; return; }
  setSyncing(true);
  try {
    const prof = await dbGet('users/' + user);
    if (!prof || prof.password !== pass) {
      q('loginErr').textContent = '帳號或密碼錯誤';
      setSyncing(false); return;
    }
    S.uid = user; S.prof = prof;
    if (prof.lastReset !== today()) {
      prof.credits = 10; prof.lastReset = today();
      await dbUpd('users/' + user, {credits: 10, lastReset: today()});
    }
    setSyncing(false);
    enterApp();
  } catch(e) {
    q('loginErr').textContent = '錯誤：' + (e.code || e.message || '未知錯誤');
    setSyncing(false);
  }
}

async function doReg() {
  const user = q('rUser').value.trim();
  const pass = q('rPass').value.trim();
  const nick = q('rNick').value.trim() || user;
  q('regErr').textContent = '';
  if (!user || !pass) { q('regErr').textContent = '請填寫帳號和密碼'; return; }
  if (!/^[a-zA-Z0-9_]{2,20}$/.test(user)) { q('regErr').textContent = '帳號只能英數字和底線（2-20字）'; return; }
  setSyncing(true);
  try {
    const exists = await dbGet('users/' + user);
    if (exists) { q('regErr').textContent = '帳號已存在'; setSyncing(false); return; }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const prof = {
      password: pass, nick, avatar: '🐟', code,
      friends: {}, groups: {}, credits: 10, lastReset: today(),
      fishInv: {}, ownedRods: {bamboo: true}, activeRod: 'bamboo', totalFish: 0
    };
    await dbSet('users/' + user, prof);
    await dbSet('codes/' + code, user);
    setSyncing(false);
    toast('註冊成功！請登入', 'teal');
    switchTab('login');
  } catch(e) {
    q('regErr').textContent = '錯誤：' + (e.code || e.message || '未知錯誤');
    setSyncing(false);
  }
}

async function doLogout() {
  if (msgUnsub) { msgUnsub(); msgUnsub = null; }
  S.uid = null; S.prof = null; S.room = null;
  q('loginScr').style.display = '';
  q('loginScr').classList.add('on');
  q('appScr').style.display = 'none';
  q('appScr').classList.remove('on');
}

async function saveProf(patch) {
  Object.assign(S.prof, patch);
  await dbUpd('users/' + S.uid, patch);
}

// ══════════════════════════════════════
// ENTER APP
// ══════════════════════════════════════
function enterApp() {
  q('loginScr').style.display = 'none';
  q('loginScr').classList.remove('on');
  q('appScr').style.display = 'flex';
  q('appScr').classList.add('on');
  updateBar();
  buildAvatarPicker();
  showView('chat');
  initCanvas();
}

// ══════════════════════════════════════
// TOP BAR
// ══════════════════════════════════════
function updateBar() {
  if (!S.prof) return;
  q('meAv').textContent = S.prof.avatar;
  q('credNum').textContent = S.prof.credits;
  q('credDisp').textContent = S.prof.credits;
  q('myCodeDisp').textContent = S.prof.code;
  q('profCode').textContent = S.prof.code;
  q('profCred').textContent = S.prof.credits;
  q('profNick').value = S.prof.nick;
  q('profFish').textContent = S.prof.totalFish || 0;
  q('profFriends').textContent = Object.keys(S.prof.friends || {}).length;
  q('profGroups').textContent = Object.keys(S.prof.groups || {}).length;
}

function setSyncing(v) {
  q('syncDot').style.background = v ? 'var(--gold)' : 'var(--teal)';
}

// ══════════════════════════════════════
// VIEW ROUTING
// ══════════════════════════════════════
const VIEWS = ['chat','gallery','fishing','friends','groups','profile'];

function showView(v) {
  VIEWS.forEach(x => {
    const el = q('v-' + x); if (!el) return;
    el.classList.remove('on');
    el.style.display = 'none';
    const sn = q('sn-' + x); if (sn) sn.classList.remove('on');
  });
  const el = q('v-' + v);
  if (el) {
    el.style.display = el.classList.contains('view-scroll') ? 'block' : 'flex';
    el.classList.add('on');
  }
  const sn = q('sn-' + v); if (sn) sn.classList.add('on');
  S.view = v;

  q('lpAction').style.display = ['chat','friends'].includes(v) ? '' : 'none';
  q('lpTtl').textContent = {chat:'💬 訊息',gallery:'🖼️ 畫室',fishing:'🎣 釣魚',friends:'🤝 好友',groups:'👥 群組',profile:'⚙️ 設定'}[v] || '';

  if (v === 'chat')    renderChatList();
  if (v === 'gallery') renderGallery();
  if (v === 'fishing') renderFishPanel();
  if (v === 'friends') { renderFriendsView(); renderFriendListLeft(); }
  if (v === 'groups')  { renderGroupsView(); renderGroupListLeft(); }
  if (v === 'profile') { updateBar(); buildAvatarPicker(); q('lpBody').innerHTML = ''; }
}

function lpAction() { showView('friends'); }

// ══════════════════════════════════════
// CHAT LIST (left panel)
// ══════════════════════════════════════
async function renderChatList() {
  const el = q('lpBody');
  el.innerHTML = '<div class="loading"><div class="spin"></div>載入...</div>';
  const friends = Object.keys(S.prof.friends || {});
  const groups  = Object.keys(S.prof.groups || {});
  let html = '';
  if (friends.length) {
    html += '<div class="sec-lbl">好友</div>';
    for (const f of friends) {
      const fp = await dbGet('users/' + f); if (!fp) continue;
      const rid = roomId(S.uid, f);
      html += `<div class="li ${S.room?.id === rid ? 'on' : ''}" onclick="openDM('${f}')">
        <div class="li-av">${fp.avatar}</div>
        <div class="li-info"><div class="li-name">${fp.nick}</div><div class="li-sub">🎨 塗鴉</div></div>
      </div>`;
    }
  }
  if (groups.length) {
    html += '<div class="sec-lbl">群組</div>';
    for (const gid of groups) {
      const g = await dbGet('groups/' + gid); if (!g) continue;
      html += `<div class="li ${S.room?.id === gid ? 'on' : ''}" onclick="openGroup('${gid}')">
        <div class="li-av grp">${g.icon}</div>
        <div class="li-info"><div class="li-name">${g.name}</div><div class="li-sub">${Object.keys(g.members||{}).length}人</div></div>
      </div>`;
    }
  }
  el.innerHTML = html || '<div class="empty" style="padding:14px;font-size:0.75rem">還沒有好友<br>去加好友吧！</div>';
}

// ══════════════════════════════════════
// OPEN DM / GROUP
// ══════════════════════════════════════
async function openDM(friend) {
  const fp = await dbGet('users/' + friend); if (!fp) return;
  const rid = roomId(S.uid, friend);
  S.room = {id: rid, name: fp.nick, av: fp.avatar, type: 'dm'};
  q('chatAv').textContent = fp.avatar;
  q('chatName').textContent = fp.nick;
  showView('chat');
  renderChatList();
  listenMessages(rid, false);
}

async function openGroup(gid) {
  const g = await dbGet('groups/' + gid); if (!g) return;
  S.room = {id: gid, name: g.name, av: g.icon, type: 'group'};
  q('chatAv').textContent = g.icon;
  q('chatName').textContent = g.name + ' · ' + Object.keys(g.members||{}).length + '人';
  showView('chat');
  renderChatList();
  listenMessages(gid, true);
}

// ══════════════════════════════════════
// REAL-TIME MESSAGES
// ══════════════════════════════════════
function listenMessages(rId, isGroup) {
  if (msgUnsub) { msgUnsub(); msgUnsub = null; }
  const path = (isGroup ? 'groupMsgs/' : 'dms/') + rId;
  msgUnsub = dbListen(path, renderMsgData);
}

function renderMsgData(data) {
  const el = q('chatMsgs');
  if (!data) {
    el.innerHTML = '<div class="empty"><div class="ei">🎨</div>還沒有塗鴉訊息！</div>';
    return;
  }
  const msgs = Object.values(data).sort((a, b) => a.time - b.time);
  el.innerHTML = msgs.map(m => {
    const isMe = m.from === S.uid;
    const t = new Date(m.time).toLocaleTimeString('zh-TW', {hour:'2-digit', minute:'2-digit'});
    return `<div class="msg-row ${isMe ? 'me' : ''}">
      <div class="msg-av">${m.fromAv || '🐟'}</div>
      <div class="msg-bub">
        ${S.room?.type === 'group' && !isMe ? `<div class="msg-who">${m.fromNick || m.from}</div>` : ''}
        <img class="msg-img" src="${m.img}" style="max-width:240px" loading="lazy" onclick="openImgView('${m.img}')"/>
        <div class="msg-time">${t}</div>
      </div>
    </div>`;
  }).join('');
  el.scrollTop = el.scrollHeight;
}

async function sendPainting() {
  if (!S.room) return toast('請先選擇聊天對象', 'coral');
  if (S.prof.credits <= 0) return toast('今日次數用完！去釣魚換次數 🎣', 'gold');
  const img = document.getElementById('drawCanvas').toDataURL('image/png');
  const entry = {from: S.uid, fromNick: S.prof.nick, fromAv: S.prof.avatar, img, time: Date.now()};
  const isGroup = S.room.type === 'group';
  setSyncing(true);
  await dbPush((isGroup ? 'groupMsgs/' : 'dms/') + S.room.id, entry);
  await dbPush('gallery', {...entry, roomName: S.room.name, roomId: S.room.id});
  await saveProf({credits: S.prof.credits - 1});
  setSyncing(false);
  updateBar();
  clearCv();
  toast('塗鴉已送出！☁️', 'teal');
}

// ══════════════════════════════════════
// GALLERY
// ══════════════════════════════════════
async function renderGallery() {
  const el = q('galGrid');
  el.innerHTML = '<div class="loading" style="grid-column:1/-1"><div class="spin"></div>載入畫室...</div>';
  const filter = q('galFilter').value;
  const data = await dbGet('gallery');
  if (!data) {
    el.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="ei">🖼️</div>畫室是空的</div>';
    return;
  }
  let items = Object.values(data).sort((a, b) => b.time - a.time);
  if (filter === 'mine') items = items.filter(i => i.from === S.uid);
  el.innerHTML = items.slice(0, 80).map(g => `
    <div class="gal-item" onclick="openImgView('${g.img}')">
      <img class="gal-img" src="${g.img}" loading="lazy"/>
      <div class="gal-room">${g.roomName || '私訊'}</div>
      <div class="gal-meta">
        <div class="gal-who">${g.fromAv || '🐟'} ${g.fromNick || g.from}</div>
        <div class="gal-time">${new Date(g.time).toLocaleString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
      </div>
    </div>`).join('');
}

// ══════════════════════════════════════
// FRIENDS
// ══════════════════════════════════════
async function renderFriendListLeft() {
  const el = q('lpBody'); el.innerHTML = '';
  for (const f of Object.keys(S.prof.friends || {})) {
    const fp = await dbGet('users/' + f); if (!fp) continue;
    const d = document.createElement('div');
    d.className = 'li';
    d.innerHTML = `<div class="li-av">${fp.avatar}</div><div class="li-info"><div class="li-name">${fp.nick}</div><div class="li-sub">#${fp.code}</div></div>`;
    d.onclick = () => { openDM(f); showView('chat'); };
    el.appendChild(d);
  }
}

async function renderFriendsView() {
  const el = q('friendsEl');
  const friends = Object.keys(S.prof.friends || {});
  if (!friends.length) { el.innerHTML = '<div class="empty"><div class="ei">🤝</div>還沒有好友</div>'; return; }
  let html = '';
  for (const f of friends) {
    const fp = await dbGet('users/' + f); if (!fp) continue;
    html += `<div class="form-card" style="margin-bottom:10px;display:flex;align-items:center;gap:11px">
      <div style="font-size:26px">${fp.avatar}</div>
      <div><div style="font-weight:800">${fp.nick}</div><div style="font-size:0.7rem;color:var(--muted)">#${fp.code}</div></div>
      <button class="btn btn-ghost btn-xs" style="margin-left:auto" onclick="openDM('${f}');showView('chat')">💬</button>
    </div>`;
  }
  el.innerHTML = html;
}

async function addFriend() {
  const code = q('addCodeInp').value.trim();
  if (code.length !== 6) return toast('好友碼需為6位數字', 'coral');
  if (code === S.prof.code) return toast('不能加自己哦', 'coral');
  setSyncing(true);
  const targetUid = await dbGet('codes/' + code);
  if (!targetUid) { setSyncing(false); return toast('找不到此好友碼', 'coral'); }
  if ((S.prof.friends || {})[targetUid]) { setSyncing(false); return toast('已經是好友了', 'gold'); }
  const tp = await dbGet('users/' + targetUid);
  await dbUpd('users/' + S.uid + '/friends', {[targetUid]: true});
  await dbUpd('users/' + targetUid + '/friends', {[S.uid]: true});
  S.prof.friends = S.prof.friends || {};
  S.prof.friends[targetUid] = true;
  setSyncing(false);
  renderFriendsView(); renderFriendListLeft(); renderChatList(); updateBar();
  toast('已加入 ' + (tp?.nick || targetUid) + ' 為好友！', 'teal');
  q('addCodeInp').value = '';
}

function copyCode() {
  navigator.clipboard.writeText(S.prof.code)
    .then(() => toast('好友碼已複製！', 'teal'))
    .catch(() => toast('好友碼：' + S.prof.code, 'teal'));
}

// ══════════════════════════════════════
// GROUPS
// ══════════════════════════════════════
async function renderGroupListLeft() {
  const el = q('lpBody'); el.innerHTML = '';
  for (const gid of Object.keys(S.prof.groups || {})) {
    const g = await dbGet('groups/' + gid); if (!g) continue;
    const d = document.createElement('div');
    d.className = 'li';
    d.innerHTML = `<div class="li-av grp">${g.icon}</div><div class="li-info"><div class="li-name">${g.name}</div><div class="li-sub">${Object.keys(g.members||{}).length}人</div></div>`;
    d.onclick = () => { openGroup(gid); showView('chat'); };
    el.appendChild(d);
  }
}

async function renderGroupsView() {
  q('grpEmojiPick').innerHTML = GRP_EMOJIS.map(e =>
    `<div style="font-size:22px;cursor:pointer;padding:4px;border-radius:7px;border:2px solid ${S.grpEmoji===e?'var(--lav)':'transparent'};transition:all .15s" onclick="pickGrpEmoji('${e}',this)">${e}</div>`
  ).join('');
  const mp = q('grpMemberPick');
  const friends = Object.keys(S.prof.friends || {});
  if (!friends.length) { mp.innerHTML = '<div style="font-size:0.75rem;color:var(--muted)">先加好友才能建群組</div>'; }
  else {
    let html = '';
    for (const f of friends) {
      const fp = await dbGet('users/' + f); if (!fp) continue;
      html += `<label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" value="${f}" style="width:auto;accent-color:var(--lav)"/>
        <span style="font-size:16px">${fp.avatar}</span>
        <span style="font-size:0.82rem">${fp.nick}</span>
      </label>`;
    }
    mp.innerHTML = html;
  }
  const el = q('grpsDetailEl');
  const groups = Object.keys(S.prof.groups || {});
  if (!groups.length) { el.innerHTML = '<div class="empty"><div class="ei">👥</div>還沒有群組</div>'; return; }
  let html = '';
  for (const gid of groups) {
    const g = await dbGet('groups/' + gid); if (!g) continue;
    html += `<div class="form-card" style="margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:26px;background:var(--water);padding:5px;border-radius:9px">${g.icon}</div>
        <div><div style="font-weight:800">${g.name}</div><div style="font-size:0.7rem;color:var(--muted)">${Object.keys(g.members||{}).length} 人</div></div>
        <button class="btn btn-ghost btn-xs" style="margin-left:auto" onclick="openGroup('${gid}');showView('chat')">💬 進入</button>
      </div>
    </div>`;
  }
  el.innerHTML = html;
}

function pickGrpEmoji(e, el) {
  S.grpEmoji = e;
  document.querySelectorAll('#grpEmojiPick div').forEach(d => d.style.borderColor = 'transparent');
  el.style.borderColor = 'var(--lav)';
}

async function createGroup() {
  const name = q('grpName').value.trim();
  if (!name) return toast('請輸入群組名稱', 'coral');
  const checked = [...document.querySelectorAll('#grpMemberPick input:checked')].map(i => i.value);
  if (!checked.length) return toast('請選擇至少一位好友', 'coral');
  const members = [S.uid, ...checked];
  const gid = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const group = {name, icon: S.grpEmoji, members: Object.fromEntries(members.map(m => [m, true])), owner: S.uid, created: Date.now()};
  setSyncing(true);
  await dbSet('groups/' + gid, group);
  for (const m of members) await dbUpd('users/' + m + '/groups', {[gid]: true});
  S.prof.groups = S.prof.groups || {}; S.prof.groups[gid] = true;
  setSyncing(false);
  q('grpName').value = '';
  renderGroupsView(); renderGroupListLeft(); renderChatList(); updateBar();
  toast('群組「' + name + '」建立成功！', 'lav');
}

// ══════════════════════════════════════
// PROFILE
// ══════════════════════════════════════
function buildAvatarPicker() {
  const el = q('avPicker'); if (!el) return;
  el.innerHTML = AVATARS.map(a =>
    `<div class="av-opt ${S.prof && S.prof.avatar === a ? 'on' : ''}" data-e="${a}" onclick="pickAv(this)">${a}</div>`
  ).join('');
}

function pickAv(el) {
  document.querySelectorAll('.av-opt').forEach(o => o.classList.remove('on'));
  el.classList.add('on');
}

async function saveProfile() {
  const nick = q('profNick').value.trim();
  const sel = document.querySelector('.av-opt.on');
  const patch = {};
  if (nick) patch.nick = nick;
  if (sel) patch.avatar = sel.dataset.e;
  await saveProf(patch);
  updateBar(); q('meAv').textContent = S.prof.avatar;
  toast('設定已儲存！', 'teal');
}

// ══════════════════════════════════════
// SELL
// ══════════════════════════════════════
function openSell() {
  S.sellSel = {};
  const inv = S.prof.fishInv || {};
  const items = Object.entries(inv).filter(([, v]) => v > 0);
  if (!items.length) return toast('背包是空的', 'coral');
  q('sellBody').innerHTML = items.map(([id, cnt]) => {
    const f = FISH.find(x => x.id === id); if (!f) return '';
    const r = RAR[f.rarity];
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border2)">
      <span style="font-size:18px">${f.icon}</span>
      <div style="flex:1"><div style="font-size:0.8rem;font-weight:700">${f.name} <span class="${r.cls}" style="font-size:0.62rem">${r.lbl}</span></div>
      <div style="font-size:0.65rem;color:var(--muted)">×${cnt} · 各 ${f.val} 次</div></div>
      <input type="number" min="0" max="${cnt}" value="0" style="width:52px;text-align:center" oninput="updSell('${id}',this.value,${cnt},${f.val})"/>
    </div>`;
  }).join('');
  updSellTot();
  openModal('sellOvl');
}

function updSell(id, v, max, val) {
  v = Math.min(Math.max(0, parseInt(v) || 0), max);
  S.sellSel[id] = v; updSellTot();
}

function updSellTot() {
  const fv = {}; FISH.forEach(f => fv[f.id] = f.val);
  q('sellTot').textContent = Object.entries(S.sellSel).reduce((a, [id, c]) => a + (fv[id] || 0) * c, 0);
}

async function doSell() {
  const fv = {}; FISH.forEach(f => fv[f.id] = f.val);
  let total = 0; const inv = S.prof.fishInv || {};
  Object.entries(S.sellSel).forEach(([id, cnt]) => {
    if (cnt > 0 && (inv[id] || 0) >= cnt) { inv[id] -= cnt; total += fv[id] * cnt; }
  });
  await saveProf({fishInv: inv, credits: S.prof.credits + total});
  updateBar(); renderInv(); renderShop(); closeModal('sellOvl');
  toast('賣出成功！獲得 ' + total + ' 次', 'gold');
}
