// カオス指標の算出（ベネッティンのアルゴリズムによる局所リアプノフ指数の推定）
// メイン振り子に極めて近い初期値を持つ「ゴースト振り子」を並走させ、
// 位相空間上の分離速度から「今どれだけカオス的か」を0..1のスカラーに圧縮する。

import { DoublePendulum } from "../physics/DoublePendulum.js";

const EPSILON = 1e-8; // ゴーストとの初期分離距離

export class ChaosMetrics {
  constructor(pendulum, { window = 60, smoothing = 0.15, sensitivity = 0.3 } = {}) {
    this.main = pendulum;
    this.ghost = new DoublePendulum({
      m1: pendulum.m1,
      m2: pendulum.m2,
      L1: pendulum.L1,
      L2: pendulum.L2,
      g: pendulum.g,
      theta1: pendulum.state[0] + EPSILON,
      theta2: pendulum.state[1],
      omega1: pendulum.state[2],
      omega2: pendulum.state[3],
    });

    this.window = window; // 何ステップ分をまとめて1回の指数推定にするか
    this.smoothing = smoothing; // EMAの追従速度
    this.sensitivity = sensitivity; // ロジスティック関数の鋭さ

    this.sumLog = 0;
    this.count = 0;
    this.chaosIndex = 0.5; // 初期値は秩序/カオスの中庸
  }

  // メイン振り子は呼び出し側で既にstep済みである前提
  step(dt) {
    this.ghost.step(dt);

    const a = this.main.state;
    const b = this.ghost.state;
    let sumSq = 0;
    for (let i = 0; i < 4; i++) {
      const d = b[i] - a[i];
      sumSq += d * d;
    }
    const distance = Math.sqrt(sumSq) || EPSILON;

    this.sumLog += Math.log(distance / EPSILON);
    this.count++;

    // ベネッティンの再正規化：ゴーストをメインからEPSILON距離まで引き戻す
    // （そのままだと指数関数的に発散し、数値的に意味を失うため）
    const scale = EPSILON / distance;
    for (let i = 0; i < 4; i++) {
      this.ghost.state[i] = a[i] + (b[i] - a[i]) * scale;
    }

    if (this.count >= this.window) {
      const localExponent = this.sumLog / (this.count * dt);
      const normalized = 1 / (1 + Math.exp(-localExponent * this.sensitivity));
      this.chaosIndex += (normalized - this.chaosIndex) * this.smoothing;
      this.sumLog = 0;
      this.count = 0;
    }

    return this.chaosIndex;
  }
}
