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

let pendulum = new DoublePendulum({ m1: 1, m2: 1, L1: 1, L2: 1, g: 9.81, theta1, theta2 });
let chaos = new ChaosMetrics(pendulum);
const field = new ParticleField({ maxParticles: 800 });

// 万一状態が発散/非数になった場合に、対称パラメータはそのままに物理だけを
// 新しい初期角度で仕切り直す（作品が止まらず「カオスと生成」を続けるための保険）
function resetPhysics() {
  const freshSeed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
  const angles = deriveInitialAngles(freshSeed);
  pendulum = new DoublePendulum({
    m1: 1,
    m2: 1,
    L1: 1,
    L2: 1,
    g: 9.81,
    theta1: angles.theta1,
    theta2: angles.theta2,
  });
  chaos = new ChaosMetrics(pendulum);
}
const renderer = new VolumetricRenderer(canvas, {
  symmetry: SYMMETRY,
  mirror: MIRROR,
  maxParticles: field.maxParticles,
});

const SUBSTEPS = 60;
const DT = 1 / 60 / SUBSTEPS;

// 振り子の瞬間速度は(エネルギー保存の範囲内で)理論上いくらでも大きくなり得る。
// 生の速度をそのまま初速に使うと、速い瞬間に生成された粒子が寿命の間に
// 画面外まで飛んでいき、カメラの自動フィット半径を無制限に押し広げてしまう
// （ズームアウトし続けて全体がどんどん小さく見える不具合の原因）。
// そのためxy平面・奥行きそれぞれで初速の大きさを頭打ちにする。
const MAX_XY_SPEED = 0.9;
const MAX_Z_SPEED = 0.35;

function clampMagnitude(x, y, max) {
  const mag = Math.hypot(x, y);
  if (mag <= max || mag === 0) return [x, y];
  const scale = max / mag;
  return [x * scale, y * scale];
}

function spawnParticles(chaosIndex) {
  const { x2, y2 } = pendulum.getPositions();
  const { vx2, vy2 } = pendulum.getVelocities();
  const omega1 = pendulum.state[2];
  const rgb = pinkBlueRGB(chaosIndex);
  const count = 1 + Math.floor(chaosIndex * 4);

  for (let i = 0; i < count; i++) {
    const jitter = 0.4 * chaosIndex;
    const [vx, vy] = clampMagnitude(
      vx2 * 0.25 + (Math.random() - 0.5) * jitter,
      vy2 * 0.25 + (Math.random() - 0.5) * jitter,
      MAX_XY_SPEED
    );
    // ω1（位相空間のうちx,yに現れない成分）を奥行きの初速に写像する
    const vzRaw = omega1 * 0.06 + (Math.random() - 0.5) * jitter * 0.5;
    const vz = Math.max(-MAX_Z_SPEED, Math.min(MAX_Z_SPEED, vzRaw));
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

  // 数値発散(非数化)を検知したら物理だけ仕切り直す。ここで止めずに
  // 「別の一点もの」として再生成を続けるのが、この作品の狙いに合う
  if (!pendulum.state.every(Number.isFinite) || !Number.isFinite(chaosIndex)) {
    resetPhysics();
    return chaos.chaosIndex;
  }

  spawnParticles(chaosIndex);
  field.update(1 / 60);
  return chaosIndex;
}

let frame = 0;
let start = performance.now();
function loop() {
  try {
    const chaosIndex = step();
    const elapsed = (performance.now() - start) / 1000;

    renderer.updateParticles(field.particles, true);
    renderer.render(elapsed);

    frame++;
    if (frame % 15 === 0) {
      hud.textContent = `seed=${seed} N=${SYMMETRY} mirror=${MIRROR} chaosIndex=${chaosIndex.toFixed(3)} particles=${field.particles.length}`;
    }
  } catch (err) {
    // 1フレームの異常でアニメーション全体を止めない。原因はHUDに出して継続する
    console.error("frame error:", err);
    hud.textContent = `recovering from error: ${err.message}`;
  }

  requestAnimationFrame(loop);
}

loop();
