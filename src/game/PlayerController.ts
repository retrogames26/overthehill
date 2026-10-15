import * as THREE from 'three';
import { Terrain } from './Terrain';
import { ObstacleCollider } from './VehiclePhysics';

export class PlayerController {
  public group: THREE.Group;
  public position = new THREE.Vector3(-123, 14.8, 175);
  public velocity = new THREE.Vector3();
  public yaw: number = 0;
  public isGrounded: boolean = true;
  public isDriving: boolean = false;
  public walkSpeed: number = 4.5;
  public runSpeed: number = 8.5;
  public jumpStrength: number = 7.0;

  // Character body parts for procedural walking animation
  private leftLeg: THREE.Mesh;
  private rightLeg: THREE.Mesh;
  private leftArm: THREE.Mesh;
  private rightArm: THREE.Mesh;
  private walkAnimPhase: number = 0;

  // Input states
  public moveForward: number = 0;
  public moveRight: number = 0;
  public isRunning: boolean = false;

  constructor(public terrain: Terrain) {
    this.group = new THREE.Group();
    const { leftLeg, rightLeg, leftArm, rightArm } = this.buildCharacterMesh();
    this.leftLeg = leftLeg;
    this.rightLeg = rightLeg;
    this.leftArm = leftArm;
    this.rightArm = rightArm;

    this.snapToTerrain();
  }

  private buildCharacterMesh() {
    // Stylized Expedition Explorer Character
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x24587a, roughness: 0.6 }); // Expedition blue
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x3d3935, roughness: 0.7 });  // Rugged dark cargo pants
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdcb897, roughness: 0.5 });   // Stylized skin
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xc87d32, roughness: 0.5 });    // Amber knit beanie
    const backpackMat = new THREE.MeshStandardMaterial({ color: 0x6e5034, roughness: 0.8 }); // Canvas backpack
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x1f1b18, roughness: 0.9 });   // Hiking boots

    // Torso (Jacket)
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.65, 0.32);
    const torso = new THREE.Mesh(torsoGeo, jacketMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    this.group.add(torso);

    // Expedition Backpack
    const backpackGeo = new THREE.BoxGeometry(0.42, 0.48, 0.22);
    const backpack = new THREE.Mesh(backpackGeo, backpackMat);
    backpack.position.set(0, 1.05, -0.25);
    backpack.castShadow = true;
    this.group.add(backpack);

    // Bedroll strapped on top of pack
    const bedrollGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.44, 8);
    bedrollGeo.rotateZ(Math.PI / 2);
    const bedrollMat = new THREE.MeshStandardMaterial({ color: 0x4a6b42 });
    const bedroll = new THREE.Mesh(bedrollGeo, bedrollMat);
    bedroll.position.set(0, 1.35, -0.25);
    this.group.add(bedroll);

    // Head
    const headGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.58;
    head.castShadow = true;
    this.group.add(head);

    // Beanie Hat
    const hatGeo = new THREE.BoxGeometry(0.34, 0.16, 0.34);
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = 1.73;
    this.group.add(hat);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.14, 0.55, 0.14);
    armGeo.translate(0, -0.22, 0); // pivot at shoulder

    const leftArm = new THREE.Mesh(armGeo, jacketMat);
    leftArm.position.set(-0.34, 1.3, 0);
    leftArm.castShadow = true;
    this.group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, jacketMat);
    rightArm.position.set(0.34, 1.3, 0);
    rightArm.castShadow = true;
    this.group.add(rightArm);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.18, 0.65, 0.18);
    legGeo.translate(0, -0.3, 0); // pivot at hip

    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.16, 0.72, 0);
    leftLeg.castShadow = true;
    this.group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.16, 0.72, 0);
    rightLeg.castShadow = true;
    this.group.add(rightLeg);

    // Boots
    const bootGeo = new THREE.BoxGeometry(0.19, 0.15, 0.25);
    const bootL = new THREE.Mesh(bootGeo, bootMat);
    bootL.position.set(0, -0.6, 0.04);
    leftLeg.add(bootL);

    const bootR = new THREE.Mesh(bootGeo, bootMat);
    bootR.position.set(0, -0.6, 0.04);
    rightLeg.add(bootR);

    return { leftLeg, rightLeg, leftArm, rightArm };
  }

  public snapToTerrain() {
    const groundY = this.terrain.getHeight(this.position.x, this.position.z);
    this.position.y = groundY;
    this.group.position.copy(this.position);
    this.velocity.set(0, 0, 0);
  }

  public setVisible(visible: boolean) {
    this.group.visible = visible;
  }

  public exitVehicle(vehiclePos: THREE.Vector3, vehicleRight: THREE.Vector3) {
    this.isDriving = false;
    this.setVisible(true);

    // Place character on the driver side (left of vehicle, approx 1.6m out)
    this.position.copy(vehiclePos).addScaledVector(vehicleRight, -1.8);
    const groundY = this.terrain.getHeight(this.position.x, this.position.z);
    this.position.y = groundY;
    this.velocity.set(0, 0, 0);
    this.group.position.copy(this.position);
  }

  public enterVehicle() {
    this.isDriving = true;
    this.setVisible(false);
  }

  public update(dt: number, cameraYaw: number, obstacles: ObstacleCollider[]) {
    if (this.isDriving) return;

    const clampedDt = Math.min(dt, 0.05);

    // 1. Calculate movement direction relative to camera yaw
    const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    const right = new THREE.Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));

    const moveDir = new THREE.Vector3()
      .addScaledVector(forward, this.moveForward)
      .addScaledVector(right, this.moveRight);

    const isMoving = moveDir.lengthSq() > 0.01;
    if (isMoving) {
      moveDir.normalize();
      this.yaw = Math.atan2(moveDir.x, moveDir.z);
    }

    const currentSpeed = this.isRunning ? this.runSpeed : this.walkSpeed;
    const targetVelX = moveDir.x * currentSpeed;
    const targetVelZ = moveDir.z * currentSpeed;

    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetVelX, 14, clampedDt);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetVelZ, 14, clampedDt);

    // Gravity
    this.velocity.y -= 22 * clampedDt;

    // Apply movement
    this.position.x += this.velocity.x * clampedDt;
    this.position.y += this.velocity.y * clampedDt;
    this.position.z += this.velocity.z * clampedDt;

    // Ground check
    const groundY = this.terrain.getHeight(this.position.x, this.position.z);
    if (this.position.y <= groundY) {
      this.position.y = groundY;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // Obstacle collision resolution for player capsule
    const playerRadius = 0.45;
    for (let o = 0; o < obstacles.length; o++) {
      const obs = obstacles[o];
      const dx = this.position.x - obs.x;
      const dz = this.position.z - obs.z;
      const distSq = dx * dx + dz * dz;
      const minDist = playerRadius + obs.radius;
      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq) || 0.001;
        const push = minDist - dist;
        this.position.x += (dx / dist) * push;
        this.position.z += (dz / dist) * push;
      }
    }

    // Walking animation
    if (isMoving && this.isGrounded) {
      const animSpeed = this.isRunning ? 14 : 9;
      this.walkAnimPhase += clampedDt * animSpeed;
      const legAngle = Math.sin(this.walkAnimPhase) * 0.55;
      this.leftLeg.rotation.x = legAngle;
      this.rightLeg.rotation.x = -legAngle;
      this.leftArm.rotation.x = -legAngle * 0.7;
      this.rightArm.rotation.x = legAngle * 0.7;
    } else {
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
    }

    // Update mesh position and rotation
    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;
  }

  public jump() {
    if (this.isGrounded && !this.isDriving) {
      this.velocity.y = this.jumpStrength;
      this.isGrounded = false;
    }
  }

  public getDistanceToVehicle(vehiclePos: THREE.Vector3): number {
    return this.position.distanceTo(vehiclePos);
  }
}
