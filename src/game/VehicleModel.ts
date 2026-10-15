import * as THREE from 'three';

export interface WheelMeshBundle {
  group: THREE.Group;
  wheelMesh: THREE.Group;
  tireRadius: number;
  width: number;
  isFront: boolean;
  isLeft: boolean;
}

export class VehicleModel {
  public group: THREE.Group;
  public chassisGroup: THREE.Group;
  public wheels: WheelMeshBundle[] = [];
  public headlightLeft: THREE.Mesh;
  public headlightRight: THREE.Mesh;
  public taillightLeft: THREE.Mesh;
  public taillightRight: THREE.Mesh;
  public headlightSpotLeft: THREE.SpotLight;
  public headlightSpotRight: THREE.SpotLight;

  // Materials
  private bodyMaterial: THREE.MeshStandardMaterial;
  private trimMaterial: THREE.MeshStandardMaterial;
  private glassMaterial: THREE.MeshPhysicalMaterial;
  private tireMaterial: THREE.MeshStandardMaterial;
  private rimMaterial: THREE.MeshStandardMaterial;
  private lightMaterial: THREE.MeshStandardMaterial;
  private brakeLightMaterial: THREE.MeshStandardMaterial;

  // Vehicle geometric dimensions
  public readonly wheelBase = 2.8;     // Distance front to rear axles
  public readonly trackWidth = 1.95;   // Distance left to right wheels
  public readonly tireRadius = 0.52;   // High-clearance rugged off-road tire
  public readonly tireWidth = 0.34;

  constructor(bodyColorHex: number = 0xcc551f) { // Warm expedition orange by default
    this.group = new THREE.Group();
    this.chassisGroup = new THREE.Group();
    this.group.add(this.chassisGroup);

    // 1. Materials setup
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: bodyColorHex,
      roughness: 0.35,
      metalness: 0.45,
    });

    this.trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x1f2224, // Rugged matte charcoal steel
      roughness: 0.75,
      metalness: 0.25,
    });

    this.glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x22303c,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.7,
      thickness: 0.4,
      transparent: true,
      opacity: 0.85,
    });

    this.tireMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a, // Vulcanized rubber
      roughness: 0.9,
      metalness: 0.05,
    });

    this.rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x9fa4a8, // Brushed titanium rim
      roughness: 0.3,
      metalness: 0.85,
    });

    this.lightMaterial = new THREE.MeshStandardMaterial({
      color: 0xfffae0,
      emissive: 0xfff0aa,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });

    this.brakeLightMaterial = new THREE.MeshStandardMaterial({
      color: 0xd91e18,
      emissive: 0xaa1010,
      emissiveIntensity: 0.3,
      roughness: 0.3,
    });

    // 2. Build Chassis & Bodywork
    this.buildBody();
    this.buildCabinAndWindows();
    this.buildRoofRack();
    this.buildBumpersAndWinch();
    this.buildSpareTire();

    // 3. Lights
    const { hlL, hlR, tlL, tlR, spotL, spotR } = this.buildLights();
    this.headlightLeft = hlL;
    this.headlightRight = hlR;
    this.taillightLeft = tlL;
    this.taillightRight = tlR;
    this.headlightSpotLeft = spotL;
    this.headlightSpotRight = spotR;

    // 4. Wheels with independent steer knuckles
    this.buildWheels();

    // Soft contact shadow disc under chassis
    const shadowGeo = new THREE.PlaneGeometry(2.3, 4.4);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0a0a0a,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = 0.12;
    this.chassisGroup.add(shadowMesh);
  }

  private buildBody() {
    // Lower chassis tub / rock sliders
    const tubGeo = new THREE.BoxGeometry(1.7, 0.4, 4.1);
    const tub = new THREE.Mesh(tubGeo, this.trimMaterial);
    tub.position.set(0, 0.52, 0);
    tub.castShadow = true;
    tub.receiveShadow = true;
    this.chassisGroup.add(tub);

    // Main lower body shell
    const bodyGeo = new THREE.BoxGeometry(1.82, 0.55, 3.9);
    const body = new THREE.Mesh(bodyGeo, this.bodyMaterial);
    body.position.set(0, 0.88, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    this.chassisGroup.add(body);

    // Sloped Hood
    const hoodGeo = new THREE.BoxGeometry(1.72, 0.28, 1.4);
    const hood = new THREE.Mesh(hoodGeo, this.bodyMaterial);
    hood.position.set(0, 1.05, 1.15);
    hood.rotation.x = 0.04;
    hood.castShadow = true;
    this.chassisGroup.add(hood);

    // Hood scoop air intake
    const scoopGeo = new THREE.BoxGeometry(0.65, 0.1, 0.7);
    const scoop = new THREE.Mesh(scoopGeo, this.trimMaterial);
    scoop.position.set(0, 1.22, 1.1);
    scoop.castShadow = true;
    this.chassisGroup.add(scoop);

    // Flared Off-road Wheel Arches (Front Left, Front Right, Rear Left, Rear Right)
    const archPositions = [
      { x: -0.92, z: this.wheelBase * 0.5 },
      { x: 0.92, z: this.wheelBase * 0.5 },
      { x: -0.92, z: -this.wheelBase * 0.5 },
      { x: 0.92, z: -this.wheelBase * 0.5 },
    ];

    archPositions.forEach(pos => {
      const archGeo = new THREE.BoxGeometry(0.18, 0.44, 0.96);
      const arch = new THREE.Mesh(archGeo, this.trimMaterial);
      arch.position.set(pos.x, 0.85, pos.z);
      arch.castShadow = true;
      this.chassisGroup.add(arch);
    });

    // Front Grille
    const grilleGeo = new THREE.BoxGeometry(1.4, 0.38, 0.08);
    const grille = new THREE.Mesh(grilleGeo, this.trimMaterial);
    grille.position.set(0, 0.92, 1.95);
    this.chassisGroup.add(grille);

    // Grille vertical slats
    for (let i = -4; i <= 4; i++) {
      const slatGeo = new THREE.BoxGeometry(0.04, 0.28, 0.02);
      const slat = new THREE.Mesh(slatGeo, this.bodyMaterial);
      slat.position.set(i * 0.12, 0.92, 2.0);
      this.chassisGroup.add(slat);
    }

    // Side mirrors
    const mirrorStemGeo = new THREE.BoxGeometry(0.18, 0.04, 0.04);
    const mirrorHousingGeo = new THREE.BoxGeometry(0.12, 0.18, 0.24);

    // Left mirror
    const mirrorL = new THREE.Mesh(mirrorHousingGeo, this.trimMaterial);
    mirrorL.position.set(-1.05, 1.35, 0.7);
    const stemL = new THREE.Mesh(mirrorStemGeo, this.trimMaterial);
    stemL.position.set(-0.95, 1.35, 0.7);
    this.chassisGroup.add(mirrorL, stemL);

    // Right mirror
    const mirrorR = new THREE.Mesh(mirrorHousingGeo, this.trimMaterial);
    mirrorR.position.set(1.05, 1.35, 0.7);
    const stemR = new THREE.Mesh(mirrorStemGeo, this.trimMaterial);
    stemR.position.set(0.95, 1.35, 0.7);
    this.chassisGroup.add(mirrorR, stemR);
  }

  private buildCabinAndWindows() {
    // Upper Cabin Shell
    const cabinGeo = new THREE.BoxGeometry(1.64, 0.75, 2.05);
    const cabin = new THREE.Mesh(cabinGeo, this.bodyMaterial);
    cabin.position.set(0, 1.45, -0.42);
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    this.chassisGroup.add(cabin);

    // Windshield (tilted forward)
    const windshieldGeo = new THREE.BoxGeometry(1.5, 0.55, 0.06);
    const windshield = new THREE.Mesh(windshieldGeo, this.glassMaterial);
    windshield.position.set(0, 1.44, 0.61);
    windshield.rotation.x = 0.32;
    this.chassisGroup.add(windshield);

    // Rear window
    const rearWindowGeo = new THREE.BoxGeometry(1.4, 0.48, 0.06);
    const rearWindow = new THREE.Mesh(rearWindowGeo, this.glassMaterial);
    rearWindow.position.set(0, 1.48, -1.45);
    this.chassisGroup.add(rearWindow);

    // Side windows (Left and Right)
    const sideWindowGeo = new THREE.BoxGeometry(0.06, 0.44, 1.6);
    const sideWindowL = new THREE.Mesh(sideWindowGeo, this.glassMaterial);
    sideWindowL.position.set(-0.83, 1.45, -0.42);
    const sideWindowR = new THREE.Mesh(sideWindowGeo, this.glassMaterial);
    sideWindowR.position.set(0.83, 1.45, -0.42);
    this.chassisGroup.add(sideWindowL, sideWindowR);

    // Cabin roof plate
    const roofPlateGeo = new THREE.BoxGeometry(1.68, 0.08, 2.15);
    const roofPlate = new THREE.Mesh(roofPlateGeo, this.trimMaterial);
    roofPlate.position.set(0, 1.84, -0.42);
    roofPlate.castShadow = true;
    this.chassisGroup.add(roofPlate);
  }

  private buildRoofRack() {
    const rackGroup = new THREE.Group();

    // Side rails
    const railGeo = new THREE.BoxGeometry(0.06, 0.1, 1.8);
    const railL = new THREE.Mesh(railGeo, this.trimMaterial);
    railL.position.set(-0.76, 1.95, -0.42);
    const railR = new THREE.Mesh(railGeo, this.trimMaterial);
    railR.position.set(0.76, 1.95, -0.42);
    rackGroup.add(railL, railR);

    // Cross bars
    for (let i = -0.7; i <= 0.7; i += 0.45) {
      const barGeo = new THREE.BoxGeometry(1.5, 0.04, 0.04);
      const bar = new THREE.Mesh(barGeo, this.trimMaterial);
      bar.position.set(0, 1.93, -0.42 + i);
      rackGroup.add(bar);
    }

    // Cargo gear box
    const gearBoxGeo = new THREE.BoxGeometry(0.65, 0.28, 0.9);
    const gearBoxMat = new THREE.MeshStandardMaterial({ color: 0x3d434a, roughness: 0.6 });
    const gearBox = new THREE.Mesh(gearBoxGeo, gearBoxMat);
    gearBox.position.set(-0.3, 2.05, -0.4);
    gearBox.castShadow = true;
    rackGroup.add(gearBox);

    // Red Expedition Jerry Cans (Fuel reserve)
    const canGeo = new THREE.BoxGeometry(0.25, 0.35, 0.18);
    const canMat = new THREE.MeshStandardMaterial({ color: 0xbd2a2a, roughness: 0.4 });
    const can1 = new THREE.Mesh(canGeo, canMat);
    can1.position.set(0.38, 2.08, -0.6);
    can1.castShadow = true;
    const can2 = new THREE.Mesh(canGeo, canMat);
    can2.position.set(0.38, 2.08, -0.38);
    can2.castShadow = true;
    rackGroup.add(can1, can2);

    // Off-road Roof Light Bar
    const lightBarHousingGeo = new THREE.BoxGeometry(1.2, 0.08, 0.1);
    const lightBarHousing = new THREE.Mesh(lightBarHousingGeo, this.trimMaterial);
    lightBarHousing.position.set(0, 1.98, 0.45);
    rackGroup.add(lightBarHousing);

    const lightBarLensGeo = new THREE.BoxGeometry(1.1, 0.05, 0.02);
    const lightBarLens = new THREE.Mesh(lightBarLensGeo, this.lightMaterial);
    lightBarLens.position.set(0, 1.98, 0.51);
    rackGroup.add(lightBarLens);

    this.chassisGroup.add(rackGroup);
  }

  private buildBumpersAndWinch() {
    // Front Heavy-duty Tubular Bumper
    const frontBumperGeo = new THREE.BoxGeometry(1.95, 0.24, 0.28);
    const frontBumper = new THREE.Mesh(frontBumperGeo, this.trimMaterial);
    frontBumper.position.set(0, 0.55, 2.06);
    frontBumper.castShadow = true;
    this.chassisGroup.add(frontBumper);

    // Front Winch
    const winchCylGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.35, 12);
    winchCylGeo.rotateZ(Math.PI / 2);
    const winchCyl = new THREE.Mesh(winchCylGeo, this.rimMaterial);
    winchCyl.position.set(0, 0.62, 2.2);
    this.chassisGroup.add(winchCyl);

    // Rear Bumper
    const rearBumperGeo = new THREE.BoxGeometry(1.9, 0.22, 0.24);
    const rearBumper = new THREE.Mesh(rearBumperGeo, this.trimMaterial);
    rearBumper.position.set(0, 0.58, -2.05);
    rearBumper.castShadow = true;
    this.chassisGroup.add(rearBumper);
  }

  private buildSpareTire() {
    // Rear Mounted Spare Tire
    const spareGroup = new THREE.Group();
    const tireMesh = this.createTireMesh();
    spareGroup.add(tireMesh);

    // Mount bracket
    const mountGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const mount = new THREE.Mesh(mountGeo, this.trimMaterial);
    mount.position.set(0, 0, 0.18);
    spareGroup.add(mount);

    spareGroup.position.set(0, 1.25, -2.05);
    spareGroup.castShadow = true;
    this.chassisGroup.add(spareGroup);
  }

  private buildLights() {
    // Round Headlights (Left & Right)
    const headLightGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.05, 16);
    headLightGeo.rotateX(Math.PI / 2);

    const hlL = new THREE.Mesh(headLightGeo, this.lightMaterial);
    hlL.position.set(-0.62, 0.94, 2.0);
    const hlR = new THREE.Mesh(headLightGeo, this.lightMaterial);
    hlR.position.set(0.62, 0.94, 2.0);
    this.chassisGroup.add(hlL, hlR);

    // Headlight Spotlights for night / shadow depth
    const spotL = new THREE.SpotLight(0xfffaea, 3.5, 55, Math.PI / 6, 0.35, 1.2);
    spotL.position.set(-0.62, 0.94, 2.1);
    const targetL = new THREE.Object3D();
    targetL.position.set(-0.62, 0.1, 15);
    this.chassisGroup.add(spotL, targetL);
    spotL.target = targetL;

    const spotR = new THREE.SpotLight(0xfffaea, 3.5, 55, Math.PI / 6, 0.35, 1.2);
    spotR.position.set(0.62, 0.94, 2.1);
    const targetR = new THREE.Object3D();
    targetR.position.set(0.62, 0.1, 15);
    this.chassisGroup.add(spotR, targetR);
    spotR.target = targetR;

    // Rear Taillights
    const tailLightGeo = new THREE.BoxGeometry(0.22, 0.14, 0.04);
    const tlL = new THREE.Mesh(tailLightGeo, this.brakeLightMaterial);
    tlL.position.set(-0.75, 0.96, -1.98);
    const tlR = new THREE.Mesh(tailLightGeo, this.brakeLightMaterial);
    tlR.position.set(0.75, 0.96, -1.98);
    this.chassisGroup.add(tlL, tlR);

    return { hlL, hlR, tlL, tlR, spotL, spotR };
  }

  private createTireMesh(): THREE.Group {
    const tireGroup = new THREE.Group();

    // Outer rubber tread ring
    const torusGeo = new THREE.TorusGeometry(this.tireRadius * 0.72, this.tireRadius * 0.3, 14, 24);
    const tireTread = new THREE.Mesh(torusGeo, this.tireMaterial);
    tireTread.castShadow = true;
    tireGroup.add(tireTread);

    // Deep tread blocks along perimeter
    for (let a = 0; a < 16; a++) {
      const angle = (a / 16) * Math.PI * 2;
      const lugGeo = new THREE.BoxGeometry(0.09, 0.05, this.tireWidth * 0.85);
      const lug = new THREE.Mesh(lugGeo, this.tireMaterial);
      lug.position.set(Math.cos(angle) * (this.tireRadius * 0.95), Math.sin(angle) * (this.tireRadius * 0.95), 0);
      lug.rotation.z = angle;
      tireGroup.add(lug);
    }

    // Titanium rim cylinder & hub
    const rimGeo = new THREE.CylinderGeometry(this.tireRadius * 0.58, this.tireRadius * 0.58, this.tireWidth * 0.7, 16);
    rimGeo.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, this.rimMaterial);
    tireGroup.add(rim);

    // Multi-spoke wheel face
    for (let s = 0; s < 5; s++) {
      const spokeAngle = (s / 5) * Math.PI * 2;
      const spokeGeo = new THREE.BoxGeometry(this.tireRadius * 0.5, 0.06, 0.04);
      const spoke = new THREE.Mesh(spokeGeo, this.rimMaterial);
      spoke.position.set(Math.cos(spokeAngle) * 0.14, Math.sin(spokeAngle) * 0.14, 0.12);
      spoke.rotation.z = spokeAngle;
      tireGroup.add(spoke);
    }

    return tireGroup;
  }

  private buildWheels() {
    const wheelConfigs = [
      { isFront: true, isLeft: true, x: -this.trackWidth * 0.5, z: this.wheelBase * 0.5 },
      { isFront: true, isLeft: false, x: this.trackWidth * 0.5, z: this.wheelBase * 0.5 },
      { isFront: false, isLeft: true, x: -this.trackWidth * 0.5, z: -this.wheelBase * 0.5 },
      { isFront: false, isLeft: false, x: this.trackWidth * 0.5, z: -this.wheelBase * 0.5 },
    ];

    wheelConfigs.forEach(cfg => {
      // Steering knuckle group (steers on Y)
      const knuckleGroup = new THREE.Group();
      knuckleGroup.position.set(cfg.x, 0, cfg.z);

      // Rolling wheel group (rolls on X)
      const wheelRollGroup = new THREE.Group();
      const tireMesh = this.createTireMesh();

      // Orient wheel properly: Torus is oriented in XY, align its axle along X
      tireMesh.rotation.y = Math.PI / 2;
      wheelRollGroup.add(tireMesh);

      knuckleGroup.add(wheelRollGroup);
      this.group.add(knuckleGroup);

      this.wheels.push({
        group: knuckleGroup,
        wheelMesh: wheelRollGroup,
        tireRadius: this.tireRadius,
        width: this.tireWidth,
        isFront: cfg.isFront,
        isLeft: cfg.isLeft,
      });
    });
  }

  public setSteering(angleRad: number) {
    this.wheels.forEach(w => {
      if (w.isFront) {
        w.group.rotation.y = angleRad;
      }
    });
  }

  public spinWheels(rotationDelta: number) {
    this.wheels.forEach(w => {
      w.wheelMesh.rotation.x += rotationDelta;
    });
  }

  public setBraking(isBraking: boolean) {
    this.brakeLightMaterial.emissiveIntensity = isBraking ? 1.8 : 0.3;
  }

  public setHeadlights(enabled: boolean) {
    this.headlightSpotLeft.visible = enabled;
    this.headlightSpotRight.visible = enabled;
    this.lightMaterial.emissiveIntensity = enabled ? 1.0 : 0.1;
  }

  public setBodyColor(hex: number) {
    this.bodyMaterial.color.setHex(hex);
  }
}
