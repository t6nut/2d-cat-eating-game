import { drawNightBackground, TEXT_STYLE } from '../utils.js';

const W = 960;
const H = 540;

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  preload() {
    // Load all assets here; Phaser caches them globally for other scenes.
    this.load.svg('kittenIdle', 'assets/sprites/kitten_idle.svg', { scale: 1 });
    this.load.svg('kittenRun',  'assets/sprites/kitten_run.svg',  { scale: 1 });
    this.load.svg('kittenEat',  'assets/sprites/kitten_eat.svg',  { scale: 1 });
    this.load.svg('pizza',      'assets/sprites/pizza_slice.svg', { scale: 1 });
    this.load.svg('chefHeli',   'assets/sprites/chef_helicopter.svg', { scale: 1 });
  }

  create() {
    drawNightBackground(this, W, H);

    // Helicopter flies in from the left, then hovers
    this.heli = this.add.sprite(-150, 82, 'chefHeli');
    this.heli.setScale(2).setDepth(5);

    this.tweens.add({
      targets: this.heli,
      x: W * 0.62,
      duration: 1700,
      ease: 'Cubic.easeOut',
      onComplete: () => this._startHeliHover(),
    });

    // Title
    this.add.text(W / 2, H / 2 - 118, 'PIZZA CAT', {
      ...TEXT_STYLE,
      fontSize: '82px',
      color: '#ffd700',
      strokeThickness: 10,
    }).setOrigin(0.5).setDepth(20);

    this.add.text(W / 2, H / 2 - 40,
      "An Italian chef in a helicopter is dropping pizza!", {
      ...TEXT_STYLE,
      fontSize: '17px',
      color: '#c8e0ff',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    this.add.text(W / 2, H / 2 - 12, '❤  Catch every slice to grow HUGE!  ❤', {
      ...TEXT_STYLE,
      fontSize: '18px',
      color: '#ffcc44',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    this.add.text(W / 2, H / 2 + 18, '← → or A / D  to move', {
      ...TEXT_STYLE,
      fontSize: '16px',
      color: '#88aadd',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    // Blinking start prompt
    const prompt = this.add.text(W / 2, H / 2 + 74,
      '— PRESS  SPACE  OR  ENTER  TO  START —', {
      ...TEXT_STYLE,
      fontSize: '20px',
      color: '#ffffff',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({ targets: prompt, alpha: 0.08, duration: 650, yoyo: true, repeat: -1 });

    // Kitten bouncing at bottom
    const kitten = this.add.sprite(W / 2, H - 44, 'kittenIdle');
    kitten.setScale(3).setDepth(10);
    this.tweens.add({
      targets: kitten,
      y: H - 50,
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Decorative pizzas drop every 1 s
    this.time.addEvent({ delay: 1000, loop: true, callback: this._dropPizza, callbackScope: this });

    // Input
    this.input.keyboard.once('keydown-SPACE', this._start, this);
    this.input.keyboard.once('keydown-ENTER', this._start, this);
  }

  _startHeliHover() {
    this.tweens.add({
      targets: this.heli,
      x: { from: W * 0.4, to: W * 0.78 },
      duration: 3200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: this.heli,
      y: { from: 80, to: 90 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => {
        if (this.heli?.active) this._dropPizza(this.heli.x, this.heli.y + 40);
      },
    });
  }

  _dropPizza(ox, oy) {
    const x = ox !== undefined ? ox + Phaser.Math.Between(-30, 30)
                               : Phaser.Math.Between(80, W - 80);
    const y = oy !== undefined ? oy : 80;
    const slice = this.add.sprite(x, y, 'pizza').setDepth(8)
                     .setScale(Phaser.Math.FloatBetween(0.9, 1.8));
    this.tweens.add({
      targets: slice,
      y: H + 50,
      angle: Phaser.Math.Between(-400, 400),
      duration: Phaser.Math.Between(1400, 2400),
      ease: 'Linear',
      onComplete: () => slice.destroy(),
    });
  }

  _start() {
    this.scene.start('MainScene');
  }
}
