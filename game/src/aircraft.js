// Ridge Runner — the aircraft: a low-poly bush plane built from primitives.
// Red and cream livery, spinning prop, wingtip nav lights, moving control surfaces.
function buildAircraft() {
  const group = new THREE.Group();
  const red = new THREE.MeshLambertMaterial({ color: 0xc23b2e });
  const cream = new THREE.MeshLambertMaterial({ color: 0xf2ead8 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x2c313a });
  const glass = new THREE.MeshLambertMaterial({ color: 0x9fc4d8, transparent: true, opacity: 0.35 });

  // Fuselage: tapered cylinder along Z (nose toward -Z).
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.45, 5.4, 12), red);
  fuselage.rotation.x = Math.PI / 2;
  group.add(fuselage);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.3, 12), dark);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -3.3;
  group.add(nose);
  // Canopy.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.95, 14, 10), glass);
  canopy.scale.set(0.85, 0.62, 1.5);
  canopy.position.set(0, 0.75, -0.9);
  group.add(canopy);
  // Main wing with red tips.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(11, 0.26, 2.3), cream);
  wing.position.set(0, 0.15, -0.4);
  group.add(wing);
  for (const side of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 2.3), red);
    tip.position.set(side * 5.1, 0.15, -0.4);
    group.add(tip);
  }
  // Tailplane and fin.
  const tailplane = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.18, 1.3), cream);
  tailplane.position.set(0, 0.25, 2.5);
  group.add(tailplane);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.7, 1.5), red);
  fin.position.set(0, 0.95, 2.5);
  group.add(fin);
  // Propeller group at the nose (spins around Z). Blades get their own
  // material so the cockpit view can fade them to a translucent disc.
  const prop = new THREE.Group();
  prop.position.z = -4.05;
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), dark);
  prop.add(hub);
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0x3a3f47 });
  const blades = [];
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.1, 0.1), bladeMat);
    blade.rotation.z = a;
    prop.add(blade);
    blades.push(blade);
  }
  group.add(prop);
  // Landing gear.
  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6), dark);
    strut.position.set(side * 0.8, -0.9, -0.9);
    strut.rotation.z = side * 0.25;
    group.add(strut);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 1.05, -1.35, -0.9);
    group.add(wheel);
  }
  // Nav lights: red left, green right, white tail.
  const lightGeo = new THREE.SphereGeometry(0.16, 8, 6);
  const leftLight = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0xff2020 }));
  leftLight.position.set(-5.6, 0.15, -0.4);
  group.add(leftLight);
  const rightLight = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0x20ff40 }));
  rightLight.position.set(5.6, 0.15, -0.4);
  group.add(rightLight);
  const tailLight = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
  tailLight.position.set(0, 0.3, 3.1);
  group.add(tailLight);

  // Control surfaces for animation: ailerons lean with bank, elevator with pitch.
  const aileronL = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.7), red);
  aileronL.position.set(-3.6, 0.15, 0.55);
  group.add(aileronL);
  const aileronR = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.7), red);
  aileronR.position.set(3.6, 0.15, 0.55);
  group.add(aileronR);
  const elevator = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 0.6), red);
  elevator.position.set(0, 0.25, 3.2);
  group.add(elevator);

  return { group, prop, blades, aileronL, aileronR, elevator };
}

function updateAircraftVisual(plane, dt, throttle, bankInput, pitchInput) {
  // Propeller spins faster with throttle.
  plane.prop.rotation.z -= dt * (4 + throttle * 55);
  // Ailerons deflect opposite with bank input; elevator with pitch input.
  const targetA = clamp(bankInput, -1, 1) * 0.45;
  plane.aileronL.rotation.x += (targetA - plane.aileronL.rotation.x) * Math.min(1, dt * 8);
  plane.aileronR.rotation.x += (-targetA - plane.aileronR.rotation.x) * Math.min(1, dt * 8);
  const targetE = clamp(pitchInput, -1, 1) * 0.4;
  plane.elevator.rotation.x += (targetE - plane.elevator.rotation.x) * Math.min(1, dt * 8);
}
