// Ridge Runner — missions, rings, fuel, landing and crash rules.
// A mission is a sortie: rings to fly through, a clock, and a fuel tank.
const MISSIONS = [
  {
    id: 'rings',
    name: 'RING RUN',
    desc: 'Fly all 10 golden rings in order. Land on the runway to refuel.',
    ringCount: 10,
    timeLimit: 0,
    par: 240,
  },
  {
    id: 'dash',
    name: 'CANYON DASH',
    desc: 'Reach the far beacon in 150 seconds. Every ring is worth 100 points.',
    ringCount: 10,
    timeLimit: 150,
    par: 150,
  },
  {
    id: 'free',
    name: 'FREE FLIGHT',
    desc: 'Explore the valley. Rings respawn when you fly them all.',
    ringCount: 10,
    timeLimit: 0,
    par: 0,
  },
];

function makeMissionState(mission, world) {
  const rings = world.rings.slice(0, mission.ringCount).map((r) => ({
    pos: r.pos.clone(),
    mesh: r.mesh,
    passed: false,
  }));
  return {
    mission,
    rings,
    nextRing: 0,
    score: 0,
    fuel: 100,
    elapsed: 0,
    timeLeft: mission.timeLimit > 0 ? mission.timeLimit : null,
    landed: false,
  };
}

// Returns event strings for the frame: 'ring', 'lowfuel', 'landed', 'refueled',
// 'crashed', 'complete', 'timeout'. Mutates the state.
function updateMission(ms, planePos, speedMs, throttle, dt, airborne) {
  const events = [];
  ms.elapsed += dt;
  if (ms.timeLeft !== null) {
    ms.timeLeft -= dt;
    if (ms.timeLeft <= 0) {
      ms.timeLeft = 0;
      events.push('timeout');
    }
  }
  // Fuel burns with throttle while airborne.
  if (airborne) {
    ms.fuel -= dt * (1.1 + throttle * 2.4);
    if (ms.fuel < 25 && !ms.warnedLow) {
      ms.warnedLow = true;
      events.push('lowfuel');
    }
    if (ms.fuel <= 0) {
      ms.fuel = 0;
      events.push('flameout');
    }
  }
  // Next ring: a glowing torus the plane must pass through.
  const ring = ms.rings[ms.nextRing];
  if (ring) {
    const d = planePos.distanceTo(ring.pos);
    if (d < 15) {
      ring.passed = true;
      ring.mesh.material = ring.mesh.material.clone();
      ring.mesh.material.color.set(0x37d67a);
      ring.mesh.material.emissive.set(0x1d7a44);
      ms.score += 100;
      ms.nextRing++;
      events.push('ring');
      if (ms.nextRing >= ms.rings.length) {
        if (ms.mission.id === 'free') {
          // Respawn the course for free flight.
          for (const r of ms.rings) {
            r.passed = false;
            r.mesh.material.color.set(0xffb400);
            r.mesh.material.emissive.set(0xcc7a00);
          }
          ms.nextRing = 0;
        } else {
          const bonus = ms.mission.par > 0 ? Math.max(0, Math.round((ms.mission.par - ms.elapsed) * 5)) : 0;
          ms.score += bonus;
          events.push('complete');
        }
      }
    }
  }
  return events;
}

function onRunway(planePos) {
  return Math.abs(planePos.x) < 11 && planePos.z > -40 && planePos.z < 200;
}

// A gentle touchdown on the strip: refuel and repair, no crash.
function tryLand(ms, planePos, verticalSpeedMs, speedMs) {
  if (!onRunway(planePos)) return false;
  if (Math.abs(verticalSpeedMs) > 9) return false;
  if (speedMs > 48) return false;
  if (ms.fuel < 100) {
    ms.fuel = 100;
    ms.warnedLow = false;
    return 'refueled';
  }
  return 'landed';
}
