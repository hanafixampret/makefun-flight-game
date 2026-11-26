// Ridge Runner — the HUD: 2D canvas instruments drawn over the 3D view.
// Airspeed, altitude, compass, fuel, throttle, attitude ball, score and messages.
function drawHUD(ctx, W, H, S) {
  ctx.clearRect(0, 0, W, H);
  ctx.textBaseline = 'middle';
  const mono = '600 15px "Segoe UI", system-ui, sans-serif';
  const big = '700 34px "Segoe UI", system-ui, sans-serif';
  const huge = '800 44px "Segoe UI", system-ui, sans-serif';

  function panel(x, y, w, h, alpha) {
    ctx.fillStyle = `rgba(8, 14, 24, ${alpha})`;
    ctx.strokeStyle = 'rgba(140, 200, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
  }
  function label(text, x, y, font, color, align) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.fillText(text, x, y);
  }

  const kt = Math.round(S.speedMs * 1.94384);
  const ft = Math.round((S.pos.y - VALLEY_FLOOR) * 3.28084);
  const hdg = ((Math.round(S.headingDeg) % 360) + 360) % 360;

  // --- top-left: speed + altitude ---
  panel(18, 16, 210, 92, 0.55);
  label('AIRSPEED', 32, 34, mono, '#8fc8ff');
  label(String(kt), 32, 66, big, '#ffffff');
  label('KT', 118, 70, mono, '#8fc8ff');
  label('ALT  ' + ft + ' FT', 32, 94, mono, '#e8f2ff');

  // --- top-center: compass strip ---
  const cw = 340;
  const cx = (W - cw) / 2;
  panel(cx, 16, cw, 52, 0.55);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx, 16, cw, 52);
  ctx.clip();
  const points = [[0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'], [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW']];
  for (let d = -60; d <= 60; d += 5) {
    const a = ((hdg + d) % 360 + 360) % 360;
    const x = cx + cw / 2 + d * (cw / 130);
    const major = a % 45 === 0;
    ctx.strokeStyle = major ? '#ffffff' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, 26);
    ctx.lineTo(x, major ? 40 : 34);
    ctx.stroke();
    const pt = points.find((p) => p[0] === a);
    if (pt) label(pt[1], x, 54, '700 12px "Segoe UI", system-ui, sans-serif', '#ffffff', 'center');
  }
  ctx.restore();
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath();
  ctx.moveTo(cx + cw / 2, 16);
  ctx.lineTo(cx + cw / 2 - 6, 26);
  ctx.lineTo(cx + cw / 2 + 6, 26);
  ctx.closePath();
  ctx.fill();
  label(String(hdg).padStart(3, '0') + '°', cx + cw / 2, 62, '700 13px "Segoe UI", system-ui, sans-serif', '#ffd34d', 'center');

  // --- top-right: score, rings, timer ---
  panel(W - 228, 16, 210, 92, 0.55);
  label(S.missionName, W - 214, 34, mono, '#8fc8ff');
  label('SCORE ' + S.score, W - 214, 62, '700 20px "Segoe UI", system-ui, sans-serif', '#ffffff');
  label('RINGS ' + S.ringsPassed + '/' + S.ringsTotal, W - 214, 88, mono, '#e8f2ff');
  if (S.timeLeft !== null) {
    const t = Math.max(0, S.timeLeft);
    const mm = Math.floor(t / 60);
    const ss = Math.floor(t % 60).toString().padStart(2, '0');
    label(mm + ':' + ss, W - 32, 62, '700 20px "Segoe UI", system-ui, sans-serif', t < 30 ? '#ff6b5e' : '#ffffff', 'right');
  }

  // --- bottom-left: throttle bar ---
  panel(18, H - 118, 44, 100, 0.55);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(30, H - 104, 20, 72);
  const th = clamp(S.throttle, 0, 1);
  ctx.fillStyle = th > 0.85 ? '#ff6b5e' : '#37d67a';
  ctx.fillRect(30, H - 32 - 72 * th, 20, 72 * th);
  label('THR', 40, H - 16, '700 11px "Segoe UI", system-ui, sans-serif', '#8fc8ff', 'center');

  // --- bottom-right: fuel bar ---
  panel(W - 228, H - 58, 210, 40, 0.55);
  label('FUEL', W - 214, H - 38, mono, '#8fc8ff');
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(W - 168, H - 48, 132, 16);
  const fuel = clamp(S.fuel / 100, 0, 1);
  ctx.fillStyle = fuel < 0.25 ? '#ff6b5e' : fuel < 0.5 ? '#ffb02e' : '#37d67a';
  ctx.fillRect(W - 168, H - 48, 132 * fuel, 16);
  label(Math.round(S.fuel) + '%', W - 30, H - 38, mono, '#ffffff', 'right');

  // --- bottom-center: attitude ball ---
  const ax = W / 2;
  const ay = H - 62;
  const ar = 34;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ax, ay, ar, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(ax, ay);
  ctx.rotate(-S.rollRad);
  ctx.translate(0, clamp(S.pitchDeg, -30, 30) * 0.9);
  ctx.fillStyle = '#3f7fd0';
  ctx.fillRect(-ar - 4, -ar - 40, ar * 2 + 8, ar + 40);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-ar - 4, 0, ar * 2 + 8, ar + 40);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-ar, 0);
  ctx.lineTo(ar, 0);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(140, 200, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ax, ay, ar, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ax - 14, ay);
  ctx.lineTo(ax + 14, ay);
  ctx.stroke();

  // --- center message ---
  if (S.message && S.messageT > 0) {
    const a = clamp(S.messageT, 0, 1);
    ctx.globalAlpha = a;
    ctx.font = huge;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(8, 14, 24, 0.55)';
    const mw = ctx.measureText(S.message).width + 48;
    ctx.beginPath();
    ctx.roundRect(W / 2 - mw / 2, H * 0.3 - 34, mw, 68, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(S.message, W / 2, H * 0.3 + 2);
    ctx.globalAlpha = 1;
  }

  // --- end states ---
  if (S.state === 'crashed' || S.state === 'complete') {
    ctx.fillStyle = 'rgba(8, 12, 20, 0.45)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = huge;
    ctx.fillStyle = S.state === 'crashed' ? '#ff6b5e' : '#37d67a';
    ctx.fillText(S.state === 'crashed' ? 'CRASHED' : 'SORTIE COMPLETE', W / 2, H * 0.42);
    ctx.font = '600 20px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(S.endLine, W / 2, H * 0.42 + 44);
    ctx.fillText('Press R to fly again — C switches camera', W / 2, H * 0.42 + 76);
  }

  // --- cockpit frame overlay ---
  if (S.camera === 'cockpit') {
    ctx.fillStyle = 'rgba(10, 12, 16, 0.92)';
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, H - 90);
    ctx.quadraticCurveTo(W * 0.5, H - 150, W, H - 90);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(160, 180, 200, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, H - 90);
    ctx.quadraticCurveTo(W * 0.5, H - 150, W, H - 90);
    ctx.stroke();
    // Canopy pillars.
    ctx.fillStyle = 'rgba(10, 12, 16, 0.85)';
    ctx.fillRect(0, 0, 26, H);
    ctx.fillRect(W - 26, 0, 26, H);
  }

  // --- low fuel warning ---
  if (S.fuel < 25 && S.state === 'flying') {
    const blink = Math.floor(performance.now() / 400) % 2 === 0;
    if (blink) {
      ctx.font = '800 22px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff6b5e';
      ctx.fillText('LOW FUEL — LAND ON THE RUNWAY TO REFUEL', W / 2, 96);
    }
  }
}
