import { TEXT_STYLE } from '../utils.js';

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

const GROWTH_SAVE_PREFIX = 'cat_game_growth_';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
    this.selectedCharacter = null;
    this.selectedMode = null;
    this.selectedTheme = null;
    this.selectedMap = null;
    this.selectedZombies = null;
    this.selectedEnemyType = null;
    this.optionButtons = {};
    this.charPreviewSprite = null;
    this.charPreviewLabel = null;
    this.charPreviewSize = null;
    this.vehicleDescText = null;
    this.menuSky = null;
    this.menuGround = null;
    this.menuStars = [];
    this.menuClouds = [];
    this.menuSun = null;
    this.menuMoon = null;
    this.menuJetpack = null;
    this.menuJetpackFlames = null;
    this.menuBackdropBuildings = [];
    this.menuDesertDecor = [];
    this.menuBeachDecor = [];
    this.menuMoonDecor = [];
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
    this.createMenuBackdrop();

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

    this.add.text(W / 2, 200, '← → / A D move   ↑ / W jump   F light/laser   SPACE jetpack(moon)   ESC menu   G fullscreen', {
      ...TEXT_STYLE,
      fontSize: '14px',
      color: '#88aadd',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    // Fullscreen button top-right
    const fsLabel = this.add.text(W - 16, 14, '[ G ] Fullscreen', {
      ...TEXT_STYLE,
      fontSize: '15px',
      color: '#7aaad8',
      strokeThickness: 2,
    }).setOrigin(1, 0).setDepth(22).setInteractive({ useHandCursor: true });
    fsLabel.on('pointerover', () => fsLabel.setColor('#ffffff'));
    fsLabel.on('pointerout',  () => fsLabel.setColor('#7aaad8'));
    fsLabel.on('pointerdown', () => this._toggleFullscreen());

    this.input.keyboard.on('keydown-G', () => this._toggleFullscreen());

    // Character preview (centered above options panel)
    const prevX = W / 2;
    const prevY = 304;
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
    this.charPreviewSize = this.add.text(prevX, prevY + 90, 'Size: 1.00x', {
      ...TEXT_STYLE, fontSize: '12px', color: '#ffd38f', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(20);

    this.createOptionsPanel();

    // Decorative pizzas drop every 1 s
    this.time.addEvent({ delay: 1000, loop: true, callback: this._dropPizza, callbackScope: this });

    // Pre-select defaults so the game is ready to Start immediately
    this.selectOption('character', 'orange');
    this.selectOption('mode', 'easy');
    this.selectOption('theme', 'day');
    this.selectOption('map', 'city');
    this.selectOption('enemies', 'zombies');
  }

  _toggleFullscreen() {
    const doc = window.document;
    if (doc.fullscreenElement) {
      doc.exitFullscreen();
    } else {
      doc.documentElement.requestFullscreen();
    }
  }

  createMenuBackdrop() {
    this.menuSky = this.add.rectangle(W / 2, H / 2, W, H, 0x99e8ff).setDepth(0);
    this.menuGround = this.add.rectangle(W / 2, H - 108, W, 216, 0x6d7686).setDepth(1);

    for (let i = 0; i < 12; i += 1) {
      const x = 42 + i * 112;
      const h = 100 + (i % 4) * 24;
      const building = this.add.rectangle(x, H - 172 - h * 0.5, 76, h, 0x273348, 0.86).setDepth(2);
      this.menuBackdropBuildings.push(building);
    }

    const duneA = this.add.ellipse(310, H - 120, 620, 180, 0xe7bf7e, 0.75).setDepth(2).setVisible(false);
    const duneB = this.add.ellipse(940, H - 100, 760, 210, 0xd8b06a, 0.72).setDepth(2).setVisible(false);
    this.menuDesertDecor.push(duneA, duneB);

    const sea = this.add.rectangle(W / 2, H * 0.64, W, H * 0.5, 0x4fc4dc, 0.62).setDepth(2).setVisible(false);
    const waveA = this.add.ellipse(300, H * 0.52, 520, 38, 0xbef6ff, 0.48).setDepth(2).setVisible(false);
    const waveB = this.add.ellipse(880, H * 0.56, 640, 44, 0xbef6ff, 0.44).setDepth(2).setVisible(false);
    this.menuBeachDecor.push(sea, waveA, waveB);

    const moonSurface = this.add.ellipse(W / 2, H + 120, 1600, 520, 0x8f97ab, 0.72).setDepth(2).setVisible(false);
    const moonRingA = this.add.ellipse(W / 2, H + 125, 1280, 420, 0xdde3ef, 0.12).setDepth(2).setVisible(false);
    const moonRingB = this.add.ellipse(W / 2, H + 135, 1140, 360, 0xc7cdd8, 0.1).setDepth(2).setVisible(false);
    const earth = this.add.circle(132, 100, 24, 0x5ca7f3, 0.9).setDepth(3).setVisible(false);
    this.menuMoonDecor.push(moonSurface, moonRingA, moonRingB, earth);

    for (let i = 0; i < 16; i += 1) {
      const cloud = this.add.ellipse(60 + i * 84, 70 + (i % 2) * 22, 90, 32, 0xe8f7ff, 0.58).setDepth(2);
      cloud.setVisible(false);
      this.menuClouds.push(cloud);
    }

    for (let i = 0; i < 45; i += 1) {
      const star = this.add.circle(
        Phaser.Math.Between(14, W - 14),
        Phaser.Math.Between(10, 230),
        Phaser.Math.Between(1, 2),
        0xe7f4ff,
        Phaser.Math.FloatBetween(0.45, 0.95),
      ).setDepth(2);
      star.setVisible(false);
      this.menuStars.push(star);
    }

    this.menuSun = this.add.circle(1080, 82, 30, 0xffec9d, 0.92).setDepth(2);
    this.menuMoon = this.add.circle(1080, 82, 26, 0xeaf4ff, 0.95).setDepth(2).setVisible(false);

    this.menuJetpack = this.add.graphics().setDepth(7);
    this.menuJetpackFlames = this.add.graphics().setDepth(6);
  }

  updateMenuBackdrop() {
    const map = this.selectedMap || 'city';
    const theme = this.selectedTheme || 'day';
    const isMoon = map === 'moon';
    const isNight = theme === 'night' || isMoon;

    const colors = {
      city: { daySky: 0x95d5ff, dayGround: 0x6d7686, nightSky: 0x101a34, nightGround: 0x3a4558 },
      desert: { daySky: 0xfecf86, dayGround: 0xd8b06a, nightSky: 0x2d2033, nightGround: 0x6f5a45 },
      beach: { daySky: 0x8de0ff, dayGround: 0xe3d39b, nightSky: 0x10203f, nightGround: 0x7b6b4d },
      moon: { daySky: 0x0c1330, dayGround: 0x8f97ab, nightSky: 0x0c1330, nightGround: 0x8f97ab },
    };
    const palette = colors[map] || colors.city;

    this.menuSky.setFillStyle(isNight ? palette.nightSky : palette.daySky, 1);
    this.menuGround.setFillStyle(isNight ? palette.nightGround : palette.dayGround, isMoon ? 0.42 : 0.96);

    for (let i = 0; i < this.menuClouds.length; i += 1) {
      this.menuClouds[i].setVisible(!isNight && !isMoon);
    }
    for (let i = 0; i < this.menuStars.length; i += 1) {
      this.menuStars[i].setVisible(isNight);
    }
    this.menuSun.setVisible(!isNight && !isMoon);
    this.menuMoon.setVisible(isNight);

    const showCity = map === 'city';
    const showDesert = map === 'desert';
    const showBeach = map === 'beach';
    const showMoon = map === 'moon';

    const buildingColor = isNight ? 0x273348 : 0x7f8ea4;
    for (let i = 0; i < this.menuBackdropBuildings.length; i += 1) {
      this.menuBackdropBuildings[i].setVisible(showCity);
      this.menuBackdropBuildings[i].setFillStyle(buildingColor, 0.9);
    }
    for (let i = 0; i < this.menuDesertDecor.length; i += 1) {
      this.menuDesertDecor[i].setVisible(showDesert);
    }
    for (let i = 0; i < this.menuBeachDecor.length; i += 1) {
      this.menuBeachDecor[i].setVisible(showBeach);
    }
    for (let i = 0; i < this.menuMoonDecor.length; i += 1) {
      this.menuMoonDecor[i].setVisible(showMoon);
    }

    if (this.heli) {
      this.heli.setTexture(isMoon ? 'ufoSprite' : 'chefHeli');
    }
    if (this.vehicleDescText) {
      this.vehicleDescText.setText(isMoon
        ? 'A UFO and rocketship are dropping pizza!'
        : 'A helicopter and airplane are dropping pizza!');
    }
  }

  updateMenuJetpack(time) {
    if (!this.menuJetpack || !this.menuJetpackFlames) {
      return;
    }

    this.menuJetpack.clear();
    this.menuJetpackFlames.clear();

    if (this.selectedMap !== 'moon') {
      return;
    }

    const catX = this.charPreviewSprite ? this.charPreviewSprite.x : W / 2;
    const catY = this.charPreviewSprite ? this.charPreviewSprite.y : 300;
    const s = 1.4;
    const packX = catX - 22;
    const packY = catY + 8;

    this.menuJetpack.fillStyle(0x5d6573, 0.96);
    this.menuJetpack.fillRoundedRect(packX - 8 * s, packY - 10 * s, 16 * s, 20 * s, 3 * s);
    this.menuJetpack.fillStyle(0x93a3b8, 1);
    this.menuJetpack.fillRect(packX - 3 * s, packY - 5 * s, 6 * s, 8 * s);

    const flicker = 0.8 + Math.sin(time * 0.018) * 0.2;
    const flameLen = 26 * flicker;

    this.menuJetpackFlames.fillStyle(0xffb347, 0.94);
    this.menuJetpackFlames.fillTriangle(packX - 5, packY + 13, packX + 1, packY + 13, packX - 2, packY + 13 + flameLen);
    this.menuJetpackFlames.fillTriangle(packX - 1, packY + 13, packX + 5, packY + 13, packX + 2, packY + 13 + flameLen);
    this.menuJetpackFlames.fillStyle(0xfff2c7, 0.82);
    this.menuJetpackFlames.fillTriangle(packX - 4, packY + 14, packX, packY + 14, packX - 2, packY + 10 + flameLen * 0.65);
    this.menuJetpackFlames.fillTriangle(packX, packY + 14, packX + 4, packY + 14, packX + 2, packY + 10 + flameLen * 0.65);
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
      this.refreshSelectedCatSize();
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
      if (this.selectedMap === 'moon' && value === 'day') {
        this.selectOption('theme', 'night');
        return;
      }
      this.selectedTheme = value;
      this.updateMenuBackdrop();
    }, panelCX - 320);
    this.createOptionRow('map', ['city', 'desert', 'beach', 'moon'], MAP_OPTIONS, panelY + 23, (value) => {
      this.selectedMap = value;
      this.updateThemeAvailabilityForMap(value);
      if (value === 'moon' && this.selectedTheme !== 'night') {
        this.selectOption('theme', 'night');
        return;
      }
      this.updateMenuBackdrop();
    }, panelCX + 170);

    // --- Row 4: Enemies (left) + Size reset (right) ---
    lbl(panelCX - 270, panelY + 58, 'Enemies');
    lbl(panelCX + 285, panelY + 58, 'Size');
    this.createOptionRow('enemies', ['zombies', 'vampires', 'off'], ENEMY_OPTIONS, panelY + 80, (value) => {
      this.selectedEnemyType = value;
      this.selectedZombies = value === 'off' ? 'off' : 'on';
    }, panelCX - 270, 128, 115);

    this.resetSizeButton = this.add.rectangle(panelCX + 285, panelY + 80, 148, 32, 0x283c5c, 1)
      .setDepth(17).setStrokeStyle(2, 0x89b8ff, 0.7)
      .setInteractive({ useHandCursor: true });
    this.resetSizeText = this.add.text(panelCX + 285, panelY + 80, 'Reset Size', {
      ...TEXT_STYLE, fontSize: '15px', color: '#e2f0ff', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(18);
    this.resetSizeButton.on('pointerover', () => this.resetSizeButton.setFillStyle(0x33517a));
    this.resetSizeButton.on('pointerout', () => this.resetSizeButton.setFillStyle(0x283c5c));
    this.resetSizeButton.on('pointerdown', () => this.resetSelectedCharacterGrowth());

    // --- Start button ---
    this.startButton = this.add.rectangle(panelCX, panelY + 116, 290, 42, 0x4d596b, 1)
      .setDepth(17).setStrokeStyle(3, 0x9bc4ff, 0.5);
    this.startText = this.add.text(panelCX, panelY + 116, 'Select All Options', {
      ...TEXT_STYLE, fontSize: '20px', color: '#c6d0dd', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(18);
    this.startButton.setInteractive({ useHandCursor: true });
    this.startButton.on('pointerdown', () => { if (this.canStart()) this._start(); });

    this.updateStartButtonState();
  }

  updateThemeAvailabilityForMap(mapKey) {
    const row = this.optionButtons.theme || [];
    const dayEntry = row.find(e => e.key === 'day');
    if (!dayEntry) {
      return;
    }

    const moonLocked = mapKey === 'moon';
    dayEntry.box.alpha = moonLocked ? 0.35 : 1;
    dayEntry.text.alpha = moonLocked ? 0.5 : 1;
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
    this.updateStartButtonState();
  }

  canStart() {
    return !!(this.selectedCharacter && this.selectedMode && this.selectedTheme &&
      this.selectedMap && this.selectedEnemyType);
  }

  updateStartButtonState() {
    if (this.canStart()) {
      this.startButton.setFillStyle(0xff9a3d);
      this.startText.setText('Start Game');
      this.startText.setColor('#111111');
    } else {
      this.startButton.setFillStyle(0x4d596b);
      this.startText.setText('Select All Options');
      this.startText.setColor('#c6d0dd');
    }
  }

  getGrowthKey(characterKey) {
    return `${GROWTH_SAVE_PREFIX}${characterKey}`;
  }

  getGrowthForCharacter(characterKey) {
    if (!characterKey) {
      return 1;
    }

    try {
      const raw = localStorage.getItem(this.getGrowthKey(characterKey));
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.sizeMultiplier ? Math.max(1, parsed.sizeMultiplier) : 1;
    } catch (_err) {
      return 1;
    }
  }

  refreshSelectedCatSize() {
    if (!this.charPreviewSize) {
      return;
    }
    const size = this.getGrowthForCharacter(this.selectedCharacter);
    this.charPreviewSize.setText(`Size: ${size.toFixed(2)}x`);
  }

  resetSelectedCharacterGrowth() {
    if (!this.selectedCharacter) {
      return;
    }
    try {
      localStorage.removeItem(this.getGrowthKey(this.selectedCharacter));
    } catch (_err) {
      // ignore storage availability issues
    }
    this.refreshSelectedCatSize();
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

  update(time) {
    this.updateMenuJetpack(time);
  }

  _start() {
    this.scene.start('MainScene', {
      character: this.selectedCharacter,
      mode: this.selectedMode,
      theme: this.selectedTheme,
      map: this.selectedMap,
      zombies: this.selectedZombies === 'on',
      enemyType: this.selectedEnemyType,
      runMode: 'growth-only',
    });
  }
}
