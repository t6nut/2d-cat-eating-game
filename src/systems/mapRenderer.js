export function createBackground(scene, worldWidth, worldHeight) {
  scene.bgSky = scene.add.rectangle(worldWidth / 2, worldHeight / 2, worldWidth, worldHeight, 0x99e8ff).setDepth(0);
  scene.bgGround = scene.add.rectangle(worldWidth / 2, worldHeight - 100, worldWidth, 200, 0xa8de78).setDepth(1);
}

export function applyMap(scene, mapKey, worldWidth, worldHeight) {
  const map = scene.mapSettings[mapKey] || scene.mapSettings.city;
  scene.currentMapKey = mapKey;
  scene.bgSky.setVisible(true);
  scene.bgGround.setVisible(true);
  scene.bgGround.setAlpha(1);
  scene.bgSky.setFillStyle(map.skyColor, 1);
  scene.bgGround.setFillStyle(map.groundColor, 1);

  for (let i = 0; i < scene.backgroundElements.length; i += 1) {
    scene.backgroundElements[i].destroy();
  }
  scene.backgroundElements = [];

  if (mapKey === 'city') {
    const cityNight = scene.currentThemeKey === 'night';
    scene.bgSky.setVisible(true);
    scene.bgGround.setVisible(true);
    scene.bgSky.setFillStyle(cityNight ? 0x101a34 : 0x95d5ff, cityNight ? 0.94 : 1);
    scene.bgGround.setFillStyle(cityNight ? 0x3a4558 : 0x6d7686, 1);

    const sunOrMoon = scene.add.circle(1030, 86, 36, cityNight ? 0xe9f3ff : 0xffed9e, cityNight ? 0.86 : 0.92).setDepth(2);
    scene.backgroundElements.push(sunOrMoon);

    for (let i = 0; i < 11; i += 1) {
      const x = 54 + i * 122;
      const h = 90 + (i % 4) * 26;
      const buildingColor = cityNight ? 0x273348 : 0x7f8ea4;
      const windowColor = cityNight ? 0x1a2236 : 0x5a687d;
      const lightColor = cityNight ? 0xffeb3b : 0xfffacd;
      const building = scene.add.rectangle(x, worldHeight - 170 - h * 0.5, 78, h, buildingColor, 0.95).setDepth(2);
      scene.backgroundElements.push(building);

      const floorCount = Math.max(3, Math.floor(h / 20));
      for (let f = 0; f < floorCount; f += 1) {
        for (let w = 0; w < 2; w += 1) {
          const windowY = worldHeight - 170 - h * 0.5 + (f - floorCount * 0.5) * 22;
          const windowX = x - 16 + w * 32;
          const windowGlass = scene.add.rectangle(windowX, windowY, 10, 10, windowColor, 0.85).setDepth(2);
          scene.backgroundElements.push(windowGlass);

          if (cityNight && ((i + f + w) % 3 !== 0)) {
            const light = scene.add.rectangle(windowX, windowY, 8, 8, lightColor, 0.65).setDepth(2);
            scene.backgroundElements.push(light);
          }
        }
      }

      if (i % 3 === 0) {
        const roofY = worldHeight - 170 - h - 5;
        const roofLeft = scene.add.triangle(x - 20, roofY + 6, 0, 10, 20, 0, 40, 10, cityNight ? 0x1a1625 : 0x5a3a25, 0.9).setDepth(2);
        const roofRight = scene.add.triangle(x + 20, roofY + 6, 0, 10, 20, 0, 40, 10, cityNight ? 0x1a1625 : 0x5a3a25, 0.9).setDepth(2);
        scene.backgroundElements.push(roofLeft, roofRight);
      }
    }

    const skylineBaseY = Math.floor(worldHeight * 0.75);
    const asphalt = scene.add.rectangle(worldWidth / 2, skylineBaseY + 14, worldWidth, 44, 0x262a32, 0.9).setDepth(2);
    const laneStripe = scene.add.rectangle(worldWidth / 2, skylineBaseY + 14, worldWidth, 3, 0xc9c9bf, 0.55).setDepth(2);
    scene.backgroundElements.push(asphalt, laneStripe);

    for (let i = 0; i < 7; i += 1) {
      const tx = 90 + i * 170;
      const trunk = scene.add.rectangle(tx, skylineBaseY - 8, 8, 18, 0x5b3a25, 0.95).setDepth(3);
      const leaves = scene.add.circle(tx, skylineBaseY - 22, 13, 0x4f9650, 0.95).setDepth(3);
      scene.backgroundElements.push(trunk, leaves);
    }

    for (let i = 0; i < 4; i += 1) {
      const y = skylineBaseY + 6 + i * 7;
      const speed = 3800 + i * 700;
      const color = [0xe04444, 0x44a6e0, 0xf0c547, 0xa35de6][i % 4];
      const fromLeft = i % 2 === 0;
      const body = scene.add.rectangle(fromLeft ? -80 : worldWidth + 80, y, 48, 16, color, 0.9).setDepth(2);
      const wheelA = scene.add.circle(body.x - 14, y + 8, 3, 0x1f1f1f, 1).setDepth(2);
      const wheelB = scene.add.circle(body.x + 14, y + 8, 3, 0x1f1f1f, 1).setDepth(2);
      scene.backgroundElements.push(body, wheelA, wheelB);

      scene.tweens.add({
        targets: body,
        x: fromLeft ? worldWidth + 90 : -90,
        duration: speed,
        repeat: -1,
        ease: 'Linear',
        onUpdate: () => {
          wheelA.x = body.x - 14;
          wheelB.x = body.x + 14;
        },
      });
    }
  } else if (mapKey === 'desert') {
    const isDesertNight = scene.currentThemeKey === 'night';
    if (!isDesertNight) {
      const sunHalo = scene.add.circle(930, 72, 56, 0xffe980, 0.18).setDepth(2);
      const sun = scene.add.circle(930, 72, 38, 0xfff1a0, 0.92).setDepth(2);
      scene.backgroundElements.push(sunHalo, sun);
    } else {
      const moon = scene.add.circle(930, 72, 32, 0xeaf4ff, 0.9).setDepth(2);
      scene.backgroundElements.push(moon);
    }

    // Wavy sand hills using polygon graphics
    const sandHills = scene.add.graphics().setDepth(2);
    sandHills.fillStyle(0xc8962a, 0.45);
    sandHills.beginPath();
    sandHills.moveTo(0, worldHeight - 40);
    const hillPoints = [0,0, 80,-22, 160,-8, 240,-38, 330,-18, 420,-44, 510,-14, 600,-36, 690,-12, 780,-42, 870,-20, 960,-50, 1050,-16, 1140,-40, 1230,-18, worldWidth,0];
    for (let hi = 0; hi < hillPoints.length; hi += 2) {
      sandHills.lineTo(hillPoints[hi], worldHeight - 60 + hillPoints[hi + 1]);
    }
    sandHills.lineTo(worldWidth, worldHeight);
    sandHills.lineTo(0, worldHeight);
    sandHills.closePath();
    sandHills.fillPath();

    const sandHills2 = scene.add.graphics().setDepth(2);
    sandHills2.fillStyle(0xe8ae50, 0.35);
    sandHills2.beginPath();
    sandHills2.moveTo(0, worldHeight - 20);
    const hill2Points = [0,0, 120,-28, 240,-12, 360,-32, 480,-8, 600,-28, 720,-6, 840,-24, 960,-10, 1080,-30, 1200,-12, worldWidth,0];
    for (let hi = 0; hi < hill2Points.length; hi += 2) {
      sandHills2.lineTo(hill2Points[hi], worldHeight - 40 + hill2Points[hi + 1]);
    }
    sandHills2.lineTo(worldWidth, worldHeight);
    sandHills2.lineTo(0, worldHeight);
    sandHills2.closePath();
    sandHills2.fillPath();
    scene.backgroundElements.push(sandHills, sandHills2);

    // Background dunes
    const dune1 = scene.add.ellipse(180, worldHeight - 92, 380, 100, 0xd4994a, 0.4).setDepth(2);
    const dune2 = scene.add.ellipse(640, worldHeight - 78, 520, 120, 0xc98c3a, 0.38).setDepth(2);
    const dune3 = scene.add.ellipse(1100, worldHeight - 86, 340, 90, 0xd4994a, 0.36).setDepth(2);
    scene.backgroundElements.push(dune1, dune2, dune3);

    // Pyramids (3 sizes, staggered)
    const pyramidData = [
      { x: 760, baseW: 220, h: 160 },
      { x: 560, baseW: 160, h: 110 },
      { x: 940, baseW: 130, h: 90 },
    ];
    for (const pd of pyramidData) {
      // baseY sunk into sand so pyramids emerge from dunes, not float above them
      const baseY = worldHeight - 58;
      const pyr = scene.add.triangle(
        pd.x, baseY - pd.h,
        -(pd.baseW / 2), pd.h,
        0, 0,
        pd.baseW / 2, pd.h,
        0xd4a852, 0.92,
      ).setDepth(3);
      // Shadow face
      const pyrShade = scene.add.triangle(
        pd.x, baseY - pd.h,
        0, 0,
        pd.baseW / 2, pd.h,
        pd.baseW / 2, pd.h,
        0xa67c30, 0.55,
      ).setDepth(3);
      // Entrance block
      const door = scene.add.rectangle(pd.x + 4, baseY - 14, pd.baseW * 0.12, pd.h * 0.12, 0x2a1a0a, 0.75).setDepth(3);
      scene.backgroundElements.push(pyr, pyrShade, door);
    }

    // Sphinx — at x=330, sitting on ground
    const sphinxX = 330;
    const sphinxBaseY = worldHeight - 58;
    // Body (crouching lion form)
    const sphinxBody = scene.add.rectangle(sphinxX + 10, sphinxBaseY - 20, 80, 34, 0xc8963c, 0.9).setDepth(3);
    const sphinxFront = scene.add.rectangle(sphinxX - 28, sphinxBaseY - 16, 22, 28, 0xc8963c, 0.9).setDepth(3);
    // Head
    const sphinxHead = scene.add.rectangle(sphinxX - 38, sphinxBaseY - 46, 26, 26, 0xd4a852, 0.92).setDepth(3);
    // Headdress (nemes)
    const headdress = scene.add.rectangle(sphinxX - 38, sphinxBaseY - 60, 30, 14, 0xbf8c28, 0.9).setDepth(3);
    const headdressSide = scene.add.rectangle(sphinxX - 48, sphinxBaseY - 52, 10, 20, 0xbf8c28, 0.85).setDepth(3);
    // Face details
    const sphinxEye = scene.add.rectangle(sphinxX - 30, sphinxBaseY - 48, 4, 3, 0x3a2800, 0.9).setDepth(3);
    const sphinxNose = scene.add.rectangle(sphinxX - 32, sphinxBaseY - 43, 3, 3, 0xa07428, 0.7).setDepth(3);
    scene.backgroundElements.push(sphinxBody, sphinxFront, sphinxHead, headdress, headdressSide, sphinxEye, sphinxNose);

    // Cactus
    for (let cx = 0; cx < 2; cx += 1) {
      const cactusX = 100 + cx * 1080;
      const cactusY = worldHeight - 148;
      const stem = scene.add.rectangle(cactusX, cactusY - 20, 10, 52, 0x5aaa54, 0.85).setDepth(3);
      const armL = scene.add.rectangle(cactusX - 14, cactusY - 28, 18, 8, 0x5aaa54, 0.8).setDepth(3);
      const armLTop = scene.add.rectangle(cactusX - 20, cactusY - 34, 8, 14, 0x5aaa54, 0.8).setDepth(3);
      const armR = scene.add.rectangle(cactusX + 14, cactusY - 22, 18, 8, 0x5aaa54, 0.8).setDepth(3);
      const armRTop = scene.add.rectangle(cactusX + 20, cactusY - 28, 8, 14, 0x5aaa54, 0.8).setDepth(3);
      scene.backgroundElements.push(stem, armL, armLTop, armR, armRTop);
    }
  } else if (mapKey === 'beach') {
    const isBeachNight = scene.currentThemeKey === 'night';

    // Celestial body
    if (!isBeachNight) {
      const sunHalo = scene.add.circle(980, 72, 50, 0xffe980, 0.18).setDepth(2);
      const sun = scene.add.circle(980, 72, 34, 0xfff1a0, 0.92).setDepth(2);
      scene.backgroundElements.push(sunHalo, sun);
    } else {
      const moon = scene.add.circle(980, 72, 28, 0xeaf4ff, 0.92).setDepth(2);
      scene.backgroundElements.push(moon);
    }

    const sea = scene.add.rectangle(worldWidth / 2, worldHeight * 0.58, worldWidth, worldHeight * 0.64, 0x4fc4dc, 0.6).setDepth(2);
    scene.backgroundElements.push(sea);

    // Animated waves
    for (let i = 0; i < 5; i += 1) {
      const waveX = 140 + i * 260;
      const waveY = worldHeight * 0.38 + i * 18;
      const wave = scene.add.ellipse(waveX, waveY, 380 + i * 40, 28 + i * 4, 0xbef6ff, 0.45 - i * 0.04).setDepth(2);
      scene.backgroundElements.push(wave);
      scene.tweens.add({ targets: wave, x: waveX + 50, y: waveY + 6, duration: 2400 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Palm trees
    for (let j = 0; j < 3; j += 1) {
      const px = 120 + j * 460;
      const trunk = scene.add.rectangle(px, worldHeight - 145, 8, 60, 0x8b6834, 0.9).setDepth(3);
      const frondA = scene.add.ellipse(px - 18, worldHeight - 180, 44, 16, 0x3fac4d, 0.85).setDepth(3);
      const frondB = scene.add.ellipse(px + 18, worldHeight - 178, 40, 14, 0x4fbc5a, 0.8).setDepth(3);
      const frondC = scene.add.ellipse(px, worldHeight - 186, 34, 12, 0x57c863, 0.75).setDepth(3);
      scene.backgroundElements.push(trunk, frondA, frondB, frondC);
    }

    // People sunbathing on the beach
    const sunbathers = [
      { x: 200, color: 0xf5c49c },
      { x: 480, color: 0xd4916c },
      { x: 850, color: 0xf0b888 },
      { x: 1100, color: 0xc78060 },
    ];
    for (const sb of sunbathers) {
      const towelColor = [0xe84444, 0x4488ee, 0xf0c547, 0x44bb66][sunbathers.indexOf(sb) % 4];
      const towel = scene.add.rectangle(sb.x, worldHeight - 115, 46, 10, towelColor, 0.7).setDepth(3);
      const body = scene.add.ellipse(sb.x, worldHeight - 120, 28, 10, sb.color, 0.9).setDepth(3);
      const head = scene.add.circle(sb.x - 14, worldHeight - 122, 5, sb.color, 0.95).setDepth(3);
      scene.backgroundElements.push(towel, body, head);
    }

    // Swimmers with circular arm strokes and body orbiting in larger ellipses
    const swimmerDefs = [
      { cx: 300, cy: Math.round(worldHeight * 0.46), color: 0xf5c49c },
      { cx: 620, cy: Math.round(worldHeight * 0.50), color: 0xd4916c },
      { cx: 940, cy: Math.round(worldHeight * 0.44), color: 0xf0b888 },
    ];
    for (const sw of swimmerDefs) {
      const swimHead = scene.add.circle(sw.cx, sw.cy, 5, sw.color, 0.9).setDepth(3);
      const swimBody = scene.add.ellipse(sw.cx, sw.cy + 7, 10, 8, sw.color, 0.75).setDepth(3);
      const armL = scene.add.ellipse(sw.cx - 9, sw.cy + 3, 14, 4, sw.color, 0.8).setDepth(3);
      const armR = scene.add.ellipse(sw.cx + 9, sw.cy + 3, 14, 4, sw.color, 0.8).setDepth(3);
      const handL = scene.add.circle(sw.cx - 15, sw.cy + 3, 3, sw.color, 0.85).setDepth(3);
      const handR = scene.add.circle(sw.cx + 15, sw.cy + 3, 3, sw.color, 0.85).setDepth(3);
      scene.backgroundElements.push(swimHead, swimBody, armL, armR, handL, handR);

      // Body orbits in a larger ellipse around the center point
      const orbitStartAngle = Phaser.Math.Between(0, 359);
      scene.tweens.addCounter({
        from: orbitStartAngle, to: orbitStartAngle + 360,
        duration: 5000 + Phaser.Math.Between(-600, 600), repeat: -1, ease: 'Linear',
        onUpdate: (tw) => {
          const a = Phaser.Math.DegToRad(tw.getValue());
          swimHead.x = sw.cx + Math.cos(a) * 40;
          swimHead.y = sw.cy + Math.sin(a) * 14;
          swimBody.x = swimHead.x;
          swimBody.y = swimHead.y + 7;
        },
      });

      // Arms rotate in circles (freestyle swimming stroke)
      const armStartAngle = Phaser.Math.Between(0, 359);
      scene.tweens.addCounter({
        from: armStartAngle, to: armStartAngle + 360,
        duration: 1100 + Phaser.Math.Between(-100, 100), repeat: -1, ease: 'Linear',
        onUpdate: (tw) => {
          const a = Phaser.Math.DegToRad(tw.getValue());
          armL.x  = swimHead.x + Math.cos(a + Math.PI) * 11;
          armL.y  = swimHead.y + Math.sin(a + Math.PI) * 7 + 3;
          armR.x  = swimHead.x + Math.cos(a) * 11;
          armR.y  = swimHead.y + Math.sin(a) * 7 + 3;
          handL.x = swimHead.x + Math.cos(a + Math.PI) * 17;
          handL.y = swimHead.y + Math.sin(a + Math.PI) * 11 + 3;
          handR.x = swimHead.x + Math.cos(a) * 17;
          handR.y = swimHead.y + Math.sin(a) * 11 + 3;
        },
      });
    }

    // Surfer with swim pants and larger rounded board, chased by shark fin
    const surferStartX = worldWidth + 80;
    const surferY = Math.round(worldHeight * 0.42);

    // Larger rounded surfboard (drawn in local coords centered at origin)
    const surfBoardGfx = scene.add.graphics().setDepth(3);
    surfBoardGfx.fillStyle(0xf5f5dc, 0.92);
    surfBoardGfx.fillRoundedRect(-30, -5, 60, 10, 5);
    surfBoardGfx.x = surferStartX;
    surfBoardGfx.y = surferY + 4;

    // Torso
    const surferTorso = scene.add.rectangle(surferStartX, surferY - 8, 8, 12, 0xf0b888, 0.9).setDepth(3);
    // Swim pants (bright blue shorts at waist)
    const swimPants = scene.add.rectangle(surferStartX, surferY + 1, 10, 8, 0x1a6bb5, 0.95).setDepth(3);
    // Head
    const surferHead = scene.add.circle(surferStartX, surferY - 16, 5, 0xf0b888, 0.95).setDepth(3);
    scene.backgroundElements.push(surfBoardGfx, surferTorso, swimPants, surferHead);

    // Shark — fin only, 2× bigger
    const sharkFin = scene.add.triangle(
      surferStartX + 120, surferY - 12,
      0, 24, 12, 0, 24, 24,
      0x5a6b7d, 0.95,
    ).setDepth(3);
    scene.backgroundElements.push(sharkFin);

    const surferTargets = [surfBoardGfx, surferTorso, swimPants, surferHead];
    const loopSurfer = () => {
      surfBoardGfx.x = worldWidth + 80;
      surferTorso.x  = worldWidth + 80;
      swimPants.x    = worldWidth + 80;
      surferHead.x   = worldWidth + 80;
      sharkFin.x     = worldWidth + 200;
      scene.tweens.add({
        targets: surferTargets,
        x: '-=' + (worldWidth + 200),
        duration: 8000,
        ease: 'Linear',
        onUpdate: () => {
          surferTorso.x = surfBoardGfx.x;
          swimPants.x   = surfBoardGfx.x;
          surferHead.x  = surfBoardGfx.x;
          sharkFin.x    = surfBoardGfx.x + 120;
        },
        onComplete: () => { scene.time.delayedCall(Phaser.Math.Between(2000, 5000), loopSurfer); },
      });
    };
    loopSurfer();
  } else if (mapKey === 'moon') {
    scene.bgSky.setVisible(true);
    scene.bgSky.setFillStyle(0x0c1330, 1);
    scene.bgGround.setVisible(false);
    scene.bgGround.setAlpha(0);
    const moonSurface = scene.add.ellipse(worldWidth / 2, worldHeight + 150, 1400, 560, 0x8f97ab, 0.8).setDepth(2);
    const ringA = scene.add.ellipse(worldWidth / 2, worldHeight + 160, 1250, 500, 0xc7cdd8, 0.08).setDepth(3);
    const ringB = scene.add.ellipse(worldWidth / 2, worldHeight + 170, 1120, 440, 0xdde3ef, 0.08).setDepth(3);
    scene.backgroundElements.push(moonSurface, ringA, ringB);

    for (let i = 0; i < 16; i += 1) {
      const cx = Phaser.Math.Between(90, worldWidth - 90);
      const cy = Phaser.Math.Between(worldHeight - 42, worldHeight + 66);
      const rx = Phaser.Math.Between(18, 52);
      const ry = Phaser.Math.Between(9, 24);
      const crater = scene.add.ellipse(cx, cy, rx, ry, 0x727b8e, 0.36).setDepth(3);
      const rim = scene.add.ellipse(cx - 4, cy - 2, rx * 0.7, ry * 0.55, 0xc8cfdb, 0.14).setDepth(3);
      scene.backgroundElements.push(crater, rim);
    }

    scene.tweens.add({ targets: ringA, x: worldWidth / 2 + 24, y: worldHeight + 152, duration: 4600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.tweens.add({ targets: ringB, x: worldWidth / 2 - 24, y: worldHeight + 178, duration: 5100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Floating comets
    const spawnComet = () => {
      const fromLeft = Math.random() > 0.5;
      const startX = fromLeft ? -60 : worldWidth + 60;
      const endX = fromLeft ? worldWidth + 60 : -60;
      const startY = Phaser.Math.Between(30, 260);
      const endY = startY + Phaser.Math.Between(-40, 80);
      const headR = Phaser.Math.Between(3, 6);
      const tailLen = Phaser.Math.Between(22, 52);
      const tailDir = fromLeft ? -1 : 1;
      const cometHead = scene.add.circle(startX, startY, headR, 0xfff8e0, 0.95).setDepth(4);
      // Use graphics for tail so we can draw it pointing in correct direction
      const cometTail = scene.add.graphics().setDepth(4);
      cometTail.fillStyle(0xffcc66, 0.5);
      // Tail points away from travel direction (behind the head)
      if (fromLeft) {
        cometTail.fillTriangle(-tailLen, 0, 0, -3, 0, 3);
      } else {
        cometTail.fillTriangle(0, -3, tailLen, 0, 0, 3);
      }
      cometTail.x = startX;
      cometTail.y = startY;
      scene.backgroundElements.push(cometHead, cometTail);
      const dur = Phaser.Math.Between(3000, 6000);
      scene.tweens.add({ targets: cometHead, x: endX, y: endY, duration: dur, ease: 'Linear',
        onUpdate: () => { cometTail.x = cometHead.x; cometTail.y = cometHead.y; },
        onComplete: () => { cometHead.setVisible(false); cometTail.setVisible(false); },
      });
    };
    // Spawn comets periodically
    for (let c = 0; c < 3; c += 1) {
      scene.time.delayedCall(c * 2200, spawnComet);
    }
    scene.time.addEvent({ delay: 5500, loop: true, callback: spawnComet });

    // Satellites orbiting near the earth
    const satConfigs = [
      { r: 55, speed: 7000, size: 4, color: 0xc0c0c0 },
      { r: 80, speed: 11000, size: 3, color: 0x8899aa },
      { r: 42, speed: 5500, size: 3, color: 0xddddee },
    ];
    for (const cfg of satConfigs) {
      const sat = scene.add.rectangle(1040, 104 - cfg.r, cfg.size, cfg.size * 2, cfg.color, 0.9).setDepth(5);
      const panel1 = scene.add.rectangle(1040 - cfg.size * 1.5, 104 - cfg.r, cfg.size * 2, cfg.size * 0.6, 0x3366aa, 0.85).setDepth(5);
      const panel2 = scene.add.rectangle(1040 + cfg.size * 1.5, 104 - cfg.r, cfg.size * 2, cfg.size * 0.6, 0x3366aa, 0.85).setDepth(5);
      scene.backgroundElements.push(sat, panel1, panel2);

      let angle = Phaser.Math.Between(0, 360);
      scene.tweens.addCounter({
        from: angle, to: angle + 360, duration: cfg.speed, repeat: -1, ease: 'Linear',
        onUpdate: (tw) => {
          const a = Phaser.Math.DegToRad(tw.getValue());
          const cx = 1040; const cy = 104;
          sat.x = cx + Math.cos(a) * cfg.r; sat.y = cy + Math.sin(a) * cfg.r * 0.4;
          panel1.x = sat.x - cfg.size * 1.5; panel1.y = sat.y;
          panel2.x = sat.x + cfg.size * 1.5; panel2.y = sat.y;
        },
      });
    }
  }
}
