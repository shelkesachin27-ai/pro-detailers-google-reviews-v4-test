/* PRO DETAILERS V4.30 — premium mobile motion + safe haptic feedback */
(function () {
  "use strict";

  const reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const hero = document.querySelector(".hero");
  if (!hero || reduceMotion) return;

  let active = false;
  let permissionRequested = false;
  let raf = 0;

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function render() {
    raf = 0;

    currentX += (targetX - currentX) * 0.10;
    currentY += (targetY - currentY) * 0.10;

    hero.style.setProperty("--hero-parallax-x", `${currentX.toFixed(2)}px`);
    hero.style.setProperty("--hero-parallax-y", `${currentY.toFixed(2)}px`);

    if (
      Math.abs(targetX - currentX) > 0.05 ||
      Math.abs(targetY - currentY) > 0.05
    ) {
      raf = requestAnimationFrame(render);
    }
  }

  function scheduleRender() {
    if (!raf) raf = requestAnimationFrame(render);
  }

  function onOrientation(event) {
    if (!active) return;

    const gamma = Number(event.gamma) || 0; // left/right
    const beta = Number(event.beta) || 0;   // front/back

    // Deliberately subtle: maximum 10px movement.
    targetX = clamp(gamma, -30, 30) / 3;
    targetY = clamp(beta - 45, -30, 30) / 3;

    scheduleRender();
  }

  function resetMotion() {
    targetX = 0;
    targetY = 0;
    scheduleRender();
  }

  function startMotion() {
    if (active) return;

    active = true;
    window.addEventListener("deviceorientation", onOrientation, { passive: true });
  }

  async function enableMotion() {
    if (permissionRequested) {
      startMotion();
      return;
    }

    permissionRequested = true;

    try {
      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
      ) {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === "granted") startMotion();
      } else if ("DeviceOrientationEvent" in window) {
        startMotion();
      }
    } catch (_) {
      // If motion permission is unavailable/denied, keep the site fully functional.
    }
  }

  function safeHaptic() {
    // Android / supported browsers only.
    try {
      if (typeof navigator.vibrate === "function") {
        navigator.vibrate(12);
      }
    } catch (_) {}
  }

  // Page-entry animation: visual only, so it works on iPhone as well.
  requestAnimationFrame(() => {
    document.documentElement.classList.add("pd-motion-ready");
  });

  // Try a very short opening vibration where the browser permits it.
  // iOS/Safari normally blocks programmatic vibration; this failure is harmless.
  safeHaptic();

  // iPhone requires DeviceOrientation permission from a user gesture.
  // First tap/click enables motion; it does not create a popup.
  const firstGesture = () => {
    enableMotion();
    safeHaptic();

    window.removeEventListener("pointerdown", firstGesture);
    window.removeEventListener("touchstart", firstGesture);
  };

  window.addEventListener("pointerdown", firstGesture, { passive: true, once: true });
  window.addEventListener("touchstart", firstGesture, { passive: true, once: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      targetX = 0;
      targetY = 0;
      scheduleRender();
    }
  });

  window.addEventListener("pagehide", resetMotion, { passive: true });
})();
