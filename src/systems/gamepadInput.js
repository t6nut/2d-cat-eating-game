/**
 * gamepadInput.js
 * Polls the Gamepad API each animation frame and writes to window._mobile
 * so all existing physics/scene code works without modification.
 *
 * Button mapping (standard layout):
 *   0  - A        → jump (jumpJustDown + jumpHeld)
 *   2  - X        → toggle flashlight (lightJustDown)
 *   9  - Start    → menu (menuJustDown)
 *  12  - D-pad Up     (unused)
 *  13  - D-pad Down   (unused)
 *  14  - D-pad Left   → move left
 *  15  - D-pad Right  → move right
 *
 * Axes:
 *   0  - Left stick horizontal → move left/right (threshold ±0.3)
 */
(function () {
  if (typeof navigator.getGamepads !== 'function') return;

  // Previous pressed state for edge-detection (just-down) buttons
  var prev = { A: false, X: false, Start: false };

  function poll() {
    var gp = navigator.getGamepads()[0];

    if (gp && window._mobile) {
      var m    = window._mobile;
      var btns = gp.buttons;
      var axes = gp.axes;

      // ── Movement ────────────────────────────────────────────────
      var stickLeft  = (axes[0] || 0) < -0.3;
      var stickRight = (axes[0] || 0) >  0.3;
      var dpadLeft   = btns[14] ? btns[14].pressed : false;
      var dpadRight  = btns[15] ? btns[15].pressed : false;

      m.left  = stickLeft  || dpadLeft;
      m.right = stickRight || dpadRight;

      // ── Jump (A) ─────────────────────────────────────────────────
      var aDown = btns[0] ? btns[0].pressed : false;
      m.jumpHeld = aDown;
      if (aDown && !prev.A) m.jumpJustDown = true;
      prev.A = aDown;

      // ── Flashlight (X) ───────────────────────────────────────────
      var xDown = btns[2] ? btns[2].pressed : false;
      if (xDown && !prev.X) m.lightJustDown = true;
      prev.X = xDown;

      // ── Menu / Pause (Start) ──────────────────────────────────────
      var startDown = btns[9] ? btns[9].pressed : false;
      if (startDown && !prev.Start) m.menuJustDown = true;
      prev.Start = startDown;
    }

    requestAnimationFrame(poll);
  }

  // Begin polling immediately so we catch gamepads already connected
  // (some browsers don't re-fire gamepadconnected after page load).
  poll();

  // Reset edge-detection state when a new gamepad is connected mid-session.
  window.addEventListener('gamepadconnected', function (e) {
    console.log('[Gamepad] Connected:', e.gamepad.id);
    prev = { A: false, X: false, Start: false };
  });

  window.addEventListener('gamepaddisconnected', function (e) {
    console.log('[Gamepad] Disconnected:', e.gamepad.id);
    // Clear movement so the cat doesn't keep running after disconnect
    if (window._mobile) {
      window._mobile.left  = false;
      window._mobile.right = false;
      window._mobile.jumpHeld = false;
    }
    prev = { A: false, X: false, Start: false };
  });
})();
