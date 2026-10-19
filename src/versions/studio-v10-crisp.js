import * as THREE from 'three'
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
  imageTex('/art/bike-frame.webp', [150, 68, 1238, 888]),
  imageTex('/art/woman-frame.webp', [157, 72, 1226, 880]),
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
// vase of lilies
const VX = 1.78, VZ = -0.42, VY = deskY + 0.04
const vaseProfile = [[0.001, 0], [0.05, 0], [0.062, 0.03], [0.078, 0.1], [0.06, 0.18], [0.042, 0.23], [0.055, 0.26], [0.05, 0.265]].map(([r, y]) => new THREE.Vector2(r, y))
add(new THREE.LatheGeometry(vaseProfile, 28), 0.6, VX, VY, VZ)
const vTop = [VX, VY + 0.24, VZ]
function lily(x, y, z, rx, rz) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(rx, 0, rz); scene.add(g)
  for (let p = 0; p < 6; p++) {
    const pv = new THREE.Group(); pv.rotation.y = (p * Math.PI) / 3; g.add(pv)
    Sc(add(sph(0.05, 10), 1, 0, 0, -0.065, { parent: pv, rot: [0.55, 0, 0], edges: false }), 0.42, 0.12, 1.4)
  }
  for (let k = 0; k < 4; k++) { const a = k * 1.6; add(cyl(0.0035, 0.0035, 0.08), 0.3, Math.cos(a) * 0.014, 0.04, Math.sin(a) * 0.014, { parent: g, rot: [Math.sin(a) * 0.25, 0, Math.cos(a) * 0.25], edges: false }) }
}
function bud(x, y, z, rx, rz) {
  const m = Sc(add(sph(0.03, 12), 1, x, y, z, { rot: [rx, 0, rz], edges: false }), 0.6, 2.4, 0.6)
  return m
}
const blooms = [
  ['open', 1.6, deskY + 0.78, -0.5, 0.7, 0.5], ['open', 1.98, deskY + 0.66, -0.36, 0.55, -0.6], ['open', 1.76, deskY + 0.92, -0.3, -0.2, 0.05],
  ['bud', 1.66, deskY + 0.86, -0.56, 0.2, 0.35], ['bud', 1.9, deskY + 0.84, -0.5, 0.15, -0.3]
]
for (const [kind, x, y, z, rx, rz] of blooms) {
  limb(vTop, [x, y - 0.03, z], 0.006, 0.005, 0.3)
  kind === 'open' ? lily(x, y, z, rx, rz) : bud(x, y + 0.04, z, rx, rz)
  const mx = (vTop[0] + x) / 2, my = (vTop[1] + y) / 2 - 0.02, mz = (vTop[2] + z) / 2
  Sc(add(sph(0.05, 8), 0.35, mx + 0.025, my, mz, { rot: [0, 0, -0.5], edges: false }), 0.22, 1.9, 0.5)
  Sc(add(sph(0.05, 8), 0.35, mx - 0.025, my - 0.09, mz, { rot: [0, 0, 0.5], edges: false }), 0.22, 1.9, 0.5)
}

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
for (const sx_ of [-1, 1]) {
  add(box(0.215, 0.008, 0.28), 1, sx_ * 0.109, 0.016, 0, { parent: sketchbook, rot: [0, 0, sx_ * -0.02], edges: false })
  add(new THREE.PlaneGeometry(0.205, 0.27), 1, sx_ * 0.109, 0.0215, 0, { parent: sketchbook, rot: [-Math.PI / 2, 0, sx_ * -0.02], cast: false, material: new THREE.MeshLambertMaterial({ map: sketchPage(sx_ < 0 ? 'flowers' : 'toy') }) })
}
// toys: stacked blocks, a rubber duck, a tiny robot
const toys = new THREE.Group(); toys.position.set(0.98, deskY + 0.04, -0.12); scene.add(toys)
;[[0, 0.025, 0, 0.8], [0.01, 0.075, 0.005, 0.25], [-0.005, 0.125, 0, 1]].forEach(([x, y, z, a], i) => add(box(0.05, 0.05, 0.05), a, x, y, z, { parent: toys, rot: [0, 0.2 * i, 0] }))
Sc(add(sph(0.045, 16), 1, 0.17, 0.04, 0.05, { parent: toys, edges: false }), 1.1, 0.85, 1.3)          // duck body
add(sph(0.03, 14), 1, 0.17, 0.095, 0.0, { parent: toys, edges: false })                                // duck head
add(new THREE.ConeGeometry(0.014, 0.03, 8), 0.2, 0.17, 0.092, -0.035, { parent: toys, rot: [-Math.PI / 2, 0, 0], edges: false })   // beak
add(box(0.06, 0.07, 0.045), 0.3, -0.12, 0.035, 0.07, { parent: toys })                                 // robot body
add(box(0.05, 0.04, 0.04), 1, -0.12, 0.09, 0.07, { parent: toys }); add(cyl(0.003, 0.003, 0.03), 0.3, -0.12, 0.12, 0.07, { parent: toys, edges: false })
add(box(0.014, 0.05, 0.014), 0.3, -0.165, 0.04, 0.07, { parent: toys }); add(box(0.014, 0.05, 0.014), 0.3, -0.075, 0.04, 0.07, { parent: toys })

// flip phone lying on the desk (open: screen on top, keypad below)
const phone = new THREE.Group(); phone.position.set(1.02, deskY + 0.045, 0.52); phone.rotation.y = 0.55; scene.add(phone)
const phoneScreenTex = (() => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 200
  const g = c.getContext('2d'); g.fillStyle = '#0f2a78'; g.fillRect(0, 0, 256, 200)
  g.strokeStyle = '#efe7d4'; g.lineWidth = 6; g.strokeRect(60, 50, 136, 84); g.beginPath(); g.moveTo(60, 50); g.lineTo(128, 100); g.lineTo(196, 50); g.stroke()
  g.fillStyle = '#efe7d4'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.fillText('CONTACT ME', 128, 172)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
})()
const phoneBodyU = add(rbox(0.075, 0.016, 0.1, 0.014), 0.85, 0, 0, -0.058, { parent: phone, edges: false })
const phoneBodyL = add(rbox(0.075, 0.016, 0.092, 0.014), 0.85, 0, 0, 0.05, { parent: phone, edges: false })
add(cyl(0.012, 0.012, 0.07, 14), 0.5, 0, 0.002, -0.004, { parent: phone, rot: [0, 0, Math.PI / 2], edges: false })    // hinge
add(new THREE.PlaneGeometry(0.052, 0.04), 1, 0, 0.0085, -0.075, { parent: phone, rot: [-Math.PI / 2, 0, 0], cast: false, material: new THREE.MeshBasicMaterial({ map: phoneScreenTex }) })
add(cyl(0.02, 0.02, 0.004, 20), 0.4, 0, 0.009, 0.03, { parent: phone, edges: false })                                  // d-pad
add(cyl(0.012, 0.012, 0.006, 16), 0.9, 0, 0.0115, 0.075, { parent: phone, edges: false })                               // round button
for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) add(box(0.014, 0.004, 0.008), 0.35, -0.022 + c * 0.022, 0.0095, 0.052 + r * 0.02, { parent: phone, edges: false })
add(cyl(0.004, 0.004, 0.03, 8), 0.4, -0.03, 0.004, -0.115, { parent: phone, rot: [0.3, 0, 0], edges: false })           // antenna stub
for (let i = 0; i < 16; i++) {                                                                                             // bead strap
  const a = (i / 15) * Math.PI * 1.5
  add(sph(0.0065, 8), i % 3 === 0 ? 0.15 : 1, -0.04 - Math.sin(a) * 0.05, 0.004, 0.045 + (1 - Math.cos(a)) * 0.05, { parent: phone, edges: false })
}
;[phoneBodyU, phoneBodyL].forEach(m => { m.userData.pick = { kind: 'phone' }; pickables.push(m) })
const phoneLed = add(sph(0.004, 8), 1, 0.03, 0.01, -0.105, { parent: phone, edges: false })

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

/* ---------- the girl ---------- */
const girl = new THREE.Group(); scene.add(girl)
const SKIN = 0.85, TOP = 0.24, SKIRT = 0.22, HAIR = 0.2, SHOE = 0.12
const ell = (g, sx, sy, sz) => { g.scale(sx, sy, sz); return g }
const hip = new THREE.Vector3(0, 0.62, 0.95)

// hips + flared skirt draped over the thighs
Sc(add(sph(0.17, 24), SKIRT, hip.x, hip.y, hip.z, { parent: girl }), 1.25, 0.8, 1.05)
Sc(limb([0, hip.y, hip.z - 0.02], [0, 0.63, 0.44], 0.17, 0.205, SKIRT, girl), 1.35, 1, 0.8)
Sc(add(new THREE.TorusGeometry(0.2, 0.014, 8, 28), 1, 0, 0.63, 0.44, { parent: girl, rot: [0, 0, 0], edges: false }), 1.3, 0.85, 1)   // hem trim
// bare slim legs, small flat shoes
for (const sx_ of [-0.11, 0.11]) {
  const knee = [sx_ * 1.15, 0.58, 0.41], ankle = [sx_ * 1.2, 0.1, 0.38]
  add(sph(0.05), SKIN, ...knee, { parent: girl })
  limb(knee, ankle, 0.052, 0.032, SKIN, girl)
  Sc(add(sph(0.042, 14), SHOE, sx_ * 1.2, 0.04, 0.3, { parent: girl }), 1, 0.6, 2.1)
}

// torso: nipped waist, bust, narrow shoulders; leaning to the desk
const profile = [[0.001, 0], [0.12, 0.01], [0.125, 0.1], [0.1, 0.22], [0.12, 0.33], [0.148, 0.42], [0.14, 0.52], [0.13, 0.58], [0.09, 0.63], [0.05, 0.665], [0.001, 0.68]]
  .map(([r, y]) => new THREE.Vector2(r, y))
const torso = new THREE.Group(); torso.position.copy(hip).add(new THREE.Vector3(0, 0.03, -0.02)); torso.rotation.x = -0.36
girl.add(torso)
Sc(add(new THREE.LatheGeometry(profile, 32), TOP, 0, 0, 0, { parent: torso }), 1.15, 1, 0.72)
Sc(add(new THREE.TorusGeometry(0.105, 0.016, 8, 28), 1, 0, 0.215, 0, { parent: torso, rot: [Math.PI / 2, 0, 0], edges: false }), 1.15, 0.72, 1)   // waist belt
const shoulderL = new THREE.Vector3(-0.175, 0.57, 0), shoulderR = new THREE.Vector3(0.175, 0.57, 0)
for (const sh of [shoulderL, shoulderR]) add(sph(0.05, 16), TOP, ...sh.toArray(), { parent: torso })   // puff sleeve caps


// cream collar
add(new THREE.TorusGeometry(0.06, 0.013, 8, 20), 1, 0, 0.665, -0.005, { parent: torso, rot: [Math.PI / 2, 0, 0], edges: false })

// neck + head
torso.updateMatrixWorld(true)
const nb = torso.localToWorld(new THREE.Vector3(0, 0.66, 0.0))
const neckTop = nb.clone().add(new THREE.Vector3(0, 0.1, -0.05))
limb(nb.toArray(), neckTop.toArray(), 0.05, 0.04, SKIN, girl)
for (const sh of [shoulderL, shoulderR]) { const tip = torso.localToWorld(sh.clone()); limb([nb.x, nb.y + 0.01, nb.z], [tip.x, tip.y + 0.01, tip.z], 0.045, 0.05, TOP, girl) }   // trapezius slope
const head = new THREE.Group(); head.position.copy(neckTop).add(new THREE.Vector3(0, 0.1, -0.015)); head.rotation.x = -0.38; head.scale.setScalar(1.14); girl.add(head)
add(ell(sph(0.105, 28), 0.9, 1.08, 1.0), SKIN, 0, 0, 0, { parent: head, edges: false })     // skull
add(ell(sph(0.066, 18), 0.88, 0.95, 1.0), SKIN, 0, -0.085, -0.035, { parent: head, edges: false })   // soft chin
add(ell(sph(0.018, 10), 0.5, 1, 0.8), SKIN, 0.094, -0.012, 0.0, { parent: head })
add(new THREE.TorusGeometry(0.009, 0.0025, 6, 12), 0.3, 0.1, -0.04, 0.0, { parent: head, rot: [0, 1.57, 0], edges: false })   // earring
add(ell(sph(0.013, 10), 1, 0.9, 1.2), SKIN, 0, -0.02, -0.105, { parent: head })
// hair: smooth cap pulled back into a high bun
add(ell(sph(0.118, 30), 1.0, 1.1, 1.08), HAIR, 0, 0.024, 0.03, { parent: head, edges: false })
for (const sx_ of [-1, 1]) Sc(add(sph(0.045, 12), HAIR, sx_ * 0.09, -0.02, -0.03, { parent: head, edges: false }), 0.5, 1.4, 0.9)
const bun = Sc(add(sph(0.088, 24), HAIR, 0, 0.215, 0.1, { parent: head, edges: false }), 1.05, 0.95, 1)
for (const [r, y, k] of [[0.083, 0.2, 0.0], [0.086, 0.222, 0.0], [0.066, 0.248, 0.0]])
  add(new THREE.TorusGeometry(r, 0.004, 6, 28), 1, 0, y, 0.1, { parent: head, rot: [Math.PI / 2 + k, 0, 0], edges: false })   // wrapped-hair highlight bands
add(new THREE.TorusGeometry(0.075, 0.012, 8, 22), 1, 0, 0.165, 0.1, { parent: head, rot: [Math.PI / 2, 0, 0] })              // hair tie
for (const sx_ of [-1, 1]) add(sph(0.012, 8), 1, sx_ * 0.075, 0.165, 0.1, { parent: head, edges: false })

// slim arms; both hands rest on the laptop keyboard
laptop.updateMatrixWorld(true)
const sR = torso.localToWorld(shoulderR.clone()), sL = torso.localToWorld(shoulderL.clone())
const wristR = laptop.localToWorld(new THREE.Vector3(0.075, 0.05, 0.125)), wristL = laptop.localToWorld(new THREE.Vector3(-0.075, 0.05, 0.125))
const elbowR = new THREE.Vector3(0.4, 0.93, 0.68), elbowL = new THREE.Vector3(-0.08, 0.93, 0.66)
function arm(sh, el, hd) {
  const mid = sh.clone().lerp(el, 0.4)
  limb(sh.toArray(), mid.toArray(), 0.058, 0.054, TOP, girl)                              // sleeve
  add(new THREE.TorusGeometry(0.047, 0.01, 8, 16), 1, mid.x, mid.y, mid.z, { parent: girl, edges: false }).quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), el.clone().sub(sh).normalize())
  limb(mid.toArray(), el.toArray(), 0.034, 0.03, SKIN, girl)
  add(sph(0.03, 14), SKIN, ...el.toArray(), { parent: girl })
  limb(el.toArray(), hd.toArray(), 0.03, 0.021, SKIN, girl)
  const dir = new THREE.Vector3().subVectors(hd, el).normalize()
  const br = add(new THREE.TorusGeometry(0.025, 0.006, 8, 16), 0.3, hd.x - dir.x * 0.035, hd.y - dir.y * 0.035, hd.z - dir.z * 0.035, { parent: girl, edges: false })
  br.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir)
}
arm(sR, elbowR, wristR); arm(sL, elbowL, wristL)
// palms + four fingers each, resting on the keys (children of the laptop so they stay aligned with it)
const fingers = []
for (const sx_ of [-1, 1]) {
  Sc(add(sph(0.034, 14), SKIN, sx_ * 0.075, 0.04, 0.1, { parent: laptop }), 1.1, 0.5, 1.5)
  for (let i = 0; i < 4; i++) {
    const f = add(cyl(0.0068, 0.006, 0.058, 10), SKIN, sx_ * 0.075 + (i - 1.5) * 0.0165, 0.034, 0.045, { parent: laptop, rot: [Math.PI / 2, 0, 0], edges: false })
    add(sph(0.0068, 8), SKIN, 0, -0.029, 0, { parent: f, edges: false }); fingers.push(f)
  }
  add(cyl(0.0075, 0.007, 0.04, 10), SKIN, sx_ * 0.075 - sx_ * 0.05, 0.036, 0.075, { parent: laptop, rot: [Math.PI / 2, 0, -sx_ * 0.7], edges: false })   // thumb
}

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
      vec3 inkDeep = vec3(0.05, 0.15, 0.66);

      // ---- artwork: keep every detail, just tint it to the ink / paper pair
      vec3 artCol = mix(inkDeep, paper, smoothstep(0.06, 0.72, l));

      // ---- shading by pen strokes
      float sh = 1.0 - smoothstep(0.07, 0.62, l);
      sh += (hash(floor(q / (5.0 * dpr))) - 0.5) * 0.07;
      float gap1 = mix(0.82, 0.12, smoothstep(0.12, 0.45, sh));
      float cov = strokes(q, 0.93, 6.5 * dpr, 1.15 * dpr, 1.0, gap1, 46.0 * dpr) * smoothstep(0.12, 0.2, sh);
      cov = max(cov, strokes(q, -0.62, 7.0 * dpr, 1.1 * dpr, 7.0, mix(0.7, 0.1, smoothstep(0.4, 0.6, sh)), 40.0 * dpr) * smoothstep(0.4, 0.48, sh));
      cov = max(cov, strokes(q, 0.12, 4.6 * dpr, 1.25 * dpr, 13.0, 0.08, 34.0 * dpr) * smoothstep(0.66, 0.74, sh));
      cov = max(cov, strokes(q, 0.93, 2.9 * dpr, 1.9 * dpr, 29.0, 0.03, 60.0 * dpr) * smoothstep(0.86, 0.93, sh));
      cov = max(cov, smoothstep(0.97, 1.0, sh) * 0.55);

      // ---- outlines: 1px pen lines where depth or surface direction jumps
      vec2 o = px;
      float d0 = depthAt(vUv);
      float eN = length(nrm(vUv + vec2(o.x, 0.)) - n0) + length(nrm(vUv - vec2(o.x, 0.)) - n0) + length(nrm(vUv + vec2(0., o.y)) - n0) + length(nrm(vUv - vec2(0., o.y)) - n0);
      float eD = (abs(depthAt(vUv + vec2(o.x, 0.)) - d0) + abs(depthAt(vUv - vec2(o.x, 0.)) - d0) + abs(depthAt(vUv + vec2(0., o.y)) - d0) + abs(depthAt(vUv - vec2(0., o.y)) - d0)) / d0;
      float edge = max(smoothstep(0.55, 1.0, eN), smoothstep(0.03, 0.075, eD));
      edge *= 0.8 + 0.2 * vnoise(q * 0.05 / dpr);

      vec3 col = mix(paper, ink, clamp(cov * 0.96, 0., 1.));
      col = mix(col, inkDeep, clamp(edge * 0.95, 0., 1.));
      col = mix(col, artCol, isArt);
      col = mix(col, inkDeep, isArt * clamp(edge * 0.8, 0., 1.));

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
      scene.traverse(o => { if (o.isMesh) meshList.push({ m: o, orig: o.material, art: !!(o.material && o.material.map) && o !== pane }) })
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
  { pos: V(0.55, 3.25, 0.95), look: V(0.55, 0.78, 0.0) },   // 2 interests: top view of the table
  { pos: V(-0.1, 2.4, 1.4),  look: V(-0.1, 2.4, -2.6) },   // 3 work: the four frames
  { pos: V(2.3, 2.55, -0.55), look: V(2.8, 2.45, -2.0) },   // 4 music: the radio
  { pos: V(1.35, 1.3, 1.0), look: V(1.0, 0.8, 0.5) }      // 5 contact: the flip phone
]
// review helper: ?cam=px,py,pz,lx,ly,lz pins the camera (e.g. to inspect the figure up close)
const camQ = new URLSearchParams(location.search).get('cam')
if (camQ) { const v = camQ.split(',').map(Number); stages.forEach(st => { st.pos.set(v[0], v[1], v[2]); st.look.set(v[3], v[4], v[5]) }); document.getElementById('hero').style.display = 'none' }
const camPos = new THREE.CatmullRomCurve3(stages.map(s => s.pos), false, 'centripetal')
const camLook = new THREE.CatmullRomCurve3(stages.map(s => s.look), false, 'centripetal')
const smoothstep = t => t * t * (3 - 2 * t)
const N = stages.length - 1

const $ = sel => document.querySelector(sel)
const barFill = $('#barfill'), drawer = $('#drawer'), rail = $('#rail'), hero = $('#hero'), tip = $('#tip')
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
function track(e) {
  mouse.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5)
  pointerOnCanvas = e.target === canvas
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
  tip.style.transform = `translate(${Math.min(e.clientX + 18, innerWidth - 300)}px, ${e.clientY + 18}px)`
}
;['pointermove', 'pointerdown', 'pointerup', 'mousemove', 'mouseover'].forEach(n => addEventListener(n, track, { passive: true }))
const STAGE_OF = { frame: 3, radio: 4, phone: 5 }
function pick() {
  if (!pointerOnCanvas) return null
  raycaster.setFromCamera(ndc, camera)
  const hit = raycaster.intersectObjects(pickables, false)[0]
  if (!hit) return null
  const info = hit.object.userData.pick
  return STAGE_OF[info.kind] === activeStage && Math.abs(prog * N - activeStage) < 0.18 ? info : null
}
const sameInfo = (a, b) => (a && b && a.kind === b.kind && a.index === b.index) || (!a && !b)
function setHover(info) {
  if (sameInfo(info, hovered)) return
  hovered = info
  canvas.style.cursor = info ? 'pointer' : ''
  if (!info) { tip.classList.remove('on'); return }
  if (info.kind === 'frame') { const p = PROJECTS[info.index]; tip.innerHTML = `<small>View project</small><b>${p.title}</b> — tap to see work` }
  else if (info.kind === 'radio') tip.innerHTML = `<small>On repeat</small><b>Tap the radio</b> to tune in`
  else tip.innerHTML = `<small>Say hello</small><b>Contact me</b>`
  tip.classList.add('on')
}
canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY] })
canvas.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); pointerOnCanvas = true
  const info = pick(); if (!info) return
  if (info.kind === 'frame') openProject(info.index)
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
    const r = await fetch('/api/now-playing', { cache: 'no-store' })
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
let phonePing = 0, radioMix = 0, fit = 1
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
  torso.scale.y = 1 + Math.sin(t * 1.6) * 0.01
  fingers.forEach((f, i) => { f.position.y = 0.034 + Math.max(0, Math.sin(t * 9 + i * 1.9)) * 0.007 })
  // radio: needle sweeps and notes float while tuned in
  radioMix += ((radioOn ? 1 : 0) - radioMix) * 0.08
  needle.position.x = 0.07 + Math.sin(t * 0.8) * 0.02 * radioMix - 0.005 * (1 - radioMix)
  dialKnob.rotation.y = t * 1.2 * radioMix
  notes.forEach((n, i) => { const k = (t * 0.5 + i / notes.length) % 1; n.position.set(-0.1 + i * 0.07 + Math.sin(t * 2 + i) * 0.02, 0.4 + k * 0.35, 0.09); n.visible = radioMix > 0.5; n.scale.setScalar(1 - k * 0.6) })
  // phone: LED blink, tap pulse
  phonePing *= 0.94; phoneLed.visible = Math.sin(t * 4) > -0.2
  phone.position.y = deskY + 0.045 + Math.sin(phonePing * 12) * 0.01 * phonePing
  barFill.style.height = (prog * 100).toFixed(1) + '%'
  tone.uniforms.time.value = t
  composer.render()
})
