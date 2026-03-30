import { computeBodyFromDisplay } from './hitboxUtils.js';

export function getGroundSurfaceY(scene) {
  if (scene.ground && scene.ground.body) {
    return scene.ground.body.top;
  }
  return scene.ground.y - scene.ground.displayHeight * 0.5;
}

export function syncKittenBodyToFeet(scene) {
  if (!scene.kitten || !scene.kitten.body) {
    return;
  }

  const body = scene.kitten.body;
  // Use SOURCE (unscaled) frame dimensions — Phaser's setSize / setOffset
  // work in source pixels and are multiplied by the sprite's scale internally.
  // Passing displayWidth/Height (already scaled) caused double-scaling that
  // made the body grow quadratically, pushing the sprite above the ground.
  const hitbox = computeBodyFromDisplay(scene.kitten.width, scene.kitten.height, {
    widthRatio: 0.5,
    heightRatio: 0.5,
    minWidth: 14,
    minHeight: 10,
    bottomPadRatio: 2 / 24,
  });
  body.setSize(hitbox.bodyW, hitbox.bodyH, false);
  body.setOffset(hitbox.offsetX, hitbox.offsetY);
}

export function syncEnemyBody(scene, enemy) {
  if (!enemy || !enemy.body) {
    return;
  }
  // Use SOURCE (unscaled) frame dimensions — same fix as syncKittenBodyToFeet.
  const hitbox = computeBodyFromDisplay(enemy.width, enemy.height, {
    widthRatio: 0.5,
    heightRatio: 0.46,
    minWidth: 14,
    minHeight: 10,
    bottomPadRatio: 2 / 26,
  });
  enemy.body.setSize(hitbox.bodyW, hitbox.bodyH, false);
  enemy.body.setOffset(hitbox.offsetX, hitbox.offsetY);
}

export function updateKittenMovement(scene, delta) {
  const leftDown = scene.cursors.left.isDown || scene.wasd.A.isDown;
  const rightDown = scene.cursors.right.isDown || scene.wasd.D.isDown;
  const jumpPressed = Phaser.Input.Keyboard.JustDown(scene.cursors.up) || Phaser.Input.Keyboard.JustDown(scene.wasd.W);
  const accel = 1450;

  if (jumpPressed && (scene.kitten.body.blocked.down || scene.kitten.body.touching.down)) {
    scene.kitten.setVelocityY(scene.jumpVelocity);
  }

  if (scene.currentMapKey === 'moon' && scene.jetpackKey.isDown && scene.jetpackFuel > 0) {
    const lift = scene.jetpackThrustPerSec * (delta / 1000);
    scene.kitten.setVelocityY(Math.max(scene.jetpackMaxLiftSpeed, scene.kitten.body.velocity.y - lift));
  }

  if (leftDown && !rightDown) {
    scene.kitten.setAccelerationX(-accel);
    scene.kitten.setFlipX(false);
    scene.lastMoveDir = -1;
    scene.facingDir = -1;
    if (scene.eatCooldown <= 0) {
      scene.kitten.setTexture(scene.kittenSkin.run);
    }
  } else if (rightDown && !leftDown) {
    scene.kitten.setAccelerationX(accel);
    scene.kitten.setFlipX(true);
    scene.lastMoveDir = 1;
    scene.facingDir = 1;
    if (scene.eatCooldown <= 0) {
      scene.kitten.setTexture(scene.kittenSkin.run);
    }
  } else {
    scene.kitten.setAccelerationX(0);
    if (scene.eatCooldown <= 0) {
      scene.kitten.setTexture(scene.kittenSkin.idle);
    }
  }

  if (scene.eatCooldown > 0) {
    scene.eatCooldown -= delta;
    if (scene.eatCooldown <= 0) {
      scene.kitten.setTexture(scene.kittenSkin.idle);
    }
  }
}
