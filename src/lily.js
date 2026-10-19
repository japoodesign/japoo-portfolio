import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

/* ----------------------------------------------------------- leaves */

function leafTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 256, 0);
  gr.addColorStop(0, '#1b4a25');
  gr.addColorStop(0.5, '#2f7d3b');
  gr.addColorStop(1, '#1b4a25');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 512);
  g.strokeStyle = 'rgba(190,225,150,.22)';
  g.lineWidth = 1.5;
  for (let y = 10; y < 512; y += 16) {
    g.beginPath();
    g.moveTo(128, y);
    g.lineTo(0, y - 46);
    g.moveTo(128, y);
    g.lineTo(256, y - 46);
    g.stroke();
  }
  g.strokeStyle = 'rgba(176,214,140,.85)';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(128, 0);
  g.lineTo(128, 512);
  g.stroke();
  for (let i = 0; i < 220; i++) {
    g.fillStyle = `rgba(225,242,185,${0.25 + Math.random() * 0.4})`;
    g.beginPath();
    g.arc(Math.random() * 256, Math.random() * 512, 0.7 + Math.random() * 1.3, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeLeaf(L, Wd, a0, kap) {
  const NU = 6;
  const NV = 18;
  const pos = new Float32Array((NU + 1) * (NV + 1) * 3);
  const uv = new Float32Array((NU + 1) * (NV + 1) * 2);
  const idx = [];
  let r = 0;
  let y = 0;
  let a = a0;
  const ds = L / NV;
  for (let j = 0; j <= NV; j++) {
    const v = j / NV;
    const w = Wd * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.75)), 0.85);
    for (let i = 0; i <= NU; i++) {
      const u = -1 + (2 * i) / NU;
      const off = Math.abs(u) * w * 0.3;
      const k = j * (NU + 1) + i;
      pos[k * 3] = r - Math.cos(a) * off;
      pos[k * 3 + 1] = y + Math.sin(a) * off;
      pos[k * 3 + 2] = u * w;
      uv[k * 2] = (u + 1) / 2;
      uv[k * 2 + 1] = v;
    }
    r += Math.sin(a) * ds;
    y += Math.cos(a) * ds;
    a += kap * ds * (0.3 + v * 1.4);
  }
  for (let j = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) {
      const p = j * (NU + 1) + i;
      idx.push(p, p + 1, p + NU + 1, p + 1, p + NU + 2, p + NU + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/* ----------------------------------------------------------- tepals */

const BUD = new THREE.Color('#d4e3a4');
const BASE = new THREE.Color('#9dba5c');
const RIB = new THREE.Color('#8fb352');
const SEAM = new THREE.Color('#86ab4a');
const WHITE = new THREE.Color('#f8f3ea');
const tmp = new THREE.Color();

class Tepal {
  constructor(phi, L, W, outer) {
    this.phi = phi;
    this.L = L;
    this.W = W;
    this.outer = outer;
    this.NU = 14;
    this.NV = 36;
    const n = (this.NU + 1) * (this.NV + 1);
    this.pos = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3);
    const idx = [];
    for (let j = 0; j < this.NV; j++) {
      for (let i = 0; i < this.NU; i++) {
        const p = j * (this.NU + 1) + i;
        idx.push(p, p + 1, p + this.NU + 1, p + 1, p + this.NU + 2, p + this.NU + 1);
      }
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const uv = new Float32Array(n * 2);
    for (let j = 0; j <= this.NV; j++) {
      for (let i = 0; i <= this.NU; i++) {
        const k = (j * (this.NU + 1) + i) * 2;
        uv[k] = i / this.NU;
        uv[k + 1] = j / this.NV;
      }
    }
    this.geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.geo.setIndex(idx);
    this.cl = new Float32Array((this.NV + 1) * 3);
  }

  update(o) {
    const { NU, NV, L, phi, outer, pos, col, cl } = this;
    const th0 = lerp(0.3, 1.0, o);
    const kap = lerp(-0.48, 0.5, o);
    const rb = lerp(0.06, 0.07, o);
    const Wmax = lerp(0.17, 0.3, o) * (outer ? 0.94 : 1.1);
    const curv = lerp(3.2, 0.9, o);
    const twist = (1 - o) * 0.55;

    let r = rb;
    let y = 0;
    let a = th0;
    const ds = L / NV;
    for (let j = 0; j <= NV; j++) {
      cl[j * 3] = r;
      cl[j * 3 + 1] = y;
      cl[j * 3 + 2] = a;
      const v = j / NV;
      r += Math.sin(a) * ds;
      y += Math.cos(a) * ds;
      a += kap * ds * (0.3 + v * 1.4);
    }

    const budCol = tmp.copy(BUD).lerp(WHITE, smooth(0, 0.75, o));
    const br = budCol.r;
    const bg = budCol.g;
    const bb = budCol.b;
    const radial = outer ? 0.014 : -0.006;

    for (let j = 0; j <= NV; j++) {
      const v = j / NV;
      const rr = cl[j * 3];
      const yy = cl[j * 3 + 1];
      const aa = cl[j * 3 + 2];
      const w = Wmax * (0.18 * (1 - v) + 0.82 * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.85)), 0.7));
      const ph = phi + twist * v;
      const cph = Math.cos(ph);
      const sph = Math.sin(ph);
      const nx = -Math.cos(aa);
      const ny = Math.sin(aa);
      const baseMix = Math.pow(1 - v, 2) * (0.75 - 0.55 * o);
      for (let i = 0; i <= NU; i++) {
        const u = -1 + (2 * i) / NU;
        const x = u * w;
        const au = Math.abs(u);
        const cup = x * x * curv + o * 0.045 * au * au * au * Math.sin(v * 17 + phi * 2.3 + u * 2.0) * (0.3 + v);
        const R = rr + nx * cup + radial;
        const Y = yy + ny * cup;
        const k = (j * (NU + 1) + i) * 3;
        pos[k] = R * cph + x * sph;
        pos[k + 1] = Y;
        pos[k + 2] = -R * sph + x * cph;

        let cr = br;
        let cg = bg;
        let cb = bb;
        cr = lerp(cr, BASE.r, baseMix);
        cg = lerp(cg, BASE.g, baseMix);
        cb = lerp(cb, BASE.b, baseMix);
        const rib = Math.max(0, 1 - Math.abs(u) * 5.5) * (0.9 - 0.62 * o);
        cr = lerp(cr, RIB.r, rib);
        cg = lerp(cg, RIB.g, rib);
        cb = lerp(cb, RIB.b, rib);
        const seam = smooth(0.78, 1.0, au) * (1 - o) * 0.6;
        cr = lerp(cr, SEAM.r, seam);
        cg = lerp(cg, SEAM.g, seam);
        cb = lerp(cb, SEAM.b, seam);
        const ao = 1 - 0.2 * Math.pow(1 - v, 1.6) * o - 0.06 * au * au * o;
        col[k] = cr * ao;
        col[k + 1] = cg * ao;
        col[k + 2] = cb * ao;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.computeVertexNormals();
  }
}

/* ----------------------------------------------------------- flower */

function petalTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 128, 512);
  const throat = g.createLinearGradient(0, 512, 0, 0);
  throat.addColorStop(0, 'rgba(190,215,110,.75)');
  throat.addColorStop(0.35, 'rgba(210,228,150,.25)');
  throat.addColorStop(0.6, 'rgba(255,255,255,0)');
  g.fillStyle = throat;
  g.fillRect(0, 0, 128, 512);
  const rib = g.createLinearGradient(0, 0, 128, 0);
  rib.addColorStop(0.42, 'rgba(180,210,120,0)');
  rib.addColorStop(0.5, 'rgba(170,205,110,.55)');
  rib.addColorStop(0.58, 'rgba(180,210,120,0)');
  g.fillStyle = rib;
  g.fillRect(0, 0, 128, 460);
  g.strokeStyle = 'rgba(120,130,100,.10)';
  g.lineWidth = 1;
  for (let i = -5; i <= 5; i++) {
    if (!i) continue;
    g.beginPath();
    g.moveTo(64 + i * 3, 512);
    g.quadraticCurveTo(64 + i * 11, 250, 64 + i * 5, 12);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

const petalMat = new THREE.MeshPhysicalMaterial({
  map: petalTexture(),
  emissive: new THREE.Color('#fff1e6'),
  emissiveIntensity: 0.07,
  vertexColors: true,
  side: THREE.DoubleSide,
  roughness: 0.5,
  sheen: 0.8,
  sheenRoughness: 0.5,
  sheenColor: new THREE.Color('#ffffff'),
});

class Flower {
  constructor({ scale, range, lean, tiltOpen, yaw }) {
    this.range = range;
    this.lean = lean;
    this.tiltOpen = tiltOpen;
    this.last = -1;
    this.group = new THREE.Group();
    this.group.scale.setScalar(scale);
    this.head = new THREE.Group();
    this.head.rotation.y = yaw;
    this.group.add(this.head);

    const L = 1.5;
    this.tepals = [0, 2, 4].map((k) => new Tepal((k * Math.PI) / 3, L, 1, true));
    this.tepals.push(...[1, 3, 5].map((k) => new Tepal((k * Math.PI) / 3, L * 0.97, 1, false)));
    this.tepals.forEach((t) => {
      const m = new THREE.Mesh(t.geo, petalMat);
      m.frustumCulled = false;
      m.castShadow = true;
      this.head.add(m);
    });

    const green = new THREE.MeshStandardMaterial({ color: '#9bbd4a', roughness: 0.6 });
    const fil = new THREE.MeshStandardMaterial({ color: '#d9e2a8', roughness: 0.6 });
    const anther = new THREE.MeshStandardMaterial({ color: '#b4561c', roughness: 0.8, emissive: '#5a2308', emissiveIntensity: 0.3 });

    const base = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), green);
    base.position.y = -0.02;
    this.head.add(base);

    this.sexual = new THREE.Group();
    this.stamens = [];
    for (let k = 0; k < 6; k++) {
      const holder = new THREE.Group();
      holder.rotation.y = (k * Math.PI) / 3 + 0.5;
      const arm = new THREE.Group();
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.01, 1, 6), fil);
      f.geometry.translate(0, 0.5, 0);
      f.scale.y = 0.85;
      const an = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), anther);
      an.scale.set(0.035, 0.14, 0.035);
      an.position.y = 0.88;
      an.rotation.z = 1.2;
      arm.add(f, an);
      holder.add(arm);
      this.sexual.add(holder);
      this.stamens.push(arm);
    }
    const pist = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.013, 1, 6), green);
    pist.geometry.translate(0, 0.5, 0);
    pist.scale.y = 1.05;
    const stig = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), green);
    stig.position.y = 1.07;
    this.pistil = new THREE.Group();
    this.pistil.add(pist, stig);
    this.sexual.add(this.pistil);
    this.head.add(this.sexual);
  }

  update(bloom, time) {
    const o = smooth(this.range[0], this.range[1], bloom);
    if (Math.abs(o - this.last) > 0.0004) {
      this.last = o;
      this.tepals.forEach((t) => t.update(o));
      const s = smooth(0.3, 0.9, o);
      this.sexual.scale.setScalar(Math.max(s, 0.0001));
      this.sexual.visible = s > 0.01;
      this.stamens.forEach((a) => (a.rotation.z = 0.1 + 0.3 * o));
      this.pistil.rotation.z = -0.05 - 0.1 * o;
    }
    this.head.rotation.x = this.tiltOpen * o;
    this.head.rotation.z = this.lean + Math.sin(time * 0.7 + this.range[0] * 9) * 0.025;
  }
}

/* -------------------------------------------------------------- lily */

class Lily {
  constructor() {
    this.group = new THREE.Group();

    const stemMat = new THREE.MeshStandardMaterial({ color: '#7d9b48', roughness: 0.45 });
    const tube = (pts, r) => {
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
      return { mesh: new THREE.Mesh(new THREE.TubeGeometry(curve, 48, r, 8), stemMat), curve };
    };

    const stem = tube([[0.25, -2, 0], [0.12, 0, 0], [0.05, 1.3, 0.02], [-0.12, 2.5, 0.05], [-0.3, 3.5, 0.08], [-0.3, 4.15, 0.1]], 0.05);
    stem.mesh.castShadow = true;
    this.group.add(stem.mesh);
    this.stem = stem.curve;

    const pedB = tube([[-0.1, 2.5, 0.05], [-0.5, 3.0, 0.08], [-1.0, 3.55, 0.1], [-1.15, 3.9, 0.1]], 0.036);
    const pedC = tube([[0.02, 1.7, 0.02], [0.4, 2.2, 0], [0.85, 2.8, -0.06], [1.0, 3.2, -0.08]], 0.034);
    pedB.mesh.castShadow = pedC.mesh.castShadow = true;
    this.group.add(pedB.mesh, pedC.mesh);

    const defs = [
      { at: [-0.3, 4.15, 0.1], scale: 1.0, range: [0.1, 0.62], lean: -0.12, tiltOpen: 0.95, yaw: 0.4 },
      { at: [-1.15, 3.9, 0.1], scale: 0.8, range: [0.25, 0.8], lean: 0.5, tiltOpen: 0.85, yaw: 1.2 },
      { at: [1.0, 3.2, -0.08], scale: 0.68, range: [0.4, 1.0], lean: -0.55, tiltOpen: 0.8, yaw: 2.0 },
    ];
    this.flowers = defs.map((d) => {
      const f = new Flower(d);
      f.group.position.set(...d.at);
      this.group.add(f.group);
      return f;
    });

    const leafMat = new THREE.MeshStandardMaterial({
      map: leafTexture(),
      roughness: 0.38,
      side: THREE.DoubleSide,
    });
    const leaves = [
      [0.4, 1.7, 0.2, 1.1, -0.85, 0.2],
      [0.75, 1.5, 3.4, 1.15, -0.8, 0.19],
      [1.2, 1.35, 0.9, 1.0, -0.9, 0.17],
      [1.65, 1.3, 4.1, 1.05, -0.8, 0.17],
      [2.15, 1.1, 1.6, 0.9, -0.7, 0.15],
      [2.65, 0.95, 4.8, 0.85, -0.7, 0.14],
      [-0.2, 1.8, 2.6, 1.2, -0.9, 0.2],
      [0.55, 1.4, 5.6, 1.25, -0.75, 0.16],
      [0.95, 1.25, 2.1, 1.2, -0.8, 0.15],
      [1.4, 1.15, 5.2, 1.1, -0.85, 0.15],
      [1.9, 1.0, 3.0, 1.0, -0.75, 0.13],
      [2.4, 0.85, 0.3, 0.95, -0.7, 0.12],
    ];
    this.leaves = [];
    leaves.forEach(([y, L, az, a0, kap, Wd]) => {
      const t = Math.min(0.999, Math.max(0, (y + 2) / 6.15));
      const p = this.stem.getPoint(t);
      const m = new THREE.Mesh(makeLeaf(L, Wd, a0, kap), leafMat);
      m.position.copy(p);
      m.rotation.y = az;
      m.userData.az = az;
      m.castShadow = true;
      this.group.add(m);
      this.leaves.push(m);
    });
  }

  update(bloom, time) {
    this.flowers.forEach((f) => f.update(bloom, time));
    this.leaves.forEach((m, i) => (m.rotation.y = m.userData.az + Math.sin(time * 0.5 + i) * 0.03));
  }
}

/* ----------------------------------------------------------- stage */

export class Stage {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.32;

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.camera.position.z = 16;

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb8a0a4, 0.5));
    const key = new THREE.DirectionalLight(0xfff4ea, 2.6);
    key.position.set(2.5, 3.5, 11);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.radius = 9;
    key.shadow.blurSamples = 20;
    key.shadow.bias = -0.0004;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 40;
    this.key = key;
    const fill = new THREE.DirectionalLight(0xffd9d9, 0.7);
    fill.position.set(5, -2, 4);
    this.scene.add(key, fill);

    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.ShadowMaterial({ opacity: 0.11 }));
    this.floor.position.z = -0.5;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    this.lily = new Lily();
    this.rig = new THREE.Group();
    this.rig.add(this.lily.group);
    this.scene.add(this.rig);
    this.W = 1;
    this.H = 1;
  }

  resize(w, h) {
    this.W = w;
    this.H = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.viewH = 2 * this.camera.position.z * Math.tan((this.camera.fov * Math.PI) / 360);
    this.viewW = this.viewH * this.camera.aspect;
    this.pxPerUnit = h / this.viewH;
    const sc = this.key.shadow.camera;
    sc.left = -this.viewW * 0.7;
    sc.right = this.viewW * 0.7;
    sc.top = this.viewH * 0.7;
    sc.bottom = -this.viewH * 0.7;
    sc.updateProjectionMatrix();
    this.unit = (w < 760 ? 0.9 : 1) * (Math.min(this.viewW, 1.3 * this.viewH) / 11.1) * 0.98;
  }

  toWorld(px, py) {
    return [((px - this.W / 2) / this.H) * this.viewH, -((py - this.H / 2) / this.H) * this.viewH];
  }

  update(st, time) {
    const [wx, wy] = this.toWorld(st.x, st.y);
    this.rig.position.set(wx, wy, 0);
    this.rig.scale.setScalar(this.unit * st.k);
    this.rig.rotation.order = 'ZYX';
    this.rig.rotation.set(0.12, st.ry + Math.sin(time * 0.4) * 0.05, st.lean + Math.sin(time * 0.5) * 0.012);
    this.lily.update(st.bloom, time);
    this.renderer.render(this.scene, this.camera);
  }
}
