/**
 * Shared utilities for all scenes.
 */

/**
 * Draw a night-sky cityscape background using Phaser Graphics.
 * Must be called inside a Scene's create() method.
 * @param {Phaser.Scene} scene
 * @param {number} W  World width in px
 * @param {number} H  World height in px
 */
export function drawNightBackground(scene, W, H) {
  const g = scene.add.graphics();
  g.setDepth(0);

  // Sky — three-band gradient approximation
  g.fillStyle(0x060b1e, 1);
  g.fillRect(0, 0, W, H * 0.45);
  g.fillStyle(0x102050, 1);
  g.fillRect(0, H * 0.45, W, H * 0.15);
  g.fillStyle(0x1a3a8a, 1);
  g.fillRect(0, H * 0.60, W, H * 0.15);

  // Stars (seeded so they stay consistent each restart)
  const rng = new Phaser.Math.RandomDataGenerator(['starSeed42']);
  for (let i = 0; i < 120; i++) {
    const x = rng.between(0, W);
    const y = rng.between(0, Math.floor(H * 0.68));
    const big = rng.frac() < 0.18;
    g.fillStyle(0xffffff, rng.realInRange(0.25, 1.0));
    g.fillRect(x, y, big ? 2 : 1, big ? 2 : 1);
  }

  // Building silhouettes
  const bldgs = [
    { x: 0,   w: 78,  h: 138, col: 0x101828 },
    { x: 88,  w: 98,  h: 178, col: 0x14203c },
    { x: 208, w: 58,  h: 118, col: 0x1a2a4c },
    { x: 288, w: 108, h: 198, col: 0x0e1a30 },
    { x: 428, w: 84,  h: 148, col: 0x101828 },
    { x: 538, w: 64,  h: 126, col: 0x14203c },
    { x: 624, w: 116, h: 212, col: 0x0c1624 },
    { x: 768, w: 76,  h: 146, col: 0x1a2a4c },
  ];

  for (const b of bldgs) {
    const bTop = Math.floor(H * 0.75) - b.h;
    g.fillStyle(b.col, 1);
    g.fillRect(b.x, bTop, b.w, b.h);
    // Lit windows (deterministic)
    for (let wy = bTop + 10; wy < Math.floor(H * 0.75) - 12; wy += 20) {
      for (let wx = b.x + 6; wx < b.x + b.w - 6; wx += 14) {
        if ((wx * 7 + wy * 13) % 17 > 6) {
          g.fillStyle(0xfff4aa, 0.45);
          g.fillRect(wx, wy, 6, 8);
        }
      }
    }
  }

  // Ground
  g.fillStyle(0x4a8c3c, 1);
  g.fillRect(0, Math.floor(H * 0.75), W, H - Math.floor(H * 0.75));
  // Bright grass edge
  g.fillStyle(0x5ab040, 1);
  g.fillRect(0, Math.floor(H * 0.75), W, 8);
  // Darker sub-layer
  g.fillStyle(0x3a6c28, 1);
  g.fillRect(0, Math.floor(H * 0.75) + 8, W, 6);
  // Pixel-art grass tufts
  g.fillStyle(0x68c050, 1);
  for (let gx = 4; gx < W; gx += 20) {
    g.fillRect(gx,      Math.floor(H * 0.75) - 4, 4, 4);
    g.fillRect(gx + 8,  Math.floor(H * 0.75) - 8, 4, 8);
    g.fillRect(gx + 14, Math.floor(H * 0.75) - 4, 4, 4);
  }
}

/** Pixel-font-style text config used across scenes. */
export const TEXT_STYLE = {
  fontFamily: '"Courier New", Courier, monospace',
  stroke: '#000000',
  strokeThickness: 5,
};
