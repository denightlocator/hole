import * as THREE from './vendor/three.module.js';

export class ModelFactory {
  constructor() {
    this._initMaterials();
    this._initGeometries();
  }

  _initMaterials() {
    this.mat = {
      asphalt:     new THREE.MeshLambertMaterial({ color: 0x2c3437 }),
      sidewalk:    new THREE.MeshLambertMaterial({ color: 0xbdc3c7 }),
      grass:       new THREE.MeshLambertMaterial({ color: 0x4caf50 }),
      curb:        new THREE.MeshLambertMaterial({ color: 0x95a5a6 }),
      roadLine:    new THREE.MeshBasicMaterial({ color: 0xffffff }),
      crosswalk:   new THREE.MeshBasicMaterial({ color: 0xfff9c4 }),

      coneOrange:  new THREE.MeshLambertMaterial({ color: 0xff6600 }),
      coneWhite:   new THREE.MeshLambertMaterial({ color: 0xffffff }),
      coneBase:    new THREE.MeshLambertMaterial({ color: 0x222222 }),

      hydrantRed:  new THREE.MeshLambertMaterial({ color: 0xe74c3c }),
      hydrantSilver: new THREE.MeshLambertMaterial({ color: 0xdcdde1 }),

      trashGreen:  new THREE.MeshLambertMaterial({ color: 0x27ae60 }),
      metalDark:   new THREE.MeshLambertMaterial({ color: 0x2f3640 }),
      metalSilver: new THREE.MeshLambertMaterial({ color: 0x718093 }),

      woodBrown:   new THREE.MeshLambertMaterial({ color: 0x8b5a2b }),
      trunkBrown:  new THREE.MeshLambertMaterial({ color: 0x5d4037 }),
      foliageLight:new THREE.MeshLambertMaterial({ color: 0x2ecc71 }),
      foliageDark: new THREE.MeshLambertMaterial({ color: 0x1e8449 }),
      foliagePine: new THREE.MeshLambertMaterial({ color: 0x145a32 }),

      whiteWall:   new THREE.MeshLambertMaterial({ color: 0xecf0f1 }),
      brickRed:    new THREE.MeshLambertMaterial({ color: 0xc0392b }),
      roofDark:    new THREE.MeshLambertMaterial({ color: 0x34495e }),
      roofBlue:    new THREE.MeshLambertMaterial({ color: 0x2980b9 }),
      glassCyan:   new THREE.MeshLambertMaterial({ color: 0x74b9ff, transparent: true, opacity: 0.85 }),
      windowLit:   new THREE.MeshBasicMaterial({ color: 0xfff275 }),

      carBlue:     new THREE.MeshLambertMaterial({ color: 0x3498db }),
      carRed:      new THREE.MeshLambertMaterial({ color: 0xe74c3c }),
      carYellow:   new THREE.MeshLambertMaterial({ color: 0xf1c40f }),
      carWhite:    new THREE.MeshLambertMaterial({ color: 0xf5f6fa }),
      carBlack:    new THREE.MeshLambertMaterial({ color: 0x1e272c }),
      carWheel:    new THREE.MeshLambertMaterial({ color: 0x111111 }),
      headlight:   new THREE.MeshBasicMaterial({ color: 0xfff9e6 }),
      taillight:   new THREE.MeshBasicMaterial({ color: 0xff2222 }),
      policeBlue:  new THREE.MeshBasicMaterial({ color: 0x00a8ff }),

      water:       new THREE.MeshLambertMaterial({ color: 0x00a8ff, transparent: true, opacity: 0.8 }),
      lampGlow:    new THREE.MeshBasicMaterial({ color: 0xfff4cc })
    };
  }

  _initGeometries() {
    this.geo = {
      box: new THREE.BoxGeometry(1, 1, 1),
      cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
      cone: new THREE.ConeGeometry(1, 1, 12),
      sphere: new THREE.SphereGeometry(1, 8, 8),
      dodeca: new THREE.DodecahedronGeometry(1, 0)
    };
  }

  createPropMesh(prop) {
    const group = new THREE.Group();
    group.name = `prop_${prop.id}`;

    switch (prop.type) {
      case 'CONE':
        this._buildCone(group);
        break;
      case 'TRASH_CAN':
        this._buildTrashCan(group);
        break;
      case 'HYDRANT':
        this._buildHydrant(group);
        break;
      case 'PEDESTRIAN':
        this._buildPedestrian(group);
        break;
      case 'BENCH':
        this._buildBench(group);
        break;
      case 'MAILBOX':
        this._buildMailbox(group);
        break;
      case 'BUSH':
        this._buildBush(group);
        break;
      case 'FENCE':
        this._buildFence(group);
        break;
      case 'STREET_LAMP':
        this._buildStreetLamp(group);
        break;
      case 'TRAFFIC_LIGHT':
        this._buildTrafficLight(group);
        break;
      case 'SMALL_TREE':
        this._buildTree(group, 4.0, 1.5, false);
        break;
      case 'LARGE_TREE':
        this._buildTree(group, 6.8, 2.5, true);
        break;
      case 'CAR':
        this._buildCar(group, this.mat.carBlue);
        break;
      case 'POLICE_CAR':
        this._buildPoliceCar(group);
        break;
      case 'SUV':
        this._buildSuv(group);
        break;
      case 'VAN':
        this._buildVan(group);
        break;
      case 'BUS':
        this._buildBus(group);
        break;
      case 'KIOSK':
        this._buildKiosk(group);
        break;
      case 'GAZEBO':
        this._buildGazebo(group);
        break;
      case 'FOUNTAIN':
        this._buildFountain(group);
        break;
      case 'HOUSE_SMALL':
        this._buildHouse(group, 7, 5.5, 6, this.mat.brickRed);
        break;
      case 'HOUSE_LARGE':
        this._buildHouse(group, 10, 7.5, 9, this.mat.whiteWall, true);
        break;
      case 'GAS_STATION':
        this._buildGasStation(group);
        break;
      case 'BUILDING_MID':
        this._buildBuildingMid(group);
        break;
      case 'WAREHOUSE':
        this._buildWarehouse(group);
        break;
      case 'CRANE':
        this._buildCrane(group);
        break;
      case 'APARTMENT_TOWER':
        this._buildApartmentTower(group);
        break;
      case 'SKYSCRAPER':
        this._buildSkyscraper(group);
        break;
      case 'AIRPLANE':
        this._buildAirplane(group);
        break;
      case 'CONTROL_TOWER':
        this._buildControlTower(group);
        break;
      case 'AIRPORT_TERMINAL':
        this._buildAirportTerminal(group);
        break;
      case 'FERRIS_WHEEL':
        this._buildFerrisWheel(group);
        break;
      case 'CIRCUS_TENT':
        this._buildCircusTent(group);
        break;
      case 'WINDMILL':
        this._buildWindmill(group);
        break;
      case 'BARN':
        this._buildBarn(group);
        break;
      case 'TWIN_TOWER':
        this._buildTwinTower(group);
        break;
      case 'YACHT':
        this._buildYacht(group);
        break;
      default:
        this._buildDefaultBox(group, prop);
        break;
    }

    group.position.set(prop.x, 0, prop.z);
    group.rotation.y = prop.rotY || 0;
    return group;
  }

  _buildCone(g) {
    // Base
    const base = new THREE.Mesh(this.geo.box, this.mat.coneBase);
    base.scale.set(0.7, 0.08, 0.7);
    base.position.y = 0.04;
    g.add(base);
    // Cone body
    const body = new THREE.Mesh(this.geo.cone, this.mat.coneOrange);
    body.scale.set(0.35, 0.85, 0.35);
    body.position.y = 0.45;
    g.add(body);
    // White stripe
    const stripe = new THREE.Mesh(this.geo.cylinder, this.mat.coneWhite);
    stripe.scale.set(0.25, 0.16, 0.25);
    stripe.position.y = 0.42;
    g.add(stripe);
  }

  _buildTrashCan(g) {
    const can = new THREE.Mesh(this.geo.cylinder, this.mat.trashGreen);
    can.scale.set(0.45, 1.1, 0.45);
    can.position.y = 0.55;
    g.add(can);
    const lid = new THREE.Mesh(this.geo.cylinder, this.mat.metalDark);
    lid.scale.set(0.48, 0.12, 0.48);
    lid.position.y = 1.12;
    g.add(lid);
  }

  _buildHydrant(g) {
    const col = new THREE.Mesh(this.geo.cylinder, this.mat.hydrantRed);
    col.scale.set(0.3, 0.9, 0.3);
    col.position.y = 0.45;
    g.add(col);
    const top = new THREE.Mesh(this.geo.sphere, this.mat.hydrantRed);
    top.scale.set(0.32, 0.25, 0.32);
    top.position.y = 0.95;
    g.add(top);
    const nozzle = new THREE.Mesh(this.geo.cylinder, this.mat.hydrantSilver);
    nozzle.scale.set(0.12, 0.75, 0.12);
    nozzle.rotation.z = Math.PI / 2;
    nozzle.position.y = 0.65;
    g.add(nozzle);
  }

  _buildPedestrian(g) {
    // Legs
    const leftLeg = new THREE.Mesh(this.geo.box, this.mat.metalDark);
    leftLeg.scale.set(0.2, 0.65, 0.2);
    leftLeg.position.set(-0.16, 0.32, 0);
    g.add(leftLeg);
    const rightLeg = new THREE.Mesh(this.geo.box, this.mat.metalDark);
    rightLeg.scale.set(0.2, 0.65, 0.2);
    rightLeg.position.set(0.16, 0.32, 0);
    g.add(rightLeg);
    g.userData.leftLeg = leftLeg;
    g.userData.rightLeg = rightLeg;

    // Torso (random colorful shirt)
    const shirtColors = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6];
    const shirtMat = new THREE.MeshLambertMaterial({ color: shirtColors[Math.floor(Math.random() * shirtColors.length)] });
    const torso = new THREE.Mesh(this.geo.box, shirtMat);
    torso.scale.set(0.55, 0.65, 0.32);
    torso.position.y = 0.95;
    g.add(torso);

    // Head
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffd1a4 });
    const head = new THREE.Mesh(this.geo.box, headMat);
    head.scale.set(0.35, 0.35, 0.35);
    head.position.y = 1.45;
    g.add(head);

    // Hair
    const hair = new THREE.Mesh(this.geo.box, this.mat.woodBrown);
    hair.scale.set(0.37, 0.15, 0.37);
    hair.position.y = 1.62;
    g.add(hair);
  }

  _buildBench(g) {
    const seat = new THREE.Mesh(this.geo.box, this.mat.woodBrown);
    seat.scale.set(1.8, 0.08, 0.55);
    seat.position.y = 0.42;
    g.add(seat);
    const back = new THREE.Mesh(this.geo.box, this.mat.woodBrown);
    back.scale.set(1.8, 0.45, 0.08);
    back.position.set(0, 0.68, -0.24);
    g.add(back);
    const leg1 = new THREE.Mesh(this.geo.box, this.mat.metalDark);
    leg1.scale.set(0.1, 0.42, 0.5);
    leg1.position.set(-0.75, 0.21, 0);
    g.add(leg1);
    const leg2 = new THREE.Mesh(this.geo.box, this.mat.metalDark);
    leg2.scale.set(0.1, 0.42, 0.5);
    leg2.position.set(0.75, 0.21, 0);
    g.add(leg2);
  }

  _buildMailbox(g) {
    const post = new THREE.Mesh(this.geo.cylinder, this.mat.metalDark);
    post.scale.set(0.12, 0.7, 0.12);
    post.position.y = 0.35;
    g.add(post);
    const box = new THREE.Mesh(this.geo.box, this.mat.roofBlue);
    box.scale.set(0.6, 0.6, 0.7);
    box.position.y = 0.95;
    g.add(box);
  }

  _buildBush(g) {
    const count = 3;
    for (let i = 0; i < count; i++) {
      const puff = new THREE.Mesh(this.geo.dodeca, this.mat.foliageLight);
      const rad = 0.5 + Math.random() * 0.25;
      puff.scale.set(rad, rad * 0.9, rad);
      puff.position.set((Math.random() - 0.5) * 0.6, rad * 0.8, (Math.random() - 0.5) * 0.6);
      g.add(puff);
    }
  }

  _buildFence(g) {
    // 3 pickets
    for (let x = -0.7; x <= 0.7; x += 0.45) {
      const p = new THREE.Mesh(this.geo.box, this.mat.whiteWall);
      p.scale.set(0.12, 1.1, 0.06);
      p.position.set(x, 0.55, 0);
      g.add(p);
    }
    const r1 = new THREE.Mesh(this.geo.box, this.mat.whiteWall);
    r1.scale.set(1.8, 0.08, 0.06);
    r1.position.set(0, 0.35, 0);
    g.add(r1);
    const r2 = new THREE.Mesh(this.geo.box, this.mat.whiteWall);
    r2.scale.set(1.8, 0.08, 0.06);
    r2.position.set(0, 0.75, 0);
    g.add(r2);
  }

  _buildStreetLamp(g) {
    const pole = new THREE.Mesh(this.geo.cylinder, this.mat.metalDark);
    pole.scale.set(0.12, 4.2, 0.12);
    pole.position.y = 2.1;
    g.add(pole);
    const arm = new THREE.Mesh(this.geo.box, this.mat.metalDark);
    arm.scale.set(0.1, 0.1, 0.9);
    arm.position.set(0, 4.2, 0.4);
    g.add(arm);
    const bulb = new THREE.Mesh(this.geo.sphere, this.mat.lampGlow);
    bulb.scale.set(0.28, 0.28, 0.28);
    bulb.position.set(0, 4.05, 0.75);
    g.add(bulb);
  }

  _buildTrafficLight(g) {
    const pole = new THREE.Mesh(this.geo.cylinder, this.mat.metalDark);
    pole.scale.set(0.15, 4.6, 0.15);
    pole.position.y = 2.3;
    g.add(pole);
    const box = new THREE.Mesh(this.geo.box, this.mat.metalDark);
    box.scale.set(0.45, 1.4, 0.45);
    box.position.set(0, 4.0, 0);
    g.add(box);
    // 3 lights
    const colors = [0xff2222, 0xf1c40f, 0x2ecc71];
    for (let i = 0; i < 3; i++) {
      const lMat = new THREE.MeshBasicMaterial({ color: colors[i] });
      const light = new THREE.Mesh(this.geo.cylinder, lMat);
      light.scale.set(0.12, 0.1, 0.12);
      light.rotation.x = Math.PI / 2;
      light.position.set(0, 4.4 - i * 0.4, 0.22);
      g.add(light);
    }
  }

  _buildTree(g, totalHeight, width, isLarge = false) {
    const trunkH = totalHeight * 0.4;
    const trunk = new THREE.Mesh(this.geo.cylinder, this.mat.trunkBrown);
    trunk.scale.set(width * 0.18, trunkH, width * 0.18);
    trunk.position.y = trunkH / 2;
    g.add(trunk);

    const foliageMat = isLarge ? this.mat.foliageDark : this.mat.foliageLight;
    if (isLarge) {
      // 3 overlapping foliage clusters
      for (let i = 0; i < 3; i++) {
        const f = new THREE.Mesh(this.geo.dodeca, foliageMat);
        const r = width * (0.65 - i * 0.1);
        f.scale.set(r, r * 0.85, r);
        f.position.set((i === 1 ? 0.3 : i === 2 ? -0.3 : 0), trunkH + i * 1.3, (i === 2 ? 0.2 : 0));
        g.add(f);
      }
    } else {
      const f1 = new THREE.Mesh(this.geo.cone, foliageMat);
      f1.scale.set(width, totalHeight * 0.5, width);
      f1.position.y = trunkH + (totalHeight * 0.25);
      g.add(f1);
      const f2 = new THREE.Mesh(this.geo.cone, foliageMat);
      f2.scale.set(width * 0.8, totalHeight * 0.4, width * 0.8);
      f2.position.y = trunkH + (totalHeight * 0.45);
      g.add(f2);
    }
  }

  _buildCar(g, colorMat) {
    // Body lower
    const body = new THREE.Mesh(this.geo.box, colorMat);
    body.scale.set(2.0, 0.65, 3.8);
    body.position.y = 0.55;
    g.add(body);
    // Cabin
    const cabin = new THREE.Mesh(this.geo.box, this.mat.glassCyan);
    cabin.scale.set(1.6, 0.55, 2.0);
    cabin.position.set(0, 1.1, -0.2);
    g.add(cabin);
    // 4 Wheels
    const wheelPositions = [
      [-1.0, 0.3, 1.1], [1.0, 0.3, 1.1],
      [-1.0, 0.3, -1.1], [1.0, 0.3, -1.1]
    ];
    for (const [wx, wy, wz] of wheelPositions) {
      const wheel = new THREE.Mesh(this.geo.cylinder, this.mat.carWheel);
      wheel.scale.set(0.3, 0.2, 0.3);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      g.add(wheel);
    }
    // Headlights
    const hl1 = new THREE.Mesh(this.geo.box, this.mat.headlight);
    hl1.scale.set(0.3, 0.15, 0.1);
    hl1.position.set(-0.6, 0.6, 1.9);
    g.add(hl1);
    const hl2 = hl1.clone();
    hl2.position.x = 0.6;
    g.add(hl2);
    // Taillights
    const tl1 = new THREE.Mesh(this.geo.box, this.mat.taillight);
    tl1.scale.set(0.3, 0.15, 0.1);
    tl1.position.set(-0.6, 0.6, -1.9);
    g.add(tl1);
    const tl2 = tl1.clone();
    tl2.position.x = 0.6;
    g.add(tl2);
  }

  _buildPoliceCar(g) {
    this._buildCar(g, this.mat.carBlack);
    // Siren bar on roof
    const siren = new THREE.Mesh(this.geo.box, this.mat.policeBlue);
    siren.scale.set(0.8, 0.15, 0.25);
    siren.position.set(0, 1.45, -0.2);
    g.add(siren);
  }

  _buildSuv(g) {
    const body = new THREE.Mesh(this.geo.box, this.mat.carYellow);
    body.scale.set(2.2, 0.85, 4.2);
    body.position.y = 0.7;
    g.add(body);
    const cabin = new THREE.Mesh(this.geo.box, this.mat.glassCyan);
    cabin.scale.set(1.9, 0.75, 2.8);
    cabin.position.set(0, 1.45, -0.3);
    g.add(cabin);
    const wheelPositions = [
      [-1.15, 0.38, 1.3], [1.15, 0.38, 1.3],
      [-1.15, 0.38, -1.3], [1.15, 0.38, -1.3]
    ];
    for (const [wx, wy, wz] of wheelPositions) {
      const wheel = new THREE.Mesh(this.geo.cylinder, this.mat.carWheel);
      wheel.scale.set(0.38, 0.25, 0.38);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      g.add(wheel);
    }
  }

  _buildVan(g) {
    const body = new THREE.Mesh(this.geo.box, this.mat.carWhite);
    body.scale.set(2.4, 1.8, 5.0);
    body.position.y = 1.25;
    g.add(body);
    const frontWindshield = new THREE.Mesh(this.geo.box, this.mat.glassCyan);
    frontWindshield.scale.set(2.0, 0.7, 0.2);
    frontWindshield.position.set(0, 1.6, 2.45);
    g.add(frontWindshield);
    const wheelPositions = [
      [-1.25, 0.45, 1.6], [1.25, 0.45, 1.6],
      [-1.25, 0.45, -1.6], [1.25, 0.45, -1.6]
    ];
    for (const [wx, wy, wz] of wheelPositions) {
      const wheel = new THREE.Mesh(this.geo.cylinder, this.mat.carWheel);
      wheel.scale.set(0.42, 0.25, 0.42);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      g.add(wheel);
    }
  }

  _buildBus(g) {
    const body = new THREE.Mesh(this.geo.box, this.mat.roofBlue);
    body.scale.set(2.8, 2.6, 8.5);
    body.position.y = 1.65;
    g.add(body);
    // Side glass windows
    const sideGlass1 = new THREE.Mesh(this.geo.box, this.mat.glassCyan);
    sideGlass1.scale.set(2.85, 0.9, 7.2);
    sideGlass1.position.set(0, 2.0, 0);
    g.add(sideGlass1);
    // Wheels
    const wheelPositions = [
      [-1.42, 0.5, 2.8], [1.42, 0.5, 2.8],
      [-1.42, 0.5, -2.8], [1.42, 0.5, -2.8]
    ];
    for (const [wx, wy, wz] of wheelPositions) {
      const wheel = new THREE.Mesh(this.geo.cylinder, this.mat.carWheel);
      wheel.scale.set(0.5, 0.28, 0.5);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      g.add(wheel);
    }
  }

  _buildKiosk(g) {
    const body = new THREE.Mesh(this.geo.box, this.mat.woodBrown);
    body.scale.set(2.4, 2.2, 2.4);
    body.position.y = 1.1;
    g.add(body);
    const roof = new THREE.Mesh(this.geo.cone, this.mat.roofDark);
    roof.scale.set(2.0, 0.9, 2.0);
    roof.position.y = 2.65;
    g.add(roof);
    const window = new THREE.Mesh(this.geo.box, this.mat.windowLit);
    window.scale.set(1.8, 0.9, 0.1);
    window.position.set(0, 1.2, 1.22);
    g.add(window);
  }

  _buildGazebo(g) {
    const base = new THREE.Mesh(this.geo.cylinder, this.mat.sidewalk);
    base.scale.set(2.8, 0.25, 2.8);
    base.position.y = 0.125;
    g.add(base);
    // 6 Pillars
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const pil = new THREE.Mesh(this.geo.cylinder, this.mat.whiteWall);
      pil.scale.set(0.12, 2.6, 0.12);
      pil.position.set(Math.cos(a) * 2.3, 1.4, Math.sin(a) * 2.3);
      g.add(pil);
    }
    const roof = new THREE.Mesh(this.geo.cone, this.mat.roofDark);
    roof.scale.set(3.0, 1.4, 3.0);
    roof.position.y = 3.4;
    g.add(roof);
  }

  _buildFountain(g) {
    const basin = new THREE.Mesh(this.geo.cylinder, this.mat.sidewalk);
    basin.scale.set(3.4, 0.6, 3.4);
    basin.position.y = 0.3;
    g.add(basin);
    const water = new THREE.Mesh(this.geo.cylinder, this.mat.water);
    water.scale.set(3.1, 0.4, 3.1);
    water.position.y = 0.45;
    g.add(water);
    const centerPil = new THREE.Mesh(this.geo.cylinder, this.mat.sidewalk);
    centerPil.scale.set(0.8, 1.8, 0.8);
    centerPil.position.y = 0.9;
    g.add(centerPil);
  }

  _buildHouse(g, w, h, d, wallMat, isLarge = false) {
    const bodyH = h * 0.65;
    const body = new THREE.Mesh(this.geo.box, wallMat);
    body.scale.set(w, bodyH, d);
    body.position.y = bodyH / 2;
    g.add(body);

    const roofH = h * 0.4;
    const roofGeo = new THREE.ConeGeometry(w * 0.72, roofH, 4);
    const roof = new THREE.Mesh(roofGeo, isLarge ? this.mat.roofDark : this.mat.roofBlue);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = bodyH + roofH / 2;
    g.add(roof);

    // Front door & windows
    const door = new THREE.Mesh(this.geo.box, this.mat.woodBrown);
    door.scale.set(1.2, 2.0, 0.1);
    door.position.set(0, 1.0, d / 2 + 0.05);
    g.add(door);

    const winMat = this.mat.windowLit;
    const w1 = new THREE.Mesh(this.geo.box, winMat);
    w1.scale.set(1.1, 1.1, 0.1);
    w1.position.set(-w * 0.28, 1.8, d / 2 + 0.05);
    g.add(w1);
    const w2 = w1.clone();
    w2.position.x = w * 0.28;
    g.add(w2);

    if (isLarge) {
      // Chimney
      const chimney = new THREE.Mesh(this.geo.box, this.mat.brickRed);
      chimney.scale.set(1.0, 2.5, 1.0);
      chimney.position.set(w * 0.25, bodyH + roofH * 0.6, 0);
      g.add(chimney);
    }
  }

  _buildGasStation(g) {
    // Canopy
    const canopy = new THREE.Mesh(this.geo.box, this.mat.roofDark);
    canopy.scale.set(8.5, 0.6, 6.0);
    canopy.position.y = 4.2;
    g.add(canopy);
    // 4 pillars
    const pilCoords = [[-3.5, -2.0], [3.5, -2.0], [-3.5, 2.0], [3.5, 2.0]];
    for (const [px, pz] of pilCoords) {
      const pil = new THREE.Mesh(this.geo.cylinder, this.mat.metalSilver);
      pil.scale.set(0.25, 4.0, 0.25);
      pil.position.set(px, 2.0, pz);
      g.add(pil);
    }
    // 2 fuel pumps
    for (let x of [-1.5, 1.5]) {
      const pump = new THREE.Mesh(this.geo.box, this.mat.hydrantRed);
      pump.scale.set(0.8, 1.8, 0.8);
      pump.position.set(x, 0.9, 0);
      g.add(pump);
    }
  }

  _buildBuildingMid(g) {
    const w = 9.0;
    const h = 13.0;
    const d = 9.0;
    const body = new THREE.Mesh(this.geo.box, this.mat.whiteWall);
    body.scale.set(w, h, d);
    body.position.y = h / 2;
    g.add(body);

    // Window bands
    for (let y = 3; y < h - 2; y += 2.4) {
      const band = new THREE.Mesh(this.geo.box, this.mat.glassCyan);
      band.scale.set(w + 0.1, 1.2, d + 0.1);
      band.position.y = y;
      g.add(band);
    }
    // AC unit on roof
    const ac = new THREE.Mesh(this.geo.box, this.mat.metalSilver);
    ac.scale.set(2.0, 1.0, 2.0);
    ac.position.set(1.5, h + 0.5, 1.5);
    g.add(ac);
  }

  _buildWarehouse(g) {
    const body = new THREE.Mesh(this.geo.box, this.mat.curb);
    body.scale.set(12.0, 6.5, 12.0);
    body.position.y = 3.25;
    g.add(body);
    const roof = new THREE.Mesh(this.geo.cylinder, this.mat.roofDark);
    roof.scale.set(6.2, 12.0, 2.0);
    roof.rotation.z = Math.PI / 2;
    roof.position.y = 6.8;
    g.add(roof);
    // Big shutter doors
    const door = new THREE.Mesh(this.geo.box, this.mat.metalDark);
    door.scale.set(3.5, 3.2, 0.15);
    door.position.set(0, 1.6, 6.05);
    g.add(door);
  }

  _buildCrane(g) {
    const yellowMat = new THREE.MeshLambertMaterial({ color: 0xf39c12 });
    // Mast
    const mast = new THREE.Mesh(this.geo.box, yellowMat);
    mast.scale.set(1.2, 22.0, 1.2);
    mast.position.y = 11.0;
    g.add(mast);
    // Boom arm
    const boom = new THREE.Mesh(this.geo.box, yellowMat);
    boom.scale.set(1.0, 1.0, 16.0);
    boom.position.set(0, 21.5, 4.0);
    g.add(boom);
    // Counterweight
    const weight = new THREE.Mesh(this.geo.box, this.mat.curb);
    weight.scale.set(1.8, 1.5, 2.5);
    weight.position.set(0, 21.5, -4.5);
    g.add(weight);
  }

  _buildApartmentTower(g) {
    const w = 11.0;
    const h = 21.0;
    const d = 11.0;
    const body = new THREE.Mesh(this.geo.box, this.mat.roofDark);
    body.scale.set(w, h, d);
    body.position.y = h / 2;
    g.add(body);

    for (let y = 3; y < h - 2; y += 3.0) {
      const glass = new THREE.Mesh(this.geo.box, this.mat.glassCyan);
      glass.scale.set(w + 0.15, 1.6, d + 0.15);
      glass.position.y = y;
      g.add(glass);
    }
  }

  _buildSkyscraper(g) {
    const w = 14.0;
    const h = 34.0;
    const d = 14.0;
    // Lower tier
    const base = new THREE.Mesh(this.geo.box, this.mat.metalDark);
    base.scale.set(w, h * 0.7, d);
    base.position.y = (h * 0.7) / 2;
    g.add(base);

    // Glass facades
    for (let y = 4; y < h * 0.7; y += 3.5) {
      const gBand = new THREE.Mesh(this.geo.box, this.mat.glassCyan);
      gBand.scale.set(w + 0.2, 2.2, d + 0.2);
      gBand.position.y = y;
      g.add(gBand);
    }

    // Upper setback tier
    const topTier = new THREE.Mesh(this.geo.box, this.mat.roofDark);
    topTier.scale.set(w * 0.7, h * 0.3, d * 0.7);
    topTier.position.y = h * 0.7 + (h * 0.3) / 2;
    g.add(topTier);

    // Spire / Antenna
    const antenna = new THREE.Mesh(this.geo.cylinder, this.mat.metalSilver);
    antenna.scale.set(0.25, 7.0, 0.25);
    antenna.position.y = h + 3.5;
    g.add(antenna);

    // Red beacon light
    const beacon = new THREE.Mesh(this.geo.sphere, this.mat.taillight);
    beacon.scale.set(0.4, 0.4, 0.4);
    beacon.position.y = h + 7.0;
    g.add(beacon);
  }

  _buildAirplane(g) {
    // Fuselage
    const fuse = new THREE.Mesh(this.geo.cylinder, this.mat.whiteWall);
    fuse.scale.set(1.4, 13.0, 1.4);
    fuse.rotation.x = Math.PI / 2;
    fuse.position.y = 2.0;
    g.add(fuse);

    // Nose cone
    const nose = new THREE.Mesh(this.geo.cone, this.mat.whiteWall);
    nose.scale.set(1.4, 2.5, 1.4);
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, 2.0, 7.5);
    g.add(nose);

    // Wings
    const wingMat = new THREE.MeshLambertMaterial({ color: 0xdcdde1 });
    const wingLeft = new THREE.Mesh(this.geo.box, wingMat);
    wingLeft.scale.set(7.5, 0.18, 2.2);
    wingLeft.position.set(-4.2, 2.0, 0);
    wingLeft.rotation.y = 0.2;
    g.add(wingLeft);

    const wingRight = wingLeft.clone();
    wingRight.position.x = 4.2;
    wingRight.rotation.y = -0.2;
    g.add(wingRight);

    // Tail fin
    const tail = new THREE.Mesh(this.geo.box, this.mat.roofBlue);
    tail.scale.set(0.2, 3.2, 2.0);
    tail.position.set(0, 3.8, -5.5);
    tail.rotation.x = -0.3;
    g.add(tail);

    // Engines
    for (const ex of [-3.2, 3.2]) {
      const eng = new THREE.Mesh(this.geo.cylinder, this.mat.metalDark);
      eng.scale.set(0.65, 2.0, 0.65);
      eng.rotation.x = Math.PI / 2;
      eng.position.set(ex, 1.3, 0.5);
      g.add(eng);
    }
  }

  _buildControlTower(g) {
    // Shaft
    const shaft = new THREE.Mesh(this.geo.cylinder, this.mat.sidewalk);
    shaft.scale.set(2.2, 22.0, 2.2);
    shaft.position.y = 11.0;
    g.add(shaft);

    // Observation Cab
    const cab = new THREE.Mesh(this.geo.cylinder, this.mat.glassCyan);
    cab.scale.set(4.0, 3.5, 4.0);
    cab.position.y = 23.0;
    g.add(cab);

    // Roof & Radome
    const roof = new THREE.Mesh(this.geo.cone, this.mat.roofDark);
    roof.scale.set(4.5, 1.5, 4.5);
    roof.position.y = 25.5;
    g.add(roof);

    const dome = new THREE.Mesh(this.geo.sphere, this.mat.whiteWall);
    dome.scale.set(1.2, 1.2, 1.2);
    dome.position.y = 27.0;
    g.add(dome);
  }

  _buildAirportTerminal(g) {
    const body = new THREE.Mesh(this.geo.box, this.mat.whiteWall);
    body.scale.set(22.0, 7.5, 14.0);
    body.position.y = 3.75;
    g.add(body);

    // Curved roof
    const roof = new THREE.Mesh(this.geo.cylinder, this.mat.metalSilver);
    roof.scale.set(8.0, 22.2, 8.0);
    roof.rotation.z = Math.PI / 2;
    roof.position.set(0, 7.5, 0);
    g.add(roof);

    // Glass curtain wall front
    const glass = new THREE.Mesh(this.geo.box, this.mat.glassCyan);
    glass.scale.set(20.0, 5.0, 0.2);
    glass.position.set(0, 4.0, 7.1);
    g.add(glass);
  }

  _buildFerrisWheel(g) {
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0xff3366 });
    // Support Legs
    for (let x of [-2.5, 2.5]) {
      const leg1 = new THREE.Mesh(this.geo.cylinder, this.mat.metalSilver);
      leg1.scale.set(0.3, 16.0, 0.3);
      leg1.rotation.z = x > 0 ? 0.25 : -0.25;
      leg1.position.set(x * 1.5, 7.5, 0);
      g.add(leg1);
    }

    // Outer Rim
    const rimGeo = new THREE.TorusGeometry(8.0, 0.25, 8, 32);
    const rim = new THREE.Mesh(rimGeo, wheelMat);
    rim.position.y = 12.0;
    g.add(rim);

    // Spokes & Gondolas
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const spoke = new THREE.Mesh(this.geo.cylinder, this.mat.metalSilver);
      spoke.scale.set(0.12, 16.0, 0.12);
      spoke.rotation.z = a;
      spoke.position.y = 12.0;
      g.add(spoke);

      // Gondola
      const gondolaMat = new THREE.MeshLambertMaterial({ color: (i % 2 === 0 ? 0xffd700 : 0x00f2fe) });
      const gondola = new THREE.Mesh(this.geo.box, gondolaMat);
      gondola.scale.set(1.2, 1.2, 1.2);
      gondola.position.set(Math.cos(a) * 8.0, 12.0 + Math.sin(a) * 8.0, 0);
      g.add(gondola);
    }
  }

  _buildCircusTent(g) {
    // Base ring wall
    const wall = new THREE.Mesh(this.geo.cylinder, this.mat.brickRed);
    wall.scale.set(7.5, 4.0, 7.5);
    wall.position.y = 2.0;
    g.add(wall);

    // Striped cone canopy
    const yellowMat = new THREE.MeshLambertMaterial({ color: 0xf1c40f });
    const canopy = new THREE.Mesh(this.geo.cone, yellowMat);
    canopy.scale.set(8.5, 7.5, 8.5);
    canopy.position.y = 7.75;
    g.add(canopy);

    // Flag pole
    const pole = new THREE.Mesh(this.geo.cylinder, this.mat.metalSilver);
    pole.scale.set(0.12, 3.0, 0.12);
    pole.position.y = 12.5;
    g.add(pole);
  }

  _buildWindmill(g) {
    const tower = new THREE.Mesh(this.geo.cylinder, this.mat.whiteWall);
    tower.scale.set(3.2, 14.0, 3.2);
    tower.position.y = 7.0;
    g.add(tower);

    const roof = new THREE.Mesh(this.geo.cone, this.mat.roofDark);
    roof.scale.set(3.5, 3.0, 3.5);
    roof.position.y = 15.5;
    g.add(roof);

    // 4 Blades
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const blade = new THREE.Mesh(this.geo.box, this.mat.woodBrown);
      blade.scale.set(0.6, 6.5, 0.08);
      blade.position.set(Math.cos(a) * 3.5, 15.0 + Math.sin(a) * 3.5, 3.3);
      blade.rotation.z = -a;
      g.add(blade);
    }
  }

  _buildBarn(g) {
    const body = new THREE.Mesh(this.geo.box, this.mat.brickRed);
    body.scale.set(11.0, 6.0, 9.0);
    body.position.y = 3.0;
    g.add(body);

    const roof = new THREE.Mesh(this.geo.cone, this.mat.whiteWall);
    roof.scale.set(9.0, 3.5, 9.0);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 7.5;
    g.add(roof);

    // Barn door
    const door = new THREE.Mesh(this.geo.box, this.mat.whiteWall);
    door.scale.set(3.5, 4.0, 0.1);
    door.position.set(0, 2.0, 4.55);
    g.add(door);
  }

  _buildTwinTower(g) {
    const w = 11.0;
    const h = 45.0;
    const d = 11.0;

    // Tower A
    const tA = new THREE.Mesh(this.geo.box, this.mat.roofDark);
    tA.scale.set(w, h, d);
    tA.position.set(-8.5, h / 2, 0);
    g.add(tA);

    // Tower B
    const tB = new THREE.Mesh(this.geo.box, this.mat.roofDark);
    tB.scale.set(w, h, d);
    tB.position.set(8.5, h / 2, 0);
    g.add(tB);

    // Glass facades on both
    for (let y = 4; y < h - 4; y += 4.0) {
      const gA = new THREE.Mesh(this.geo.box, this.mat.glassCyan);
      gA.scale.set(w + 0.15, 2.2, d + 0.15);
      gA.position.set(-8.5, y, 0);
      g.add(gA);

      const gB = gA.clone();
      gB.position.x = 8.5;
      g.add(gB);
    }

    // Skybridge connecting them at y = 28
    const bridge = new THREE.Mesh(this.geo.box, this.mat.glassCyan);
    bridge.scale.set(8.0, 3.5, 5.0);
    bridge.position.set(0, 28.0, 0);
    g.add(bridge);

    // Spire Antennas
    for (let x of [-8.5, 8.5]) {
      const spire = new THREE.Mesh(this.geo.cylinder, this.mat.metalSilver);
      spire.scale.set(0.3, 8.0, 0.3);
      spire.position.set(x, h + 4.0, 0);
      g.add(spire);
    }
  }

  _buildYacht(g) {
    const hull = new THREE.Mesh(this.geo.box, this.mat.whiteWall);
    hull.scale.set(3.2, 1.4, 8.5);
    hull.position.y = 0.7;
    g.add(hull);

    const cabin = new THREE.Mesh(this.geo.box, this.mat.glassCyan);
    cabin.scale.set(2.4, 1.2, 4.2);
    cabin.position.set(0, 1.8, -0.6);
    g.add(cabin);
  }

  _buildDefaultBox(g, prop) {
    const mat = new THREE.MeshLambertMaterial({ color: prop.color || 0x888888 });
    const mesh = new THREE.Mesh(this.geo.box, mat);
    mesh.scale.set(prop.radius * 2, prop.height || 2, prop.radius * 2);
    mesh.position.y = (prop.height || 2) / 2;
    g.add(mesh);
  }
}

