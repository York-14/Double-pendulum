// パーティクル場：発生・寿命管理のみを担当する（描画・対称化はrender層の責務）

export class ParticleField {
  constructor({ maxParticles = 1500 } = {}) {
    this.particles = [];
    this.maxParticles = maxParticles;
  }

  spawn(x, y, vx, vy, color, life) {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }
    this.particles.push({ x, y, vx, vy, color, age: 0, life });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.age += dt;
      if (p.age >= p.life) {
        this.particles.splice(i, 1);
      }
    }
  }
}
