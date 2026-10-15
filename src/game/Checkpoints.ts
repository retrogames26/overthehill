import * as THREE from 'three';
import { CheckpointData, ExpeditionStats } from '../types/game';
import { Terrain } from './Terrain';

export class CheckpointManager {
  public checkpoints: CheckpointData[] = [];
  public currentCheckpointIndex: number = 0;
  public totalCheckpoints: number = 6;
  public isCompleted: boolean = false;
  public startTime: number = 0;
  public completionTime: number = 0;
  public topSpeedReached: number = 0;

  // 3D Visual Meshes
  public checkpointMeshes: THREE.Group[] = [];
  private activeGlowRing: THREE.Mesh | null = null;

  constructor(private scene: THREE.Scene, private terrain: Terrain) {
    this.defineCheckpoints();
    this.buildCheckpointMeshes();
  }

  private defineCheckpoints() {
    const cpCoords: { name: string; desc: string; x: number; z: number; radius: number; rotY: number }[] = [
      {
        name: 'Camp Departure',
        desc: 'Pass through the timber expedition gate and start down the trail',
        x: -75,
        z: 135,
        radius: 7.0,
        rotY: -0.65,
      },
      {
        name: 'River Crossing',
        desc: 'Cross the shallow river rapids safely onto the northern bank',
        x: 45,
        z: 75,
        radius: 7.5,
        rotY: -0.25,
      },
      {
        name: 'Pine Valley Trail',
        desc: 'Navigate the winding pine forest trail through the valley',
        x: 155,
        z: 10,
        radius: 7.5,
        rotY: 0.45,
      },
      {
        name: 'Rocky Ridge Ascent',
        desc: 'Power up the steep boulder-strewn hill climb using 4WD torque',
        x: 165,
        z: -95,
        radius: 7.5,
        rotY: 0.85,
      },
      {
        name: 'Eagle Crest Plateau',
        desc: 'Reach the high alpine plateau and prepare for the final ascent',
        x: 75,
        z: -230,
        radius: 8.0,
        rotY: 1.2,
      },
      {
        name: 'Summit Lookout Station',
        desc: 'Reach the mountain peak observation post to complete the expedition!',
        x: -70,
        z: -330,
        radius: 9.0,
        rotY: 1.6,
      },
    ];

    this.checkpoints = cpCoords.map((cp, idx) => {
      const y = this.terrain.getHeight(cp.x, cp.z);
      return {
        id: idx,
        name: cp.name,
        description: cp.desc,
        position: [cp.x, y, cp.z],
        radius: cp.radius,
        rotationY: cp.rotY,
      };
    });
  }

  private buildCheckpointMeshes() {
    const postMat = new THREE.MeshStandardMaterial({ color: 0x5a3e28, roughness: 0.85 }); // Rough timber
    const gateCrossMat = new THREE.MeshStandardMaterial({ color: 0x3d281a, roughness: 0.8 });
    const flagMatActive = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xd97706, emissiveIntensity: 0.6 });
    const flagMatComplete = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.4 });
    const flagMatPending = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });

    this.checkpoints.forEach((cp, idx) => {
      const group = new THREE.Group();
      group.position.set(cp.position[0], cp.position[1], cp.position[2]);
      group.rotation.y = cp.rotationY;

      const halfW = cp.radius * 0.75;

      // Left and right timber gateway posts
      const postGeo = new THREE.CylinderGeometry(0.32, 0.38, 5.5, 8);
      const postL = new THREE.Mesh(postGeo, postMat);
      postL.position.set(-halfW, 2.75, 0);
      postL.castShadow = true;

      const postR = new THREE.Mesh(postGeo, postMat);
      postR.position.set(halfW, 2.75, 0);
      postR.castShadow = true;

      // Overhead cross beam
      const crossGeo = new THREE.BoxGeometry(cp.radius * 1.6, 0.45, 0.45);
      const cross = new THREE.Mesh(crossGeo, gateCrossMat);
      cross.position.set(0, 5.2, 0);
      cross.castShadow = true;

      // Pennant Flags
      const flagGeo = new THREE.ConeGeometry(0.55, 1.4, 3);
      flagGeo.rotateZ(Math.PI / 2);
      const flagL = new THREE.Mesh(flagGeo, idx === 0 ? flagMatActive : flagMatPending);
      flagL.position.set(-halfW, 5.7, 0);

      const flagR = new THREE.Mesh(flagGeo, idx === 0 ? flagMatActive : flagMatPending);
      flagR.position.set(halfW, 5.7, 0);

      // Checkpoint ground beacon ring
      const ringGeo = new THREE.RingGeometry(cp.radius * 0.4, cp.radius * 0.7, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0xffaa00 : 0x475569,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.12;

      group.add(postL, postR, cross, flagL, flagR, ring);
      this.scene.add(group);
      this.checkpointMeshes.push(group);
    });
  }

  public startExpedition() {
    this.currentCheckpointIndex = 0;
    this.isCompleted = false;
    this.startTime = Date.now();
    this.completionTime = 0;
    this.topSpeedReached = 0;
    this.updateMeshVisuals();
  }

  public checkVehiclePass(
    vehiclePos: THREE.Vector3,
    currentSpeedKmh: number,
    onCheckpointPassed: (cp: CheckpointData, isFinal: boolean) => void
  ) {
    if (this.isCompleted || this.currentCheckpointIndex >= this.checkpoints.length) {
      return;
    }

    if (currentSpeedKmh > this.topSpeedReached) {
      this.topSpeedReached = currentSpeedKmh;
    }

    const currentCp = this.checkpoints[this.currentCheckpointIndex];
    const dx = vehiclePos.x - currentCp.position[0];
    const dz = vehiclePos.z - currentCp.position[2];
    const distSq = dx * dx + dz * dz;

    if (distSq < currentCp.radius * currentCp.radius) {
      // Checkpoint cleared!
      const passedCp = currentCp;
      this.currentCheckpointIndex++;

      const isFinal = this.currentCheckpointIndex >= this.checkpoints.length;
      if (isFinal) {
        this.isCompleted = true;
        this.completionTime = (Date.now() - this.startTime) / 1000;
      }

      this.updateMeshVisuals();
      onCheckpointPassed(passedCp, isFinal);
    }
  }

  private updateMeshVisuals() {
    const cActive = new THREE.Color(0xffb703);
    const cComplete = new THREE.Color(0x10b981);
    const cPending = new THREE.Color(0x475569);

    this.checkpointMeshes.forEach((meshGroup, idx) => {
      const ringMesh = meshGroup.children[5] as THREE.Mesh;
      if (ringMesh && ringMesh.material instanceof THREE.MeshBasicMaterial) {
        if (idx < this.currentCheckpointIndex) {
          ringMesh.material.color.copy(cComplete);
          ringMesh.material.opacity = 0.25;
        } else if (idx === this.currentCheckpointIndex) {
          ringMesh.material.color.copy(cActive);
          ringMesh.material.opacity = 0.65;
        } else {
          ringMesh.material.color.copy(cPending);
          ringMesh.material.opacity = 0.2;
        }
      }
    });
  }

  public updateAnimation(time: number) {
    // Pulse and animate active checkpoint ring
    if (this.currentCheckpointIndex < this.checkpointMeshes.length) {
      const activeGroup = this.checkpointMeshes[this.currentCheckpointIndex];
      const ring = activeGroup.children[5] as THREE.Mesh;
      if (ring) {
        const pulse = 1.0 + Math.sin(time * 3.5) * 0.08;
        ring.scale.set(pulse, 1, pulse);
      }
    }
  }

  public getStats(vehiclePos: THREE.Vector3): ExpeditionStats {
    let distanceToNext = 0;
    if (this.currentCheckpointIndex < this.checkpoints.length) {
      const cp = this.checkpoints[this.currentCheckpointIndex];
      const dx = vehiclePos.x - cp.position[0];
      const dz = vehiclePos.z - cp.position[2];
      distanceToNext = Math.round(Math.sqrt(dx * dx + dz * dz));
    }

    const elapsed = this.isCompleted
      ? this.completionTime
      : this.startTime > 0
      ? (Date.now() - this.startTime) / 1000
      : 0;

    return {
      totalCheckpoints: this.totalCheckpoints,
      currentCheckpointIndex: this.currentCheckpointIndex,
      completed: this.isCompleted,
      startTime: this.startTime,
      elapsedTime: elapsed,
      topSpeed: Math.round(this.topSpeedReached),
      distanceToNext,
    };
  }

  public getCurrentCheckpoint(): CheckpointData | null {
    if (this.currentCheckpointIndex < this.checkpoints.length) {
      return this.checkpoints[this.currentCheckpointIndex];
    }
    return null;
  }
}
