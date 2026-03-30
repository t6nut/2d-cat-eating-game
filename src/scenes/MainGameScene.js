const WORLD_WIDTH = 1280;
const WORLD_HEIGHT = 720;

const CHARACTER_SKINS = {
  orange: { idle: 'kittenIdle', run: 'kittenRun', eat: 'kittenEat' },
  tuxedo: { idle: 'tuxedoIdle', run: 'tuxedoRun', eat: 'tuxedoEat' },
  pikatchu: { idle: 'pikatchuIdle', run: 'pikatchuRun', eat: 'pikatchuEat' },
};

const MODE_SETTINGS = {
  easy: {
    label: 'Easy',
    dropDelayBase: 1650,
    dropDelayMin: 900,
    dropRamp: 9,
    foodScale: 1.7,
    minFallVelocity: 24,
    maxFallVelocity: 48,
    gravityScale: 0.42,
    heliSpeedScale: 0.68,
    pizzaChance: 0.12,
    growthMultiplier: 1.35,
    airplaneDurationScale: 1.45,
    zombieSpeed: 56,
    zombieSpawnDelay: 3800,
  },
  medium: {
    label: 'Medium',
    dropDelayBase: 1150,
    dropDelayMin: 560,
    dropRamp: 12,
    foodScale: 1.45,
    minFallVelocity: 45,
    maxFallVelocity: 88,
    gravityScale: 0.8,
    heliSpeedScale: 0.9,
    pizzaChance: 0.16,
    growthMultiplier: 1,
    airplaneDurationScale: 1.1,
    zombieSpeed: 76,
    zombieSpawnDelay: 3200,
  },
  hard: {
    label: 'Hard',
    dropDelayBase: 900,
    dropDelayMin: 350,
    dropRamp: 12,
    foodScale: 1.2,
    minFallVelocity: 56,
    maxFallVelocity: 106,
    gravityScale: 1,
    heliSpeedScale: 1,
    pizzaChance: 0.2,
    growthMultiplier: 0.9,
    airplaneDurationScale: 1,
    zombieSpeed: 94,
    zombieSpawnDelay: 2600,
  },
};

const THEME_SETTINGS = {
  day: { label: 'Day', skyColor: 0x99e8ff, groundColor: 0xa8de78 },
  night: { label: 'Night', skyColor: 0x101a34, groundColor: 0x2f4f39 },
};

const MAP_SETTINGS = {
  city: { label: 'City', skyColor: 0x8cc7ff, groundColor: 0x5f6775 },
  desert: { label: 'Desert', skyColor: 0xfecf86, groundColor: 0xd8b06a },
  beach: { label: 'Beach', skyColor: 0x8de0ff, groundColor: 0xe3d39b },
  moon: { label: 'Moon', skyColor: 0x0c1330, groundColor: 0x8f97ab },
};

const ENEMY_SETTINGS = {
  zombies: { label: 'Zombies' },
  vampires: { label: 'Vampires' },
  off: { label: 'Off' },
};

const CHARACTER_HITBOX = { width: 16, height: 12, offsetX: 8, offsetY: 14 };
const GROWTH_SAVE_PREFIX = 'cat_game_growth_';

export class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
    this.pizzaSpawnEvent = null;
    this.zombieSpawnEvent = null;
    this.foodPoints = 0;
    this.foodCaught = 0;
    this.sizeMultiplier = 1;
    this.eatCooldown = 0;
    this.zombieHitCooldown = 0;
    this.airplaneActive = false;
    this.currentCharacterKey = 'orange';
    this.currentModeKey = 'medium';
    this.currentThemeKey = 'day';
    this.currentMapKey = 'city';
    this.currentEnemyType = 'zombies';
    this.zombiesEnabled = false;
    this.backgroundElements = [];
    this.audioCtx = null;
    this.runMode = 'growth-only';
    this.loadedState = null;
    this.autosaveEvent = null;
    this.lastMoveDir = 1;
    this.kittenPrevVelY = 0;
    this.flashlightTip = { x: 0, y: 0 };
    this.flashlightDir = 1;
    this.flashlightLength = 0;
    this.flashlightHalfWidth = 0;
    this.flashlightBatteryMax = 100;
    this.flashlightBattery = 100;
    this.flashlightDrainPerSec = this.flashlightBatteryMax / 60;
    this.jetpackFuelMax = 10;
    this.jetpackFuel = 10;
    this.jetpackFuelDrainPerSec = this.jetpackFuelMax / 10;
    this.jetpackThrustPerSec = 920;
    this.jetpackMaxLiftSpeed = -340;
    this.flashlightOn = true;
    this.facingDir = 1;
    this.jumpVelocity = -230;
    this.kittenExtraGravity = 300;
    this.moonWrapEnabled = false;
    this.slicesEatenForBonus = 0;
    this.pendingBonusFlyovers = 0;
    this.musicEvent = null;
    this.musicStep = 0;
    this.jetpackPack = null;
    this.jetpackFlames = null;
  }

  init(data) {
    this.currentCharacterKey = data.character ?? 'orange';
    this.currentModeKey = data.mode ?? 'medium';
    this.currentThemeKey = data.theme ?? 'day';
    this.currentMapKey = data.map ?? 'city';
    this.currentEnemyType = data.enemyType ?? (data.zombies ? 'zombies' : 'off');
    this.zombiesEnabled = !!data.zombies;
    this.runMode = 'growth-only';
    this.loadedState = null;
    this.foodPoints = 0;
    this.foodCaught = 0;
    this.sizeMultiplier = 1;

    if (this.currentMapKey === 'moon') {
      this.currentThemeKey = 'night';
    }

    // Keep each cat's growth persistent even when starting a new session.
    const growthState = this.loadGrowthState(this.currentCharacterKey);
    if (growthState) {
      this.foodPoints = growthState.foodPoints ?? this.foodPoints;
      this.sizeMultiplier = growthState.sizeMultiplier ?? this.sizeMultiplier;
    }

    this.zombiesEnabled = this.currentEnemyType !== 'off';

    if (this.currentMapKey === 'moon') {
      this.jumpVelocity = -460;
      this.kittenExtraGravity = 0;
      this.moonWrapEnabled = true;
    } else {
      this.jumpVelocity = -330;
      this.kittenExtraGravity = 300;
      this.moonWrapEnabled = false;
    }
  }

  create() {
    this.createBackground();

    this.ground = this.physics.add.staticImage(WORLD_WIDTH / 2, WORLD_HEIGHT - 20, null);
    this.ground.displayWidth = WORLD_WIDTH;
    this.ground.displayHeight = 40;
    this.ground.refreshBody();

    this.kittenSkin = CHARACTER_SKINS[this.currentCharacterKey] || CHARACTER_SKINS.orange;
    this.kitten = this.physics.add.sprite(WORLD_WIDTH / 2, WORLD_HEIGHT - 62, this.kittenSkin.idle);
    this.kitten.setOrigin(0.5, 1);
    this.kitten.setCollideWorldBounds(true);
    this.kitten.setGravityY(this.kittenExtraGravity);
    this.kitten.setDragX(1300);
    this.kitten.setMaxVelocity(380, 1000);
    this.kitten.setDepth(8);
    this.physics.add.collider(this.kitten, this.ground);

    const heliKey  = this.currentMapKey === 'moon' ? 'ufoSprite'    : 'chefHeli';
    const planeKey = this.currentMapKey === 'moon' ? 'rocketSprite' : 'pizzaPlane';
    this.chefHeli   = this.add.sprite(WORLD_WIDTH / 2, 88, heliKey).setScale(1.55).setDepth(5);
    this.pizzaPlane = this.add.sprite(-140, 120, planeKey).setVisible(false).setScale(1.22).setDepth(5);

    this.pizzaGroup = this.physics.add.group({ bounceY: 0, collideWorldBounds: false, maxSize: 180 });
    this.zombieGroup = this.physics.add.group({ collideWorldBounds: false, maxSize: 40 });
    this.batteryGroup = this.physics.add.group({ bounceY: 0.12, collideWorldBounds: false, maxSize: 20 });
    this.fuelGroup = this.physics.add.group({ bounceY: 0.12, collideWorldBounds: false, maxSize: 20 });

    this.physics.add.overlap(this.kitten, this.pizzaGroup, this.handlePizzaCaught, null, this);
    this.physics.add.collider(this.pizzaGroup, this.ground, this.handleFoodHitGround, null, this);
    this.physics.add.collider(this.zombieGroup, this.ground);
    this.physics.add.collider(this.batteryGroup, this.ground, this.handleBatteryHitGround, null, this);
    this.physics.add.collider(this.fuelGroup, this.ground, this.handleFuelHitGround, null, this);
    this.physics.add.collider(this.kitten, this.zombieGroup, this.handleZombieCollision, null, this);
    this.physics.add.overlap(this.zombieGroup, this.pizzaGroup, this.handleZombieEatFood, null, this);
    this.physics.add.overlap(this.kitten, this.batteryGroup, this.handleBatteryPickup, null, this);
    this.physics.add.overlap(this.kitten, this.fuelGroup, this.handleFuelPickup, null, this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.lightToggleKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.jetpackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.fullscreenKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G);

    this.input.keyboard.on('keydown', this.resumeAudio, this);
    this.input.on('pointerdown', this.resumeAudio, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stopBackgroundMusic());

    this.createHud();
    this.startBackgroundMusic();
    this.createFlashlight();
    this.ensureZombieTexture();
    this.ensureVampireTexture();
    this.ensureAshTexture();
    this.ensureBatteryTexture();
    this.ensureFuelTexture();
    this.applyTheme(this.currentThemeKey);

    this.kittenShadow = this.add.ellipse(this.kitten.x, this.getGroundSurfaceY(), 42, 14, 0x000000, 0.24).setDepth(6);
    this.heliShadow = this.add.ellipse(this.chefHeli.x, this.getGroundSurfaceY(), 110, 26, 0x000000, 0.18).setDepth(4);
    this.rocketShadow = this.add.ellipse(this.pizzaPlane.x, this.getGroundSurfaceY(), 88, 20, 0x000000, 0.16).setDepth(4).setVisible(false);
    this.createAstronautHelmet();
    this.createJetpackVisuals();

    this.kitten.setScale(this.sizeMultiplier);
    this.syncKittenBodyToFeet();

    this.schedulePizzaDrops();
    if (this.zombiesEnabled) {
      this.scheduleZombieSpawns();
    }

    this.autosaveEvent = this.time.addEvent({
      delay: 1800,
      loop: true,
      callback: () => this.saveCharacterState(),
    });

    this.updateHud();
  }

  createBackground() {
    this.bgSky = this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x99e8ff).setDepth(0);
    this.bgGround = this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT - 100, WORLD_WIDTH, 200, 0xa8de78).setDepth(1);
  }

  applyMap(mapKey) {
    const map = MAP_SETTINGS[mapKey] || MAP_SETTINGS.city;
    this.currentMapKey = mapKey;
    this.bgSky.setVisible(true);
    this.bgGround.setVisible(true);
    this.bgSky.setFillStyle(map.skyColor, 1);
    this.bgGround.setFillStyle(map.groundColor, 1);

    for (let i = 0; i < this.backgroundElements.length; i += 1) {
      this.backgroundElements[i].destroy();
    }
    this.backgroundElements = [];

    if (mapKey === 'city') {
      const cityNight = this.currentThemeKey === 'night';
      this.bgSky.setVisible(true);
      this.bgGround.setVisible(true);
      this.bgSky.setFillStyle(cityNight ? 0x101a34 : 0x95d5ff, cityNight ? 0.94 : 1);
      this.bgGround.setFillStyle(cityNight ? 0x3a4558 : 0x6d7686, 1);

      const sunOrMoon = this.add.circle(1030, 86, 36, cityNight ? 0xe9f3ff : 0xffed9e, cityNight ? 0.86 : 0.92).setDepth(2);
      this.backgroundElements.push(sunOrMoon);

      for (let i = 0; i < 11; i += 1) {
        const x = 54 + i * 122;
        const h = 90 + (i % 4) * 26;
        const buildingColor = cityNight ? 0x273348 : 0x7f8ea4;
        const building = this.add.rectangle(x, WORLD_HEIGHT - 170 - h * 0.5, 78, h, buildingColor, 0.95).setDepth(2);
        this.backgroundElements.push(building);
      }

      const skylineBaseY = Math.floor(WORLD_HEIGHT * 0.75);
      const asphalt = this.add.rectangle(WORLD_WIDTH / 2, skylineBaseY + 14, WORLD_WIDTH, 44, 0x262a32, 0.9).setDepth(2);
      const laneStripe = this.add.rectangle(WORLD_WIDTH / 2, skylineBaseY + 14, WORLD_WIDTH, 3, 0xc9c9bf, 0.55).setDepth(2);
      this.backgroundElements.push(asphalt, laneStripe);

      for (let i = 0; i < 7; i += 1) {
        const tx = 90 + i * 170;
        const trunk = this.add.rectangle(tx, skylineBaseY - 8, 8, 18, 0x5b3a25, 0.95).setDepth(3);
        const leaves = this.add.circle(tx, skylineBaseY - 22, 13, 0x4f9650, 0.95).setDepth(3);
        this.backgroundElements.push(trunk, leaves);
      }

      // Add simple looping road traffic behind gameplay sprites.
      for (let i = 0; i < 4; i += 1) {
        const y = skylineBaseY + 6 + i * 7;
        const speed = 3800 + i * 700;
        const color = [0xe04444, 0x44a6e0, 0xf0c547, 0xa35de6][i % 4];
        const fromLeft = i % 2 === 0;
        const body = this.add.rectangle(fromLeft ? -80 : WORLD_WIDTH + 80, y, 48, 16, color, 0.9).setDepth(2);
        const wheelA = this.add.circle(body.x - 14, y + 8, 3, 0x1f1f1f, 1).setDepth(2);
        const wheelB = this.add.circle(body.x + 14, y + 8, 3, 0x1f1f1f, 1).setDepth(2);
        this.backgroundElements.push(body, wheelA, wheelB);

        this.tweens.add({
          targets: body,
          x: fromLeft ? WORLD_WIDTH + 90 : -90,
          duration: speed,
          repeat: -1,
          ease: 'Linear',
          onUpdate: () => {
            wheelA.x = body.x - 14;
            wheelB.x = body.x + 14;
          },
        });
      }
    } else if (mapKey === 'desert') {
      const dune1 = this.add.ellipse(230, WORLD_HEIGHT - 80, 420, 110, 0xe7bf7e, 0.55).setDepth(2);
      const dune2 = this.add.ellipse(640, WORLD_HEIGHT - 65, 560, 130, 0xd6aa68, 0.5).setDepth(2);
      const sun = this.add.circle(830, 86, 34, 0xfff1a0, 0.9).setDepth(2);
      this.backgroundElements.push(dune1, dune2, sun);
    } else if (mapKey === 'beach') {
      const sea = this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT * 0.58, WORLD_WIDTH, WORLD_HEIGHT * 0.64, 0x4fc4dc, 0.6).setDepth(2);
      const wave1 = this.add.ellipse(260, WORLD_HEIGHT * 0.41, 420, 34, 0xbef6ff, 0.45).setDepth(2);
      const wave2 = this.add.ellipse(700, WORLD_HEIGHT * 0.44, 520, 38, 0xbef6ff, 0.4).setDepth(2);
      const wave3 = this.add.ellipse(1080, WORLD_HEIGHT * 0.47, 360, 30, 0xbef6ff, 0.36).setDepth(2);
      this.backgroundElements.push(sea, wave1, wave2, wave3);
    } else if (mapKey === 'moon') {
      this.bgSky.setVisible(true);
      this.bgGround.setVisible(true);
      this.bgGround.setAlpha(0.35);
      const moonSurface = this.add.ellipse(WORLD_WIDTH / 2, WORLD_HEIGHT + 150, 1400, 560, 0x8f97ab, 0.8).setDepth(2);
      const ringA = this.add.ellipse(WORLD_WIDTH / 2, WORLD_HEIGHT + 160, 1250, 500, 0xc7cdd8, 0.08).setDepth(3);
      const ringB = this.add.ellipse(WORLD_WIDTH / 2, WORLD_HEIGHT + 170, 1120, 440, 0xdde3ef, 0.08).setDepth(3);
      const earth = this.add.circle(120, 90, 24, 0x5ca7f3, 0.9).setDepth(3);
      this.backgroundElements.push(moonSurface, ringA, ringB, earth);
      this.tweens.add({ targets: ringA, x: WORLD_WIDTH / 2 + 24, y: WORLD_HEIGHT + 152, duration: 4600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: ringB, x: WORLD_WIDTH / 2 - 24, y: WORLD_HEIGHT + 178, duration: 5100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  createFlashlight() {
    this.flashlightCone = this.add.graphics();
    this.flashlightCone.setDepth(9);
    this.flashlightCone.setVisible(false);
    this.flashlightCone.setBlendMode(Phaser.BlendModes.ADD);

    // Small flashlight handle drawn at the cat hand position.
    this.flashlightHandle = this.add.graphics();
    this.flashlightHandle.setDepth(11);
    this.flashlightHandle.setVisible(false);
  }

  applyTheme(themeKey) {
    const theme = THEME_SETTINGS[themeKey] || THEME_SETTINGS.day;
    this.currentThemeKey = themeKey;
    this.bgGround.setAlpha(1);
    this.applyMap(this.currentMapKey);

    if (themeKey === 'night') {
      for (let i = 0; i < 42; i += 1) {
        const star = this.add.circle(
          Phaser.Math.Between(18, WORLD_WIDTH - 18),
          Phaser.Math.Between(12, 210),
          Phaser.Math.Between(1, 2),
          0xd9ecff,
          Phaser.Math.FloatBetween(0.48, 0.92),
        );
        star.setDepth(2);
        this.backgroundElements.push(star);
      }
      const moonGlow = this.add.circle(820, 100, 74, 0xbccfff, 0.2).setDepth(2);
      const moon = this.add.circle(820, 100, 34, 0xe9f3ff, 1).setDepth(3);
      const moonshine = this.add.ellipse(810, 350, 420, 230, 0x9dbbff, 0.12).setDepth(2);
      this.backgroundElements.push(moonGlow, moon, moonshine);
      this.bgSky.setFillStyle(theme.skyColor, 0.92);
      if (this.currentMapKey === 'beach') {
        this.bgGround.setFillStyle(0x7b6b4d, 1);
      }
    } else if (this.currentMapKey !== 'moon') {
      for (let i = 0; i < 11; i += 1) {
        const cloudX = 70 + i * 115;
        const cloudY = 65 + (i % 2) * 28;
        const cloud = this.add.ellipse(cloudX, cloudY, 86, 34, 0xdff8ff, 0.65).setDepth(2);
        this.backgroundElements.push(cloud);
      }
    }

    const beamEnabled = this.flashlightOn && this.flashlightBattery > 0
      && (themeKey === 'night' || themeKey === 'day');
    this.flashlightCone.setVisible(beamEnabled);
    this.flashlightHandle.setVisible(beamEnabled);
    if (!beamEnabled) {
      this.flashlightCone.clear();
      this.flashlightHandle.clear();
    }
  }

  createHud() {
    const style = {
      fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
      fontSize: '20px',
      color: '#2f1b14',
      stroke: '#fff8e6',
      strokeThickness: 3,
    };

    this.scoreText = this.add.text(20, 20, 'Food: 0', style).setDepth(20);
    this.sizeText = this.add.text(20, 48, 'Size: 1.00x', style).setDepth(20);
    this.modeText = this.add.text(20, 76, 'Mode: --', style).setDepth(20);
    this.batteryLabelText = this.add.text(20, 104, 'Battery', style).setDepth(20);
    this.batteryBarFrame = this.add.graphics().setDepth(20);
    this.batteryBarFill = this.add.graphics().setDepth(20);
    this.fuelLabelText = this.add.text(20, 132, 'Fuel', style).setDepth(20);
    this.fuelBarFrame = this.add.graphics().setDepth(20);
    this.fuelBarFill = this.add.graphics().setDepth(20);

    this.add
      .text(WORLD_WIDTH - 20, 20, 'ESC: Menu   F: Light/Laser   G: Fullscreen', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '18px',
        color: '#2f1b14',
        stroke: '#fff8e6',
        strokeThickness: 3,
      })
      .setOrigin(1, 0)
      .setDepth(20);

    this.updateHud();
  }

  updateHud() {
    const mode = MODE_SETTINGS[this.currentModeKey] || MODE_SETTINGS.medium;
    const map = MAP_SETTINGS[this.currentMapKey] || MAP_SETTINGS.city;
    const enemy = ENEMY_SETTINGS[this.currentEnemyType] || ENEMY_SETTINGS.off;
    this.scoreText.setText(`Food: ${this.foodPoints}`);
    this.sizeText.setText(`Size: ${this.sizeMultiplier.toFixed(2)}x`);
    this.modeText.setText(`Mode: ${mode.label} | Map: ${map.label} | Enemy: ${enemy.label}`);

    const barX = 108;
    const barY = 110;
    const barW = 64;
    const barH = 18;
    const fillPct = Phaser.Math.Clamp(this.flashlightBattery / this.flashlightBatteryMax, 0, 1);

    this.batteryBarFrame.clear();
    this.batteryBarFrame.lineStyle(2, 0x13331e, 1);
    this.batteryBarFrame.strokeRoundedRect(barX, barY, barW, barH, 3);
    this.batteryBarFrame.fillStyle(0x13331e, 1);
    this.batteryBarFrame.fillRect(barX + barW, barY + 5, 4, 8);

    this.batteryBarFill.clear();
    this.batteryBarFill.fillStyle(0x54d66a, 1);
    this.batteryBarFill.fillRoundedRect(barX + 2, barY + 2, Math.max(0, (barW - 4) * fillPct), barH - 4, 2);

    const fuelVisible = this.currentMapKey === 'moon';
    this.fuelLabelText.setVisible(fuelVisible);
    if (!fuelVisible) {
      this.fuelBarFrame.clear();
      this.fuelBarFill.clear();
      return;
    }

    const fuelBarY = barY + 28;
    const fuelPct = Phaser.Math.Clamp(this.jetpackFuel / this.jetpackFuelMax, 0, 1);
    this.fuelBarFrame.clear();
    this.fuelBarFrame.lineStyle(2, 0x2f2633, 1);
    this.fuelBarFrame.strokeRoundedRect(barX, fuelBarY, barW, barH, 3);
    this.fuelBarFrame.fillStyle(0x2f2633, 1);
    this.fuelBarFrame.fillRect(barX + barW, fuelBarY + 5, 4, 8);

    this.fuelBarFill.clear();
    this.fuelBarFill.fillStyle(0xffb547, 1);
    this.fuelBarFill.fillRoundedRect(barX + 2, fuelBarY + 2, Math.max(0, (barW - 4) * fuelPct), barH - 4, 2);
  }

  getCurrentMode() {
    return MODE_SETTINGS[this.currentModeKey] || MODE_SETTINGS.medium;
  }

  schedulePizzaDrops() {
    if (this.pizzaSpawnEvent) {
      this.pizzaSpawnEvent.remove(false);
    }

    const mode = this.getCurrentMode();
    const delay = Phaser.Math.Clamp(
      mode.dropDelayBase - this.foodCaught * mode.dropRamp,
      mode.dropDelayMin,
      mode.dropDelayBase,
    );

    this.pizzaSpawnEvent = this.time.addEvent({ delay, loop: true, callback: this.spawnFood, callbackScope: this });
  }

  scheduleZombieSpawns() {
    if (this.zombieSpawnEvent) {
      this.zombieSpawnEvent.remove(false);
    }
    const mode = this.getCurrentMode();
    this.zombieSpawnEvent = this.time.addEvent({
      delay: mode.zombieSpawnDelay,
      loop: true,
      callback: this.spawnZombie,
      callbackScope: this,
    });
  }

  spawnFood() {
    this.spawnSliceFromHelicopter();
  }

  spawnSliceFromHelicopter() {
    const mode = this.getCurrentMode();
    const moonFallScale = this.currentMapKey === 'moon' ? 1 / 3 : 1;
    const variance = Phaser.Math.Clamp(34 + this.foodCaught * 0.7, 34, 140);
    const x = Phaser.Math.Clamp(this.chefHeli.x + Phaser.Math.Between(-variance, variance), 24, WORLD_WIDTH - 24);

    const food = this.pizzaGroup.get(x, this.chefHeli.y + 34, 'pizza');
    if (!food) {
      return;
    }

    food.foodValue = 1;
    food.baseFoodValue = 1;
    food.sourceType = 'slice';
    food.caught = false;
    food.onGround = false;
    food.groundTimer = null;
    food.groundStartValue = null;
    food.groundLandedAt = 0;
    food.fadeTween = null;
    food.alpha = 1;
    food.setTexture('pizza');
    food.setActive(true);
    food.setVisible(true);
    food.body.enable = true;
    food.body.setAllowGravity(true);
    food.setScale(mode.foodScale);
    food.setVelocity(Phaser.Math.Between(-30, 30), Phaser.Math.Between(mode.minFallVelocity, mode.maxFallVelocity) * moonFallScale);
    food.setGravityY(600 * mode.gravityScale * moonFallScale);
    food.setAngularVelocity(Phaser.Math.Between(-65, 65));
    food.setDepth(7);
    this.attachDropShadow(food, 34, 10, 0.15);
  }

  launchAirplaneBigPizza() {
    const mode = this.getCurrentMode();
    const moonFallScale = this.currentMapKey === 'moon' ? 1 / 3 : 1;
    this.airplaneActive = true;
    const fromLeft = Math.random() > 0.5;
    const startX = fromLeft ? -120 : WORLD_WIDTH + 120;
    const endX = fromLeft ? WORLD_WIDTH + 120 : -120;

    this.pizzaPlane.setVisible(true);
    this.pizzaPlane.setPosition(startX, 125 + Phaser.Math.Between(-12, 12));
    this.pizzaPlane.setFlipX(!fromLeft);
    this.playAirplaneSound();

    const duration = Math.round(2600 * mode.airplaneDurationScale);
    this.tweens.add({
      targets: this.pizzaPlane,
      x: endX,
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.airplaneActive = false;
        this.pizzaPlane.setVisible(false);
      },
    });

    this.time.delayedCall(Math.round(duration * 0.46), () => {
      this.playDogBarkSound();
      const food = this.pizzaGroup.get(this.pizzaPlane.x, this.pizzaPlane.y + 16, 'pizzaWhole');
      if (!food) {
        return;
      }
      food.foodValue = 5;
      food.baseFoodValue = 5;
      food.sourceType = 'whole';
      food.caught = false;
      food.onGround = false;
      food.groundTimer = null;
      food.groundStartValue = null;
      food.groundLandedAt = 0;
      food.fadeTween = null;
      food.alpha = 1;
      food.setTexture('pizzaWhole');
      food.setActive(true);
      food.setVisible(true);
      food.body.enable = true;
      food.body.setAllowGravity(true);
      food.setScale(mode.foodScale * 1.18);
      food.setVelocity(Phaser.Math.Between(-20, 20), Phaser.Math.Between(mode.minFallVelocity - 10, mode.maxFallVelocity - 16) * moonFallScale);
      food.setGravityY(600 * mode.gravityScale * 0.9 * moonFallScale);
      food.setAngularVelocity(Phaser.Math.Between(-55, 55));
      food.setDepth(7);
      this.attachDropShadow(food, 42, 12, 0.16);

      const batteryDropX = this.pizzaPlane.x + (fromLeft ? -85 : 85);
      if (this.currentMapKey === 'moon') {
        this.spawnFuelDrop(batteryDropX, this.pizzaPlane.y - 22, fromLeft ? -1 : 1);
      } else {
        this.spawnBatteryDrop(batteryDropX, this.pizzaPlane.y - 22, fromLeft ? -1 : 1);
      }
    });
  }

  spawnBatteryDrop(x, y, driftDir) {
    const battery = this.batteryGroup.get(x, y, 'batteryDrop');
    if (!battery) {
      return;
    }
    battery.setTexture('batteryDrop');
    battery.setActive(true);
    battery.setVisible(true);
    battery.body.enable = true;
    battery.body.setAllowGravity(true);
    battery.setScale(1);
    battery.setVelocity(Phaser.Math.Between(4, 10) * driftDir, Phaser.Math.Between(8, 15));
    battery.setGravityY(34);
    battery.setDragX(45);
    battery.setDepth(8);
    battery.onGround = false;
    battery.groundTimer = null;
    this.attachDropShadow(battery, 28, 9, 0.14);
  }

  spawnFuelDrop(x, y, driftDir) {
    const fuel = this.fuelGroup.get(x, y, 'jetFuelDrop');
    if (!fuel) {
      return;
    }
    fuel.setTexture('jetFuelDrop');
    fuel.setActive(true);
    fuel.setVisible(true);
    fuel.body.enable = true;
    fuel.body.setAllowGravity(true);
    fuel.setScale(1);
    fuel.setVelocity(Phaser.Math.Between(6, 13) * driftDir, Phaser.Math.Between(10, 20));
    fuel.setGravityY(42);
    fuel.setDragX(48);
    fuel.setDepth(8);
    fuel.onGround = false;
    fuel.groundTimer = null;
    this.attachDropShadow(fuel, 30, 9, 0.14);
  }

  spawnZombie() {
    if (!this.zombiesEnabled) {
      return;
    }
    const mode = this.getCurrentMode();
    const isVampire = this.currentEnemyType === 'vampires';
    const fromLeft = Math.random() > 0.5;
    const startX = fromLeft ? 10 : WORLD_WIDTH - 10;
    const speed = isVampire ? mode.zombieSpeed + 12 : mode.zombieSpeed;
    const velocityX = fromLeft ? speed : -speed;
    const textureKey = isVampire ? 'vampireWalker' : 'zombieWalker';

    const activeEnemies = this.zombieGroup.getChildren();
    for (let i = 0; i < activeEnemies.length; i += 1) {
      const e = activeEnemies[i];
      if (!e?.active) {
        continue;
      }
      if (Math.abs(e.x - startX) < 34) {
        return;
      }
    }

    const zombie = this.zombieGroup.get(startX, this.getGroundSurfaceY(), textureKey);
    if (!zombie) {
      return;
    }
    if (zombie.shadow) {
      zombie.shadow.destroy();
      zombie.shadow = null;
    }
    zombie.shadow = this.add.ellipse(startX, this.getGroundSurfaceY(), 36, 12, 0x000000, 0.2).setDepth(6);
    if (zombie.umbrella) {
      zombie.umbrella.destroy();
      zombie.umbrella = null;
    }
    zombie.setActive(true);
    zombie.setVisible(true);
    zombie.setOrigin(0.5, 1);
    zombie.body.enable = true;
    zombie.setVelocityX(velocityX);
    zombie.setDepth(7);
    zombie.setFlipX(!fromLeft);
    zombie.clearTint();
    if (isVampire) {
      zombie.setTint(0xd8c3ff);
    }
    zombie.alive = true;
    zombie.growthScale = 1;
    zombie.moveDir = fromLeft ? 1 : -1;
    zombie.moveSpeed = speed;
    zombie.litStopped = false;
    zombie.enemyType = isVampire ? 'vampire' : 'zombie';
    zombie.vampireLightMs = 0;
    zombie.laserBurnMs = 0;
    zombie.umbrella = null;
    this.syncEnemyBody(zombie);
  }

  handleFoodHitGround(objA, objB) {
    // Phaser collider callbacks can arrive in either order depending on body pairing,
    // so explicitly pick the pizza item and never mutate the static ground body.
    const food = this.pizzaGroup && this.pizzaGroup.contains(objA) ? objA : objB;

    if (!food || !this.pizzaGroup.contains(food)) {
      return;
    }

    if (!food.active || food.caught || food.onGround) {
      return;
    }

    food.onGround = true;
    food.groundStartValue = food.foodValue || 1;
    food.groundLandedAt = this.time.now;
    food.alpha = 1;
    if (food.fadeTween) {
      food.fadeTween.stop();
      food.fadeTween = null;
    }
    food.fadeTween = this.tweens.add({
      targets: food,
      alpha: 0.12,
      duration: 3000,
      ease: 'Linear',
    });
    food.setAngularVelocity(0);
    // Some collision paths can yield a body without setVelocityX; damp X directly.
    if (food.body && food.body.velocity) {
      food.body.velocity.x *= 0.2;
      food.body.velocity.y = 0;
    }

    food.groundTimer = this.time.delayedCall(3000, () => {
      if (food.active && !food.caught) {
        this.destroyDropShadow(food);
        food.disableBody(true, true);
      }
    });
  }

  getGroundAdjustedFoodValue(food) {
    if (!food || !food.onGround || !food.groundLandedAt) {
      return food?.foodValue || 1;
    }

    const startValue = food.groundStartValue || food.foodValue || 1;
    const elapsed = Phaser.Math.Clamp(this.time.now - food.groundLandedAt, 0, 3000);
    const t = elapsed / 3000;
    return Phaser.Math.Linear(startValue, startValue * 0.5, t);
  }

  handleBatteryHitGround(objA, objB) {
    const battery = this.batteryGroup && this.batteryGroup.contains(objA) ? objA : objB;
    if (!battery || !this.batteryGroup.contains(battery) || !battery.active || battery.onGround) {
      return;
    }

    battery.onGround = true;
    battery.setAngularVelocity(0);
    if (battery.body && battery.body.velocity) {
      battery.body.velocity.x *= 0.25;
      battery.body.velocity.y = 0;
    }

    battery.groundTimer = this.time.delayedCall(6000, () => {
      if (battery.active) {
        this.destroyDropShadow(battery);
        battery.disableBody(true, true);
      }
    });
  }

  handleFuelHitGround(objA, objB) {
    const fuel = this.fuelGroup && this.fuelGroup.contains(objA) ? objA : objB;
    if (!fuel || !this.fuelGroup.contains(fuel) || !fuel.active || fuel.onGround) {
      return;
    }

    fuel.onGround = true;
    fuel.setAngularVelocity(0);
    if (fuel.body && fuel.body.velocity) {
      fuel.body.velocity.x *= 0.25;
      fuel.body.velocity.y = 0;
    }

    fuel.groundTimer = this.time.delayedCall(6000, () => {
      if (fuel.active) {
        this.destroyDropShadow(fuel);
        fuel.disableBody(true, true);
      }
    });
  }

  handleBatteryPickup(_kitten, battery) {
    if (!battery.active) {
      return;
    }
    if (battery.groundTimer) {
      battery.groundTimer.remove(false);
      battery.groundTimer = null;
    }
    this.destroyDropShadow(battery);
    battery.disableBody(true, true);
    this.flashlightBattery = this.flashlightBatteryMax;
    this.updateHud();
    this.showCatchPopup(this.kitten.x, this.kitten.y - 34, 'BATTERY +100%');
  }

  handleFuelPickup(_kitten, fuel) {
    if (!fuel.active) {
      return;
    }
    if (fuel.groundTimer) {
      fuel.groundTimer.remove(false);
      fuel.groundTimer = null;
    }
    this.destroyDropShadow(fuel);
    fuel.disableBody(true, true);
    if (this.jetpackFuel < this.jetpackFuelMax) {
      this.jetpackFuel = Math.min(this.jetpackFuelMax, this.jetpackFuel + 2.5);
    }
    this.updateHud();
    this.showCatchPopup(this.kitten.x, this.kitten.y - 34, 'FUEL +2.5s');
  }

  handleZombieEatFood(objA, objB) {
    const zombie = this.zombieGroup && this.zombieGroup.contains(objA) ? objA : objB;
    const food = this.pizzaGroup && this.pizzaGroup.contains(objA) ? objA : objB;

    if (!zombie || !food || !this.zombieGroup.contains(zombie) || !this.pizzaGroup.contains(food)) {
      return;
    }

    if (!zombie.active || !zombie.alive || !food.active || food.caught) {
      return;
    }

    food.caught = true;
    if (food.groundTimer) {
      food.groundTimer.remove(false);
      food.groundTimer = null;
    }

    const value = this.getGroundAdjustedFoodValue(food);
    this.destroyDropShadow(food);
    food.disableBody(true, true);
    this.playEnemyEatSound(value);

    zombie.growthScale = Phaser.Math.Clamp((zombie.growthScale || 1) + 0.08 * value, 1, 2.6);
    zombie.setScale(zombie.growthScale);
    zombie.moveSpeed = Phaser.Math.Clamp((zombie.moveSpeed || 0) * 1.3, 40, 320);
    this.syncEnemyBody(zombie);
    if (zombie.body) {
      zombie.body.velocity.y = 0;
      zombie.body.y = this.getGroundSurfaceY() - zombie.body.height;
    }
    if (!zombie.litStopped) {
      zombie.setVelocityX(zombie.moveDir * zombie.moveSpeed);
    }
  }

  handlePizzaCaught(kitten, food) {
    if (food.caught) {
      return;
    }

    food.caught = true;
    food.body.enable = false;
    food.foodValue = this.getGroundAdjustedFoodValue(food);
    food.setVelocity(0, 0);
    food.setAngularVelocity(0);
    food.setDepth(12);

    this.playCatchSound(food.foodValue || 1);

    const mouthX = kitten.x + this.facingDir * 16 * this.sizeMultiplier;
    const mouthY = kitten.y - 16 * this.sizeMultiplier;

    this.tweens.add({
      targets: food,
      x: mouthX,
      y: mouthY,
      scale: Math.max(0.5, food.scale * 0.45),
      duration: 140,
      ease: 'Quad.easeIn',
      onComplete: () => this.consumeFood(food),
    });
  }

  consumeFood(food) {
    const growthValue = food.foodValue || 1;
    if (food.groundTimer) {
      food.groundTimer.remove(false);
      food.groundTimer = null;
    }
    this.destroyDropShadow(food);
    if (food.fadeTween) {
      food.fadeTween.stop();
      food.fadeTween = null;
    }
    food.disableBody(true, true);

    this.foodCaught += 1;
    this.foodPoints += growthValue;
    const growthDelta = this.getGrowthDelta(food, growthValue);
    this.sizeMultiplier = Math.max(1, this.sizeMultiplier + growthDelta);

    this.kitten.setScale(this.sizeMultiplier);
    this.syncKittenBodyToFeet();
    this.eatCooldown = 160;
    this.kitten.setTexture(this.kittenSkin.eat);

    this.playEatSound(growthValue);
    this.playEatingAnimation();
    this.updateHud();

    const popupText = growthValue > 1 ? '+1.0x SIZE' : '+0.1x SIZE';
    this.showCatchPopup(this.kitten.x, this.kitten.y - 45 * this.sizeMultiplier, popupText);

    if (growthValue <= 1) {
      const airborneSlice = food?.sourceType === 'slice' && !food?.onGround;
      if (airborneSlice) {
        this.slicesEatenForBonus += 1;
        if (this.slicesEatenForBonus % 5 === 0) {
          this.pendingBonusFlyovers += 1;
          if (!this.airplaneActive) {
            this.pendingBonusFlyovers -= 1;
            this.launchAirplaneBigPizza();
            this.showCatchPopup(this.kitten.x, this.kitten.y - 64 * this.sizeMultiplier, 'BONUS FLYOVER!');
          }
        }
      }
    }

    if (this.foodCaught % 2 === 0) {
      this.schedulePizzaDrops();
    }

    this.saveCharacterState();
  }

  handleZombieCollision(kitten, zombie) {
    if (!zombie.active || !zombie.alive) {
      return;
    }

    // Use pre-physics velocity snapshot — Phaser modifies velocity before the callback fires.
    // A threshold of 120 means the cat was genuinely falling, not just drifting near a zombie.
    const stomped = this.kittenPrevVelY > 120;
    if (stomped) {
      zombie.alive = false;
      if (zombie.shadow) {
        zombie.shadow.destroy();
        zombie.shadow = null;
      }
      if (zombie.umbrella) {
        zombie.umbrella.destroy();
        zombie.umbrella = null;
      }
      zombie.disableBody(true, true);
      kitten.setVelocityY(-220);
      this.showCatchPopup(kitten.x, kitten.y - 38, 'CHOMP!');
      this.playZombieStompSound();
      this.playEatSound(2);
      this.foodPoints += 2;
      this.foodCaught += 1;
      this.sizeMultiplier = Math.max(1, this.sizeMultiplier + 0.2);
      this.kitten.setScale(this.sizeMultiplier);
      this.syncKittenBodyToFeet();
      this.eatCooldown = 160;
      this.kitten.setTexture(this.kittenSkin.eat);
      this.updateHud();
      this.saveCharacterState();
      return;
    }

    if (this.zombieHitCooldown > 0) {
      return;
    }

    this.zombieHitCooldown = 450;
    this.foodPoints = Math.max(0, this.foodPoints - 2);
    this.sizeMultiplier = Math.max(1, this.sizeMultiplier - 0.2);
    this.kitten.setScale(this.sizeMultiplier);
    this.syncKittenBodyToFeet();
    kitten.setVelocityX(kitten.x < zombie.x ? -220 : 220);
    this.updateHud();
    this.showCatchPopup(kitten.x, kitten.y - 45, 'OUCH!');

    // Zombie grows a little from hitting the cat.
    zombie.growthScale = Phaser.Math.Clamp((zombie.growthScale || 1) + 0.12, 1, 2.6);
    zombie.setScale(zombie.growthScale);
    this.syncEnemyBody(zombie);

    this.saveCharacterState();
  }

  getGrowthDelta(food, growthValue) {
    const sourceType = food?.sourceType || (growthValue > 1 ? 'whole' : 'slice');
    const baseValue = food?.baseFoodValue || (sourceType === 'whole' ? 5 : 1);
    const baseDelta = sourceType === 'whole' ? 1 : 0.1;
    const decayRatio = Phaser.Math.Clamp(growthValue / baseValue, 0.5, 1);
    return baseDelta * decayRatio;
  }

  getSizeMultiplier(foodPoints) {
    const mode = this.getCurrentMode();
    const multiplier = 1 + 0.36 * Math.sqrt(foodPoints * mode.growthMultiplier);
    return Math.max(1, multiplier);
  }

  showCatchPopup(x, y, text) {
    const label = this.add.text(x, y, text, {
      fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
      fontSize: '18px',
      color: '#9e2a2a',
      stroke: '#fff3d8',
      strokeThickness: 3,
    });
    label.setOrigin(0.5).setDepth(25);
    this.tweens.add({ targets: label, y: y - 30, alpha: 0, duration: 420, ease: 'Sine.easeOut', onComplete: () => label.destroy() });
  }

  playEatingAnimation() {
    this.tweens.add({
      targets: this.kitten,
      scaleX: this.sizeMultiplier * 1.08,
      scaleY: this.sizeMultiplier * 0.92,
      yoyo: true,
      duration: 90,
      ease: 'Sine.easeInOut',
    });
  }

  playEnemyEatSound(strength) {
    if (!this.audioCtx) {
      return;
    }
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const now = this.audioCtx.currentTime;
    osc.type = 'square';
    osc.frequency.setValueAtTime(170 + strength * 8, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.11);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  startBackgroundMusic() {
    if (this.musicEvent) {
      this.musicEvent.remove(false);
      this.musicEvent = null;
    }

    this.musicStep = 0;
    this.musicEvent = this.time.addEvent({
      delay: 280,
      loop: true,
      callback: () => this.playMusicStep(),
    });
  }

  stopBackgroundMusic() {
    if (this.musicEvent) {
      this.musicEvent.remove(false);
      this.musicEvent = null;
    }
  }

  playMusicStep() {
    if (!this.audioCtx) {
      return;
    }

    const sequence = [0, 4, 7, 4, 9, 7, 4, 2];
    const semitone = sequence[this.musicStep % sequence.length];
    this.musicStep += 1;

    const now = this.audioCtx.currentTime;
    const freq = 196 * (2 ** (semitone / 12));
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.022, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  toggleFullscreen() {
    const doc = window.document;
    if (doc.fullscreenElement) {
      doc.exitFullscreen();
    } else {
      doc.documentElement.requestFullscreen();
    }
  }

  resumeAudio() {
    if (!window.AudioContext && !window.webkitAudioContext) {
      return;
    }
    if (!this.audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new Ctx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playCatchSound(strength) {
    if (!this.audioCtx) {
      return;
    }
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const now = this.audioCtx.currentTime;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320 + strength * 16, now);
    osc.frequency.exponentialRampToValueAtTime(450 + strength * 22, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.065, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playEatSound(strength) {
    if (!this.audioCtx) {
      return;
    }
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const now = this.audioCtx.currentTime;
    osc.type = 'square';
    osc.frequency.setValueAtTime(190 + strength * 12, now);
    osc.frequency.exponentialRampToValueAtTime(130 + strength * 10, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  playAirplaneSound() {
    if (!this.audioCtx) {
      return;
    }
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const now = this.audioCtx.currentTime;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(84, now);
    osc.frequency.linearRampToValueAtTime(68, now + 1.05);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.045, now + 0.18);
    gain.gain.linearRampToValueAtTime(0.028, now + 0.92);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.12);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 1.15);
  }

  playDogBarkSound() {
    if (!this.audioCtx) {
      return;
    }
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const now = this.audioCtx.currentTime;
    osc.type = 'square';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.05);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.085, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  getGrowthKey(characterKey) {
    return `${GROWTH_SAVE_PREFIX}${characterKey}`;
  }

  saveCharacterState() {
    try {
      this.saveGrowthState();
    } catch (_err) {
      // ignore quota/storage issues in prototype
    }
  }

  loadGrowthState(characterKey) {
    try {
      const raw = localStorage.getItem(this.getGrowthKey(characterKey));
      return raw ? JSON.parse(raw) : null;
    } catch (_err) {
      return null;
    }
  }

  saveGrowthState() {
    const payload = {
      character: this.currentCharacterKey,
      foodPoints: this.foodPoints,
      sizeMultiplier: this.sizeMultiplier,
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(this.getGrowthKey(this.currentCharacterKey), JSON.stringify(payload));
    } catch (_err) {
      // ignore storage issues
    }
  }

  playZombieStompSound() {
    if (!this.audioCtx) {
      return;
    }
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const now = this.audioCtx.currentTime;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(230, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.1);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.075, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  ensureZombieTexture() {
    if (this.textures.exists('zombieWalker')) {
      return;
    }
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x4f7f47, 1);
    g.fillRect(6, 8, 20, 14);
    g.fillStyle(0x35592f, 1);
    g.fillRect(8, 4, 16, 4);
    g.fillStyle(0xb4ddb4, 1);
    g.fillRect(10, 12, 4, 4);
    g.fillRect(18, 12, 4, 4);
    g.fillStyle(0x1f2f1f, 1);
    g.fillRect(11, 13, 1, 1);
    g.fillRect(19, 13, 1, 1);
    g.fillStyle(0x2b4b25, 1);
    g.fillRect(7, 22, 6, 2);
    g.fillRect(19, 22, 6, 2);
    g.generateTexture('zombieWalker', 32, 26);
    g.destroy();
  }

  ensureVampireTexture() {
    if (this.textures.exists('vampireWalker')) {
      return;
    }
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x726093, 1);
    g.fillRect(6, 8, 20, 14);
    g.fillStyle(0x4f396e, 1);
    g.fillRect(8, 4, 16, 4);
    g.fillStyle(0xf1d7d7, 1);
    g.fillRect(10, 12, 4, 4);
    g.fillRect(18, 12, 4, 4);
    g.fillStyle(0x220f2e, 1);
    g.fillRect(11, 13, 1, 1);
    g.fillRect(19, 13, 1, 1);
    g.fillStyle(0xffffff, 1);
    g.fillRect(13, 16, 1, 2);
    g.fillRect(18, 16, 1, 2);
    g.fillStyle(0x3f284f, 1);
    g.fillRect(7, 22, 6, 2);
    g.fillRect(19, 22, 6, 2);
    g.generateTexture('vampireWalker', 32, 26);
    g.destroy();
  }

  ensureAshTexture() {
    if (this.textures.exists('vampireAsh')) {
      return;
    }
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xb9b9b9, 1);
    g.fillRect(8, 16, 10, 4);
    g.fillStyle(0x8d8d8d, 1);
    g.fillRect(10, 13, 6, 3);
    g.fillStyle(0x6f6f6f, 1);
    g.fillRect(11, 11, 4, 2);
    g.generateTexture('vampireAsh', 24, 24);
    g.destroy();
  }

  createAstronautHelmet() {
    this.helmetGraphics = this.add.graphics().setDepth(9);
  }

  createJetpackVisuals() {
    this.jetpackPack = this.add.graphics().setDepth(10);
    this.jetpackFlames = this.add.graphics().setDepth(9);
  }

  syncKittenBodyToFeet() {
    if (!this.kitten || !this.kitten.body) {
      return;
    }

    const body = this.kitten.body;
    body.setSize(CHARACTER_HITBOX.width, CHARACTER_HITBOX.height, false);
    body.setOffset(CHARACTER_HITBOX.offsetX, CHARACTER_HITBOX.offsetY);

    const groundTop = this.getGroundSurfaceY();
    const nearGround = (body.blocked.down || body.touching.down) && body.velocity.y >= 0;
    if (nearGround) {
      body.y = groundTop - body.height;
    }
  }

  syncEnemyBody(enemy) {
    if (!enemy || !enemy.body) {
      return;
    }
    const enemyScale = Phaser.Math.Clamp(enemy.growthScale || 1, 1, 2.6);
    const bodyW = Phaser.Math.Clamp(Math.round(CHARACTER_HITBOX.width * enemyScale), 14, 42);
    const bodyH = Phaser.Math.Clamp(Math.round(CHARACTER_HITBOX.height * enemyScale), 10, 32);
    enemy.body.setSize(bodyW, bodyH, false);
    enemy.body.setOffset(
      CHARACTER_HITBOX.offsetX + Math.round((CHARACTER_HITBOX.width - bodyW) * 0.5),
      CHARACTER_HITBOX.offsetY + Math.round(CHARACTER_HITBOX.height - bodyH),
    );
    const groundTop = this.getGroundSurfaceY();
    if (enemy.body.bottom >= groundTop - 24 || enemy.body.velocity.y >= 0) {
      enemy.body.y = groundTop - enemy.body.height;
      enemy.y = groundTop;
      enemy.body.velocity.y = 0;
    }
  }

  updateAstronautHelmet() {
    if (!this.helmetGraphics || !this.kitten) {
      return;
    }
    // Astronaut helmet only appears on the moon map
    if (this.currentMapKey !== 'moon') {
      this.helmetGraphics.clear();
      return;
    }
    const x = this.kitten.x;
    const y = this.kitten.y - 14 * this.sizeMultiplier;
    const rX = 12 * this.sizeMultiplier;
    const rY = 10 * this.sizeMultiplier;

    this.helmetGraphics.clear();
    this.helmetGraphics.fillStyle(0xd9ecff, 0.2);
    this.helmetGraphics.fillEllipse(x, y, rX * 2.1, rY * 2.1);
    this.helmetGraphics.lineStyle(2, 0xeaf6ff, 0.9);
    this.helmetGraphics.strokeEllipse(x, y, rX * 2.1, rY * 2.1);
    this.helmetGraphics.fillStyle(0xeaf6ff, 0.35);
    this.helmetGraphics.fillEllipse(x - 4 * this.sizeMultiplier, y - 4 * this.sizeMultiplier, 5 * this.sizeMultiplier, 3 * this.sizeMultiplier);
  }

  drawJetpackVisual(active) {
    if (!this.jetpackPack || !this.jetpackFlames || !this.kitten || this.currentMapKey !== 'moon') {
      if (this.jetpackPack) {
        this.jetpackPack.clear();
      }
      if (this.jetpackFlames) {
        this.jetpackFlames.clear();
      }
      return;
    }

    const dir = this.facingDir || 1;
    const scale = this.sizeMultiplier;
    const packX = this.kitten.x - dir * 8 * scale;
    const packY = this.kitten.y - 16 * scale;
    const packW = 10 * scale;
    const packH = 14 * scale;

    this.jetpackPack.clear();
    this.jetpackPack.fillStyle(0x5d6573, 0.96);
    this.jetpackPack.fillRoundedRect(packX - packW * 0.5, packY - packH * 0.5, packW, packH, 2 * scale);
    this.jetpackPack.fillStyle(0x939db0, 1);
    this.jetpackPack.fillRect(packX - 2 * scale, packY - 3 * scale, 4 * scale, 5 * scale);
    this.jetpackPack.fillStyle(0x2d3340, 0.9);
    this.jetpackPack.fillRect(packX - (dir < 0 ? 1.5 : 4.5) * scale, packY - 4 * scale, 3 * scale, 8 * scale);

    this.jetpackFlames.clear();
    if (!active) {
      return;
    }

    const flicker = 0.75 + Math.sin(this.time.now * 0.03) * 0.25;
    const flameLen = 10 * scale * flicker;
    const leftNozzleX = packX - 2 * scale;
    const rightNozzleX = packX + 2 * scale;
    const nozzleY = packY + 7 * scale;

    this.jetpackFlames.fillStyle(0xffb347, 0.95);
    this.jetpackFlames.fillTriangle(leftNozzleX - 1.5 * scale, nozzleY, leftNozzleX + 1.5 * scale, nozzleY, leftNozzleX, nozzleY + flameLen);
    this.jetpackFlames.fillTriangle(rightNozzleX - 1.5 * scale, nozzleY, rightNozzleX + 1.5 * scale, nozzleY, rightNozzleX, nozzleY + flameLen);
    this.jetpackFlames.fillStyle(0xfff0be, 0.85);
    this.jetpackFlames.fillTriangle(leftNozzleX - scale, nozzleY + scale, leftNozzleX + scale, nozzleY + scale, leftNozzleX, nozzleY + flameLen * 0.65);
    this.jetpackFlames.fillTriangle(rightNozzleX - scale, nozzleY + scale, rightNozzleX + scale, nozzleY + scale, rightNozzleX, nozzleY + flameLen * 0.65);
  }

  burnVampireToAsh(enemy) {
    if (!enemy.active || !enemy.alive) {
      return;
    }
    enemy.alive = false;
    if (enemy.shadow) {
      enemy.shadow.destroy();
      enemy.shadow = null;
    }
    if (enemy.umbrella) {
      enemy.umbrella.destroy();
      enemy.umbrella = null;
    }
    const ash = this.add.sprite(enemy.x, enemy.y + 5, 'vampireAsh').setDepth(7);
    this.tweens.add({
      targets: ash,
      alpha: 0,
      y: enemy.y + 12,
      duration: 900,
      onComplete: () => ash.destroy(),
    });
    enemy.disableBody(true, true);
    this.showCatchPopup(this.kitten.x, this.kitten.y - 34, 'VAMPIRE ASH!');
  }

  ensureBatteryTexture() {
    if (this.textures.exists('batteryDrop')) {
      return;
    }

    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Parachute canopy
    g.fillStyle(0xf3f3f3, 1);
    g.fillRect(2, 0, 20, 4);
    g.fillStyle(0xd6d6d6, 1);
    g.fillRect(2, 4, 20, 2);
    // Strings
    g.lineStyle(1, 0xe8e8e8, 1);
    g.beginPath();
    g.moveTo(4, 6);
    g.lineTo(9, 12);
    g.moveTo(20, 6);
    g.lineTo(15, 12);
    g.strokePath();
    // Battery body
    g.fillStyle(0x5c5c5c, 1);
    g.fillRect(8, 12, 8, 11);
    g.fillStyle(0x9be86f, 1);
    g.fillRect(9, 14, 6, 7);
    g.fillStyle(0x8a8a8a, 1);
    g.fillRect(10, 10, 4, 2);
    g.generateTexture('batteryDrop', 24, 24);
    g.destroy();
  }

  ensureFuelTexture() {
    if (this.textures.exists('jetFuelDrop')) {
      return;
    }

    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Small capsule with moon-orange fuel core
    g.fillStyle(0x494949, 1);
    g.fillRoundedRect(6, 6, 12, 16, 3);
    g.fillStyle(0xffbd59, 1);
    g.fillRoundedRect(8, 9, 8, 10, 2);
    g.fillStyle(0x2b2b2b, 1);
    g.fillRect(10, 3, 4, 3);
    g.fillStyle(0xe5e5e5, 0.9);
    g.fillRect(9, 11, 1, 6);
    g.generateTexture('jetFuelDrop', 24, 24);
    g.destroy();
  }

  getGroundSurfaceY() {
    if (this.ground && this.ground.body) {
      return this.ground.body.top;
    }
    return this.ground.y - this.ground.displayHeight * 0.5;
  }

  attachDropShadow(item, baseWidth, baseHeight, alpha = 0.15) {
    if (!item) {
      return;
    }
    if (!item.shadow || !item.shadow.active) {
      item.shadow = this.add.ellipse(item.x, this.getGroundSurfaceY(), baseWidth, baseHeight, 0x000000, alpha).setDepth(6);
    }
    item.shadowBaseWidth = baseWidth;
    item.shadowBaseHeight = baseHeight;
    item.shadow.setVisible(true);
  }

  destroyDropShadow(item) {
    if (item && item.shadow) {
      item.shadow.destroy();
      item.shadow = null;
    }
  }

  update(_time, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.saveCharacterState();
      this.scene.start('TitleScene');
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.lightToggleKey)) {
      this.flashlightOn = !this.flashlightOn;
      this.updateHud();
    }

    // Snapshot velocity before physics step so the stomp callback has reliable data.
    if (Phaser.Input.Keyboard.JustDown(this.fullscreenKey)) {
      this.toggleFullscreen();
    }

    // Snapshot velocity before physics step so the stomp callback has reliable data.
    this.kittenPrevVelY = this.kitten.body ? this.kitten.body.velocity.y : 0;

    if (this.zombieHitCooldown > 0) {
      this.zombieHitCooldown -= delta;
    }

    const beamUsingBattery = this.flashlightOn && this.flashlightBattery > 0
      && (this.currentThemeKey === 'night' || this.currentThemeKey === 'day');
    if (beamUsingBattery) {
      this.flashlightBattery = Math.max(0, this.flashlightBattery - (this.flashlightDrainPerSec * delta) / 1000);
      this.updateHud();
    }

    const jetpackActive = this.currentMapKey === 'moon' && this.jetpackKey.isDown && this.jetpackFuel > 0;

    if (jetpackActive) {
      this.jetpackFuel = Math.max(0, this.jetpackFuel - (this.jetpackFuelDrainPerSec * delta) / 1000);
      this.updateHud();
    }

    this.updateChefHeli();
    if (this.pendingBonusFlyovers > 0 && !this.airplaneActive) {
      this.pendingBonusFlyovers -= 1;
      this.launchAirplaneBigPizza();
      this.showCatchPopup(this.kitten.x, this.kitten.y - 64 * this.sizeMultiplier, 'BONUS FLYOVER!');
    }
    this.updateKittenMovement(delta);
    if (this.moonWrapEnabled) {
      if (this.kitten.x < -8) {
        this.kitten.x = WORLD_WIDTH + 8;
      } else if (this.kitten.x > WORLD_WIDTH + 8) {
        this.kitten.x = -8;
      }
    }
    this.cleanupMissedPizza();
    this.cleanupZombies();
    this.updateFlashlightPosition();
    this.updateZombieLightEffect(delta);
    this.updateZombieGroundingAndAccessories();
    this.updateShadows();
    this.drawJetpackVisual(jetpackActive);
    this.updateAstronautHelmet();
  }

  updateShadows() {
    if (this.kittenShadow?.active) {
      this.kittenShadow.x = this.kitten.x;
      this.kittenShadow.y = this.getGroundSurfaceY() + 1;
      this.kittenShadow.width = 42 * Phaser.Math.Clamp(1 + this.sizeMultiplier * 0.2, 1, 1.6);
    }
    if (this.heliShadow?.active) {
      this.heliShadow.x = this.chefHeli.x;
      this.heliShadow.y = this.getGroundSurfaceY() + 1;
    }
    if (this.rocketShadow?.active) {
      this.rocketShadow.setVisible(this.pizzaPlane.visible);
      this.rocketShadow.x = this.pizzaPlane.x;
      this.rocketShadow.y = this.getGroundSurfaceY() + 1;
    }
    const enemies = this.zombieGroup.getChildren();
    for (let i = 0; i < enemies.length; i += 1) {
      const enemy = enemies[i];
      if (enemy.shadow) {
        enemy.shadow.setVisible(enemy.active);
        enemy.shadow.x = enemy.x;
        enemy.shadow.y = this.getGroundSurfaceY() + 1;
        enemy.shadow.width = 36 * Phaser.Math.Clamp(enemy.growthScale || 1, 1, 2.2);
      }
    }

    const pizzaItems = this.pizzaGroup.getChildren();
    for (let i = 0; i < pizzaItems.length; i += 1) {
      this.updateDropShadow(pizzaItems[i]);
    }
    const batteryItems = this.batteryGroup.getChildren();
    for (let i = 0; i < batteryItems.length; i += 1) {
      this.updateDropShadow(batteryItems[i]);
    }
    const fuelItems = this.fuelGroup.getChildren();
    for (let i = 0; i < fuelItems.length; i += 1) {
      this.updateDropShadow(fuelItems[i]);
    }
  }

  updateDropShadow(item) {
    if (!item || !item.shadow) {
      return;
    }

    if (!item.active || !item.visible || !item.body || !item.body.enable) {
      item.shadow.setVisible(false);
      return;
    }

    const groundY = this.getGroundSurfaceY();
    const altitude = Phaser.Math.Clamp(groundY - item.y, 0, 540);
    const shrink = Phaser.Math.Clamp(1 - altitude / 540, 0.22, 1);
    const baseW = item.shadowBaseWidth || 28;
    const baseH = item.shadowBaseHeight || 10;

    item.shadow.setVisible(true);
    item.shadow.x = item.x;
    item.shadow.y = groundY + 1;
    item.shadow.width = baseW * shrink;
    item.shadow.height = baseH;
  }

  updateChefHeli() {
    const t = this.time.now * 0.001;
    const mode = this.getCurrentMode();
    const baseSpeed = (130 + this.foodCaught * 0.9) * mode.heliSpeedScale;
    const swing = Math.sin(t * 0.8) * 260;
    const cruise = Math.sin(t * 0.22) * baseSpeed;
    this.chefHeli.x = Phaser.Math.Clamp(WORLD_WIDTH / 2 + swing + cruise, 70, WORLD_WIDTH - 70);
    this.chefHeli.y = 82 + Math.sin(t * 4.5) * 2;
  }

  updateKittenMovement(delta) {
    const leftDown = this.cursors.left.isDown || this.wasd.A.isDown;
    const rightDown = this.cursors.right.isDown || this.wasd.D.isDown;
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.wasd.W);
    const accel = 1450;

    if (jumpPressed && (this.kitten.body.blocked.down || this.kitten.body.touching.down)) {
      this.kitten.setVelocityY(this.jumpVelocity);
    }

    if (this.currentMapKey === 'moon' && this.jetpackKey.isDown && this.jetpackFuel > 0) {
      const lift = this.jetpackThrustPerSec * (delta / 1000);
      this.kitten.setVelocityY(Math.max(this.jetpackMaxLiftSpeed, this.kitten.body.velocity.y - lift));
    }

    if (leftDown && !rightDown) {
      this.kitten.setAccelerationX(-accel);
      this.kitten.setFlipX(false);
      this.lastMoveDir = -1;
      this.facingDir = -1;
      if (this.eatCooldown <= 0) {
        this.kitten.setTexture(this.kittenSkin.run);
      }
    } else if (rightDown && !leftDown) {
      this.kitten.setAccelerationX(accel);
      this.kitten.setFlipX(true);
      this.lastMoveDir = 1;
      this.facingDir = 1;
      if (this.eatCooldown <= 0) {
        this.kitten.setTexture(this.kittenSkin.run);
      }
    } else {
      this.kitten.setAccelerationX(0);
      if (this.eatCooldown <= 0) {
        this.kitten.setTexture(this.kittenSkin.idle);
      }
    }

    if (this.eatCooldown > 0) {
      this.eatCooldown -= delta;
      if (this.eatCooldown <= 0) {
        this.kitten.setTexture(this.kittenSkin.idle);
      }
    }

    if (this.kitten.body.blocked.down || this.kitten.body.touching.down) {
      const body = this.kitten.body;
      const groundTop = this.getGroundSurfaceY();
      if (body.velocity.y >= 0 && Math.abs(body.bottom - groundTop) > 1) {
        body.y = groundTop - body.height;
      }
    }
  }

  cleanupMissedPizza() {
    const children = this.pizzaGroup.getChildren();
    for (let i = 0; i < children.length; i += 1) {
      const food = children[i];
      if (food.active && food.y > WORLD_HEIGHT + 40) {
        this.destroyDropShadow(food);
        food.disableBody(true, true);
      }
    }
  }

  cleanupZombies() {
    const children = this.zombieGroup.getChildren();
    for (let i = 0; i < children.length; i += 1) {
      const zombie = children[i];
      if (zombie.active && (zombie.x < -60 || zombie.x > WORLD_WIDTH + 60)) {
        if (zombie.shadow) {
          zombie.shadow.destroy();
          zombie.shadow = null;
        }
        if (zombie.umbrella) {
          zombie.umbrella.destroy();
          zombie.umbrella = null;
        }
        zombie.disableBody(true, true);
      }
    }
  }

  updateFlashlightPosition() {
    const nightBeam = this.currentThemeKey === 'night' && this.flashlightOn && this.flashlightBattery > 0;
    const dayLaser = this.currentThemeKey === 'day' && this.flashlightOn && this.flashlightBattery > 0;
    const lightEnabled = nightBeam || dayLaser;
    if (!lightEnabled) {
      this.flashlightCone.clear();
      this.flashlightHandle.clear();
      return;
    }

    const dir = this.kitten.body.velocity.x < -20 ? -1 : this.kitten.body.velocity.x > 20 ? 1 : this.lastMoveDir;
    // Static hand anchor near the cat's middle; does not scale with cat growth.
    const handX = this.kitten.x + dir * 10;
    const handY = this.kitten.y - 14;
    const length = 240;
    const halfWidth = 80;
    const farX = handX + dir * length;

    this.flashlightTip.x = handX;
    this.flashlightTip.y = handY;
    this.flashlightDir = dir;
    this.flashlightLength = length;
    this.flashlightHalfWidth = halfWidth;

    // Cone beam from hand.
    this.flashlightCone.clear();
    this.flashlightCone.fillStyle(dayLaser ? 0xff3b3b : 0xfff1b0, dayLaser ? 0.17 : 0.13);
    this.flashlightCone.fillTriangle(handX, handY, farX, handY - halfWidth, farX, handY + halfWidth);
    this.flashlightCone.fillStyle(dayLaser ? 0xff8a8a : 0xfff7d1, dayLaser ? 0.26 : 0.21);
    this.flashlightCone.fillTriangle(
      handX,
      handY,
      handX + dir * (length * 0.65),
      handY - halfWidth * 0.4,
      handX + dir * (length * 0.65),
      handY + halfWidth * 0.4,
    );

    // Draw small gray flashlight handle at hand position.
    const h = this.flashlightHandle;
    h.clear();
    // Body of flashlight (barrel pointing in direction of movement).
    h.fillStyle(dayLaser ? 0x661a1a : 0x888888, 1);
    h.fillRect(handX - 2, handY - 2, dir * 10, 4);
    // Lens end (slightly wider circle at tip).
    h.fillStyle(dayLaser ? 0xffa7a7 : 0xddddcc, 1);
    h.fillCircle(handX + dir * 8, handY, 2.5);
    // Grip (short perpendicular bar).
    h.fillStyle(dayLaser ? 0x4a1111 : 0x666666, 1);
    h.fillRect(handX - 1, handY, 2, 5);
  }

  updateZombieLightEffect(delta) {
    const zombies = this.zombieGroup.getChildren();
    const nightBeam = this.currentThemeKey === 'night' && this.flashlightOn && this.flashlightBattery > 0;
    const dayLaser = this.currentThemeKey === 'day' && this.flashlightOn && this.flashlightBattery > 0;
    const lightActive = nightBeam || dayLaser;

    for (let i = 0; i < zombies.length; i += 1) {
      const zombie = zombies[i];
      if (!zombie.active || !zombie.alive) {
        continue;
      }

      if (!lightActive) {
        if (zombie.litStopped) {
          zombie.litStopped = false;
          zombie.clearTint();
          if (zombie.enemyType === 'vampire') {
            zombie.setTint(0xd8c3ff);
          }
          zombie.setVelocityX(zombie.moveDir * zombie.moveSpeed);
        }
        zombie.vampireLightMs = 0;
        zombie.laserBurnMs = 0;
        continue;
      }

      const dx = (zombie.x - this.flashlightTip.x) * this.flashlightDir;
      const dy = Math.abs(zombie.y - this.flashlightTip.y);
      const inFront = dx > 0 && dx <= this.flashlightLength;
      const coneHalfAtDepth = (dx / this.flashlightLength) * this.flashlightHalfWidth + 10;
      const lit = inFront && dy <= coneHalfAtDepth;

      if (lit) {
        if (dayLaser) {
          zombie.laserBurnMs = (zombie.laserBurnMs || 0) + delta;
          if (zombie.laserBurnMs >= 1200) {
            this.burnVampireToAsh(zombie);
            continue;
          }
        } else if (zombie.enemyType === 'vampire') {
          zombie.vampireLightMs = (zombie.vampireLightMs || 0) + delta;
          if (zombie.vampireLightMs >= 3000) {
            this.burnVampireToAsh(zombie);
            continue;
          }
        }
        if (!zombie.litStopped) {
          zombie.litStopped = true;
          zombie.setVelocityX(0);
          zombie.setTint(dayLaser ? 0xff5d5d : zombie.enemyType === 'vampire' ? 0xffb38f : 0xe9f6ff);
        }
      } else if (zombie.litStopped) {
        zombie.litStopped = false;
        zombie.clearTint();
        if (!dayLaser && zombie.enemyType === 'vampire') {
          zombie.setTint(0xd8c3ff);
          zombie.vampireLightMs = Math.max(0, (zombie.vampireLightMs || 0) - delta * 1.2);
        }
        zombie.laserBurnMs = Math.max(0, (zombie.laserBurnMs || 0) - delta * 1.3);
        zombie.setVelocityX(zombie.moveDir * zombie.moveSpeed);
      } else if (!dayLaser && zombie.enemyType === 'vampire' && zombie.vampireLightMs > 0) {
        zombie.vampireLightMs = Math.max(0, zombie.vampireLightMs - delta * 1.2);
      } else if (dayLaser && zombie.laserBurnMs > 0) {
        zombie.laserBurnMs = Math.max(0, zombie.laserBurnMs - delta * 1.3);
      }
    }
  }

  updateZombieGroundingAndAccessories() {
    const zombies = this.zombieGroup.getChildren();
    const dayMode = this.currentThemeKey === 'day';
    const groundTop = this.getGroundSurfaceY();

    for (let i = 0; i < zombies.length; i += 1) {
      const zombie = zombies[i];
      if (!zombie?.active || !zombie.body) {
        if (zombie?.umbrella) {
          zombie.umbrella.destroy();
          zombie.umbrella = null;
        }
        continue;
      }

      // Keep enemies planted on ground so they cannot drift or sink below the floor.
      zombie.body.y = groundTop - zombie.body.height;
      zombie.body.velocity.y = 0;
      zombie.y = groundTop;

      if (dayMode && zombie.enemyType === 'vampire') {
        if (!zombie.umbrella || !zombie.umbrella.active) {
          zombie.umbrella = this.add.graphics().setDepth(8);
        }
        const umb = zombie.umbrella;
        const x = zombie.x;
        const y = zombie.y - 18 * (zombie.growthScale || 1);
        const scale = Phaser.Math.Clamp(zombie.growthScale || 1, 1, 2.6);
        umb.clear();
        umb.fillStyle(0x1f1f1f, 0.95);
        umb.fillEllipse(x, y, 20 * scale, 8 * scale);
        umb.fillStyle(0x2f2f2f, 1);
        umb.fillRect(x - scale, y - 1, 2 * scale, 12 * scale);
      } else if (zombie.umbrella) {
        zombie.umbrella.destroy();
        zombie.umbrella = null;
      }
    }
  }
}
