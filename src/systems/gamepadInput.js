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
  var rafId = null;
  var keepaliveFrames = 0;
  // Send a keepalive every N frames (~5 s at 60 fps).
  // Xbox wireless controllers power off when the host stops sending
  // XInput keepalive packets; a zero-intensity vibration effect satisfies
  // the driver without producing any noticeable rumble for the player.
  var KEEPALIVE_INTERVAL = 300;

  function sendKeepalive(gp) {
    if (gp.vibrationActuator && gp.vibrationActuator.playEffect) {
      gp.vibrationActuator.playEffect('dual-rumble', {
        startDelay: 0, duration: 16, weakMagnitude: 0, strongMagnitude: 0,
      }).catch(function () {});
    }
  }

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

      // ── Wireless keepalive ────────────────────────────────────────
      keepaliveFrames += 1;
      if (keepaliveFrames >= KEEPALIVE_INTERVAL) {
        keepaliveFrames = 0;
        sendKeepalive(gp);
      }
    }

    rafId = requestAnimationFrame(poll);
  }

  function startPolling() {
    if (!rafId) {
      prev = { A: false, X: false, Start: false };
      keepaliveFrames = 0;
      rafId = requestAnimationFrame(poll);
      // Send an immediate keepalive so the controller doesn't time out
      // in the first few seconds before the regular interval fires.
      var gp = navigator.getGamepads()[0];
      if (gp) sendKeepalive(gp);
    }
  }

  function stopPolling() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // Pause polling when the tab is hidden so Chrome releases the XInput slot
  // and the wireless receiver can go idle without dropping the controller.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      stopPolling();
    } else {
      // Resume if a gamepad is still connected.
      if (navigator.getGamepads()[0]) startPolling();
    }
  });

  // Only start polling when a gamepad connects.
  window.addEventListener('gamepadconnected', function (e) {
    console.log('[Gamepad] Connected:', e.gamepad.id);
    startPolling();
  });

  window.addEventListener('gamepaddisconnected', function (e) {
    console.log('[Gamepad] Disconnected:', e.gamepad.id);
    stopPolling();
    // Clear movement so the cat doesn't keep running after disconnect.
    if (window._mobile) {
      window._mobile.left  = false;
      window._mobile.right = false;
      window._mobile.jumpHeld = false;
    }
    prev = { A: false, X: false, Start: false };
  });
})();
