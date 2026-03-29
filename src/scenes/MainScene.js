const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 540;

const CHARACTER_SKINS = {
  orange: {
    label: "Orange Cat",
    idle: "kittenIdle",
    run: "kittenRun",
    eat: "kittenEat",
  },
  tuxedo: {
    label: "Tuxedo Cat",
    idle: "tuxedoIdle",
    run: "tuxedoRun",
    eat: "tuxedoEat",
  },
  pikatchu: {
    label: "Pikatchu",
    idle: "pikatchuIdle",
    run: "pikatchuRun",
    eat: "pikatchuEat",
  },
};

const MODE_SETTINGS = {
  easy: {
    label: "Easy",
    dropDelayBase: 1450,
    dropDelayMin: 750,
    dropRamp: 11,
    foodScale: 1.7,
    minFallVelocity: 38,
    maxFallVelocity: 70,
    gravityScale: 0.6,
    heliSpeedScale: 0.76,
    pizzaChance: 0.06,
  },
  medium: {
    label: "Medium",
    dropDelayBase: 1150,
    dropDelayMin: 560,
    dropRamp: 12,
    foodScale: 1.45,
    minFallVelocity: 45,
    maxFallVelocity: 88,
    gravityScale: 0.8,
    heliSpeedScale: 0.9,
    pizzaChance: 0.08,
  },
  hard: {
    label: "Hard",
    dropDelayBase: 900,
    dropDelayMin: 350,
    dropRamp: 12,
    foodScale: 1.2,
    minFallVelocity: 56,
    maxFallVelocity: 106,
    gravityScale: 1,
    heliSpeedScale: 1,
    pizzaChance: 0.1,
  },
};

export class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.pizzaSpawnEvent = null;
    this.foodPoints = 0;
    this.foodCaught = 0;
    this.sizeMultiplier = 1;
    this.eatCooldown = 0;
    this.isRunActive = false;
    this.currentModeKey = "medium";
    this.currentCharacterKey = "orange";
    this.airplaneActive = false;
    this.airplaneDirection = 1;
    this.menuElements = [];
    this.audioCtx = null;
  }

  preload() {
    this.load.svg("kittenIdle", "assets/sprites/kitten_idle.svg", { scale: 1 });
    this.load.svg("kittenRun", "assets/sprites/kitten_run.svg", { scale: 1 });
    this.load.svg("kittenEat", "assets/sprites/kitten_eat.svg", { scale: 1 });
    this.load.svg("tuxedoIdle", "assets/sprites/tuxedo_idle.svg", { scale: 1 });
    this.load.svg("tuxedoRun", "assets/sprites/tuxedo_run.svg", { scale: 1 });
    this.load.svg("tuxedoEat", "assets/sprites/tuxedo_eat.svg", { scale: 1 });
    this.load.svg("pikatchuIdle", "assets/sprites/pikatchu_idle.svg", { scale: 1 });
    this.load.svg("pikatchuRun", "assets/sprites/pikatchu_run.svg", { scale: 1 });
    this.load.svg("pikatchuEat", "assets/sprites/pikatchu_eat.svg", { scale: 1 });
    this.load.svg("pizza", "assets/sprites/pizza_slice.svg", { scale: 1 });
    this.load.svg("pizzaWhole", "assets/sprites/pizza_whole.svg", { scale: 1 });
    this.load.svg("chefHeli", "assets/sprites/chef_helicopter.svg", { scale: 1 });
    this.load.svg("pizzaPlane", "assets/sprites/pizza_plane.svg", { scale: 1 });
  }

  create() {
    this.createBackground();

    this.ground = this.physics.add.staticImage(WORLD_WIDTH / 2, WORLD_HEIGHT - 20, null);
    this.ground.displayWidth = WORLD_WIDTH;
    this.ground.displayHeight = 40;
    this.ground.refreshBody();

    this.kitten = this.physics.add.sprite(WORLD_WIDTH / 2, WORLD_HEIGHT - 62, "kittenIdle");
    this.kitten.setOrigin(0.5, 1);
    this.kitten.setCollideWorldBounds(true);
    this.kitten.setDragX(1300);
    this.kitten.setMaxVelocity(380, 1000);
    this.kitten.setDepth(5);
    this.kitten.setImmovable(true);

    this.physics.add.collider(this.kitten, this.ground);

    this.chefHeli = this.add.sprite(WORLD_WIDTH / 2, 88, "chefHeli");
    this.chefHeli.setScale(1.55);
    this.chefHeli.setDepth(4);

    this.pizzaPlane = this.add.sprite(-140, 120, "pizzaPlane");
    this.pizzaPlane.setVisible(false);
    this.pizzaPlane.setScale(1.22);
    this.pizzaPlane.setDepth(4);

    this.pizzaGroup = this.physics.add.group({
      bounceY: 0,
      collideWorldBounds: false,
      maxSize: 160,
    });

    this.physics.add.overlap(
      this.kitten,
      this.pizzaGroup,
      this.handlePizzaCaught,
      null,
      this,
    );

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,A,S,D");
    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.input.keyboard.on("keydown", this.resumeAudio, this);
    this.input.on("pointerdown", this.resumeAudio, this);

    this.createHud();
    this.applyCharacter("orange");
    this.showStartMenu();
  }

  createBackground() {
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x99e8ff);
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT - 100, WORLD_WIDTH, 200, 0xa8de78);

    for (let i = 0; i < 7; i += 1) {
      const cloudX = 120 + i * 130;
      const cloudY = 65 + (i % 2) * 28;
      this.add.ellipse(cloudX, cloudY, 86, 34, 0xdff8ff, 0.65);
    }
  }

  createHud() {
    const style = {
      fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
      fontSize: "20px",
      color: "#2f1b14",
      stroke: "#fff8e6",
      strokeThickness: 3,
    };

    this.scoreText = this.add.text(20, 20, "Food: 0", style).setDepth(20);
    this.sizeText = this.add.text(20, 48, "Size: 1.00x", style).setDepth(20);
    this.modeText = this.add.text(20, 76, "Mode: --", style).setDepth(20);
    this.restartHint = this.add
      .text(WORLD_WIDTH - 20, 20, "Press R to Restart", {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: "18px",
        color: "#2f1b14",
        stroke: "#fff8e6",
        strokeThickness: 3,
      })
      .setOrigin(1, 0)
      .setDepth(20);
  }

  showStartMenu() {
    this.isRunActive = false;
    if (this.pizzaSpawnEvent) {
      this.pizzaSpawnEvent.remove(false);
      this.pizzaSpawnEvent = null;
    }

    const panel = this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 590, 350, 0xfff3dc, 0.95);
    panel.setStrokeStyle(5, 0x7e4a2d, 1);
    panel.setDepth(40);

    const title = this.add
      .text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 138, "Kitten Pizza Catch", {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: "44px",
        color: "#7b2f14",
        stroke: "#ffe9c9",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(41);

    const characterLabel = this.add
      .text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 82, "Choose Character", {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: "28px",
        color: "#2f1b14",
      })
      .setOrigin(0.5)
      .setDepth(41);

    const chars = ["orange", "tuxedo", "pikatchu"];
    for (let i = 0; i < chars.length; i += 1) {
      const charKey = chars[i];
      const button = this.makeMenuButton(
        WORLD_WIDTH / 2 - 200 + i * 200,
        WORLD_HEIGHT / 2 - 35,
        CHARACTER_SKINS[charKey].label,
        () => {
          this.currentCharacterKey = charKey;
          this.startRun();
        },
      );
      this.menuElements.push(button.box, button.text);
    }

    const modeLabel = this.add
      .text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 35, "Choose Mode", {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: "28px",
        color: "#2f1b14",
      })
      .setOrigin(0.5)
      .setDepth(41);

    const modes = ["easy", "medium", "hard"];
    for (let i = 0; i < modes.length; i += 1) {
      const modeKey = modes[i];
      const button = this.makeMenuButton(
        WORLD_WIDTH / 2 - 200 + i * 200,
        WORLD_HEIGHT / 2 + 82,
        MODE_SETTINGS[modeKey].label,
        () => {
          this.currentModeKey = modeKey;
          this.startRun();
        },
      );
      this.menuElements.push(button.box, button.text);
    }

    const helper = this.add
      .text(
        WORLD_WIDTH / 2,
        WORLD_HEIGHT / 2 + 132,
        "Pick any character and any mode. If you pick one first, the other keeps last choice.",
        {
          fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
          fontSize: "18px",
          color: "#5a3325",
          align: "center",
        },
      )
      .setOrigin(0.5)
      .setDepth(41);

    this.menuElements.push(panel, title, characterLabel, modeLabel, helper);
  }

  makeMenuButton(x, y, label, onClick) {
    const box = this.add.rectangle(x, y, 180, 52, 0xffcf8f, 1).setDepth(41).setStrokeStyle(3, 0x7e4a2d);
    const text = this.add
      .text(x, y, label, {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: "21px",
        color: "#2f1b14",
      })
      .setOrigin(0.5)
      .setDepth(42);

    box.setInteractive({ useHandCursor: true });
    box.on("pointerover", () => box.setFillStyle(0xffdbab));
    box.on("pointerout", () => box.setFillStyle(0xffcf8f));
    box.on("pointerdown", onClick);
    return { box, text };
  }

  startRun() {
    this.destroyStartMenu();
    this.clearFood();

    this.foodPoints = 0;
    this.foodCaught = 0;
    this.sizeMultiplier = 1;
    this.eatCooldown = 0;
    this.isRunActive = true;
    this.airplaneActive = false;

    this.kitten.setScale(1);
    this.kitten.setVelocity(0, 0);
    this.kitten.setAccelerationX(0);
    this.kitten.setPosition(WORLD_WIDTH / 2, WORLD_HEIGHT - 62);

    this.applyCharacter(this.currentCharacterKey);
    this.updateHud();
    this.schedulePizzaDrops();
  }

  destroyStartMenu() {
    for (let i = 0; i < this.menuElements.length; i += 1) {
      this.menuElements[i].destroy();
    }
    this.menuElements = [];
  }

  applyCharacter(characterKey) {
    const skin = CHARACTER_SKINS[characterKey] || CHARACTER_SKINS.orange;
    this.currentCharacterKey = characterKey;
    this.kittenSkin = skin;
    this.kitten.setTexture(skin.idle);
    this.kitten.setFlipX(false);
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

    this.pizzaSpawnEvent = this.time.addEvent({
      delay,
      loop: true,
      callback: this.spawnFood,
      callbackScope: this,
    });
  }

  spawnFood() {
    if (!this.isRunActive) {
      return;
    }

    const mode = this.getCurrentMode();
    const shouldDropBigPizza = Math.random() < mode.pizzaChance;
    if (shouldDropBigPizza && !this.airplaneActive) {
      this.launchAirplaneBigPizza();
      return;
    }

    this.spawnSliceFromHelicopter();
  }

  spawnSliceFromHelicopter() {
    const mode = this.getCurrentMode();
    const variance = Phaser.Math.Clamp(34 + this.foodCaught * 0.7, 34, 140);
    const x = Phaser.Math.Clamp(
      this.chefHeli.x + Phaser.Math.Between(-variance, variance),
      24,
      WORLD_WIDTH - 24,
    );

    const food = this.pizzaGroup.get(x, this.chefHeli.y + 34, "pizza");
    if (!food) {
      return;
    }

    food.foodValue = 1;
    food.isWholePizza = false;
    food.setTexture("pizza");
    food.setActive(true);
    food.setVisible(true);
    food.body.enable = true;
    food.body.setAllowGravity(true);
    food.setScale(mode.foodScale);
    food.setVelocity(Phaser.Math.Between(-30, 30), Phaser.Math.Between(mode.minFallVelocity, mode.maxFallVelocity));
    food.setGravityY(600 * mode.gravityScale);
    food.setAngularVelocity(Phaser.Math.Between(-65, 65));
    food.setDepth(6);
    food.caught = false;
  }

  launchAirplaneBigPizza() {
    const mode = this.getCurrentMode();
    this.airplaneActive = true;
    this.airplaneDirection = Math.random() > 0.5 ? 1 : -1;

    const startX = this.airplaneDirection === 1 ? -120 : WORLD_WIDTH + 120;
    const endX = this.airplaneDirection === 1 ? WORLD_WIDTH + 120 : -120;

    this.pizzaPlane.setVisible(true);
    this.pizzaPlane.setPosition(startX, 125 + Phaser.Math.Between(-12, 12));
    this.pizzaPlane.setFlipX(this.airplaneDirection !== 1);

    this.tweens.add({
      targets: this.pizzaPlane,
      x: endX,
      duration: 2600,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.airplaneActive = false;
        this.pizzaPlane.setVisible(false);
      },
    });

    this.time.delayedCall(1200, () => {
      const food = this.pizzaGroup.get(this.pizzaPlane.x, this.pizzaPlane.y + 16, "pizzaWhole");
      if (!food) {
        return;
      }

      food.foodValue = 5;
      food.isWholePizza = true;
      food.setTexture("pizzaWhole");
      food.setActive(true);
      food.setVisible(true);
      food.body.enable = true;
      food.body.setAllowGravity(true);
      food.setScale(mode.foodScale * 1.18);
      food.setVelocity(Phaser.Math.Between(-20, 20), Phaser.Math.Between(mode.minFallVelocity - 10, mode.maxFallVelocity - 16));
      food.setGravityY(600 * mode.gravityScale * 0.9);
      food.setAngularVelocity(Phaser.Math.Between(-55, 55));
      food.setDepth(7);
      food.caught = false;
    });
  }

  handlePizzaCaught(kitten, food) {
    if (!this.isRunActive || food.caught) {
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
      ease: "Quad.easeIn",
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

    const baseWidth = 16;
    const baseHeight = 12;
    this.kitten.body.setSize(baseWidth * this.sizeMultiplier, baseHeight * this.sizeMultiplier, true);

    this.eatCooldown = 160;
    this.kitten.setTexture(this.kittenSkin.eat);

    this.playEatSound(growthValue);
    this.playEatingAnimation();
    this.updateHud();

    const popupText = growthValue > 1 ? "+WHOLE PIZZA x5" : "+slice";
    this.showCatchPopup(this.kitten.x, this.kitten.y - 45 * this.sizeMultiplier, popupText);

    if (this.foodCaught % 2 === 0) {
      this.schedulePizzaDrops();
    }
  }

  getSizeMultiplier(foodPoints) {
    const multiplier = 1 + 0.18 * Math.sqrt(foodPoints);
    return Phaser.Math.Clamp(multiplier, 1, 3.5);
  }

  showCatchPopup(x, y, text) {
    const label = this.add.text(x, y, text, {
      fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
      fontSize: "18px",
      color: "#9e2a2a",
      stroke: "#fff3d8",
      strokeThickness: 3,
    });

    label.setOrigin(0.5);
    label.setDepth(25);

    this.tweens.add({
      targets: label,
      y: y - 30,
      alpha: 0,
      duration: 420,
      ease: "Sine.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  playEatingAnimation() {
    this.tweens.add({
      targets: this.kitten,
      scaleX: this.sizeMultiplier * 1.08,
      scaleY: this.sizeMultiplier * 0.92,
      yoyo: true,
      duration: 90,
      ease: "Sine.easeInOut",
    });
  }

  updateHud() {
    const mode = this.getCurrentMode();
    this.scoreText.setText(`Food: ${this.foodPoints}`);
    this.sizeText.setText(`Size: ${this.sizeMultiplier.toFixed(2)}x`);
    this.modeText.setText(`Mode: ${mode.label} | Cat: ${this.kittenSkin.label}`);
  }

  resumeAudio() {
    if (!window.AudioContext && !window.webkitAudioContext) {
      return;
    }

    if (!this.audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new Ctx();
    }

    if (this.audioCtx.state === "suspended") {
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

    osc.type = "triangle";
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

    osc.type = "square";
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

  update(_time, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.scene.restart();
      return;
    }

    if (!this.isRunActive) {
      return;
    }

    this.updateChefHeli(delta);
    this.updateKittenMovement(delta);
    this.cleanupMissedPizza();
  }

  updateChefHeli(delta) {
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
    const accel = 1450;

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

  clearFood() {
    const children = this.pizzaGroup.getChildren();
    for (let i = 0; i < children.length; i += 1) {
      children[i].disableBody(true, true);
    }
  }
}
