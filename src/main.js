import { DoublePendulum } from "./physics/DoublePendulum.js";
import { ChaosMetrics } from "./chaos/ChaosMetrics.js";
import { ParticleField } from "./particles/ParticleField.js";
import { interpolatePinkBlue } from "./render/color.js";
import { deriveSymmetry, deriveInitialAngles } from "./core/Seed.js";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const hud = document.getElementById("hud");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

// --- seed: 同じ値なら同じ構造が再現される。未指定ならその場で決まる一点もの ---
const seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
const { N: SYMMETRY, mirror: MIRROR } = deriveSymmetry(seed);
const { theta1, theta2 } = deriveInitialAngles(seed);

const pendulum = new DoublePendulum({ m1: 1, m2: 1, L1: 1, L2: 1, g: 9.81, theta1, theta2 });
const chaos = new ChaosMetrics(pendulum);
const field = new ParticleField({ maxParticles: 1200 });

const SCALE = 130; // 1m = 130px（field座標→画面座標）
const SUBSTEPS = 60;
const DT = 1 / 60 / SUBSTEPS;

function spawnParticles(chaosIndex) {
  const { x2, y2 } = pendulum.getPositions();
  const { vx2, vy2 } = pendulum.getVelocities();
  const color = interpolatePinkBlue(chaosIndex);
  const count = 1 + Math.floor(chaosIndex * 4);

  for (let i = 0; i < count; i++) {
    const jitter = 0.4 * chaosIndex;
    const vx = vx2 * 0.25 + (Math.random() - 0.5) * jitter;
    const vy = vy2 * 0.25 + (Math.random() - 0.5) * jitter;
    const life = 1.5 + Math.random() * 2.5;
    field.spawn(x2, y2, vx, vy, color, life);
  }
}

function step() {
  let chaosIndex = chaos.chaosIndex;
  for (let i = 0; i < SUBSTEPS; i++) {
    pendulum.step(DT);
    chaosIndex = chaos.step(DT);
  }
  spawnParticles(chaosIndex);
  field.update(1 / 60);
  return chaosIndex;
}

function drawParticlesTransformed(cosA, sinA, flip) {
  for (const p of field.particles) {
    let x = p.x * SCALE;
    const y = p.y * SCALE;
    if (flip) x = -x;
    const rx = x * cosA - y * sinA;
    const ry = x * sinA + y * cosA;

    const lifeFrac = 1 - p.age / p.life;
    ctx.globalAlpha = Math.max(lifeFrac, 0) * 0.8;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(rx, ry, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function draw(chaosIndex) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < SYMMETRY; i++) {
    const angle = (i / SYMMETRY) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    drawParticlesTransformed(cosA, sinA, false);
    if (MIRROR) drawParticlesTransformed(cosA, sinA, true);
  }
  ctx.restore();
}

let frame = 0;
function loop() {
  const chaosIndex = step();
  draw(chaosIndex);

  frame++;
  if (frame % 15 === 0) {
    hud.textContent = `seed=${seed} N=${SYMMETRY} mirror=${MIRROR} chaosIndex=${chaosIndex.toFixed(3)} particles=${field.particles.length}`;
  }

  requestAnimationFrame(loop);
}

ctx.fillStyle = "#000";
ctx.fillRect(0, 0, canvas.width, canvas.height);

loop();
