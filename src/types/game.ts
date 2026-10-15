export type GameMode = 'menu' | 'expedition' | 'freedrive';

export type SurfaceType = 'road' | 'grass' | 'mud' | 'water' | 'rock';

export interface VehicleTelemetry {
  speedKmh: number;
  rpm: number;
  gear: 'R' | 'N' | 'D' | 'P';
  throttle: number;
  steering: number;
  handbrake: boolean;
  surface: SurfaceType;
  fuel: number; // 0 to 100
  damage: number; // 0 to 100
  pitch: number;
  roll: number;
  isGrounded: boolean;
}

export interface CheckpointData {
  id: number;
  name: string;
  description: string;
  position: [number, number, number];
  radius: number;
  rotationY: number;
}

export interface GameSettings {
  graphicsQuality: 'high' | 'medium' | 'low';
  masterVolume: number;
  engineVolume: number;
  sfxVolume: number;
  mouseSensitivity: number;
  cameraFov: number;
}

export interface ExpeditionStats {
  totalCheckpoints: number;
  currentCheckpointIndex: number;
  completed: boolean;
  startTime: number;
  elapsedTime: number;
  topSpeed: number;
  distanceToNext: number;
}

export interface MultiplayerPlayerState {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number, number]; // quaternion
  velocity: [number, number, number];
  checkpointIndex: number;
  vehicleColor: string;
}
