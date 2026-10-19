import './style.css';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Stage, smooth } from './lily.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------- scroll */

const lenis = new Lenis({ lerp: reduce ? 1 : 0.085, smoothWheel: !reduce, wheelMultiplier: 0.95 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
window.__lenis = lenis;

$$('a[href^="#"]').forEach((a) =>
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    lenis.scrollTo(target, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
  })
);

/* -------------------------------------------------------------- clock */

function tick() {
  const d = new Date();
  const off = -d.getTimezoneOffset() / 60;
  const t = `${d.toLocaleTimeString('en-GB')} (GMT${off >= 0 ? '+' : ''}${off})`;
  $('#clock').textContent = t;
  $('#clock2').textContent = t;
}
tick();
setInterval(tick, 1000);

/* ----------------------------------------------------- word reveal */

function wrapWords(node) {
  [...node.childNodes].forEach((n) => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(' '));
        const w = document.createElement('span');
        w.className = 'w';
        w.textContent = part;
        frag.appendChild(w);
      });
      n.replaceWith(frag);
    } else if (n.nodeType === 1) wrapWords(n);
  });
}
const statement = $('#statement');
wrapWords(statement);

/* -------------------------------------------------------------- stage */

const stage = new Stage($('#scene'));
window.__stage = stage;

let W = innerWidth;
let H = innerHeight;
let geo = null;

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function measure() {
  W = innerWidth;
  H = innerHeight;
  stage.resize(W, H);
  const sy = window.scrollY;
  const top = (el) => el.getBoundingClientRect().top + sy;
  const narrow = W < 760;

  const Smax = document.documentElement.scrollHeight - H;
  const T = { work: top($('#work')), contact: top($('#contact')) };
  const footTop = top($('#foot')) - Smax;

  const lilyH = 5.7 * stage.unit * stage.pxPerUnit;
  const contactOY = footTop + H * 0.06;
  const topX = W * (narrow ? 0.66 : 0.76);
  const mk = (S, originY, topY, ry) => {
    const k = clamp((originY - topY) / (lilyH * 0.82), 0.4, 2.2);
    const ox = W * 1.03;
    const lean = clamp(Math.asin(clamp((ox - topX) / (lilyH * k * 0.95), 0, 0.98)), 0.3, 1.15);
    return { S, x: ox, y: originY, k, ry, lean };
  };

  const keys = [
    mk(0, H * 1.0, H * 0.3, -0.5),
    mk(T.work + 0.3 * H, H * 1.02, H * 0.34, -0.2),
    mk(T.contact + 0.2 * H, H * 1.0, H * 0.3, 0.1),
    mk(Smax, contactOY, H * 0.24, 0.3),
  ];
  geo = { keys, T, Smax };
}

function sample(S) {
  const K = geo.keys;
  const n = K.length;
  let i = 0;
  while (i < n - 2 && S >= K[i + 1].S) i++;
  const a = K[i];
  const b = K[i + 1];
  const t = clamp((S - a.S) / (b.S - a.S || 1), 0, 1);
  const p0 = K[Math.max(i - 1, 0)];
  const p3 = K[Math.min(i + 2, n - 1)];
  const c = (k) => catmull(p0[k], a[k], b[k], p3[k], t);
  return { x: c('x'), y: c('y'), k: c('k'), ry: c('ry'), lean: c('lean') };
}

const st = { x: 0, y: 0, k: 1, ry: -0.4, lean: 0.6, bloom: 0 };
let ready = false;
let time = 0;
let last = performance.now();

gsap.ticker.add(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000) || 0.016;
  last = now;
  time += dt;
  if (!geo) return;

  const S = lenis.scroll;
  const target = sample(S);
  if (!ready) {
    Object.assign(st, target);
    ready = true;
  }
  const f = 1 - Math.exp(-dt * 6);
  st.x += (target.x - st.x) * f;
  st.y += (target.y - st.y) * f;
  st.k += (target.k - st.k) * f;
  st.ry += (target.ry - st.ry) * f;
  st.lean += (target.lean - st.lean) * f;

  const bloom = smooth(H * 0.15, geo.T.contact + H * 0.15, S);
  st.bloom += (bloom - st.bloom) * (1 - Math.exp(-dt * 5));
  stage.update(st, time);
});

/* ----------------------------------------------------- page motion */

gsap.to($$('.w', statement), {
  opacity: 1,
  stagger: 0.12,
  ease: 'none',
  scrollTrigger: { trigger: '#intro', start: 'top 70%', end: 'bottom 55%', scrub: true },
});

const isNarrow = () => innerWidth < 760;

/* selected work: rows light up and cards stack */
(() => {
  const rows = $$('.w-row');
  const cards = $$('.w-card');
  gsap.set(cards.slice(1), { yPercent: 108 });
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.w-wrap',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6,
      onUpdate: (self) => {
        const idx = clamp(Math.floor(self.progress * 3), 0, 2);
        rows.forEach((r, i) => r.classList.toggle('is-active', i === idx));
      },
    },
    defaults: { ease: 'none' },
  });
  tl.to(cards[1], { yPercent: 0, duration: 1 }, 0.5);
  tl.to(cards[2], { yPercent: 0, duration: 1 }, 1.6);
  tl.to({}, { duration: 1 }, 2.6);
})();

/* explore more strip */
(() => {
  const track = $('.explore-track');
  let x = 0;
  gsap.ticker.add((t, dtMs) => {
    const half = track.scrollWidth / 2;
    x -= (0.08 + Math.abs(lenis.velocity) * 0.02) * dtMs;
    if (-x >= half) x += half;
    gsap.set(track, { x });
  });
})();

/* let's talk: the diamond rolls along the dotted line */
(() => {
  const dia = $('#diamond');
  const shape = $('b', dia);
  const roll = $('#roll');
  const trigger = { trigger: '#contact', start: 'top 40%', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true };
  gsap.fromTo(dia, { x: 0 }, { x: () => roll.clientWidth - dia.offsetWidth, ease: 'none', scrollTrigger: trigger });
  gsap.fromTo(shape, { rotation: 0 }, { rotation: 360, ease: 'none', scrollTrigger: trigger });
})();

/* ------------------------------------------------------------- intro */

function intro() {
  gsap.set('.nav > *, .hero-sub, .hero-title, .hero-meta > *', { opacity: 0, y: 26 });
  gsap.set('#scene', { opacity: 0 });
  gsap
    .timeline({ delay: 0.2, defaults: { ease: 'power4.out' } })
    .to('.nav > *', { opacity: 1, y: 0, duration: 1, stagger: 0.08 }, 0)
    .to('.hero-sub', { opacity: 1, y: 0, duration: 1 }, 0.3)
    .to('.hero-title', { opacity: 1, y: 0, duration: 1.4 }, 0.45)
    .to('.hero-meta > *', { opacity: 1, y: 0, duration: 1, stagger: 0.1 }, 0.9)
    .to('#scene', { opacity: 1, duration: 1.4, ease: 'power2.out' }, 0.7);
}

function boot() {
  measure();
  intro();
  ScrollTrigger.refresh();
}

addEventListener('resize', () => {
  clearTimeout(boot.t);
  boot.t = setTimeout(() => {
    measure();
    ready = false;
    ScrollTrigger.refresh();
  }, 150);
});

document.fonts.ready.then(() => {
  boot();
  addEventListener('load', () => {
    measure();
    ScrollTrigger.refresh();
  });
});
