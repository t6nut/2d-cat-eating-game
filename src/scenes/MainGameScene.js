const WORLD_WIDTH = 1280;
const WORLD_HEIGHT = 720;
const SAVE_PREFIX = 'cat_game_save_';

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
    this.runMode = 'new';
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
    this.flashlightOn = true;
    this.facingDir = 1;
    this.jumpVelocity = -230;
    this.kittenExtraGravity = 300;
    this.moonWrapEnabled = false;
  }

  init(data) {
    this.currentCharacterKey = data.character ?? 'orange';
    this.currentModeKey = data.mode ?? 'medium';
    this.currentThemeKey = data.theme ?? 'day';
    this.currentMapKey = data.map ?? 'city';
    this.currentEnemyType = data.enemyType ?? (data.zombies ? 'zombies' : 'off');
    this.zombiesEnabled = !!data.zombies;
    this.runMode = data.runMode ?? 'new';
    this.loadedState = this.runMode === 'continue' ? this.loadCharacterSave(this.currentCharacterKey) : null;

    if (this.runMode === 'continue' && this.loadedState) {
      this.currentModeKey = this.loadedState.mode ?? this.currentModeKey;
      this.currentThemeKey = this.loadedState.theme ?? this.currentThemeKey;
      this.currentMapKey = this.loadedState.map ?? this.currentMapKey;
      this.currentEnemyType = this.loadedState.enemyType ?? this.currentEnemyType;
      this.zombiesEnabled = !!this.loadedState.zombies;
      this.foodPoints = this.loadedState.foodPoints ?? 0;
      this.foodCaught = this.loadedState.foodCaught ?? 0;
      this.sizeMultiplier = this.loadedState.sizeMultiplier ?? 1;
    } else if (this.runMode === 'new') {
      this.clearCharacterSave(this.currentCharacterKey);
      this.foodPoints = 0;
      this.foodCaught = 0;
      this.sizeMultiplier = 1;
    }

    this.zombiesEnabled = this.currentEnemyType !== 'off';

    if (this.currentMapKey === 'moon') {
      this.jumpVelocity = -460;
      this.kittenExtraGravity = 0;
      this.moonWrapEnabled = true;
    } else {
      this.jumpVelocity = -230;
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

    this.physics.add.overlap(this.kitten, this.pizzaGroup, this.handlePizzaCaught, null, this);
    this.physics.add.collider(this.pizzaGroup, this.ground, this.handleFoodHitGround, null, this);
    this.physics.add.collider(this.zombieGroup, this.ground);
    this.physics.add.collider(this.batteryGroup, this.ground, this.handleBatteryHitGround, null, this);
    this.physics.add.collider(this.kitten, this.zombieGroup, this.handleZombieCollision, null, this);
    this.physics.add.overlap(this.zombieGroup, this.pizzaGroup, this.handleZombieEatFood, null, this);
    this.physics.add.overlap(this.kitten, this.batteryGroup, this.handleBatteryPickup, null, this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.flashToggleKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  this.fullscreenKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);

    this.input.keyboard.on('keydown', this.resumeAudio, this);
    this.input.on('pointerdown', this.resumeAudio, this);

    this.createHud();
    this.createFlashlight();
    this.ensureZombieTexture();
    this.ensureVampireTexture();
    this.ensureAshTexture();
    this.ensureBatteryTexture();
    this.applyTheme(this.currentThemeKey);

    this.kittenShadow = this.add.ellipse(this.kitten.x, this.ground.y - 2, 42, 14, 0x000000, 0.24).setDepth(6);
    this.heliShadow = this.add.ellipse(this.chefHeli.x, this.ground.y - 2, 110, 26, 0x000000, 0.18).setDepth(4);
    this.rocketShadow = this.add.ellipse(this.pizzaPlane.x, this.ground.y - 2, 88, 20, 0x000000, 0.16).setDepth(4).setVisible(false);
    this.createAstronautHelmet();

    if (this.loadedState) {
      this.kitten.setScale(this.sizeMultiplier);
      this.kitten.body.setSize(16 * this.sizeMultiplier, 12 * this.sizeMultiplier, true);
    }

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
    this.bgSky.setFillStyle(map.skyColor, 1);
    this.bgGround.setFillStyle(map.groundColor, 1);

    for (let i = 0; i < this.backgroundElements.length; i += 1) {
      this.backgroundElements[i].destroy();
    }
    this.backgroundElements = [];

    if (mapKey === 'city') {
      for (let i = 0; i < 12; i += 1) {
        const w = Phaser.Math.Between(60, 120);
        const h = Phaser.Math.Between(70, 180);
        const x = 50 + i * 110;
        const y = WORLD_HEIGHT - 120 - h / 2;
        const b = this.add.rectangle(x, y, w, h, 0x2e3c52, 0.55).setDepth(2);
        this.backgroundElements.push(b);
      }
    } else if (mapKey === 'desert') {
      const dune1 = this.add.ellipse(230, WORLD_HEIGHT - 80, 420, 110, 0xe7bf7e, 0.55).setDepth(2);
      const dune2 = this.add.ellipse(640, WORLD_HEIGHT - 65, 560, 130, 0xd6aa68, 0.5).setDepth(2);
      const sun = this.add.circle(830, 86, 34, 0xfff1a0, 0.9).setDepth(2);
      this.backgroundElements.push(dune1, dune2, sun);
    } else if (mapKey === 'beach') {
      const sea = this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT - 130, WORLD_WIDTH, 86, 0x4fc4dc, 0.58).setDepth(2);
      const wave1 = this.add.ellipse(260, WORLD_HEIGHT - 142, 340, 28, 0xbef6ff, 0.5).setDepth(2);
      const wave2 = this.add.ellipse(700, WORLD_HEIGHT - 122, 420, 30, 0xbef6ff, 0.45).setDepth(2);
      this.backgroundElements.push(sea, wave1, wave2);
    } else if (mapKey === 'moon') {
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
    } else if (this.currentMapKey !== 'moon') {
      for (let i = 0; i < 11; i += 1) {
        const cloudX = 70 + i * 115;
        const cloudY = 65 + (i % 2) * 28;
        const cloud = this.add.ellipse(cloudX, cloudY, 86, 34, 0xdff8ff, 0.65).setDepth(2);
        this.backgroundElements.push(cloud);
      }
    }

    const nightEnabled = themeKey === 'night';
    this.flashlightCone.setVisible(nightEnabled);
    this.flashlightHandle.setVisible(nightEnabled);
    if (!nightEnabled) {
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

    this.add
      .text(WORLD_WIDTH - 20, 20, 'R: Menu   F: Fullscreen', {
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
    const mode = this.getCurrentMode();
    if (Math.random() < mode.pizzaChance && !this.airplaneActive) {
      this.launchAirplaneBigPizza();
      return;
    }
    this.spawnSliceFromHelicopter();
  }

  spawnSliceFromHelicopter() {
    const mode = this.getCurrentMode();
    const variance = Phaser.Math.Clamp(34 + this.foodCaught * 0.7, 34, 140);
    const x = Phaser.Math.Clamp(this.chefHeli.x + Phaser.Math.Between(-variance, variance), 24, WORLD_WIDTH - 24);

    const food = this.pizzaGroup.get(x, this.chefHeli.y + 34, 'pizza');
    if (!food) {
      return;
    }

    food.foodValue = 1;
    food.caught = false;
    food.onGround = false;
    food.groundTimer = null;
    food.setTexture('pizza');
    food.setActive(true);
    food.setVisible(true);
    food.body.enable = true;
    food.body.setAllowGravity(true);
    food.setScale(mode.foodScale);
    food.setVelocity(Phaser.Math.Between(-30, 30), Phaser.Math.Between(mode.minFallVelocity, mode.maxFallVelocity));
    food.setGravityY(600 * mode.gravityScale);
    food.setAngularVelocity(Phaser.Math.Between(-65, 65));
    food.setDepth(7);
  }

  launchAirplaneBigPizza() {
    const mode = this.getCurrentMode();
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
      food.caught = false;
      food.onGround = false;
      food.groundTimer = null;
      food.setTexture('pizzaWhole');
      food.setActive(true);
      food.setVisible(true);
      food.body.enable = true;
      food.body.setAllowGravity(true);
      food.setScale(mode.foodScale * 1.18);
      food.setVelocity(Phaser.Math.Between(-20, 20), Phaser.Math.Between(mode.minFallVelocity - 10, mode.maxFallVelocity - 16));
      food.setGravityY(600 * mode.gravityScale * 0.9);
      food.setAngularVelocity(Phaser.Math.Between(-55, 55));
      food.setDepth(7);

      const batteryDropX = this.pizzaPlane.x + (fromLeft ? -85 : 85);
      this.spawnBatteryDrop(batteryDropX, this.pizzaPlane.y - 22, fromLeft ? -1 : 1);
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
  }

  spawnZombie() {
    if (!this.zombiesEnabled) {
      return;
    }
    const mode = this.getCurrentMode();
    const isVampire = this.currentEnemyType === 'vampires';
    const fromLeft = Math.random() > 0.5;
    const startX = fromLeft ? -24 : WORLD_WIDTH + 24;
    const speed = isVampire ? mode.zombieSpeed + 12 : mode.zombieSpeed;
    const velocityX = fromLeft ? speed : -speed;
    const textureKey = isVampire ? 'vampireWalker' : 'zombieWalker';
    const zombie = this.zombieGroup.get(startX, WORLD_HEIGHT - 66, textureKey);
    if (!zombie) {
      return;
    }
    if (!zombie.shadow || !zombie.shadow.active) {
      zombie.shadow = this.add.ellipse(startX, this.ground.y - 2, 36, 12, 0x000000, 0.2).setDepth(6);
    }
    zombie.setActive(true);
    zombie.setVisible(true);
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
    food.foodValue = Math.max(0.5, (food.foodValue || 1) * 0.5);
    food.setAngularVelocity(0);
    // Some collision paths can yield a body without setVelocityX; damp X directly.
    if (food.body && food.body.velocity) {
      food.body.velocity.x *= 0.2;
      food.body.velocity.y = 0;
    }

    food.groundTimer = this.time.delayedCall(3000, () => {
      if (food.active && !food.caught) {
        food.disableBody(true, true);
      }
    });
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
        battery.disableBody(true, true);
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
    battery.disableBody(true, true);
    this.flashlightBattery = this.flashlightBatteryMax;
    this.updateHud();
    this.showCatchPopup(this.kitten.x, this.kitten.y - 34, 'BATTERY +100%');
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

    const value = food.foodValue || 1;
    food.disableBody(true, true);

    zombie.growthScale = Phaser.Math.Clamp((zombie.growthScale || 1) + 0.08 * value, 1, 2.6);
    zombie.setScale(zombie.growthScale);
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
    food.disableBody(true, true);

    this.foodCaught += 1;
    this.foodPoints += growthValue;
    this.sizeMultiplier = this.getSizeMultiplier(this.foodPoints);

    this.kitten.setScale(this.sizeMultiplier);
    this.kitten.body.setSize(16 * this.sizeMultiplier, 12 * this.sizeMultiplier, true);
    this.eatCooldown = 160;
    this.kitten.setTexture(this.kittenSkin.eat);

    this.playEatSound(growthValue);
    this.playEatingAnimation();
    this.updateHud();

    const popupText = growthValue > 1 ? '+WHOLE PIZZA x5' : '+slice';
    this.showCatchPopup(this.kitten.x, this.kitten.y - 45 * this.sizeMultiplier, popupText);

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
      zombie.disableBody(true, true);
      kitten.setVelocityY(-340);
      this.showCatchPopup(kitten.x, kitten.y - 38, 'CHOMP!');
      this.playZombieStompSound();
      this.playEatSound(2);
      this.foodPoints += 2;
      this.foodCaught += 1;
      this.sizeMultiplier = this.getSizeMultiplier(this.foodPoints);
      this.kitten.setScale(this.sizeMultiplier);
      this.kitten.body.setSize(16 * this.sizeMultiplier, 12 * this.sizeMultiplier, true);
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
    this.sizeMultiplier = this.getSizeMultiplier(this.foodPoints);
    this.kitten.setScale(this.sizeMultiplier);
    kitten.setVelocityX(kitten.x < zombie.x ? -220 : 220);
    this.updateHud();
    this.showCatchPopup(kitten.x, kitten.y - 45, 'OUCH!');

    // Zombie grows a little from hitting the cat.
    zombie.growthScale = Phaser.Math.Clamp((zombie.growthScale || 1) + 0.12, 1, 2.6);
    zombie.setScale(zombie.growthScale);

    this.saveCharacterState();
  }

  getSizeMultiplier(foodPoints) {
    const mode = this.getCurrentMode();
    const multiplier = 1 + 0.18 * Math.sqrt(foodPoints * mode.growthMultiplier);
    return Phaser.Math.Clamp(multiplier, 1, 3.5);
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

  getSaveKey(characterKey) {
    return `${SAVE_PREFIX}${characterKey}`;
  }

  loadCharacterSave(characterKey) {
    try {
      const raw = localStorage.getItem(this.getSaveKey(characterKey));
      return raw ? JSON.parse(raw) : null;
    } catch (_err) {
      return null;
    }
  }

  saveCharacterState() {
    const payload = {
      character: this.currentCharacterKey,
      mode: this.currentModeKey,
      theme: this.currentThemeKey,
      map: this.currentMapKey,
      zombies: this.zombiesEnabled,
      enemyType: this.currentEnemyType,
      foodPoints: this.foodPoints,
      foodCaught: this.foodCaught,
      sizeMultiplier: this.sizeMultiplier,
      updatedAt: Date.now(),
    };

    try {
      localStorage.setItem(this.getSaveKey(this.currentCharacterKey), JSON.stringify(payload));
    } catch (_err) {
      // ignore quota/storage issues in prototype
    }
  }

  clearCharacterSave(characterKey) {
    try {
      localStorage.removeItem(this.getSaveKey(characterKey));
    } catch (_err) {
      // ignore storage availability issues
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
    const y = this.kitten.y - 22 * this.sizeMultiplier;
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

  burnVampireToAsh(enemy) {
    if (!enemy.active || !enemy.alive) {
      return;
    }
    enemy.alive = false;
    if (enemy.shadow) {
      enemy.shadow.destroy();
      enemy.shadow = null;
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

  update(_time, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.saveCharacterState();
      this.scene.start('TitleScene');
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.flashToggleKey)) {
      this.flashlightOn = !this.flashlightOn;
      this.updateHud();
    }

    // Snapshot velocity before physics step so the stomp callback has reliable data.
    if (Phaser.Input.Keyboard.JustDown(this.fullscreenKey)) {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    }

    // Snapshot velocity before physics step so the stomp callback has reliable data.
    this.kittenPrevVelY = this.kitten.body ? this.kitten.body.velocity.y : 0;

    if (this.zombieHitCooldown > 0) {
      this.zombieHitCooldown -= delta;
    }

    if (this.currentThemeKey === 'night' && this.flashlightOn && this.flashlightBattery > 0) {
      this.flashlightBattery = Math.max(0, this.flashlightBattery - (this.flashlightDrainPerSec * delta) / 1000);
      this.updateHud();
    }

    this.updateChefHeli();
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
    this.updateShadows();
    this.updateAstronautHelmet();
  }

  updateShadows() {
    if (this.kittenShadow?.active) {
      this.kittenShadow.x = this.kitten.x;
      this.kittenShadow.y = this.ground.y - 2;
      this.kittenShadow.width = 42 * Phaser.Math.Clamp(1 + this.sizeMultiplier * 0.2, 1, 1.6);
    }
    if (this.heliShadow?.active) {
      this.heliShadow.x = this.chefHeli.x;
      this.heliShadow.y = this.ground.y - 8;
    }
    if (this.rocketShadow?.active) {
      this.rocketShadow.setVisible(this.pizzaPlane.visible);
      this.rocketShadow.x = this.pizzaPlane.x;
      this.rocketShadow.y = this.ground.y - 9;
    }
    const enemies = this.zombieGroup.getChildren();
    for (let i = 0; i < enemies.length; i += 1) {
      const enemy = enemies[i];
      if (enemy.shadow) {
        enemy.shadow.setVisible(enemy.active);
        enemy.shadow.x = enemy.x;
        enemy.shadow.y = this.ground.y - 2;
        enemy.shadow.width = 36 * Phaser.Math.Clamp(enemy.growthScale || 1, 1, 2.2);
      }
    }
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
  }

  cleanupMissedPizza() {
    const children = this.pizzaGroup.getChildren();
    for (let i = 0; i < children.length; i += 1) {
      const food = children[i];
      if (food.active && food.y > WORLD_HEIGHT + 40) {
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
        zombie.disableBody(true, true);
      }
    }
  }

  updateFlashlightPosition() {
    const lightEnabled = this.currentThemeKey === 'night' && this.flashlightOn && this.flashlightBattery > 0;
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
    this.flashlightCone.fillStyle(0xfff1b0, 0.13);
    this.flashlightCone.fillTriangle(handX, handY, farX, handY - halfWidth, farX, handY + halfWidth);
    this.flashlightCone.fillStyle(0xfff7d1, 0.21);
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
    h.fillStyle(0x888888, 1);
    h.fillRect(handX - 2, handY - 2, dir * 10, 4);
    // Lens end (slightly wider circle at tip).
    h.fillStyle(0xddddcc, 1);
    h.fillCircle(handX + dir * 8, handY, 2.5);
    // Grip (short perpendicular bar).
    h.fillStyle(0x666666, 1);
    h.fillRect(handX - 1, handY, 2, 5);
  }

  updateZombieLightEffect(delta) {
    const zombies = this.zombieGroup.getChildren();
    const lightActive = this.currentThemeKey === 'night' && this.flashlightOn && this.flashlightBattery > 0;

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
        continue;
      }

      const dx = (zombie.x - this.flashlightTip.x) * this.flashlightDir;
      const dy = Math.abs(zombie.y - this.flashlightTip.y);
      const inFront = dx > 0 && dx <= this.flashlightLength;
      const coneHalfAtDepth = (dx / this.flashlightLength) * this.flashlightHalfWidth + 10;
      const lit = inFront && dy <= coneHalfAtDepth;

      if (lit) {
        if (zombie.enemyType === 'vampire') {
          zombie.vampireLightMs = (zombie.vampireLightMs || 0) + delta;
          if (zombie.vampireLightMs >= 3000) {
            this.burnVampireToAsh(zombie);
            continue;
          }
        }
        if (!zombie.litStopped) {
          zombie.litStopped = true;
          zombie.setVelocityX(0);
          zombie.setTint(zombie.enemyType === 'vampire' ? 0xffb38f : 0xe9f6ff);
        }
      } else if (zombie.litStopped) {
        zombie.litStopped = false;
        zombie.clearTint();
        if (zombie.enemyType === 'vampire') {
          zombie.setTint(0xd8c3ff);
          zombie.vampireLightMs = Math.max(0, (zombie.vampireLightMs || 0) - delta * 1.2);
        }
        zombie.setVelocityX(zombie.moveDir * zombie.moveSpeed);
      } else if (zombie.enemyType === 'vampire' && zombie.vampireLightMs > 0) {
        zombie.vampireLightMs = Math.max(0, zombie.vampireLightMs - delta * 1.2);
      }
    }
  }
}
