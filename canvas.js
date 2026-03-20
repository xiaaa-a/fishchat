// ══════════════════════════════════════
// CANVAS DRAWING
// ══════════════════════════════════════
let cv, cx, drawColor = '#dff0ff', drawSize = 2, drawTool = 'draw', drawing = false, lx = 0, ly = 0;

function initCanvas() {
  cv = document.getElementById('drawCanvas');
  cx = cv.getContext('2d');
  cv.width = cv.parentElement.clientWidth || 480;
  cx.fillStyle = '#07111f'; cx.fillRect(0, 0, cv.width, cv.height);

  const pos = (e) => {
    const r = cv.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  };
  const dot = (x, y) => {
    cx.beginPath();
    cx.arc(x, y, drawTool === 'erase' ? 12 : drawSize / 2, 0, Math.PI * 2);
    cx.fillStyle = drawTool === 'erase' ? '#07111f' : drawColor;
    cx.fill();
  };
  const line = (x1, y1, x2, y2) => {
    cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2);
    cx.strokeStyle = drawTool === 'erase' ? '#07111f' : drawColor;
    cx.lineWidth = drawTool === 'erase' ? 24 : drawSize;
    cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.stroke();
  };

  cv.addEventListener('mousedown',  e => { drawing = true; const p = pos(e); lx = p.x; ly = p.y; dot(p.x, p.y); });
  cv.addEventListener('mousemove',  e => { if (!drawing) return; const p = pos(e); line(lx, ly, p.x, p.y); lx = p.x; ly = p.y; });
  cv.addEventListener('mouseup',    () => drawing = false);
  cv.addEventListener('mouseleave', () => drawing = false);
  cv.addEventListener('touchstart', e => { e.preventDefault(); drawing = true; const p = pos(e); lx = p.x; ly = p.y; dot(p.x, p.y); }, { passive: false });
  cv.addEventListener('touchmove',  e => { e.preventDefault(); if (!drawing) return; const p = pos(e); line(lx, ly, p.x, p.y); lx = p.x; ly = p.y; }, { passive: false });
  cv.addEventListener('touchend',   () => drawing = false);

  window.addEventListener('resize', () => {
    const w = cv.parentElement.clientWidth;
    if (w && w !== cv.width) { cv.width = w; cx.fillStyle = '#07111f'; cx.fillRect(0, 0, cv.width, cv.height); }
  });
}

function setC(el) {
  drawColor = el.dataset.c;
  document.querySelectorAll('.csw').forEach(b => b.classList.remove('on'));
  el.classList.add('on');
  if (drawTool === 'erase') setTool('draw', document.querySelector('.tool-btn'));
}

function setSz(el) {
  drawSize = parseInt(el.dataset.s);
  document.querySelectorAll('.sz-btn').forEach(b => b.classList.remove('on'));
  el.classList.add('on');
}

function setTool(t, el) {
  drawTool = t;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('on'));
  if (el) el.classList.add('on');
}

function clearCv() {
  if (!cx) return;
  cx.fillStyle = '#07111f'; cx.fillRect(0, 0, cv.width, cv.height);
}
