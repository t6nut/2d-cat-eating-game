import { applyGrowthDelta, clampCatSize, computeGrowthDelta } from './catGrowth.js';

export function schedulePizzaDrops(scene) {
  if (scene.pizzaSpawnEvent) {
    scene.pizzaSpawnEvent.remove(false);
  }

  const mode = scene.getCurrentMode();
  const delay = Phaser.Math.Clamp(
    mode.dropDelayBase - scene.foodCaught * mode.dropRamp,
    mode.dropDelayMin,
    mode.dropDelayBase,
  );

  scene.pizzaSpawnEvent = scene.time.addEvent({ delay, loop: true, callback: scene.spawnFood, callbackScope: scene });
}

export function spawnFood(scene) {
  scene.spawnSliceFromHelicopter();
}

export function spawnSliceFromHelicopter(scene, worldWidth) {
  const mode = scene.getCurrentMode();
  const moonFallScale = scene.currentMapKey === 'moon' ? 1 / 3 : 1;
  const variance = Phaser.Math.Clamp(34 + scene.foodCaught * 0.7, 34, 140);
  const x = Phaser.Math.Clamp(scene.chefHeli.x + Phaser.Math.Between(-variance, variance), 24, worldWidth - 24);

  // Animate chef arm/hand toss instead of wobbling the entire oven sprite.
  if (scene.currentMapKey !== 'moon' && typeof scene.playChefTossAnimation === 'function') {
    scene.playChefTossAnimation();
  }

  const food = scene.pizzaGroup.get(x, scene.chefHeli.y + 34, 'pizza');
  if (!food) {
    return;
  }

  food.foodValue = 1;
  food.baseFoodValue = 1;
  food.sourceType = 'slice';
  food.caught = false;
  food.onGround = false;
  food.groundTimer = null;
  food.groundStartValue = null;
  food.groundLandedAt = 0;
  food.fadeTween = null;
  food.alpha = 1;
  food.setTexture('pizza');
  food.setActive(true);
  food.setVisible(true);
  food.body.enable = true;
  food.body.setAllowGravity(true);
  food.setScale(mode.foodScale);
  food.setVelocity(Phaser.Math.Between(-30, 30), Phaser.Math.Between(mode.minFallVelocity, mode.maxFallVelocity) * moonFallScale);
  food.setGravityY(600 * mode.gravityScale * moonFallScale);
  food.setAngularVelocity(Phaser.Math.Between(-65, 65));
  food.setDepth(7);
  scene.attachDropShadow(food, 34, 10, 0.15);
}

export function launchAirplaneBigPizza(scene, worldWidth) {
  const mode = scene.getCurrentMode();
  const moonFallScale = scene.currentMapKey === 'moon' ? 1 / 3 : 1;
  scene.airplaneActive = true;
  const fromLeft = Math.random() > 0.5;
  const startX = fromLeft ? -120 : worldWidth + 120;
  const endX = fromLeft ? worldWidth + 120 : -120;

  scene.pizzaPlane.setVisible(true);
  scene.pizzaPlane.setPosition(startX, 125 + Phaser.Math.Between(-12, 12));
  scene.pizzaPlane.setFlipX(!fromLeft);
  const duration = Math.round(2600 * mode.airplaneDurationScale);
  scene.playAirplaneSound(duration);
  scene.tweens.add({
    targets: scene.pizzaPlane,
    x: endX,
    duration,
    ease: 'Sine.easeInOut',
    onComplete: () => {
      scene.airplaneActive = false;
      scene.pizzaPlane.setVisible(false);
    },
  });

  scene.time.delayedCall(Math.round(duration * 0.46), () => {
    scene.playDogBarkSound();
    let food = scene.pizzaGroup.get(scene.pizzaPlane.x, scene.pizzaPlane.y + 16, 'pizzaWhole');
    if (!food) {
      // Pool is full — recycle the first inactive or on-ground item so the
      // bonus delivery always arrives even under heavy food load.
      const stale = scene.pizzaGroup.getChildren().find(f => !f.active || f.onGround);
      if (stale) {
        stale.setActive(false).setVisible(false);
        food = scene.pizzaGroup.get(scene.pizzaPlane.x, scene.pizzaPlane.y + 16, 'pizzaWhole');
      }
      if (!food) return;
    }
    food.foodValue = 5;
    food.baseFoodValue = 5;
    food.sourceType = 'whole';
    food.caught = false;
    food.onGround = false;
    food.groundTimer = null;
    food.groundStartValue = null;
    food.groundLandedAt = 0;
    food.fadeTween = null;
    food.alpha = 1;
    food.setTexture('pizzaWhole');
    food.setActive(true);
    food.setVisible(true);
    food.body.enable = true;
    food.body.setAllowGravity(true);
    food.setScale(mode.foodScale * 1.18);
    food.setVelocity(Phaser.Math.Between(-20, 20), Phaser.Math.Between(mode.minFallVelocity - 10, mode.maxFallVelocity - 16) * moonFallScale);
    food.setGravityY(600 * mode.gravityScale * 0.9 * moonFallScale);
    food.setAngularVelocity(Phaser.Math.Between(-55, 55));
    food.setDepth(7);
    scene.attachDropShadow(food, 42, 12, 0.16);

    const batteryDropX = scene.pizzaPlane.x + (fromLeft ? -85 : 85);
    if (scene.currentMapKey === 'moon') {
      scene.spawnFuelDrop(batteryDropX, scene.pizzaPlane.y - 22, fromLeft ? -1 : 1);
    } else if (scene.currentEnemyType !== 'off') {
      scene.spawnBatteryDrop(batteryDropX, scene.pizzaPlane.y - 22, fromLeft ? -1 : 1);
    }
  });
}

export function handleFoodHitGround(scene, objA, objB) {
  const food = scene.pizzaGroup && scene.pizzaGroup.contains(objA) ? objA : objB;

  if (!food || !scene.pizzaGroup.contains(food)) {
    return;
  }

  if (!food.active || food.caught || food.onGround) {
    return;
  }

  food.onGround = true;
  food.groundStartValue = food.foodValue || 1;
  food.groundLandedAt = scene.time.now;
  food.alpha = 1;
  if (food.fadeTween) {
    food.fadeTween.stop();
    food.fadeTween = null;
  }
  food.fadeTween = scene.tweens.add({
    targets: food,
    alpha: 0.12,
    duration: 3000,
    ease: 'Linear',
  });
  food.setAngularVelocity(0);
  if (food.body && food.body.velocity) {
    food.body.velocity.x *= 0.2;
    food.body.velocity.y = 0;
  }

  food.groundTimer = scene.time.delayedCall(3000, () => {
    if (food.active && !food.caught) {
      scene.destroyDropShadow(food);
      food.disableBody(true, true);
    }
  });
}

export function getGroundAdjustedFoodValue(scene, food) {
  if (!food || !food.onGround || !food.groundLandedAt) {
    return food?.foodValue || 1;
  }

  const startValue = food.groundStartValue || food.foodValue || 1;
  const elapsed = Phaser.Math.Clamp(scene.time.now - food.groundLandedAt, 0, 3000);
  const t = elapsed / 3000;
  return Phaser.Math.Linear(startValue, startValue * 0.5, t);
}

export function handlePizzaCaught(scene, kitten, food) {
  if (food.caught) {
    return;
  }

  food.caught = true;
  food.body.enable = false;
  food.foodValue = scene.getGroundAdjustedFoodValue(food);
  food.setVelocity(0, 0);
  food.setAngularVelocity(0);
  food.setDepth(12);

  scene.playCatchSound(food.foodValue || 1);

  const mouthX = kitten.x + scene.facingDir * 16 * scene.sizeMultiplier;
  const mouthY = kitten.y - 16 * scene.sizeMultiplier;

  scene.tweens.add({
    targets: food,
    x: mouthX,
    y: mouthY,
    scale: Math.max(0.5, food.scale * 0.45),
    duration: 140,
    ease: 'Quad.easeIn',
    onComplete: () => scene.consumeFood(food),
  });
}

export function consumeFood(scene, food) {
  const growthValue = food.foodValue || 1;
  if (food.groundTimer) {
    food.groundTimer.remove(false);
    food.groundTimer = null;
  }
  scene.destroyDropShadow(food);
  if (food.fadeTween) {
    food.fadeTween.stop();
    food.fadeTween = null;
  }
  food.disableBody(true, true);

  scene.foodCaught += 1;
  scene.foodPoints += growthValue;
  const growthDelta = computeGrowthDelta(food, growthValue);
  scene.sizeMultiplier = clampCatSize(applyGrowthDelta(scene.sizeMultiplier, growthDelta));

  scene.kitten.setScale(scene.sizeMultiplier);
  scene.syncKittenBodyToFeet();
  scene.eatCooldown = 160;
  scene.kitten.setTexture(scene.kittenSkin.eat);

  scene.playEatSound(growthValue);
  scene.playEatingAnimation();
  scene.updateHud();

  const popupText = growthValue > 1 ? '+1.0x SIZE' : '+0.1x SIZE';
  scene.showCatchPopup(scene.kitten.x, scene.kitten.y - 45 * scene.sizeMultiplier, popupText);

  if (growthValue <= 1) {
    const isSlice = food?.sourceType === 'slice';
    if (isSlice) {
      scene.slicesEatenForBonus += 1;
      scene.bonusSlicesCollected = (scene.bonusSlicesCollected || 0) + 1;
      if (scene.bonusSlicesCollected >= 5) {
        scene.bonusSlicesCollected -= 5;
        scene.bonusPizzaFullUntil = scene.time.now + 650;
        scene.pendingBonusFlyovers += 1;
        scene.updateHud();
        if (!scene.airplaneActive) {
          scene.pendingBonusFlyovers -= 1;
          scene.launchAirplaneBigPizza();
          scene.showCatchPopup(scene.kitten.x, scene.kitten.y - 64 * scene.sizeMultiplier, 'BONUS FLYOVER!');
        }
      } else {
        scene.updateHud();
      }
    }
  }

  if (scene.foodCaught % 2 === 0) {
    scene.schedulePizzaDrops();
  }

  scene.saveCharacterState();
}

export function cleanupMissedPizza(scene, worldHeight) {
  const children = scene.pizzaGroup.getChildren();
  for (let i = 0; i < children.length; i += 1) {
    const food = children[i];
    if (food.active && food.y > worldHeight + 40) {
      scene.destroyDropShadow(food);
      food.disableBody(true, true);
    }
  }
}
