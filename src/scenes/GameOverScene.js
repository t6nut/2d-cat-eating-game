import { drawNightBackground, TEXT_STYLE } from '../utils.js';

const W = 1280;
const H = 720;

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  /** Receives { won, score, pizzasCaught, maxSize } from MainScene. */
  init(data) {
    this.won          = data.won          ?? false;
    this.score        = data.score        ?? 0;
    this.pizzasCaught = data.pizzasCaught ?? 0;
    this.maxSize      = data.maxSize      ?? 1;
  }

  create() {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('game-ui-active');
    }

    drawNightBackground(this, W, H);

    if (this.won) {
      this._buildWinScreen();
    } else {
      this._buildGameOverScreen();
    }

    // Stats row
    this.add.text(W / 2, 310,
      `Score: ${this.score}   ·   Pizzas: ${this.pizzasCaught}   ·   Size: ${this.maxSize.toFixed(2)}×`, {
      ...TEXT_STYLE,
      fontSize: '19px',
      color: '#ffd700',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20);

    // Blinking restart prompt
    const prompt = this.add.text(W / 2, 370, '— PRESS  SPACE  OR  ENTER  TO  PLAY  AGAIN —', {
      ...TEXT_STYLE,
      fontSize: '20px',
      color: '#ffffff',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({ targets: prompt, alpha: 0.08, duration: 650, yoyo: true, repeat: -1 });

    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('TitleScene'));
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('TitleScene'));
  }

  _buildWinScreen() {
    // Giant victorious cat
    const kitten = this.add.sprite(W * 0.22, H - 55, 'kittenIdle');
    kitten.setScale(6).setDepth(5);
    this.tweens.add({
      targets: kitten,
      scaleX: { from: 6.0, to: 6.3 },
      scaleY: { from: 6.0, to: 6.3 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(W / 2, 108, '🏆  GIANT  CAT!  🏆', {
      ...TEXT_STYLE,
      fontSize: '72px',
      color: '#ffd700',
      strokeThickness: 10,
    }).setOrigin(0.5).setDepth(20);

    this.add.text(W / 2, 204, 'The kitty has grown ENORMOUS on Italian pizza!', {
      ...TEXT_STYLE,
      fontSize: '21px',
      color: '#ffffff',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20);

    this.add.text(W / 2, 258, 'The chef has been defeated!  🍕🐱', {
      ...TEXT_STYLE,
      fontSize: '18px',
      color: '#ffdd88',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);
  }

  _buildGameOverScreen() {
    // Sad small cat
    const kitten = this.add.sprite(W / 2, H - 44, 'kittenIdle');
    kitten.setScale(2.5).setFlipX(true).setDepth(5);
    // Sad shake
    this.tweens.add({
      targets: kitten,
      x: { from: W / 2 - 4, to: W / 2 + 4 },
      duration: 110,
      yoyo: true,
      repeat: -1,
    });

    this.add.text(W / 2, 108, 'GAME  OVER', {
      ...TEXT_STYLE,
      fontSize: '80px',
      color: '#ff3344',
      strokeThickness: 10,
    }).setOrigin(0.5).setDepth(20);

    this.add.text(W / 2, 210, 'The hungry kitty missed too many slices...', {
      ...TEXT_STYLE,
      fontSize: '22px',
      color: '#ffcccc',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20);

    this.add.text(W / 2, 258, 'Better luck next time, little one!  🍕', {
      ...TEXT_STYLE,
      fontSize: '18px',
      color: '#ffaaaa',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);
  }
}
