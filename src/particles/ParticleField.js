// パーティクル場：発生・寿命管理のみを担当する（描画・対称化はrender層の責務）
// z は振り子の位相空間のうち (x,y) には現れない成分（ω1由来）を写像した奥行き

export class ParticleField {
  constructor({ maxParticles = 800 } = {}) {
    this.particles = [];
    this.maxParticles = maxParticles;
  }

  spawn(x, y, z, vx, vy, vz, rgb, life) {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }
    this.particles.push({ x, y, z, vx, vy, vz, rgb, age: 0, life });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.age += dt;
      if (p.age >= p.life) {
        this.particles.splice(i, 1);
      }
    }
  }
}
