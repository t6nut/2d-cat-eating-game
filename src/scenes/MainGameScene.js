const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 540;

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
    pizzaChance: 0.06,
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
    pizzaChance: 0.08,
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
    pizzaChance: 0.1,
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
    this.zombiesEnabled = false;
    this.backgroundElements = [];
    this.audioCtx = null;
  }

  init(data) {
    this.currentCharacterKey = data.character ?? 'orange';
    this.currentModeKey = data.mode ?? 'medium';
    this.currentThemeKey = data.theme ?? 'day';
    this.zombiesEnabled = !!data.zombies;
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
    this.kitten.setDragX(1300);
    this.kitten.setMaxVelocity(380, 1000);
    this.kitten.setDepth(8);
    this.physics.add.collider(this.kitten, this.ground);

    this.chefHeli = this.add.sprite(WORLD_WIDTH / 2, 88, 'chefHeli').setScale(1.55).setDepth(5);
    this.pizzaPlane = this.add.sprite(-140, 120, 'pizzaPlane').setVisible(false).setScale(1.22).setDepth(5);

    this.pizzaGroup = this.physics.add.group({ bounceY: 0, collideWorldBounds: false, maxSize: 180 });
    this.zombieGroup = this.physics.add.group({ collideWorldBounds: false, maxSize: 40 });

    this.physics.add.overlap(this.kitten, this.pizzaGroup, this.handlePizzaCaught, null, this);
    this.physics.add.collider(this.zombieGroup, this.ground);
    this.physics.add.collider(this.kitten, this.zombieGroup, this.handleZombieCollision, null, this);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    this.input.keyboard.on('keydown', this.resumeAudio, this);
    this.input.on('pointerdown', this.resumeAudio, this);

    this.createHud();
    this.createFlashlight();
    this.ensureZombieTexture();
    this.applyTheme(this.currentThemeKey);

    this.schedulePizzaDrops();
    if (this.zombiesEnabled) {
      this.scheduleZombieSpawns();
    }
  }

  createBackground() {
    this.bgSky = this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x99e8ff).setDepth(0);
    this.bgGround = this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT - 100, WORLD_WIDTH, 200, 0xa8de78).setDepth(1);
  }

  createFlashlight() {
    this.flashlightGlow = this.add.ellipse(0, 0, 180, 110, 0xfff7b5, 0.24);
    this.flashlightGlow.setDepth(9);
    this.flashlightGlow.setVisible(false);
    this.flashlightGlow.setBlendMode(Phaser.BlendModes.ADD);
  }

  applyTheme(themeKey) {
    const theme = THEME_SETTINGS[themeKey] || THEME_SETTINGS.day;
    this.currentThemeKey = themeKey;

    this.bgSky.setFillStyle(theme.skyColor, 1);
    this.bgGround.setFillStyle(theme.groundColor, 1);

    for (let i = 0; i < this.backgroundElements.length; i += 1) {
      this.backgroundElements[i].destroy();
    }
    this.backgroundElements = [];

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
    } else {
      for (let i = 0; i < 7; i += 1) {
        const cloudX = 120 + i * 130;
        const cloudY = 65 + (i % 2) * 28;
        const cloud = this.add.ellipse(cloudX, cloudY, 86, 34, 0xdff8ff, 0.65).setDepth(2);
        this.backgroundElements.push(cloud);
      }
    }

    this.flashlightGlow.setVisible(themeKey === 'night');
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

    this.add
      .text(WORLD_WIDTH - 20, 20, 'R: Back to Options', {
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
    const theme = THEME_SETTINGS[this.currentThemeKey] || THEME_SETTINGS.day;
    const zombieText = this.zombiesEnabled ? 'On' : 'Off';
    this.scoreText.setText(`Food: ${this.foodPoints}`);
    this.sizeText.setText(`Size: ${this.sizeMultiplier.toFixed(2)}x`);
    this.modeText.setText(`Mode: ${mode.label} | Theme: ${theme.label} | Zombies: ${zombieText}`);
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
      const food = this.pizzaGroup.get(this.pizzaPlane.x, this.pizzaPlane.y + 16, 'pizzaWhole');
      if (!food) {
        return;
      }
      food.foodValue = 5;
      food.caught = false;
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
    });
  }

  spawnZombie() {
    if (!this.zombiesEnabled) {
      return;
    }
    const mode = this.getCurrentMode();
    const fromLeft = Math.random() > 0.5;
    const startX = fromLeft ? -24 : WORLD_WIDTH + 24;
    const velocityX = fromLeft ? mode.zombieSpeed : -mode.zombieSpeed;
    const zombie = this.zombieGroup.get(startX, WORLD_HEIGHT - 66, 'zombieWalker');
    if (!zombie) {
      return;
    }
    zombie.setActive(true);
    zombie.setVisible(true);
    zombie.body.enable = true;
    zombie.setVelocityX(velocityX);
    zombie.setDepth(7);
    zombie.setFlipX(!fromLeft);
    zombie.alive = true;
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

    const mouthX = kitten.x + (kitten.flipX ? -16 : 16) * this.sizeMultiplier;
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
  }

  handleZombieCollision(kitten, zombie) {
    if (!zombie.active || !zombie.alive || this.zombieHitCooldown > 0) {
      return;
    }

    const stomped = kitten.body.velocity.y > 80 && kitten.body.bottom < zombie.body.top + 14;
    if (stomped) {
      zombie.alive = false;
      zombie.disableBody(true, true);
      kitten.setVelocityY(-320);
      this.showCatchPopup(kitten.x, kitten.y - 38, 'STOMP!');
      this.playZombieStompSound();
      return;
    }

    this.zombieHitCooldown = 450;
    this.foodPoints = Math.max(0, this.foodPoints - 2);
    this.sizeMultiplier = this.getSizeMultiplier(this.foodPoints);
    this.kitten.setScale(this.sizeMultiplier);
    kitten.setVelocityX(kitten.x < zombie.x ? -220 : 220);
    this.updateHud();
    this.showCatchPopup(kitten.x, kitten.y - 45, 'OUCH!');
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

  update(_time, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.scene.start('TitleScene');
      return;
    }

    if (this.zombieHitCooldown > 0) {
      this.zombieHitCooldown -= delta;
    }

    this.updateChefHeli();
    this.updateKittenMovement(delta);
    this.cleanupMissedPizza();
    this.cleanupZombies();
    this.updateFlashlightPosition();
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
      this.kitten.setVelocityY(-460);
    }

    if (leftDown && !rightDown) {
      this.kitten.setAccelerationX(-accel);
      this.kitten.setFlipX(true);
      if (this.eatCooldown <= 0) {
        this.kitten.setTexture(this.kittenSkin.run);
      }
    } else if (rightDown && !leftDown) {
      this.kitten.setAccelerationX(accel);
      this.kitten.setFlipX(false);
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
        zombie.disableBody(true, true);
      }
    }
  }

  updateFlashlightPosition() {
    if (this.currentThemeKey !== 'night') {
      return;
    }
    this.flashlightGlow.x = this.kitten.x;
    this.flashlightGlow.y = this.kitten.y - 58 * this.sizeMultiplier;
    this.flashlightGlow.width = 180 * this.sizeMultiplier;
    this.flashlightGlow.height = 112 * this.sizeMultiplier;
  }
}
