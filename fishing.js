// ══════════════════════════════════════
// FISHING PANEL
// ══════════════════════════════════════
function renderFishPanel() {
  renderInv(); renderShop();
  const rod = RODS.find(r => r.id === (S.prof.activeRod || 'bamboo'));
  q('rodDisp').textContent = rod ? rod.name : '基本竹竿';
  q('lpBody').innerHTML = '<div class="empty" style="padding:16px"><div class="ei">🎣</div>點擊湖面<br>開始釣魚！</div>';
}

function renderInv() {
  const el = q('invGrid');
  const inv = S.prof.fishInv || {};
  const items = Object.entries(inv).filter(([, v]) => v > 0);
  if (!items.length) {
    el.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:12px;font-size:0.72rem;color:var(--muted)">背包是空的！</div>';
    return;
  }
  el.innerHTML = items.map(([id, cnt]) => {
    const f = FISH.find(x => x.id === id); if (!f) return '';
    const r = RAR[f.rarity];
    return `<div class="inv-slot ${r.rc}"><div class="fi">${f.icon}</div><div class="fn ${r.cls}">${f.name}</div><div class="fc-n">×${cnt}</div></div>`;
  }).join('');
}

function renderShop() {
  const el = q('shopRow');
  const owned = S.prof.ownedRods || {bamboo: true};
  const active = S.prof.activeRod || 'bamboo';
  el.innerHTML = RODS.map(r => {
    const isOwned = owned[r.id], isActive = active === r.id;
    return `<div class="si">
      <div style="font-size:22px">${r.icon}</div>
      <div class="si-info"><div class="si-name">${r.name}</div><div class="si-desc">${r.desc}</div></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <div class="si-price">💰${r.price || '免費'}</div>
        ${isOwned
          ? `<button class="btn btn-teal btn-xs" ${isActive ? 'disabled style="opacity:.5"' : ''} onclick="equipRod('${r.id}')">${isActive ? '使用中' : '裝備'}</button>`
          : `<button class="btn btn-gold btn-xs" onclick="buyRod('${r.id}')">購買</button>`}
      </div>
    </div>`;
  }).join('');
}

async function buyRod(id) {
  const rod = RODS.find(r => r.id === id); if (!rod) return;
  if (S.prof.credits < rod.price) return toast('次數不足！賣魚換更多', 'coral');
  const ownedRods = S.prof.ownedRods || {bamboo: true};
  ownedRods[id] = true;
  await saveProf({credits: S.prof.credits - rod.price, ownedRods, activeRod: id});
  renderShop(); updateBar(); q('rodDisp').textContent = rod.name;
  toast('購買 ' + rod.name + ' 成功！', 'gold');
}

async function equipRod(id) {
  await saveProf({activeRod: id});
  renderShop();
  const rod = RODS.find(r => r.id === id);
  q('rodDisp').textContent = rod ? rod.name : '';
  toast('已裝備 ' + rod.name, 'teal');
}

// ══════════════════════════════════════
// FISHING MINI-GAME ENGINE
// ══════════════════════════════════════
const FG = {
  phase: 'idle',   // idle | casting | waiting | reeling | escaped | caught
  caught: null,
  stam: 100,        // 0-100 stamina
  tens: 50,         // 0-100 line tension
  reeling: false,
  loopId: null,
  waitTimer: null,
  strugTimer: null,
  escTimer: null,
  lastT: 0,
  catchProg: 0,
};

const FG_CFG = {
  reelGain:    2.8,   // tension gain/tick when reeling
  idleDecay:   1.6,   // tension decay/tick when idle
  stamDrain:   1.4,   // stamina drain/tick when reeling
  stamRegen:   0.4,   // stamina regen/tick when idle
  swMin: 60,          // sweet zone min tension %
  swMax: 95,          // sweet zone max tension %
  holdTime: 1.5,      // seconds to hold in sweet zone to catch
  strugMin: 900,
  strugMax: 2400,
  escapeMs: 10000,
};

function pickFish() {
  const rod = RODS.find(r => r.id === (S.prof.activeRod || 'bamboo'));
  const bonus = rod ? rod.bonus : 0;
  const ws = FISH.map(f => {
    let w = f.w;
    if (['rare','epic','legendary'].includes(f.rarity)) w *= (1 + bonus);
    return w;
  });
  const total = ws.reduce((a, b) => a + b, 0);
  let rnd = Math.random() * total;
  for (let i = 0; i < FISH.length; i++) { rnd -= ws[i]; if (rnd <= 0) return FISH[i]; }
  return FISH[0];
}

function castLine() {
  if (FG.phase !== 'idle') return;
  FG.phase = 'casting';

  const hw = q('hookWrap'), hl = q('hookLine'), lc = q('lakeCenter');
  hw.style.display = 'flex'; hl.style.height = '0px';
  lc.style.display = 'block';
  lc.innerHTML = '<div style="font-size:1.3rem">🎣</div><div style="font-size:0.7rem;color:var(--teal);margin-top:3px">拋竿中...</div>';
  q('fishGameUI').classList.remove('on');

  let h = 0;
  const anim = setInterval(() => {
    h += 7; hl.style.height = h + 'px';
    if (h >= 150) {
      clearInterval(anim);
      FG.phase = 'waiting';
      lc.innerHTML = '<div style="font-size:1.1rem">⏳</div><div style="font-size:0.7rem;color:var(--muted);margin-top:3px">等待上鉤...</div>';
      FG.waitTimer = setTimeout(startBite, 1500 + Math.random() * 3000);
    }
  }, 28);
}

function startBite() {
  if (FG.phase !== 'waiting') return;
  FG.caught = pickFish();
  FG.stam = 100; FG.tens = 50;
  FG.phase = 'reeling'; FG.reeling = false; FG.catchProg = 0;

  // Bite effect
  const lc = q('lakeCenter');
  lc.innerHTML = '<div style="font-size:1.6rem;animation:snapIn .35s ease forwards">💥</div><div style="font-size:0.75rem;color:var(--gold);font-weight:800;margin-top:3px">上鉤了！！</div>';
  if (navigator.vibrate) navigator.vibrate([80, 40, 80]);

  setTimeout(() => {
    lc.style.display = 'none';
    q('fishGameUI').classList.add('on');
    q('fishEmoji').textContent = FG.caught.icon;
    q('fishEmoji').className = 'fish-em';
    const r = RAR[FG.caught.rarity];
    const colorMap = {common:'var(--muted)',uncommon:'var(--teal)',rare:'var(--sky)',epic:'var(--lav)',legendary:'var(--gold)'};
    q('fishGameMsg').textContent = FG.caught.name + ' (' + r.lbl + ')';
    q('fishGameMsg').style.color = colorMap[FG.caught.rarity];
    updateBars();
    startFishLoop();
    scheduleStruggle();
    FG.escTimer = setTimeout(() => fishEscape('等太久了！魚跑掉了 😭'), FG_CFG.escapeMs);
  }, 600);
}

function startFishLoop() {
  if (FG.loopId) cancelAnimationFrame(FG.loopId);
  FG.lastT = performance.now();
  function loop(now) {
    if (FG.phase !== 'reeling') return;
    const dt = (now - FG.lastT) / 1000;
    FG.lastT = now;

    if (FG.reeling) {
      FG.tens = Math.min(100, FG.tens + FG_CFG.reelGain * dt * 60);
      FG.stam = Math.max(0,   FG.stam - FG_CFG.stamDrain * dt * 60);
    } else {
      FG.tens = Math.max(0, FG.tens - FG_CFG.idleDecay * dt * 60);
      FG.stam = Math.min(100, FG.stam + FG_CFG.stamRegen * dt * 60);
    }

    if (FG.stam <= 0)      return fishEscape('體力耗盡！魚跑掉了 😭');
    if (FG.tens >= 100)    return fishEscape('釣線斷了！魚跑掉了 😭');
    if (FG.tens <= 0)      return fishEscape('線太鬆！魚跑掉了 😭');

    // Catch condition: hold in sweet zone
    const inSweet = FG.tens >= FG_CFG.swMin && FG.tens <= FG_CFG.swMax && FG.reeling;
    if (inSweet) {
      FG.catchProg = (FG.catchProg || 0) + dt;
      if (FG.catchProg >= FG_CFG.holdTime) return fishCaught();
    } else {
      FG.catchProg = 0;
    }

    updateBars();
    FG.loopId = requestAnimationFrame(loop);
  }
  FG.loopId = requestAnimationFrame(loop);
}

function updateBars() {
  q('stamFill').style.width = FG.stam + '%';
  q('tensFill').style.width = FG.tens + '%';
  q('stamNum').textContent  = Math.round(FG.stam);
  q('tensNum').textContent  = Math.round(FG.tens);

  // Stam color
  q('stamFill').style.background =
    FG.stam > 50 ? 'linear-gradient(90deg,#f59e0b,#ffd166)' :
    FG.stam > 20 ? 'linear-gradient(90deg,#f97316,#fb923c)' :
                   'linear-gradient(90deg,#ef4444,#ff6b6b)';

  // Tens color + message
  const inSweet = FG.tens >= FG_CFG.swMin && FG.tens <= FG_CFG.swMax;
  q('tensFill').style.background =
    FG.tens >= 95 ? 'linear-gradient(90deg,#ef4444,#ff6b6b)' :
    inSweet       ? 'linear-gradient(90deg,var(--teal),#00e5c2)' :
    FG.tens < 15  ? 'linear-gradient(90deg,#ef4444,#ff6b6b)' :
                    'linear-gradient(90deg,var(--sky),var(--lav))';

  // Message
  const msg = q('fishGameMsg');
  if (FG.tens >= 95) {
    msg.textContent = '⚠️ 放鬆！快斷線了！'; msg.style.color = 'var(--coral)';
  } else if (inSweet && FG.reeling) {
    const pct = Math.round((FG.catchProg / FG_CFG.holdTime) * 100);
    msg.textContent = '✅ 收線中！' + pct + '%'; msg.style.color = 'var(--teal)';
  } else if (FG.tens < 20) {
    msg.textContent = '⬆️ 快收線！太鬆了！'; msg.style.color = 'var(--coral)';
  } else if (!FG.reeling) {
    msg.textContent = '⬆️ 長按收線！'; msg.style.color = 'var(--gold)';
  }
}

function scheduleStruggle() {
  if (FG.phase !== 'reeling') return;
  const delay = FG_CFG.strugMin + Math.random() * (FG_CFG.strugMax - FG_CFG.strugMin);
  FG.strugTimer = setTimeout(doStruggle, delay);
}

function doStruggle() {
  if (FG.phase !== 'reeling') return;
  const drop = 15 + Math.random() * 25;
  FG.tens = Math.max(0, FG.tens - drop);
  q('fishEmoji').className = 'fish-em wiggling';
  setTimeout(() => { if (q('fishEmoji')) q('fishEmoji').className = 'fish-em'; }, 500);
  if (navigator.vibrate) navigator.vibrate(60);
  scheduleStruggle();
}

function startReel(e) {
  if (e) e.preventDefault();
  if (FG.phase !== 'reeling') return;
  FG.reeling = true;
  q('holdBtn').classList.add('pressing');
}

function stopReel(e) {
  if (e) e.preventDefault();
  FG.reeling = false;
  if (q('holdBtn')) q('holdBtn').classList.remove('pressing');
}

function fishEscape(msg) {
  if (FG.phase === 'escaped' || FG.phase === 'caught') return;
  clearFGTimers();
  FG.phase = 'escaped'; FG.reeling = false;
  q('fishGameUI').classList.remove('on');
  q('hookWrap').style.display = 'none'; q('hookLine').style.height = '0px';
  const lc = q('lakeCenter');
  lc.style.display = 'block';
  lc.innerHTML = `<div style="font-size:2rem">😭</div><div style="font-size:0.75rem;color:var(--coral);font-weight:800;margin-top:4px">${msg || '魚跑掉了！'}</div><div style="font-size:0.65rem;color:var(--muted);margin-top:4px">點擊再試一次</div>`;
  toast(msg || '魚跑掉了！', 'coral');
  setTimeout(resetFG, 1500);
}

async function fishCaught() {
  if (FG.phase === 'caught') return;
  clearFGTimers();
  FG.phase = 'caught'; FG.reeling = false;
  const caught = FG.caught;

  q('fishGameUI').classList.remove('on');
  q('hookWrap').style.display = 'none'; q('hookLine').style.height = '0px';
  const lc = q('lakeCenter');
  lc.style.display = 'block';
  const r = RAR[caught.rarity];
  lc.innerHTML = `<div style="font-size:2.4rem;animation:snapIn .4s ease">${caught.icon}</div><div style="font-weight:800;color:var(--gold);margin-top:3px">${caught.name}</div><div class="${r.cls}" style="font-size:0.68rem;font-weight:800">${r.lbl}</div>`;
  if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);

  const inv = S.prof.fishInv || {};
  inv[caught.id] = (inv[caught.id] || 0) + 1;
  await saveProf({fishInv: inv, totalFish: (S.prof.totalFish || 0) + 1});

  const log = q('catchLog');
  const entry = document.createElement('div');
  entry.innerHTML = `${caught.icon} <span class="${r.cls}">${caught.name}</span> <span style="color:var(--muted)">${r.lbl}</span>`;
  log.prepend(entry); if (log.children.length > 7) log.lastChild.remove();

  renderInv(); updateBar();
  q('catchIcon').textContent = caught.icon;
  q('catchName').textContent = caught.name;
  q('catchRarity').textContent = r.lbl; q('catchRarity').className = r.cls;
  q('catchVal').textContent = '賣出可換 ' + caught.val + ' 次訊息';

  setTimeout(() => { openModal('catchOvl'); resetFG(); }, 800);
}

function clearFGTimers() {
  if (FG.loopId)    { cancelAnimationFrame(FG.loopId); FG.loopId = null; }
  if (FG.waitTimer) { clearTimeout(FG.waitTimer); FG.waitTimer = null; }
  if (FG.strugTimer){ clearTimeout(FG.strugTimer); FG.strugTimer = null; }
  if (FG.escTimer)  { clearTimeout(FG.escTimer);  FG.escTimer = null; }
}

function resetFG() {
  FG.phase = 'idle'; FG.caught = null;
  FG.stam = 100; FG.tens = 50;
  FG.reeling = false; FG.catchProg = 0;
}
