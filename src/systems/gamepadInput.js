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
  var keepaliveTimer = null;

  // Send a tiny (imperceptible) rumble to keep the Xbox wireless receiver
  // from dropping the connection. Zero magnitude is filtered out by the
  // driver before it reaches the hardware — a non-zero value is required.
  function sendKeepalive() {
    var gps = navigator.getGamepads();
    for (var i = 0; i < gps.length; i++) {
      var gp = gps[i];
      if (gp && gp.vibrationActuator && gp.vibrationActuator.playEffect) {
        gp.vibrationActuator.playEffect('dual-rumble', {
          startDelay: 0, duration: 20,
          weakMagnitude: 0.0001, strongMagnitude: 0.0001,
        }).catch(function () {});
      }
    }
  }

  function poll() {
    // Always reschedule first so an exception inside the body can't kill the
    // loop — previously a crash here left rafId pointing at a dead frame,
    // stopping keepalives and input until the browser was restarted.
    rafId = requestAnimationFrame(poll);
    try {
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
    } catch (e) {
      // Swallow so the loop keeps running; log for visibility.
      console.warn('[Gamepad] poll error:', e);
    }
  }

  function startPolling() {
    if (!rafId) {
      prev = { A: false, X: false, Start: false };
      rafId = requestAnimationFrame(poll);
    }
    if (!keepaliveTimer) {
      // Use setInterval so keepalives arrive on a guaranteed wall-clock
      // schedule regardless of rAF throttling. Fire immediately too.
      sendKeepalive();
      keepaliveTimer = setInterval(sendKeepalive, 8000);
    }
  }

  function stopPolling() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (keepaliveTimer) {
      clearInterval(keepaliveTimer);
      keepaliveTimer = null;
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
