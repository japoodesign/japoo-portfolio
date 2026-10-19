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
sun.position.set(-12, 10, 10)
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

// posters
const poster = (x, y, w, h, r) => add(box(w, h, 0.02), 1.0, x, y, -2.53, { rot: [0, 0, r], cast: false })
poster(-0.9, 3.3, 0.95, 1.3, 0.02)
poster(0.45, 3.2, 1.0, 1.35, -0.045)
poster(2.0, 3.0, 1.15, 1.6, 0.0)

/* ---------- desk ---------- */
const deskY = 0.75
add(box(3.6, 0.07, 1.5), 1, 0.3, deskY, -0.1)
for (const [x, z] of [[-1.4, -0.7], [2.0, -0.7], [-1.4, 0.5], [2.0, 0.5]]) add(box(0.07, deskY, 0.07), 1, x, deskY / 2, z)
add(box(3.4, 0.05, 0.05), 1, 0.3, 0.55, -0.72)               // back rail

/* ---------- floor-plan paper ---------- */
function planTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 640
  const g = c.getContext('2d')
  g.fillStyle = '#fff'; g.fillRect(0, 0, 1024, 640)
  g.strokeStyle = '#222'; g.lineWidth = 3
  g.strokeRect(70, 70, 460, 260); g.strokeRect(70, 330, 700, 220)
  g.lineWidth = 2
  for (let x = 70; x <= 530; x += 46) { g.beginPath(); g.moveTo(x, 70); g.lineTo(x, 330); g.stroke() }
  g.beginPath(); g.moveTo(530, 200); g.lineTo(820, 200); g.lineTo(820, 330); g.stroke()
  for (let i = 0; i < 18; i++) { g.strokeRect(90 + i * 38, 360 + (i % 3) * 40, 28, 26) }
  g.beginPath(); g.arc(640, 140, 70, 0, Math.PI * 1.5); g.stroke()
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}
const paper = add(new THREE.PlaneGeometry(1.15, 0.72), 1, 0.5, deskY + 0.039, -0.05,
  { rot: [-Math.PI / 2, 0, 0.1], cast: false, material: new THREE.MeshLambertMaterial({ map: planTexture() }) })
add(box(0.55, 0.012, 0.36), 0.95, 1.12, deskY + 0.042, -0.2, { rot: [0, 0.12, 0] }) // loose sheet

/* ---------- desk props ---------- */
// pen cup
add(cyl(0.075, 0.07, 0.17), 0.3, -0.05, deskY + 0.12, -0.5)
for (let i = 0; i < 6; i++) {
  const a = i * 1.1
  add(cyl(0.007, 0.007, 0.22), 0.3, -0.05 + Math.cos(a) * 0.03, deskY + 0.3, -0.5 + Math.sin(a) * 0.03,
    { rot: [Math.sin(a) * 0.25, 0, Math.cos(a) * 0.25] })
}
// scissors
add(box(0.012, 0.16, 0.012), 0.8, -0.1, deskY + 0.34, -0.5, { rot: [0, 0, 0.35] })
add(box(0.012, 0.16, 0.012), 0.8, -0.04, deskY + 0.34, -0.5, { rot: [0, 0, -0.1] })
add(new THREE.TorusGeometry(0.03, 0.007, 8, 18), 0.8, -0.14, deskY + 0.42, -0.5, { rot: [0, Math.PI / 2, 0] })
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
const SKIN = 0.7, TOP = 0.58, PANTS = 0.42, SHOE = 0.3
const ell = (g, sx, sy, sz) => { g.scale(sx, sy, sz); return g }
const hip = new THREE.Vector3(0, 0.62, 0.95)

// pelvis
add(ell(sph(0.17, 24), 1.15, 0.8, 1.0), PANTS, hip.x, hip.y, hip.z, { parent: girl })
// legs: thigh -> knee -> shin -> shoe, both sides
for (const sx_ of [-0.105, 0.105]) {
  const knee = [sx_ * 1.15, 0.6, 0.42], ankle = [sx_ * 1.15, 0.1, 0.4]
  limb([sx_, hip.y, hip.z], knee, 0.095, 0.072, PANTS, girl)
  add(sph(0.072), PANTS, ...knee, { parent: girl })
  limb(knee, ankle, 0.07, 0.045, PANTS, girl)
  add(ell(sph(0.06, 16), 1, 0.7, 1.9), SHOE, sx_ * 1.15, 0.05, 0.3, { parent: girl })
}

// torso: lathe profile (waist -> ribs -> shoulders), flattened front-to-back, leaning to the desk
const profile = [[0.001, 0], [0.13, 0.01], [0.14, 0.1], [0.125, 0.22], [0.145, 0.36], [0.175, 0.47], [0.17, 0.56], [0.12, 0.63], [0.05, 0.665], [0.001, 0.68]]
  .map(([r, y]) => new THREE.Vector2(r, y))
const torsoGeo = new THREE.LatheGeometry(profile, 28)
const torso = new THREE.Group(); torso.position.copy(hip).add(new THREE.Vector3(0, 0.03, -0.02)); torso.rotation.x = -0.36
girl.add(torso)
const torsoMesh = add(torsoGeo, TOP, 0, 0, 0, { parent: torso })
torsoMesh.scale.set(1.18, 1, 0.68)
// shoulder caps and shoulder-blade volume
const shoulderL = new THREE.Vector3(-0.2, 0.58, 0), shoulderR = new THREE.Vector3(0.2, 0.58, 0)
add(sph(0.058, 16), SKIN, ...shoulderL.toArray(), { parent: torso })
add(sph(0.058, 16), SKIN, ...shoulderR.toArray(), { parent: torso })
// tank-top straps + hem
for (const sx_ of [-0.1, 0.1]) add(box(0.03, 0.2, 0.012), TOP, sx_, 0.64, 0, { parent: torso, rot: [0, 0, sx_ > 0 ? -0.25 : 0.25] })
add(new THREE.TorusGeometry(0.135, 0.012, 8, 28), PANTS, 0, 0.02, 0, { parent: torso, rot: [Math.PI / 2, 0, 0] }).scale.set(1.18, 0.68, 1)

// neck + head
const neckBase = new THREE.Vector3(0, 0, 0)
torso.updateMatrixWorld(true)
const nb = torso.localToWorld(new THREE.Vector3(0, 0.66, 0.0))
const neckTop = nb.clone().add(new THREE.Vector3(0, 0.1, -0.05))
limb(nb.toArray(), neckTop.toArray(), 0.05, 0.043, SKIN, girl)
const head = new THREE.Group(); head.position.copy(neckTop).add(new THREE.Vector3(0, 0.1, -0.015)); head.rotation.x = -0.38; girl.add(head)
add(ell(sph(0.115, 28), 0.92, 1.1, 1.0), SKIN, 0, 0, 0, { parent: head })           // skull
add(ell(sph(0.075, 18), 0.9, 0.9, 1.0), SKIN, 0, -0.09, -0.04, { parent: head })     // jaw/chin
add(ell(sph(0.022, 10), 0.6, 1, 0.8), SKIN, 0.103, -0.01, 0.0, { parent: head })     // ear
add(ell(sph(0.016, 10), 1, 0.9, 1.2), SKIN, 0, -0.02, -0.12, { parent: head })       // nose
// hair: back-swept cap, strands radiating to a top bun
add(ell(sph(0.126, 28), 1.0, 1.08, 1.08), 1, 0, 0.025, 0.028, { parent: head })
for (let i = 0; i < 16; i++) {
  const t = (i / 15 - 0.5) * Math.PI * 1.15
  const from = [Math.sin(t) * 0.1, 0.06, -0.07 + Math.cos(t) * 0.04]
  const to = [Math.sin(t) * 0.03, 0.2, 0.09]
  limb(from, to, 0.012, 0.004, 1, head)
}
add(ell(sph(0.085, 20), 1.05, 0.95, 1), 1, 0, 0.215, 0.09, { parent: head })       // bun
add(new THREE.TorusGeometry(0.07, 0.011, 8, 22), 0.3, 0, 0.2, 0.09, { parent: head, rot: [Math.PI / 2, 0, 0] })
// glasses: rim + temple arm
add(new THREE.TorusGeometry(0.034, 0.005, 6, 20), 0.3, 0.07, 0.005, -0.1, { parent: head, rot: [0, 0.55, 0] })
add(new THREE.TorusGeometry(0.034, 0.005, 6, 20), 0.3, -0.07, 0.005, -0.1, { parent: head, rot: [0, -0.55, 0] })
add(box(0.004, 0.004, 0.17), 0.3, 0.098, 0.012, -0.015, { parent: head })

// arms (shoulders in world space)
const sR = torso.localToWorld(shoulderR.clone()), sL = torso.localToWorld(shoulderL.clone())
const handR = new THREE.Vector3(0.58, deskY + 0.075, 0.06), handL = new THREE.Vector3(-0.32, deskY + 0.075, 0.14)
const elbowR = new THREE.Vector3(0.42, 0.96, 0.66), elbowL = new THREE.Vector3(-0.4, 0.96, 0.62)
function arm(sh, el, hd) {
  limb(sh.toArray(), el.toArray(), 0.05, 0.04, SKIN, girl)
  add(sph(0.04, 14), SKIN, ...el.toArray(), { parent: girl })
  limb(el.toArray(), hd.toArray(), 0.04, 0.026, SKIN, girl)
  const h = add(ell(sph(0.04, 14), 1.0, 0.55, 1.5), SKIN, hd.x, hd.y, hd.z - 0.02, { parent: girl })
  return h
}
const handMeshR = arm(sR, elbowR, handR)
arm(sL, elbowL, handL)
// fingers + pen on the drawing hand
for (let i = 0; i < 3; i++) add(cyl(0.008, 0.007, 0.05), SKIN, handR.x + (i - 1) * 0.016, handR.y, handR.z - 0.07, { parent: girl, rot: [Math.PI / 2 + 0.2, 0, 0] })
const pen = add(cyl(0.008, 0.003, 0.17), 0.3, handR.x + 0.01, handR.y + 0.025, handR.z - 0.1, { parent: girl, rot: [Math.PI / 2 - 0.55, 0, 0.1] })

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
  { pos: V(1.3, 2.1, 4.0),  look: V(0.45, 0.95, 0.0) },   // intro: whole studio
  { pos: V(1.5, 1.9, 2.6),  look: V(0.2, 0.95, 0.35) },   // 1 over-the-shoulder, the sketch
  { pos: V(0.55, 3.1, 1.0), look: V(0.55, 0.75, -0.1) },  // 2 plan view from above
  { pos: V(-2.0, 1.8, 2.7), look: V(0.2, 1.0, 0.4) },     // 3 from the window side
  { pos: V(0.9, 1.95, 1.9), look: V(0.0, 1.45, 0.75) },   // 4 close on the figure
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
  barFill.style.height = (prog * 100).toFixed(1) + '%'
  tone.uniforms.time.value = t
  composer.render()
})
