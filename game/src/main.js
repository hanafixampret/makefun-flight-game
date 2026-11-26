// Ridge Runner — Alpine Air Rally: boot, arcade flight physics, cameras, game loop.
// A 3D flight game: chase or cockpit camera over an alpine valley, golden rings,
// fuel that burns, a runway that refuels, and three sorties to fly.
const params = new URLSearchParams(window.location.search);
const SHOT = params.get('shot'); // takeoff | rings | cockpit | vista (screenshot poses)

const plane = {
  pos: new THREE.Vector3(0, VALLEY_FLOOR + 1.8, 170),
  heading: 0, // radians; 0 faces -Z (north, down the runway)
  pitch: 0,
  bank: 0,
  speed: 0, // m/s
  throttle: 0,
  airborne: false,
  verticalSpeed: 0,
};

let renderer;
let scene;
let camera;
let world;
let aircraft;
let hudCtx;
let hudCanvas;
let missionIndex = 0;
let ms = null;
let state = 'menu'; // menu | flying | crashed | complete
let cameraMode = 'chase'; // chase | cockpit
let message = '';
let messageT = 0;
let endLine = '';
let camPos = new THREE.Vector3(0, 60, 220);
let camLook = new THREE.Vector3(0, 36, 0);
let shotApplied = false;

function forwardVector() {
  const cp = Math.cos(plane.pitch);
  return new THREE.Vector3(
    Math.sin(plane.heading) * cp,
    Math.sin(plane.pitch),
    -Math.cos(plane.heading) * cp
  );
}

function setMessage(text, seconds) {
  message = text;
  messageT = seconds || 2.2;
}

function resetPlane() {
  plane.pos.set(0, VALLEY_FLOOR + 1.8, 170);
  plane.heading = 0;
  plane.pitch = 0;
  plane.bank = 0;
  plane.speed = 0;
  plane.throttle = 0.35;
  plane.airborne = false;
  plane.verticalSpeed = 0;
  ms = makeMissionState(MISSIONS[missionIndex], world);
  // Rings back to gold.
  for (const r of world.rings) {
    r.mesh.material.color.set(0xffb400);
    r.mesh.material.emissive.set(0xcc7a00);
  }
  state = 'flying';
  setMessage(MISSIONS[missionIndex].name + ' — GOOD LUCK, PILOT', 3);
  document.getElementById('menu').style.display = 'none';
  document.getElementById('banner').style.display = 'none';
  AudioSys.init();
}

function backToMenu() {
  state = 'menu';
  const menu = document.getElementById('menu');
  menu.style.display = 'flex';
  document.getElementById('banner').style.display = 'none';
  renderMissionList();
}

function renderMissionList() {
  const list = document.getElementById('missions');
  list.innerHTML = '';
  MISSIONS.forEach((m, i) => {
    const b = document.createElement('button');
    b.className = 'mission' + (i === missionIndex ? ' selected' : '');
    b.innerHTML = '<b>' + m.name + '</b><span>' + m.desc + '</span>';
    b.addEventListener('click', () => {
      missionIndex = i;
      AudioSys.init();
      renderMissionList();
    });
    list.appendChild(b);
  });
}

function showBanner(title, line) {
  const banner = document.getElementById('banner');
  banner.style.display = 'block';
  banner.innerHTML = '<h2>' + title + '</h2><p>' + line + '</p>' +
    '<p class="keys">Press R to fly again &nbsp;·&nbsp; Esc for the menu &nbsp;·&nbsp; C switches camera</p>';
}

function crashPlane(reason) {
  if (state !== 'flying') return;
  state = 'crashed';
  endLine = reason + ' — Score ' + ms.score + ', rings ' + ms.nextRing + '/' + ms.rings.length;
  AudioSys.thud();
  AudioSys.update(0, 0, false);
  showBanner('CRASHED', endLine);
}

function completeMission() {
  if (state !== 'flying') return;
  state = 'complete';
  endLine = MISSIONS[missionIndex].name + ' clear — Score ' + ms.score +
    ' in ' + Math.round(ms.elapsed) + 's';
  AudioSys.fanfare();
  AudioSys.update(0, 0, false);
  showBanner('SORTIE COMPLETE', endLine);
}

// Deterministic poses for the screenshots: real renders of the live game.
function applyShot() {
  if (!SHOT || shotApplied) return;
  shotApplied = true;
  document.getElementById('menu').style.display = 'none';
  missionIndex = 0;
  resetPlane();
  state = 'flying';
  if (SHOT === 'takeoff') {
    plane.pos.set(0, VALLEY_FLOOR + 1.8, 185);
    plane.speed = 26;
    plane.throttle = 0.85;
    plane.pitch = 0.1;
    cameraMode = 'chase';
  } else if (SHOT === 'rings') {
    const r = world.rings[2];
    plane.pos.copy(r.pos).add(new THREE.Vector3(26, 8, 120));
    plane.heading = Math.atan2(r.pos.x - plane.pos.x, -(r.pos.z - plane.pos.z));
    plane.speed = 58;
    plane.throttle = 0.7;
    plane.pitch = 0.02;
    plane.airborne = true;
    ms.nextRing = 2;
    cameraMode = 'chase';
  } else if (SHOT === 'cockpit') {
    const r = world.rings[4];
    plane.pos.copy(r.pos).add(new THREE.Vector3(-14, 4, 90));
    plane.heading = Math.atan2(r.pos.x - plane.pos.x, -(r.pos.z - plane.pos.z));
    plane.speed = 62;
    plane.throttle = 0.72;
    plane.airborne = true;
    ms.nextRing = 4;
    cameraMode = 'cockpit';
  } else if (SHOT === 'vista') {
    plane.pos.set(620, 260, -420);
    // Face the lake and the peaks beyond it.
    plane.heading = Math.atan2(760 - 620, -(-620 + 420));
    plane.bank = 0.35;
    plane.speed = 48;
    plane.throttle = 0.55;
    plane.airborne = true;
    cameraMode = 'chase';
  }
  ms.fuel = 100;
  setMessage('', 0);
}

function step(dt) {
  world.update(dt);
  if (state !== 'flying') {
    // Idle orbit behind the menu: slow cinematic drift.
    const t = performance.now() / 1000;
    camera.position.set(Math.sin(t * 0.05) * 260, 190, 320 + Math.cos(t * 0.04) * 60);
    camera.lookAt(0, 60, -300);
    aircraft.group.position.copy(plane.pos);
    aircraft.group.rotation.set(0, plane.heading, 0, 'YXZ');
    return;
  }

  // --- input ---
  const rollIn = Input.rollAxis();
  const pitchIn = Input.pitchAxis();
  plane.throttle = clamp(plane.throttle + Input.throttleAxis() * dt * 0.5, 0, 1);
  if (Input.down('KeyR') && (state === 'crashed' || state === 'complete')) resetPlane();

  // --- flight model ---
  const targetBank = rollIn * 0.95;
  plane.bank += (targetBank - plane.bank) * Math.min(1, dt * 3.2);
  const targetPitch = pitchIn * 0.42;
  plane.pitch += (targetPitch - plane.pitch) * Math.min(1, dt * 2.6);
  // Banking turns the nose.
  plane.heading += -plane.bank * (plane.speed / 60) * 0.55 * dt;
  // Throttle sets the target speed; the plane chases it.
  const targetSpeed = 16 + plane.throttle * 70;
  plane.speed += (targetSpeed - plane.speed) * Math.min(1, dt * 0.55);
  // Stall sink when slow.
  let sink = 0;
  if (plane.speed < 26) sink = (26 - plane.speed) * 0.22;
  const fwd = forwardVector();
  plane.pos.addScaledVector(fwd, plane.speed * dt);
  plane.pos.y -= sink * dt;
  plane.verticalSpeed = fwd.y * plane.speed - sink;

  // --- ground ---
  const ground = terrainHeight(plane.pos.x, plane.pos.z);
  const minAlt = ground + 1.8;
  if (plane.pos.y <= minAlt) {
    plane.pos.y = minAlt;
    if (onRunway(plane.pos) && Math.abs(plane.verticalSpeed) < 9 && plane.speed < 48) {
      // Touchdown: roll, refuel, take off again with speed and pitch.
      plane.airborne = false;
      plane.pitch *= 0.9;
      const res = tryLand(ms, plane.pos, plane.verticalSpeed, plane.speed);
      if (res === 'refueled') setMessage('REFUELED — FULL TANK', 2.5);
      if (plane.speed < 2) plane.speed = 0;
      if (plane.speed > 32 && plane.pitch > 0.12) plane.airborne = true;
    } else if (plane.speed > 12 || Math.abs(plane.verticalSpeed) > 9) {
      crashPlane(plane.pos.y <= LAKE_LEVEL + 1 ? 'Ditched in the lake.' : 'Terrain strike.');
    } else {
      plane.airborne = false;
      plane.speed = Math.max(0, plane.speed - 20 * dt);
    }
  } else if (plane.pos.y > minAlt + 0.5) {
    plane.airborne = true;
  }
  // World edge: turn the plane gently back toward the valley.
  if (Math.abs(plane.pos.x) > 1150 || Math.abs(plane.pos.z) > 1150) {
    setMessage('TURN BACK — LEAVING THE VALLEY', 1.5);
    plane.heading += dt * 0.6 * (plane.pos.x > 0 ? -1 : 1);
  }

  // --- mission ---
  const events = updateMission(ms, plane.pos, plane.speed, plane.throttle, dt, plane.airborne);
  for (const ev of events) {
    if (ev === 'ring') {
      AudioSys.chime();
      setMessage('RING ' + ms.nextRing + '/' + ms.rings.length + '  +100', 1.8);
    } else if (ev === 'lowfuel') {
      setMessage('LOW FUEL', 2.5);
    } else if (ev === 'flameout') {
      setMessage('FLAMEOUT — GLIDE TO THE RUNWAY', 3);
      plane.throttle = 0;
    } else if (ev === 'complete') {
      completeMission();
    } else if (ev === 'timeout') {
      state = 'complete';
      endLine = 'Time up — Score ' + ms.score + ', rings ' + ms.nextRing + '/' + ms.rings.length;
      showBanner('TIME UP', endLine);
    }
  }
  if (ms.fuel <= 0 && plane.airborne && plane.speed < 20 && plane.pos.y <= minAlt + 0.5) {
    crashPlane('Ran out of fuel over the valley.');
  }

  // --- aircraft visual ---
  aircraft.group.position.copy(plane.pos);
  aircraft.group.rotation.set(plane.pitch, plane.heading, -plane.bank, 'YXZ');
  updateAircraftVisual(aircraft, dt, plane.throttle, rollIn, pitchIn);

  // --- camera ---
  // Screenshot poses glue the camera to the plane: under virtual time the
  // frame deltas are tiny and a lerped camera would lag a whole valley behind.
  const snap = SHOT ? 1 : 0;
  const up = new THREE.Vector3(0, 1, 0);
  // In the cockpit the spinning blades read as a black bar across the view;
  // fade them to a translucent disc there, solid everywhere else.
  const cockpitView = cameraMode === 'cockpit';
  for (const b of aircraft.blades) {
    if (b.material.transparent !== cockpitView) {
      b.material.transparent = cockpitView;
      b.material.opacity = cockpitView ? 0.16 : 1;
      b.material.needsUpdate = true;
    }
  }
  if (cameraMode === 'cockpit') {
    const eye = plane.pos.clone().addScaledVector(fwd, 1.6).add(new THREE.Vector3(0, 1.35, 0));
    if (snap) camPos.copy(eye);
    else camPos.lerp(eye, Math.min(1, dt * 14));
    camera.position.copy(camPos);
    const look = plane.pos.clone().addScaledVector(fwd, 60);
    // Aim down so the valley, not just sky, fills the windscreen.
    look.y -= 12;
    if (snap) camLook.copy(look);
    else camLook.lerp(look, Math.min(1, dt * 14));
    // Roll the camera with the wings: up must be set before lookAt reads it.
    camera.up.set(Math.sin(-plane.bank * 0.45), Math.cos(plane.bank * 0.45), 0);
    camera.lookAt(camLook);
  } else {
    const back = fwd.clone().multiplyScalar(-15);
    back.y += 5.2;
    const desired = plane.pos.clone().add(back);
    if (snap) camPos.copy(desired);
    else camPos.lerp(desired, Math.min(1, dt * 5));
    camera.position.copy(camPos);
    const look = plane.pos.clone().addScaledVector(fwd, 26);
    if (snap) camLook.copy(look);
    else camLook.lerp(look, Math.min(1, dt * 7));
    camera.lookAt(camLook);
    camera.up.copy(up);
  }

  // --- next-ring beacon ---
  const ring = ms.rings[ms.nextRing];
  if (ring) {
    const pulse = 1 + Math.sin(performance.now() / 240) * 0.08;
    ring.mesh.scale.setScalar(pulse);
  }

  // --- audio + HUD ---
  AudioSys.update(plane.throttle, clamp(plane.speed / 86, 0, 1), true);
  if (messageT > 0) messageT -= dt;
  drawHUD(hudCtx, hudCanvas.width, hudCanvas.height, {
    speedMs: plane.speed,
    pos: plane.pos,
    headingDeg: ((-plane.heading * 180) / Math.PI % 360 + 360) % 360,
    pitchDeg: (plane.pitch * 180) / Math.PI,
    rollRad: plane.bank,
    fuel: ms.fuel,
    throttle: plane.throttle,
    score: ms.score,
    ringsPassed: ms.nextRing,
    ringsTotal: ms.rings.length,
    timeLeft: ms.timeLeft,
    missionName: MISSIONS[missionIndex].name,
    message,
    messageT,
    camera: cameraMode,
    state,
    endLine,
  });
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());
  applyShot();
  step(dt);
  renderer.render(scene, camera);
}

let clock;
function init() {
  Input.init();
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.getElementById('game').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 5200);
  camera.position.set(0, 60, 220);

  world = buildWorld(scene);
  aircraft = buildAircraft();
  scene.add(aircraft.group);

  hudCanvas = document.getElementById('hud');
  hudCanvas.width = window.innerWidth;
  hudCanvas.height = window.innerHeight;
  hudCtx = hudCanvas.getContext('2d');

  ms = makeMissionState(MISSIONS[0], world);
  renderMissionList();
  document.getElementById('start').addEventListener('click', () => {
    AudioSys.init();
    resetPlane();
  });
  document.getElementById('menu').addEventListener('click', (e) => {
    if (e.target.id === 'menu') AudioSys.init();
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyC' && state === 'flying') {
      cameraMode = cameraMode === 'chase' ? 'cockpit' : 'chase';
      setMessage(cameraMode === 'cockpit' ? 'COCKPIT CAMERA' : 'CHASE CAMERA', 1.2);
    }
    if (e.code === 'KeyR' && (state === 'crashed' || state === 'complete')) resetPlane();
    if (e.code === 'Escape' && state !== 'menu') backToMenu();
    if (e.code === 'Enter' && state === 'menu') resetPlane();
    if (e.code === 'KeyM') AudioSys.muted = !AudioSys.muted;
  });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    hudCanvas.width = window.innerWidth;
    hudCanvas.height = window.innerHeight;
  });

  clock = new THREE.Clock();
  animate();
}

window.addEventListener('load', init);
