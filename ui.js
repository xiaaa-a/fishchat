// ══════════════════════════════════════
// TOAST
// ══════════════════════════════════════
function toast(msg, type = 'teal') {
  const c = document.getElementById('toastWrap');
  const t = document.createElement('div');
  t.className = 'toast ' + type; t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 2600);
}

// ══════════════════════════════════════
// MODALS
// ══════════════════════════════════════
function openModal(id)  { document.getElementById(id).classList.add('on');    document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).classList.remove('on'); document.getElementById(id).style.display = 'none'; }

function overlayClick(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}

// ══════════════════════════════════════
// IMAGE VIEWER
// ══════════════════════════════════════
function openImgView(src) {
  document.getElementById('imgViewImg').src = src;
  document.getElementById('imgView').style.display = 'flex';
  document.getElementById('imgView').classList.add('on');
}

function closeImgView() {
  document.getElementById('imgView').style.display = 'none';
  document.getElementById('imgView').classList.remove('on');
}

// ══════════════════════════════════════
// PARTICLES
// ══════════════════════════════════════
(function makeParticles() {
  const c = document.getElementById('particles');
  for (let i = 0; i < 14; i++) {
    const b = document.createElement('div');
    b.className = 'pt';
    const s = 5 + Math.random() * 18;
    b.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;animation-duration:${10+Math.random()*16}s;animation-delay:${-Math.random()*16}s`;
    c.appendChild(b);
  }
})();

// ══════════════════════════════════════
// KEYBOARD
// ══════════════════════════════════════
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['sellOvl','catchOvl'].forEach(closeModal);
    closeImgView();
  }
});
