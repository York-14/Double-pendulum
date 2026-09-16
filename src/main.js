import { DoublePendulum } from "./physics/DoublePendulum.js";
import { ChaosMetrics } from "./chaos/ChaosMetrics.js";
import { ParticleField } from "./particles/ParticleField.js";
import { pinkBlueRGB } from "./render/color.js";
import { deriveSymmetry, deriveInitialAngles } from "./core/Seed.js";
import { VolumetricRenderer } from "./render/VolumetricRenderer.js";

const canvas = document.getElementById("canvas");
const hud = document.getElementById("hud");

// --- seed: 同じ値なら同じ構造が再現される。未指定ならその場で決まる一点もの ---
const seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
const { N: SYMMETRY, mirror: MIRROR } = deriveSymmetry(seed);
const { theta1, theta2 } = deriveInitialAngles(seed);

const pendulum = new DoublePendulum({ m1: 1, m2: 1, L1: 1, L2: 1, g: 9.81, theta1, theta2 });
const chaos = new ChaosMetrics(pendulum);
const field = new ParticleField({ maxParticles: 800 });
const renderer = new VolumetricRenderer(canvas, {
  symmetry: SYMMETRY,
  mirror: MIRROR,
  maxParticles: field.maxParticles,
});

const SUBSTEPS = 60;
const DT = 1 / 60 / SUBSTEPS;

function spawnParticles(chaosIndex) {
  const { x2, y2 } = pendulum.getPositions();
  const { vx2, vy2 } = pendulum.getVelocities();
  const omega1 = pendulum.state[2];
  const rgb = pinkBlueRGB(chaosIndex);
  const count = 1 + Math.floor(chaosIndex * 4);

  for (let i = 0; i < count; i++) {
    const jitter = 0.4 * chaosIndex;
    const vx = vx2 * 0.25 + (Math.random() - 0.5) * jitter;
    const vy = vy2 * 0.25 + (Math.random() - 0.5) * jitter;
    // ω1（位相空間のうちx,yに現れない成分）を奥行きの初速に写像する
    const vz = omega1 * 0.06 + (Math.random() - 0.5) * jitter * 0.5;
    const life = 1.5 + Math.random() * 2.5;
    field.spawn(x2, y2, 0, vx, vy, vz, rgb, life);
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

let frame = 0;
let start = performance.now();
function loop() {
  const chaosIndex = step();
  const elapsed = (performance.now() - start) / 1000;

  renderer.updateParticles(field.particles, true);
  renderer.render(elapsed);

  frame++;
  if (frame % 15 === 0) {
    hud.textContent = `seed=${seed} N=${SYMMETRY} mirror=${MIRROR} chaosIndex=${chaosIndex.toFixed(3)} particles=${field.particles.length}`;
  }

  requestAnimationFrame(loop);
}

loop();
