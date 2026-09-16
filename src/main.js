import { DoublePendulum } from "./physics/DoublePendulum.js";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const hud = document.getElementById("hud");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

const pendulum = new DoublePendulum({
  m1: 1,
  m2: 1,
  L1: 1,
  L2: 1,
  g: 9.81,
  theta1: Math.PI / 2,
  theta2: Math.PI / 2 + 0.001, // わずかな非対称でカオス性を早く引き出す
});

const SCALE = 150; // 1m = 150px
const SUBSTEPS = 60; // 1フレームあたりの積分回数（体感速度と精度のバランス）
const DT = 1 / 60 / SUBSTEPS;
const MAX_TRAIL = 2000;

const trail = [];
const energy0 = pendulum.getEnergy();

function originX() {
  return canvas.width / 2;
}
function originY() {
  return canvas.height / 3;
}

function step() {
  for (let i = 0; i < SUBSTEPS; i++) {
    pendulum.step(DT);
  }

  const { x1, y1, x2, y2 } = pendulum.getPositions();
  trail.push({ x: x2, y: y2 });
  if (trail.length > MAX_TRAIL) trail.shift();

  return { x1, y1, x2, y2 };
}

function draw({ x1, y1, x2, y2 }) {
  const ox = originX();
  const oy = originY();

  ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // trail (mass2の軌跡)
  ctx.beginPath();
  for (let i = 0; i < trail.length; i++) {
    const px = ox + trail[i].x * SCALE;
    const py = oy + trail[i].y * SCALE;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = "rgba(169, 214, 229, 0.35)"; // pale blue
  ctx.lineWidth = 1;
  ctx.stroke();

  const p1x = ox + x1 * SCALE;
  const p1y = oy + y1 * SCALE;
  const p2x = ox + x2 * SCALE;
  const p2y = oy + y2 * SCALE;

  // arms
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(p1x, p1y);
  ctx.lineTo(p2x, p2y);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // mass1 (pale pink)
  ctx.beginPath();
  ctx.arc(p1x, p1y, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#F7B8D0";
  ctx.fill();

  // mass2 (pale blue)
  ctx.beginPath();
  ctx.arc(p2x, p2y, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#A9D6E5";
  ctx.fill();
}

let frame = 0;
function loop() {
  const positions = step();
  draw(positions);

  frame++;
  if (frame % 15 === 0) {
    const e = pendulum.getEnergy();
    const drift = Math.abs(e - energy0);
    hud.textContent = `energy=${e.toFixed(6)}  drift=${drift.toExponential(3)}  frame=${frame}`;
  }

  requestAnimationFrame(loop);
}

// 初回は黒で塗りつぶす
ctx.fillStyle = "#000";
ctx.fillRect(0, 0, canvas.width, canvas.height);

loop();
