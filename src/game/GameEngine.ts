import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CheckpointData, ExpeditionStats, GameMode, GameSettings, VehicleTelemetry } from '../types/game';
import { AudioManager } from './AudioManager';
import { CameraController, CameraMode } from './CameraController';
import { CheckpointManager } from './Checkpoints';
import { PlayerController } from './PlayerController';
import { Terrain } from './Terrain';
import { VehicleModel } from './VehicleModel';
import { VehiclePhysics } from './VehiclePhysics';
import { WorldProps } from './WorldProps';

export interface GameEngineCallbacks {
  onTelemetryUpdate: (telemetry: VehicleTelemetry) => void;
  onExpeditionUpdate: (stats: ExpeditionStats) => void;
  onCheckpointPassed: (cp: CheckpointData, isFinal: boolean) => void;
  onInteractionPrompt: (prompt: string | null) => void;
  onModeChange: (mode: GameMode) => void;
  onCameraModeChange: (mode: CameraMode) => void;
  onDamageEvent: (damage: number) => void;
}

export class GameEngine {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public terrain: Terrain;
  public vehicleModel: VehicleModel;
  public vehiclePhysics: VehiclePhysics;
  public player: PlayerController;
  public cameraController: CameraController;
  public checkpoints: CheckpointManager;
  public worldProps: WorldProps;
  public audio: AudioManager;

  public mode: GameMode = 'menu';
  public isPaused: boolean = false;
  public isDriving: boolean = true; // Started inside vehicle by default on expedition start

  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private clock = new THREE.Clock();
  private isMouseDown: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  // Key map
  private keys: Record<string, boolean> = {};
  private resizeObserver: ResizeObserver | null = null;

  // Settings
  public settings: GameSettings = {
    graphicsQuality: 'high',
    masterVolume: 0.7,
    engineVolume: 0.65,
    sfxVolume: 0.8,
    mouseSensitivity: 1.0,
    cameraFov: 60,
  };

  // Sunlight and shadows
  public dirLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;

  constructor(
    private container: HTMLElement,
    private callbacks: GameEngineCallbacks
  ) {
    // 1. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));

    const initialW = container.clientWidth > 0 ? container.clientWidth : (window.innerWidth || 1280);
    const initialH = container.clientHeight > 0 ? container.clientHeight : (window.innerHeight || 720);
    this.renderer.setSize(initialW, initialH);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 2. Scene & Atmosphere
    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color(0xbbe1fa);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(0xbbe1fa, 0.0028);

    // Procedural Studio Environment Reflection
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch {
      // Fallback if PMREM is unsupported
    }

    // 3. Natural Directional Lighting & Sky Light
    this.hemiLight = new THREE.HemisphereLight(0xfff6e8, 0x5a7852, 0.95);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    this.dirLight.position.set(120, 180, 100);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 450;
    const shadowD = 120;
    this.dirLight.shadow.camera.left = -shadowD;
    this.dirLight.shadow.camera.right = shadowD;
    this.dirLight.shadow.camera.top = shadowD;
    this.dirLight.shadow.camera.bottom = -shadowD;
    this.dirLight.shadow.bias = -0.0004;
    this.dirLight.shadow.normalBias = 0.03;
    this.scene.add(this.dirLight);

    // 4. Subsystems
    this.terrain = new Terrain(this.scene);
    this.vehicleModel = new VehicleModel(0xcc551f);
    this.scene.add(this.vehicleModel.group);

    this.vehiclePhysics = new VehiclePhysics(this.vehicleModel, this.terrain);
    this.player = new PlayerController(this.terrain);
    this.scene.add(this.player.group);
    this.player.setVisible(false); // Initially inside vehicle

    this.cameraController = new CameraController(this.terrain);
    this.checkpoints = new CheckpointManager(this.scene, this.terrain);
    this.worldProps = new WorldProps(this.scene, this.terrain);
    this.audio = new AudioManager();

    // 5. Input Listeners
    this.setupEventListeners();

    // 6. Start Loop
    this.isRunning = true;
    this.clock.start();
    this.tick();
  }

  private setupEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);

    try {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      this.resizeObserver.observe(this.container);
    } catch {
      // Ignore if ResizeObserver is unavailable
    }

    const el = this.renderer.domElement;
    el.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    el.addEventListener('wheel', this.handleWheel, { passive: true });

    // Touch support for mobile / tablet drag
    el.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    el.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    el.addEventListener('touchend', this.handleTouchEnd, { passive: true });
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.audio.init();
    this.audio.resume();

    this.keys[e.code] = true;
    this.keys[e.key.toLowerCase()] = true;

    // Toggle Pause
    if (e.code === 'Escape') {
      if (this.mode !== 'menu') {
        this.togglePause();
      }
      return;
    }

    if (this.isPaused) return;

    // Camera Switch ('C')
    if (e.code === 'KeyC') {
      this.cameraController.nextMode();
      this.callbacks.onCameraModeChange(this.cameraController.mode);
      this.audio.playClick();
      return;
    }

    // Vehicle Recovery ('R')
    if (e.code === 'KeyR') {
      this.recoverVehicle();
      return;
    }

    // Enter / Exit Vehicle ('E')
    if (e.code === 'KeyE') {
      this.toggleEnterExitVehicle();
      return;
    }

    // Space jump (when on foot)
    if (e.code === 'Space' && !this.isDriving) {
      this.player.jump();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
    this.keys[e.key.toLowerCase()] = false;
  };

  private handleMouseDown = (e: MouseEvent) => {
    this.audio.init();
    this.audio.resume();
    this.isMouseDown = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isMouseDown) return;
    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    this.cameraController.onMouseMove(dx, dy);
  };

  private handleMouseUp = () => {
    this.isMouseDown = false;
  };

  private handleWheel = (e: WheelEvent) => {
    this.cameraController.onMouseWheel(e.deltaY);
  };

  private handleTouchStart = (e: TouchEvent) => {
    this.audio.init();
    this.audio.resume();
    if (e.touches.length === 1) {
      this.isMouseDown = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (!this.isMouseDown || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - this.lastMouseX;
    const dy = e.touches[0].clientY - this.lastMouseY;
    this.lastMouseX = e.touches[0].clientX;
    this.lastMouseY = e.touches[0].clientY;

    this.cameraController.onMouseMove(dx, dy);
  };

  private handleTouchEnd = () => {
    this.isMouseDown = false;
  };

  public handleResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth > 0 ? this.container.clientWidth : (window.innerWidth || 1280);
    const h = this.container.clientHeight > 0 ? this.container.clientHeight : (window.innerHeight || 720);
    if (w > 0 && h > 0) {
      this.cameraController.camera.aspect = w / h;
      this.cameraController.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }
  };

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.audio.stopEngine();
    } else {
      if (this.isDriving && this.mode !== 'menu') {
        this.audio.startEngine();
      }
    }
    return this.isPaused;
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (this.isPaused) {
      this.audio.stopEngine();
    } else if (this.isDriving && this.mode !== 'menu') {
      this.audio.startEngine();
    }
  }

  public startExpedition() {
    this.audio.init();
    this.audio.resume();
    this.mode = 'expedition';
    this.isPaused = false;
    this.isDriving = true;

    // Reset vehicle to base camp start
    this.vehiclePhysics.position.set(-120, 15.2, 175);
    this.vehiclePhysics.snapToTerrain();
    this.vehiclePhysics.setSafePosition(this.vehiclePhysics.position, 0.65);

    this.player.enterVehicle();
    this.checkpoints.startExpedition();
    this.audio.startEngine();
    this.callbacks.onModeChange(this.mode);
  }

  public startFreeDrive() {
    this.audio.init();
    this.audio.resume();
    this.mode = 'freedrive';
    this.isPaused = false;
    this.isDriving = true;

    this.vehiclePhysics.position.set(-120, 15.2, 175);
    this.vehiclePhysics.snapToTerrain();
    this.vehiclePhysics.setSafePosition(this.vehiclePhysics.position, 0.65);

    this.player.enterVehicle();
    this.audio.startEngine();
    this.callbacks.onModeChange(this.mode);
  }

  public recoverVehicle() {
    this.vehiclePhysics.recoverVehicle();
    this.audio.playRecoverSound();
  }

  public toggleEnterExitVehicle() {
    if (this.isDriving) {
      // Exit vehicle to explore on foot
      const vehicleRight = new THREE.Vector3();
      this.vehiclePhysics.getRightVector(vehicleRight);
      this.player.exitVehicle(this.vehiclePhysics.position, vehicleRight);
      this.isDriving = false;
      this.audio.stopEngine();
    } else {
      // Check if player is close enough to vehicle driver door
      const dist = this.player.getDistanceToVehicle(this.vehiclePhysics.position);
      if (dist < 4.5) {
        this.player.enterVehicle();
        this.isDriving = true;
        this.audio.startEngine();
        this.callbacks.onInteractionPrompt(null);
      }
    }
  }

  // Virtual touch controls for mobile / screen buttons
  public setVirtualDrivingInputs(throttle: number, steer: number, handbrake: boolean) {
    if (this.isDriving) {
      this.vehiclePhysics.throttleInput = throttle;
      this.vehiclePhysics.steeringInput = steer;
      this.vehiclePhysics.handbrake = handbrake;
    }
  }

  public setVirtualWalkingInputs(forward: number, right: number, run: boolean) {
    if (!this.isDriving) {
      this.player.moveForward = forward;
      this.player.moveRight = right;
      this.player.isRunning = run;
    }
  }

  private tick = () => {
    if (!this.isRunning) return;
    this.animationFrameId = requestAnimationFrame(this.tick);

    const dt = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    if (this.mode === 'menu') {
      // Scenic orbiting camera on title screen
      this.cameraController.updateTitleOrbit(elapsedTime);
      this.renderer.render(this.scene, this.cameraController.camera);
      return;
    }

    if (this.isPaused) {
      this.renderer.render(this.scene, this.cameraController.camera);
      return;
    }

    // 1. Process User Inputs
    if (this.isDriving) {
      let throttle = 0;
      if (this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['w']) throttle += 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown'] || this.keys['s']) throttle -= 1;

      let steer = 0;
      if (this.keys['KeyA'] || this.keys['ArrowLeft'] || this.keys['a']) steer -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight'] || this.keys['d']) steer += 1;

      const handbrake = !!this.keys['Space'];

      this.vehiclePhysics.throttleInput = THREE.MathUtils.damp(this.vehiclePhysics.throttleInput, throttle, 12, dt);
      this.vehiclePhysics.steeringInput = THREE.MathUtils.damp(this.vehiclePhysics.steeringInput, steer, 15, dt);
      this.vehiclePhysics.handbrake = handbrake;
    } else {
      // On Foot Explorer inputs
      let moveF = 0;
      if (this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['w']) moveF += 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown'] || this.keys['s']) moveF -= 1;

      let moveR = 0;
      if (this.keys['KeyD'] || this.keys['ArrowRight'] || this.keys['d']) moveR += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft'] || this.keys['a']) moveR -= 1;

      this.player.moveForward = moveF;
      this.player.moveRight = moveR;
      this.player.isRunning = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    }

    // 2. Update Physics
    this.vehiclePhysics.update(dt, this.worldProps.colliders, (intensity) => {
      this.audio.playCollisionSound(intensity);
      this.callbacks.onDamageEvent(this.vehiclePhysics.damage);
    });

    // Check water splash
    if (this.vehiclePhysics.currentSurface === 'water' && this.vehiclePhysics.currentSpeedKmh > 12) {
      this.audio.playWaterSplash();
    }

    // 3. Update Player Character (if on foot)
    if (!this.isDriving) {
      const camHeading = Math.atan2(
        this.cameraController.camera.position.x - this.player.position.x,
        this.cameraController.camera.position.z - this.player.position.z
      );
      this.player.update(dt, camHeading, this.worldProps.colliders);

      // Check distance to vehicle for prompt
      const dist = this.player.getDistanceToVehicle(this.vehiclePhysics.position);
      if (dist < 4.5) {
        this.callbacks.onInteractionPrompt('Press [E] to Drive');
      } else {
        this.callbacks.onInteractionPrompt(null);
      }
    } else {
      this.callbacks.onInteractionPrompt(null);
    }

    // 4. Update Checkpoints & Progression
    if (this.mode === 'expedition') {
      this.checkpoints.checkVehiclePass(
        this.vehiclePhysics.position,
        this.vehiclePhysics.currentSpeedKmh,
        (passedCp, isFinal) => {
          this.audio.playCheckpointFanfare();
          // Update safe recovery position to this checkpoint
          const fw = new THREE.Vector3();
          this.vehiclePhysics.getForwardVector(fw);
          this.vehiclePhysics.setSafePosition(this.vehiclePhysics.position, Math.atan2(fw.x, fw.z));
          this.callbacks.onCheckpointPassed(passedCp, isFinal);
        }
      );
      this.checkpoints.updateAnimation(elapsedTime);
      this.callbacks.onExpeditionUpdate(this.checkpoints.getStats(this.vehiclePhysics.position));
    }

    // 5. Update Camera
    const fwd = new THREE.Vector3();
    const up = new THREE.Vector3();
    this.vehiclePhysics.getForwardVector(fwd);
    this.vehiclePhysics.getRightVector(up);

    this.cameraController.update(
      dt,
      this.vehiclePhysics.position,
      fwd,
      up,
      this.vehiclePhysics.currentSpeedKmh,
      this.isDriving,
      this.player.position,
      this.player.yaw
    );

    // Dynamic directional light position tracking the vehicle to maintain high shadow resolution
    this.dirLight.position.set(
      this.vehiclePhysics.position.x + 90,
      this.vehiclePhysics.position.y + 140,
      this.vehiclePhysics.position.z + 80
    );
    this.dirLight.target.position.copy(this.vehiclePhysics.position);
    this.dirLight.target.updateMatrixWorld();

    // 6. Update Audio Engine
    if (this.isDriving) {
      const slipRatio = this.vehiclePhysics.handbrake ? 0.8 : (this.vehiclePhysics.currentSurface === 'mud' ? 0.6 : 0.05);
      this.audio.updateEngine(
        this.vehiclePhysics.currentRpm,
        this.vehiclePhysics.throttleInput,
        this.vehiclePhysics.currentSpeedKmh,
        slipRatio
      );
    }

    // 7. Update Telemetry to UI
    this.callbacks.onTelemetryUpdate(this.vehiclePhysics.getTelemetry());

    // 8. Render Scene
    this.renderer.render(this.scene, this.cameraController.camera);
  };

  public applySettings(newSettings: GameSettings) {
    this.settings = newSettings;
    this.audio.setVolumes(newSettings.masterVolume, newSettings.engineVolume, newSettings.sfxVolume);
    this.cameraController.mouseSensitivity = newSettings.mouseSensitivity;

    // Graphics settings
    if (newSettings.graphicsQuality === 'low') {
      this.renderer.shadowMap.enabled = false;
      this.renderer.setPixelRatio(1.0);
    } else if (newSettings.graphicsQuality === 'medium') {
      this.renderer.shadowMap.enabled = true;
      this.renderer.setPixelRatio(1.0);
    } else {
      this.renderer.shadowMap.enabled = true;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    }
  }

  public setVehicleColor(colorHex: number) {
    this.vehicleModel.setBodyColor(colorHex);
  }

  public dispose() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
