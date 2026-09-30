import * as THREE from './vendor/three.module.js';

export class CityEnvironment {
  constructor(scene, worldSize = 700, mapType = 'metropolis') {
    this.scene = scene;
    this.worldSize = worldSize;
    this.mapType = mapType;
    this.environmentGroup = new THREE.Group();
    this.scene.add(this.environmentGroup);

    this._buildEnvironment();
    this._buildStormZone();
  }

  setMapType(mapType) {
    if (this.mapType !== mapType) {
      this.mapType = mapType;
      // Rebuild
      while (this.environmentGroup.children.length > 0) {
        this.environmentGroup.remove(this.environmentGroup.children[0]);
      }
      this._buildEnvironment();
    }
  }

  _buildEnvironment() {
    const half = this.worldSize / 2;
    const isCyber = this.mapType === 'cyberpunk';
    const isSuburbs = this.mapType === 'suburbs';
    const isAirport = this.mapType === 'airport_resort';
    const isAmusement = this.mapType === 'amusement_park';

    // 1. Base Ground
    let groundColor = 0x3d9940; // classic city green
    if (isCyber) groundColor = 0x0f111a;
    else if (isSuburbs) groundColor = 0x4caf50;
    else if (isAirport) groundColor = 0x425440;
    else if (isAmusement) groundColor = 0x55aa48;

    const groundGeo = new THREE.PlaneGeometry(this.worldSize, this.worldSize);
    const groundMat = new THREE.MeshLambertMaterial({ color: groundColor });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    this.environmentGroup.add(ground);

    // 2. Specific District Features
    if (isAirport) {
      // ✈️ Massive Airport Runway (600x32m asphalt strip down center)
      const runwayGeo = new THREE.PlaneGeometry(560, 32);
      const runwayMat = new THREE.MeshLambertMaterial({ color: 0x1e2024 });
      const runway = new THREE.Mesh(runwayGeo, runwayMat);
      runway.rotation.x = -Math.PI / 2;
      runway.position.set(0, -0.03, 0);
      this.environmentGroup.add(runway);

      // Runway threshold piano keys & center line
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      for (let x = -260; x <= 260; x += 18) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.2), lineMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(x, -0.025, 0);
        this.environmentGroup.add(stripe);
      }

      // South Marina Water Body & Beach
      const oceanGeo = new THREE.PlaneGeometry(this.worldSize, 140);
      const oceanMat = new THREE.MeshLambertMaterial({ color: 0x0077b6 });
      const ocean = new THREE.Mesh(oceanGeo, oceanMat);
      ocean.rotation.x = -Math.PI / 2;
      ocean.position.set(0, -0.02, 270);
      this.environmentGroup.add(ocean);

      const beachGeo = new THREE.PlaneGeometry(this.worldSize, 20);
      const beachMat = new THREE.MeshLambertMaterial({ color: 0xe0cda9 });
      const beach = new THREE.Mesh(beachGeo, beachMat);
      beach.rotation.x = -Math.PI / 2;
      beach.position.set(0, -0.025, 190);
      this.environmentGroup.add(beach);

    } else if (isAmusement) {
      // 🎡 Wonderland Carnival Plaza Pavers
      const plazaGeo = new THREE.CircleGeometry(110, 48);
      const plazaMat = new THREE.MeshLambertMaterial({ color: 0xf5eedc });
      const plaza = new THREE.Mesh(plazaGeo, plazaMat);
      plaza.rotation.x = -Math.PI / 2;
      plaza.position.set(0, -0.03, 0);
      this.environmentGroup.add(plaza);

      // Colorful ring promenade
      const promGeo = new THREE.RingGeometry(110, 130, 48);
      const promMat = new THREE.MeshLambertMaterial({ color: 0xffb703 });
      const prom = new THREE.Mesh(promGeo, promMat);
      prom.rotation.x = -Math.PI / 2;
      prom.position.set(0, -0.025, 0);
      this.environmentGroup.add(prom);

    } else if (isCyber) {
      // 🌃 Dark Neon Harbor Grid
      const harborGeo = new THREE.PlaneGeometry(this.worldSize, half);
      const harborMat = new THREE.MeshLambertMaterial({ color: 0x161a29 });
      const harborPatch = new THREE.Mesh(harborGeo, harborMat);
      harborPatch.rotation.x = -Math.PI / 2;
      harborPatch.position.set(0, -0.04, half / 2);
      this.environmentGroup.add(harborPatch);

    } else if (isSuburbs) {
      // 🏡 Large suburban lake and pond
      const lakeGeo = new THREE.CircleGeometry(50, 36);
      const lakeMat = new THREE.MeshLambertMaterial({ color: 0x2980b9 });
      const lake = new THREE.Mesh(lakeGeo, lakeMat);
      lake.rotation.x = -Math.PI / 2;
      lake.position.set(0, -0.02, 0);
      this.environmentGroup.add(lake);

    } else {
      // 🏙️ Metropolis Districts
      const dtGeo = new THREE.PlaneGeometry(half, half);
      const dtMat = new THREE.MeshLambertMaterial({ color: 0x95a5a6 });
      const dtPatch = new THREE.Mesh(dtGeo, dtMat);
      dtPatch.rotation.x = -Math.PI / 2;
      dtPatch.position.set(half / 2, -0.04, half / 2);
      this.environmentGroup.add(dtPatch);

      const indGeo = new THREE.PlaneGeometry(half, half);
      const indMat = new THREE.MeshLambertMaterial({ color: 0x7f8c8d });
      const indPatch = new THREE.Mesh(indGeo, indMat);
      indPatch.rotation.x = -Math.PI / 2;
      indPatch.position.set(-half / 2, -0.04, half / 2);
      this.environmentGroup.add(indPatch);

      const pondGeo = new THREE.CircleGeometry(30, 28);
      const pondMat = new THREE.MeshLambertMaterial({ color: 0x3498db });
      const pond = new THREE.Mesh(pondGeo, pondMat);
      pond.rotation.x = -Math.PI / 2;
      pond.position.set(-110, -0.02, -110);
      this.environmentGroup.add(pond);
    }

    // 3. Roads & Sidewalks (aligned with roadLanes: [-220, -75, 75, 220])
    const roadLanes = [-220, -75, 75, 220];
    const roadWidth = 14;
    const roadColor = isCyber ? 0x161824 : 0x2d3436;
    const curbColor = isCyber ? 0x2f3542 : 0xdfe6e9;
    const lineColor = isCyber ? 0x00f2fe : 0xffffff;

    const roadMat = new THREE.MeshLambertMaterial({ color: roadColor });
    const curbMat = new THREE.MeshLambertMaterial({ color: curbColor });
    const lineMat = new THREE.MeshBasicMaterial({ color: lineColor });

    // North-South Roads
    for (const rx of roadLanes) {
      const roadGeo = new THREE.PlaneGeometry(roadWidth, this.worldSize);
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(rx, -0.02, 0);
      this.environmentGroup.add(road);

      const swEast = new THREE.Mesh(new THREE.PlaneGeometry(3.5, this.worldSize), curbMat);
      swEast.rotation.x = -Math.PI / 2;
      swEast.position.set(rx + roadWidth / 2 + 1.75, 0.01, 0);
      this.environmentGroup.add(swEast);

      const swWest = new THREE.Mesh(new THREE.PlaneGeometry(3.5, this.worldSize), curbMat);
      swWest.rotation.x = -Math.PI / 2;
      swWest.position.set(rx - (roadWidth / 2 + 1.75), 0.01, 0);
      this.environmentGroup.add(swWest);

      for (let z = -half + 10; z < half; z += 12) {
        if (roadLanes.some(rz => Math.abs(z - rz) < roadWidth / 2)) continue;
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 6), lineMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(rx, 0.005, z);
        this.environmentGroup.add(stripe);
      }
    }

    // East-West Roads
    for (const rz of roadLanes) {
      const roadGeo = new THREE.PlaneGeometry(this.worldSize, roadWidth);
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, -0.02, rz);
      this.environmentGroup.add(road);

      const swNorth = new THREE.Mesh(new THREE.PlaneGeometry(this.worldSize, 3.5), curbMat);
      swNorth.rotation.x = -Math.PI / 2;
      swNorth.position.set(0, 0.01, rz + roadWidth / 2 + 1.75);
      this.environmentGroup.add(swNorth);

      const swSouth = new THREE.Mesh(new THREE.PlaneGeometry(this.worldSize, 3.5), curbMat);
      swSouth.rotation.x = -Math.PI / 2;
      swSouth.position.set(0, 0.01, rz - (roadWidth / 2 + 1.75));
      this.environmentGroup.add(swSouth);

      for (let x = -half + 10; x < half; x += 12) {
        if (roadLanes.some(rx => Math.abs(x - rx) < roadWidth / 2)) continue;
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.35), lineMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(x, 0.005, rz);
        this.environmentGroup.add(stripe);
      }
    }

    // 4. Perimeter Fences
    const wallColor = isCyber ? 0x00f2fe : 0x636e72;
    const wallMat = new THREE.MeshLambertMaterial({ color: wallColor });
    const wallH = 4.0;
    const wallThickness = 2.0;

    const nWall = new THREE.Mesh(new THREE.BoxGeometry(this.worldSize, wallH, wallThickness), wallMat);
    nWall.position.set(0, wallH / 2, -half);
    this.environmentGroup.add(nWall);

    const sWall = new THREE.Mesh(new THREE.BoxGeometry(this.worldSize, wallH, wallThickness), wallMat);
    sWall.position.set(0, wallH / 2, half);
    this.environmentGroup.add(sWall);

    const wWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallH, this.worldSize), wallMat);
    wWall.position.set(-half, wallH / 2, 0);
    this.environmentGroup.add(wWall);

    const eWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallH, this.worldSize), wallMat);
    eWall.position.set(half, wallH / 2, 0);
    this.environmentGroup.add(eWall);
  }

  _buildStormZone() {
    // 3D Battle Royale Storm Ring Wall
    const stormGeo = new THREE.CylinderGeometry(1, 1, 35, 64, 1, true);
    this.stormMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.28,
      depthWrite: false
    });
    this.stormMesh = new THREE.Mesh(stormGeo, this.stormMat);
    this.stormMesh.position.set(0, 17.5, 0);
    this.stormMesh.visible = false;
    this.scene.add(this.stormMesh);

    // Glowing border ring on ground
    const ringGeo = new THREE.RingGeometry(0.97, 1.03, 64);
    this.stormRingMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    this.stormRingMesh = new THREE.Mesh(ringGeo, this.stormRingMat);
    this.stormRingMesh.rotation.x = -Math.PI / 2;
    this.stormRingMesh.position.y = 0.08;
    this.stormRingMesh.visible = false;
    this.scene.add(this.stormRingMesh);
  }

  updateStormZone(radius, isBattleRoyale = false) {
    if (!isBattleRoyale || radius <= 0) {
      this.stormMesh.visible = false;
      this.stormRingMesh.visible = false;
      return;
    }

    this.stormMesh.visible = true;
    this.stormRingMesh.visible = true;

    // Pulse opacity
    const pulse = 0.25 + Math.sin(Date.now() * 0.005) * 0.08;
    this.stormMat.opacity = pulse;

    this.stormMesh.scale.set(radius, 1, radius);
    this.stormRingMesh.scale.set(radius, radius, 1);
  }
}
