import * as THREE from 'three';
import { SurfaceType, VehicleTelemetry } from '../types/game';
import { Terrain } from './Terrain';
import { VehicleModel } from './VehicleModel';

export interface ObstacleCollider {
  x: number;
  z: number;
  radius: number;
}

export class VehiclePhysics {
  // World reference & model
  public position = new THREE.Vector3(-120, 15.2, 175);
  public velocity = new THREE.Vector3();
  public quaternion = new THREE.Quaternion();
  public angularVelocity = new THREE.Vector3();

  // Heading & orientation
  public yaw: number = 0;
  public pitch: number = 0;
  public roll: number = 0;

  // Inputs
  public throttleInput: number = 0;  // -1 (reverse/brake) to 1 (accelerate)
  public steeringInput: number = 0;  // -1 (left) to 1 (right)
  public handbrake: boolean = false;

  // Drivetrain & dynamics parameters
  public readonly mass = 1750;             // kg
  public readonly maxEngineTorque = 8500;  // N
  public readonly maxBrakeForce = 6500;    // N
  public readonly maxSpeedKmh = 180;       // Arcade-fast top speed on flat road
  public readonly reverseMaxSpeedKmh = 45;
  public currentSpeedKmh = 0;
  public currentRpm = 900;
  public gear: 'R' | 'N' | 'D' | 'P' = 'D';
  public currentSurface: SurfaceType = 'road';
  public fuel = 100;
  public damage = 0;
  public isGrounded = true;

  // Suspension & wheel contact
  private wheelOffsets: { x: number; z: number; isFront: boolean; isLeft: boolean }[] = [];
  private wheelCompressions: number[] = [0, 0, 0, 0];
  public readonly suspensionRestLength = 0.58;
  public readonly suspensionStiffness = 38000;
  public readonly suspensionDamping = 3200;

  // Safe recovery position
  public lastSafePosition = new THREE.Vector3(-120, 15.2, 175);
  public lastSafeYaw = 0;

  // Preallocated math helpers to ensure 0 GC during ticks
  private static _vec1 = new THREE.Vector3();
  private static _vec2 = new THREE.Vector3();
  private static _vec3 = new THREE.Vector3();
  private static _forward = new THREE.Vector3();
  private static _right = new THREE.Vector3();
  private static _up = new THREE.Vector3();
  private static _groundNormal = new THREE.Vector3(0, 1, 0);

  constructor(
    public model: VehicleModel,
    public terrain: Terrain
  ) {
    // Wheel offsets in local vehicle coordinates
    const halfBase = model.wheelBase * 0.5;
    const halfTrack = model.trackWidth * 0.5;
    this.wheelOffsets = [
      { x: -halfTrack, z: halfBase, isFront: true, isLeft: true },   // FL
      { x: halfTrack, z: halfBase, isFront: true, isLeft: false },   // FR
      { x: -halfTrack, z: -halfBase, isFront: false, isLeft: true },  // RL
      { x: halfTrack, z: -halfBase, isFront: false, isLeft: false },  // RR
    ];

    // Initial position on terrain at base camp
    this.snapToTerrain();
    this.lastSafePosition.copy(this.position);
  }

  public snapToTerrain() {
    const groundY = this.terrain.getHeight(this.position.x, this.position.z);
    this.position.y = groundY + this.model.tireRadius + 0.35;
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.yaw = 0.65; // facing towards road exit
    this.updateQuaternion();
  }

  public recoverVehicle() {
    this.position.copy(this.lastSafePosition);
    this.position.y = this.terrain.getHeight(this.position.x, this.position.z) + this.model.tireRadius + 0.4;
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.yaw = this.lastSafeYaw;
    this.pitch = 0;
    this.roll = 0;
    this.updateQuaternion();
  }

  public setSafePosition(pos: THREE.Vector3, yaw: number) {
    this.lastSafePosition.copy(pos);
    this.lastSafeYaw = yaw;
  }

  public update(dt: number, obstacles: ObstacleCollider[], onCollision?: (intensity: number) => void) {
    const clampedDt = Math.min(dt, 0.05);

    // 1. Compute Orientation Vectors
    this.getForwardVector(VehiclePhysics._forward);
    this.getRightVector(VehiclePhysics._right);
    VehiclePhysics._up.crossVectors(VehiclePhysics._forward, VehiclePhysics._right).normalize();

    // 2. Compute Speed & Direction
    const forwardSpeed = this.velocity.dot(VehiclePhysics._forward);
    this.currentSpeedKmh = Math.abs(forwardSpeed) * 3.6;

    // Detect surface under vehicle center
    this.currentSurface = this.terrain.getSurfaceType(this.position.x, this.position.z, this.position.y);

    // Surface friction & drag coefficients
    let surfaceGrip = 1.0;
    let rollingResistance = 0.010;
    let waterDrag = 0;

    switch (this.currentSurface) {
      case 'road':
        surfaceGrip = 1.05;
        rollingResistance = 0.008;
        break;
      case 'grass':
        surfaceGrip = 0.88;
        rollingResistance = 0.025;
        break;
      case 'mud':
        surfaceGrip = 0.58;
        rollingResistance = 0.065;
        break;
      case 'rock':
        surfaceGrip = 0.82;
        rollingResistance = 0.045;
        break;
      case 'water':
        surfaceGrip = 0.45;
        waterDrag = 14.0;
        break;
    }

    // 3. Four-Wheel Raycast Suspension Simulation
    let totalNormalForce = 0;
    let wheelsContactCount = 0;
    const avgContactNormal = VehiclePhysics._groundNormal.set(0, 0, 0);
    const tempNorm = VehiclePhysics._vec1;

    for (let i = 0; i < 4; i++) {
      const off = this.wheelOffsets[i];
      // World position of wheel attachment point
      const wheelPos = VehiclePhysics._vec2.copy(this.position)
        .addScaledVector(VehiclePhysics._right, off.x)
        .addScaledVector(VehiclePhysics._forward, off.z);

      const groundY = this.terrain.getHeight(wheelPos.x, wheelPos.z);
      this.terrain.getNormal(wheelPos.x, wheelPos.z, tempNorm);

      const wheelRestY = wheelPos.y;
      const targetContactY = groundY + this.model.tireRadius;
      const distance = wheelRestY - targetContactY;

      if (distance < this.suspensionRestLength) {
        // Wheel is touching terrain or compressed
        const compression = Math.max(0, this.suspensionRestLength - distance);
        this.wheelCompressions[i] = compression;
        wheelsContactCount++;

        // Spring + Damper upward force
        const relVelY = this.velocity.y;
        const springForce = compression * this.suspensionStiffness;
        const damperForce = -relVelY * this.suspensionDamping;
        const wheelForce = Math.max(0, springForce + damperForce);

        totalNormalForce += wheelForce;
        avgContactNormal.add(tempNorm);

        // Position wheel mesh visually
        const visualSuspensionY = -Math.min(this.suspensionRestLength * 0.7, compression * 0.85);
        this.model.wheels[i].group.position.y = visualSuspensionY;
      } else {
        this.wheelCompressions[i] = 0;
        this.model.wheels[i].group.position.y = -this.suspensionRestLength * 0.4;
      }
    }

    this.isGrounded = wheelsContactCount >= 2;
    if (wheelsContactCount > 0) {
      avgContactNormal.normalize();
    } else {
      avgContactNormal.set(0, 1, 0);
    }

    // 4. Engine, Transmission & Braking Forces
    let driveForce = 0;
    const forwardDirection = forwardSpeed >= -0.5 ? 1 : -1;

    if (this.throttleInput > 0.05) {
      this.gear = 'D';
      // Speed-governed torque curve
      const speedRatio = Math.min(1.0, this.currentSpeedKmh / this.maxSpeedKmh);
      const torqueCurve = Math.max(0.18, 1.0 - Math.pow(speedRatio, 1.4));
      driveForce = this.throttleInput * this.maxEngineTorque * torqueCurve * surfaceGrip;

      // Deplete fuel slowly
      if (this.fuel > 0) {
        this.fuel = Math.max(0, this.fuel - clampedDt * 0.04);
      } else {
        driveForce *= 0.2; // Limp mode on empty tank
      }
    } else if (this.throttleInput < -0.05) {
      if (forwardSpeed > 1.2) {
        // Braking while moving forward
        driveForce = -this.maxBrakeForce * Math.abs(this.throttleInput);
      } else {
        // Reverse gear
        this.gear = 'R';
        const revSpeedRatio = Math.min(1.0, this.currentSpeedKmh / this.reverseMaxSpeedKmh);
        const revTorque = Math.max(0.15, 1.0 - revSpeedRatio);
        driveForce = this.throttleInput * this.maxEngineTorque * 0.65 * revTorque * surfaceGrip;
      }
    } else {
      if (Math.abs(forwardSpeed) < 0.2) {
        this.gear = 'N';
      }
    }

    if (this.handbrake) {
      driveForce = -Math.sign(forwardSpeed) * this.maxBrakeForce * 1.5;
    }

    // 5. RPM Simulation
    if (this.gear === 'D') {
      const gearRatio = Math.max(1, Math.min(4, Math.floor(this.currentSpeedKmh / 22) + 1));
      const speedInGear = (this.currentSpeedKmh % 25) / 25;
      this.currentRpm = 950 + speedInGear * 3800 + (this.throttleInput * 1200) + (gearRatio * 150);
    } else if (this.gear === 'R') {
      this.currentRpm = 950 + (this.currentSpeedKmh / this.reverseMaxSpeedKmh) * 3500;
    } else {
      this.currentRpm = 850 + (this.throttleInput > 0 ? this.throttleInput * 3000 : 0);
    }
    this.currentRpm = Math.min(6500, Math.max(800, this.currentRpm));

    // 6. Longitudinal Acceleration & Resistance
    const netTractiveForce = this.isGrounded ? driveForce : 0;
    const accelForward = netTractiveForce / this.mass;

    // Rolling resistance + aerodynamic drag
    const aeroDragCoeff = 0.22;
    const dragForce = 0.5 * 1.225 * aeroDragCoeff * 2.5 * forwardSpeed * Math.abs(forwardSpeed);
    const rollResistanceForce = forwardSpeed * this.mass * 9.81 * rollingResistance;
    const waterResistanceForce = forwardSpeed * waterDrag * 180;

    const totalResistance = (dragForce + rollResistanceForce + waterResistanceForce) / this.mass;

    // Gravity: full gravity downwards + slope component along forward direction
    const gravity = -19.6; // m/s^2 (crisp, snappy game feel)
    const slopeForward = VehiclePhysics._forward.y; // positive when pointing uphill
    const gravitySlopeDecel = slopeForward * 9.81;

    // Apply forward velocity update
    const rawForwardSpeed = forwardSpeed + (accelForward - totalResistance - gravitySlopeDecel) * clampedDt;
    // Hard speed governor: downhill gravity must never push the vehicle beyond its designed limits.
    const maxForwardSpeed = this.maxSpeedKmh / 3.6;
    const maxReverseSpeed = this.reverseMaxSpeedKmh / 3.6;
    const newForwardSpeed = THREE.MathUtils.clamp(rawForwardSpeed, -maxReverseSpeed, maxForwardSpeed);

    // 7. Lateral Grip, Steering & Drifting
    // Steering angle decreases smoothly at higher speeds to maintain high-speed stability
    const speedRatioForSteering = Math.min(1.0, this.currentSpeedKmh / 75);
    const maxSteerAngle = 0.62 - speedRatioForSteering * 0.38; // 35 deg down to 14 deg
    const targetSteerAngle = -this.steeringInput * maxSteerAngle;

    // Lateral tire slip velocity
    const lateralSpeed = this.velocity.dot(VehiclePhysics._right);
    const lateralGripCoeff = (this.handbrake ? 0.25 : 0.88) * surfaceGrip;
    const lateralRestitution = Math.min(1.0, lateralGripCoeff * 14 * clampedDt);
    const newLateralSpeed = lateralSpeed * (1.0 - lateralRestitution);

    // Yaw rotation from steering
    if (this.isGrounded && Math.abs(forwardSpeed) > 0.15) {
      const turnRadiusSpeed = forwardSpeed / (this.model.wheelBase);
      const yawRate = turnRadiusSpeed * Math.sin(targetSteerAngle) * 1.25;
      this.yaw += yawRate * clampedDt;
    }

    // Reconstruct horizontal velocity vector
    this.velocity.x = VehiclePhysics._forward.x * newForwardSpeed + VehiclePhysics._right.x * newLateralSpeed;
    this.velocity.z = VehiclePhysics._forward.z * newForwardSpeed + VehiclePhysics._right.z * newLateralSpeed;

    // Vertical physics (Suspension vs Gravity)
    if (this.isGrounded) {
      const netYForce = totalNormalForce / this.mass + gravity;
      this.velocity.y += netYForce * clampedDt;
      // Damp vertical oscillation
      this.velocity.y *= 0.94;
    } else {
      this.velocity.y += gravity * clampedDt;
    }

    // 8. Integrate Position
    this.position.x += this.velocity.x * clampedDt;
    this.position.y += this.velocity.y * clampedDt;
    this.position.z += this.velocity.z * clampedDt;

    // 9. Terrain Hard Penetration Guard
    const centerGroundY = this.terrain.getHeight(this.position.x, this.position.z);
    const minCenterY = centerGroundY + this.model.tireRadius * 0.9;
    if (this.position.y < minCenterY) {
      this.position.y = minCenterY;
      if (this.velocity.y < 0) this.velocity.y = 0;
      this.isGrounded = true;
    }

    // 10. Obstacle Collisions (Trees, Rocks, Camp Structures)
    const carColliderRadius = 1.35;
    for (let o = 0; o < obstacles.length; o++) {
      const obs = obstacles[o];
      const dx = this.position.x - obs.x;
      const dz = this.position.z - obs.z;
      const distSq = dx * dx + dz * dz;
      const minDist = carColliderRadius + obs.radius;

      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq) || 0.001;
        const overlap = minDist - dist;
        const pushX = (dx / dist) * overlap;
        const pushZ = (dz / dist) * overlap;

        // Push vehicle out
        this.position.x += pushX;
        this.position.z += pushZ;

        // Elastic impact bounce & damage
        const impactSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        if (impactSpeed > 2.5) {
          const intensity = Math.min(1.0, impactSpeed / 18);
          this.damage = Math.min(100, this.damage + intensity * 6);
          if (onCollision) onCollision(intensity);
        }

        // Deflect velocity along collision normal
        const normalX = dx / dist;
        const normalZ = dz / dist;
        const dot = this.velocity.x * normalX + this.velocity.z * normalZ;
        if (dot < 0) {
          this.velocity.x -= dot * 1.45 * normalX;
          this.velocity.z -= dot * 1.45 * normalZ;
        }
      }
    }

    // 11. World Boundary Guard
    const boundaryDist = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);
    if (boundaryDist > 375) {
      const angle = Math.atan2(this.position.z, this.position.x);
      this.position.x = Math.cos(angle) * 374;
      this.position.z = Math.sin(angle) * 374;
      this.velocity.set(0, 0, 0);
    }

    // 12. Dynamic Pitch and Roll (Suspension and Chassis Weight Transfer)
    // Pitch: matches ground slope + inertial pitch when braking/accelerating
    const targetPitch = Math.atan2(VehiclePhysics._forward.y, 1.0) - (accelForward / 9.81) * 0.08;
    // Roll: lean into turns or match bank angle
    const targetRoll = (newLateralSpeed / 12) * 0.12;

    this.pitch = THREE.MathUtils.damp(this.pitch, targetPitch, 8, clampedDt);
    this.roll = THREE.MathUtils.damp(this.roll, targetRoll, 8, clampedDt);

    this.updateQuaternion();

    // 13. Sync Visual Vehicle Model
    this.model.group.position.copy(this.position);
    this.model.group.quaternion.copy(this.quaternion);
    this.model.setSteering(targetSteerAngle);

    // Wheel spin
    const wheelRollDistance = forwardSpeed * clampedDt;
    const wheelRotDelta = wheelRollDistance / this.model.tireRadius;
    this.model.spinWheels(wheelRotDelta);

    // Brake lights
    this.model.setBraking(this.throttleInput < -0.05 || this.handbrake);
  }

  private updateQuaternion() {
    const euler = new THREE.Euler(this.pitch, this.yaw, this.roll, 'YXZ');
    this.quaternion.setFromEuler(euler);
  }

  public getForwardVector(out: THREE.Vector3): THREE.Vector3 {
    return out.set(0, 0, 1).applyQuaternion(this.quaternion).normalize();
  }

  public getRightVector(out: THREE.Vector3): THREE.Vector3 {
    return out.set(1, 0, 0).applyQuaternion(this.quaternion).normalize();
  }

  public getTelemetry(): VehicleTelemetry {
    return {
      speedKmh: Math.round(this.currentSpeedKmh),
      rpm: Math.round(this.currentRpm),
      gear: this.gear,
      throttle: Math.max(0, this.throttleInput),
      steering: this.steeringInput,
      handbrake: this.handbrake,
      surface: this.currentSurface,
      fuel: Math.round(this.fuel),
      damage: Math.round(this.damage),
      pitch: Number(this.pitch.toFixed(2)),
      roll: Number(this.roll.toFixed(2)),
      isGrounded: this.isGrounded,
    };
  }
}
