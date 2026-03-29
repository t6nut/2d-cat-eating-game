export class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  init(data) {
    this.options = data ?? {};
  }

  create() {
    this.add.rectangle(480, 270, 960, 540, 0x0c1830, 1);

    const lines = [
      'MainScene Loaded',
      `Character: ${this.options.character ?? 'orange'}`,
      `Mode: ${this.options.mode ?? 'medium'}`,
      `Theme: ${this.options.theme ?? 'day'}`,
      `Zombies: ${this.options.zombies ? 'on' : 'off'}`,
      'Press R to return to title',
    ];

    this.add
      .text(480, 270, lines.join('\n'), {
        fontFamily: 'Courier New, monospace',
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);

    this.input.keyboard.once('keydown-R', () => this.scene.start('TitleScene'));
  }
}
