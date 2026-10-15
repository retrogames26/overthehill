import * as THREE from 'three';
import { Terrain } from './Terrain';

export type CameraMode = 'chase' | 'hood' | 'orbit' | 'foot';

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  public mode: CameraMode = 'chase';

  // Manual orbit offsets from mouse drag
  public orbitYaw: number = 0;
  public orbitPitch: number = 0.22;
  public distance: number = 7.5;
  public minDistance: number = 3.5;
  public maxDistance: number = 18.0;

  // Smoothed internal camera states
  private currentTarget = new THREE.Vector3();
  private currentPos = new THREE.Vector3();
  private lookTarget = new THREE.Vector3();

  // Settings
  public mouseSensitivity: number = 1.0;

  constructor(public terrain: Terrain) {
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 1000);
    this.currentPos.set(-120, 20, 190);
    this.camera.position.copy(this.currentPos);
    this.currentTarget.set(-120, 15, 175);
    this.camera.lookAt(this.currentTarget);
  }

  public nextMode() {
    if (this.mode === 'chase') {
      this.mode = 'hood';
    } else if (this.mode === 'hood') {
      this.mode = 'orbit';
    } else {
      this.mode = 'chase';
    }
  }

  public onMouseMove(dx: number, dy: number) {
    const sens = 0.003 * this.mouseSensitivity;
    this.orbitYaw -= dx * sens;
    this.orbitPitch = Math.max(-0.15, Math.min(1.2, this.orbitPitch + dy * sens));
  }

  public onMouseWheel(deltaY: number) {
    this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance + deltaY * 0.005));
  }

  public update(
    dt: number,
    vehiclePos: THREE.Vector3,
    vehicleForward: THREE.Vector3,
    vehicleUp: THREE.Vector3,
    speedKmh: number,
    isDriving: boolean,
    playerPos?: THREE.Vector3,
    playerYaw?: number
  ) {
    const clampedDt = Math.min(dt, 0.05);

    if (!isDriving && playerPos) {
      // Foot exploration camera
      const target = this.lookTarget.copy(playerPos).add(new THREE.Vector3(0, 1.5, 0));
      this.currentTarget.lerp(target, Math.min(1, clampedDt * 12));

      const camYaw = (playerYaw || 0) + this.orbitYaw;
      const camDist = 4.2;
      const camHeight = 1.2 + Math.sin(this.orbitPitch) * camDist;
      const horizontalDist = Math.cos(this.orbitPitch) * camDist;

      const desiredPos = new THREE.Vector3(
        this.currentTarget.x + Math.sin(camYaw) * horizontalDist,
        this.currentTarget.y + camHeight,
        this.currentTarget.z + Math.cos(camYaw) * horizontalDist
      );

      // Prevent camera from dipping underground
      const groundY = this.terrain.getHeight(desiredPos.x, desiredPos.z);
      if (desiredPos.y < groundY + 0.6) {
        desiredPos.y = groundY + 0.6;
      }

      this.currentPos.lerp(desiredPos, Math.min(1, clampedDt * 14));
      this.camera.position.copy(this.currentPos);
      this.camera.lookAt(this.currentTarget);
      return;
    }

    if (this.mode === 'hood') {
      // Hood / Bumper camera
      const hoodTarget = this.lookTarget.copy(vehiclePos).addScaledVector(vehicleForward, 1.2).add(new THREE.Vector3(0, 1.25, 0));
      const hoodPos = new THREE.Vector3().copy(vehiclePos)
        .addScaledVector(vehicleForward, 0.8)
        .add(new THREE.Vector3(0, 1.45, 0));

      const lookAhead = new THREE.Vector3().copy(hoodPos).addScaledVector(vehicleForward, 25);

      this.camera.position.lerp(hoodPos, Math.min(1, clampedDt * 22));
      this.currentTarget.lerp(lookAhead, Math.min(1, clampedDt * 22));
      this.camera.lookAt(this.currentTarget);

      // Speed FOV expansion
      const fovRatio = Math.min(1, speedKmh / 90);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 65 + fovRatio * 15, 6, clampedDt);
      this.camera.updateProjectionMatrix();
      return;
    }

    // Chase and Orbit modes
    // Dynamic look-ahead target
    const speedAhead = Math.min(12, speedKmh * 0.12);
    const target = this.lookTarget.copy(vehiclePos)
      .addScaledVector(vehicleForward, speedAhead * 0.4)
      .add(new THREE.Vector3(0, 1.4, 0));

    this.currentTarget.lerp(target, Math.min(1, clampedDt * 9));

    // Vehicle chase heading with manual orbit offset
    let chaseYaw = Math.atan2(vehicleForward.x, vehicleForward.z) + Math.PI;
    if (this.mode === 'orbit') {
      chaseYaw += this.orbitYaw;
    } else {
      // In chase mode, orbitYaw gently decays back to 0 unless mouse is moving
      this.orbitYaw = THREE.MathUtils.damp(this.orbitYaw, 0, 1.8, clampedDt);
      chaseYaw += this.orbitYaw;
    }

    const effectiveDist = this.distance + (speedKmh / 90) * 1.5;
    const horizontalDist = Math.cos(this.orbitPitch) * effectiveDist;
    const verticalDist = 2.4 + Math.sin(this.orbitPitch) * effectiveDist;

    const desiredPos = new THREE.Vector3(
      this.currentTarget.x + Math.sin(chaseYaw) * horizontalDist,
      this.currentTarget.y + verticalDist,
      this.currentTarget.z + Math.cos(chaseYaw) * horizontalDist
    );

    // Anti-terrain clipping ray check
    const terrainHeightAtCam = this.terrain.getHeight(desiredPos.x, desiredPos.z);
    if (desiredPos.y < terrainHeightAtCam + 0.8) {
      desiredPos.y = terrainHeightAtCam + 0.8;
    }

    // Smooth exponential damp for buttery chase feel
    this.currentPos.x = THREE.MathUtils.damp(this.currentPos.x, desiredPos.x, 8.5, clampedDt);
    this.currentPos.y = THREE.MathUtils.damp(this.currentPos.y, desiredPos.y, 8.5, clampedDt);
    this.currentPos.z = THREE.MathUtils.damp(this.currentPos.z, desiredPos.z, 8.5, clampedDt);

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentTarget);

    // Dynamic FOV for speed sensation
    const targetFov = 60 + (speedKmh / 90) * 12;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5, clampedDt);
    this.camera.updateProjectionMatrix();
  }

  public updateTitleOrbit(time: number) {
    // Beautiful cinematic orbit around base camp
    const center = new THREE.Vector3(-120, 16.5, 175);
    const orbitRadius = 18.0;
    const angle = time * 0.12;

    const camX = center.x + Math.sin(angle) * orbitRadius;
    const camZ = center.z + Math.cos(angle) * orbitRadius;
    const camY = center.y + 5.5 + Math.sin(angle * 0.5) * 1.5;

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(center);
  }
}
