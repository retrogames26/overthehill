import * as THREE from 'three';
import { SurfaceType } from '../types/game';

export interface RoadPoint {
  x: number;
  z: number;
  width: number;
}

export class Terrain {
  public mesh: THREE.Mesh;
  public waterMesh: THREE.Mesh;
  public roadMesh: THREE.Mesh;
  public size: number = 800;
  public segments: number = 128; // Larger triangular faces create a readable low-poly landscape
  public waterLevel: number = 4.2;

  // Road waypoints forming the main expedition trail
  public mainRoad: RoadPoint[] = [
    { x: -150, z: 220, width: 8.5 }, // New trailhead spawn
    { x: -140, z: 210, width: 8.5 }, // Camp back
    { x: -110, z: 175, width: 8.5 }, // Camp center
    { x: -75, z: 135, width: 8.0 },  // CP 1 Gate
    { x: -35, z: 105, width: 7.5 },  // Meadow descent
    { x: 10, z: 85, width: 7.5 },    // River approach
    { x: 45, z: 75, width: 7.0 },    // Bridge / crossing (CP 2)
    { x: 85, z: 65, width: 7.0 },    // River exit
    { x: 125, z: 45, width: 7.5 },   // Valley entrance
    { x: 155, z: 10, width: 7.0 },   // Pine forest (CP 3)
    { x: 175, z: -40, width: 7.0 },  // Forest curve
    { x: 165, z: -95, width: 7.0 },  // Rocky ascent base (CP 4)
    { x: 185, z: -120, width: 6.5 }, // Rock climb approach
    { x: 165, z: -140, width: 6.0 }, // Tight switchback 1
    { x: 185, z: -162, width: 6.0 }, // Tight switchback 2
    { x: 150, z: -175, width: 6.0 }, // Cliff traverse
    { x: 110, z: -185, width: 6.5 }, // Switchback 3
    { x: 75, z: -230, width: 7.0 },  // Eagle crest (CP 5)
    { x: 25, z: -270, width: 6.5 },  // High ridge
    { x: -30, z: -305, width: 7.0 }, // Summit approach
    { x: -70, z: -330, width: 8.5 }, // Summit lookout (CP 6)
  ];

  // Branch trail 1: Muddy River Shortcut
  public mudTrail: RoadPoint[] = [
    { x: -20, z: 95, width: 6.0 },
    { x: 25, z: 50, width: 5.5 },
    { x: 65, z: 35, width: 5.5 },
    { x: 110, z: 30, width: 6.0 },
  ];

  constructor(scene: THREE.Scene) {
    const geo = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    const cGrass = new THREE.Color(0x4a7c39);      // Lush mountain grass
    const cHighGrass = new THREE.Color(0x658d43);  // Sunny ridge grass
    const cDirt = new THREE.Color(0x8a6f4d);       // Dirt trail
    const cMud = new THREE.Color(0x4a3b2c);        // River mud
    const cRock = new THREE.Color(0x686a6c);       // Granite cliff
    const cSnow = new THREE.Color(0xe8edf2);       // Alpine snow
    const cSand = new THREE.Color(0xb5a478);       // River bank sand

    const tempCol = new THREE.Color();
    const normal = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.getHeight(x, z);
      pos.setY(i, y);

      this.getNormal(x, z, normal);
      const slope = 1.0 - normal.y; // 0 is flat, 1 is vertical cliff

      // Check distance to road
      const roadDist = this.getDistanceToRoad(x, z);
      const isRoad = roadDist.distance < roadDist.width * 0.5;
      const roadBlend = Math.max(0, Math.min(1, (roadDist.distance - roadDist.width * 0.3) / (roadDist.width * 0.5)));

      if (y < this.waterLevel + 0.6) {
        // River bed / banks
        tempCol.copy(cSand).lerp(cMud, this.colorNoise(x, z) * 0.3);
      } else if (isRoad) {
        // Dirt road
        tempCol.copy(cDirt).lerp(cGrass, roadBlend * 0.4);
      } else if (slope > 0.48) {
        // Steep mountain cliff
        tempCol.copy(cRock).multiplyScalar(0.86 + this.colorNoise(x, z) * 0.24);
      } else if (y > 54) {
        // High snow peak
        tempCol.copy(cSnow).lerp(cRock, slope * 1.5);
      } else if (y > 30) {
        // Alpine high plateau
        tempCol.copy(cHighGrass).lerp(cRock, slope * 1.2);
      } else {
        // Lowland valley meadow
        tempCol.copy(cGrass).lerp(cHighGrass, (y / 30) * 0.5);
      }

      colors[i * 3] = tempCol.r;
      colors[i * 3 + 1] = tempCol.g;
      colors[i * 3 + 2] = tempCol.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: true,
    });

    this.mesh = new THREE.Mesh(geo, terrainMat);
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    // River water surface
    const waterGeo = new THREE.PlaneGeometry(this.size * 0.8, this.size * 0.8, 32, 32);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2b6b80,
      roughness: 0.15,
      metalness: 0.25,
      transparent: true,
      opacity: 0.78,
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.y = this.waterLevel;
    this.waterMesh.receiveShadow = true;
    scene.add(this.waterMesh);

    // Procedural dirt road ribbon mesh overlay for crisp visual trail edges
    this.roadMesh = this.buildRoadRibbon();
    scene.add(this.roadMesh);
  }

  /** Stable spatial variation keeps low-poly terrain colors consistent between runs. */
  private colorNoise(x: number, z: number): number {
    const v = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return v - Math.floor(v);
  }

  /**
   * Analytical continuous terrain height function.
   * Super fast, deterministic, zero memory allocation.
   */
  public getHeight(x: number, z: number): number {
    // Distance from world center
    const distCenter = Math.sqrt(x * x + z * z);

    // Natural mountain boundary walls at perimeters (smooth exponential climb)
    let perimeterClimb = 0;
    if (distCenter > 290) {
      const d = (distCenter - 290) / 90;
      perimeterClimb = Math.pow(Math.min(d, 2.5), 2.2) * 45;
    }

    // River carving: A meandering river curving through z = 50 to 90
    // River center curve: z = 60 + 25 * sin(x * 0.015)
    const riverCenterZ = 65 + 28 * Math.sin(x * 0.018);
    const distRiver = Math.abs(z - riverCenterZ);
    let riverTrench = 0;
    if (distRiver < 42 && Math.abs(x) < 260) {
      const riverFactor = 1 - (distRiver / 42);
      riverTrench = Math.cos(riverFactor * Math.PI * 0.5) * -6.5;
    }

    // Base rolling landscape harmonics
    const h1 = Math.sin(x * 0.009) * Math.cos(z * 0.009) * 16;
    const h2 = Math.sin(x * 0.022 + 1.2) * Math.sin(z * 0.02 + 0.8) * 7.5;
    const h3 = Math.cos(x * 0.045 - 0.5) * Math.cos(z * 0.042) * 2.8;

    // Mountain massif in North-West (-150 to 50, -380 to -180)
    const mtnDx = (x - -60) / 140;
    const mtnDz = (z - -300) / 130;
    const mtnDistSq = mtnDx * mtnDx + mtnDz * mtnDz;
    const mountainPeak = Math.max(0, (1 - Math.sqrt(mtnDistSq))) * 58;

    // Camp plateau smoothing at (-120, 180)
    const campDx = (x - -120) / 45;
    const campDz = (z - 180) / 45;
    const campDistSq = campDx * campDx + campDz * campDz;
    const campPlateau = Math.max(0, 1 - Math.sqrt(campDistSq));

    let rawHeight = 12 + h1 + h2 + h3 + mountainPeak + perimeterClimb + riverTrench;

    // Flatten camp zone slightly for a comfortable staging ground
    if (campPlateau > 0) {
      rawHeight = rawHeight * (1 - campPlateau * 0.75) + 14.5 * (campPlateau * 0.75);
    }

    return rawHeight;
  }

  /**
   * Surface normal calculation using symmetric finite differences
   */
  public getNormal(x: number, z: number, outNormal: THREE.Vector3): THREE.Vector3 {
    const eps = 0.5;
    const hL = this.getHeight(x - eps, z);
    const hR = this.getHeight(x + eps, z);
    const hD = this.getHeight(x, z - eps);
    const hU = this.getHeight(x, z + eps);

    outNormal.set(-(hR - hL) / (2 * eps), 1.0, -(hU - hD) / (2 * eps)).normalize();
    return outNormal;
  }

  /**
   * Identifies ground surface type under coordinates
   */
  public getSurfaceType(x: number, z: number, y: number): SurfaceType {
    if (y <= this.waterLevel + 0.3) {
      return 'water';
    }

    const roadInfo = this.getDistanceToRoad(x, z);
    if (roadInfo.distance < roadInfo.width * 0.55) {
      if (roadInfo.isMud) return 'mud';
      return 'road';
    }

    const norm = new THREE.Vector3();
    this.getNormal(x, z, norm);
    if (norm.y < 0.72) {
      return 'rock';
    }

    // Low river bank mud
    if (y < this.waterLevel + 1.8 && Math.abs(z - (65 + 28 * Math.sin(x * 0.018))) < 32) {
      return 'mud';
    }

    return 'grass';
  }

  /**
   * Finds distance from given (x, z) to the nearest road segment
   */
  public getDistanceToRoad(x: number, z: number): { distance: number; width: number; isMud: boolean } {
    let minDist = 999999;
    let roadWidth = 7.0;
    let isMud = false;

    // Check main expedition road
    for (let i = 0; i < this.mainRoad.length - 1; i++) {
      const p1 = this.mainRoad[i];
      const p2 = this.mainRoad[i + 1];
      const dist = this.distToSegment(x, z, p1.x, p1.z, p2.x, p2.z);
      if (dist < minDist) {
        minDist = dist;
        roadWidth = (p1.width + p2.width) * 0.5;
        isMud = false;
      }
    }

    // Check mud trail
    for (let i = 0; i < this.mudTrail.length - 1; i++) {
      const p1 = this.mudTrail[i];
      const p2 = this.mudTrail[i + 1];
      const dist = this.distToSegment(x, z, p1.x, p1.z, p2.x, p2.z);
      if (dist < minDist) {
        minDist = dist;
        roadWidth = (p1.width + p2.width) * 0.5;
        isMud = true;
      }
    }

    return { distance: minDist, width: roadWidth, isMud };
  }

  private distToSegment(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number {
    const l2 = (x2 - x1) * (x2 - x1) + (z2 - z1) * (z2 - z1);
    if (l2 === 0) return Math.sqrt((px - x1) * (px - x1) + (pz - z1) * (pz - z1));
    let t = ((px - x1) * (x2 - x1) + (pz - z1) * (z2 - z1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projZ = z1 + t * (z2 - z1);
    return Math.sqrt((px - projX) * (px - projX) + (pz - projZ) * (pz - projZ));
  }

  /**
   * Generates a 3D road mesh slightly raised above terrain to avoid Z-fighting
   */
  private buildRoadRibbon(): THREE.Mesh {
    const vertices: number[] = [];
    const indices: number[] = [];
    let vertexIndex = 0;

    // Densify each waypoint segment so the road follows the terrain continuously
    // instead of cutting corners or forming long, flat bridges across hills.
    const buildStrip = (pts: RoadPoint[]) => {
      const samples: RoadPoint[] = [];
      const stepsPerSegment = 8;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        for (let step = 0; step < stepsPerSegment; step++) {
          const t = step / stepsPerSegment;
          samples.push({
            x: THREE.MathUtils.lerp(a.x, b.x, t),
            z: THREE.MathUtils.lerp(a.z, b.z, t),
            width: THREE.MathUtils.lerp(a.width, b.width, t),
          });
        }
      }
      samples.push(pts[pts.length - 1]);

      for (let i = 0; i < samples.length; i++) {
        const curr = samples[i];
        const prev = samples[Math.max(0, i - 1)];
        const next = samples[Math.min(samples.length - 1, i + 1)];
        const dirX = next.x - prev.x;
        const dirZ = next.z - prev.z;
        const len = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
        const normX = -dirZ / len;
        const normZ = dirX / len;
        const halfW = curr.width * 0.5;

        const leftX = curr.x - normX * halfW;
        const leftZ = curr.z - normZ * halfW;
        const rightX = curr.x + normX * halfW;
        const rightZ = curr.z + normZ * halfW;

        // Sample both edges independently, keeping the ribbon glued to hills.
        const leftY = this.getHeight(leftX, leftZ) + 0.045;
        const rightY = this.getHeight(rightX, rightZ) + 0.045;
        vertices.push(leftX, leftY, leftZ, rightX, rightY, rightZ);

        if (i < samples.length - 1) {
          const base = vertexIndex;
          indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
          vertexIndex += 2;
        } else {
          vertexIndex += 2;
        }
      }
    };

    buildStrip(this.mainRoad);
    buildStrip(this.mudTrail);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x806448,
      roughness: 1.0,
      metalness: 0,
      flatShading: true,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -1.0,
    });

    const mesh = new THREE.Mesh(geo, roadMat);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    return mesh;
  }
}
