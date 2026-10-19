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
const SKIN = 1.0, CLOTH = 0.95
const hipY = 0.62
// thighs + lower legs
for (const sx_ of [-0.12, 0.12]) {
  limb([sx_, hipY, 0.95], [sx_, hipY, 0.4], 0.095, 0.075, SKIN, girl)
  limb([sx_, hipY, 0.4], [sx_, 0.12, 0.38], 0.075, 0.055, SKIN, girl)
  add(box(0.11, 0.06, 0.24), 0.3, sx_, 0.05, 0.28, { parent: girl })
}
// torso (leaning toward the desk)
const torso = add(cyl(0.2, 0.17, 0.68, 20), CLOTH, 0, 0.98, 0.88, { parent: girl, rot: [-0.32, 0, 0] })
add(sph(0.2), CLOTH, 0, 1.28, 0.78, { parent: girl })
add(cyl(0.17, 0.17, 0.18, 20), CLOTH, 0, 0.66, 0.97, { parent: girl, rot: [-0.1, 0, 0] })
// neck + head
limb([0, 1.3, 0.76], [0, 1.45, 0.7], 0.05, 0.055, SKIN, girl)
const head = new THREE.Group(); head.position.set(0, 1.6, 0.68); head.rotation.x = 0.35; girl.add(head)
add(sph(0.125), SKIN, 0, 0, 0, { parent: head })
add(box(0.04, 0.05, 0.02), SKIN, 0.125, -0.01, 0.0, { parent: head })       // ear
// hair
add(sph(0.14), 1, 0, 0.03, 0.03, { parent: head })
add(sph(0.11), 1, 0, 0.08, 0.12, { parent: head })
const bun = add(sph(0.085, 16), 1, 0, 0.22, 0.1, { parent: head })
add(new THREE.TorusGeometry(0.075, 0.012, 8, 20), 0.3, 0, 0.22, 0.1, { parent: head, rot: [Math.PI / 2, 0, 0] })
// glasses
add(new THREE.TorusGeometry(0.035, 0.005, 6, 18), 0.3, 0.1, 0.0, -0.1, { parent: head, rot: [0, 1.1, 0] })
add(box(0.004, 0.004, 0.2), 0.3, 0.13, 0.0, -0.01, { parent: head })

// arms: right (+x) draws, left rests on desk
const penHand = new THREE.Vector3(0.55, deskY + 0.1, 0.08)
limb([0.22, 1.22, 0.78], [0.42, 0.98, 0.62], 0.06, 0.055, SKIN, girl)   // upper arm
limb([0.42, 0.98, 0.62], penHand.toArray(), 0.055, 0.04, SKIN, girl)     // forearm
add(sph(0.05), SKIN, ...penHand.toArray(), { parent: girl })             // hand
add(cyl(0.01, 0.006, 0.17), 0.3, penHand.x + 0.04, penHand.y + 0.02, penHand.z - 0.08,
  { parent: girl, rot: [Math.PI / 2 - 0.5, 0, 0.1] })                    // pen
limb([-0.22, 1.22, 0.78], [-0.4, 0.98, 0.58], 0.06, 0.055, SKIN, girl)
limb([-0.4, 0.98, 0.58], [-0.3, deskY + 0.1, 0.12], 0.055, 0.04, SKIN, girl)
add(sph(0.05), SKIN, -0.3, deskY + 0.1, 0.12, { parent: girl })

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

/* ---------- interaction ---------- */
const mouse = new THREE.Vector2(), smooth = new THREE.Vector2()
let zoom = 0, zoomT = 0
addEventListener('pointermove', e => { mouse.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5) })
addEventListener('wheel', e => { zoomT = THREE.MathUtils.clamp(zoomT + e.deltaY * 0.0008, 0, 1) }, { passive: true })

function resize() {
  const w = innerWidth, h = innerHeight
  renderer.setSize(w, h, false); composer.setSize(w, h)
  camera.aspect = w / h
  camera.fov = w / h < 1 ? 56 : 38
  camera.updateProjectionMatrix()
}
addEventListener('resize', resize); resize()

const base = new THREE.Vector3(1.3, 2.1, 4.0), close = new THREE.Vector3(0.9, 1.6, 2.6)
const clock = new THREE.Clock()
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime()
  smooth.lerp(mouse, 0.05); zoom += (zoomT - zoom) * 0.06
  camera.position.lerpVectors(base, close, zoom)
  camera.position.x += smooth.x * 0.8
  camera.position.y += -smooth.y * 0.4
  camera.lookAt(target)
  // gentle life: breathing + drawing hand
  torso.scale.y = 1 + Math.sin(t * 1.6) * 0.008
  head.rotation.x = 0.35 + Math.sin(t * 0.9) * 0.015
  tone.uniforms.time.value = t
  composer.render()
})
