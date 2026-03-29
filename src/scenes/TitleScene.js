import { drawNightBackground, TEXT_STYLE } from '../utils.js';

const W = 1280;
const H = 720;

const CHARACTER_OPTIONS = {
  orange:   { label: 'Orange Cat',  idle: 'kittenIdle'   },
  tuxedo:   { label: 'Tuxedo Cat',  idle: 'tuxedoIdle'   },
  pikatchu: { label: 'Pikatchu',    idle: 'pikatchuIdle'  },
};

const MODE_OPTIONS = {
  easy:   { label: 'Easy'   },
  medium: { label: 'Medium' },
  hard:   { label: 'Hard'   },
};

const THEME_OPTIONS = {
  day:   { label: 'Day'   },
  night: { label: 'Night' },
};

const MAP_OPTIONS = {
  city:   { label: 'City'   },
  desert: { label: 'Desert' },
  beach:  { label: 'Beach'  },
  moon:   { label: 'Moon'   },
};

const ENEMY_OPTIONS = {
  zombies:  { label: 'Zombies'  },
  vampires: { label: 'Vampires' },
  off:      { label: 'Off'      },
};

const SAVE_PREFIX = 'cat_game_save_';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
    this.selectedCharacter = null;
    this.selectedMode = null;
    this.selectedTheme = null;
    this.selectedMap = null;
    this.selectedZombies = null;
    this.selectedEnemyType = null;
    this.selectedRunMode = null;
    this.optionButtons = {};
    this.charPreviewSprite = null;
    this.charPreviewLabel = null;
    this.vehicleDescText = null;
  }

  preload() {
    this.load.svg('kittenIdle',   'assets/sprites/kitten_idle.svg',       { scale: 1 });
    this.load.svg('kittenRun',    'assets/sprites/kitten_run.svg',        { scale: 1 });
    this.load.svg('kittenEat',    'assets/sprites/kitten_eat.svg',        { scale: 1 });
    this.load.svg('tuxedoIdle',   'assets/sprites/tuxedo_idle.svg',       { scale: 1 });
    this.load.svg('tuxedoRun',    'assets/sprites/tuxedo_run.svg',        { scale: 1 });
    this.load.svg('tuxedoEat',    'assets/sprites/tuxedo_eat.svg',        { scale: 1 });
    this.load.svg('pikatchuIdle', 'assets/sprites/pikatchu_idle.svg',     { scale: 1 });
    this.load.svg('pikatchuRun',  'assets/sprites/pikatchu_run.svg',      { scale: 1 });
    this.load.svg('pikatchuEat',  'assets/sprites/pikatchu_eat.svg',      { scale: 1 });
    this.load.svg('pizza',        'assets/sprites/pizza_slice.svg',       { scale: 1 });
    this.load.svg('pizzaWhole',   'assets/sprites/pizza_whole.svg',       { scale: 1 });
    // Normal-map vehicles (helicopter & airplane)
    this.load.svg('chefHeli',     'assets/sprites/chef_helicopter.svg',   { scale: 1 });
    this.load.svg('pizzaPlane',   'assets/sprites/pizza_plane.svg',       { scale: 1 });
    // Moon-map vehicles (UFO & rocketship)
    this.load.svg('ufoSprite',    'assets/sprites/ufo.svg',               { scale: 1 });
    this.load.svg('rocketSprite', 'assets/sprites/rocketship.svg',        { scale: 1 });
  }

  create() {
    drawNightBackground(this, W, H);

    // Helicopter flies in from the left then hovers
    this.heli = this.add.sprite(-150, 88, 'chefHeli');
    this.heli.setScale(2).setDepth(5);
    this.tweens.add({
      targets: this.heli,
      x: W * 0.66,
      duration: 1700,
      ease: 'Cubic.easeOut',
      onComplete: () => this._startHeliHover(),
    });

    // Title
    this.add.text(W / 2, 62, 'PIZZA CAT', {
      ...TEXT_STYLE,
      fontSize: '66px',
      color: '#ffd700',
      strokeThickness: 10,
    }).setOrigin(0.5).setDepth(20);

    this.vehicleDescText = this.add.text(W / 2, 148,
      'A helicopter and airplane are dropping pizza!', {
      ...TEXT_STYLE,
      fontSize: '17px',
      color: '#c8e0ff',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    this.add.text(W / 2, 174, '❤  Catch every slice to grow HUGE!  ❤', {
      ...TEXT_STYLE,
      fontSize: '18px',
      color: '#ffcc44',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    this.add.text(W / 2, 200, '← → / A D  move   ↑ / W  jump   SPACE  flashlight   F  fullscreen', {
      ...TEXT_STYLE,
      fontSize: '14px',
      color: '#88aadd',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    // Fullscreen button top-right
    const fsLabel = this.add.text(W - 16, 14, '[ F ] Fullscreen', {
      ...TEXT_STYLE,
      fontSize: '15px',
      color: '#7aaad8',
      strokeThickness: 2,
    }).setOrigin(1, 0).setDepth(22).setInteractive({ useHandCursor: true });
    fsLabel.on('pointerover', () => fsLabel.setColor('#ffffff'));
    fsLabel.on('pointerout',  () => fsLabel.setColor('#7aaad8'));
    fsLabel.on('pointerdown', () => this._toggleFullscreen());

    this.input.keyboard.on('keydown-F', () => this._toggleFullscreen());

    // Character preview (left side, between title and panel)
    const prevX = 75;
    const prevY = 318;
    this.add.rectangle(prevX, prevY + 12, 118, 160, 0x0a142d, 0.82)
      .setDepth(16).setStrokeStyle(2, 0x9bc4ff, 0.45);
    this.add.text(prevX, prevY - 72, 'Your cat', {
      ...TEXT_STYLE, fontSize: '13px', color: '#8ab4e8', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(17);
    this.charPreviewSprite = this.add.sprite(prevX, prevY - 10, 'kittenIdle')
      .setScale(3).setDepth(20);
    this.tweens.add({
      targets: this.charPreviewSprite,
      y: prevY - 16,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.charPreviewLabel = this.add.text(prevX, prevY + 70, 'Orange Cat', {
      ...TEXT_STYLE, fontSize: '13px', color: '#d8eaff', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20);

    this.createOptionsPanel();

    // Decorative pizzas drop every 1 s
    this.time.addEvent({ delay: 1000, loop: true, callback: this._dropPizza, callbackScope: this });

    // Pre-select defaults so the game is ready to Start immediately
    this.selectOption('character', 'orange');
    this.selectOption('mode', 'medium');
    this.selectOption('theme', 'day');
    this.selectOption('map', 'city');
    this.selectOption('enemies', 'zombies');
    this.selectOption('session', 'new');
  }

  _toggleFullscreen() {
    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen();
    } else {
      this.scale.startFullscreen();
    }
  }

  createOptionsPanel() {
    const panelCX = W / 2;    // 640
    const panelY  = 575;
    const panelW  = 1000;
    const panelH  = 262;

    const panel = this.add.rectangle(panelCX, panelY, panelW, panelH, 0x0a142d, 0.9);
    panel.setStrokeStyle(3, 0x9bc4ff, 0.6);
    panel.setDepth(16);

    const lbl = (x, y, t) => this.add.text(x, y, t, {
      ...TEXT_STYLE, fontSize: '15px', color: '#cde1ff', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(17);

    // --- Row 1: Character ---
    lbl(panelCX, panelY - 112, 'Character');
    this.createOptionRow('character', ['orange', 'tuxedo', 'pikatchu'], CHARACTER_OPTIONS, panelY - 90, (value) => {
      this.selectedCharacter = value;
      if (this.charPreviewSprite) {
        this.charPreviewSprite.setTexture(CHARACTER_OPTIONS[value].idle);
        this.charPreviewLabel.setText(CHARACTER_OPTIONS[value].label);
      }
    }, panelCX);

    // --- Row 2: Mode ---
    lbl(panelCX, panelY - 57, 'Mode');
    this.createOptionRow('mode', ['easy', 'medium', 'hard'], MODE_OPTIONS, panelY - 35, (value) => {
      this.selectedMode = value;
    }, panelCX);

    // --- Row 3: Theme (left) + Map (right) ---
    lbl(panelCX - 320, panelY, 'Theme');
    lbl(panelCX + 170, panelY, 'Map');
    this.createOptionRow('theme', ['day', 'night'], THEME_OPTIONS, panelY + 23, (value) => {
      this.selectedTheme = value;
    }, panelCX - 320);
    this.createOptionRow('map', ['city', 'desert', 'beach', 'moon'], MAP_OPTIONS, panelY + 23, (value) => {
      this.selectedMap = value;
      if (value === 'moon') {
        this.heli.setTexture('ufoSprite');
        if (this.vehicleDescText) this.vehicleDescText.setText('A UFO and rocketship are dropping pizza!');
      } else {
        this.heli.setTexture('chefHeli');
        if (this.vehicleDescText) this.vehicleDescText.setText('A helicopter and airplane are dropping pizza!');
      }
    }, panelCX + 170);

    // --- Row 4: Enemies (left) + Session (right) ---
    lbl(panelCX - 270, panelY + 58, 'Enemies');
    lbl(panelCX + 285, panelY + 58, 'Session');
    this.createOptionRow('enemies', ['zombies', 'vampires', 'off'], ENEMY_OPTIONS, panelY + 80, (value) => {
      this.selectedEnemyType = value;
      this.selectedZombies = value === 'off' ? 'off' : 'on';
    }, panelCX - 270, 128, 115);
    this.createOptionRow('session', ['new', 'continue'],
      { new: { label: 'New' }, continue: { label: 'Continue' } }, panelY + 80, (value) => {
        this.selectedRunMode = value;
      }, panelCX + 285, 148, 132);

    // --- Start button ---
    this.startButton = this.add.rectangle(panelCX, panelY + 116, 290, 42, 0x4d596b, 1)
      .setDepth(17).setStrokeStyle(3, 0x9bc4ff, 0.5);
    this.startText = this.add.text(panelCX, panelY + 116, 'Select All Options', {
      ...TEXT_STYLE, fontSize: '20px', color: '#c6d0dd', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(18);
    this.startButton.setInteractive({ useHandCursor: true });
    this.startButton.on('pointerdown', () => { if (this.canStart()) this._start(); });

    this.sessionHint = this.add.text(panelCX + 285, panelY + 101, 'Pick a character to check save', {
      ...TEXT_STYLE, fontSize: '11px', color: '#d2dbeb', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(18);

    this.updateStartButtonState();
  }

  // btnSpacing / btnWidth override defaults for rows that need tighter packing
  createOptionRow(groupName, keys, sourceMap, y, onSelect, centerX = W / 2, btnSpacing = null, btnWidth = null) {
    this.optionButtons[groupName] = [];
    const count   = keys.length;
    const spacing = btnSpacing ?? (count === 2 ? 138 : count === 4 ? 125 : 188);
    const width   = btnWidth   ?? (count === 2 ? 124 : count === 4 ? 112 : 170);
    const startX  = centerX - ((count - 1) * spacing) / 2;

    for (let i = 0; i < count; i += 1) {
      const key   = keys[i];
      const label = sourceMap[key].label;
      const box   = this.add.rectangle(startX + i * spacing, y, width, 32, 0x283c5c, 1)
        .setDepth(17).setStrokeStyle(2, 0x89b8ff, 0.7);
      box.selected = false;

      const text = this.add.text(startX + i * spacing, y, label, {
        ...TEXT_STYLE, fontSize: '15px', color: '#e2f0ff', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(18);

      box.setInteractive({ useHandCursor: true });
      box.on('pointerover', () => { if (!box.selected) box.setFillStyle(0x33517a); });
      box.on('pointerout',  () => { if (!box.selected) box.setFillStyle(0x283c5c); });
      box.on('pointerdown', () => {
        const row = this.optionButtons[groupName];
        for (let j = 0; j < row.length; j += 1) {
          row[j].box.selected = false;
          row[j].box.setFillStyle(0x283c5c);
        }
        box.selected = true;
        box.setFillStyle(0x3b8a5f);
        onSelect(key);
        if (groupName === 'character') this.refreshContinueAvailability();
        this.updateStartButtonState();
      });

      this.optionButtons[groupName].push({ key, box, text, onSelect });
    }
  }

  // Programmatically activate a button (used for defaults)
  selectOption(groupName, key) {
    const row = this.optionButtons[groupName] || [];
    for (let j = 0; j < row.length; j += 1) {
      row[j].box.selected = false;
      row[j].box.setFillStyle(0x283c5c);
    }
    const target = row.find(e => e.key === key);
    if (!target) return;
    target.box.selected = true;
    target.box.setFillStyle(0x3b8a5f);
    target.onSelect(key);
    if (groupName === 'character') this.refreshContinueAvailability();
    this.updateStartButtonState();
  }

  canStart() {
    if (!(this.selectedCharacter && this.selectedMode && this.selectedTheme &&
          this.selectedMap && this.selectedEnemyType && this.selectedRunMode)) {
      return false;
    }
    if (this.selectedRunMode === 'continue') {
      return this.hasSaveForCharacter(this.selectedCharacter);
    }
    return true;
  }

  updateStartButtonState() {
    if (this.canStart()) {
      this.startButton.setFillStyle(0xff9a3d);
      this.startText.setText(this.selectedRunMode === 'continue' ? 'Continue Game' : 'Start New Game');
      this.startText.setColor('#111111');
    } else {
      this.startButton.setFillStyle(0x4d596b);
      this.startText.setText('Select All Options');
      this.startText.setColor('#c6d0dd');
    }
  }

  getSaveKey(characterKey) {
    return `${SAVE_PREFIX}${characterKey}`;
  }

  hasSaveForCharacter(characterKey) {
    if (!characterKey) {
      return false;
    }
    try {
      return !!localStorage.getItem(this.getSaveKey(characterKey));
    } catch (_err) {
      return false;
    }
  }

  refreshContinueAvailability() {
    const hasSave = this.hasSaveForCharacter(this.selectedCharacter);
    const row = this.optionButtons.session || [];

    for (let i = 0; i < row.length; i += 1) {
      const entry = row[i];
      if (entry.key === 'continue') {
        entry.box.alpha = hasSave ? 1 : 0.45;
        if (!hasSave && entry.box.selected) {
          entry.box.selected = false;
          entry.box.setFillStyle(0x283c5c);
          this.selectedRunMode = null;
        }
      }
    }

    if (this.sessionHint) {
      this.sessionHint.setText(hasSave ? 'Save found \u2713' : 'No save found');
    }
    this.updateStartButtonState();
  }

  _startHeliHover() {
    this.tweens.add({
      targets: this.heli,
      x: { from: W * 0.42, to: W * 0.80 },
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
    this.scene.start('MainScene', {
      character: this.selectedCharacter,
      mode: this.selectedMode,
      theme: this.selectedTheme,
      map: this.selectedMap,
      zombies: this.selectedZombies === 'on',
      enemyType: this.selectedEnemyType,
      runMode: this.selectedRunMode,
    });
  }
}
