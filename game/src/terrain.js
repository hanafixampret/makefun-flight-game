// Ridge Runner — the world: alpine terrain, runway, lake, trees, clouds, rings.
// All geometry is generated here from the seeded noise in noise.js.
const WORLD_SIZE = 2400;
const VALLEY_FLOOR = 34;
const LAKE_POS = { x: 760, z: -620 };
const LAKE_LEVEL = 20.5;

// The race course: a valley road of waypoints the rings follow.
const COURSE = [
  [0, 120], [0, -180], [-150, -460], [-330, -700], [-300, -960],
  [-80, -1120], [180, -1060], [380, -860], [420, -560], [260, -320], [60, -120],
];
const NOISE = makeValueNoise(20261126);

function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (pz - az) * dz) / len2;
  t = clamp(t, 0, 1);
  const cx = ax + dx * t;
  const cz = az + dz * t;
  return Math.hypot(px - cx, pz - cz);
}
function distToCourse(x, z) {
  let best = Infinity;
  for (let i = 0; i < COURSE.length - 1; i++) {
    const d = distToSegment(x, z, COURSE[i][0], COURSE[i][1], COURSE[i + 1][0], COURSE[i + 1][1]);
    if (d < best) best = d;
  }
  return best;
}
function distToRunway(x, z) {
  // Runway segment from (0,-40) to (0,200).
  const dz = z < -40 ? -40 - z : z > 200 ? z - 200 : 0;
  return Math.hypot(Math.abs(x), dz);
}

// One height function shared by the mesh, the physics and the ring placement.
function terrainHeight(x, z) {
  const d = distToCourse(x, z);
  const rough = NOISE.fbm(x * 0.0016 + 7.3, z * 0.0016 + 2.9, 4);
  const hills = NOISE.fbm(x * 0.006 + 1.7, z * 0.006 + 8.4, 3);
  const mountainMask = smoothstep(130, 640, d);
  let h = VALLEY_FLOOR
    + hills * 15 * (1 - mountainMask * 0.4)
    + Math.max(0, rough) * 200 * mountainMask
    + rough * 26;
  // Lake bowl: sink the ground toward the water level near the lake.
  const ld = Math.hypot(x - LAKE_POS.x, z - LAKE_POS.z);
  h = lerp(h, 17, smoothstep(280, 70, ld));
  // Runway pad: perfectly flat ground under the strip.
  const rd = distToRunway(x, z);
  h = lerp(h, VALLEY_FLOOR, smoothstep(95, 32, rd));
  return h;
}

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, '#2f6fd0');
  grad.addColorStop(0.45, '#7fb2e8');
  grad.addColorStop(0.62, '#cfe4f7');
  grad.addColorStop(0.72, '#f6d9a8');
  grad.addColorStop(1.0, '#e8b478');
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildTerrainMesh(scene) {
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 150, 150);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const grass = new THREE.Color(0x5d8a3c);
  const grassDry = new THREE.Color(0x8a9a4a);
  const rock = new THREE.Color(0x7a7068);
  const snow = new THREE.Color(0xf2f5f7);
  const sand = new THREE.Color(0xc2b280);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = terrainHeight(x, z);
    pos.setY(i, h);
    const n = NOISE.fbm(x * 0.02 + 3.1, z * 0.02 + 9.2, 2);
    if (h < 24) tmp.copy(sand);
    else if (h < 95) tmp.copy(grass).lerp(grassDry, clamp((n + 1) / 2, 0, 1) * 0.7);
    else if (h < 165) tmp.copy(grass).lerp(rock, smoothstep(95, 165, h));
    else if (h < 205) tmp.copy(rock);
    else tmp.copy(rock).lerp(snow, smoothstep(185, 215, h));
    // Steep rock faces read darker.
    const slope = Math.abs(NOISE.fbm(x * 0.01, z * 0.01, 2));
    tmp.multiplyScalar(1 - slope * 0.12);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  return mesh;
}

function buildRunway(scene) {
  const group = new THREE.Group();
  const strip = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 240),
    new THREE.MeshLambertMaterial({ color: 0x2b2e35 })
  );
  strip.rotation.x = -Math.PI / 2;
  strip.position.set(0, VALLEY_FLOOR + 0.6, 80);
  group.add(strip);
  // Centerline dashes.
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f0 });
  for (let z = -100; z <= 220; z += 28) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 12), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, VALLEY_FLOOR + 0.7, z);
    group.add(dash);
  }
  // Threshold bars at both ends.
  for (const z of [-32, 192]) {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(20, 5), dashMat);
    bar.rotation.x = -Math.PI / 2;
    bar.position.set(0, VALLEY_FLOOR + 0.7, z);
    group.add(bar);
  }
  // Edge lights.
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (let z = -36; z <= 196; z += 29) {
    for (const x of [-13.5, 13.5]) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), lightMat);
      bulb.position.set(x, VALLEY_FLOOR + 1.1, z);
      group.add(bulb);
    }
  }
  // Windsock.
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 9, 8),
    new THREE.MeshLambertMaterial({ color: 0xd8d8d8 })
  );
  pole.position.set(20, VALLEY_FLOOR + 4.5, 150);
  group.add(pole);
  const sock = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 4.5, 10),
    new THREE.MeshLambertMaterial({ color: 0xff7a1a })
  );
  sock.rotation.z = Math.PI / 2;
  sock.position.set(22.4, VALLEY_FLOOR + 8.4, 150);
  group.add(sock);
  // Small hangar beside the strip.
  const hangar = new THREE.Mesh(
    new THREE.BoxGeometry(24, 10, 18),
    new THREE.MeshLambertMaterial({ color: 0x9aa5ad })
  );
  hangar.position.set(-30, VALLEY_FLOOR + 5, 170);
  group.add(hangar);
  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(9, 9, 24, 12, 1, false, 0, Math.PI),
    new THREE.MeshLambertMaterial({ color: 0x6b7c86 })
  );
  roof.rotation.z = Math.PI / 2;
  roof.rotation.y = Math.PI / 2;
  roof.position.set(-30, VALLEY_FLOOR + 10, 170);
  group.add(roof);
  scene.add(group);
  return group;
}

function buildLake(scene) {
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(210, 40),
    new THREE.MeshLambertMaterial({ color: 0x2e6f9e, transparent: true, opacity: 0.92 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(LAKE_POS.x, LAKE_LEVEL, LAKE_POS.z);
  scene.add(water);
  return water;
}

function buildTrees(scene) {
  const rand = mulberry32(777);
  const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 5, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a4128 });
  const topGeo = new THREE.ConeGeometry(3.4, 13, 8);
  const topMat = new THREE.MeshLambertMaterial({ color: 0x2e5d23 });
  const spots = [];
  let tries = 0;
  while (spots.length < 320 && tries < 4000) {
    tries++;
    const x = (rand() * 2 - 1) * 1150;
    const z = (rand() * 2 - 1) * 1150;
    const h = terrainHeight(x, z);
    if (h < 30 || h > 120) continue;
    if (distToCourse(x, z) < 55) continue;
    if (distToRunway(x, z) < 45) continue;
    if (Math.hypot(x - LAKE_POS.x, z - LAKE_POS.z) < 230) continue;
    spots.push([x, h, z, 0.7 + rand() * 0.9]);
  }
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, spots.length);
  const tops = new THREE.InstancedMesh(topGeo, topMat, spots.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  spots.forEach((sp, i) => {
    const sc = sp[3];
    p.set(sp[0], sp[1] + 2.5 * sc, sp[2]);
    s.set(sc, sc, sc);
    m.compose(p, q, s);
    trunks.setMatrixAt(i, m);
    p.set(sp[0], sp[1] + (5 + 6.5) * sc, sp[2]);
    m.compose(p, q, s);
    tops.setMatrixAt(i, m);
  });
  trunks.instanceMatrix.needsUpdate = true;
  tops.instanceMatrix.needsUpdate = true;
  scene.add(trunks);
  scene.add(tops);
  return { trunks, tops };
}

function buildClouds(scene) {
  const rand = mulberry32(4242);
  // Unlit white puffs: lit clouds read dark from below, these stay bright.
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
  const clouds = [];
  for (let i = 0; i < 18; i++) {
    const g = new THREE.Group();
    const puffs = 3 + ((rand() * 3) | 0);
    for (let j = 0; j < puffs; j++) {
      const r = 14 + rand() * 22;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
      puff.scale.y = 0.42;
      puff.position.set((rand() * 2 - 1) * 34, (rand() * 2 - 1) * 4, (rand() * 2 - 1) * 18);
      g.add(puff);
    }
    g.position.set((rand() * 2 - 1) * 1100, 250 + rand() * 130, (rand() * 2 - 1) * 1100);
    scene.add(g);
    clouds.push(g);
  }
  return clouds;
}

// Rings hang over the course, one per waypoint after the start.
function buildRings(scene) {
  const ringMat = new THREE.MeshLambertMaterial({
    color: 0xffb400, emissive: 0xcc7a00, emissiveIntensity: 0.7,
  });
  const ringGeo = new THREE.TorusGeometry(16, 1.7, 12, 40);
  const rings = [];
  for (let i = 1; i < COURSE.length; i++) {
    const [x, z] = COURSE[i];
    const y = terrainHeight(x, z) + 62 + (i % 3) * 14;
    const mesh = new THREE.Mesh(ringGeo, ringMat.clone());
    mesh.position.set(x, y, z);
    // Face along the course direction.
    const [nx, nz] = COURSE[Math.min(i + 1, COURSE.length - 1)];
    const [px, pz] = COURSE[i - 1];
    mesh.rotation.y = Math.atan2(nx - px, nz - pz);
    scene.add(mesh);
    rings.push({ mesh, pos: new THREE.Vector3(x, y, z), passed: false, index: i - 1 });
  }
  return rings;
}

function buildWorld(scene) {
  // Sky dome with a painted gradient, sun and haze.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(2600, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false })
  );
  scene.add(sky);
  scene.fog = new THREE.Fog(0xcfe0ee, 700, 2400);
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x6a7a52, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe6b8, 1.6);
  sun.position.set(700, 900, 500);
  scene.add(sun);
  buildTerrainMesh(scene);
  buildRunway(scene);
  buildLake(scene);
  buildTrees(scene);
  const clouds = buildClouds(scene);
  const rings = buildRings(scene);
  return {
    clouds,
    rings,
    update(dt) {
      for (const c of clouds) {
        c.position.x += dt * 2.2;
        if (c.position.x > 1200) c.position.x = -1200;
      }
    },
  };
}
