import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

/* ---------- palette ---------- */
const C = {
  wall: 0xeee8de, floor: 0xece4d6, red: 0xb1231e, redDark: 0x8e1a17, wood: 0xe2b57d, woodDark: 0xc79a62,
  white: 0xf4f0e8, boucle: 0xf3efe6, skin: 0xd8a27d, hair: 0x3b2318, ink: 0x2a2623, leaf: 0x3f5f3b, leaf2: 0x587a4a,
  cream: 0xe9dfca, frame: 0xf6f3ee, tan: 0xc9a27a, glass: 0xd6e8ea
}

/* ---------- renderer / scene ---------- */
const canvas = document.getElementById('studio')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const scene = new THREE.Scene()
scene.background = new THREE.Color(C.wall)
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60)

// warm sun through the window + soft pinkish fill so shadows stay warm, never black
scene.add(new THREE.HemisphereLight(0xfff4ea, 0xd9b9a6, 2.3))
const sun = new THREE.DirectionalLight(0xfff0d8, 3.4)
sun.position.set(-12, 10, 6)
sun.target.position.set(0, 0.5, -1)
sun.castShadow = true
sun.shadow.mapSize.set(4096, 4096)
Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 40 })
sun.shadow.camera.updateProjectionMatrix()
sun.shadow.bias = -0.0004
sun.shadow.normalBias = 0.02
sun.shadow.radius = 3
scene.add(sun, sun.target)

/* ---------- helpers ---------- */
const mats = new Map()
function mat(hex, extra = {}) {
  const key = hex + JSON.stringify(extra)
  if (!mats.has(key)) mats.set(key, new THREE.MeshLambertMaterial({ color: hex, ...extra }))
  return mats.get(key)
}
function add(geo, hex, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(geo, o.material || mat(hex, o.extra))
  m.position.set(x, y, z)
  if (o.rot) m.rotation.set(...o.rot)
  if (o.scale) m.scale.set(...o.scale)
  m.castShadow = o.cast !== false
  m.receiveShadow = o.receive !== false
  ;(o.parent || scene).add(m)
  return m
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d)
const rbox = (w, h, d, r = 0.05) => new RoundedBoxGeometry(w, h, d, 4, r)
const cyl = (rt, rb, h, s = 20) => new THREE.CylinderGeometry(rt, rb, h, s)
const sph = (r, s = 24) => new THREE.SphereGeometry(r, s, s)

function limb(p1, p2, r1, r2, hex, parent) {
  const A = new THREE.Vector3(...p1), B = new THREE.Vector3(...p2)
  const m = add(cyl(r2, r1, A.distanceTo(B), 16), hex, 0, 0, 0, { parent })
  m.position.copy(A).add(B).multiplyScalar(0.5)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize())
  return m
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

/* ---------- textures ---------- */
const outsideTex = canvasTex(2048, 1024, (g, w, h) => {
  const sky = g.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#b9d4ea'); sky.addColorStop(0.55, '#dbe9ef'); sky.addColorStop(1, '#eef0ea')
  g.fillStyle = sky; g.fillRect(0, 0, w, h)
  g.fillStyle = 'rgba(255,255,255,.85)'
  for (const [x, y, r] of [[380, 190, 70], [450, 170, 90], [540, 200, 60], [1500, 120, 60], [1580, 105, 80], [1660, 130, 55]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill() }
  const bld = (x, y, bw, bh, col) => {
    g.fillStyle = col; g.fillRect(x, y, bw, bh)
    g.fillStyle = 'rgba(70,70,70,.35)'
    for (let yy = y + 30; yy < y + bh - 30; yy += 75) for (let xx = x + 24; xx < x + bw - 30; xx += 62) g.fillRect(xx, yy, 28, 38)
  }
  bld(250, 300, 330, 700, '#d9cdb8'); bld(560, 420, 300, 600, '#e4dac8'); bld(840, 380, 360, 640, '#cfc2ac')
  bld(1250, 340, 300, 700, '#dfd3be'); bld(1520, 430, 380, 600, '#d6c9b3')
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * w, y = 640 + Math.random() * 320, r = 40 + Math.random() * 70
    g.fillStyle = ['#4d6b44', '#5f8052', '#3a5535', '#7a9461'][i % 4]; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill()
  }
})
const screenTex = canvasTex(1024, 640, (g, w, h) => {
  g.fillStyle = '#f7f6f3'; g.fillRect(0, 0, w, h)
  g.fillStyle = '#e3e1dc'; g.fillRect(0, 0, w, 42); g.fillRect(0, 42, 150, h)
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
    const x = 190 + c * 205, y = 90 + r * 250
    g.fillStyle = '#fff'; g.fillRect(x, y, 180, 200); g.strokeStyle = '#bdb9b1'; g.lineWidth = 2; g.strokeRect(x, y, 180, 200)
    g.strokeStyle = '#666'; g.lineWidth = 2; g.beginPath()
    g.moveTo(x + 30, y + 150); g.quadraticCurveTo(x + 90, y + 40, x + 150, y + 140); g.moveTo(x + 50, y + 170); g.lineTo(x + 130, y + 60); g.stroke()
  }
})
const bikeTex = canvasTex(800, 640, (g, w, h) => {
  g.fillStyle = '#f2eee6'; g.fillRect(0, 0, w, h)
  g.strokeStyle = '#4a4742'; g.lineWidth = 6; g.lineCap = 'round'
  for (const cx of [210, 590]) { g.beginPath(); g.arc(cx, 440, 95, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, 440, 55, 0, 7); g.stroke() }
  g.beginPath(); g.moveTo(210, 440); g.lineTo(330, 320); g.lineTo(480, 320); g.lineTo(590, 440); g.moveTo(330, 320); g.lineTo(300, 250); g.lineTo(440, 230); g.lineTo(480, 320)
  g.moveTo(480, 320); g.lineTo(520, 250); g.lineTo(600, 240); g.stroke()
  g.fillStyle = '#c9c5bd'; g.beginPath(); g.ellipse(390, 250, 90, 40, -0.1, 0, 7); g.fill(); g.stroke()
})

/* ---------- room ---------- */
const WZ = 0.2 // window centre z
add(box(14, 0.1, 12), C.floor, 0, -0.05, 0)                              // floor
add(box(14, 6, 0.1), C.wall, 0, 3, -2.65)                                 // back wall
// left wall with a wide window opening: z -2.0..2.4, y 0.9..3.9
add(box(0.14, 6, 0.6), C.wall, -3.2, 3, -2.3)
add(box(0.14, 6, 3.7), C.wall, -3.2, 3, 4.25)
add(box(0.14, 0.9, 4.4), C.wall, -3.2, 0.45, WZ)
add(box(0.14, 2.1, 4.4), C.wall, -3.2, 4.95, WZ)
// white window frame: sill, head, mullions
add(box(0.4, 0.08, 4.5), C.frame, -3.1, 0.92, WZ)
add(box(0.2, 0.1, 4.5), C.frame, -3.15, 3.88, WZ)
for (const z of [-2.0, -0.55, 0.9, 2.4]) add(box(0.2, 3.0, 0.14), C.frame, -3.15, 2.4, z)
add(box(0.2, 0.1, 4.5), C.frame, -3.15, 2.4, WZ)
const outside = new THREE.Mesh(new THREE.PlaneGeometry(13, 6.5), new THREE.MeshBasicMaterial({ map: outsideTex }))
outside.rotation.y = Math.PI / 2; outside.position.set(-7.5, 3.0, WZ); scene.add(outside)

// rugs / floor bands (red)
add(box(2.6, 0.012, 1.7), C.red, 0.9, 0.006, -1.2, { cast: false })
add(box(0.6, 0.012, 7), C.red, -2.5, 0.006, 1.5, { cast: false })
add(box(7, 0.012, 0.18), C.red, 1.0, 0.006, -2.52, { cast: false })

// wall decor
const pin = (x, y, w, h, hex, r = 0) => add(box(w, h, 0.012), hex, x, y, -2.585, { rot: [0, 0, r], cast: false })
pin(0.75, 3.55, 0.55, 0.6, C.red, 0.0); pin(0.95, 2.7, 0.55, 0.75, C.cream, 0.02); pin(1.35, 3.1, 0.6, 0.75, 0xe5dccb, -0.03)
pin(1.6, 2.2, 0.5, 0.6, C.red, 0.0); pin(0.3, 3.0, 0.5, 0.65, 0xf2eee6, 0.02)
for (const [x, y] of [[1.15, 3.35], [1.1, 2.9]]) add(cyl(0.025, 0.025, 0.02, 12), C.tan, x, y, -2.57, { rot: [Math.PI / 2, 0, 0], cast: false })
// framed motorbike
add(box(1.15, 0.95, 0.04), C.woodDark, 2.2, 2.65, -2.575)
add(new THREE.PlaneGeometry(1.0, 0.8), 0, 2.2, 2.65, -2.552, { material: new THREE.MeshLambertMaterial({ map: bikeTex }), cast: false })
// shelf with red books + hanging ivy
add(box(1.4, 0.05, 0.36), C.wood, 3.3, 2.1, -2.42)
;[C.red, C.redDark, C.cream, C.red].forEach((c, i) => add(box(0.1, 0.4 - i * 0.03, 0.26), c, 3.15 + i * 0.11, 2.325 - i * 0.015, -2.42))
add(box(0.16, 0.2, 0.2), C.tan, 3.7, 2.225, -2.42)
add(cyl(0.12, 0.09, 0.2, 18), C.red, 3.85, 2.95, -2.42)
for (let i = 0; i < 22; i++) {
  const y = 2.85 - i * 0.075, x = 3.95 + Math.sin(i * 0.7) * 0.05
  add(sph(0.05, 8), i % 2 ? C.leaf : C.leaf2, x + (i % 2 ? 0.06 : -0.05), y, -2.4, { scale: [1, 0.7, 0.4], rot: [0, 0, i % 2 ? 0.6 : -0.6] })
}

/* ---------- desk (right of her, along the back wall) ---------- */
const deskY = 0.76, DX = 1.3, DZ = -1.95
add(box(3.7, 0.06, 1.2), C.wood, DX, deskY, DZ)
for (const x of [DX - 1.65, DX + 1.65]) for (const sgn of [-1, 1]) {
  add(box(0.07, 0.8, 0.07), C.woodDark, x, 0.38, DZ + sgn * 0.45, { rot: [-sgn * 0.17, 0, 0] })
}
add(box(0.05, 0.05, 1.0), C.woodDark, DX - 1.65, 0.58, DZ); add(box(0.05, 0.05, 1.0), C.woodDark, DX + 1.65, 0.58, DZ)

// iMac
const MX = 0.55, MZ = -2.2
add(cyl(0.16, 0.18, 0.015, 28), 0xd5d6d8, MX, deskY + 0.04, MZ + 0.02)
add(box(0.08, 0.32, 0.03), 0xd5d6d8, MX, deskY + 0.2, MZ - 0.02)
add(rbox(0.98, 0.62, 0.04, 0.012), 0x1c1c1e, MX, deskY + 0.65, MZ - 0.02)
add(new THREE.PlaneGeometry(0.93, 0.5), 0, MX, deskY + 0.71, MZ + 0.002, { material: new THREE.MeshBasicMaterial({ map: screenTex }), cast: false })
add(box(0.98, 0.1, 0.04), 0xdcdde0, MX, deskY + 0.355, MZ - 0.02)
// keyboard + drawing tablet
add(rbox(0.42, 0.014, 0.13, 0.005), 0xeceae6, 0.15, deskY + 0.04, -1.78)
add(rbox(0.36, 0.012, 0.23, 0.01), 0x25282b, 0.93, deskY + 0.04, -1.86)
// desk lamp (tan shade, jointed arm)
const LX = -0.25
add(cyl(0.1, 0.12, 0.025, 20), C.tan, LX, deskY + 0.04, -2.35)
limb([LX, deskY + 0.05, -2.35], [LX + 0.12, deskY + 0.85, -2.3], 0.011, 0.011, C.tan)
limb([LX + 0.12, deskY + 0.85, -2.3], [LX + 0.38, deskY + 1.08, -2.25], 0.011, 0.011, C.tan)
add(new THREE.ConeGeometry(0.1, 0.18, 24, 1, true), C.tan, LX + 0.4, deskY + 1.05, -2.25, { rot: [0, 0, -1.2], extra: { side: THREE.DoubleSide } })
// pencil cup left of monitor
add(cyl(0.065, 0.06, 0.14, 20), C.tan, 0.0, deskY + 0.1, -2.3)
for (let i = 0; i < 5; i++) add(cyl(0.007, 0.007, 0.2), [C.red, C.woodDark, C.ink, C.tan, C.red][i], Math.cos(i) * 0.025, deskY + 0.24, -2.3 + Math.sin(i) * 0.025, { rot: [Math.sin(i) * 0.2, 0, Math.cos(i) * 0.2] })
// white block + red cube
add(rbox(0.3, 0.1, 0.22, 0.02), C.white, 1.2, deskY + 0.08, -2.25); add(rbox(0.13, 0.11, 0.13, 0.015), C.red, 1.17, deskY + 0.19, -2.25)
// glass vase with lilies
const VX = 1.75, VZ = -2.15
add(cyl(0.085, 0.07, 0.24, 24), C.glass, VX, deskY + 0.15, VZ, { extra: { transparent: true, opacity: 0.45 } })
for (let i = 0; i < 5; i++) {
  const a = i * 1.3, tx = VX + Math.cos(a) * 0.17, tz = VZ + Math.sin(a) * 0.06, ty = deskY + 0.55 + (i % 3) * 0.12
  limb([VX, deskY + 0.1, VZ], [tx, ty, tz], 0.007, 0.005, C.leaf)
  if (i % 2 === 0) for (let p = 0; p < 6; p++) add(sph(0.05, 8), 0xfbf8f1, tx, ty, tz, { scale: [0.45, 0.2, 1.2], rot: [0.5, (p / 6) * Math.PI * 2, 0] })
  else add(sph(0.045, 10), 0xf3efdc, tx, ty, tz, { scale: [0.6, 1.5, 0.6] })
  add(sph(0.06, 8), C.leaf, VX + Math.cos(a) * 0.09, deskY + 0.3 + i * 0.03, VZ + Math.sin(a) * 0.04, { scale: [0.2, 1.4, 0.7], rot: [0, 0, Math.cos(a) * 0.9] })
}
// mug, phone, pencil cup, books, red notebook
add(cyl(0.065, 0.06, 0.1, 22), C.white, 2.12, deskY + 0.08, -1.75); add(new THREE.TorusGeometry(0.035, 0.009, 8, 16), C.white, 2.19, deskY + 0.08, -1.75)
add(rbox(0.17, 0.012, 0.1, 0.008), 0xcfd0cf, 1.9, deskY + 0.04, -1.5, { rot: [0, 0.1, 0] })
add(cyl(0.07, 0.065, 0.14, 20), 0xd9a58e, 2.5, deskY + 0.1, -2.25)
for (let i = 0; i < 5; i++) add(cyl(0.007, 0.007, 0.2), [C.red, C.woodDark, 0xe08a3c, C.ink, C.red][i], 2.5 + Math.cos(i) * 0.025, deskY + 0.24, -2.25 + Math.sin(i) * 0.025, { rot: [Math.sin(i) * 0.25, 0, Math.cos(i) * 0.25] })
add(box(0.42, 0.045, 0.3), C.white, 2.6, deskY + 0.05, -1.75, { rot: [0, 0.05, 0] }); add(box(0.4, 0.045, 0.28), C.red, 2.6, deskY + 0.095, -1.75, { rot: [0, -0.04, 0] })
add(box(0.46, 0.035, 0.32), C.red, 2.45, deskY + 0.04, -1.3, { rot: [0, -0.12, 0] })
add(cyl(0.007, 0.007, 0.3), C.ink, 2.45, deskY + 0.075, -1.3, { rot: [0, 0.9, Math.PI / 2] })

/* ---------- armchair + sitter ---------- */
const sitter = new THREE.Group(); scene.add(sitter)
const chair = new THREE.Group(); sitter.add(chair)
add(rbox(0.82, 0.2, 0.74, 0.09), C.boucle, 0, 0.5, 0.97, { parent: chair })                         // seat cushion
add(rbox(0.9, 0.78, 0.24, 0.12), C.boucle, 0, 0.9, 1.32, { parent: chair, rot: [-0.14, 0, 0] })    // rounded back
add(rbox(0.16, 0.42, 0.7, 0.07), C.boucle, -0.43, 0.7, 1.0, { parent: chair })
add(rbox(0.16, 0.42, 0.7, 0.07), C.boucle, 0.43, 0.7, 1.0, { parent: chair })
for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  limb([sx * 0.3, 0.42, 0.97 + sz * 0.26], [sx * 0.42, 0.0, 0.97 + sz * 0.4], 0.035, 0.022, C.woodDark, chair)
}

const girl = new THREE.Group(); sitter.add(girl)
const SW = C.red, PANTS = C.white, SKIN = C.skin
const ell = (g, sx, sy, sz) => { g.scale(sx, sy, sz); return g }
const hip = new THREE.Vector3(0, 0.63, 0.95)
add(ell(sph(0.18, 24), 1.2, 0.85, 1.05), PANTS, hip.x, hip.y, hip.z, { parent: girl })           // pelvis in loose trousers
for (const sx_ of [-0.11, 0.11]) {
  const knee = [sx_ * 1.2, 0.64, 0.45], ankle = [sx_ * 1.25, 0.12, 0.38]
  limb([sx_, hip.y, hip.z], knee, 0.105, 0.085, PANTS, girl)
  add(sph(0.085), PANTS, ...knee, { parent: girl })
  limb(knee, ankle, 0.085, 0.06, PANTS, girl)
  add(ell(sph(0.055, 16), 1, 0.55, 1.9), SKIN, sx_ * 1.25, 0.04, 0.3, { parent: girl })           // bare foot
}
// torso: lathe, sweater
const profile = [[0.001, 0], [0.14, 0.01], [0.15, 0.1], [0.135, 0.22], [0.155, 0.36], [0.185, 0.47], [0.19, 0.56], [0.14, 0.63], [0.06, 0.665], [0.001, 0.68]].map(([r, y]) => new THREE.Vector2(r, y))
const torso = new THREE.Group(); torso.position.set(hip.x, hip.y + 0.03, hip.z - 0.02); torso.rotation.x = -0.3; girl.add(torso)
add(new THREE.LatheGeometry(profile, 32), SW, 0, 0, 0, { parent: torso, scale: [1.2, 1, 0.72] })
add(new THREE.TorusGeometry(0.13, 0.02, 10, 28), C.redDark, 0, 0.0, 0, { parent: torso, rot: [Math.PI / 2, 0, 0], scale: [1.2, 0.72, 1] })     // hem rib
const shL = new THREE.Vector3(-0.22, 0.57, 0), shR = new THREE.Vector3(0.22, 0.57, 0)
add(sph(0.075, 18), SW, ...shL.toArray(), { parent: torso }); add(sph(0.075, 18), SW, ...shR.toArray(), { parent: torso })
// braid hanging down her back
for (let i = 0; i < 11; i++) {
  const y = 0.6 - i * 0.052, r = 0.04 - i * 0.0018, off = (i % 2 ? 1 : -1) * 0.009
  add(sph(r, 12), C.hair, off, y, 0.14 + i * 0.002, { parent: torso, scale: [1.0, 1.25, 0.9], rot: [0, 0, off * 14] })
}
add(cyl(0.02, 0.02, 0.025, 10), C.red, 0, 0.6 - 11 * 0.052, 0.16, { parent: torso })
// neck + head
torso.updateMatrixWorld(true)
const nb = torso.localToWorld(new THREE.Vector3(0, 0.66, 0)), neckTop = nb.clone().add(new THREE.Vector3(0, 0.1, -0.05))
limb(nb.toArray(), neckTop.toArray(), 0.05, 0.044, SKIN, girl)
add(new THREE.TorusGeometry(0.075, 0.025, 10, 24), C.redDark, nb.x, nb.y + 0.012, nb.z, { parent: girl, rot: [Math.PI / 2 - 0.25, 0, 0] })   // crew neck
const head = new THREE.Group(); head.position.copy(neckTop).add(new THREE.Vector3(0, 0.1, -0.015)); head.rotation.x = -0.28; girl.add(head)
add(ell(sph(0.115, 28), 0.9, 1.08, 1.0), SKIN, 0, 0, 0, { parent: head })
add(ell(sph(0.07, 18), 0.9, 0.9, 1.0), SKIN, 0, -0.085, -0.04, { parent: head })
add(ell(sph(0.022, 10), 0.5, 1, 0.8), SKIN, 0.103, -0.015, 0.0, { parent: head })
add(ell(sph(0.016, 10), 1, 0.9, 1.2), SKIN, 0, -0.02, -0.115, { parent: head })
// hair: dark cap covering the back and crown, tucked behind the ear into the braid
add(ell(sph(0.123, 30), 1.0, 1.1, 1.08), C.hair, 0, 0.022, 0.03, { parent: head })
add(ell(sph(0.1, 20), 1.0, 1.3, 0.9), C.hair, 0, -0.07, 0.07, { parent: head })

// arms: loose red sleeves with cuffs, bare hands
const sR = torso.localToWorld(shR.clone()), sL = torso.localToWorld(shL.clone())
const handR = new THREE.Vector3(0.62, deskY + 0.1, 0.12), handL = new THREE.Vector3(-0.1, deskY + 0.1, 0.1)
const elbowR = new THREE.Vector3(0.44, 1.0, 0.7), elbowL = new THREE.Vector3(-0.4, 0.96, 0.6)
function arm(sh, el, hd) {
  limb(sh.toArray(), el.toArray(), 0.07, 0.062, SW, girl)
  add(sph(0.062, 14), SW, ...el.toArray(), { parent: girl })
  limb(el.toArray(), hd.toArray(), 0.062, 0.05, SW, girl)
  const dir = new THREE.Vector3().subVectors(hd, el).normalize()
  const cuff = add(new THREE.TorusGeometry(0.048, 0.017, 8, 16), C.redDark, hd.x - dir.x * 0.03, hd.y - dir.y * 0.03, hd.z - dir.z * 0.03, { parent: girl })
  cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir)
  return add(ell(sph(0.04, 14), 1.0, 0.5, 1.5), SKIN, hd.x, hd.y - 0.01, hd.z - 0.05, { parent: girl })
}
const handMeshR = arm(sR, elbowR, handR)
arm(sL, elbowL, handL)
const pen = add(cyl(0.007, 0.003, 0.16), C.ink, handR.x + 0.01, handR.y + 0.02, handR.z - 0.1, { parent: girl, rot: [Math.PI / 2 - 0.6, 0, 0.1] })

sitter.position.set(0.35, 0, -2.0)

/* ---------- post: sRGB output + paper grain + gentle vignette ---------- */
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new OutputPass())
const grain = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
    float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      c = floor(c * 24.0 + 0.5) / 24.0 * 0.6 + c * 0.4;            // light posterise, painterly banding
      c = mix(vec3(dot(c, vec3(.299,.587,.114))), c, 0.92) * vec3(1.02, 1.0, 0.97); // warm paper tint
      float n = hash(gl_FragCoord.xy + fract(time * 0.5) * 31.0);
      c += (n - 0.5) * 0.05;
      vec2 q = vUv - 0.5; c *= 1.0 - dot(q, q) * 0.35;
      gl_FragColor = vec4(c, 1.0);
    }`
})
composer.addPass(grain)

/* ---------- scroll story ---------- */
const V = (x, y, z) => new THREE.Vector3(x, y, z)
const stages = [
  { pos: V(1.9, 1.7, 2.3),  look: V(0.2, 1.15, -1.6) },   // intro: over her shoulder, whole desk and window
  { pos: V(1.0, 1.55, 0.35), look: V(0.55, 1.15, -2.0) },  // 1 the screen and the tablet
  { pos: V(1.3, 3.0, -0.8),  look: V(1.3, 0.8, -2.0) },    // 2 top-down on the desk
  { pos: V(-2.2, 1.5, 0.9),  look: V(0.3, 1.1, -1.3) },    // 3 from the window side
  { pos: V(1.1, 1.8, 0.0),   look: V(0.35, 1.35, -1.3) },  // 4 close on her and the braid
  { pos: V(3.6, 2.7, 3.2),   look: V(0.7, 1.0, -1.5) }     // 5 pull back
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
addEventListener('pointermove', e => mouse.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5))

function resize() {
  const w = innerWidth, h = innerHeight
  renderer.setSize(w, h, false); composer.setSize(w, h)
  camera.aspect = w / h
  camera.fov = w / h < 1 ? 62 : 44
  camera.updateProjectionMatrix()
}
addEventListener('resize', resize); resize()

function stageT(p) {
  const f = p * N, i = Math.min(Math.floor(f), N - 1), local = f - i
  return (i + smoothstep(THREE.MathUtils.clamp((local - 0.25) / 0.5, 0, 1))) / N
}
const look = new THREE.Vector3(), clock = new THREE.Clock()
let activePanel = -1
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime()
  prog += (progT - prog) * 0.07
  smooth.lerp(mouse, 0.05)
  const u = stageT(prog)
  camPos.getPoint(u, camera.position); camLook.getPoint(u, look)
  camera.position.x += smooth.x * 0.3; camera.position.y += -smooth.y * 0.15
  camera.lookAt(look)
  const idx = Math.round(prog * N)
  if (idx !== activePanel) { activePanel = idx; panels.forEach((el, i) => el.classList.toggle('on', i === idx)) }
  barFill.style.height = (prog * 100).toFixed(1) + '%'
  // life: breathing, head tilt, pen strokes on the tablet
  torso.scale.y = 1 + Math.sin(t * 1.6) * 0.01
  head.rotation.x = -0.28 + Math.sin(t * 0.9) * 0.02
  const sway = Math.sin(t * 2.2) * 0.03, sway2 = Math.cos(t * 1.7) * 0.02
  pen.position.set(handR.x + 0.01 + sway, handR.y + 0.02, handR.z - 0.1 + sway2); handMeshR.position.set(handR.x + sway, handR.y - 0.01, handR.z - 0.05 + sway2)
  grain.uniforms.time.value = t
  composer.render()
})
