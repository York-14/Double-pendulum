// Volumetric Structure層：Particle Fieldを3D空間に配置し、放射対称に複製して描画する
// カメラを常時ゆっくり周回させることで、静止画ではなく空間として体験させる

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const SCALE = 3.2; // 1m(振り子座標) → 3Dワールド単位

export class VolumetricRenderer {
  constructor(canvas, { symmetry = 8, mirror = false, maxParticles = 800 } = {}) {
    this.symmetry = symmetry;
    this.mirror = mirror;
    this.copies = symmetry * (mirror ? 2 : 1);
    this.maxParticles = maxParticles;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.045);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 1);

    // パーティクル用バッファ（最大容量分を確保し、drawRangeで実使用数だけ描画）
    const capacity = this.maxParticles * this.copies;
    this.positions = new Float32Array(capacity * 3);
    this.colors = new Float32Array(capacity * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3));
    geometry.setDrawRange(0, 0);

    const material = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.55, // strength
      0.5, // radius
      0.3 // threshold
    );
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    this.mouse = { x: 0, y: 0 };
    window.addEventListener("pointermove", (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    });

    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  // 対称複製した頂点バッファを構築する
  updateParticles(particles, alphaFade) {
    const n = Math.min(particles.length, this.maxParticles);
    let idx = 0;

    for (let i = 0; i < n; i++) {
      const p = particles[i];
      const wx = p.x * SCALE;
      const wy = -p.y * SCALE; // 振り子のyは下向き正 → Three.jsは上向き正
      const wz = p.z * SCALE;

      const lifeFrac = Math.max(0, 1 - p.age / p.life);
      const [r, g, b] = p.rgb;
      const brightness = alphaFade ? lifeFrac : 1;

      for (let c = 0; c < this.symmetry; c++) {
        const angle = (c / this.symmetry) * Math.PI * 2;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        this.writeVertex(idx++, wx, wy, wz, cosA, sinA, r, g, b, brightness);
        if (this.mirror) {
          this.writeVertex(idx++, -wx, wy, wz, cosA, sinA, r, g, b, brightness);
        }
      }
    }

    this.points.geometry.setDrawRange(0, idx);
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }

  writeVertex(vi, x, y, z, cosA, sinA, r, g, b, brightness) {
    const rx = x * cosA + z * sinA;
    const rz = -x * sinA + z * cosA;

    const pi = vi * 3;
    this.positions[pi] = rx;
    this.positions[pi + 1] = y;
    this.positions[pi + 2] = rz;

    this.colors[pi] = r * brightness;
    this.colors[pi + 1] = g * brightness;
    this.colors[pi + 2] = b * brightness;
  }

  render(elapsed) {
    // 自動周回 + わずかなマウス視差で「空間の中にいる」感覚を出す
    const radius = 5.5 + Math.sin(elapsed * 0.05) * 1;
    const orbitAngle = elapsed * 0.08;
    this.camera.position.x = Math.sin(orbitAngle) * radius + this.mouse.x * 0.6;
    this.camera.position.z = Math.cos(orbitAngle) * radius;
    this.camera.position.y = 0.1 + Math.sin(elapsed * 0.07) * 0.4 - this.mouse.y * 0.6;
    this.camera.lookAt(0, -0.9, 0);

    this.composer.render();
  }
}
