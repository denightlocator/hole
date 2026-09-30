// Browser-compatible Procedural Map Generator
export class ClientMapGenerator {
  static generateMap(mapType = 'metropolis') {
    const C = window.GameConstants || {};
    const PROP_DEFS = C.PROP_DEFS || {};
    const props = [];
    let nextId = 1;

    function addProp(typeKey, x, z, rotY = 0, extra = {}) {
      const def = PROP_DEFS[typeKey];
      if (!def) return null;
      const prop = {
        id: nextId++,
        type: typeKey,
        name: def.name,
        x: Math.round(x * 10) / 10,
        y: 0,
        z: Math.round(z * 10) / 10,
        rotY: Math.round(rotY * 100) / 100,
        radius: def.radius,
        height: def.height,
        xp: def.xp,
        minRadius: def.minRadius,
        color: def.color,
        alive: true,
        isDynamic: !!def.isDynamic,
        isVehicle: !!def.isVehicle,
        ...extra
      };
      props.push(prop);
      return prop;
    }

    const rand = (min, max) => min + Math.random() * (max - min);
    const randChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const roadLanes = [-220, -75, 75, 220];
    const isNearRoad = (x, z, margin = 8) => {
      for (const rx of roadLanes) {
        if (Math.abs(x - rx) < margin) return true;
      }
      for (const rz of roadLanes) {
        if (Math.abs(z - rz) < margin) return true;
      }
      return false;
    };

    // 1. Sidewalk props
    for (const rx of roadLanes) {
      for (let z = -320; z <= 320; z += 26) {
        if (roadLanes.some(rz => Math.abs(z - rz) < 12)) continue;
        addProp('STREET_LAMP', rx + 7.5, z, Math.PI / 2);
        if (Math.random() < 0.45) addProp('HYDRANT', rx + 7.2, z + 8);
        if (Math.random() < 0.45) addProp('TRASH_CAN', rx + 7.2, z - 8);
        if (Math.random() < 0.35) addProp('MAILBOX', rx + 7.2, z + 14);
        if (Math.random() < 0.35) addProp('CONE', rx + 6.0, z + 4);

        addProp('STREET_LAMP', rx - 7.5, z, -Math.PI / 2);
        if (Math.random() < 0.45) addProp('BENCH', rx - 7.2, z + 7, Math.PI / 2);
        if (Math.random() < 0.45) addProp('SMALL_TREE', rx - 7.5, z - 8);
        if (Math.random() < 0.35) addProp('CONE', rx - 6.0, z - 4);
      }
    }

    for (const rz of roadLanes) {
      for (let x = -320; x <= 320; x += 26) {
        if (roadLanes.some(rx => Math.abs(x - rx) < 12)) continue;
        addProp('STREET_LAMP', x, rz + 7.5, 0);
        if (Math.random() < 0.45) addProp('HYDRANT', x + 8, rz + 7.2);
        if (Math.random() < 0.4) addProp('TRASH_CAN', x - 8, rz + 7.2);

        addProp('STREET_LAMP', x, rz - 7.5, Math.PI);
        if (Math.random() < 0.45) addProp('SMALL_TREE', x - 8, rz - 7.5);
        if (Math.random() < 0.35) addProp('BENCH', x + 7, rz - 7.2, 0);
      }
    }

    // Traffic lights
    for (const rx of roadLanes) {
      for (const rz of roadLanes) {
        addProp('TRAFFIC_LIGHT', rx + 6.5, rz + 6.5, 0);
        addProp('TRAFFIC_LIGHT', rx - 6.5, rz - 6.5, Math.PI);
        addProp('CONE', rx + 7, rz - 7);
        addProp('CONE', rx - 7, rz + 7);
      }
    }

    // 2. Themed Map Contents
    if (mapType === 'airport_resort') {
      // Runway along center
      for (let x = -260; x <= 260; x += 65) {
        addProp('AIRPLANE', x, 0, Math.PI / 2);
        addProp('CONE', x + 15, 12);
        addProp('CONE', x - 15, -12);
      }
      addProp('CONTROL_TOWER', 0, 45, 0);
      addProp('CONTROL_TOWER', -150, 45, 0);
      addProp('AIRPORT_TERMINAL', -80, 45, 0);
      addProp('AIRPORT_TERMINAL', 80, 45, 0);
      addProp('AIRPORT_TERMINAL', 160, 45, 0);

      for (let x = -280; x <= 280; x += 55) {
        addProp('HOUSE_LARGE', x, 160, Math.PI);
        addProp('YACHT', x, 240, Math.PI / 2);
        addProp('GAZEBO', x + 20, 200, 0);
        addProp('FOUNTAIN', x - 20, 180, 0);
        addProp('LARGE_TREE', x + 15, 150);
        addProp('BUSH', x - 15, 150);
      }

      for (let x = -280; x <= 280; x += 50) {
        addProp('WAREHOUSE', x, -160, 0);
        addProp('CRANE', x + 20, -220, rand(0, Math.PI * 2));
        addProp('VAN', x - 15, -140, 0);
        addProp('BUS', x + 15, -135, Math.PI / 2);
      }

    } else if (mapType === 'amusement_park') {
      addProp('FERRIS_WHEEL', 0, 0, 0);
      addProp('FERRIS_WHEEL', -150, -150, Math.PI / 4);
      addProp('FERRIS_WHEEL', 150, 150, -Math.PI / 4);

      addProp('CIRCUS_TENT', 0, 140, 0);
      addProp('CIRCUS_TENT', 0, -140, 0);
      addProp('CIRCUS_TENT', 140, 0, 0);
      addProp('CIRCUS_TENT', -140, 0, 0);

      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        addProp('FOUNTAIN', Math.cos(a) * 75, Math.sin(a) * 75);
        addProp('GAZEBO', Math.cos(a) * 110, Math.sin(a) * 110);
        addProp('KIOSK', Math.cos(a + 0.2) * 90, Math.sin(a + 0.2) * 90);
        addProp('BENCH', Math.cos(a - 0.2) * 85, Math.sin(a - 0.2) * 85);
      }

      for (let x = -300; x <= 300; x += 65) {
        addProp('WINDMILL', x, -280, 0);
        addProp('BARN', x + 25, -270, 0);
        addProp('WINDMILL', x, 280, Math.PI);
        addProp('BARN', x - 25, 270, Math.PI);
        addProp('SMALL_TREE', x + 10, 240);
        addProp('FENCE', x, 255, Math.PI / 2);
      }

    } else if (mapType === 'suburbs') {
      addProp('FOUNTAIN', 0, 0, 0);
      addProp('GAZEBO', -40, -40, 0);
      addProp('GAZEBO', 40, 40, 0);
      addProp('FOUNTAIN', -60, 60, 0);
      addProp('FOUNTAIN', 60, -60, 0);

      for (let x = -300; x <= 300; x += 45) {
        for (let z = -300; z <= 300; z += 50) {
          if (!isNearRoad(x, z, 13) && Math.hypot(x, z) > 30) {
            const isFarm = Math.abs(x) > 230 || Math.abs(z) > 230;
            if (isFarm) {
              const farmType = Math.random() < 0.5 ? 'BARN' : 'WINDMILL';
              addProp(farmType, x, z, randChoice([0, Math.PI / 2]));
            } else {
              const hType = Math.random() < 0.35 ? 'HOUSE_LARGE' : 'HOUSE_SMALL';
              addProp(hType, x, z, randChoice([0, Math.PI / 2, Math.PI]));
            }
            addProp('FENCE', x + 9, z, Math.PI / 2);
            addProp('SMALL_TREE', x + 7, z + 7);
            addProp('BUSH', x - 7, z + 7);
            if (Math.random() < 0.6) addProp('CAR', x + 7, z - 7);
          }
        }
      }

    } else if (mapType === 'cyberpunk') {
      const craneSpots = [
        [-240, -240], [-100, -240], [100, -240], [240, -240],
        [-240, 240],  [-100, 240],  [100, 240],  [240, 240]
      ];
      for (const [cx, cz] of craneSpots) {
        addProp('CRANE', cx, cz, rand(0, Math.PI * 2));
        addProp('WAREHOUSE', cx + 20, cz, 0);
        addProp('VAN', cx - 12, cz + 10);
      }
      addProp('TWIN_TOWER', 0, 0, 0);

      for (let x = -200; x <= 200; x += 50) {
        for (let z = -200; z <= 200; z += 50) {
          if (!isNearRoad(x, z, 15) && Math.hypot(x, z) > 35) {
            const towerType = Math.random() < 0.4 ? 'SKYSCRAPER' : 'APARTMENT_TOWER';
            addProp(towerType, x, z, randChoice([0, Math.PI / 2]));
            addProp('POLICE_CAR', x + 12, z);
            addProp('KIOSK', x - 12, z, Math.PI / 2);
          }
        }
      }

    } else {
      // Metropolis
      addProp('TWIN_TOWER', 0, 0, 0);
      addProp('GAZEBO', -120, -120, 0);
      addProp('FOUNTAIN', -120, -150, 0);
      addProp('FOUNTAIN', 120, 120, 0);
      addProp('GAS_STATION', 120, -120, 0);
      addProp('CRANE', -120, 120, rand(0, Math.PI * 2));
      addProp('CRANE', 120, 120, rand(0, Math.PI * 2));

      const skyscraperSpots = [
        { x: -150, z: 0 }, { x: 150, z: 0 }, { x: 0, z: -150 }, { x: 0, z: 150 },
        { x: -150, z: -150 }, { x: 150, z: -150 }, { x: -150, z: 150 }, { x: 150, z: 150 },
        { x: -280, z: -280 }, { x: 280, z: -280 }, { x: -280, z: 280 }, { x: 280, z: 280 }
      ];
      for (const s of skyscraperSpots) {
        if (!isNearRoad(s.x, s.z, 15)) {
          addProp('SKYSCRAPER', s.x, s.z, randChoice([0, Math.PI / 2]));
          addProp('KIOSK', s.x + 12, s.z, Math.PI / 2);
          addProp('POLICE_CAR', s.x, s.z + 12);
        }
      }

      for (let x = -290; x <= 290; x += 44) {
        for (let z = -290; z <= 290; z += 44) {
          if (!isNearRoad(x, z, 14) && Math.hypot(x, z) > 25) {
            const bType = randChoice([
              'BUILDING_MID', 'APARTMENT_TOWER', 'WAREHOUSE',
              'HOUSE_SMALL', 'HOUSE_LARGE', 'KIOSK',
              'CAR', 'SUV', 'VAN', 'BUS', 'LARGE_TREE'
            ]);
            addProp(bType, x, z, randChoice([0, Math.PI / 2, Math.PI]));
            addProp('BUSH', x + 7, z);
            addProp('BENCH', x - 7, z);
          }
        }
      }
    }

    // Dynamic pedestrians
    for (let i = 0; i < 50; i++) {
      const isRoadX = Math.random() < 0.5;
      const roadCoord = randChoice(roadLanes);
      const side = Math.random() < 0.5 ? 7.2 : -7.2;
      let px, pz, vx, vz;
      if (isRoadX) {
        px = roadCoord + side;
        pz = rand(-320, 320);
        vx = 0;
        vz = Math.random() < 0.5 ? 3.5 : -3.5;
      } else {
        px = rand(-320, 320);
        pz = roadCoord + side;
        vx = Math.random() < 0.5 ? 3.5 : -3.5;
        vz = 0;
      }
      addProp('PEDESTRIAN', px, pz, Math.atan2(vx, vz), {
        vx, vz, baseSpeed: 3.5, walkDir: vx !== 0 ? 'x' : 'z', lane: roadCoord + side
      });
    }

    // Dynamic cars
    for (let i = 0; i < 25; i++) {
      const isRoadX = Math.random() < 0.5;
      const roadCoord = randChoice(roadLanes);
      const laneOffset = Math.random() < 0.5 ? 3.0 : -3.0;
      const carType = randChoice(['CAR', 'SUV', 'POLICE_CAR', 'VAN', 'BUS']);
      let cx, cz, vx, vz, rotY;
      if (isRoadX) {
        cx = roadCoord + laneOffset;
        cz = rand(-320, 320);
        const dir = laneOffset > 0 ? 1 : -1;
        vx = 0;
        vz = dir * rand(11, 17);
        rotY = dir > 0 ? 0 : Math.PI;
      } else {
        cx = rand(-320, 320);
        cz = roadCoord + laneOffset;
        const dir = laneOffset > 0 ? 1 : -1;
        vx = dir * rand(11, 17);
        vz = 0;
        rotY = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      addProp(carType, cx, cz, rotY, {
        vx, vz, baseSpeed: Math.hypot(vx, vz), driveDir: vx !== 0 ? 'x' : 'z', lane: roadCoord + laneOffset
      });
    }

    return props;
  }
}
