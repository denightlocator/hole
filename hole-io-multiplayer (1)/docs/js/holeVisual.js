import * as THREE from './vendor/three.module.js';

export class HoleVisual {
  constructor(scene, entityData, isLocal = false) {
    this.scene = scene;
    this.id = entityData.id;
    this.name = entityData.name || 'Player';
    this.skinId = entityData.skinId || 'peppa-pig';
    this.skinHex = entityData.skinHex || 0xff9ebb;
    this.outerLayer = entityData.outerLayer || 'peppa';
    this.isLocal = isLocal;

    this.currentRadius = entityData.radius || 1.8;
    this.targetRadius = this.currentRadius;

    this.x = entityData.x || 0;
    this.z = entityData.z || 0;
    this.targetX = this.x;
    this.targetZ = this.z;

    this.angle = 0;
    this.targetAngle = 0;
    this.isBoosting = false;
    this.alive = true;

    this.group = new THREE.Group();
    this.group.position.set(this.x, 0, this.z);

    this.outerAnimTime = Math.random() * 10;

    this._buildHoleMesh();
    this._buildOuterLayer();
    this._buildNameplate();

    this.scene.add(this.group);
  }

  _buildVortexCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);

    switch (this.outerLayer) {
      case 'peppa':
        grad.addColorStop(0, '#1a0b0d');
        grad.addColorStop(0.6, '#3d1c24');
        grad.addColorStop(0.9, '#632537');
        grad.addColorStop(1.0, '#ff9ebb');
        break;
      case 'dora':
        grad.addColorStop(0, '#1a1005');
        grad.addColorStop(0.6, '#3e2308');
        grad.addColorStop(0.9, '#6d3c0e');
        grad.addColorStop(1.0, '#f39c12');
        break;
      case 'rose':
        grad.addColorStop(0, '#1a0507');
        grad.addColorStop(0.6, '#400a10');
        grad.addColorStop(0.9, '#78121d');
        grad.addColorStop(1.0, '#e74c3c');
        break;
      case 'neko':
        grad.addColorStop(0, '#190a14');
        grad.addColorStop(0.6, '#3d1630');
        grad.addColorStop(0.9, '#702558');
        grad.addColorStop(1.0, '#ff7675');
        break;
      case 'saiyan':
        grad.addColorStop(0, '#1c1602');
        grad.addColorStop(0.6, '#453504');
        grad.addColorStop(0.9, '#826409');
        grad.addColorStop(1.0, '#ffd700');
        break;
      case 'crown':
        grad.addColorStop(0, '#141103');
        grad.addColorStop(0.6, '#382e05');
        grad.addColorStop(0.9, '#6e5a0c');
        grad.addColorStop(1.0, '#f1c40f');
        break;
      case 'dragon':
        grad.addColorStop(0, '#021217');
        grad.addColorStop(0.6, '#062d3a');
        grad.addColorStop(0.9, '#0a5269');
        grad.addColorStop(1.0, '#00f2fe');
        break;
      case 'galaxy':
        grad.addColorStop(0, '#0d071a');
        grad.addColorStop(0.6, '#211042');
        grad.addColorStop(0.9, '#421f82');
        grad.addColorStop(1.0, '#a29bfe');
        break;
      default:
        grad.addColorStop(0, '#020205');
        grad.addColorStop(0.7, '#070b19');
        grad.addColorStop(0.92, '#101726');
        grad.addColorStop(1.0, '#1a233a');
        break;
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(128, 128, 126, 0, Math.PI * 2);
    ctx.fill();

    // Spiral swirl accents
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 6; a += 0.1) {
      const r = (a / (Math.PI * 6)) * 120;
      const x = 128 + Math.cos(a) * r;
      const y = 128 + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Special icons drawn on vortex center
    if (this.outerLayer === 'peppa') {
      // Mud bubbles
      ctx.fillStyle = 'rgba(255, 158, 187, 0.4)';
      ctx.beginPath();
      ctx.arc(100, 110, 14, 0, Math.PI * 2);
      ctx.arc(150, 140, 10, 0, Math.PI * 2);
      ctx.arc(120, 160, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.outerLayer === 'rose') {
      // Rose petal swirl
      ctx.fillStyle = 'rgba(231, 76, 60, 0.35)';
      ctx.beginPath();
      ctx.arc(128, 128, 28, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas;
  }

  _buildHoleMesh() {
    const canvas = this._buildVortexCanvas();
    const texture = new THREE.CanvasTexture(canvas);

    const discGeo = new THREE.CircleGeometry(1, 36);
    const discMat = new THREE.MeshBasicMaterial({
      map: texture,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    this.discMesh = new THREE.Mesh(discGeo, discMat);
    this.discMesh.rotation.x = -Math.PI / 2;
    this.discMesh.position.y = 0.04;
    this.group.add(this.discMesh);

    // Glowing perimeter ring / event horizon
    const ringGeo = new THREE.RingGeometry(0.92, 1.05, 40);
    this.ringMat = new THREE.MeshBasicMaterial({
      color: this.skinHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    this.ringMesh = new THREE.Mesh(ringGeo, this.ringMat);
    this.ringMesh.rotation.x = -Math.PI / 2;
    this.ringMesh.position.y = 0.05;
    this.group.add(this.ringMesh);

    // Inner glow
    const glowGeo = new THREE.RingGeometry(0.82, 0.94, 32);
    this.glowMat = new THREE.MeshBasicMaterial({
      color: this.skinHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    });
    this.glowMesh = new THREE.Mesh(glowGeo, this.glowMat);
    this.glowMesh.rotation.x = -Math.PI / 2;
    this.glowMesh.position.y = 0.045;
    this.group.add(this.glowMesh);

    this._applyScale(this.currentRadius);
  }

  _buildOuterLayer() {
    this.outerLayerGroup = new THREE.Group();
    this.outerLayerGroup.position.y = 0.06;

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
    const sphereGeo = new THREE.SphereGeometry(1, 10, 10);
    const coneGeo = new THREE.ConeGeometry(1, 1, 12);

    switch (this.outerLayer) {
      case 'peppa': {
        // 🐷 PEPPA PIG 3D OUTER LAYER
        const pinkMat = new THREE.MeshLambertMaterial({ color: 0xff9ebb });
        const darkPinkMat = new THREE.MeshLambertMaterial({ color: 0xff4081 });
        const blushMat = new THREE.MeshLambertMaterial({ color: 0xff70a0, transparent: true, opacity: 0.85 });
        const nostrilMat = new THREE.MeshBasicMaterial({ color: 0x4a1224 });

        // Left Ear
        const leftEar = new THREE.Mesh(cylGeo, pinkMat);
        leftEar.scale.set(0.16, 0.38, 0.1);
        leftEar.position.set(-0.62, 0.16, -0.88);
        leftEar.rotation.z = -0.35;
        this.outerLayerGroup.add(leftEar);
        this.peppaLeftEar = leftEar;

        const leftEarInner = new THREE.Mesh(cylGeo, darkPinkMat);
        leftEarInner.scale.set(0.1, 0.28, 0.08);
        leftEarInner.position.set(-0.62, 0.17, -0.88);
        leftEarInner.rotation.z = -0.35;
        this.outerLayerGroup.add(leftEarInner);

        // Right Ear
        const rightEar = new THREE.Mesh(cylGeo, pinkMat);
        rightEar.scale.set(0.16, 0.38, 0.1);
        rightEar.position.set(0.62, 0.16, -0.88);
        rightEar.rotation.z = 0.35;
        this.outerLayerGroup.add(rightEar);
        this.peppaRightEar = rightEar;

        const rightEarInner = new THREE.Mesh(cylGeo, darkPinkMat);
        rightEarInner.scale.set(0.1, 0.28, 0.08);
        rightEarInner.position.set(0.62, 0.17, -0.88);
        rightEarInner.rotation.z = 0.35;
        this.outerLayerGroup.add(rightEarInner);

        // Cute Pig Snout on front rim
        const snout = new THREE.Mesh(cylGeo, darkPinkMat);
        snout.scale.set(0.26, 0.18, 0.22);
        snout.position.set(0, 0.12, 0.98);
        snout.rotation.x = Math.PI / 2;
        this.outerLayerGroup.add(snout);

        // Nostril dots
        const n1 = new THREE.Mesh(cylGeo, nostrilMat);
        n1.scale.set(0.04, 0.02, 0.04);
        n1.position.set(-0.08, 0.13, 1.08);
        n1.rotation.x = Math.PI / 2;
        this.outerLayerGroup.add(n1);

        const n2 = n1.clone();
        n2.position.x = 0.08;
        this.outerLayerGroup.add(n2);

        // Blushing Cheeks
        const cheek1 = new THREE.Mesh(sphereGeo, blushMat);
        cheek1.scale.set(0.16, 0.08, 0.16);
        cheek1.position.set(-0.95, 0.06, 0.3);
        this.outerLayerGroup.add(cheek1);

        const cheek2 = cheek1.clone();
        cheek2.position.x = 0.95;
        this.outerLayerGroup.add(cheek2);
        break;
      }

      case 'dora': {
        // 🎒 DORA EXPLORER 3D OUTER LAYER
        const hairMat = new THREE.MeshLambertMaterial({ color: 0x3d2314 }); // Dark brown
        const purpleMat = new THREE.MeshLambertMaterial({ color: 0x8e44ad });
        const yellowMat = new THREE.MeshLambertMaterial({ color: 0xf1c40f });
        const goldMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });

        // Explorer Bob Haircut fringe around back/sides
        for (let i = 0; i < 9; i++) {
          const a = Math.PI * 0.75 + (i / 8) * Math.PI * 1.5;
          const hairStrand = new THREE.Mesh(sphereGeo, hairMat);
          hairStrand.scale.set(0.22, 0.26, 0.22);
          hairStrand.position.set(Math.cos(a) * 1.02, 0.14, Math.sin(a) * 1.02);
          this.outerLayerGroup.add(hairStrand);
        }

        // Explorer Backpack Charm on back rim
        const pack = new THREE.Mesh(boxGeo, purpleMat);
        pack.scale.set(0.38, 0.28, 0.25);
        pack.position.set(0, 0.18, -1.02);
        this.outerLayerGroup.add(pack);

        const strap1 = new THREE.Mesh(boxGeo, yellowMat);
        strap1.scale.set(0.06, 0.29, 0.26);
        strap1.position.set(-0.1, 0.18, -1.02);
        this.outerLayerGroup.add(strap1);

        const strap2 = strap1.clone();
        strap2.position.x = 0.1;
        this.outerLayerGroup.add(strap2);

        // Golden Explorer Star Crest on front rim
        const star = new THREE.Mesh(coneGeo, goldMat);
        star.scale.set(0.2, 0.08, 0.2);
        star.position.set(0, 0.12, 1.0);
        this.outerLayerGroup.add(star);
        break;
      }

      case 'rose': {
        // 🌹 ROSE BLOOM 3D OUTER LAYER
        const petalMat = new THREE.MeshLambertMaterial({ color: 0xd63031 });
        const innerPetalMat = new THREE.MeshLambertMaterial({ color: 0xad1d1d });
        const leafMat = new THREE.MeshLambertMaterial({ color: 0x27ae60 });

        // 12 Sculpted Rose Petals forming a blooming collar
        this.rosePetals = [];
        const petalCount = 12;
        for (let i = 0; i < petalCount; i++) {
          const a = (i / petalCount) * Math.PI * 2;
          const petal = new THREE.Mesh(sphereGeo, (i % 2 === 0 ? petalMat : innerPetalMat));
          petal.scale.set(0.32, 0.12, 0.24);
          petal.position.set(Math.cos(a) * 1.02, 0.12, Math.sin(a) * 1.02);
          petal.rotation.y = -a;
          petal.rotation.x = 0.35;
          this.outerLayerGroup.add(petal);
          this.rosePetals.push(petal);
        }

        // 4 Green Botanical Leaves
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          const leaf = new THREE.Mesh(coneGeo, leafMat);
          leaf.scale.set(0.22, 0.45, 0.08);
          leaf.position.set(Math.cos(a) * 1.18, 0.05, Math.sin(a) * 1.18);
          leaf.rotation.z = Math.PI / 2;
          leaf.rotation.y = -a;
          this.outerLayerGroup.add(leaf);
        }
        break;
      }

      case 'neko': {
        // 🐱 ANIME NEKO / CATGIRL 3D OUTER LAYER
        const furMat = new THREE.MeshLambertMaterial({ color: 0xff7675 });
        const innerFurMat = new THREE.MeshLambertMaterial({ color: 0xffd1dc });
        const heartMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
        const whiskerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        // Left Cat Ear
        const leftEar = new THREE.Mesh(coneGeo, furMat);
        leftEar.scale.set(0.24, 0.45, 0.18);
        leftEar.position.set(-0.65, 0.22, -0.85);
        leftEar.rotation.z = -0.3;
        this.outerLayerGroup.add(leftEar);
        this.nekoLeftEar = leftEar;

        const leftEarIn = new THREE.Mesh(coneGeo, innerFurMat);
        leftEarIn.scale.set(0.16, 0.32, 0.12);
        leftEarIn.position.set(-0.65, 0.23, -0.82);
        leftEarIn.rotation.z = -0.3;
        this.outerLayerGroup.add(leftEarIn);

        // Right Cat Ear
        const rightEar = new THREE.Mesh(coneGeo, furMat);
        rightEar.scale.set(0.24, 0.45, 0.18);
        rightEar.position.set(0.65, 0.22, -0.85);
        rightEar.rotation.z = 0.3;
        this.outerLayerGroup.add(rightEar);
        this.nekoRightEar = rightEar;

        const rightEarIn = new THREE.Mesh(coneGeo, innerFurMat);
        rightEarIn.scale.set(0.16, 0.32, 0.12);
        rightEarIn.position.set(0.65, 0.23, -0.82);
        rightEarIn.rotation.z = 0.3;
        this.outerLayerGroup.add(rightEarIn);

        // Whiskers on sides
        [-1, 1].forEach(side => {
          [-0.1, 0, 0.1].forEach(offsetY => {
            const whisker = new THREE.Mesh(boxGeo, whiskerMat);
            whisker.scale.set(0.35, 0.02, 0.02);
            whisker.position.set(side * 1.15, 0.08 + offsetY, 0);
            whisker.rotation.z = side * offsetY * 2;
            this.outerLayerGroup.add(whisker);
          });
        });

        // Glowing Heart Crest on front
        const heart = new THREE.Mesh(sphereGeo, heartMat);
        heart.scale.set(0.18, 0.18, 0.12);
        heart.position.set(0, 0.14, 0.98);
        this.outerLayerGroup.add(heart);
        break;
      }

      case 'saiyan': {
        // ⚡ ANIME SAIYAN 3D OUTER LAYER (Golden Ki Spikes)
        const kiMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
        const kiInnerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        this.saiyanSpikes = [];
        const spikeCount = 10;
        for (let i = 0; i < spikeCount; i++) {
          const a = (i / spikeCount) * Math.PI * 2;
          const spike = new THREE.Mesh(coneGeo, kiMat);
          spike.scale.set(0.18, 0.55, 0.18);
          spike.position.set(Math.cos(a) * 1.05, 0.15, Math.sin(a) * 1.05);
          spike.rotation.x = Math.PI / 2;
          spike.rotation.z = -a;
          this.outerLayerGroup.add(spike);
          this.saiyanSpikes.push(spike);

          // Inner white energy core
          const core = new THREE.Mesh(coneGeo, kiInnerMat);
          core.scale.set(0.09, 0.35, 0.09);
          core.position.copy(spike.position);
          core.rotation.copy(spike.rotation);
          this.outerLayerGroup.add(core);
        }
        break;
      }

      case 'crown': {
        // 👑 ROYAL CROWN 3D OUTER LAYER
        const goldMat = new THREE.MeshLambertMaterial({ color: 0xf1c40f });
        const rubyMat = new THREE.MeshBasicMaterial({ color: 0xe74c3c });
        const sapphireMat = new THREE.MeshBasicMaterial({ color: 0x3498db });

        const spikeCount = 8;
        for (let i = 0; i < spikeCount; i++) {
          const a = (i / spikeCount) * Math.PI * 2;
          // Crown prong
          const prong = new THREE.Mesh(coneGeo, goldMat);
          prong.scale.set(0.16, 0.42, 0.16);
          prong.position.set(Math.cos(a) * 1.02, 0.22, Math.sin(a) * 1.02);
          this.outerLayerGroup.add(prong);

          // Jewel on top of prong
          const jewelMat = i % 2 === 0 ? rubyMat : sapphireMat;
          const jewel = new THREE.Mesh(sphereGeo, jewelMat);
          jewel.scale.set(0.08, 0.08, 0.08);
          jewel.position.set(Math.cos(a) * 1.02, 0.44, Math.sin(a) * 1.02);
          this.outerLayerGroup.add(jewel);
        }
        break;
      }

      case 'dragon': {
        // 🐉 CYBER DRAGON 3D OUTER LAYER
        const hornMat = new THREE.MeshLambertMaterial({ color: 0x00f2fe });
        const spineMat = new THREE.MeshLambertMaterial({ color: 0x0984e3 });

        // Left Dragon Horn
        const leftHorn = new THREE.Mesh(coneGeo, hornMat);
        leftHorn.scale.set(0.18, 0.7, 0.18);
        leftHorn.position.set(-0.7, 0.35, 0.4);
        leftHorn.rotation.x = -0.5;
        leftHorn.rotation.z = -0.4;
        this.outerLayerGroup.add(leftHorn);

        // Right Dragon Horn
        const rightHorn = new THREE.Mesh(coneGeo, hornMat);
        rightHorn.scale.set(0.18, 0.7, 0.18);
        rightHorn.position.set(0.7, 0.35, 0.4);
        rightHorn.rotation.x = -0.5;
        rightHorn.rotation.z = 0.4;
        this.outerLayerGroup.add(rightHorn);

        // 5 Dorsal Spine Scales along the back
        for (let i = 0; i < 5; i++) {
          const a = Math.PI * 0.8 + (i / 4) * Math.PI * 0.4;
          const spine = new THREE.Mesh(coneGeo, spineMat);
          spine.scale.set(0.14, 0.38, 0.08);
          spine.position.set(Math.cos(a) * 1.04, 0.18, Math.sin(a) * 1.04);
          spine.rotation.y = -a;
          this.outerLayerGroup.add(spine);
        }
        break;
      }

      case 'galaxy': {
        // 🌌 COSMIC GALAXY 3D OUTER LAYER (Planetary Rings & Orbiting Moons)
        const ringGeo = new THREE.RingGeometry(1.15, 1.35, 36);
        const saturnRingMat = new THREE.MeshBasicMaterial({
          color: 0xa29bfe,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65
        });
        const ringMesh = new THREE.Mesh(ringGeo, saturnRingMat);
        ringMesh.rotation.x = -Math.PI / 2.3;
        ringMesh.position.y = 0.1;
        this.outerLayerGroup.add(ringMesh);
        this.galaxyRing = ringMesh;

        // 3 Orbiting Moons
        this.galaxyMoons = [];
        const moonColors = [0x00cec9, 0xfd79a8, 0xffeaa7];
        for (let i = 0; i < 3; i++) {
          const mMat = new THREE.MeshBasicMaterial({ color: moonColors[i] });
          const moon = new THREE.Mesh(sphereGeo, mMat);
          moon.scale.set(0.1, 0.1, 0.1);
          this.outerLayerGroup.add(moon);
          this.galaxyMoons.push({ mesh: moon, offsetAngle: (i / 3) * Math.PI * 2 });
        }
        break;
      }

      default:
        // Classic - subtle extra outer glow
        break;
    }

    this.group.add(this.outerLayerGroup);
    this._applyOuterScale(this.currentRadius);
  }

  _buildNameplate() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    this.nameCanvas = canvas;
    this.nameCtx = canvas.getContext('2d');

    this.nameTexture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: this.nameTexture,
      transparent: true,
      depthTest: false
    });

    this.nameSprite = new THREE.Sprite(spriteMat);
    this.nameSprite.scale.set(7, 1.75, 1);
    this.nameSprite.position.set(0, 3.5, 0);
    this.group.add(this.nameSprite);

    this.updateNameplate(this.name, 1, false);
  }

  updateNameplate(name, level = 1, isCrown = false) {
    const ctx = this.nameCtx;
    ctx.clearRect(0, 0, 256, 64);

    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(10, 8, 236, 48, 24);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.rect(10, 8, 236, 48);
      ctx.fill();
      ctx.stroke();
    }

    // Background pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = this.isLocal ? '#00f2fe' : '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fill();

    // Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';

    const crown = isCrown ? '👑 ' : '';
    const label = `${crown}${name} (Lv.${level})`;
    ctx.fillText(label, 128, 32);

    this.nameTexture.needsUpdate = true;
  }

  setTargetState(x, z, radius, isBoosting = false, angle = 0) {
    this.targetX = x;
    this.targetZ = z;
    this.targetRadius = radius;
    this.isBoosting = isBoosting;
    this.targetAngle = angle;
  }

  update(dt) {
    if (!this.alive) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;

    // Smooth position interpolation
    const lerpFactor = Math.min(1.0, 16.0 * dt);
    this.x += (this.targetX - this.x) * lerpFactor;
    this.z += (this.targetZ - this.z) * lerpFactor;
    this.group.position.set(this.x, 0, this.z);

    // Smooth angle interpolation for outer layer orientation
    let angleDiff = this.targetAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.angle += angleDiff * Math.min(1.0, 10.0 * dt);

    if (this.outerLayerGroup) {
      this.outerLayerGroup.rotation.y = this.angle;
    }

    // Smooth radius growth
    if (Math.abs(this.targetRadius - this.currentRadius) > 0.01) {
      this.currentRadius += (this.targetRadius - this.currentRadius) * Math.min(1.0, 8.0 * dt);
      this._applyScale(this.currentRadius);
      this._applyOuterScale(this.currentRadius);
    }

    // Vortex rotation
    if (this.discMesh) {
      this.discMesh.rotation.z += (this.isBoosting ? 4.0 : 1.5) * dt;
    }

    // Rim subtle pulse
    const pulse = 1.0 + Math.sin(Date.now() * 0.006) * 0.04;
    this.ringMesh.scale.set(this.currentRadius * pulse, this.currentRadius * pulse, 1);

    // Outer layer animations
    this.outerAnimTime += dt;
    if (this.outerLayer === 'peppa') {
      // Ear wiggle
      const earWiggle = Math.sin(this.outerAnimTime * 8) * 0.12;
      if (this.peppaLeftEar) this.peppaLeftEar.rotation.z = -0.35 + earWiggle;
      if (this.peppaRightEar) this.peppaRightEar.rotation.z = 0.35 - earWiggle;
    } else if (this.outerLayer === 'saiyan' && this.saiyanSpikes) {
      // Ki flame flickering
      const sPulse = 1.0 + Math.sin(this.outerAnimTime * 14) * 0.18;
      this.saiyanSpikes.forEach((spk, idx) => {
        spk.scale.y = 0.55 * (1.0 + Math.sin(this.outerAnimTime * 12 + idx) * 0.25);
      });
    } else if (this.outerLayer === 'galaxy' && this.galaxyMoons) {
      // Orbiting moons
      this.galaxyMoons.forEach(m => {
        const ma = this.outerAnimTime * 2.2 + m.offsetAngle;
        m.mesh.position.set(Math.cos(ma) * 1.25, 0.12 + Math.sin(ma * 2) * 0.08, Math.sin(ma) * 1.25);
      });
    }

    // Nameplate vertical position based on radius
    if (this.nameSprite) {
      this.nameSprite.position.y = Math.max(3.5, this.currentRadius * 1.5);
      const spriteScale = Math.max(7, this.currentRadius * 2.2);
      this.nameSprite.scale.set(spriteScale, spriteScale * 0.25, 1);
    }
  }

  _applyScale(rad) {
    this.discMesh.scale.set(rad, rad, 1);
    this.ringMesh.scale.set(rad, rad, 1);
    this.glowMesh.scale.set(rad, rad, 1);
  }

  _applyOuterScale(rad) {
    if (this.outerLayerGroup) {
      this.outerLayerGroup.scale.set(rad, rad, rad);
    }
  }

  destroy() {
    this.scene.remove(this.group);
  }
}
