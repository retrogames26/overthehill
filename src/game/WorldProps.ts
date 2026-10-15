import * as THREE from 'three';
import { Terrain } from './Terrain';
import { ObstacleCollider } from './VehiclePhysics';

export class WorldProps {
  public colliders: ObstacleCollider[] = [];

  constructor(private scene: THREE.Scene, private terrain: Terrain) {
    this.buildBaseCamp();
    this.buildTrailCamps();
    this.buildTinyCreeks();
    this.buildRiverBridge();
    this.buildSummitLookout();
    this.populateInstancedFoliage();
    this.populateInstancedRocks();
  }

  /** Small low-poly timber shelters placed on clear, level camp pads. */
  private buildTrailCamps() {
    const sites = [
      { x: 82, z: -5, scale: 0.9 },
      { x: 118, z: -205, scale: 0.82 },
      { x: -62, z: -310, scale: 1.0 },
    ];
    const wood = new THREE.MeshStandardMaterial({ color: 0x805536, roughness: 1, flatShading: true });
    const darkWood = new THREE.MeshStandardMaterial({ color: 0x513723, roughness: 1, flatShading: true });
    const roof = new THREE.MeshStandardMaterial({ color: 0x344c43, roughness: 1, flatShading: true });
    const stone = new THREE.MeshStandardMaterial({ color: 0x77756b, roughness: 1, flatShading: true });

    for (const site of sites) {
      const group = new THREE.Group();
      group.position.set(site.x, this.terrain.getHeight(site.x, site.z), site.z);
      group.scale.setScalar(site.scale);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.8, 4.2), wood);
      cabin.position.y = 1.4;
      cabin.castShadow = true;
      cabin.receiveShadow = true;
      group.add(cabin);

      // Simple faceted gable roof, with a porch-like overhang.
      const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(4.1, 2.2, 4), roof);
      roofMesh.position.set(0, 3.65, 0);
      roofMesh.rotation.y = Math.PI / 4;
      roofMesh.castShadow = true;
      group.add(roofMesh);

      const door = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.7, 0.12), darkWood);
      door.position.set(0, 0.85, 2.16);
      group.add(door);

      for (const x of [-1.55, 1.55]) {
        const window = new THREE.Mesh(
          new THREE.BoxGeometry(0.72, 0.68, 0.1),
          new THREE.MeshStandardMaterial({ color: 0x9bcbd4, emissive: 0x1b3438, roughness: 0.4 })
        );
        window.position.set(x, 1.75, 2.17);
        group.add(window);
      }

      // A small angular stone fire ring gives each shelter a distinct camp silhouette.
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), stone);
        rock.position.set(Math.cos(a) * 2.5, 0.18, 4.0 + Math.sin(a) * 1.4);
        rock.scale.y = 0.55;
        rock.castShadow = true;
        group.add(rock);
      }
      this.scene.add(group);
    }
  }

  /** Narrow, winding water ribbons add little creeks away from the main trail. */
  private buildTinyCreeks() {
    const streams = [
      [{ x: -8, z: 12 }, { x: 0, z: 1 }, { x: 10, z: -8 }, { x: 18, z: -22 }, { x: 30, z: -36 }],
      [{ x: 95, z: 110 }, { x: 108, z: 96 }, { x: 116, z: 82 }, { x: 125, z: 70 }, { x: 137, z: 62 }],
      [{ x: -185, z: -35 }, { x: -172, z: -52 }, { x: -166, z: -72 }, { x: -153, z: -90 }, { x: -145, z: -108 }],
    ];
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x4aafc7,
      roughness: 0.28,
      metalness: 0.08,
      flatShading: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });

    for (const path of streams) {
      const vertices: number[] = [];
      const indices: number[] = [];
      const samples: { x: number; z: number }[] = [];
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        for (let s = 0; s < 6; s++) {
          const t = s / 6;
          samples.push({ x: THREE.MathUtils.lerp(a.x, b.x, t), z: THREE.MathUtils.lerp(a.z, b.z, t) });
        }
      }
      samples.push(path[path.length - 1]);

      for (let i = 0; i < samples.length; i++) {
        const p = samples[i];
        const prev = samples[Math.max(0, i - 1)];
        const next = samples[Math.min(samples.length - 1, i + 1)];
        const dx = next.x - prev.x;
        const dz = next.z - prev.z;
        const len = Math.hypot(dx, dz) || 1;
        const nx = -dz / len;
        const nz = dx / len;
        const width = 0.75 + 0.25 * Math.sin(i * 0.7);
        const leftX = p.x + nx * width;
        const leftZ = p.z + nz * width;
        const rightX = p.x - nx * width;
        const rightZ = p.z - nz * width;
        const y = Math.max(this.terrain.waterLevel + 0.8, this.terrain.getHeight(p.x, p.z) - 0.12);
        vertices.push(leftX, y, leftZ, rightX, y, rightZ);
        if (i < samples.length - 1) {
          const base = i * 2;
          indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      const creek = new THREE.Mesh(geo, waterMat);
      creek.receiveShadow = true;
      this.scene.add(creek);
    }
  }

  /**
   * Expedition Base Camp at (-120, 180)
   */
  private buildBaseCamp() {
    const campX = -120;
    const campZ = 180;
    const campY = this.terrain.getHeight(campX, campZ);

    const campGroup = new THREE.Group();
    campGroup.position.set(campX, campY, campZ);

    // Materials
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.85 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x2d4a3e, roughness: 0.7 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const canvasMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 }); // Orange tent
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x85542f, roughness: 0.8 });

    // 1. Expedition Headquarters Log Cabin
    const cabinGeo = new THREE.BoxGeometry(6.5, 3.2, 5.0);
    const cabin = new THREE.Mesh(cabinGeo, woodMat);
    cabin.position.set(-6, 1.6, 6);
    cabin.castShadow = true;
    cabin.receiveShadow = true;

    // Sloped roof
    const roofGeo = new THREE.ConeGeometry(5.2, 1.8, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(-6, 4.0, 6);
    roof.castShadow = true;

    campGroup.add(cabin, roof);
    this.colliders.push({ x: campX - 6, z: campZ + 6, radius: 3.5 });

    // 2. Outpost Watchtower
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x4a3221, roughness: 0.9 });
    for (let c = 0; c < 4; c++) {
      const legX = (c % 2 === 0 ? -1.4 : 1.4);
      const legZ = (c < 2 ? -1.4 : 1.4);
      const legGeo = new THREE.CylinderGeometry(0.12, 0.18, 7.5, 6);
      const leg = new THREE.Mesh(legGeo, towerMat);
      leg.position.set(8 + legX, 3.75, 5 + legZ);
      leg.castShadow = true;
      campGroup.add(leg);
    }
    // Tower platform
    const platformGeo = new THREE.BoxGeometry(3.5, 0.25, 3.5);
    const platform = new THREE.Mesh(platformGeo, woodMat);
    platform.position.set(8, 7.5, 5);
    platform.castShadow = true;
    campGroup.add(platform);

    // Tower canopy
    const towerRoofGeo = new THREE.ConeGeometry(2.8, 1.4, 4);
    towerRoofGeo.rotateY(Math.PI / 4);
    const towerRoof = new THREE.Mesh(towerRoofGeo, roofMat);
    towerRoof.position.set(8, 9.2, 5);
    campGroup.add(towerRoof);

    this.colliders.push({ x: campX + 8, z: campZ + 5, radius: 2.2 });

    // 3. Orange Geodesic Expedition Tents
    const tentGeo = new THREE.ConeGeometry(2.2, 2.0, 6);
    const tent1 = new THREE.Mesh(tentGeo, canvasMat);
    tent1.position.set(-8, 1.0, -5);
    tent1.castShadow = true;

    const tent2 = new THREE.Mesh(tentGeo, canvasMat);
    tent2.position.set(-4, 1.0, -8);
    tent2.castShadow = true;

    campGroup.add(tent1, tent2);
    this.colliders.push({ x: campX - 8, z: campZ - 5, radius: 1.8 });
    this.colliders.push({ x: campX - 4, z: campZ - 8, radius: 1.8 });

    // 4. Campfire Ring
    const firePitGeo = new THREE.TorusGeometry(1.0, 0.25, 6, 12);
    firePitGeo.rotateX(Math.PI / 2);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.9 });
    const firePit = new THREE.Mesh(firePitGeo, stoneMat);
    firePit.position.set(0, 0.15, 0);

    // Embers
    const emberGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 8);
    const emberMat = new THREE.MeshStandardMaterial({ color: 0xea580c, emissive: 0xc2410c, emissiveIntensity: 1.0 });
    const embers = new THREE.Mesh(emberGeo, emberMat);
    embers.position.set(0, 0.1, 0);

    campGroup.add(firePit, embers);

    // 5. Gear Crates and Fuel Barrels
    for (let b = 0; b < 3; b++) {
      const barrelGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.0, 10);
      const barrel = new THREE.Mesh(barrelGeo, metalMat);
      barrel.position.set(2 + b * 0.5, 0.5, -4 + (b % 2) * 0.4);
      barrel.castShadow = true;
      campGroup.add(barrel);
    }
    this.colliders.push({ x: campX + 2.5, z: campZ - 4, radius: 1.2 });

    // 6. Camp Flagpole
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 9.0, 8);
    const pole = new THREE.Mesh(poleGeo, metalMat);
    pole.position.set(3, 4.5, 2);
    pole.castShadow = true;

    const campFlagGeo = new THREE.BoxGeometry(1.6, 0.9, 0.04);
    const campFlag = new THREE.Mesh(campFlagGeo, canvasMat);
    campFlag.position.set(3.8, 8.2, 2);
    campGroup.add(pole, campFlag);

    this.scene.add(campGroup);
  }

  /**
   * Rustic Timber Log Bridge across river at (45, 75)
   */
  private buildRiverBridge() {
    const bridgeX = 45;
    const bridgeZ = 75;
    const bridgeY = this.terrain.getHeight(bridgeX, bridgeZ);

    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(bridgeX, bridgeY + 0.3, bridgeZ);
    bridgeGroup.rotation.y = -0.35; // Aligned with road crossing

    const logMat = new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.9 });
    const plankMat = new THREE.MeshStandardMaterial({ color: 0x6e4e34, roughness: 0.85 });

    // Main support timber arches
    const spanLength = 16;
    const bridgeWidth = 7.0;

    for (let s = -1; s <= 1; s += 2) {
      const stringerGeo = new THREE.BoxGeometry(0.5, 0.6, spanLength);
      const stringer = new THREE.Mesh(stringerGeo, logMat);
      stringer.position.set((s * bridgeWidth) * 0.45, -0.3, 0);
      stringer.castShadow = true;
      bridgeGroup.add(stringer);

      // Guardrail posts
      for (let p = -spanLength * 0.45; p <= spanLength * 0.45; p += 2.2) {
        const postGeo = new THREE.CylinderGeometry(0.12, 0.14, 1.4, 6);
        const post = new THREE.Mesh(postGeo, logMat);
        post.position.set((s * bridgeWidth) * 0.48, 0.5, p);
        post.castShadow = true;
        bridgeGroup.add(post);
      }

      // Guardrail horizontal log
      const railGeo = new THREE.BoxGeometry(0.2, 0.2, spanLength);
      const rail = new THREE.Mesh(railGeo, logMat);
      rail.position.set((s * bridgeWidth) * 0.48, 1.1, 0);
      bridgeGroup.add(rail);
    }

    // Timber floor planks
    for (let z = -spanLength * 0.48; z <= spanLength * 0.48; z += 0.45) {
      const plankGeo = new THREE.BoxGeometry(bridgeWidth * 0.95, 0.16, 0.38);
      const plank = new THREE.Mesh(plankGeo, plankMat);
      plank.position.set(0, 0, z);
      plank.castShadow = true;
      plank.receiveShadow = true;
      bridgeGroup.add(plank);
    }

    this.scene.add(bridgeGroup);

    // Colliders for bridge railings
    this.colliders.push({ x: bridgeX - 3.2, z: bridgeZ, radius: 1.2 });
    this.colliders.push({ x: bridgeX + 3.2, z: bridgeZ, radius: 1.2 });
  }

  /**
   * Final Destination: Mountain Summit Lookout at (-70, -330)
   */
  private buildSummitLookout() {
    const sumX = -70;
    const sumZ = -330;
    const sumY = this.terrain.getHeight(sumX, sumZ);

    const summitGroup = new THREE.Group();
    summitGroup.position.set(sumX, sumY, sumZ);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const redLightMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.2 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x422d1d, roughness: 0.9 });

    // 1. Radio Communication Mast
    const mastGeo = new THREE.CylinderGeometry(0.15, 0.4, 22.0, 6);
    const mast = new THREE.Mesh(mastGeo, metalMat);
    mast.position.set(6, 11, 4);
    mast.castShadow = true;

    // Flashing summit beacon
    const beaconGeo = new THREE.SphereGeometry(0.4, 12, 12);
    const beacon = new THREE.Mesh(beaconGeo, redLightMat);
    beacon.position.set(6, 22.2, 4);

    // Satellite dish
    const dishGeo = new THREE.ConeGeometry(1.6, 0.4, 12);
    dishGeo.rotateX(Math.PI / 3);
    const dish = new THREE.Mesh(dishGeo, metalMat);
    dish.position.set(5.5, 14, 4);

    summitGroup.add(mast, beacon, dish);
    this.colliders.push({ x: sumX + 6, z: sumZ + 4, radius: 1.8 });

    // 2. Summit Observation Deck Shelter
    const deckGeo = new THREE.BoxGeometry(7, 0.35, 7);
    const deck = new THREE.Mesh(deckGeo, woodMat);
    deck.position.set(-4, 0.2, -3);
    deck.receiveShadow = true;

    const cabinGeo = new THREE.BoxGeometry(4.5, 2.8, 4.5);
    const cabin = new THREE.Mesh(cabinGeo, woodMat);
    cabin.position.set(-4, 1.6, -3);
    cabin.castShadow = true;

    summitGroup.add(deck, cabin);
    this.colliders.push({ x: sumX - 4, z: sumZ - 3, radius: 3.2 });

    // 3. Expedition Finish Archway with Banner
    const archMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
    const archL = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 5, 8), archMat);
    archL.position.set(-4, 2.5, 5);
    const archR = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 5, 8), archMat);
    archR.position.set(4, 2.5, 5);
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.4, 0.4), archMat);
    topBar.position.set(0, 4.8, 5);

    // FINISH Banner
    const bannerGeo = new THREE.BoxGeometry(6.5, 1.2, 0.1);
    const bannerMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.5 });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0, 4.0, 5);

    summitGroup.add(archL, archR, topBar, banner);

    this.scene.add(summitGroup);
  }

  /**
   * Instanced Pine Trees & Birch Trees for high-density forest performance
   */
  private populateInstancedFoliage() {
    const pineCount = 380;
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 2.5, 6);
    trunkGeo.translate(0, 1.25, 0);

    const foliageGeo = new THREE.ConeGeometry(2.2, 6.0, 6);
    foliageGeo.translate(0, 4.8, 0);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.9 });
    const pineMat = new THREE.MeshStandardMaterial({ color: 0x1f3d24, roughness: 0.85 });

    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, pineCount);
    const foliageMesh = new THREE.InstancedMesh(foliageGeo, pineMat, pineCount);

    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    foliageMesh.castShadow = true;
    foliageMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const treeColor = new THREE.Color();
    const baseGreen = new THREE.Color(0x1a3d20);
    const brightGreen = new THREE.Color(0x2d592b);

    let placed = 0;
    let attempts = 0;

    while (placed < pineCount && attempts < 2500) {
      attempts++;
      const x = (Math.random() - 0.5) * 650;
      const z = (Math.random() - 0.5) * 650;
      const distFromCenter = Math.sqrt(x * x + z * z);

      // Avoid placing in middle of river or too close to camp/summit
      const y = this.terrain.getHeight(x, z);
      if (y < this.terrain.waterLevel + 1.2 || y > 52) continue;

      // Check distance to roads (keep trail clear!)
      const roadInfo = this.terrain.getDistanceToRoad(x, z);
      if (roadInfo.distance < roadInfo.width * 0.75 + 2.5) continue;

      // Base camp clear radius
      const distCamp = Math.hypot(x - -120, z - 180);
      if (distCamp < 22) continue;

      // Summit clear radius
      const distSummit = Math.hypot(x - -70, z - -330);
      if (distSummit < 20) continue;

      // Scale variation
      const scale = 0.75 + Math.random() * 0.55;
      dummy.position.set(x, y, z);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.updateMatrix();

      trunkMesh.setMatrixAt(placed, dummy.matrix);
      foliageMesh.setMatrixAt(placed, dummy.matrix);

      treeColor.copy(baseGreen).lerp(brightGreen, Math.random() * 0.45);
      foliageMesh.setColorAt(placed, treeColor);

      // Add trunk obstacle collider for vehicle physics
      this.colliders.push({ x, z, radius: 0.65 * scale });

      placed++;
    }

    trunkMesh.count = placed;
    foliageMesh.count = placed;
    trunkMesh.instanceMatrix.needsUpdate = true;
    foliageMesh.instanceMatrix.needsUpdate = true;
    if (foliageMesh.instanceColor) foliageMesh.instanceColor.needsUpdate = true;

    trunkMesh.computeBoundingSphere();
    foliageMesh.computeBoundingSphere();

    this.scene.add(trunkMesh, foliageMesh);
  }

  /**
   * Instanced Boulders & Rocks across hillsides and along the rocky ascent
   */
  private populateInstancedRocks() {
    const rockCount = 240;
    const rockGeo = new THREE.DodecahedronGeometry(1.6, 1);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x5e6368,
      roughness: 0.88,
      metalness: 0.1,
      flatShading: true,
    });

    const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    rockMesh.castShadow = true;
    rockMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const rockColor = new THREE.Color();
    const baseRock = new THREE.Color(0x565c63);
    const warmRock = new THREE.Color(0x6e695d);

    let placed = 0;
    let attempts = 0;

    // Concentrate some rocks intentionally near Checkpoint 4 (Rocky Ridge Ascent)
    while (placed < rockCount && attempts < 1800) {
      attempts++;
      let x = 0;
      let z = 0;

      if (placed < 60) {
        // Rocky ascent zone at (165, -95)
        x = 165 + (Math.random() - 0.5) * 65;
        z = -95 + (Math.random() - 0.5) * 65;
      } else {
        x = (Math.random() - 0.5) * 680;
        z = (Math.random() - 0.5) * 680;
      }

      const y = this.terrain.getHeight(x, z);
      if (y < this.terrain.waterLevel + 0.4) continue;

      const roadInfo = this.terrain.getDistanceToRoad(x, z);
      // Let some rocks sit slightly on the road edge for an authentic obstacle course, but not completely blocking
      if (roadInfo.distance < roadInfo.width * 0.4) continue;

      // Base camp clear radius
      const distCamp = Math.hypot(x - -120, z - 180);
      if (distCamp < 15) continue;

      const scaleX = 0.6 + Math.random() * 0.9;
      const scaleY = 0.5 + Math.random() * 0.8;
      const scaleZ = 0.6 + Math.random() * 0.9;

      dummy.position.set(x, y + scaleY * 0.5, z);
      dummy.scale.set(scaleX, scaleY, scaleZ);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dummy.updateMatrix();

      rockMesh.setMatrixAt(placed, dummy.matrix);

      rockColor.copy(baseRock).lerp(warmRock, Math.random() * 0.4);
      rockMesh.setColorAt(placed, rockColor);

      // Add collider
      this.colliders.push({ x, z, radius: Math.max(scaleX, scaleZ) * 1.35 });

      placed++;
    }

    rockMesh.count = placed;
    rockMesh.instanceMatrix.needsUpdate = true;
    if (rockMesh.instanceColor) rockMesh.instanceColor.needsUpdate = true;
    rockMesh.computeBoundingSphere();

    this.scene.add(rockMesh);
  }
}
