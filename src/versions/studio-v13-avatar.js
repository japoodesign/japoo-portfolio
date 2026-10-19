import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

/* ====================================================================
   Portfolio config — edit these
   ==================================================================== */
const PROJECTS = [
  { title: 'TVS Motors', tag: 'UX · Product design', blurb: 'Case study — tap to see the work.', url: null },
  { title: 'Project Two', tag: 'Product design', blurb: 'Case study coming soon.', url: null },
  { title: 'Project Three', tag: 'Research', blurb: 'Case study coming soon.', url: null },
  { title: 'Project Four', tag: 'Strategy', blurb: 'Case study coming soon.', url: null }
]
// Spotify embed shown when someone taps the radio (any playlist / album / track path from open.spotify.com)
const SPOTIFY_EMBED = 'playlist/37i9dQZF1DXcBWIGoYBM5M'

/* ---------- renderer / scene ---------- */
const canvas = document.getElementById('studio')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false })
let qTier = 0   // 0 = sharp, 1 = lighter, 2 = lightest; chosen automatically from the measured frame time
const pixelRatioFor = t => Math.min(window.devicePixelRatio, [2, 1.5, 1.15][t])
renderer.setPixelRatio(pixelRatioFor(0))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xffffff)

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60)
const target = new THREE.Vector3(0.45, 0.95, 0.0)

/* ---------- lights: the post pass turns lit => cream, shade => blue ---------- */
scene.add(new THREE.AmbientLight(0xffffff, 0.6))
const sun = new THREE.DirectionalLight(0xffffff, 6)
sun.position.set(-12, 7.2, 10)
sun.target.position.set(0, 0.5, 0)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 40 })
sun.shadow.camera.updateProjectionMatrix()
sun.shadow.bias = -0.0004
sun.shadow.normalBias = 0.02
scene.add(sun, sun.target)

/* ---------- helpers ---------- */
// albedo (0..1) decides which tone a surface lands in: low values always read as blue
const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000 })
const mats = new Map()
function mat(a) {
  if (!mats.has(a)) mats.set(a, new THREE.MeshLambertMaterial({ color: new THREE.Color(a, a, a) }))
  return mats.get(a)
}
function add(geo, a, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(geo, opts.material || mat(a))
  m.position.set(x, y, z)
  if (opts.rot) m.rotation.set(...opts.rot)
  m.castShadow = opts.cast !== false
  m.receiveShadow = opts.receive !== false
  ;(opts.parent || scene).add(m)
  return m
}
const box = (w, h, d) => { const r = Math.min(Math.min(w, h, d) * 0.22, 0.03); return r < 0.003 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 3, r) }
const rbox = (w, h, d, r = 0.03) => new RoundedBoxGeometry(w, h, d, 3, r)
const Sc = (m, x, y, z) => (m.scale.set(x, y, z), m)
const cyl = (rt, rb, h, s = 20) => new THREE.CylinderGeometry(rt, rb, h, s)
const sph = (r, s = 24) => new THREE.SphereGeometry(r, s, s)

// tapered capsule between two points: rounded ends, so limbs, stems and arms flow into each other like drawn forms
const capCache = new Map()
function capsuleGeo(len, r1, r2) {
  const key = [len, r1, r2].map(v => v.toFixed(4)).join('|')
  if (capCache.has(key)) return capCache.get(key)
  const pts = [], N = 7
  for (let i = 0; i <= N; i++) { const a = -Math.PI / 2 + (i / N) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(0.0005, r1 * Math.cos(a)), r1 * Math.sin(a))) }
  for (let i = 0; i <= N; i++) { const a = (i / N) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(0.0005, r2 * Math.cos(a)), len + r2 * Math.sin(a))) }
  const g = new THREE.LatheGeometry(pts, 14); capCache.set(key, g); return g
}
function limb(p1, p2, r1, r2 = r1, a = 1, parent) {
  const A = new THREE.Vector3(...p1), B = new THREE.Vector3(...p2)
  const m = add(capsuleGeo(A.distanceTo(B), r1, r2), a, A.x, A.y, A.z, { parent })
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize())
  return m
}

/* ---------- room ---------- */
add(box(14, 0.1, 12), 1, 0, -0.05, 0)                       // floor
add(box(14, 6, 0.1), 1, 0, 3, -2.6)                          // back wall
// left wall with a big window opening (x = -3.2): z -1.3..4.7, y 1.0..5.0
const wx = -3.2, z0 = 1.7
add(box(0.12, 6, 4.7), 1, wx, 3, -3.65)                      // far strip
add(box(0.12, 6, 1.8), 1, wx, 3, 5.6)                        // near strip
add(box(0.12, 1.0, 6.0), 1, wx, 0.5, z0)                     // below window
add(box(0.12, 1.0, 6.0), 1, wx, 5.5, z0)                     // above window
// window frame (inner)
add(box(0.2, 0.1, 6.1), 0.5, wx + 0.04, 1.0, z0)
add(box(0.2, 0.1, 6.1), 0.5, wx + 0.04, 5.0, z0)
add(box(0.2, 4.0, 0.1), 0.5, wx + 0.04, 3.0, z0 - 3.0)
add(box(0.2, 4.0, 0.1), 0.5, wx + 0.04, 3.0, z0 + 3.0)
// window view: a blue skyline. Brightness is stored in the RED channel only; the post pass turns it into a blue ramp
const skyTex = (() => {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 683
  const g = c.getContext('2d'), R = v => { const c = Math.round(v * 255); return `rgb(${c},${c},${c})` }
  const grad = g.createLinearGradient(0, 0, 0, 683); grad.addColorStop(0, R(0.74)); grad.addColorStop(0.7, R(0.93)); grad.addColorStop(1, R(0.97))
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 683)
  g.fillStyle = R(1)
  for (const [x, y, r] of [[170, 190, 40], [215, 180, 52], [270, 195, 36], [760, 120, 34], [805, 112, 46], [850, 126, 32]]) { g.beginPath(); g.ellipse(x, y, r * 1.6, r * 0.7, 0, 0, 7); g.fill() }
  const skyline = (base, v, seed) => {
    g.fillStyle = R(v); let x = -20
    for (let i = 0; i < 24; i++) {
      const w = 40 + ((seed * (i + 3) * 37) % 70), h = 90 + ((seed * (i + 5) * 53) % 260)
      g.fillRect(x, base - h, w, h + 400); if (i % 5 === 2) g.fillRect(x + w / 2 - 3, base - h - 70, 6, 70)   // spire
      x += w + 6
    }
  }
  skyline(520, 0.66, 7); skyline(590, 0.56, 11); skyline(660, 0.5, 5)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace
  return t
})()
const pane = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 4.0), new THREE.MeshBasicMaterial({ map: skyTex }))
pane.rotation.y = Math.PI / 2
pane.position.set(wx - 1.2, 3.0, z0)
scene.add(pane)

/* ---------- the four frames (2 x 2 grid on the back wall) ---------- */
const PAPER = '#efe7d4', NAVY = '#1736a8', INK = '#16286e'
const FW = 1.3, FH = FW * 888 / 1238
const FRAME_SLOTS = [[-0.8, 2.95], [0.65, 2.95], [-0.8, 1.9], [0.65, 1.9]]
const pickables = []                                  // everything the pointer can hit
const frameEntries = []
function printTex(draw) {                              // a new framed print in the same blue-and-cream style as the supplied images
  const W = 1238, H = 888
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')
  g.fillStyle = '#1c45d0'; g.fillRect(0, 0, W, H)
  g.fillStyle = '#2c5be0'; g.fillRect(0, 0, W, 8); g.fillRect(0, 0, 8, H)
  g.fillStyle = PAPER; g.fillRect(56, 56, W - 112, H - 112)
  g.strokeStyle = '#3a4a9a'; g.lineWidth = 3; g.strokeRect(120, 112, W - 240, H - 224)
  g.lineCap = 'round'; g.lineJoin = 'round'
  draw(g, W, H)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
function isoBox(g, x, y, bw, bd, bh) {
  g.fillStyle = PAPER; g.strokeStyle = INK; g.lineWidth = 5
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + bw, y - bw * 0.5); g.lineTo(x + bw + bd, y - bw * 0.5 + bd * 0.5); g.lineTo(x + bd, y + bd * 0.5); g.closePath(); g.fill(); g.stroke()
  g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + bh); g.lineTo(x + bd, y + bd * 0.5 + bh); g.lineTo(x + bd, y + bd * 0.5); g.closePath(); g.fill(); g.stroke()
  g.beginPath(); g.moveTo(x + bd, y + bd * 0.5); g.lineTo(x + bd, y + bd * 0.5 + bh); g.lineTo(x + bd + bw, y + bd * 0.5 + bh - bw * 0.5); g.lineTo(x + bd + bw, y + bd * 0.5 - bw * 0.5); g.closePath(); g.fill(); g.stroke()
  g.lineWidth = 2; for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(x + 8, y + (bh * k) / 5); g.lineTo(x + bd - 8, y + bd * 0.5 + (bh * k) / 5); g.stroke() }
}
const towersTex = printTex((g) => {
  g.fillStyle = NAVY; g.fillRect(250, 190, 740, 500)
  g.strokeStyle = PAPER; g.lineWidth = 2; for (let k = 0; k < 16; k++) { g.beginPath(); g.moveTo(262 + k * 46, 200); g.lineTo(300 + k * 46, 250); g.stroke() }
  isoBox(g, 330, 470, 190, 130, 130); isoBox(g, 520, 400, 150, 100, 230); isoBox(g, 690, 450, 190, 120, 110); isoBox(g, 440, 560, 120, 80, 60)
  g.fillStyle = INK; g.beginPath(); g.ellipse(640, 660, 330, 14, 0, 0, 7); g.fill()
})
const bloomTex = printTex((g) => {
  g.fillStyle = NAVY; g.beginPath(); g.arc(619, 440, 290, 0, 7); g.fill()
  g.strokeStyle = INK; g.lineWidth = 6
  const lily = (cx, cy, rot, s) => {
    for (let p = 0; p < 6; p++) {
      const a = rot + (p * Math.PI) / 3
      g.save(); g.translate(cx, cy); g.rotate(a); g.fillStyle = PAPER
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(24 * s, -50 * s, 0, -110 * s); g.quadraticCurveTo(-24 * s, -50 * s, 0, 0); g.fill(); g.stroke(); g.restore()
    }
    g.fillStyle = INK; for (let k = 0; k < 5; k++) { const a = k * 1.26; g.beginPath(); g.arc(cx + Math.cos(a) * 14 * s, cy + Math.sin(a) * 14 * s, 5, 0, 7); g.fill() }
  }
  g.lineWidth = 8; g.strokeStyle = PAPER
  for (const [x, y] of [[480, 330], [760, 300], [620, 250]]) { g.beginPath(); g.moveTo(620, 700); g.quadraticCurveTo(620 + (x - 620) * 0.3, 520, x, y); g.stroke() }
  g.fillStyle = PAPER; g.strokeStyle = INK; g.lineWidth = 5
  for (const [x, y, r] of [[560, 560, -0.6], [690, 540, 0.6], [520, 470, -1.0]]) { g.save(); g.translate(x, y); g.rotate(r); g.beginPath(); g.ellipse(0, -60, 22, 70, 0, 0, 7); g.fill(); g.stroke(); g.restore() }
  g.strokeStyle = INK; lily(480, 330, 0.3, 1.0); lily(760, 300, 0.1, 1.0); lily(620, 240, 0.5, 0.9)
})
const texLoader = new THREE.TextureLoader()
function imageTex(url, crop) {                          // supplied artwork already includes its frame: crop to the frame edge
  const [cx, cy, cw, ch] = crop, IW = 1536, IH = 1024
  const tex = texLoader.load(url); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8
  tex.repeat.set(cw / IW, ch / IH); tex.offset.set(cx / IW, 1 - (cy + ch) / IH)
  return tex
}
const frameTex = [
  imageTex(import.meta.env.BASE_URL + 'art/bike-frame.webp', [150, 68, 1238, 888]),
  imageTex(import.meta.env.BASE_URL + 'art/woman-frame.webp', [157, 72, 1226, 880]),
  towersTex, bloomTex
]
frameTex.forEach((tex, i) => {
  const [x, y] = FRAME_SLOTS[i]
  const g = new THREE.Group(); g.position.set(x, y, -2.55); scene.add(g)
  add(box(FW, FH, 0.05), 0.08, 0, 0, 0.0, { parent: g, edges: false })
  const face = add(new THREE.PlaneGeometry(FW, FH), 1, 0, 0, 0.027, { parent: g, material: new THREE.MeshLambertMaterial({ map: tex }), cast: false })
  face.userData.pick = { kind: 'frame', index: i }
  pickables.push(face); frameEntries.push({ group: g, hover: 0, baseZ: -2.55 })
})

const deskY = 0.75
add(box(4.1, 0.07, 1.75), 1, 0.45, deskY, -0.1)                                // larger, thick top (rounded edges)
add(box(3.9, 0.08, 0.035), 1, 0.45, deskY - 0.075, 0.74)                       // front apron
add(box(3.9, 0.08, 0.035), 1, 0.45, deskY - 0.075, -0.94)                      // back apron
for (const x of [-1.45, 2.35]) {                                                // trestle legs, splayed like a real drafting desk
  for (const zs of [-1, 1]) limb([x, 0.02, -0.1 + zs * 0.82], [x, deskY - 0.05, -0.1 + zs * 0.58], 0.034, 0.044, 1)
  limb([x, 0.3, -0.7], [x, 0.3, 0.5], 0.018, 0.018, 1)                         // stretcher
}

/* ---------- screens: laptop (plan editor) + monitor (massing + chat) ---------- */
function screenTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const g = c.getContext('2d'); draw(g, w, h)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
const laptopScreen = screenTex(1024, 640, (g, w, h) => {
  g.fillStyle = '#f3f2ee'; g.fillRect(0, 0, w, h)
  g.fillStyle = '#d9d7d1'; g.fillRect(0, 0, w, 44); g.fillRect(0, 44, 92, h)
  g.fillStyle = '#222'; for (let k = 0; k < 6; k++) g.fillRect(14, 70 + k * 64, 62, 38)
  g.fillStyle = '#fff'; g.fillRect(120, 70, 560, 500); g.strokeStyle = '#111'; g.lineWidth = 6
  g.strokeRect(160, 110, 440, 260); g.strokeRect(160, 370, 300, 160); g.lineWidth = 3
  for (let x = 160; x <= 600; x += 55) { g.beginPath(); g.moveTo(x, 110); g.lineTo(x, 370); g.stroke() }
  g.beginPath(); g.moveTo(460, 400); g.lineTo(600, 400); g.lineTo(600, 530); g.stroke(); g.beginPath(); g.arc(520, 200, 55, 0, 4.7); g.stroke()
  g.fillStyle = '#222'; g.fillRect(700, 70, 300, 30); for (let k = 0; k < 7; k++) { g.fillRect(700, 130 + k * 62, 220 - (k % 3) * 40, 14); g.fillRect(700, 154 + k * 62, 150, 10) }
})
const monitorScreen = screenTex(1024, 600, (g, w, h) => {
  g.fillStyle = '#efeee9'; g.fillRect(0, 0, w, h); g.fillStyle = '#d4d2cb'; g.fillRect(0, 0, w, 40)
  g.strokeStyle = '#111'; g.lineWidth = 5; g.fillStyle = '#fff'
  const iso = (x, y, bw, bd, bh) => {
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + bw, y - bw * 0.5); g.lineTo(x + bw + bd, y - bw * 0.5 + bd * 0.5); g.lineTo(x + bd, y + bd * 0.5); g.closePath(); g.fill(); g.stroke()
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + bh); g.lineTo(x + bd, y + bd * 0.5 + bh); g.lineTo(x + bd, y + bd * 0.5); g.closePath(); g.fill(); g.stroke()
    g.beginPath(); g.moveTo(x + bd, y + bd * 0.5); g.lineTo(x + bd, y + bd * 0.5 + bh); g.lineTo(x + bd + bw, y + bd * 0.5 + bh - bw * 0.5); g.lineTo(x + bd + bw, y + bd * 0.5 - bw * 0.5); g.closePath(); g.fill(); g.stroke()
  }
  iso(120, 300, 150, 120, 170); iso(330, 250, 120, 90, 260); iso(500, 320, 190, 100, 110); iso(210, 420, 80, 60, 70)
  g.fillStyle = '#222'; g.fillRect(740, 60, 260, h - 90); g.fillStyle = '#eee'
  for (let k = 0; k < 4; k++) { g.fillRect(756, 90 + k * 120, 200 - (k % 2) * 60, 36); g.fillRect(756, 134 + k * 120, 140, 14) }
})

/* ---------- desk props ---------- */
// pen holder: a plain tapered cup with coloured markers and sketch pencils
const CX = -0.62, CZ = -0.5
add(new THREE.LatheGeometry([[0.001, 0], [0.058, 0], [0.066, 0.16], [0.001, 0.16]].map(([r, y]) => new THREE.Vector2(r, y)), 28), 0.35, CX, deskY + 0.04, CZ, { material: new THREE.MeshLambertMaterial({ color: new THREE.Color(0.35, 0.35, 0.35), side: THREE.DoubleSide }) })
const penSet = [[0.12, 0.26, 0.012], [0.9, 0.3, 0.011], [0.5, 0.24, 0.0065], [0.15, 0.28, 0.0065], [0.75, 0.22, 0.012], [0.3, 0.25, 0.0065], [1.0, 0.27, 0.0065]]
penSet.forEach(([tone, h, r], i) => {
  const ang = (i / penSet.length) * Math.PI * 2, lean = 0.1 + (i % 3) * 0.07
  const base = [CX + Math.cos(ang) * 0.02, deskY + 0.06, CZ + Math.sin(ang) * 0.02]
  const tip = [CX + Math.cos(ang) * (0.02 + Math.sin(lean) * h), deskY + 0.06 + Math.cos(lean) * h, CZ + Math.sin(ang) * (0.02 + Math.sin(lean) * h)]
  limb(base, tip, r, r, tone)                                                                                    // barrel
  const d = new THREE.Vector3(...tip).sub(new THREE.Vector3(...base)).normalize()
  const nib = add(new THREE.ConeGeometry(r * 0.95, r * 4, 10), r > 0.01 ? 0.12 : 0.2, tip[0] + d.x * r * 3, tip[1] + d.y * r * 3, tip[2] + d.z * r * 3)
  nib.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)
})
// laptop, angled toward her and the viewer so the screen shows
const laptop = new THREE.Group(); laptop.position.set(0.45, deskY + 0.04, 0.3); laptop.rotation.y = -0.35; scene.add(laptop)
add(box(0.5, 0.018, 0.34), 0.75, 0, 0.009, 0, { parent: laptop })
add(box(0.42, 0.004, 0.13), 0.12, 0, 0.02, -0.05, { parent: laptop, edges: false })
add(box(0.14, 0.003, 0.085), 0.9, 0, 0.02, 0.095, { parent: laptop, edges: false })
const lid = new THREE.Group(); lid.position.set(0, 0.018, -0.17); lid.rotation.x = -0.3; laptop.add(lid)
add(box(0.5, 0.33, 0.012), 0.75, 0, 0.165, 0, { parent: lid })
add(new THREE.PlaneGeometry(0.46, 0.288), 1, 0, 0.168, 0.0068, { parent: lid, material: new THREE.MeshBasicMaterial({ map: laptopScreen }), cast: false })
// second screen: monitor behind it
const mon = new THREE.Group(); mon.position.set(0.05, deskY + 0.04, -0.62); mon.rotation.y = -0.22; scene.add(mon)
add(cyl(0.09, 0.1, 0.012, 24), 0.6, 0, 0.006, 0, { parent: mon })
add(box(0.045, 0.27, 0.02), 0.6, 0, 0.14, -0.01, { parent: mon })
add(box(0.64, 0.4, 0.02), 0.14, 0, 0.4, 0, { parent: mon })
add(new THREE.PlaneGeometry(0.6, 0.35), 1, 0, 0.4, 0.0108, { parent: mon, material: new THREE.MeshBasicMaterial({ map: monitorScreen }), cast: false })
// desk lamp: weighted base, spring-jointed arm, domed shade
const lampBase = new THREE.LatheGeometry([[0.001, 0], [0.13, 0], [0.14, 0.012], [0.12, 0.03], [0.05, 0.04], [0.001, 0.04]].map(([r, y]) => new THREE.Vector2(r, y)), 28)
add(lampBase, 0.25, 1.3, deskY + 0.035, -0.5)
const LA = [1.3, deskY + 0.07, -0.5], LB = [1.1, deskY + 0.8, -0.55], LC = [0.62, deskY + 0.64, -0.4]
limb(LA, LB, 0.012, 0.011, 0.25); limb(LB, LC, 0.011, 0.011, 0.25)
add(sph(0.022, 14), 0.25, ...LB); add(sph(0.018, 14), 0.25, ...LA)
for (let i = 0; i < 7; i++) { const t = 0.1 + i * 0.12; add(new THREE.TorusGeometry(0.016, 0.003, 6, 14), 0.5, LA[0] + (LB[0] - LA[0]) * t, LA[1] + (LB[1] - LA[1]) * t, LA[2] + (LB[2] - LA[2]) * t, { rot: [1.3, 0, 0.2] }) }
const shadeGeo = new THREE.LatheGeometry([[0.012, 0.13], [0.04, 0.12], [0.075, 0.095], [0.1, 0.05], [0.108, 0.0], [0.1, 0.0], [0.07, 0.04], [0.035, 0.1], [0.012, 0.115]].map(([r, y]) => new THREE.Vector2(r, y)), 28)
const lampShade = add(shadeGeo, 0.2, LC[0] - 0.01, LC[1] + 0.02, LC[2], { rot: [0.25, 0, 0.55], material: new THREE.MeshLambertMaterial({ color: new THREE.Color(0.2, 0.2, 0.2), side: THREE.DoubleSide }) })
add(sph(0.026, 12), 1, LC[0] - 0.045, LC[1] - 0.02, LC[2] + 0.015)                       // bulb
// books: dark cover with a pale page block showing on the long edge
function book(x, y, z, w, h, d, ry, a = 0.28) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; scene.add(g)
  add(box(w, h, d), a, 0, 0, 0, { parent: g })
  add(box(w * 0.96, h * 0.62, d + 0.006), 1, 0, 0, 0, { parent: g })
  add(box(0.012, h, d), a, -w / 2 + 0.006, 0, 0, { parent: g })                                  // spine
  return g
}
// spiral notebook
add(box(0.55, 0.025, 0.42), 0.32, 1.45, deskY + 0.05, 0.42, { rot: [0, -0.25, 0] })
// stacked books on the left
book(-1.0, deskY + 0.07, 0.0, 0.55, 0.07, 0.4, 0.1); book(-1.02, deskY + 0.14, 0.0, 0.5, 0.07, 0.38, 0.05); book(-1.04, deskY + 0.21, 0.0, 0.45, 0.07, 0.34, 0.0, 0.35)
// vase + lily, modelled on the reference: tall tapered vase with a bulb base, narrow neck and a flared V-notched rim; one open lily and two long buds
const VX = -0.95, VZ = -0.36, VY = deskY + 0.04
const vaseProfile = [[0.001, 0], [0.04, 0], [0.066, 0.02], [0.084, 0.06], [0.082, 0.1], [0.062, 0.15], [0.036, 0.2], [0.026, 0.24], [0.028, 0.275], [0.04, 0.305], [0.056, 0.335]].map(([r, y]) => new THREE.Vector2(r, y))
const vaseGeo = new THREE.LatheGeometry(vaseProfile, 40)
{ const pos = vaseGeo.attributes.position; for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y > 0.3) { const th = Math.atan2(pos.getX(i), pos.getZ(i)); pos.setY(i, y + 0.04 * Math.pow(Math.abs(Math.sin(th)), 1.6) - 0.012) } } vaseGeo.computeVertexNormals() }
add(vaseGeo, 0.88, VX, VY, VZ, { material: new THREE.MeshLambertMaterial({ color: new THREE.Color(0.88, 0.88, 0.88), side: THREE.DoubleSide }) })
// glossy highlight running down the side
limb([VX + 0.03, VY + 0.04, VZ + 0.078], [VX + 0.032, VY + 0.1, VZ + 0.074], 0.004, 0.0035, 1)
limb([VX + 0.022, VY + 0.14, VZ + 0.058], [VX + 0.017, VY + 0.21, VZ + 0.034], 0.0035, 0.003, 1)

function petalGeo(L, W, curl) {                         // a pointed blade that rises, then recurves at the tip
  const N = 12, M = 4, pos = [], idx = []
  for (let i = 0; i <= N; i++) {
    const t = i / N, w = W * Math.sin(Math.PI * Math.pow(t, 0.75)) * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, t * 1.15)))
    const r = L * t, h = 0.28 * L * t - curl * L * t * t
    for (let j = 0; j <= M; j++) { const u = (j / M) * 2 - 1; pos.push(r, h - 0.22 * w * u * u, u * w * 0.5) }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + 1, c = a + M + 1, d = c + 1; idx.push(a, c, b, b, c, d) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g
}
const petalMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(1, 1, 1), side: THREE.DoubleSide })
const leafMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(0.5, 0.5, 0.5), side: THREE.DoubleSide })
function stemTo(pts, r = 0.0042, tone = 0.5) {            // thin curved stem through points
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)))
  add(new THREE.TubeGeometry(curve, 24, r, 6, false), tone, 0, 0, 0)
  return curve
}
function longBud(base, dir, len) {                          // slender pointed bud (decor)
  const prof = [[0.001, 0], [0.011, 0.018], [0.0155, 0.06], [0.0125, 0.11], [0.006, 0.15], [0.001, 0.178]].map(([r, y]) => new THREE.Vector2(r, y * len / 0.18))
  const m = add(new THREE.LatheGeometry(prof, 14), 0.9, base[0], base[1], base[2])
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir).normalize())
}
function leaf(base, dir, len, wid) {                        // long narrow blade
  const m = add(petalGeo(len, wid, 0.35), 0.5, base[0], base[1], base[2], { material: leafMat })
  m.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(...dir).normalize())
}

const vTop = [VX, VY + 0.3, VZ]
/* ---------- the lilies: closed buds that bloom (springy open + a little shake) when tapped ---------- */
const lilies = []
function makeLily(head, tilt, stemMid) {
  const g = new THREE.Group(); g.position.set(...head); scene.add(g)             // g: position + shake
  const tg = new THREE.Group(); tg.rotation.set(...tilt); g.add(tg)               // tg: which way the flower faces
  const petals = []
  for (let p = 0; p < 6; p++) {
    const pv = new THREE.Group(); pv.rotation.y = (p * Math.PI) / 3; tg.add(pv)
    const outer = p % 2 === 0
    petals.push(add(petalGeo(outer ? 0.14 : 0.124, outer ? 0.06 : 0.072, outer ? 0.7 : 0.55), 1, 0, outer ? -0.004 : 0.004, 0, { parent: pv, material: petalMat }))
  }
  const sg = new THREE.Group(); tg.add(sg)                                         // stamens: only visible once open
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3, rr = 0.07 + (k % 2) * 0.018
    limb([0, 0.008, 0], [Math.cos(a) * rr, 0.034 + (k % 3) * 0.006, Math.sin(a) * rr], 0.0016, 0.0013, 0.25, sg)
    add(new THREE.CapsuleGeometry(0.0034, 0.011, 4, 8), 0.2, Math.cos(a) * rr, 0.036 + (k % 3) * 0.006, Math.sin(a) * rr, { parent: sg, rot: [0, 0, 1.2] })
  }
  add(new THREE.ConeGeometry(0.01, 0.026, 10), 0.6, 0, 0.012, 0, { parent: sg })
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), new THREE.MeshBasicMaterial()); hit.visible = false
  hit.position.set(0, 0.04, 0); tg.add(hit); hit.userData.pick = { kind: 'lily', index: lilies.length }; pickables.push(hit)
  stemTo([vTop, ...stemMid, head])
  const L = { g, petals, sg, b: 0, v: 0, target: 0, shake: 0, head: new THREE.Vector3(...head), tg }
  lilies.push(L); return L
}
makeLily([VX - 0.17, VY + 0.56, VZ + 0.05], [0.5, 0.5, 0.45], [[VX - 0.02, VY + 0.38, VZ + 0.01], [VX - 0.1, VY + 0.48, VZ + 0.03]])
makeLily([VX - 0.03, VY + 0.7, VZ - 0.04], [0.15, 1.1, 0.05], [[VX - 0.005, VY + 0.42, VZ - 0.01], [VX - 0.02, VY + 0.58, VZ - 0.03]])
makeLily([VX + 0.14, VY + 0.62, VZ + 0.05], [0.55, 2.2, -0.45], [[VX + 0.04, VY + 0.4, VZ + 0.01], [VX + 0.1, VY + 0.5, VZ + 0.03]])
makeLily([VX - 0.12, VY + 0.44, VZ + 0.1], [0.65, -0.5, 0.6], [[VX - 0.01, VY + 0.34, VZ + 0.03], [VX - 0.07, VY + 0.4, VZ + 0.07]])
makeLily([VX + 0.06, VY + 0.5, VZ + 0.11], [0.6, 0.9, -0.5], [[VX + 0.02, VY + 0.36, VZ + 0.04], [VX + 0.05, VY + 0.43, VZ + 0.08]])
{ const L = lilies[1]; L.target = 1; L.b = 1 }   // one flower is already in bloom; the other four are buds
window.__dbg = { lilies, get bones() { return bones }, get scene() { return scene }, get book() { return sketchbook }, get camera() { return camera }, THREE }   // review helper
function bloom(i) { const L = lilies[i]; L.target = 1; L.shake = 1 }
// two long decorative buds + leaves (as in the reference)
const b1 = [VX + 0.07, VY + 0.8, VZ - 0.02], b2 = [VX + 0.22, VY + 0.58, VZ + 0.03]
stemTo([vTop, [VX + 0.0, VY + 0.48, VZ - 0.01], [VX + 0.03, VY + 0.66, VZ - 0.02], [b1[0] - 0.005, b1[1] - 0.02, b1[2]]], 0.0036)
longBud([b1[0] - 0.006, b1[1] - 0.02, b1[2]], [0.25, 1, -0.05], 0.18)
stemTo([vTop, [VX + 0.06, VY + 0.4, VZ + 0.0], [VX + 0.15, VY + 0.5, VZ + 0.02], [b2[0] - 0.02, b2[1] - 0.02, b2[2]]], 0.0036)
longBud([b2[0] - 0.02, b2[1] - 0.02, b2[2]], [0.75, 0.65, 0.05], 0.19)
for (const [dx, dy, dz, ex, ey, ez, ln] of [[0.0, 0.3, 0.02, -0.6, 0.45, 0.35, 0.22], [0.01, 0.3, -0.01, 0.7, 0.4, 0.2, 0.21], [-0.01, 0.31, 0.0, -0.3, 0.55, -0.55, 0.2], [0.01, 0.3, 0.01, 0.4, 0.45, 0.6, 0.19], [0.0, 0.32, 0.0, 0.1, 0.8, -0.25, 0.17]])
  leaf([VX + dx, VY + dy, VZ + dz], [ex, ey, ez], ln, 0.022)

/* ---------- sketchbook, toys, flip phone ---------- */
function sketchPage(kind) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 700
  const g = c.getContext('2d'); g.fillStyle = '#fbf8ef'; g.fillRect(0, 0, 512, 700)
  g.strokeStyle = '#1b2a6b'; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 4
  if (kind === 'flowers') {
    for (const [x, y, s] of [[170, 250, 1], [330, 200, 0.85], [260, 380, 0.7]]) {
      g.beginPath(); g.moveTo(256, 640); g.quadraticCurveTo(256 + (x - 256) * 0.4, 500, x, y + 40); g.stroke()
      for (let p = 0; p < 6; p++) { g.save(); g.translate(x, y); g.rotate((p * Math.PI) / 3 + 0.3); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(18 * s, -40 * s, 0, -90 * s); g.quadraticCurveTo(-18 * s, -40 * s, 0, 0); g.stroke(); g.restore() }
    }
    g.beginPath(); g.ellipse(220, 560, 20, 60, -0.9, 0, 7); g.stroke(); g.beginPath(); g.ellipse(310, 540, 20, 60, 0.9, 0, 7); g.stroke()
  } else if (kind === 'cup') {
    g.beginPath(); g.moveTo(170, 300); g.lineTo(190, 480); g.quadraticCurveTo(255, 520, 320, 480); g.lineTo(340, 300); g.ellipse(255, 300, 85, 22, 0, 0, 7); g.stroke(); g.beginPath(); g.arc(350, 380, 38, -1.2, 1.2); g.stroke()
    g.lineWidth = 2; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(205 + k * 4, 330 + k * 22); g.lineTo(300 - k * 3, 330 + k * 22); g.stroke() }
  } else if (kind === 'lamp') {
    g.beginPath(); g.ellipse(255, 560, 80, 18, 0, 0, 7); g.moveTo(255, 545); g.lineTo(200, 330); g.lineTo(330, 210); g.stroke(); g.beginPath(); g.moveTo(300, 190); g.lineTo(390, 250); g.lineTo(345, 290); g.closePath(); g.stroke()
    g.lineWidth = 2; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(325 + k * 10, 205 + k * 8); g.lineTo(350 + k * 8, 270 - k * 2); g.stroke() }
  } else {
    g.strokeRect(150, 190, 210, 190); g.beginPath(); g.arc(205, 255, 18, 0, 7); g.arc(305, 255, 18, 0, 7); g.stroke()       // toy robot
    g.beginPath(); g.moveTo(180, 330); g.lineTo(330, 330); g.stroke(); g.strokeRect(190, 380, 130, 150); g.beginPath(); g.moveTo(255, 190); g.lineTo(255, 140); g.arc(255, 130, 10, 0, 7); g.stroke()
    g.strokeRect(120, 400, 40, 100); g.strokeRect(350, 400, 40, 100); g.strokeRect(205, 530, 40, 70); g.strokeRect(265, 530, 40, 70)
    g.lineWidth = 2; for (let k = 0; k < 7; k++) { g.beginPath(); g.moveTo(200, 400 + k * 18); g.lineTo(310, 400 + k * 18); g.stroke() }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
const sketchbook = new THREE.Group(); sketchbook.position.set(-0.55, deskY + 0.042, 0.28); sketchbook.rotation.y = 0.2; scene.add(sketchbook)
add(box(0.46, 0.012, 0.3), 0.18, 0, 0.006, 0, { parent: sketchbook })
const pageMat = k => new THREE.MeshLambertMaterial({ map: sketchPage(k), side: THREE.FrontSide })
const bookHits = []
for (const sx_ of [-1, 1]) {
  add(box(0.215, 0.008, 0.28), 1, sx_ * 0.109, 0.016, 0, { parent: sketchbook, rot: [0, 0, sx_ * -0.02], edges: false })
  const pg = add(new THREE.PlaneGeometry(0.205, 0.27), 1, sx_ * 0.109, 0.0215, 0, { parent: sketchbook, rot: [-Math.PI / 2, 0, sx_ * -0.02], cast: false, material: pageMat(sx_ < 0 ? 'flowers' : 'lamp') })
  bookHits.push(pg)
}
// the turning leaf: hinged on the spine, front shows the robot page, back shows a cup sketch
const pageLeaf = new THREE.Group(); pageLeaf.position.set(0, 0.0265, 0); sketchbook.add(pageLeaf)
const leafFront = add(new THREE.PlaneGeometry(0.205, 0.27), 1, 0.109, 0.0005, 0, { parent: pageLeaf, rot: [-Math.PI / 2, 0, 0], cast: false, material: pageMat('toy') })
const leafBack = add(new THREE.PlaneGeometry(0.205, 0.27), 1, 0.109, -0.0005, 0, { parent: pageLeaf, rot: [Math.PI / 2, 0, 0], cast: false, material: pageMat('cup') })
leafBack.material.map.wrapS = THREE.RepeatWrapping; leafBack.material.map.repeat.x = -1; leafBack.material.map.offset.x = 1   // un-mirror the back face
;[...bookHits, leafFront, leafBack].forEach(m => { m.userData.pick = { kind: 'book' }; pickables.push(m) })
let flipT = 0, flipTarget = 0, flipV = 0
function flipPage() { flipTarget = flipTarget ? 0 : 1 }
// toys: stacked blocks, a rubber duck, a tiny robot
const toys = new THREE.Group(); toys.position.set(0.98, deskY + 0.04, -0.12); scene.add(toys)
;[[0, 0.025, 0, 0.8], [0.01, 0.075, 0.005, 0.25], [-0.005, 0.125, 0, 1]].forEach(([x, y, z, a], i) => add(box(0.05, 0.05, 0.05), a, x, y, z, { parent: toys, rot: [0, 0.2 * i, 0] }))
Sc(add(sph(0.045, 16), 1, 0.17, 0.04, 0.05, { parent: toys, edges: false }), 1.1, 0.85, 1.3)          // duck body
add(sph(0.03, 14), 1, 0.17, 0.095, 0.0, { parent: toys, edges: false })                                // duck head
add(new THREE.ConeGeometry(0.014, 0.03, 8), 0.2, 0.17, 0.092, -0.035, { parent: toys, rot: [-Math.PI / 2, 0, 0], edges: false })   // beak
add(box(0.06, 0.07, 0.045), 0.3, -0.12, 0.035, 0.07, { parent: toys })                                 // robot body
add(box(0.05, 0.04, 0.04), 1, -0.12, 0.09, 0.07, { parent: toys }); add(cyl(0.003, 0.003, 0.03), 0.3, -0.12, 0.12, 0.07, { parent: toys, edges: false })
add(box(0.014, 0.05, 0.014), 0.3, -0.165, 0.04, 0.07, { parent: toys }); add(box(0.014, 0.05, 0.014), 0.3, -0.075, 0.04, 0.07, { parent: toys })

// flip phone (clamshell, lying open on the desk): rounded oval lid with screen + speaker, hinge, rounded base with a full keypad
const phone = new THREE.Group(); phone.position.set(1.02, deskY + 0.04, 0.52); phone.rotation.y = 0.55; scene.add(phone)
function roundedShape(w, l, rTop, rBot) {                  // x = width, y = length (top = +y); corner radii at the top and bottom ends
  const x = w / 2, y = l / 2, sh = new THREE.Shape()
  sh.moveTo(-x + rBot, -y); sh.lineTo(x - rBot, -y); sh.quadraticCurveTo(x, -y, x, -y + rBot)
  sh.lineTo(x, y - rTop); sh.quadraticCurveTo(x, y, x - rTop, y)
  sh.lineTo(-x + rTop, y); sh.quadraticCurveTo(-x, y, -x, y - rTop)
  sh.lineTo(-x, -y + rBot); sh.quadraticCurveTo(-x, -y, -x + rBot, -y)
  return sh
}
function slab(w, l, rTop, rBot, h) {                      // bevelled, soft-cornered plate lying flat (top end of the shape points to -z)
  const g = new THREE.ExtrudeGeometry(roundedShape(w, l, rTop, rBot), { depth: h, bevelEnabled: true, bevelThickness: 0.0022, bevelSize: 0.0022, bevelSegments: 3, curveSegments: 16 })
  g.rotateX(-Math.PI / 2); return g
}
const phoneScreenTex = (() => {
  const c = document.createElement('canvas'); c.width = 240; c.height = 280
  const g = c.getContext('2d'); g.fillStyle = '#0b1c5c'; g.fillRect(0, 0, 240, 280)
  g.strokeStyle = '#efe7d4'; g.lineWidth = 7; g.lineJoin = 'round'
  g.strokeRect(52, 78, 136, 90); g.beginPath(); g.moveTo(52, 78); g.lineTo(120, 134); g.lineTo(188, 78); g.stroke()
  g.fillStyle = '#efe7d4'; g.font = 'bold 24px sans-serif'; g.textAlign = 'center'; g.fillText('CONTACT ME', 120, 220)
  g.fillRect(70, 236, 100, 4)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t
})()
const phoneLid = add(slab(0.066, 0.086, 0.032, 0.01, 0.008), 0.5, 0, 0, -0.056, { parent: phone })
const phoneBase = add(slab(0.064, 0.104, 0.008, 0.03, 0.01), 0.5, 0, 0, 0.049, { parent: phone })
add(cyl(0.0075, 0.0075, 0.05, 20), 0.25, 0, 0.007, -0.008, { parent: phone, rot: [0, 0, Math.PI / 2] })               // hinge barrel
add(new THREE.PlaneGeometry(0.048, 0.056), 1, 0, 0.0118, -0.056, { parent: phone, rot: [-Math.PI / 2, 0, 0], cast: false, material: new THREE.MeshBasicMaterial({ map: phoneScreenTex }) })   // screen
add(cyl(0.0052, 0.0052, 0.002, 20), 0.2, 0, 0.0114, -0.0925, { parent: phone })                                          // speaker / camera disc
add(cyl(0.0028, 0.0028, 0.0022, 12), 1, 0, 0.0122, -0.0925, { parent: phone })
for (const sx_ of [-1, 1]) add(cyl(0.0019, 0.0019, 0.002, 10), 0.2, sx_ * 0.0165, 0.0114, -0.0915, { parent: phone })       // side indicator dots
// keypad
const KY = 0.0128
for (const [x, z, w] of [[-0.021, 0.0, 0.016], [0, 0.0, 0.018], [0.021, 0.0, 0.016]]) add(new RoundedBoxGeometry(w, 0.004, 0.007, 2, 0.0025), 0.95, x, KY, 0.0075, { parent: phone })   // soft keys + menu
add(new RoundedBoxGeometry(0.0145, 0.004, 0.0115, 2, 0.0035), 0.3, -0.0235, KY, 0.022, { parent: phone, rot: [0, 0.25, 0] })     // call key
add(new RoundedBoxGeometry(0.0145, 0.004, 0.0115, 2, 0.0035), 0.3, 0.0235, KY, 0.022, { parent: phone, rot: [0, -0.25, 0] })    // end key
add(new THREE.TorusGeometry(0.0135, 0.0026, 10, 28), 0.2, 0, KY, 0.0225, { parent: phone, rot: [Math.PI / 2, 0, 0] })             // d-pad ring
add(cyl(0.0062, 0.0062, 0.0042, 20), 0.95, 0, KY, 0.0225, { parent: phone })                                                    // d-pad centre
for (const [dx, dz, ry] of [[0, -0.0098, 0], [0, 0.0098, Math.PI], [-0.0098, 0, Math.PI / 2], [0.0098, 0, -Math.PI / 2]])
  add(new THREE.ConeGeometry(0.0019, 0.003, 6), 0.2, dx, KY + 0.0006, 0.0225 + dz, { parent: phone, rot: [0, ry, 0] })              // arrow pips
for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
  const kz = 0.045 + r * 0.0125 + (c === 1 ? 0.0012 : 0)
  add(new RoundedBoxGeometry(0.0152, 0.0045, 0.0092, 2, 0.0035), 0.95, (c - 1) * 0.02, KY + 0.0002, kz, { parent: phone })       // number keys
}
add(new RoundedBoxGeometry(0.034, 0.003, 0.0075, 2, 0.003), 0.35, 0, KY - 0.0005, 0.095, { parent: phone })                       // microphone strip
;[phoneLid, phoneBase].forEach(m => { m.userData.pick = { kind: 'phone' }; pickables.push(m) })
const phoneLed = add(sph(0.0022, 8), 1, 0.0255, 0.0125, -0.0905, { parent: phone })

/* ---------- cabinet + radio (back-right) ---------- */
const sx = 2.9, sz = -2.15
add(box(0.9, 2.2, 0.55), 0.3, sx, 1.1, sz)
add(box(0.95, 0.05, 0.6), 0.45, sx, 2.225, sz)
add(box(0.12, 0.3, 0.2), 0.3, sx + 0.3, 2.4, sz); add(box(0.1, 0.26, 0.2), 1, sx + 0.4, 2.38, sz)       // books
const radioTex = (() => {
  const c = document.createElement('canvas'); c.width = 1024, c.height = 600
  const g = c.getContext('2d'); g.fillStyle = '#0f2f8f'; g.fillRect(0, 0, 1024, 600)
  g.fillStyle = '#e9dfc9'; g.fillRect(46, 50, 560, 500)                              // speaker cloth
  g.fillStyle = '#15347f'; for (let y = 70; y < 540; y += 11) for (let x = 66 + ((y / 11) % 2) * 5; x < 592; x += 11) { g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill() }
  g.strokeStyle = '#e9dfc9'; g.fillStyle = '#e9dfc9'; g.lineWidth = 3; g.font = '20px sans-serif'; g.textAlign = 'left'
  for (let i = 0; i < 14; i++) { g.beginPath(); g.moveTo(680, 90 + i * 28); g.lineTo(i % 2 ? 705 : 725, 90 + i * 28); g.stroke() }
  g.fillText('FM', 660, 70); g.fillText('AM', 760, 70); for (let i = 0; i < 6; i++) g.fillText(String(88 - i * 4), 745, 110 + i * 70)
  g.lineWidth = 8; g.beginPath(); g.arc(880, 170, 70, 0, 7); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(880, 170, 48, 0, 7); g.stroke()
  g.lineWidth = 4; g.strokeRect(700, 300, 290, 220); for (const [x, y] of [[760, 370], [850, 370], [925, 370], [850, 460]]) { g.beginPath(); g.arc(x, y, 24, 0, 7); g.stroke() }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
})()
const radio = new THREE.Group(); radio.position.set(sx - 0.05, 2.25, sz + 0.1); radio.rotation.y = -0.15; scene.add(radio)
const radioBody = add(box(0.5, 0.3, 0.14), 0.2, 0, 0.17, 0, { parent: radio })
const radioFace = add(new THREE.PlaneGeometry(0.48, 0.28), 1, 0, 0.17, 0.0705, { parent: radio, cast: false, material: new THREE.MeshLambertMaterial({ map: radioTex }) })
add(box(0.36, 0.02, 0.02), 0.2, 0, 0.35, 0, { parent: radio }); add(box(0.02, 0.06, 0.02), 0.2, -0.17, 0.33, 0, { parent: radio }); add(box(0.02, 0.06, 0.02), 0.2, 0.17, 0.33, 0, { parent: radio })   // handle
limb([0.2, 0.32, -0.02], [-0.22, 0.66, -0.04], 0.004, 0.004, 0.55, radio)                                                                                            // antenna
add(box(0.05, 0.02, 0.05), 0.15, -0.2, 0.01, 0.0, { parent: radio }); add(box(0.05, 0.02, 0.05), 0.15, 0.2, 0.01, 0.0, { parent: radio })
const needle = add(box(0.004, 0.2, 0.004), 1, 0.07, 0.17, 0.073, { parent: radio, edges: false })
const dialKnob = add(cyl(0.032, 0.032, 0.012, 22), 1, 0.133, 0.205, 0.075, { parent: radio, rot: [Math.PI / 2, 0, 0], edges: false })
;[radioBody, radioFace].forEach(m => { m.userData.pick = { kind: 'radio' }; pickables.push(m) })
// a soft fill so the radio reads clearly even when the window light misses the cabinet
const radioLight = new THREE.PointLight(0xffffff, 9, 6, 2); radioLight.position.set(2.3, 3.0, -0.9); scene.add(radioLight)
const notes = []
for (let i = 0; i < 4; i++) notes.push(Sc(add(sph(0.012, 8), 1, 0, 0, 0, { parent: radio, edges: false }), 1, 1.4, 1))

/* ---------- chair: curved mesh back, cushioned seat, arms, star base on casters ---------- */
const chair = new THREE.Group(); scene.add(chair)
const shellMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(0.9, 0.9, 0.9), side: THREE.DoubleSide })
add(new RoundedBoxGeometry(0.58, 0.085, 0.54, 4, 0.04), 1, 0, 0.5, 0.95, { parent: chair })                                  // seat cushion
add(new THREE.CylinderGeometry(0.44, 0.44, 0.5, 28, 1, true, -0.78, 1.56), 1, 0, 0.86, 0.86, { parent: chair, rot: [-0.1, 0, 0], material: shellMat })   // curved back shell
limb([0, 0.52, 1.22], [0, 0.72, 1.3], 0.02, 0.02, 0.3, chair)                                                               // back support
for (const sx_ of [-1, 1]) {                                                                                                  // armrests
  limb([sx_ * 0.3, 0.54, 1.12], [sx_ * 0.31, 0.74, 1.04], 0.016, 0.016, 0.3, chair)
  limb([sx_ * 0.31, 0.74, 1.04], [sx_ * 0.31, 0.74, 0.76], 0.016, 0.016, 0.3, chair)
  add(new RoundedBoxGeometry(0.06, 0.03, 0.2, 3, 0.012), 0.5, sx_ * 0.31, 0.77, 0.9, { parent: chair })
}
add(cyl(0.032, 0.04, 0.4, 20), 0.3, 0, 0.3, 0.95, { parent: chair })                                                        // gas lift
add(sph(0.05, 16), 0.3, 0, 0.1, 0.95, { parent: chair })
for (let i = 0; i < 5; i++) {
  const a = (i / 5) * Math.PI * 2 + 0.3, ex = Math.cos(a) * 0.36, ez = 0.95 + Math.sin(a) * 0.36
  limb([0, 0.1, 0.95], [ex, 0.06, ez], 0.026, 0.02, 0.3, chair)
  Sc(add(sph(0.032, 12), 0.1, ex, 0.032, ez, { parent: chair }), 1, 0.9, 1)                                                 // caster wheel
}

/* ---------- the girl: Ready Player Me avatar (public/saplin/source/lin.glb), posed seated and typing ---------- */
const avatar = new THREE.Group(); scene.add(avatar)
let spineBones = [], fingerBones = [], bones = {}
new GLTFLoader().load(import.meta.env.BASE_URL + 'saplin/source/lin.glb', (gltf) => {
  const model = gltf.scene; avatar.add(model)
  model.traverse(o => {
    if (o.isBone) bones[o.name] = o
    if (o.isMesh || o.isSkinnedMesh) {
      o.frustumCulled = false; o.castShadow = true; o.receiveShadow = true
      const old = o.material, hair = /hair/i.test(o.name), eye = /Eye/.test(o.name)
      const m = new THREE.MeshLambertMaterial({ map: old.map || null, color: old.map ? 0xffffff : (old.color || 0xffffff), side: hair ? THREE.DoubleSide : THREE.FrontSide, transparent: !!old.transparent, alphaTest: old.alphaTest || (hair ? 0.4 : 0) })
      if (m.map) m.map.colorSpace = THREE.SRGBColorSpace
      o.material = m; o.userData.noArt = true            // the ink shader hatches it like the rest of the room (not treated as flat artwork)
      if (eye) o.material.color.set(0xdddddd)
    }
  })
  avatar.rotation.y = Math.PI                              // the avatar faces +z; turn her to face the desk (-z)
  avatar.updateMatrixWorld(true)
  const W = n => bones[n].getWorldPosition(new THREE.Vector3())
  const rest = {}; Object.keys(bones).forEach(k => rest[k] = bones[k].quaternion.clone())
  // seat: hips resting on the chair cushion
  const hipsNow = W('Hips'); avatar.position.set(0 - hipsNow.x, 0.66 - hipsNow.y, 0.98 - hipsNow.z); avatar.updateMatrixWorld(true)

  // aim(bone, child, worldTarget): swing `bone` so the line bone->child points at the target (parent-space maths)
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), qW = new THREE.Quaternion(), qP = new THREE.Quaternion(), qD = new THREE.Quaternion()
  function aim(name, childName, target) {
    const b = bones[name], c = bones[childName]
    b.updateWorldMatrix(true, true)
    const p = b.getWorldPosition(tmpA.set(0, 0, 0)), cp = c.getWorldPosition(tmpB.set(0, 0, 0))
    const cur = cp.clone().sub(p).normalize(), want = target.clone().sub(p).normalize()
    qD.setFromUnitVectors(cur, want)
    b.getWorldQuaternion(qW); b.parent.getWorldQuaternion(qP)
    b.quaternion.copy(qP.clone().invert().multiply(qD.clone().multiply(qW)))
    b.updateWorldMatrix(true, true)
  }
  const dirTo = (name, v) => W(name).add(v)
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z)
  // sides in world space after the 180° turn: avatar Left is world -x
  const side = { Left: -1, Right: 1 }
  // torso: lean toward the desk
  const lean = V3(0, Math.cos(0.34), -Math.sin(0.34))
  aim('Spine', 'Spine1', dirTo('Spine', lean)); aim('Spine1', 'Spine2', dirTo('Spine1', lean)); aim('Spine2', 'Neck', dirTo('Spine2', V3(0, Math.cos(0.3), -Math.sin(0.3))))
  aim('Neck', 'Head', dirTo('Neck', V3(0, Math.cos(0.45), -Math.sin(0.45))))
  aim('Head', 'HeadTop_End', dirTo('Head', V3(0, Math.cos(0.62), -Math.sin(0.62))))
  // legs: thighs forward, shins down, feet flat
  for (const S of ['Left', 'Right']) {
    const sx = side[S] * 0.09
    aim(S + 'UpLeg', S + 'Leg', dirTo(S + 'UpLeg', V3(sx * 0.4, -0.04, -1)))
    aim(S + 'Leg', S + 'Foot', dirTo(S + 'Leg', V3(0, -1, -0.1)))
    aim(S + 'Foot', S + 'ToeBase', dirTo(S + 'Foot', V3(0, -0.15, -1)))
  }
  // arms: upper arms down, forearms forward to the laptop keys, hands flat on the keyboard
  laptop.updateMatrixWorld(true)
  for (const S of ['Left', 'Right']) {
    const wrist = laptop.localToWorld(V3(side[S] * 0.075, 0.06, 0.1))
    const shoulder = W(S + 'Arm')
    aim(S + 'Arm', S + 'ForeArm', V3(shoulder.x + side[S] * 0.06, shoulder.y - 0.26, shoulder.z - 0.1))
    aim(S + 'ForeArm', S + 'Hand', wrist)
    aim(S + 'Hand', S + 'HandMiddle1', dirTo(S + 'Hand', V3(0, -0.12, -1)))
    // fingers curl slightly over the keys
    for (const f of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) for (let i = 1; i <= 3; i++) { const fb = bones[`${S}Hand${f}${i}`]; if (fb) { fb.rotation.x += f === 'Thumb' ? 0 : 0.28; if (i === 1 && f !== 'Thumb') fingerBones.push(fb) } }
  }
  spineBones = [bones.Spine, bones.Spine1, bones.Spine2]
  meshList = null                                          // rebuild the pickable/art list now that the avatar exists
}, undefined, err => console.error('avatar failed to load', err))

/* ---------- post: crisp pen-and-ink look ----------
   Everything is drawn at the screen's real pixel resolution (no blur): thin outlines from depth/normal
   discontinuities, and layered broken pen strokes for shading (light diagonal -> cross-hatch -> dense ink).
   Artwork (frames, screens, radio face, sketchbook pages) keeps its own line detail, tinted to the same ink. */
const rtOpts = { type: THREE.HalfFloatType, samples: 4 }
const rtColor = new THREE.WebGLRenderTarget(4, 4, { ...rtOpts, depthTexture: new THREE.DepthTexture(4, 4) })
const rtNormal = new THREE.WebGLRenderTarget(4, 4, rtOpts)
const normalMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide })
const artMat = new THREE.MeshBasicMaterial({ color: 0xff00ff })           // marker colour in the normal buffer = "this is artwork"
const tone = new THREE.ShaderMaterial({
  uniforms: { tColor: { value: rtColor.texture }, tDepth: { value: rtColor.depthTexture }, tNormal: { value: rtNormal.texture }, res: { value: new THREE.Vector2(4, 4) }, time: { value: 0 }, dpr: { value: 1 }, near: { value: camera.near }, far: { value: camera.far } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: /* glsl */`
    precision highp float;
    uniform sampler2D tColor, tDepth, tNormal; uniform vec2 res; uniform float time, dpr, near, far; varying vec2 vUv;
    float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
    float lin(float d){ float z = d * 2. - 1.; return 2. * near * far / (far + near - z * (far - near)); }
    float depthAt(vec2 uv){ return lin(texture2D(tDepth, uv).x); }
    vec3 nrm(vec2 uv){ return texture2D(tNormal, uv).rgb; }

    // continuous hatch lines with a razor-sharp, anti-aliased edge (sp and the width are in device pixels)
    float hl(vec2 q, float ang, float sp, float wfrac, float seed){
      float c = cos(ang), s = sin(ang);
      float x = (q.x * c + q.y * s) / sp;
      x += (vnoise(q * 0.045 / dpr + seed) - 0.5) * 0.5;               // slight hand wander, fixed (no animation)
      float d = abs(fract(x) - 0.5) * sp;
      float hw = wfrac * sp * 0.5;
      return 1.0 - smoothstep(hw - 0.6, hw + 0.6, d);
    }
    // one family of thin parallel pen strokes, drawn analytically at device-pixel precision
    float strokes(vec2 q, float ang, float sp, float wpx, float seed, float gapT, float dash){
      float c = cos(ang), s = sin(ang);
      vec2 r = vec2(q.x * c + q.y * s, -q.x * s + q.y * c);
      r.x += (vnoise(q * 0.011 + seed) - 0.5) * sp * 0.8;                 // the hand never draws a perfectly straight line
      float id = floor(r.x / sp + 0.5);
      float d = abs(r.x - id * sp);
      float along = r.y / dash + hash(vec2(id, seed)) * 23.0;
      float seg = floor(along), f = fract(along);
      float keep = step(gapT, hash(vec2(seg, id * 1.7 + seed)));           // random gaps: strokes start and stop
      float w = wpx * (0.62 + 0.75 * hash(vec2(seg + 3.0, id + seed)));    // pen pressure
      float line = 1.0 - smoothstep(w * 0.5 - 0.35, w * 0.5 + 0.55, d);
      float taper = smoothstep(0.0, 0.16, f) * smoothstep(1.0, 0.84, f);   // pointed ends
      return line * keep * mix(0.6, 1.0, taper);
    }
    void main(){
      vec2 q = gl_FragCoord.xy;                       // device pixels
      vec2 px = 1.0 / res;
      vec3 src = texture2D(tColor, vUv).rgb;
      float l = dot(src, vec3(0.299, 0.587, 0.114));
      vec3 n0 = nrm(vUv);
      float isArt = step(0.9, n0.r) * step(0.9, n0.b) * step(n0.g, 0.1);

      vec3 paper = vec3(0.945, 0.915, 0.825) * (0.955 + 0.05 * vnoise(q * 0.35 / dpr) + 0.03 * vnoise(q * 0.03 / dpr));
      vec3 ink = vec3(0.09, 0.22, 0.80);
      vec3 inkDeep = vec3(0.06, 0.17, 0.70);

      // ---- artwork: keep every detail, just tint it to the ink / paper pair
      vec3 artCol = mix(inkDeep, paper, smoothstep(0.06, 0.72, l));

      // ---- tone -> hatching (same pattern as before, now razor sharp)
      float sh = 1.0 - smoothstep(0.07, 0.62, l);
      sh += (hash(floor(q / (5.0 * dpr))) - 0.5) * 0.05;
      float h1 = hl(q, 0.72, 5.2 * dpr, 0.26 + 0.55 * sh, 1.0);
      float h2 = hl(q, -0.5, 5.8 * dpr, 0.24 + 0.5 * sh, 7.0);
      float cov = h1 * smoothstep(0.16, 0.26, sh);
      cov = max(cov, h2 * smoothstep(0.48, 0.58, sh));
      float solid = smoothstep(0.8, 0.93, sh);
      cov = max(cov, solid);

      // ---- outlines: one-pixel-wide ink lines
      vec2 o = px;
      float d0 = depthAt(vUv);
      float eN = length(nrm(vUv + vec2(o.x, 0.)) - n0) + length(nrm(vUv - vec2(o.x, 0.)) - n0) + length(nrm(vUv + vec2(0., o.y)) - n0) + length(nrm(vUv - vec2(0., o.y)) - n0);
      float eD = (abs(depthAt(vUv + vec2(o.x, 0.)) - d0) + abs(depthAt(vUv - vec2(o.x, 0.)) - d0) + abs(depthAt(vUv + vec2(0., o.y)) - d0) + abs(depthAt(vUv - vec2(0., o.y)) - d0)) / d0;
      float edge = max(smoothstep(0.5, 0.9, eN), smoothstep(0.022, 0.06, eD));
      edge *= 0.85 + 0.15 * vnoise(q * 0.05 / dpr);

      vec3 inkMix = mix(vec3(0.13, 0.30, 0.88), vec3(0.07, 0.19, 0.72), smoothstep(0.3, 1.0, sh));
      vec3 col = mix(paper, inkMix, clamp(cov * 0.95, 0., 1.));
      col = mix(col, paper, step(0.93, hash(floor(q * 0.9 / dpr))) * 0.2 * solid);
      col = mix(col, inkDeep, clamp(edge * 0.92, 0., 1.));
      col = mix(col, artCol, isArt);
      col = mix(col, inkDeep, isArt * clamp(edge * 0.85, 0., 1.));

      vec2 uc = vUv - 0.5; col *= 1.0 - dot(uc, uc) * 0.18;
      gl_FragColor = vec4(col, 1.0);
    }`
})
const quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), tone))
let meshList = null
const composer = {
  setSize(w, h) {
    const d = renderer.getPixelRatio(), bw = Math.round(w * d), bh = Math.round(h * d)
    rtColor.setSize(bw, bh); rtNormal.setSize(bw, bh)
    tone.uniforms.res.value.set(bw, bh); tone.uniforms.dpr.value = d
  },
  render() {
    if (!meshList) {                                                   // every mesh once; textured ones count as artwork (except the window view)
      meshList = []
      scene.traverse(o => { if (o.isMesh) meshList.push({ m: o, orig: o.material, art: !!(o.material && o.material.map) && !o.userData.noArt && o !== pane }) })
    }
    renderer.setRenderTarget(rtColor); renderer.render(scene, camera)
    for (const e of meshList) e.m.material = e.art ? artMat : normalMat
    renderer.setRenderTarget(rtNormal); renderer.render(scene, camera)
    for (const e of meshList) e.m.material = e.orig
    renderer.setRenderTarget(null); renderer.render(quadScene, quadCam)
  }
}
tone.uniforms = tone.uniforms

/* ---------- scroll story: one camera stage per section ---------- */
const V = (x, y, z) => new THREE.Vector3(x, y, z)
const stages = [
  { pos: V(1.9, 2.0, 3.6),   look: V(0.5, 1.0, 0.0) },     // 0 hero: the whole studio
  { pos: V(-1.0, 2.25, 2.55), look: V(0.8, 0.8, 0.1) },   // 1 about: over her shoulder, her workspace + notebook
  { pos: V(-0.55, 1.75, 0.95), look: V(-0.7, 0.9, -0.02) },   // 2 interests: top view of the table
  { pos: V(-0.1, 2.4, 1.4),  look: V(-0.1, 2.4, -2.6) },   // 3 work: the four frames
  { pos: V(2.3, 2.55, -0.55), look: V(2.8, 2.45, -2.0) },   // 4 music: the radio
  { pos: V(1.1, 1.1, 0.8), look: V(1.03, 0.8, 0.53) }      // 5 contact: the flip phone, close and from above
]
// review helper: ?cam=px,py,pz,lx,ly,lz pins the camera (e.g. to inspect the figure up close)
const camQ = new URLSearchParams(location.search).get('cam')
if (camQ) { const v = camQ.split(',').map(Number); stages.forEach(st => { st.pos.set(v[0], v[1], v[2]); st.look.set(v[3], v[4], v[5]) }); document.getElementById('hero').style.display = 'none' }
const camPos = new THREE.CatmullRomCurve3(stages.map(s => s.pos), false, 'centripetal')
const camLook = new THREE.CatmullRomCurve3(stages.map(s => s.look), false, 'centripetal')
const smoothstep = t => t * t * (3 - 2 * t)
const N = stages.length - 1

const $ = sel => document.querySelector(sel)
const lilyHint = $('#lily-hint'), barFill = $('#barfill'), drawer = $('#drawer'), rail = $('#rail'), hero = $('#hero'), tip = $('#tip')
let prog = 0, progT = 0, activeStage = -1, projectOpen = -1, shift = 0, wasShift = null
const DEBUG_STAGE = new URLSearchParams(location.search).get('stage')   // e.g. studio-v8.html?stage=3 jumps straight to a stage
const readScroll = () => {
  if (DEBUG_STAGE !== null) { progT = THREE.MathUtils.clamp(Number(DEBUG_STAGE) / N, 0, 1); return }
  const max = document.documentElement.scrollHeight - innerHeight
  progT = max > 0 ? THREE.MathUtils.clamp(scrollY / max, 0, 1) : 0
}
addEventListener('scroll', readScroll, { passive: true }); readScroll(); if (DEBUG_STAGE !== null) prog = progT
const goStage = i => scrollTo({ top: (i / N) * (document.documentElement.scrollHeight - innerHeight), behavior: 'smooth' })
rail.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => goStage(Number(b.dataset.go))))
addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goStage(Math.min(N, Math.round(progT * N) + 1)) }
  if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); goStage(Math.max(0, Math.round(progT * N) - 1)) }
})

const mouse = new THREE.Vector2(), smooth = new THREE.Vector2()
const ndc = new THREE.Vector2(), raycaster = new THREE.Raycaster()
let hovered = null, pointerOnCanvas = false, down = null
let ptrX = -999, ptrY = -999
function track(e) {
  ptrX = e.clientX; ptrY = e.clientY
  mouse.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5)
  pointerOnCanvas = e.target === canvas
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
  tip.style.transform = `translate(${Math.min(e.clientX + 18, innerWidth - 300)}px, ${e.clientY + 18}px)`
}
;['pointermove', 'pointerdown', 'pointerup', 'mousemove', 'mouseover'].forEach(n => addEventListener(n, track, { passive: true }))
const STAGE_OF = { frame: 3, radio: 4, phone: 5, lily: 2, book: 2 }
function pick() {
  if (!pointerOnCanvas) return null
  if (activeStage === 2 && Math.abs(prog * N - 2) < 0.45) {                       // lilies: pick the nearest flower head within ~70px of the pointer
    let best = null, bd = 70
    lilies.forEach((L, i) => {
      const v = L.head.clone().add(new THREE.Vector3(0, 0.05, 0)).project(camera)
      if (v.z > 1) return
      const d = Math.hypot((v.x * 0.5 + 0.5) * innerWidth - ptrX, (-v.y * 0.5 + 0.5) * innerHeight - ptrY)
      if (d < bd) { bd = d; best = i }
    })
    if (best !== null) return { kind: 'lily', index: best }
  }
  raycaster.setFromCamera(ndc, camera)
  const hit = raycaster.intersectObjects(pickables, false)[0]
  if (!hit) return null
  const info = hit.object.userData.pick
  return STAGE_OF[info.kind] === activeStage && Math.abs(prog * N - activeStage) < 0.45 ? info : null
}
const sameInfo = (a, b) => (a && b && a.kind === b.kind && a.index === b.index) || (!a && !b)
function setHover(info) {
  if (sameInfo(info, hovered)) return
  hovered = info
  canvas.style.cursor = info ? 'pointer' : ''
  if (!info) { tip.classList.remove('on'); return }
  if (info.kind === 'frame') { const p = PROJECTS[info.index]; tip.innerHTML = `<small>View project</small><b>${p.title}</b> — tap to see work` }
  else if (info.kind === 'lily') tip.innerHTML = lilies[info.index].target ? `<small>In bloom</small><b>Tap</b> for a little shake` : `<small>Touch it</small><b>Tap the lily</b> to open it`
  else if (info.kind === 'book') tip.innerHTML = `<small>Sketchbook</small><b>Tap</b> to turn the page`
  else if (info.kind === 'radio') tip.innerHTML = `<small>On repeat</small><b>Tap the radio</b> to tune in`
  else tip.innerHTML = `<small>Say hello</small><b>Contact me</b>`
  tip.classList.add('on')
}
lilyHint.addEventListener('click', () => { if (hintLily >= 0) bloom(hintLily) })
window.addEventListener('click', e => {                       // 'click' fires for mouse, touch and pen alike
  if (e.target.closest && e.target.closest('#drawer, #rail, #lily-hint, a, button')) return
  ptrX = e.clientX; ptrY = e.clientY
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); pointerOnCanvas = true
  const info = pick(); if (!info) return
  if (info.kind === 'frame') openProject(info.index)
  else if (info.kind === 'lily') { lilies[info.index].target ? (lilies[info.index].shake = 1) : bloom(info.index) }
  else if (info.kind === 'book') flipPage()
  else if (info.kind === 'radio') toggleRadio()
  else phonePing = 1
})

/* ---------- side panel ---------- */
const panes = [...document.querySelectorAll('.pane')]
const PANE_OF_STAGE = [null, 'about', 'interests', 'work', 'music', 'contact']
const RAIL_OF_STAGE = [null, 'about', 'about', 'work', 'music', 'contact']
function showPane(name) { panes.forEach(p => p.classList.toggle('on', p.dataset.pane === name)) }
function setStage(i) {
  activeStage = i; projectOpen = -1
  document.body.dataset.stage = i
  hero.classList.toggle('on', i === 0)
  drawer.classList.toggle('open', i > 0)
  showPane(PANE_OF_STAGE[i])
  rail.querySelectorAll('[data-rail]').forEach(b => b.classList.toggle('active', b.dataset.rail === RAIL_OF_STAGE[i]))
  setHover(null)
  if (i === 4) startPolling(); else stopPolling()
}
function openProject(i) {
  const p = PROJECTS[i]
  if (p.url) { window.open(p.url, '_blank', 'noopener'); return }
  projectOpen = i
  $('#proj-num').textContent = `Project 0${i + 1}`; $('#proj-title').textContent = p.title
  $('#proj-tag').textContent = p.tag; $('#proj-blurb').textContent = p.blurb
  showPane('project')
}
$('#proj-back').addEventListener('click', () => { projectOpen = -1; showPane('work') })
document.querySelectorAll('[data-project]').forEach(b => b.addEventListener('click', () => openProject(Number(b.dataset.project))))

/* ---------- radio + Spotify ---------- */
let radioOn = false, pollTimer = null
const embed = $('#np-embed')
function toggleRadio() {
  radioOn = !radioOn
  document.body.classList.toggle('radio-on', radioOn)
  if (radioOn && !embed.querySelector('iframe')) {
    embed.innerHTML = `<iframe title="Spotify player" src="https://open.spotify.com/embed/${SPOTIFY_EMBED}?utm_source=generator&theme=0" width="100%" height="152" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`
  }
}
$('#np-tune').addEventListener('click', toggleRadio)
const fmt = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
async function poll() {
  try {
    const r = await fetch(import.meta.env.BASE_URL + 'api/now-playing', { cache: 'no-store' })
    const d = await r.json()
    const card = $('#np-card')
    if (!d.configured) { card.classList.add('off'); $('#np-status').textContent = 'Live track not connected yet — tap the radio to hear my playlist.'; return }
    if (!d.title) { card.classList.add('off'); $('#np-status').textContent = 'Nothing playing right now.'; return }
    card.classList.remove('off')
    $('#np-status').textContent = d.isPlaying ? 'Listening to right now' : 'Last played'
    $('#np-title').textContent = d.title; $('#np-artist').textContent = d.artist
    if (d.albumImageUrl) $('#np-art').src = d.albumImageUrl
    $('#np-link').href = d.songUrl || '#'
    $('#np-bar i').style.width = d.durationMs ? `${(100 * d.progressMs) / d.durationMs}%` : '0%'
    $('#np-time').textContent = d.durationMs ? `${fmt(d.progressMs)} / ${fmt(d.durationMs)}` : ''
    card.classList.toggle('playing', !!d.isPlaying)
  } catch { $('#np-card').classList.add('off'); $('#np-status').textContent = 'Live track not connected yet — tap the radio to hear my playlist.' }
}
function startPolling() { if (!pollTimer) { poll(); pollTimer = setInterval(poll, 5000) } }
function stopPolling() { clearInterval(pollTimer); pollTimer = null }

/* ---------- resize / view offset (scene is shifted right of the panel) ---------- */
function resize() {
  const w = innerWidth, h = innerHeight
  renderer.setSize(w, h, false); composer.setSize(w, h)
  camera.aspect = w / h
  camera.fov = w / h < 1 ? 56 : 38
  camera.updateProjectionMatrix(); wasShift = null
}
addEventListener('resize', resize); resize()
addEventListener('scroll', () => {                       // the panel + progress bar react immediately, even if the 3D frame is slow
  const i = Math.round(progT * N)
  if (i !== activeStage) setStage(i)
  barFill.style.height = (progT * 100).toFixed(1) + '%'
}, { passive: true })
const railW = () => rail.offsetWidth, drawerW = () => drawer.offsetWidth
const isNarrow = () => innerWidth < 700

function stageT(p) {                      // hold near each keyframe, travel smoothly in between
  const f = p * N, i = Math.min(Math.floor(f), N - 1), local = f - i
  return (i + smoothstep(THREE.MathUtils.clamp((local - 0.06) / 0.88, 0, 1))) / N
}
const look = new THREE.Vector3(), clock = new THREE.Clock()
let phonePing = 0, radioMix = 0, fit = 1, hintLily = -1
let lastT = 0, slow = 0, frames = 0
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime(), dt = Math.min(t - lastT, 0.25); lastT = t
  // adaptive quality: if frames are slow, drop resolution so scrolling stays smooth
  if (t > 2.5) { frames++; slow += dt }
  if (frames === 24) { if (slow / 24 > 0.04 && qTier < 2) { qTier++; renderer.setPixelRatio(pixelRatioFor(qTier)); resize() } frames = 0; slow = 0 }
  prog += (progT - prog) * (1 - Math.exp(-dt * 5))
  smooth.lerp(mouse, 0.05)
  const u = stageT(prog)
  camPos.getPoint(u, camera.position); camLook.getPoint(u, look)
  // narrow / portrait windows: pull the camera back so each subject still fits in the space beside the panel
  const visAspect = Math.max(0.2, (innerWidth - shift * 2) / innerHeight)
  fit += (THREE.MathUtils.clamp(1.1 / visAspect, 1, 1.7) - fit) * (1 - Math.exp(-dt * 6))
  camera.position.sub(look).multiplyScalar(fit).add(look)
  camera.lookAt(look)

  const idx = Math.round(prog * N)
  if (idx !== activeStage) setStage(idx)
  const shiftT = isNarrow() ? 0 : (railW() + (activeStage > 0 ? drawerW() : 0)) / 2
  shift += (shiftT - shift) * (1 - Math.exp(-dt * 6))
  if (wasShift === null || Math.abs(shift - wasShift) > 0.3) { camera.setViewOffset(innerWidth, innerHeight, -shift, 0, innerWidth, innerHeight); wasShift = shift }

  setHover(pick())
  frameEntries.forEach((f, i) => {
    const on = hovered && hovered.kind === 'frame' && hovered.index === i
    f.hover += ((on ? 1 : 0) - f.hover) * 0.18
    f.group.position.z = f.baseZ + f.hover * 0.07; f.group.scale.setScalar(1 + f.hover * 0.025)
  })

  // life: breathing, head tilt, bun, typing fingers
  spineBones.forEach(b => { b.rotation.x += (Math.sin(t * 1.6) * 0.004) * 0 })
  fingerBones.forEach((f, i) => { if (f.userData.r0 === undefined) f.userData.r0 = f.rotation.x; f.rotation.x = f.userData.r0 + Math.max(0, Math.sin(t * 9 + i * 1.9)) * 0.22 })
  // sketchbook page turn: springy swing over the spine with a slight lift
  flipV += (flipTarget - flipT) * 60 * Math.min(dt, 0.05); flipV *= Math.exp(-Math.min(dt, 0.05) * 9); flipT += flipV * Math.min(dt, 0.05)
  pageLeaf.rotation.z = Math.PI * Math.min(Math.max(flipT, 0), 1.03)
  pageLeaf.position.y = 0.0265 + Math.sin(Math.PI * Math.min(Math.max(flipT, 0), 1)) * 0.012
  // lilies: springy bloom, petals open one after another, then a little shake
  const lt = Math.min(dt, 0.05)
  for (const L of lilies) {
    L.v += (L.target - L.b) * 70 * lt; L.v *= Math.exp(-lt * 6.5); L.b += L.v * lt
    L.petals.forEach((m, p) => {
      const eb = THREE.MathUtils.clamp(L.b * 1.35 - (p / 6) * 0.35, 0, 1.12)
      m.rotation.z = THREE.MathUtils.lerp(1.36, -0.05, Math.min(eb, 1.12))
      m.scale.set(THREE.MathUtils.lerp(0.9, 1, Math.min(eb, 1)), 1, THREE.MathUtils.lerp(0.62, 1, Math.min(eb, 1)))
    })
    const so = THREE.MathUtils.clamp(L.b, 0, 1); L.sg.scale.setScalar(so * so * so + 0.001); L.sg.visible = so > 0.15
    L.shake *= Math.exp(-lt * 1.6)
    L.g.rotation.z = Math.sin(t * 26) * 0.35 * L.shake; L.g.rotation.x = Math.cos(t * 21) * 0.22 * L.shake
  }
  const closed = lilies.find(L => !L.target)
  if (closed && activeStage === 2 && Math.abs(prog * N - 2) < 0.4) {
    const v = closed.head.clone().add(new THREE.Vector3(0, 0.1, 0)).project(camera)
    lilyHint.style.transform = `translate(${((v.x * 0.5 + 0.5) * innerWidth).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * innerHeight).toFixed(1)}px)`
    lilyHint.classList.toggle('on', v.z < 1); hintLily = lilies.indexOf(closed)
  } else lilyHint.classList.remove('on')
  // radio: needle sweeps and notes float while tuned in
  radioMix += ((radioOn ? 1 : 0) - radioMix) * 0.08
  needle.position.x = 0.07 + Math.sin(t * 0.8) * 0.02 * radioMix - 0.005 * (1 - radioMix)
  dialKnob.rotation.y = t * 1.2 * radioMix
  notes.forEach((n, i) => { const k = (t * 0.5 + i / notes.length) % 1; n.position.set(-0.1 + i * 0.07 + Math.sin(t * 2 + i) * 0.02, 0.4 + k * 0.35, 0.09); n.visible = radioMix > 0.5; n.scale.setScalar(1 - k * 0.6) })
  // phone: LED blink, tap pulse
  phonePing *= 0.94; phoneLed.visible = Math.sin(t * 4) > -0.2
  phone.position.y = deskY + 0.04 + Math.sin(phonePing * 12) * 0.01 * phonePing
  barFill.style.height = (prog * 100).toFixed(1) + '%'
  tone.uniforms.time.value = t
  composer.render()
})
