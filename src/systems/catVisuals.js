import { getGroundSurfaceY } from './catPhysics.js';

export function createFlashlight(scene) {
  scene.flashlightCone = scene.add.graphics();
  scene.flashlightCone.setDepth(9);
  scene.flashlightCone.setVisible(false);
  scene.flashlightCone.setBlendMode(Phaser.BlendModes.ADD);

  scene.flashlightHandle = scene.add.graphics();
  scene.flashlightHandle.setDepth(11);
  scene.flashlightHandle.setVisible(false);
}

export function createAstronautHelmet(scene) {
  scene.helmetGraphics = scene.add.graphics().setDepth(9);
}

export function createJetpackVisuals(scene) {
  // Keep jetpack behind the cat sprite so only edges/nozzles peek out.
  scene.jetpackPack = scene.add.graphics().setDepth(7);
  scene.jetpackFlames = scene.add.graphics().setDepth(7);
}

export function attachDropShadow(scene, item, baseWidth, baseHeight, alpha = 0.15) {
  if (!item) {
    return;
  }
  if (!item.shadow || !item.shadow.active) {
    item.shadow = scene.add.ellipse(item.x, getGroundSurfaceY(scene), baseWidth, baseHeight, 0x000000, alpha).setDepth(6);
  }
  item.shadowBaseWidth = baseWidth;
  item.shadowBaseHeight = baseHeight;
  item.shadow.setVisible(true);
}

export function destroyDropShadow(_scene, item) {
  if (item && item.shadow) {
    item.shadow.destroy();
    item.shadow = null;
  }
}

export function updateDropShadow(scene, item) {
  if (!item || !item.shadow) {
    return;
  }

  if (!item.active || !item.visible || !item.body || !item.body.enable) {
    item.shadow.setVisible(false);
    return;
  }

  const groundY = getGroundSurfaceY(scene);
  const altitude = Phaser.Math.Clamp(groundY - item.y, 0, 540);
  const shrink = Phaser.Math.Clamp(1 - altitude / 540, 0.22, 1);
  const baseW = item.shadowBaseWidth || 28;
  const baseH = item.shadowBaseHeight || 10;

  item.shadow.setVisible(true);
  item.shadow.x = item.x;
  item.shadow.y = groundY + 1;
  item.shadow.width = baseW * shrink;
  item.shadow.height = baseH;
}

export function updateShadows(scene) {
  if (scene.kittenShadow?.active) {
    scene.kittenShadow.x = scene.kitten.x;
    scene.kittenShadow.y = getGroundSurfaceY(scene) + 1;
    const shadowScale = Phaser.Math.Clamp(scene.sizeMultiplier, 0.8, 6);
    scene.kittenShadow.setSize(
      Math.round(44 * shadowScale),
      Math.round(Math.max(10, 15 * shadowScale * 0.65)),
    );
  }
  if (scene.heliShadow?.active) {
    scene.heliShadow.x = scene.chefHeli.x;
    scene.heliShadow.y = getGroundSurfaceY(scene) + 1;
  }
  if (scene.rocketShadow?.active) {
    scene.rocketShadow.setVisible(scene.pizzaPlane.visible);
    scene.rocketShadow.x = scene.pizzaPlane.x;
    scene.rocketShadow.y = getGroundSurfaceY(scene) + 1;
  }
  const enemies = scene.zombieGroup.getChildren();
  for (let i = 0; i < enemies.length; i += 1) {
    const enemy = enemies[i];
    if (enemy.shadow) {
      enemy.shadow.setVisible(enemy.active);
      enemy.shadow.x = enemy.x;
      enemy.shadow.y = getGroundSurfaceY(scene) + 1;
      enemy.shadow.width = 36 * Math.max(1, enemy.growthScale || 1);
    }
  }

  const pizzaItems = scene.pizzaGroup.getChildren();
  for (let i = 0; i < pizzaItems.length; i += 1) {
    updateDropShadow(scene, pizzaItems[i]);
  }
  const batteryItems = scene.batteryGroup.getChildren();
  for (let i = 0; i < batteryItems.length; i += 1) {
    updateDropShadow(scene, batteryItems[i]);
  }
  const fuelItems = scene.fuelGroup.getChildren();
  for (let i = 0; i < fuelItems.length; i += 1) {
    updateDropShadow(scene, fuelItems[i]);
  }
}

export function updateFlashlightPosition(scene) {
  const nightBeam = scene.currentThemeKey === 'night' && scene.flashlightOn && scene.flashlightBattery > 0;
  const dayLaser = scene.currentThemeKey === 'day' && scene.flashlightOn && scene.flashlightBattery > 0;
  const lightEnabled = nightBeam || dayLaser;
  if (!lightEnabled) {
    scene.flashlightCone.setVisible(false);
    scene.flashlightHandle.setVisible(false);
    scene.flashlightCone.clear();
    scene.flashlightHandle.clear();
    return;
  }

  scene.flashlightCone.setVisible(true);
  scene.flashlightHandle.setVisible(true);

  const dir = scene.kitten.body.velocity.x < -20 ? -1 : scene.kitten.body.velocity.x > 20 ? 1 : scene.lastMoveDir;
  const handX = scene.kitten.x + dir * 10;
  const handY = scene.kitten.y - 14;
  const length = 240;
  const halfWidth = 80;
  const farX = handX + dir * length;

  scene.flashlightTip.x = handX;
  scene.flashlightTip.y = handY;
  scene.flashlightDir = dir;
  scene.flashlightLength = length;
  scene.flashlightHalfWidth = halfWidth;

  scene.flashlightCone.clear();
  if (dayLaser) {
    const endX = handX + dir * 220;
    const endY = handY + 84;
    scene.flashlightCone.lineStyle(3, 0xff4a4a, 0.95);
    scene.flashlightCone.beginPath();
    scene.flashlightCone.moveTo(handX, handY);
    scene.flashlightCone.lineTo(endX, endY);
    scene.flashlightCone.strokePath();

    scene.flashlightCone.lineStyle(1, 0xffb0b0, 0.95);
    scene.flashlightCone.beginPath();
    scene.flashlightCone.moveTo(handX, handY);
    scene.flashlightCone.lineTo(endX, endY);
    scene.flashlightCone.strokePath();

    scene.flashlightLength = 236;
    scene.flashlightHalfWidth = 14;
  } else {
    scene.flashlightCone.fillStyle(0xfff1b0, 0.13);
    scene.flashlightCone.fillTriangle(handX, handY, farX, handY - halfWidth, farX, handY + halfWidth);
    scene.flashlightCone.fillStyle(0xfff7d1, 0.21);
    scene.flashlightCone.fillTriangle(
      handX,
      handY,
      handX + dir * (length * 0.65),
      handY - halfWidth * 0.4,
      handX + dir * (length * 0.65),
      handY + halfWidth * 0.4,
    );
  }

  const h = scene.flashlightHandle;
  h.clear();
  h.fillStyle(dayLaser ? 0x661a1a : 0x888888, 1);
  h.fillRect(handX - 2, handY - 2, dir * 10, 4);
  h.fillStyle(dayLaser ? 0xffa7a7 : 0xddddcc, 1);
  h.fillCircle(handX + dir * 8, handY, 2.5);
  h.fillStyle(dayLaser ? 0x4a1111 : 0x666666, 1);
  h.fillRect(handX - 1, handY, 2, 5);
}

export function playEatingAnimation(scene) {
  if (scene.eatTween) {
    scene.eatTween.stop();
    scene.eatTween = null;
    scene.kitten.setAlpha(1);
  }
  scene.kitten.setAlpha(1);
}

export function updateAstronautHelmet(scene) {
  if (!scene.helmetGraphics || !scene.kitten) {
    return;
  }
  if (scene.currentMapKey !== 'moon') {
    scene.helmetGraphics.clear();
    return;
  }
  const x = scene.kitten.x;
  const y = scene.kitten.y - 14 * scene.sizeMultiplier;
  const rX = 12 * scene.sizeMultiplier;
  const rY = 10 * scene.sizeMultiplier;

  scene.helmetGraphics.clear();
  scene.helmetGraphics.fillStyle(0xd9ecff, 0.2);
  scene.helmetGraphics.fillEllipse(x, y, rX * 2.1, rY * 2.1);
  scene.helmetGraphics.lineStyle(2, 0xeaf6ff, 0.9);
  scene.helmetGraphics.strokeEllipse(x, y, rX * 2.1, rY * 2.1);
  scene.helmetGraphics.fillStyle(0xeaf6ff, 0.35);
  scene.helmetGraphics.fillEllipse(x - 4 * scene.sizeMultiplier, y - 4 * scene.sizeMultiplier, 5 * scene.sizeMultiplier, 3 * scene.sizeMultiplier);
}

export function drawJetpackVisual(scene, active) {
  if (!scene.jetpackPack || !scene.jetpackFlames || !scene.kitten || scene.currentMapKey !== 'moon') {
    if (scene.jetpackPack) {
      scene.jetpackPack.clear();
    }
    if (scene.jetpackFlames) {
      scene.jetpackFlames.clear();
    }
    return;
  }

  const scale = scene.sizeMultiplier;
  const packX = scene.kitten.x;
  const packY = scene.kitten.y - 11 * scale;

  drawJetpackAt(scene, scene.jetpackPack, scene.jetpackFlames, packX, packY, scale, active, scene.time.now);
}

export function drawJetpackAt(scene, packGraphics, flameGraphics, packX, packY, scale, active, timeNow = 0) {
  if (!packGraphics || !flameGraphics) {
    return;
  }

  const packW = 12 * scale;
  const packH = 14 * scale;

  packGraphics.clear();
  packGraphics.fillStyle(0x5d6573, 0.96);
  packGraphics.fillRoundedRect(packX - packW * 0.5, packY - packH * 0.5, packW, packH, 2 * scale);
  packGraphics.fillStyle(0x939db0, 1);
  packGraphics.fillRect(packX - 2 * scale, packY - 3 * scale, 4 * scale, 5 * scale);
  packGraphics.fillStyle(0x2d3340, 0.9);
  // Side edges/pipes peek from both sides of the cat.
  packGraphics.fillRect(packX - 8.2 * scale, packY - 0.8 * scale, 2.6 * scale, 6.5 * scale);
  packGraphics.fillRect(packX + 5.6 * scale, packY - 0.8 * scale, 2.6 * scale, 6.5 * scale);

  flameGraphics.clear();
  if (!active) {
    return;
  }

  const flicker = 0.75 + Math.sin(timeNow * 0.03) * 0.25;
  const flameLen = 10 * scale * flicker;
  const leftNozzleX = packX - 6.9 * scale;
  const rightNozzleX = packX + 6.9 * scale;
  const nozzleY = packY + 7.6 * scale;

  flameGraphics.fillStyle(0xffb347, 0.95);
  flameGraphics.fillTriangle(leftNozzleX - 1.5 * scale, nozzleY, leftNozzleX + 1.5 * scale, nozzleY, leftNozzleX, nozzleY + flameLen);
  flameGraphics.fillTriangle(rightNozzleX - 1.5 * scale, nozzleY, rightNozzleX + 1.5 * scale, nozzleY, rightNozzleX, nozzleY + flameLen);
  flameGraphics.fillStyle(0xfff0be, 0.85);
  flameGraphics.fillTriangle(leftNozzleX - scale, nozzleY + scale, leftNozzleX + scale, nozzleY + scale, leftNozzleX, nozzleY + flameLen * 0.65);
  flameGraphics.fillTriangle(rightNozzleX - scale, nozzleY + scale, rightNozzleX + scale, nozzleY + scale, rightNozzleX, nozzleY + flameLen * 0.65);
}
