import * as THREE from './vendor/three.module.js';

export class EffectsManager {
  constructor(scene) {
    this.scene = scene;
    this.activeAnimations = [];
    this.particles = [];
    this.floatingTexts = [];
    this.screenShake = 0;

    this._initParticlePool();
  }

  _initParticlePool() {
    this.pGeo = new THREE.BufferGeometry();
    const count = 300;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    this.pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.pMat = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });

    this.pointCloud = new THREE.Points(this.pGeo, this.pMat);
    this.scene.add(this.pointCloud);

    this.activeParticles = [];
  }

  startSwallowAnimation(propMesh, holePos, xp, onComplete, outerLayer = 'classic') {
    if (!propMesh) return;

    const startPos = propMesh.position.clone();
    const startScale = propMesh.scale.clone();
    const duration = 0.4;
    let elapsed = 0;

    this.activeAnimations.push({
      update: (dt) => {
        elapsed += dt;
        const progress = Math.min(1.0, elapsed / duration);
        const ease = progress * progress; // acceleration downwards

        // Tumble toward hole center
        propMesh.position.x = THREE.MathUtils.lerp(startPos.x, holePos.x, ease);
        propMesh.position.z = THREE.MathUtils.lerp(startPos.z, holePos.z, ease);
        propMesh.position.y = THREE.MathUtils.lerp(startPos.y, -4.5, ease);

        // Spin into vortex
        propMesh.rotation.x += 8.0 * dt;
        propMesh.rotation.z += 8.0 * dt;

        // Shrink
        const s = (1.0 - progress);
        propMesh.scale.set(startScale.x * s, startScale.y * s, startScale.z * s);

        if (progress >= 1.0) {
          if (onComplete) onComplete();
          return false; // remove
        }
        return true;
      }
    });

    // Spawn themed swallow particles based on skin outer layer
    this.spawnSparks(startPos.x, 0.5, startPos.z, xp > 100 ? 18 : 8, outerLayer);

    // Floating XP text
    this.spawnFloatingXp(startPos.x, startPos.z, xp);

    // Screen shake on big items
    if (xp >= 300) {
      this.screenShake = Math.min(1.2, this.screenShake + 0.4);
    }
  }

  spawnSparks(x, y, z, count = 10, outerLayer = 'classic') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.0 + Math.random() * 6.0;

      let r = 1.0, g = 0.8, b = 0.2;
      if (outerLayer === 'rose') {
        r = 0.95; g = 0.15; b = 0.25; // crimson
      } else if (outerLayer === 'peppa') {
        r = 1.0; g = 0.62; b = 0.73; // piggy pink
      } else if (outerLayer === 'saiyan') {
        r = 1.0; g = 0.9; b = 0.05; // golden ki
      } else if (outerLayer === 'neko') {
        r = 1.0; g = 0.45; b = 0.65; // sakura
      } else if (outerLayer === 'galaxy') {
        r = 0.65; g = 0.55; b = 1.0; // violet
      } else if (outerLayer === 'dragon') {
        r = 0.0; g = 0.95; b = 1.0; // cyan plasma
      }

      this.activeParticles.push({
        x,
        y,
        z,
        vx: Math.cos(angle) * speed,
        vy: 4.0 + Math.random() * 5.0,
        vz: Math.sin(angle) * speed,
        r,
        g,
        b,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.6
      });
    }
  }

  spawnFloatingXp(x, z, xp) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = xp >= 100 ? '#ffd700' : '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(`+${xp}`, 64, 32);
    ctx.fillText(`+${xp}`, 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(x, 2.5, z);
    sprite.scale.set(4, 2, 1);
    this.scene.add(sprite);

    let life = 0.8;
    this.floatingTexts.push({
      sprite,
      update: (dt) => {
        life -= dt;
        sprite.position.y += 3.5 * dt;
        spriteMat.opacity = Math.max(0, life / 0.8);
        if (life <= 0) {
          this.scene.remove(sprite);
          spriteMat.dispose();
          texture.dispose();
          return false;
        }
        return true;
      }
    });
  }

  update(dt) {
    // 1. Swallowing meshes
    for (let i = this.activeAnimations.length - 1; i >= 0; i--) {
      if (!this.activeAnimations[i].update(dt)) {
        this.activeAnimations.splice(i, 1);
      }
    }

    // 2. Floating XP texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      if (!this.floatingTexts[i].update(dt)) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 3. Particles
    const posAttr = this.pGeo.attributes.position;
    const colAttr = this.pGeo.attributes.color;
    let pCount = 0;

    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.activeParticles.splice(i, 1);
        continue;
      }

      p.vy -= 14.0 * dt; // gravity
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      if (pCount < 300) {
        posAttr.setXYZ(pCount, p.x, p.y, p.z);
        const alpha = p.life / p.maxLife;
        colAttr.setXYZ(pCount, p.r * alpha, p.g * alpha, p.b * alpha);
        pCount++;
      }
    }

    // Zero out unused particles
    for (let i = pCount; i < 300; i++) {
      posAttr.setXYZ(i, 0, -999, 0);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    // 4. Decay screen shake
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - 2.5 * dt);
    }
  }

  getShakeOffset() {
    if (this.screenShake <= 0) return { x: 0, y: 0, z: 0 };
    return {
      x: (Math.random() - 0.5) * this.screenShake * 1.5,
      y: (Math.random() - 0.5) * this.screenShake * 1.5,
      z: (Math.random() - 0.5) * this.screenShake * 1.5
    };
  }
}
