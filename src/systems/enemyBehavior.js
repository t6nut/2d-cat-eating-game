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

  zombie.growthScale = Math.max(1, (zombie.growthScale || 1) + 0.08 * value);
  zombie.setScale(zombie.growthScale);
  // Speed intentionally unchanged when enemy grows from eating
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
    const enemyScale = Math.max(1, zombie.growthScale || 1);
    const stompBonus = 2 * enemyScale;
    scene.showCatchPopup(kitten.x, kitten.y - 38, `CHOMP! +${stompBonus.toFixed(1)}`);
    scene.playZombieStompSound();
    scene.playEatSound(stompBonus);
    scene.foodPoints += stompBonus;
    scene.foodCaught += 1;
    scene.sizeMultiplier = applyGrowthDelta(scene.sizeMultiplier, 0.2 * enemyScale);
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

  zombie.growthScale = Math.max(1, (zombie.growthScale || 1) + 0.12);
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
  if (enemy.hpBar) {
    enemy.hpBar.destroy();
    enemy.hpBar = null;
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
      // vampireLightMs intentionally NOT reset — player progress is kept
      zombie.laserBurnMs = 0;
      // Keep HP bar visible at dim level if vampire has accumulated damage
      if (zombie.enemyType === 'vampire' && (zombie.vampireLightMs || 0) > 0) {
        _drawVampireHpBar(scene, zombie, false);
      }
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
        if (zombie.vampireLightMs >= 500) {
          scene.burnVampireToAsh(zombie);
          continue;
        }
      }
      if (!zombie.litStopped) {
        zombie.litStopped = true;
        zombie.setVelocityX(0);
        zombie.setTint(dayLaser ? 0xff5d5d : zombie.enemyType === 'vampire' ? 0xffb38f : 0xe9f6ff);
      }
      if (!dayLaser && zombie.enemyType === 'vampire') {
        _drawVampireHpBar(scene, zombie, true);
      }
    } else if (zombie.litStopped) {
      zombie.litStopped = false;
      zombie.clearTint();
      if (!dayLaser && zombie.enemyType === 'vampire') {
        zombie.setTint(0xd8c3ff);
        // HP NOT decayed — damage is kept
      }
      zombie.laserBurnMs = Math.max(0, (zombie.laserBurnMs || 0) - delta * 1.3);
      zombie.setVelocityX(zombie.moveDir * zombie.moveSpeed);
      if (!dayLaser && zombie.enemyType === 'vampire' && (zombie.vampireLightMs || 0) > 0) {
        _drawVampireHpBar(scene, zombie, false);
      }
    } else if (dayLaser && zombie.laserBurnMs > 0) {
      zombie.laserBurnMs = Math.max(0, zombie.laserBurnMs - delta * 1.3);
    } else if (!dayLaser && zombie.enemyType === 'vampire' && (zombie.vampireLightMs || 0) > 0) {
      _drawVampireHpBar(scene, zombie, false);
    }
  }
}

function _drawVampireHpBar(scene, zombie, isActiveLit) {
  if (!zombie.hpBar) {
    zombie.hpBar = scene.add.graphics().setDepth(10);
  }
  const barW = 40;
  const barH = 6;
  const bx = zombie.x - barW / 2;
  const by = zombie.y + zombie.displayHeight * 0.55 + 4;
  const fill = Math.max(0, 1 - (zombie.vampireLightMs || 0) / 500);
  zombie.hpBar.clear();
  zombie.hpBar.fillStyle(0x110000, isActiveLit ? 0.9 : 0.55);
  zombie.hpBar.fillRect(bx, by, barW, barH);
  const hpColor = fill > 0.5 ? 0xff3333 : fill > 0.2 ? 0xff8800 : 0xffdd00;
  zombie.hpBar.fillStyle(hpColor, isActiveLit ? 0.95 : 0.5);
  zombie.hpBar.fillRect(bx + 1, by + 1, Math.max(0, (barW - 2) * fill), barH - 2);
}

export function updateZombieGroundingAndAccessories(scene) {
  const zombies = scene.zombieGroup.getChildren();
  const pizzas = scene.pizzaGroup ? scene.pizzaGroup.getChildren() : [];
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

    // Keep enemies planted using the same sync path used elsewhere.
    scene.syncEnemyBody(zombie);

    // Retarget every frame: nearest fallen pizza first, otherwise chase the cat.
    if (!zombie.litStopped) {
      let targetX = scene.kitten ? scene.kitten.x : zombie.x;
      let nearestDist = Number.POSITIVE_INFINITY;

      for (let j = 0; j < pizzas.length; j += 1) {
        const food = pizzas[j];
        if (!food?.active || food.caught || !food.onGround) {
          continue;
        }
        const dist = Math.abs(food.x - zombie.x);
        if (dist < nearestDist) {
          nearestDist = dist;
          targetX = food.x;
        }
      }

      const dx = targetX - zombie.x;
      if (Math.abs(dx) < 4) {
        zombie.setVelocityX(0);
      } else {
        zombie.moveDir = dx > 0 ? 1 : -1;
        zombie.setFlipX(zombie.moveDir < 0);
        zombie.setVelocityX(zombie.moveDir * zombie.moveSpeed);
      }

      const speedAbs = Math.abs(zombie.body.velocity.x);
      if (speedAbs > 10) {
        zombie.walkAnimTime = (zombie.walkAnimTime || 0) + scene.game.loop.delta;
        if (zombie.walkAnimTime >= 160) {
          zombie.walkAnimTime = 0;
          zombie.walkAnimFrame = zombie.walkAnimFrame === 0 ? 1 : 0;
        }
      } else {
        zombie.walkAnimFrame = 0;
      }

      const frameSuffix = zombie.walkAnimFrame === 0 ? '1' : '2';
      const baseName = zombie.enemyType === 'vampire' ? 'vampireWalker' : 'zombieWalker';
      const desiredTexture = `${baseName}${frameSuffix}`;
      if (zombie.texture?.key !== desiredTexture) {
        zombie.setTexture(desiredTexture);
      }
    }

    if (dayMode && zombie.enemyType === 'vampire') {
      if (!zombie.umbrella || !zombie.umbrella.active) {
        zombie.umbrella = scene.add.graphics().setDepth(8);
      }
      const umb = zombie.umbrella;
      const x = zombie.body.center.x;
      const y = groundTop - 18 * (zombie.growthScale || 1);
      const scale = Math.max(1, zombie.growthScale || 1);
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
  if (scene.textures.exists('zombieWalker1') && scene.textures.exists('zombieWalker2')) {
    return;
  }
  const drawZombie = (g, leftLegY, rightLegY) => {
    g.clear();
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
    g.fillRect(7, leftLegY, 6, 2);
    g.fillRect(19, rightLegY, 6, 2);
  };

  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  drawZombie(g, 22, 20);
  g.generateTexture('zombieWalker1', 32, 26);
  drawZombie(g, 20, 22);
  g.generateTexture('zombieWalker2', 32, 26);
  if (!scene.textures.exists('zombieWalker')) {
    drawZombie(g, 22, 20);
    g.generateTexture('zombieWalker', 32, 26);
  }
  g.destroy();
}

export function ensureVampireTexture(scene) {
  if (scene.textures.exists('vampireWalker1') && scene.textures.exists('vampireWalker2')) {
    return;
  }
  const drawVampire = (g, leftLegY, rightLegY) => {
    g.clear();
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
    g.fillStyle(0x220f2e, 0.95);
    g.fillRect(13, 17, 6, 1);
    g.fillStyle(0xffffff, 1);
    g.fillRect(13, 18, 1, 3);
    g.fillRect(18, 18, 1, 3);
    g.fillStyle(0x3f284f, 1);
    g.fillRect(7, leftLegY, 6, 2);
    g.fillRect(19, rightLegY, 6, 2);
  };

  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  drawVampire(g, 22, 20);
  g.generateTexture('vampireWalker1', 32, 26);
  drawVampire(g, 20, 22);
  g.generateTexture('vampireWalker2', 32, 26);
  if (!scene.textures.exists('vampireWalker')) {
    drawVampire(g, 22, 20);
    g.generateTexture('vampireWalker', 32, 26);
  }
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
