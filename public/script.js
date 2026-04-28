/* NextBigWin script.js - Full API version */
const API = '/api';
const pad = n => String(n).padStart(2, '0');

function toast(msg, type) {
  type = type || 'success';
  const el = document.createElement('div');
  el.className = 'nbw-toast nbw-toast--' + type;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('nbw-toast--show'));
  setTimeout(() => { el.classList.remove('nbw-toast--show'); setTimeout(() => el.remove(), 400); }, 4200);
}

/* Navbar */
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  document.getElementById('navbar')?.classList.toggle('scrolled', y > 60);
  const h = (document.querySelector('.hero') || {}).offsetHeight || 600;
  document.getElementById('stickyCTA')?.classList.toggle('show', y > h * 0.4);
}, { passive: true });

document.getElementById('navToggle')?.addEventListener('click', () => {
  const open = document.getElementById('navMobile')?.classList.toggle('open');
  document.getElementById('navToggle')?.classList.toggle('open', open);
});
document.querySelectorAll('#navMobile a').forEach(a => a.addEventListener('click', () => {
  document.getElementById('navMobile')?.classList.remove('open');
  document.getElementById('navToggle')?.classList.remove('open');
}));

/* Smooth scroll */
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const href = a.getAttribute('href');
  if (href === '#') return;
  const t = document.querySelector(href);
  if (!t) return;
  e.preventDefault();
  window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
}));

/* FAQ */
document.querySelectorAll('.faq-q').forEach(btn => btn.addEventListener('click', () => {
  const item = btn.parentElement;
  const was = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
  if (!was) item.classList.add('open');
}));

/* Scroll reveal */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* Particles */
(() => {
  const cv = document.getElementById('particles'); if (!cv) return;
  const ctx = cv.getContext('2d'); let W, H, pts = [];
  const rz = () => { W = cv.width = cv.offsetWidth; H = cv.height = cv.offsetHeight; };
  rz(); window.addEventListener('resize', rz, { passive: true });
  function Pt() {
    this.reset = () => {
      this.x = Math.random()*W; this.y = H+10; this.vx = (Math.random()-.5)*.5;
      this.vy = -(Math.random()*1.1+.4); this.sz = Math.random()*2+.8;
      this.life = 0; this.maxLife = Math.random()*280+140; this.max = Math.random()*.45+.1;
    };
    this.reset(); this.y = Math.random()*H;
  }
  for (let i = 0; i < 50; i++) pts.push(new Pt());
  (function draw() {
    ctx.clearRect(0, 0, W, H);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.life++;
      const t = p.life/p.maxLife;
      const a = t<.15 ? (t/.15)*p.max : t>.75 ? ((1-t)/.25)*p.max : p.max;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.sz, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(212,175,55,'+a.toFixed(3)+')'; ctx.fill();
      if (p.life >= p.maxLife || p.y < -10) p.reset();
    });
    requestAnimationFrame(draw);
  })();
})();

/* Countdown */
let drawTarget = null;
function getNextFri() {
  const now = new Date(), eo = 3*60, lo = -now.getTimezoneOffset(), d = eo-lo;
  const e = new Date(now.getTime()+d*60000);
  let days = (5-e.getDay()+7)%7;
  if (days===0 && e.getHours()>=20) days=7;
  const f = new Date(e); f.setDate(e.getDate()+days); f.setHours(20,0,0,0);
  return new Date(f.getTime()-d*60000);
}
async function loadDrawDate() {
  try {
    const r = await fetch(API+'/draws/current');
    const data = await r.json();
    if (data.success && data.draw && data.draw.drawDate) {
      drawTarget = new Date(data.draw.drawDate);
      const lb = document.getElementById('cd-date-label');
      if (lb) lb.textContent = 'Next draw: '+drawTarget.toLocaleDateString('en-KE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+' at 8:00 PM EAT';
    }
  } catch { drawTarget = getNextFri(); }
}
function updateCD() {
  const tgt = drawTarget || getNextFri(); const diff = tgt - Date.now();
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  if (diff <= 0) { ['cd-days','cd-hours','cd-mins','cd-secs'].forEach(id => set(id,'00')); return; }
  set('cd-days',  pad(Math.floor(diff/86400000)));
  set('cd-hours', pad(Math.floor((diff%86400000)/3600000)));
  set('cd-mins',  pad(Math.floor((diff%3600000)/60000)));
  set('cd-secs',  pad(Math.floor((diff%60000)/1000)));
}
loadDrawDate(); updateCD(); setInterval(updateCD, 1000);

/* Winners from API */
async function loadWinners() {
  try {
    const r = await fetch(API+'/winners?featured=true&limit=6');
    const data = await r.json();
    if (!data.success || !data.winners || !data.winners.length) return;
    const grid = document.querySelector('.winners-grid'); if (!grid) return;
    grid.innerHTML = '';
    const cols = [['#D4AF37','#8B6914'],['#667eea','#764ba2'],['#f093fb','#f5576c'],['#4facfe','#00f2fe'],['#43e97b','#38f9d7'],['#fa709a','#fee140']];
    data.winners.forEach((w, i) => {
      const init = w.firstName ? w.firstName.slice(0,2).toUpperCase() : w.maskedPhone.slice(0,2);
      const c1 = cols[i%cols.length][0], c2 = cols[i%cols.length][1];
      const card = document.createElement('div');
      card.className = 'winner-card'+(i===0?' winner-featured':'')+' reveal';
      card.style.setProperty('--d', (i*.08)+'s');
      const q = w.testimonial ? '<blockquote>'+w.testimonial+'</blockquote>' : '';
      if (i===0) {
        card.innerHTML = '<div class="wf-avatar" style="--c1:'+c1+';--c2:'+c2+'">'+init+'<div class="play-btn">&#9658;</div></div>'
          +'<span class="w-prize-tag">'+w.prizeEmoji+' '+w.prize+'</span>'
          +'<h4>'+(w.firstName||'Winner')+'</h4><p class="w-loc">'+(w.location||'Kenya')+'</p>'+q
          +'<span class="w-draw">Draw #'+w.drawNumber+'</span>';
      } else {
        card.innerHTML = '<div class="w-avatar" style="--c1:'+c1+';--c2:'+c2+'">'+init+'</div>'
          +'<span class="w-prize-tag">'+w.prizeEmoji+' '+w.prize+'</span>'
          +'<h4>'+(w.firstName||'Winner')+'</h4><p class="w-loc">'+(w.location||'Kenya')+'</p>'+q;
      }
      grid.appendChild(card); io.observe(card);
    });
  } catch {}
}
loadWinners();

/* Newsletter */
async function handleNewsletter(e) {
  e.preventDefault();
  const form = e.target, btn = form.querySelector('button'), inp = form.querySelector('input');
  const email = inp.value.trim(); btn.textContent = 'Sending...'; btn.disabled = true;
  try {
    const r = await fetch(API+'/newsletter/subscribe', {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email})
    });
    const data = await r.json();
    if (data.success) { btn.textContent='Done!'; btn.style.background='#22c55e'; btn.style.color='#fff'; inp.value=''; toast(data.message,'success'); }
    else { toast(data.message||'Error','error'); btn.textContent='Subscribe'; btn.disabled=false; }
  } catch { toast('Network error','error'); btn.textContent='Subscribe'; btn.disabled=false; }
  setTimeout(() => { btn.textContent='Subscribe'; btn.style.background=''; btn.style.color=''; btn.disabled=false; }, 3500);
}

/* Buy Modal */
const modal     = document.getElementById('buyModal');
const buyForm   = document.getElementById('buyForm');
const buyPhone  = document.getElementById('buyPhone');
const buyQty    = document.getElementById('buyQty');
const buyTotal  = document.getElementById('buyTotal');
const buySubmit = document.getElementById('buySubmit');
const buyStep1  = document.getElementById('buyStep1');
const buyStep2  = document.getElementById('buyStep2');
const PRICE     = 100;
let pollTimer   = null;

function openModal()  { if (modal) { modal.classList.add('open'); document.body.style.overflow = 'hidden'; resetModal(); } }
function closeModal() { if (modal) { modal.classList.remove('open'); document.body.style.overflow = ''; } clearInterval(pollTimer); }
function resetModal() {
  if (buyStep1) buyStep1.style.display = '';
  if (buyStep2) buyStep2.style.display = 'none';
  if (buyPhone) buyPhone.value = '';
  if (buyQty)   buyQty.value = '1';
  if (buyTotal) buyTotal.textContent = 'KES ' + PRICE;
  if (buySubmit) { buySubmit.textContent = 'Pay with M-PESA'; buySubmit.disabled = false; }
  document.querySelectorAll('.qty-preset').forEach((b, i) => b.classList.toggle('active', i === 0));
}

document.querySelectorAll('[href="#buy"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openModal(); }));
document.querySelectorAll('.sticky-btn, .final-btn').forEach(el => el.addEventListener('click', e => { e.preventDefault(); openModal(); }));
document.getElementById('modalClose')?.addEventListener('click', closeModal);
modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

buyQty?.addEventListener('input', () => {
  const q = Math.max(1, Math.min(10, parseInt(buyQty.value)||1));
  buyQty.value = q; if (buyTotal) buyTotal.textContent = 'KES '+(q*PRICE);
});
document.querySelectorAll('.qty-preset').forEach(btn => btn.addEventListener('click', () => {
  const q = parseInt(btn.dataset.qty);
  if (buyQty) { buyQty.value = q; buyQty.dispatchEvent(new Event('input')); }
  document.querySelectorAll('.qty-preset').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}));

buyForm?.addEventListener('submit', async e => {
  e.preventDefault();
  const phone    = buyPhone?.value.trim();
  const quantity = parseInt(buyQty?.value)||1;
  if (!phone) { toast('Enter your M-PESA phone number', 'error'); return; }
  if (buySubmit) { buySubmit.textContent = 'Sending M-PESA prompt...'; buySubmit.disabled = true; }
  try {
    const r = await fetch(API+'/tickets/buy', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({phone, quantity})
    });
    const data = await r.json();
    if (data.success) {
      if (buyStep1) buyStep1.style.display = 'none';
      if (buyStep2) {
        buyStep2.style.display = '';
        const m = document.getElementById('stkMessage'); if (m) m.textContent = data.message;
      }
      startPolling(data.checkoutRequestId);
    } else {
      toast(data.message||'Payment failed. Try again.','error');
      if (buySubmit) { buySubmit.textContent = 'Pay with M-PESA'; buySubmit.disabled = false; }
    }
  } catch {
    toast('Network error. Check your connection.','error');
    if (buySubmit) { buySubmit.textContent = 'Pay with M-PESA'; buySubmit.disabled = false; }
  }
});

function startPolling(cid) {
  let att = 0; const max = 24;
  const prog = document.getElementById('pollProgress');
  pollTimer = setInterval(async () => {
    att++;
    if (prog) prog.textContent = 'Waiting for payment confirmation... (' + att + '/' + max + ')';
    try {
      const r = await fetch(API+'/tickets/status/'+cid);
      const data = await r.json();
      if (data.success) {
        if (data.status === 'confirmed') { clearInterval(pollTimer); showSuccess(data.ticketId, data.phone); }
        else if (data.status === 'cancelled') { clearInterval(pollTimer); toast('Payment cancelled. Please try again.','error'); resetModal(); }
      }
    } catch {}
    if (att >= max) { clearInterval(pollTimer); if (prog) prog.textContent = 'Check your SMS for your Ticket ID shortly.'; }
  }, 5000);
}

function showSuccess(ticketId, maskedPhone) {
  if (buyStep2) {
    buyStep2.innerHTML =
      '<div class="buy-success">'
      + '<div class="success-icon">&#127881;</div>'
      + '<h3>You Are In the Draw!</h3>'
      + '<p>Your ticket is confirmed. Your Ticket ID:</p>'
      + '<div class="ticket-id-display">' + ticketId + '</div>'
      + '<p class="ticket-note">Also sent to <strong>' + maskedPhone + '</strong> via SMS. Save this ID.</p>'
      + '<p class="ticket-draw">Watch the LIVE draw every Friday 8PM<br><strong>@NextBigWinKe on TikTok and Instagram</strong></p>'
      + '<button class="btn-primary" onclick="closeModal()">Awesome, I Am Ready!</button>'
      + '</div>';
  }
  toast('Ticket confirmed! Check your SMS.', 'success');
}
