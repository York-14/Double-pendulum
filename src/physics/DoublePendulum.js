// 二重振り子の状態積分（ラグランジュ力学 + RK4）
// state = [theta1, theta2, omega1, omega2]

export class DoublePendulum {
  constructor({
    m1 = 1,
    m2 = 1,
    L1 = 1,
    L2 = 1,
    g = 9.81,
    theta1 = Math.PI / 2,
    theta2 = Math.PI / 2,
    omega1 = 0,
    omega2 = 0,
  } = {}) {
    this.m1 = m1;
    this.m2 = m2;
    this.L1 = L1;
    this.L2 = L2;
    this.g = g;
    this.state = [theta1, theta2, omega1, omega2];
  }

  // dstate/dt を返す
  derivatives(state) {
    const [theta1, theta2, omega1, omega2] = state;
    const { m1, m2, L1, L2, g } = this;

    const delta = theta1 - theta2;
    const den1 = L1 * (2 * m1 + m2 - m2 * Math.cos(2 * theta1 - 2 * theta2));
    const den2 = L2 * (2 * m1 + m2 - m2 * Math.cos(2 * theta1 - 2 * theta2));

    const domega1 =
      (-g * (2 * m1 + m2) * Math.sin(theta1) -
        m2 * g * Math.sin(theta1 - 2 * theta2) -
        2 *
          Math.sin(delta) *
          m2 *
          (omega2 * omega2 * L2 + omega1 * omega1 * L1 * Math.cos(delta))) /
      den1;

    const domega2 =
      (2 *
        Math.sin(delta) *
        (omega1 * omega1 * L1 * (m1 + m2) +
          g * (m1 + m2) * Math.cos(theta1) +
          omega2 * omega2 * L2 * m2 * Math.cos(delta))) /
      den2;

    return [omega1, omega2, domega1, domega2];
  }

  // RK4で1ステップ進める
  step(dt) {
    const s = this.state;
    const k1 = this.derivatives(s);
    const s2 = s.map((v, i) => v + (dt / 2) * k1[i]);
    const k2 = this.derivatives(s2);
    const s3 = s.map((v, i) => v + (dt / 2) * k2[i]);
    const k3 = this.derivatives(s3);
    const s4 = s.map((v, i) => v + dt * k3[i]);
    const k4 = this.derivatives(s4);

    this.state = s.map(
      (v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
    );
    return this.state;
  }

  // 質点1・質点2の直交座標（振り子の支点を原点とする）
  getPositions() {
    const [theta1, theta2] = this.state;
    const { L1, L2 } = this;
    const x1 = L1 * Math.sin(theta1);
    const y1 = L1 * Math.cos(theta1);
    const x2 = x1 + L2 * Math.sin(theta2);
    const y2 = y1 + L2 * Math.cos(theta2);
    return { x1, y1, x2, y2 };
  }

  // 質点1・質点2の速度ベクトル（位置の解析的な時間微分）
  getVelocities() {
    const [theta1, theta2, omega1, omega2] = this.state;
    const { L1, L2 } = this;
    const vx1 = L1 * Math.cos(theta1) * omega1;
    const vy1 = -L1 * Math.sin(theta1) * omega1;
    const vx2 = vx1 + L2 * Math.cos(theta2) * omega2;
    const vy2 = vy1 - L2 * Math.sin(theta2) * omega2;
    return { vx1, vy1, vx2, vy2 };
  }

  // 全エネルギー（積分の妥当性検証用。理論上はほぼ一定に保たれる）
  getEnergy() {
    const [theta1, theta2, omega1, omega2] = this.state;
    const { m1, m2, L1, L2, g } = this;

    const T =
      0.5 * m1 * L1 * L1 * omega1 * omega1 +
      0.5 *
        m2 *
        (L1 * L1 * omega1 * omega1 +
          L2 * L2 * omega2 * omega2 +
          2 * L1 * L2 * omega1 * omega2 * Math.cos(theta1 - theta2));

    const V =
      -(m1 + m2) * g * L1 * Math.cos(theta1) - m2 * g * L2 * Math.cos(theta2);

    return T + V;
  }
}
