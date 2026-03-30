import { applyGrowthDelta } from './catGrowth.js';

export function handleZombieEatFood(scene, objA, objB) {
  const zombie = scene.zombieGroup && scene.zombieGroup.contains(objA) ? objA : objB;
  const food = scene.pizzaGroup && scene.pizzaGroup.contains(objA) ? objA : objB;

  if (!zombie || !food || !scene.zombieGroup.contains(zombie) || !scene.pizzaGroup.contains(food)) {
    return;
  }

  if (!zombie.active || !zombie.alive || !food.active || food.caught) {
    return;
  }

  food.caught = true;
  if (food.groundTimer) {
    food.groundTimer.remove(false);
    food.groundTimer = null;
  }

  const value = scene.getGroundAdjustedFoodValue(food);
  scene.destroyDropShadow(food);
  food.disableBody(true, true);
  scene.playEnemyEatSound(value);

  zombie.growthScale = Phaser.Math.Clamp((zombie.growthScale || 1) + 0.08 * value, 1, 2.6);
  zombie.setScale(zombie.growthScale);
  zombie.moveSpeed = Phaser.Math.Clamp((zombie.moveSpeed || 0) * 1.3, 40, 320);
  scene.syncEnemyBody(zombie);
  if (zombie.body) {
    zombie.body.velocity.y = 0;
    zombie.body.y = scene.getGroundSurfaceY() - zombie.body.height;
  }
  if (!zombie.litStopped) {
    zombie.setVelocityX(zombie.moveDir * zombie.moveSpeed);
  }
}

export function handleZombieCollision(scene, kitten, zombie) {
  if (!zombie.active || !zombie.alive) {
    return;
  }

  const stomped = scene.kittenPrevVelY > 120;
  if (stomped) {
    zombie.alive = false;
    if (zombie.shadow) {
      zombie.shadow.destroy();
      zombie.shadow = null;
    }
    if (zombie.umbrella) {
      zombie.umbrella.destroy();
      zombie.umbrella = null;
    }
    zombie.disableBody(true, true);
    kitten.setVelocityY(-220);
    scene.showCatchPopup(kitten.x, kitten.y - 38, 'CHOMP!');
    scene.playZombieStompSound();
    scene.playEatSound(2);
    scene.foodPoints += 2;
    scene.foodCaught += 1;
    scene.sizeMultiplier = applyGrowthDelta(scene.sizeMultiplier, 0.2);
    scene.kitten.setScale(scene.sizeMultiplier);
    scene.syncKittenBodyToFeet();
    scene.eatCooldown = 160;
    scene.kitten.setTexture(scene.kittenSkin.eat);
    scene.updateHud();
    scene.saveCharacterState();
    return;
  }

  if (scene.zombieHitCooldown > 0) {
    return;
  }

  scene.zombieHitCooldown = 450;
  scene.foodPoints = Math.max(0, scene.foodPoints - 2);
  scene.sizeMultiplier = applyGrowthDelta(scene.sizeMultiplier, -0.2);
  scene.kitten.setScale(scene.sizeMultiplier);
  scene.syncKittenBodyToFeet();
  kitten.setVelocityX(kitten.x < zombie.x ? -220 : 220);
  scene.updateHud();
  scene.showCatchPopup(kitten.x, kitten.y - 45, 'OUCH!');

  zombie.growthScale = Phaser.Math.Clamp((zombie.growthScale || 1) + 0.12, 1, 2.6);
  zombie.setScale(zombie.growthScale);
  scene.syncEnemyBody(zombie);

  scene.saveCharacterState();
}

export function burnVampireToAsh(scene, enemy) {
  if (!enemy.active || !enemy.alive) {
    return;
  }
  enemy.alive = false;
  if (enemy.shadow) {
    enemy.shadow.destroy();
    enemy.shadow = null;
  }
  if (enemy.umbrella) {
    enemy.umbrella.destroy();
    enemy.umbrella = null;
  }
  const ash = scene.add.sprite(enemy.x, enemy.y + 5, 'vampireAsh').setDepth(7);
  scene.tweens.add({
    targets: ash,
    alpha: 0,
    y: enemy.y + 12,
    duration: 900,
    onComplete: () => ash.destroy(),
  });
  enemy.disableBody(true, true);
  scene.showCatchPopup(scene.kitten.x, scene.kitten.y - 34, 'VAMPIRE ASH!');
}

export function cleanupZombies(scene, worldWidth) {
  const children = scene.zombieGroup.getChildren();
  for (let i = 0; i < children.length; i += 1) {
    const zombie = children[i];
    if (zombie.active && (zombie.x < -60 || zombie.x > worldWidth + 60)) {
      if (zombie.shadow) {
        zombie.shadow.destroy();
        zombie.shadow = null;
      }
      if (zombie.umbrella) {
        zombie.umbrella.destroy();
        zombie.umbrella = null;
      }
      zombie.disableBody(true, true);
    }
  }
}

export function updateZombieLightEffect(scene, delta) {
  const zombies = scene.zombieGroup.getChildren();
  const nightBeam = scene.currentThemeKey === 'night' && scene.flashlightOn && scene.flashlightBattery > 0;
  const dayLaser = scene.currentThemeKey === 'day' && scene.flashlightOn && scene.flashlightBattery > 0;
  const lightActive = nightBeam || dayLaser;

  for (let i = 0; i < zombies.length; i += 1) {
    const zombie = zombies[i];
    if (!zombie.active || !zombie.alive) {
      continue;
    }

    if (!lightActive) {
      if (zombie.litStopped) {
        zombie.litStopped = false;
        zombie.clearTint();
        if (zombie.enemyType === 'vampire') {
          zombie.setTint(0xd8c3ff);
        }
        zombie.setVelocityX(zombie.moveDir * zombie.moveSpeed);
      }
      zombie.vampireLightMs = 0;
      zombie.laserBurnMs = 0;
      continue;
    }

    const dx = (zombie.x - scene.flashlightTip.x) * scene.flashlightDir;
    const dy = Math.abs(zombie.y - scene.flashlightTip.y);
    const inFront = dx > 0 && dx <= scene.flashlightLength;
    const coneHalfAtDepth = (dx / scene.flashlightLength) * scene.flashlightHalfWidth + 10;
    const lit = inFront && dy <= coneHalfAtDepth;

    if (lit) {
      if (dayLaser) {
        zombie.laserBurnMs = (zombie.laserBurnMs || 0) + delta;
        if (zombie.laserBurnMs >= 1200) {
          scene.burnVampireToAsh(zombie);
          continue;
        }
      } else if (zombie.enemyType === 'vampire') {
        zombie.vampireLightMs = (zombie.vampireLightMs || 0) + delta;
        if (zombie.vampireLightMs >= 3000) {
          scene.burnVampireToAsh(zombie);
          continue;
        }
      }
      if (!zombie.litStopped) {
        zombie.litStopped = true;
        zombie.setVelocityX(0);
        zombie.setTint(dayLaser ? 0xff5d5d : zombie.enemyType === 'vampire' ? 0xffb38f : 0xe9f6ff);
      }
    } else if (zombie.litStopped) {
      zombie.litStopped = false;
      zombie.clearTint();
      if (!dayLaser && zombie.enemyType === 'vampire') {
        zombie.setTint(0xd8c3ff);
        zombie.vampireLightMs = Math.max(0, (zombie.vampireLightMs || 0) - delta * 1.2);
      }
      zombie.laserBurnMs = Math.max(0, (zombie.laserBurnMs || 0) - delta * 1.3);
      zombie.setVelocityX(zombie.moveDir * zombie.moveSpeed);
    } else if (!dayLaser && zombie.enemyType === 'vampire' && zombie.vampireLightMs > 0) {
      zombie.vampireLightMs = Math.max(0, zombie.vampireLightMs - delta * 1.2);
    } else if (dayLaser && zombie.laserBurnMs > 0) {
      zombie.laserBurnMs = Math.max(0, zombie.laserBurnMs - delta * 1.3);
    }
  }
}

export function updateZombieGroundingAndAccessories(scene) {
  const zombies = scene.zombieGroup.getChildren();
  const dayMode = scene.currentThemeKey === 'day';
    const groundTop = scene.getGroundSurfaceY();

  for (let i = 0; i < zombies.length; i += 1) {
    const zombie = zombies[i];
    if (!zombie?.active || !zombie.body) {
      if (zombie?.umbrella) {
        zombie.umbrella.destroy();
        zombie.umbrella = null;
      }
      continue;
    }

    // Keep enemy grounding body-driven to avoid sprite/body divergence.
      // Keep enemies planted using the same sync path used elsewhere.
      scene.syncEnemyBody(zombie);

    if (dayMode && zombie.enemyType === 'vampire') {
      if (!zombie.umbrella || !zombie.umbrella.active) {
        zombie.umbrella = scene.add.graphics().setDepth(8);
      }
      const umb = zombie.umbrella;
      const x = zombie.body.center.x;
      const y = groundTop - 18 * (zombie.growthScale || 1);
      const scale = Phaser.Math.Clamp(zombie.growthScale || 1, 1, 2.6);
      umb.clear();
      umb.fillStyle(0x1f1f1f, 0.95);
      umb.fillEllipse(x, y, 20 * scale, 8 * scale);
      umb.fillStyle(0x2f2f2f, 1);
      umb.fillRect(x - scale, y - 1, 2 * scale, 12 * scale);
    } else if (zombie.umbrella) {
      zombie.umbrella.destroy();
      zombie.umbrella = null;
    }
  }
}

export function ensureZombieTexture(scene) {
  if (scene.textures.exists('zombieWalker')) {
    return;
  }
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
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

export function ensureVampireTexture(scene) {
  if (scene.textures.exists('vampireWalker')) {
    return;
  }
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x726093, 1);
  g.fillRect(6, 8, 20, 14);
  g.fillStyle(0x4f396e, 1);
  g.fillRect(8, 4, 16, 4);
  g.fillStyle(0xf1d7d7, 1);
  g.fillRect(10, 12, 4, 4);
  g.fillRect(18, 12, 4, 4);
  g.fillStyle(0x220f2e, 1);
  g.fillRect(11, 13, 1, 1);
  g.fillRect(19, 13, 1, 1);
  g.fillStyle(0xffffff, 1);
  g.fillRect(13, 16, 1, 2);
  g.fillRect(18, 16, 1, 2);
  g.fillStyle(0x3f284f, 1);
  g.fillRect(7, 22, 6, 2);
  g.fillRect(19, 22, 6, 2);
  g.generateTexture('vampireWalker', 32, 26);
  g.destroy();
}

export function ensureAshTexture(scene) {
  if (scene.textures.exists('vampireAsh')) {
    return;
  }
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xb9b9b9, 1);
  g.fillRect(8, 16, 10, 4);
  g.fillStyle(0x8d8d8d, 1);
  g.fillRect(10, 13, 6, 3);
  g.fillStyle(0x6f6f6f, 1);
  g.fillRect(11, 11, 4, 2);
  g.generateTexture('vampireAsh', 24, 24);
  g.destroy();
}
