export function applyTheme(scene, themeKey, worldWidth) {
  const theme = scene.themeSettings[themeKey] || scene.themeSettings.day;
  scene.currentThemeKey = themeKey;
  if (scene.currentMapKey !== 'moon') {
    scene.bgGround.setAlpha(1);
  }
  scene.applyMap(scene.currentMapKey);

  if (themeKey === 'night') {
    const starCount = scene.currentMapKey === 'moon' ? 62 : 42;
    for (let i = 0; i < starCount; i += 1) {
      const star = scene.add.circle(
        Phaser.Math.Between(18, worldWidth - 18),
        Phaser.Math.Between(12, 210),
        Phaser.Math.Between(1, 2),
        0xd9ecff,
        Phaser.Math.FloatBetween(0.48, 0.92),
      );
      star.setDepth(2);
      scene.backgroundElements.push(star);

      scene.tweens.add({
        targets: star,
        alpha: Phaser.Math.FloatBetween(0.18, 0.92),
        duration: Phaser.Math.Between(450, 1350),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    if (scene.currentMapKey === 'moon') {
      const earthGlow = scene.add.circle(1040, 104, 66, 0x7db7ff, 0.2).setDepth(2);
      const earthOcean = scene.add.circle(1040, 104, 30, 0x4f95e8, 0.95).setDepth(3);
      const landA = scene.add.ellipse(1031, 97, 18, 12, 0x69c271, 0.9).setDepth(4);
      const landB = scene.add.ellipse(1048, 112, 14, 9, 0x69c271, 0.86).setDepth(4);
      scene.backgroundElements.push(earthGlow, earthOcean, landA, landB);
    } else {
      const moonGlow = scene.add.circle(820, 100, 74, 0xbccfff, 0.2).setDepth(2);
      const moon = scene.add.circle(820, 100, 34, 0xe9f3ff, 1).setDepth(3);
      const moonshine = scene.add.ellipse(810, 350, 420, 230, 0x9dbbff, 0.12).setDepth(2);
      scene.backgroundElements.push(moonGlow, moon, moonshine);
    }

    scene.bgSky.setFillStyle(scene.currentMapKey === 'moon' ? 0x0c1330 : theme.skyColor, 0.92);
    if (scene.currentMapKey === 'beach') {
      scene.bgGround.setFillStyle(0x7b6b4d, 1);
    }
  } else if (scene.currentMapKey !== 'moon') {
    for (let i = 0; i < 11; i += 1) {
      const cloudX = 70 + i * 115;
      const cloudY = 65 + (i % 2) * 28;
      const cloud = scene.add.ellipse(cloudX, cloudY, 86, 34, 0xdff8ff, 0.65).setDepth(2);
      scene.backgroundElements.push(cloud);
    }
  }

  const beamEnabled = scene.flashlightOn && scene.flashlightBattery > 0
    && (themeKey === 'night' || themeKey === 'day');
  scene.flashlightCone.setVisible(beamEnabled);
  scene.flashlightHandle.setVisible(beamEnabled);
  if (!beamEnabled) {
    scene.flashlightCone.clear();
    scene.flashlightHandle.clear();
  }
}
