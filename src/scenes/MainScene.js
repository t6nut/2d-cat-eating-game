const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 540;

export class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    this.pizzaSpawnEvent = null;
    this.pizzasEaten = 0;
    this.sizeMultiplier = 1;
    this.eatCooldown = 0;
  }

  preload() {
    this.load.svg("kittenIdle", "assets/sprites/kitten_idle.svg", { scale: 1 });
    this.load.svg("kittenRun", "assets/sprites/kitten_run.svg", { scale: 1 });
    this.load.svg("kittenEat", "assets/sprites/kitten_eat.svg", { scale: 1 });
    this.load.svg("pizza", "assets/sprites/pizza_slice.svg", { scale: 1 });
    this.load.svg("chefHeli", "assets/sprites/chef_helicopter.svg", { scale: 1 });
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

    this.physics.add.collider(this.kitten, this.ground);

    this.chefHeli = this.add.sprite(WORLD_WIDTH / 2, 88, "chefHeli");
    this.chefHeli.setDepth(4);

    this.pizzaGroup = this.physics.add.group({
      bounceY: 0,
      collideWorldBounds: false,
      maxSize: 120,
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

    this.createHud();
    this.schedulePizzaDrops();
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

    this.scoreText = this.add.text(20, 20, "Slices: 0", style).setDepth(20);
    this.sizeText = this.add.text(20, 48, "Size: 1.00x", style).setDepth(20);
  }

  schedulePizzaDrops() {
    if (this.pizzaSpawnEvent) {
      this.pizzaSpawnEvent.remove(false);
    }

    const delay = Phaser.Math.Clamp(900 - this.pizzasEaten * 12, 300, 900);
    this.pizzaSpawnEvent = this.time.addEvent({
      delay,
      loop: true,
      callback: this.spawnPizza,
      callbackScope: this,
    });
  }

  spawnPizza() {
    const variance = Phaser.Math.Clamp(28 + this.pizzasEaten * 0.6, 28, 120);
    const x = Phaser.Math.Clamp(
      this.chefHeli.x + Phaser.Math.Between(-variance, variance),
      24,
      WORLD_WIDTH - 24,
    );

    const pizza = this.pizzaGroup.get(x, this.chefHeli.y + 28, "pizza");
    if (!pizza) {
      return;
    }

    pizza.setActive(true);
    pizza.setVisible(true);
    pizza.body.enable = true;
    pizza.setScale(1);
    pizza.setVelocity(Phaser.Math.Between(-35, 35), Phaser.Math.Between(25, 80));
    pizza.setAngularVelocity(Phaser.Math.Between(-100, 100));
    pizza.setDepth(6);
  }

  handlePizzaCaught(kitten, pizza) {
    pizza.disableBody(true, true);

    this.pizzasEaten += 1;
    this.sizeMultiplier = this.getSizeMultiplier(this.pizzasEaten);
    kitten.setScale(this.sizeMultiplier);

    // Keep collision body synced with scale to avoid phantom catches.
    const baseWidth = 16;
    const baseHeight = 12;
    kitten.body.setSize(baseWidth * this.sizeMultiplier, baseHeight * this.sizeMultiplier, true);

    this.eatCooldown = 160;
    kitten.setTexture("kittenEat");

    this.scoreText.setText(`Slices: ${this.pizzasEaten}`);
    this.sizeText.setText(`Size: ${this.sizeMultiplier.toFixed(2)}x`);

    this.showCatchPopup(kitten.x, kitten.y - 45 * this.sizeMultiplier);

    if (this.pizzasEaten % 2 === 0) {
      this.schedulePizzaDrops();
    }
  }

  getSizeMultiplier(count) {
    const multiplier = 1 + 0.2 * Math.sqrt(count);
    return Phaser.Math.Clamp(multiplier, 1, 3.5);
  }

  showCatchPopup(x, y) {
    const label = this.add.text(x, y, "+pizza", {
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

  update(_time, delta) {
    this.updateChefHeli(delta);
    this.updateKittenMovement(delta);
    this.cleanupMissedPizza();
  }

  updateChefHeli(delta) {
    const t = this.time.now * 0.001;
    const baseSpeed = 130 + this.pizzasEaten * 0.9;
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
        this.kitten.setTexture("kittenRun");
      }
    } else if (rightDown && !leftDown) {
      this.kitten.setAccelerationX(accel);
      this.kitten.setFlipX(false);
      if (this.eatCooldown <= 0) {
        this.kitten.setTexture("kittenRun");
      }
    } else {
      this.kitten.setAccelerationX(0);
      if (this.eatCooldown <= 0) {
        this.kitten.setTexture("kittenIdle");
      }
    }

    if (this.eatCooldown > 0) {
      this.eatCooldown -= delta;
      if (this.eatCooldown <= 0) {
        this.kitten.setTexture("kittenIdle");
      }
    }
  }

  cleanupMissedPizza() {
    const children = this.pizzaGroup.getChildren();
    for (let i = 0; i < children.length; i += 1) {
      const pizza = children[i];
      if (pizza.active && pizza.y > WORLD_HEIGHT + 32) {
        pizza.disableBody(true, true);
      }
    }
  }
}
