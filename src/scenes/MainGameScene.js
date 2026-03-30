import { clampCatSize, CAT_SIZE_MIN } from '../systems/catGrowth.js';
import { syncKittenBodyToFeet as syncCatBody, syncEnemyBody as syncEnemyPhysicsBody, getGroundSurfaceY as getGroundY, updateKittenMovement as updateCatMovement } from '../systems/catPhysics.js';
import { createFlashlight as createFlashlightVisual, createAstronautHelmet as createHelmetVisual, createJetpackVisuals as createJetpackRender, drawJetpackVisual as drawJetpackRender, updateAstronautHelmet as updateHelmetVisual, updateFlashlightPosition as updateFlashlightVisual, updateShadows as updateAllShadows, updateDropShadow as updateItemShadow, attachDropShadow as attachItemShadow, destroyDropShadow as destroyItemShadow, playEatingAnimation as playEatingVisual } from '../systems/catVisuals.js';
import { scheduleZombieSpawns as scheduleEnemies, spawnZombie as spawnEnemy } from '../systems/enemySpawner.js';
import { handleZombieEatFood as onZombieEatFood, handleZombieCollision as onZombieCollision, burnVampireToAsh as burnEnemyToAsh, cleanupZombies as cleanupEnemyBodies, updateZombieLightEffect as updateEnemyLightEffects, updateZombieGroundingAndAccessories as updateEnemyGrounding, ensureZombieTexture as ensureZombieSprite, ensureVampireTexture as ensureVampireSprite, ensureAshTexture as ensureAshSprite } from '../systems/enemyBehavior.js';
import { createBackground as renderBackground, applyMap as renderMap } from '../systems/mapRenderer.js';
import { applyTheme as renderTheme } from '../systems/themeRenderer.js';
import { schedulePizzaDrops as scheduleFoodDrops, spawnFood as spawnFoodDrop, spawnSliceFromHelicopter as spawnSliceDrop, launchAirplaneBigPizza as launchBonusFlyover, handleFoodHitGround as onFoodHitGround, getGroundAdjustedFoodValue as getFoodGroundValue, handlePizzaCaught as onPizzaCaught, consumeFood as consumeCaughtFood, cleanupMissedPizza as cleanupMissedFood } from '../systems/foodSystem.js';
import { spawnBatteryDrop as spawnBatteryPickupDrop, spawnFuelDrop as spawnFuelPickupDrop, handleBatteryHitGround as onBatteryHitGround, handleFuelHitGround as onFuelHitGround, handleBatteryPickup as onBatteryPickup, handleFuelPickup as onFuelPickup, ensureBatteryTexture as ensureBatterySprite, ensureFuelTexture as ensureFuelSprite } from '../systems/pickupsSystem.js';
import { startBackgroundMusic as startMusicLoop, stopBackgroundMusic as stopMusicLoop, playMusicStep as playMusicTick, resumeAudio as resumeAudioContext, playEnemyEatSound as playEnemyBiteSound, playCatchSound as playFoodCatchSound, playEatSound as playCatEatSound, playAirplaneSound as playPlaneSound, playDogBarkSound as playBarkSound, playZombieStompSound as playStompSound } from '../systems/audioSystem.js';
import { createHud as createHudElements, updateHud as updateHudElements, showCatchPopup as showPopupText } from '../systems/hudSystem.js';

const WORLD_WIDTH = 1280;
const WORLD_HEIGHT = 720;

const CHARACTER_SKINS = {
  orange:   { idle: 'kittenIdle',   walk1: 'kittenWalk1',   walk2: 'kittenWalk2',   run: 'kittenRun',   eat: 'kittenEat'   },
  tuxedo:   { idle: 'tuxedoIdle',   walk1: 'tuxedoWalk1',   walk2: 'tuxedoWalk2',   run: 'tuxedoRun',   eat: 'tuxedoEat'   },
  pikatchu: { idle: 'pikatchuIdle', walk1: 'pikatchuWalk1', walk2: 'pikatchuWalk2', run: 'pikatchuRun', eat: 'pikatchuEat' },
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

const GROWTH_SAVE_PREFIX = 'cat_game_growth_';

export class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
    this.pizzaSpawnEvent = null;
    this.zombieSpawnEvent = null;
    this.foodPoints = 0;
    this.foodCaught = 0;
    this.sizeMultiplier = CAT_SIZE_MIN;
    this.eatCooldown = 0;
    this.zombieHitCooldown = 0;
    this.airplaneActive = false;
    this.currentCharacterKey = 'orange';
    this.currentModeKey = 'medium';
    this.currentThemeKey = 'day';
    this.currentMapKey = 'city';
    this.currentEnemyType = 'off';
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
    this.flashlightDrainPerSec = this.flashlightBatteryMax / 30;
    this.jetpackFuelMax = 10;
    this.jetpackFuel = 10;
    this.jetpackFuelDrainPerSec = this.jetpackFuelMax / 10;
    this.jetpackThrustPerSec = 920;
    this.jetpackMaxLiftSpeed = -340;
    this.flashlightOn = false;
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
    this.eatTween = null;
    this.modeSettings = MODE_SETTINGS;
    this.themeSettings = THEME_SETTINGS;
    this.mapSettings = MAP_SETTINGS;
    this.enemySettings = ENEMY_SETTINGS;
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
    this.sizeMultiplier = CAT_SIZE_MIN;

    if (this.currentMapKey === 'moon') {
      this.currentThemeKey = 'night';
    }

    // Keep each cat's growth persistent even when starting a new session.
    const growthState = this.loadGrowthState(this.currentCharacterKey);
    if (growthState) {
      this.foodPoints = growthState.foodPoints ?? this.foodPoints;
      this.sizeMultiplier = clampCatSize(growthState.sizeMultiplier ?? this.sizeMultiplier);
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
    // Force the orange cat sprite to read clearly orange even if source asset colors vary.
    if (this.currentCharacterKey === 'orange') {
      this.kitten.setTint(0xffb347);
    } else {
      this.kitten.clearTint();
    }
    this.physics.add.collider(this.kitten, this.ground);

    const isMoonMap = this.currentMapKey === 'moon';
    const heliKey  = isMoonMap ? 'ufoSprite'    : 'pizzaOven';
    const planeKey = isMoonMap ? 'rocketSprite' : 'pizzaPlane';
    const heliScale = isMoonMap ? 2 : 0.7;
    this.chefHeli   = this.add.sprite(WORLD_WIDTH / 2, 88, heliKey).setScale(heliScale).setDepth(5);
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
    this.heliShadow = this.add.ellipse(
      this.chefHeli.x,
      this.getGroundSurfaceY(),
      isMoonMap ? 170 : 60,
      isMoonMap ? 42 : 15,
      0x000000,
      0.18,
    ).setDepth(4);
    // Animated flame overlay on oven door (only for non-moon maps)
    if (this.currentMapKey !== 'moon') {
      this.ovenFlameGfx = this.add.graphics().setDepth(6);
      this.ovenFlameTime = 0;
      this.chefTossGfx = this.add.graphics().setDepth(7);
      this.chefTossUntil = 0;
    }
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
    renderBackground(this, WORLD_WIDTH, WORLD_HEIGHT);
  }

  applyMap(mapKey) {
    renderMap(this, mapKey, WORLD_WIDTH, WORLD_HEIGHT);
  }

  createFlashlight() {
    createFlashlightVisual(this);
  }

  applyTheme(themeKey) {
    renderTheme(this, themeKey, WORLD_WIDTH);
  }

  createHud() {
    createHudElements(this, WORLD_WIDTH);
  }

  updateHud() {
    updateHudElements(this, MODE_SETTINGS, MAP_SETTINGS, ENEMY_SETTINGS);
  }

  getCurrentMode() {
    return MODE_SETTINGS[this.currentModeKey] || MODE_SETTINGS.medium;
  }

  schedulePizzaDrops() {
    scheduleFoodDrops(this);
  }

  scheduleZombieSpawns() {
    scheduleEnemies(this);
  }

  spawnFood() {
    spawnFoodDrop(this);
  }

  spawnSliceFromHelicopter() {
    spawnSliceDrop(this, WORLD_WIDTH);
  }

  launchAirplaneBigPizza() {
    launchBonusFlyover(this, WORLD_WIDTH);
  }

  spawnBatteryDrop(x, y, driftDir) {
    spawnBatteryPickupDrop(this, x, y, driftDir);
  }

  spawnFuelDrop(x, y, driftDir) {
    spawnFuelPickupDrop(this, x, y, driftDir);
  }

  spawnZombie() {
    spawnEnemy(this, WORLD_WIDTH);
  }

  handleFoodHitGround(objA, objB) {
    onFoodHitGround(this, objA, objB);
  }

  getGroundAdjustedFoodValue(food) {
    return getFoodGroundValue(this, food);
  }

  handleBatteryHitGround(objA, objB) {
    onBatteryHitGround(this, objA, objB);
  }

  handleFuelHitGround(objA, objB) {
    onFuelHitGround(this, objA, objB);
  }

  handleBatteryPickup(_kitten, battery) {
    onBatteryPickup(this, _kitten, battery);
  }

  handleFuelPickup(_kitten, fuel) {
    onFuelPickup(this, _kitten, fuel);
  }

  handleZombieEatFood(objA, objB) {
    onZombieEatFood(this, objA, objB);
  }

  handlePizzaCaught(kitten, food) {
    onPizzaCaught(this, kitten, food);
  }

  consumeFood(food) {
    consumeCaughtFood(this, food);
  }

  handleZombieCollision(kitten, zombie) {
    onZombieCollision(this, kitten, zombie);
  }

  showCatchPopup(x, y, text) {
    showPopupText(this, x, y, text);
  }

  playEatingAnimation() {
    playEatingVisual(this);
  }

  playEnemyEatSound(strength) {
    playEnemyBiteSound(this, strength);
  }

  startBackgroundMusic() {
    startMusicLoop(this);
  }

  stopBackgroundMusic() {
    stopMusicLoop(this);
  }

  playMusicStep() {
    playMusicTick(this);
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
    resumeAudioContext(this);
  }

  playCatchSound(strength) {
    playFoodCatchSound(this, strength);
  }

  playEatSound(strength) {
    playCatEatSound(this, strength);
  }

  playAirplaneSound() {
    playPlaneSound(this);
  }

  playDogBarkSound() {
    playBarkSound(this);
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
      sizeMultiplier: clampCatSize(this.sizeMultiplier),
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(this.getGrowthKey(this.currentCharacterKey), JSON.stringify(payload));
    } catch (_err) {
      // ignore storage issues
    }
  }

  playZombieStompSound() {
    playStompSound(this);
  }

  ensureZombieTexture() {
    ensureZombieSprite(this);
  }

  ensureVampireTexture() {
    ensureVampireSprite(this);
  }

  ensureAshTexture() {
    ensureAshSprite(this);
  }

  createAstronautHelmet() {
    createHelmetVisual(this);
  }

  createJetpackVisuals() {
    createJetpackRender(this);
  }

  syncKittenBodyToFeet() {
    syncCatBody(this);
  }

  syncEnemyBody(enemy) {
    syncEnemyPhysicsBody(this, enemy);
  }

  updateAstronautHelmet() {
    updateHelmetVisual(this);
  }

  drawJetpackVisual(active) {
    drawJetpackRender(this, active);
  }

  burnVampireToAsh(enemy) {
    burnEnemyToAsh(this, enemy);
  }

  ensureBatteryTexture() {
    ensureBatterySprite(this);
  }

  ensureFuelTexture() {
    ensureFuelSprite(this);
  }

  getGroundSurfaceY() {
    return getGroundY(this);
  }

  attachDropShadow(item, baseWidth, baseHeight, alpha = 0.15) {
    attachItemShadow(this, item, baseWidth, baseHeight, alpha);
  }

  destroyDropShadow(item) {
    destroyItemShadow(this, item);
  }

  update(_time, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.restartKey) ||
      (window._mobile?.menuJustDown && ((window._mobile.menuJustDown = false) || true))) {
      this.saveCharacterState();
      this.scene.start('TitleScene');
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.lightToggleKey) ||
        (window._mobile?.lightJustDown && ((window._mobile.lightJustDown = false) || true))) {
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
    this.syncKittenBodyToFeet();
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
    updateAllShadows(this);
  }

  updateDropShadow(item) {
    updateItemShadow(this, item);
  }

  updateChefHeli() {
    const t = this.time.now * 0.001;
    const mode = this.getCurrentMode();
    const baseSpeed = (130 + this.foodCaught * 0.9) * mode.heliSpeedScale;
    const swing = Math.sin(t * 0.8) * 260;
    const cruise = Math.sin(t * 0.22) * baseSpeed;
    this.chefHeli.x = Phaser.Math.Clamp(WORLD_WIDTH / 2 + swing + cruise, 70, WORLD_WIDTH - 70);
    this.chefHeli.y = 82 + Math.sin(t * 4.5) * 2;

    if (this.ovenFlameGfx) {
      this.ovenFlameTime += 0.13;
      const fl = this.ovenFlameGfx;
      fl.clear();
      // SVG viewBox 190x140 -> sprite origin maps to SVG point (95, 70)
      // Oven group is lowered in the sprite, so keep the flame overlay aligned to the door.
      const fx = this.chefHeli.x + (79 - 95) * 0.7; // ≈ -11
      const fy = this.chefHeli.y + (97 - 70) * 0.7; // ≈ +19
      const f1 = 0.72 + Math.sin(this.ovenFlameTime * 3.1) * 0.14;
      const f2 = 0.72 + Math.sin(this.ovenFlameTime * 7.5 + 1.2) * 0.16;
      fl.fillStyle(0xff4400, f1 * 0.9);
      fl.fillEllipse(fx, fy + 5, 18, 7);
      fl.fillStyle(0xffaa00, f2);
      fl.fillEllipse(fx, fy, 13, 10);
      fl.fillStyle(0xffee40, f1 * 0.9);
      fl.fillEllipse(fx, fy - 6, 8, 8);
      fl.fillStyle(0xffffff, f2 * 0.55);
      fl.fillEllipse(fx, fy - 10, 5, 5);
    }

    if (this.chefTossGfx) {
      const g = this.chefTossGfx;
      g.clear();
      if (this.time.now < this.chefTossUntil) {
        const duration = 180;
        const p = Phaser.Math.Clamp(1 - (this.chefTossUntil - this.time.now) / duration, 0, 1);
        const swing = Math.sin(p * Math.PI);

        // Approximate shoulder/hand anchors from chef coordinates in the oven SVG.
        const shoulderX = this.chefHeli.x + (164 - 95) * 0.7;
        const shoulderY = this.chefHeli.y + (117 - 70) * 0.7;
        const handX = this.chefHeli.x + (171 - 95) * 0.7 + swing * 8;
        const handY = this.chefHeli.y + (108 - 70) * 0.7 - swing * 11;

        g.lineStyle(5, 0xf6f6f6, 1);
        g.beginPath();
        g.moveTo(shoulderX, shoulderY);
        g.lineTo(handX, handY);
        g.strokePath();

        g.fillStyle(0xf5c49e, 1);
        g.fillCircle(handX, handY, 4);

        // Tossed slice follows hand with a slight lead and spin.
        const sliceX = handX + 5 + swing * 4;
        const sliceY = handY - 7 - swing * 2;
        const s = 0.9;
        g.fillStyle(0xf5d020, 0.95);
        g.fillTriangle(sliceX, sliceY - 4 * s, sliceX - 5 * s, sliceY + 5 * s, sliceX + 5 * s, sliceY + 5 * s);
        g.fillStyle(0xd03020, 0.9);
        g.fillCircle(sliceX - 2 * s, sliceY + 1 * s, 1.2 * s);
        g.fillCircle(sliceX + 2 * s, sliceY + 2 * s, 1.2 * s);
      }
    }
  }

  playChefTossAnimation() {
    if (!this.chefTossGfx || this.currentMapKey === 'moon') {
      return;
    }
    this.chefTossUntil = this.time.now + 180;
  }

  updateKittenMovement(delta) {
    updateCatMovement(this, delta);
  }

  cleanupMissedPizza() {
    cleanupMissedFood(this, WORLD_HEIGHT);
  }

  cleanupZombies() {
    cleanupEnemyBodies(this, WORLD_WIDTH);
  }

  updateFlashlightPosition() {
    updateFlashlightVisual(this);
  }

  updateZombieLightEffect(delta) {
    updateEnemyLightEffects(this, delta);
  }

  updateZombieGroundingAndAccessories() {
    updateEnemyGrounding(this);
  }
}
