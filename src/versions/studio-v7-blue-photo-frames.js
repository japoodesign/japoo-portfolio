import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'

/* ---------- renderer / scene ---------- */
const canvas = document.getElementById('studio')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xffffff)

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60)
const target = new THREE.Vector3(0.45, 0.95, 0.0)

/* ---------- lights: the post pass turns lit => cream, shade => blue ---------- */
scene.add(new THREE.AmbientLight(0xffffff, 0.14))
const sun = new THREE.DirectionalLight(0xffffff, 6)
sun.position.set(-12, 7.2, 10)
sun.target.position.set(0, 0.5, 0)
sun.castShadow = true
sun.shadow.mapSize.set(4096, 4096)
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
  if (opts.edges !== false && !(geo instanceof THREE.PlaneGeometry)) {
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 35), edgeMat))
  }
  return m
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d)
const cyl = (rt, rb, h, s = 20) => new THREE.CylinderGeometry(rt, rb, h, s)
const sph = (r, s = 24) => new THREE.SphereGeometry(r, s, s)

// cylinder stretched between two points (limbs, lamp arms)
function limb(p1, p2, r1, r2 = r1, a = 1, parent) {
  const A = new THREE.Vector3(...p1), B = new THREE.Vector3(...p2)
  const len = A.distanceTo(B)
  const m = add(cyl(r2, r1, len, 14), a, 0, 0, 0, { parent })
  m.position.copy(A).add(B).multiplyScalar(0.5)
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
// distant dusky pane — saturated marker colour, swapped for slate in the post pass
const pane = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 4.0),
  new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0, 0) }))
pane.rotation.y = Math.PI / 2
pane.position.set(wx - 1.2, 3.0, z0)
scene.add(pane)

// framed art on the back wall (blue-print style, matching the reference frames)
const INK = '#16286e', NAVY = '#1736a8', PAPER = '#efe7d4'
function artTex(draw) {
  const W = 1300, H = 1050
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')
  g.fillStyle = PAPER; g.fillRect(0, 0, W, H)                                  // wide cream mat
  g.strokeStyle = '#3a4a9a'; g.lineWidth = 3; g.strokeRect(95, 85, W - 190, H - 170)   // thin inner mat line
  g.lineCap = 'round'; g.lineJoin = 'round'
  draw(g, W, H)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
const bikeArt = artTex((g) => {
  g.translate(710, 520); g.scale(1.28, 1.28); g.translate(-710, -520)
  g.fillStyle = NAVY; g.fillRect(430, 250, 560, 330)                           // navy block behind the bike
  g.strokeStyle = '#efe7d4'; g.lineWidth = 2
  for (let k = 0; k < 14; k++) { g.beginPath(); g.moveTo(450 + k * 38, 262); g.lineTo(520 + k * 38, 300); g.stroke() }   // rain streaks
  g.strokeStyle = INK; g.fillStyle = PAPER; g.lineWidth = 6
  const wheel = (cx, cy, r) => {
    g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r * 0.78, 0, 7); g.stroke()
    for (let k = 0; k < 18; k++) { const a = k * Math.PI / 9; g.beginPath(); g.moveTo(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18); g.lineTo(cx + Math.cos(a) * r * 0.76, cy + Math.sin(a) * r * 0.76); g.stroke() }
    g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, 20, 0, 7); g.fill(); g.stroke()
    g.lineWidth = 2; for (let k = 0; k < 40; k++) { const a = k * Math.PI / 20; g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.stroke() }
  }
  wheel(470, 700, 150); wheel(950, 690, 135)
  g.lineWidth = 6; g.beginPath(); g.moveTo(950, 690); g.lineTo(880, 450); g.moveTo(920, 700); g.lineTo(850, 440); g.stroke()                      // fork
  g.beginPath(); g.moveTo(870, 440); g.lineTo(930, 380); g.lineTo(1010, 400); g.stroke(); g.beginPath(); g.moveTo(930, 380); g.lineTo(980, 330); g.stroke() // bars
  g.beginPath(); g.moveTo(880, 440); g.quadraticCurveTo(840, 390, 760, 395); g.quadraticCurveTo(650, 340, 580, 410); g.lineTo(600, 470); g.lineTo(840, 480); g.closePath(); g.fill(); g.stroke()   // tank
  g.lineWidth = 2; for (let k = 0; k < 9; k++) { g.beginPath(); g.moveTo(610 + k * 24, 405 + (k % 2) * 4); g.lineTo(640 + k * 22, 470); g.stroke() }
  g.lineWidth = 6; g.beginPath(); g.moveTo(590, 420); g.quadraticCurveTo(480, 400, 380, 450); g.lineTo(400, 500); g.lineTo(600, 490); g.closePath(); g.fill(); g.stroke() // seat
  g.beginPath(); g.rect(640, 480, 230, 170); g.fill(); g.stroke(); g.lineWidth = 3
  for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(650, 498 + k * 19); g.lineTo(860, 498 + k * 19); g.stroke() }
  g.beginPath(); g.arc(700, 640, 35, 0, 7); g.stroke(); g.lineWidth = 6
  g.beginPath(); g.moveTo(470, 700); g.lineTo(560, 520); g.lineTo(650, 560); g.stroke()                                                       // frame / swingarm
  g.beginPath(); g.moveTo(560, 640); g.quadraticCurveTo(700, 690, 860, 620); g.lineTo(870, 590); g.stroke()                                        // exhaust
  g.beginPath(); g.arc(940, 400, 30, 0, 7); g.fill(); g.stroke()                                                                                // headlamp
  g.fillStyle = INK; g.beginPath(); g.ellipse(880, 780, 160, 14, 0, 0, 7); g.fill()                                                              // ground shadow
})
const motherArt = artTex((g) => {
  g.fillStyle = NAVY; g.fillRect(150, 140, 1000, 770)
  g.fillStyle = PAPER                                                                                                                         // scalloped cream window
  g.fillRect(200, 190, 900, 670)
  for (let x = 200; x <= 1100; x += 56) { g.beginPath(); g.arc(x, 190, 28, 0, 7); g.fill(); g.beginPath(); g.arc(x, 860, 28, 0, 7); g.fill() }
  for (let y = 190; y <= 860; y += 56) { g.beginPath(); g.arc(200, y, 28, 0, 7); g.fill(); g.beginPath(); g.arc(1100, y, 28, 0, 7); g.fill() }
  g.strokeStyle = INK; g.fillStyle = PAPER; g.lineWidth = 7
  g.beginPath(); g.arc(560, 330, 62, 0, 7); g.fill(); g.stroke()                                                                                // head
  g.fillStyle = INK; g.beginPath(); g.arc(520, 255, 38, 0, 7); g.fill(); g.beginPath(); g.moveTo(500, 300); g.quadraticCurveTo(480, 350, 520, 400); g.lineTo(540, 330); g.closePath(); g.fill()  // bun + hair
  g.fillStyle = PAPER; g.lineWidth = 7
  g.beginPath(); g.moveTo(545, 390); g.lineTo(540, 440); g.stroke(); g.beginPath(); g.moveTo(590, 385); g.lineTo(600, 440); g.stroke()               // neck
  g.beginPath(); g.moveTo(540, 440); g.quadraticCurveTo(470, 470, 460, 560); g.quadraticCurveTo(450, 650, 500, 700); g.stroke()                    // back
  g.beginPath(); g.moveTo(600, 440); g.quadraticCurveTo(700, 460, 740, 520); g.stroke()                                                          // chest
  g.fillStyle = NAVY; g.beginPath(); g.arc(760, 600, 130, 0, 7); g.fill(); g.stroke()                                                            // belly with night sky
  g.fillStyle = PAPER; g.beginPath(); g.arc(740, 570, 34, 0, 7); g.fill(); g.fillStyle = NAVY; g.beginPath(); g.arc(754, 560, 30, 0, 7); g.fill()  // crescent
  g.fillStyle = PAPER; for (const [x, y, r] of [[800, 650, 7], [700, 640, 5], [830, 590, 5], [770, 700, 6], [690, 700, 4]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill() }
  g.fillStyle = PAPER; g.lineWidth = 7
  g.beginPath(); g.moveTo(600, 450); g.quadraticCurveTo(650, 560, 780, 700); g.stroke(); g.beginPath(); g.ellipse(790, 712, 40, 20, 0.7, 0, 7); g.fill(); g.stroke()   // arm + hand
  g.beginPath(); g.moveTo(500, 700); g.quadraticCurveTo(470, 800, 480, 860); g.moveTo(760, 725); g.quadraticCurveTo(800, 800, 820, 860); g.stroke()      // dress
  g.lineWidth = 3; for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(520 + k * 36, 735); g.quadraticCurveTo(540 + k * 36, 800, 520 + k * 38, 855); g.stroke() }
  g.fillStyle = INK; g.lineWidth = 4                                                                                                             // hummingbirds
  for (const [bx, by, d] of [[330, 340, 1], [980, 700, -1]]) {
    g.beginPath(); g.ellipse(bx, by, 36, 18, -0.4 * d, 0, 7); g.fill(); g.beginPath(); g.moveTo(bx + 30 * d, by - 8); g.lineTo(bx + 90 * d, by - 22); g.stroke()
    g.beginPath(); g.moveTo(bx, by - 10); g.quadraticCurveTo(bx - 30 * d, by - 70, bx - 60 * d, by - 50); g.stroke()
  }
  g.strokeStyle = INK; g.lineWidth = 4; for (const [lx, ly] of [[300, 700], [1000, 300]]) { g.beginPath(); g.moveTo(lx, ly); g.quadraticCurveTo(lx + 20, ly - 60, lx + 70, ly - 90); g.stroke(); g.beginPath(); g.ellipse(lx + 70, ly - 90, 30, 14, -0.6, 0, 7); g.fill() }
})
// your own artwork, pasted as-is: each image already contains its frame, so it is cropped to the frame edge and hung flat
const texLoader = new THREE.TextureLoader()
function hangImage(url, crop, x, y, w) {
  const [cx, cy, cw, ch] = crop, IW = 1536, IH = 1024
  const tex = texLoader.load(url)
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8
  tex.repeat.set(cw / IW, ch / IH); tex.offset.set(cx / IW, 1 - (cy + ch) / IH)
  const h = w * ch / cw
  add(box(w, h, 0.05), 0.08, x, y, -2.575, { edges: false })                                                  // body: casts the wall shadow
  add(new THREE.PlaneGeometry(w, h), 1, x, y, -2.548, { material: new THREE.MeshLambertMaterial({ map: tex }), cast: false })
}
hangImage('/art/bike-frame.webp', [150, 68, 1238, 888], -0.9, 2.3, 1.45)
hangImage('/art/woman-frame.webp', [157, 72, 1226, 880], 0.75, 2.3, 1.45)
// pinned papers beside the frames
function pinned(x, y, w, h, tone, r) {
  add(box(w, h, 0.012), tone, x, y, -2.585, { rot: [0, 0, r] })
  add(cyl(0.022, 0.022, 0.014, 14), 0.1, x + w * 0.2, y + h * 0.38, -2.576, { rot: [Math.PI / 2, 0, 0], edges: false })
}
pinned(-2.15, 2.75, 0.5, 0.7, 0.2, 0.0)
pinned(-1.95, 2.55, 0.5, 0.7, 1, -0.02)
pinned(-2.4, 2.1, 0.45, 0.55, 1, 0.03)
add(box(0.05, 0.1, 0.014), 0.12, -2.4, 2.38, -2.57, { rot: [0, 0, 0.1], edges: false })   // tape
// speaker + books ledge beside the frames
add(box(1.0, 0.04, 0.3), 1, 1.95, 1.45, -2.47)
add(box(0.22, 0.22, 0.2), 0.9, 1.7, 1.58, -2.47)
add(cyl(0.065, 0.065, 0.03, 22), 0.3, 1.7, 1.58, -2.355, { rot: [Math.PI / 2, 0, 0], edges: false })
for (let i = 0; i < 3; i++) add(box(0.07, 0.3 - i * 0.02, 0.2), [0.2, 0.9, 0.3][i], 2.05 + i * 0.08, 1.62 - i * 0.01, -2.47)

const deskY = 0.75
add(box(3.6, 0.07, 1.5), 1, 0.3, deskY, -0.1)
for (const [x, z] of [[-1.4, -0.7], [2.0, -0.7], [-1.4, 0.5], [2.0, 0.5]]) add(box(0.07, deskY, 0.07), 1, x, deskY / 2, z)
add(box(3.4, 0.05, 0.05), 1, 0.3, 0.55, -0.72)               // back rail

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
add(box(0.55, 0.012, 0.36), 0.95, 1.12, deskY + 0.042, -0.2, { rot: [0, 0.12, 0] }) // loose sheet

/* ---------- desk props ---------- */
// pen cup
add(cyl(0.075, 0.07, 0.17), 0.3, -0.6, deskY + 0.12, -0.55)
for (let i = 0; i < 6; i++) {
  const a = i * 1.1
  add(cyl(0.007, 0.007, 0.22), 0.3, -0.6 + Math.cos(a) * 0.03, deskY + 0.3, -0.55 + Math.sin(a) * 0.03,
    { rot: [Math.sin(a) * 0.25, 0, Math.cos(a) * 0.25] })
}
// scissors
add(box(0.012, 0.16, 0.012), 0.8, -0.65, deskY + 0.34, -0.55, { rot: [0, 0, 0.35] })
add(box(0.012, 0.16, 0.012), 0.8, -0.59, deskY + 0.34, -0.55, { rot: [0, 0, -0.1] })
add(new THREE.TorusGeometry(0.03, 0.007, 8, 18), 0.8, -0.69, deskY + 0.42, -0.55, { rot: [0, Math.PI / 2, 0] })
// laptop, angled toward her and the viewer so the screen shows
const laptop = new THREE.Group(); laptop.position.set(0.5, deskY + 0.04, -0.05); laptop.rotation.y = -0.45; scene.add(laptop)
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
// desk lamp
add(cyl(0.12, 0.14, 0.03), 0.3, 1.3, deskY + 0.05, -0.5)
limb([1.3, deskY + 0.06, -0.5], [1.05, deskY + 0.75, -0.55], 0.012, 0.012, 0.3)
limb([1.05, deskY + 0.75, -0.55], [0.55, deskY + 0.62, -0.35], 0.012, 0.012, 0.3)
add(new THREE.ConeGeometry(0.1, 0.18, 20), 0.3, 0.5, deskY + 0.55, -0.32, { rot: [0.4, 0, 1.9] })
// book stack (right)
add(box(0.62, 0.07, 0.46), 0.28, 1.65, deskY + 0.075, 0.1, { rot: [0, 0.1, 0] })
add(box(0.6, 0.07, 0.44), 0.35, 1.66, deskY + 0.145, 0.1, { rot: [0, -0.05, 0] })
add(box(0.56, 0.06, 0.4), 0.28, 1.65, deskY + 0.21, 0.1, { rot: [0, 0.2, 0] })
// spiral notebook
add(box(0.55, 0.025, 0.42), 0.32, 1.45, deskY + 0.05, 0.42, { rot: [0, -0.25, 0] })
// book steps (left)
add(box(0.55, 0.07, 0.4), 0.3, -1.0, deskY + 0.07, 0.0, { rot: [0, 0.1, 0] })
add(box(0.5, 0.07, 0.38), 0.3, -1.02, deskY + 0.14, 0.0, { rot: [0, 0.05, 0] })
add(box(0.45, 0.07, 0.34), 0.35, -1.04, deskY + 0.21, 0.0, { rot: [0, 0.0, 0] })
// vase of lilies
const VX = 1.78, VZ = -0.42, VY = deskY + 0.04
const Sc = (m, x, y, z) => (m.scale.set(x, y, z), m)
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
// pencil on desk
add(cyl(0.008, 0.008, 0.45), 0.3, 1.0, deskY + 0.045, 0.5, { rot: [0, 0.4, Math.PI / 2] })

/* ---------- shelf unit (back-right corner) ---------- */
const sx = 2.9, sz = -2.15
add(box(0.9, 2.2, 0.55), 0.3, sx, 1.1, sz)
add(box(0.95, 0.05, 0.6), 0.3, sx, 2.22, sz)
add(box(0.55, 0.55, 0.45), 0.3, sx - 0.1, 2.52, sz)
add(cyl(0.17, 0.17, 0.1, 24), 0.3, sx - 0.1, 2.52, sz + 0.25, { rot: [Math.PI / 2, 0, 0] })
add(box(0.45, 0.4, 0.4), 0.3, sx - 0.08, 2.97, sz)
// supply tray on the desk edge near shelf
add(box(0.7, 0.07, 0.5), 0.3, 2.05, 0.95, -0.75)
add(box(0.6, 0.05, 0.4), 0.3, 2.05, 1.05, -0.75)

/* ---------- chair ---------- */
const chair = new THREE.Group(); scene.add(chair)
add(box(0.6, 0.07, 0.55), 1, 0, 0.5, 0.95, { parent: chair })
add(box(0.5, 0.3, 0.05), 1, -0.02, 0.78, 1.28, { parent: chair, rot: [-0.12, 0, 0] })
limb([-0.26, 0.5, 1.2], [-0.26, 0.5, 1.2], 0.02, 0.02, 0.3, chair)
add(cyl(0.035, 0.035, 0.45), 0.3, 0, 0.26, 0.95, { parent: chair })
for (let i = 0; i < 5; i++) {
  const a = (i / 5) * Math.PI * 2
  limb([0, 0.07, 0.95], [Math.cos(a) * 0.38, 0.05, 0.95 + Math.sin(a) * 0.38], 0.022, 0.022, 0.3, chair)
}

/* ---------- the girl ---------- */
const girl = new THREE.Group(); scene.add(girl)
const SKIN = 0.85, TOP = 0.24, SKIRT = 0.22, HAIR = 0.06, SHOE = 0.12
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
limb(nb.toArray(), neckTop.toArray(), 0.042, 0.036, SKIN, girl)
const head = new THREE.Group(); head.position.copy(neckTop).add(new THREE.Vector3(0, 0.1, -0.015)); head.rotation.x = -0.38; girl.add(head)
add(ell(sph(0.105, 28), 0.9, 1.08, 1.0), SKIN, 0, 0, 0, { parent: head, edges: false })     // skull
add(ell(sph(0.066, 18), 0.88, 0.95, 1.0), SKIN, 0, -0.085, -0.035, { parent: head, edges: false })   // soft chin
add(ell(sph(0.018, 10), 0.5, 1, 0.8), SKIN, 0.094, -0.012, 0.0, { parent: head })
add(new THREE.TorusGeometry(0.009, 0.0025, 6, 12), 0.3, 0.1, -0.04, 0.0, { parent: head, rot: [0, 1.57, 0], edges: false })   // earring
add(ell(sph(0.013, 10), 1, 0.9, 1.2), SKIN, 0, -0.02, -0.105, { parent: head })
// hair: smooth cap pulled back into a high bun
add(ell(sph(0.118, 30), 1.0, 1.1, 1.08), HAIR, 0, 0.024, 0.03, { parent: head, edges: false })
for (const sx_ of [-1, 1]) Sc(add(sph(0.045, 12), HAIR, sx_ * 0.09, -0.02, -0.03, { parent: head, edges: false }), 0.5, 1.4, 0.9)
// highlight strands sweeping from the hairline up to the bun
for (let i = 0; i < 13; i++) {
  const f = (i / 12 - 0.5) * 2.0
  const pts = [[Math.sin(f) * 0.118, -0.03, 0.035 + Math.cos(f) * 0.125], [Math.sin(f) * 0.095, 0.07, 0.035 + Math.cos(f) * 0.108], [Math.sin(f) * 0.05, 0.14, 0.1], [Math.sin(f) * 0.018, 0.175, 0.11]]
  for (let j = 0; j < 3; j++) limb(pts[j], pts[j + 1], 0.0042, 0.0035, 1, head)
}
const bun = Sc(add(sph(0.088, 24), HAIR, 0, 0.215, 0.1, { parent: head, edges: false }), 1.05, 0.95, 1)
for (const [r, y, k] of [[0.083, 0.2, 0.0], [0.086, 0.222, 0.0], [0.066, 0.248, 0.0]])
  add(new THREE.TorusGeometry(r, 0.004, 6, 28), 1, 0, y, 0.1, { parent: head, rot: [Math.PI / 2 + k, 0, 0], edges: false })   // wrapped-hair highlight bands
add(new THREE.TorusGeometry(0.075, 0.012, 8, 22), 1, 0, 0.165, 0.1, { parent: head, rot: [Math.PI / 2, 0, 0] })              // hair tie
for (const sx_ of [-1, 1]) add(sph(0.012, 8), 1, sx_ * 0.075, 0.165, 0.1, { parent: head, edges: false })

// slim arms with short sleeves, bracelet, delicate hands
const sR = torso.localToWorld(shoulderR.clone()), sL = torso.localToWorld(shoulderL.clone())
const handR = new THREE.Vector3(0.5, deskY + 0.085, 0.18), handL = new THREE.Vector3(0.16, deskY + 0.085, 0.2)
const elbowR = new THREE.Vector3(0.38, 0.97, 0.66), elbowL = new THREE.Vector3(-0.36, 0.97, 0.62)
function arm(sh, el, hd) {
  const mid = sh.clone().lerp(el, 0.4)
  limb(sh.toArray(), mid.toArray(), 0.05, 0.047, TOP, girl)                              // sleeve
  add(new THREE.TorusGeometry(0.047, 0.01, 8, 16), 1, mid.x, mid.y, mid.z, { parent: girl, edges: false }).quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), el.clone().sub(sh).normalize())
  limb(mid.toArray(), el.toArray(), 0.034, 0.03, SKIN, girl)
  add(sph(0.03, 14), SKIN, ...el.toArray(), { parent: girl })
  limb(el.toArray(), hd.toArray(), 0.03, 0.021, SKIN, girl)
  const dir = new THREE.Vector3().subVectors(hd, el).normalize()
  const br = add(new THREE.TorusGeometry(0.025, 0.006, 8, 16), 0.3, hd.x - dir.x * 0.035, hd.y - dir.y * 0.035, hd.z - dir.z * 0.035, { parent: girl, edges: false })
  br.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir)
  return Sc(add(sph(0.034, 14), SKIN, hd.x, hd.y, hd.z - 0.02, { parent: girl }), 1.0, 0.5, 1.5)
}
const handMeshR = arm(sR, elbowR, handR)
arm(sL, elbowL, handL)
for (let i = 0; i < 4; i++) add(cyl(0.0055, 0.005, 0.05), SKIN, handR.x + (i - 1.5) * 0.013, handR.y, handR.z - 0.07, { parent: girl, rot: [Math.PI / 2 + 0.2, 0, 0], edges: false })
const pen = add(cyl(0.007, 0.003, 0.17), 0.3, handR.x + 0.01, handR.y + 0.025, handR.z - 0.1, { parent: girl, rot: [Math.PI / 2 - 0.55, 0, 0.1] })

/* ---------- post: lighting -> two-tone + slate + grain ---------- */
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const tone = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, res: { value: new THREE.Vector2(1, 1) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float time; uniform vec2 res; varying vec2 vUv;
    float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    void main(){
      float l = dot(texture2D(tDiffuse, vUv).rgb, vec3(0.299, 0.587, 0.114));
      vec3 blue  = vec3(0.039, 0.271, 0.769);   // #0a45c4
      vec3 deep  = vec3(0.016, 0.200, 0.600);
      vec3 cream = vec3(0.855, 0.816, 0.745);   // #dad0be
      vec3 slate = vec3(0.330, 0.340, 0.520);
      vec3 col = mix(deep, blue, smoothstep(0.02, 0.10, l));
      col = mix(col, cream, smoothstep(0.30, 0.34, l));
      // narrow band reserved for the dusky window pane
      vec3 src = texture2D(tDiffuse, vUv).rgb;
      float isPane = step(0.5, src.r - src.g);   // pane is the only saturated surface
      col = mix(col, slate, isPane);
      float n = hash(gl_FragCoord.xy + fract(time) * 57.0);
      col += (n - 0.5) * 0.11;
      gl_FragColor = vec4(col, 1.0);
    }`
})
composer.addPass(tone)

/* ---------- scroll story: camera keyframes per stage ---------- */
const V = (x, y, z) => new THREE.Vector3(x, y, z)
const stages = [
  { pos: V(1.7, 1.9, 3.3),  look: V(0.6, 1.0, 0.0) },   // intro: whole studio
  { pos: V(1.5, 1.9, 2.6),  look: V(0.2, 0.95, 0.35) },   // 1 over-the-shoulder, the sketch
  { pos: V(0.9, 3.0, 1.1), look: V(0.85, 0.75, -0.15) },  // 2 plan view from above
  { pos: V(0.4, 2.1, 1.7), look: V(-0.1, 2.2, -2.5) },    // 3 wall close-up: the framed sketches
  { pos: V(0.7, 1.85, 2.0), look: V(0.0, 1.35, 0.7) },   // 4 close on the figure
  { pos: V(3.8, 3.2, 5.2),  look: V(0.2, 1.0, 0.0) }      // 5 pull back
]
const camPos = new THREE.CatmullRomCurve3(stages.map(s => s.pos), false, 'centripetal')
const camLook = new THREE.CatmullRomCurve3(stages.map(s => s.look), false, 'centripetal')
const smoothstep = t => t * t * (3 - 2 * t)
const N = stages.length - 1

const barFill = document.getElementById('barfill')
const panels = [...document.querySelectorAll('.panel')]
let prog = 0, progT = 0
const readScroll = () => {
  const max = document.documentElement.scrollHeight - innerHeight
  progT = max > 0 ? THREE.MathUtils.clamp(scrollY / max, 0, 1) : 0
}
addEventListener('scroll', readScroll, { passive: true }); readScroll()

const mouse = new THREE.Vector2(), smooth = new THREE.Vector2()
addEventListener('pointermove', e => { mouse.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5) })

function resize() {
  const w = innerWidth, h = innerHeight
  renderer.setSize(w, h, false); composer.setSize(w, h)
  camera.aspect = w / h
  camera.fov = w / h < 1 ? 56 : 38
  camera.updateProjectionMatrix()
}
addEventListener('resize', resize); resize()

// per-stage easing: hold near each keyframe, travel smoothly in between
function stageT(p) {
  const f = p * N, i = Math.min(Math.floor(f), N - 1), local = f - i
  return (i + smoothstep(THREE.MathUtils.clamp((local - 0.25) / 0.5, 0, 1))) / N
}
const tmp = new THREE.Vector3(), look = new THREE.Vector3()
const clock = new THREE.Clock()
let activePanel = -1
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime()
  prog += (progT - prog) * 0.07
  smooth.lerp(mouse, 0.05)
  const u = stageT(prog)
  camPos.getPoint(u, camera.position)
  camLook.getPoint(u, look)
  camera.position.x += smooth.x * 0.35
  camera.position.y += -smooth.y * 0.2
  camera.lookAt(look)

  // text panels follow the stage
  const idx = Math.round(prog * N)
  if (idx !== activePanel) { activePanel = idx; panels.forEach((el, i) => el.classList.toggle('on', i === idx)) }

  // life: breathing, head tilt, the drawing hand/pen moving
  torso.scale.y = 1 + Math.sin(t * 1.6) * 0.01
  head.rotation.x = -0.38 + Math.sin(t * 0.9) * 0.02
  const sway = Math.sin(t * 2.2) * 0.03
  pen.position.x = handR.x + 0.01 + sway; handMeshR.position.x = handR.x + sway
  bun.rotation.z = Math.sin(t * 1.1) * 0.03
  barFill.style.height = (prog * 100).toFixed(1) + '%'
  tone.uniforms.time.value = t
  composer.render()
})
