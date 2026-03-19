// https://codepen.io/paulvddool/pen/mROEGa
// https://speckyboy.com/looking-through-the-use-of-x-ray-effects/

const level = document.querySelector(".level");
const draggableLayers = Array.from(document.querySelectorAll(".level .layer"));
const remote = document.getElementById("remote");
const tooltip = document.getElementById("tooltip");
const groundText = document.getElementById("groundText");
const groundReveal = document.getElementById("groundReveal");
const software = document.getElementById("software");
const preloader = document.getElementById("preloader");
const preloaderForm = document.getElementById("preloader-form");
const researcherNameInput = document.getElementById("researcher-name");
const researchDateInput = document.getElementById("research-date");
const siegePanelResearcher = document.getElementById("siege-researcher");
const siegePanelDate = document.getElementById("siege-date");
const siegePanelTime = document.getElementById("siege-time");
const siegePanelElapsed = document.getElementById("siege-elapsed");
const legendModeSelect = document.getElementById("legend-mode");
const aerialModeSelect = document.getElementById("aerial-mode");
const excavationModeSelect = document.getElementById("excavation-mode");
const remoteModeSelect = document.getElementById("remote-mode");
const captureMapButton = document.getElementById("capture-map-btn");
const aerial = document.querySelector(".aerial");
const mapSlots = Array.from(document.querySelectorAll("#software .map-slot"));
const mapToggles = Array.from(
  document.querySelectorAll('#software input[type="checkbox"]'),
);
let toggleCount = 0;
let siegeOn = false;
let lastPaintedLayerIndex = -1; // Global tracking of which layer is currently painted on canvas
let highestUnlockedLayer = 1; // Only layer1 is draggable initially
const paintedLayerIndexes = new Set(); // Each layer can paint only once
const ENABLE_AUTO_SCROLL = false;
let hasAutoScrolledUp = false;
let hasAutoScrolledDown = false;
let isAutoScrollLocked = false;
let isRemotePointerDown = false;
const AUTO_SCROLL_DURATION_MS = 10000;
const MIN_SIEGE_DELAY_MS = 2 * 60 * 1000;
const MAX_SIEGE_DELAY_MS = 4 * 60 * 1000;
let randomSiegeTimerId = null;
let submittedResearcherName = "-";
let submittedResearchDateText = "-";
let submittedTimeText = "-";
let submittedAtMs = null;
let submittedSiegeElapsedText = "-";
let plannedSiegeAtMs = null;
let siegeStartedAtMs = null;
let siegeCountdownIntervalId = null;

function formatCountdownDuration(ms) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${formatTwoDigits(minutes)}:${formatTwoDigits(seconds)}`;
}

function ensureSiegeCountdownElement() {
  let node = document.getElementById("siege-countdown");
  if (node) {
    return node;
  }

  node = document.createElement("div");
  node.id = "siege-countdown";
  node.setAttribute("aria-live", "polite");
  node.style.display = "none";
  node.textContent = "00:00";
  document.body.appendChild(node);
  return node;
}

function updateSiegeCountdownDisplay() {
  const node = ensureSiegeCountdownElement();

  if (
    document.body.classList.contains("preloading") ||
    siegeOn ||
    !Number.isFinite(plannedSiegeAtMs)
  ) {
    node.style.display = "none";
    return;
  }

  const msRemaining = Math.max(0, plannedSiegeAtMs - Date.now());
  node.textContent = formatCountdownDuration(msRemaining);
  node.style.display = "block";
}

function startSiegeCountdownTimer() {
  if (siegeCountdownIntervalId !== null) {
    window.clearInterval(siegeCountdownIntervalId);
  }

  updateSiegeCountdownDisplay();
  siegeCountdownIntervalId = window.setInterval(
    updateSiegeCountdownDisplay,
    250,
  );
}

function stopSiegeCountdownTimer() {
  if (siegeCountdownIntervalId !== null) {
    window.clearInterval(siegeCountdownIntervalId);
    siegeCountdownIntervalId = null;
  }

  const node = document.getElementById("siege-countdown");
  if (node) {
    node.style.display = "none";
  }
}

function syncReportContext() {
  window.scaviReportContext = {
    researcher: submittedResearcherName,
    researchDate: submittedResearchDateText,
    researchTime: submittedTimeText,
    siegeElapsed: submittedSiegeElapsedText,
    submittedAtMs,
    plannedSiegeAtMs,
    siegeStartedAtMs,
    siegeOn,
    legendMode: legendModeSelect ? legendModeSelect.value : null,
    aerialMode: aerialModeSelect ? aerialModeSelect.value : null,
    excavationMode: excavationModeSelect ? excavationModeSelect.value : null,
    remoteMode: remoteModeSelect ? remoteModeSelect.value : null,
  };
}

syncReportContext();

function formatDateForDisplay(isoDate) {
  if (!isoDate) {
    return "-";
  }

  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) {
    return isoDate;
  }

  return `${day}/${month}/${year}`;
}

function formatTwoDigits(value) {
  return String(value).padStart(2, "0");
}

function formatElapsedDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) {
    return "-";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${formatTwoDigits(seconds)}s`;
}

function updateSiegePanelInfo() {
  if (siegePanelResearcher) {
    siegePanelResearcher.textContent = submittedResearcherName;
  }
  if (siegePanelDate) {
    siegePanelDate.textContent = submittedResearchDateText;
  }
  if (siegePanelTime) {
    siegePanelTime.textContent = submittedTimeText;
  }
  if (siegePanelElapsed) {
    siegePanelElapsed.textContent = submittedSiegeElapsedText;
  }

  syncReportContext();
}

async function downloadCurrentMapView() {
  const includeLegend = !legendModeSelect || legendModeSelect.value === "with";
  const includeAerial = !aerialModeSelect || aerialModeSelect.value === "with";
  const includeExcavation =
    !excavationModeSelect || excavationModeSelect.value === "with";
  const includeRemote = !remoteModeSelect || remoteModeSelect.value === "with";

  document.body.classList.toggle("legend-hidden", !includeLegend);

  if (aerial) {
    aerial.style.display = includeAerial ? "flex" : "none";
  }
  if (level) {
    level.style.display = includeExcavation ? "flex" : "none";
  }
  if (remote) {
    remote.style.display = includeRemote ? "block" : "none";
  }
  if (tooltip) {
    tooltip.style.visibility = includeRemote ? "visible" : "hidden";
  }

  document.body.classList.add("screenshot-mode");
}

if (aerialModeSelect) {
  aerialModeSelect.addEventListener("change", () => {
    const includeAerial = aerialModeSelect.value === "with";
    if (aerial) {
      aerial.style.display = includeAerial ? "flex" : "none";
    }
    syncReportContext();
  });
}

if (excavationModeSelect) {
  excavationModeSelect.addEventListener("change", () => {
    const includeExcavation = excavationModeSelect.value === "with";
    if (level) {
      level.style.display = includeExcavation ? "flex" : "none";
    }
    syncReportContext();
  });
}

if (remoteModeSelect) {
  remoteModeSelect.addEventListener("change", () => {
    const includeRemote = remoteModeSelect.value === "with";
    if (remote) {
      remote.style.display = includeRemote ? "block" : "none";
    }
    if (tooltip) {
      tooltip.style.visibility = includeRemote ? "visible" : "hidden";
    }
    syncReportContext();
  });
}

if (legendModeSelect) {
  legendModeSelect.addEventListener("change", () => {
    const includeLegend = legendModeSelect.value === "with";
    document.body.classList.toggle("legend-hidden", !includeLegend);
    syncReportContext();
  });
}

function openCapturePanel() {
  const saveControls = document.getElementById("save-controls");
  document.body.classList.remove("screenshot-mode");

  // Restore visibility of all sections when capture panel is reopened.
  if (aerial) aerial.style.display = "";
  if (level) level.style.display = "";
  if (remote) remote.style.display = "";
  if (tooltip) tooltip.style.visibility = "";
  document.body.classList.remove("legend-hidden");
  if (saveControls) {
    saveControls.style.display = "";
  }
}

function closeCapturePanel() {
  if (!siegeOn) {
    return;
  }

  const saveControls = document.getElementById("save-controls");
  if (saveControls) {
    saveControls.style.display = "none";
  }

  document.body.classList.add("screenshot-mode");
}

function toggleCapturePanel() {
  const saveControls = document.getElementById("save-controls");
  const panelHiddenInline =
    !!saveControls && saveControls.style.display === "none";
  const isClosed =
    document.body.classList.contains("screenshot-mode") || panelHiddenInline;

  if (isClosed) {
    openCapturePanel();
    return;
  }

  closeCapturePanel();
}

if (captureMapButton) {
  captureMapButton.addEventListener("click", () => {
    toggleCapturePanel();
  });
}

if (researchDateInput) {
  researchDateInput.value = new Date().toISOString().split("T")[0];
}

if (preloaderForm && preloader) {
  preloaderForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const submitNow = new Date();
    submittedAtMs = submitNow.getTime();
    submittedResearcherName =
      (researcherNameInput?.value || "").trim() || "Unknown";
    submittedResearchDateText = formatDateForDisplay(
      researchDateInput?.value || "",
    );
    submittedTimeText = `${formatTwoDigits(submitNow.getHours())}:${formatTwoDigits(submitNow.getMinutes())}:${formatTwoDigits(submitNow.getSeconds())}`;
    submittedSiegeElapsedText = "Pending...";
    updateSiegePanelInfo();

    // Ensure excavation is centered before and during the fade-out transition.
    resetEntryViewport();
    preloader.classList.add("hidden");

    window.setTimeout(() => {
      document.body.classList.remove("preloading");
      preloader.remove();

      // Removing preloading can shift scroll state in some browsers; recenter once unlocked.
      resetEntryViewport();

      // Preloader state can affect initial section sizes; force p5 canvases to resync.
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
        if (typeof window.paintAerialScene === "function") {
          window.paintAerialScene();
        }
        if (typeof window.paintRemoteScene === "function") {
          window.paintRemoteScene();
        }
        if (typeof window.paintRemoteStringScene === "function") {
          window.paintRemoteStringScene();
        }
      });

      scheduleRandomSiegeTrigger();
    }, 650);
  });
}

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

function resetEntryViewport() {
  if (!level) {
    return;
  }

  // Force a fresh landing position on every load/reload.
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  requestAnimationFrame(() => {
    level.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: "auto",
    });
  });
}

function scheduleRandomSiegeTrigger() {
  if (randomSiegeTimerId !== null) {
    window.clearTimeout(randomSiegeTimerId);
  }

  const delayMs =
    MIN_SIEGE_DELAY_MS +
    Math.floor(Math.random() * (MAX_SIEGE_DELAY_MS - MIN_SIEGE_DELAY_MS + 1));

  plannedSiegeAtMs = Date.now() + delayMs;
  syncReportContext();
  startSiegeCountdownTimer();

  randomSiegeTimerId = window.setTimeout(() => {
    randomSiegeTimerId = null;
    setSiegeState(true);
  }, delayMs);
}

window.addEventListener("DOMContentLoaded", resetEntryViewport);
window.addEventListener("load", resetEntryViewport);
window.addEventListener("pageshow", resetEntryViewport);

function updateRemoteFocusPosition(x, y) {
  if (!remote || !tooltip) {
    return;
  }

  const clampedX = Math.max(0, Math.min(x, remote.clientWidth));
  const clampedY = Math.max(0, Math.min(y, remote.clientHeight));

  remote.style.setProperty("--mx", `${clampedX}px`);
  remote.style.setProperty("--my", `${clampedY}px`);

  tooltip.style.left = `${clampedX - tooltip.offsetWidth / 2}px`;
  tooltip.style.top = `${clampedY - tooltip.offsetHeight / 2}px`;
}

function initializeRemoteFocusPosition() {
  if (!remote) {
    return;
  }

  updateRemoteFocusPosition(remote.clientWidth / 2, remote.clientHeight / 2);
}

window.addEventListener("load", initializeRemoteFocusPosition);
window.addEventListener("resize", initializeRemoteFocusPosition);

function blockScrollEvent(event) {
  if (isAutoScrollLocked) {
    event.preventDefault();
  }
}

function blockScrollKeys(event) {
  if (!isAutoScrollLocked) {
    return;
  }

  const blockedKeys = [
    "ArrowUp",
    "ArrowDown",
    "PageUp",
    "PageDown",
    "Home",
    "End",
    " ",
  ];
  if (blockedKeys.includes(event.key)) {
    event.preventDefault();
  }
}

function lockDefaultScroll() {
  isAutoScrollLocked = true;
  window.addEventListener("wheel", blockScrollEvent, { passive: false });
  window.addEventListener("touchmove", blockScrollEvent, { passive: false });
  window.addEventListener("keydown", blockScrollKeys, { passive: false });
}

function unlockDefaultScroll() {
  isAutoScrollLocked = false;
  window.removeEventListener("wheel", blockScrollEvent);
  window.removeEventListener("touchmove", blockScrollEvent);
  window.removeEventListener("keydown", blockScrollKeys);
}

function easeInOutCubic(t) {
  if (t < 0.5) {
    return 4 * t * t * t;
  }
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function animateScrollTo(targetTop, durationMs, onComplete) {
  const maxScrollableTop = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  );
  const clampedTarget = Math.min(Math.max(0, targetTop), maxScrollableTop);
  const startTop = window.scrollY;
  const delta = clampedTarget - startTop;

  if (Math.abs(delta) <= 1) {
    window.scrollTo(0, clampedTarget);
    onComplete();
    return;
  }

  const startTime = performance.now();

  const step = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / durationMs);
    const eased = easeInOutCubic(progress);
    window.scrollTo(0, startTop + delta * eased);

    if (progress < 1) {
      requestAnimationFrame(step);
      return;
    }

    window.scrollTo(0, clampedTarget);
    onComplete();
  };

  requestAnimationFrame(step);
}

function scrollToTargetAndUnlock(targetTop) {
  lockDefaultScroll();

  let didUnlock = false;
  const unlockOnce = () => {
    if (!didUnlock) {
      didUnlock = true;
      unlockDefaultScroll();
    }
  };

  // Fallback in case animation callbacks are interrupted.
  const unlockFallbackTimer = window.setTimeout(
    unlockOnce,
    AUTO_SCROLL_DURATION_MS + 250,
  );

  animateScrollTo(targetTop, AUTO_SCROLL_DURATION_MS, () => {
    window.clearTimeout(unlockFallbackTimer);
    unlockOnce();
  });
}

function onFirstWheelAutoScroll(event) {
  if (document.body.classList.contains("preloading")) {
    return;
  }

  if (siegeOn || isAutoScrollLocked) {
    return;
  }

  if (Math.abs(event.deltaY) < 1) {
    return;
  }

  const toTop = event.deltaY < 0;
  if ((toTop && hasAutoScrolledUp) || (!toTop && hasAutoScrolledDown)) {
    return;
  }

  if (toTop) {
    hasAutoScrolledUp = true;
  } else {
    hasAutoScrolledDown = true;
  }

  event.preventDefault();

  const targetTop = toTop
    ? 0
    : Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  scrollToTargetAndUnlock(targetTop);
}

if (ENABLE_AUTO_SCROLL) {
  window.addEventListener("wheel", onFirstWheelAutoScroll, {
    passive: false,
  });
}

function randomInt(max) {
  return Math.floor(Math.random() * (max + 1));
}

function positionSlotRandomly(slot) {
  if (!software || !slot) {
    return;
  }

  const softwareRect = software.getBoundingClientRect();
  slot.style.left = "0px";
  slot.style.top = "0px";

  const slotRect = slot.getBoundingClientRect();
  const maxX = Math.max(0, Math.floor(softwareRect.width - slotRect.width));
  const maxY = Math.max(0, Math.floor(softwareRect.height - slotRect.height));

  slot.style.left = `${randomInt(maxX)}px`;
  slot.style.top = `${randomInt(maxY)}px`;
}

function randomizeMapSlots() {
  mapSlots.forEach(positionSlotRandomly);
}

function randomizeAfterLayout() {
  requestAnimationFrame(() => {
    randomizeMapSlots();
  });
}

function randomizeMapsOnResize() {
  // Skip randomization during siege to lock map positions
  if (siegeOn) {
    return;
  }
  randomizeMapSlots();
}

if (software && mapSlots.length > 0) {
  randomizeMapSlots();
  requestAnimationFrame(randomizeMapSlots);

  window.addEventListener("load", randomizeMapSlots);
  window.addEventListener("resize", randomizeMapsOnResize);

  mapToggles.forEach((toggle) => {
    toggle.addEventListener("change", () => {
      // Don't reposition map slots during siege
      if (!siegeOn) {
        positionSlotRandomly(toggle.closest(".map-slot"));
      }
      toggleCount += 1;
      if (toggleCount >= 5) {
        toggleCount = 0;
        if (typeof window.paintAerialScene === "function") {
          window.paintAerialScene();
        }
      }
    });
  });

  mapSlots.forEach((slot) => {
    const toggle = slot.querySelector('input[type="checkbox"]');
    const panel = slot.querySelector(".map-panel");

    if (!toggle || !panel) {
      return;
    }

    panel.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest("a[href]")) {
        return;
      }

      toggle.checked = !toggle.checked;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });
}

function makeLayerDraggable(layer) {
  layer.style.cursor = "grab";
  layer.style.touchAction = "none";

  // Get layer index from id (layer1 → 0, layer2 → 1, etc.)
  const layerNum = parseInt(layer.id.replace("layer", ""));

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startTx = 0;
  let startTy = 0;
  let hasMovedEnough = false;

  const checkOverflow = () => {
    // Find the innermost (highest-indexed) layer that is overflowing its parent
    let maxOverflowingIndex = -1;

    draggableLayers.forEach((l) => {
      const lNum = parseInt(l.id.replace("layer", ""));
      const lIndex = lNum - 1;

      // Get parent container (either another layer or .level)
      let parent;
      if (lIndex === 0) {
        parent = level; // layer1's parent is .level
      } else {
        parent = document.querySelector(`#layer${lIndex}`); // layerN's parent is layerN-1
      }

      if (!parent) return;

      const layerRect = l.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();

      // Check if layer is outside parent bounds
      const isOverflowing =
        layerRect.left < parentRect.left ||
        layerRect.right > parentRect.right ||
        layerRect.top < parentRect.top ||
        layerRect.bottom > parentRect.bottom;

      if (isOverflowing && lIndex > maxOverflowingIndex) {
        maxOverflowingIndex = lIndex;
      }
    });

    // Each layer paints at most once (max 11 paint operations total).
    if (
      maxOverflowingIndex >= 0 &&
      !paintedLayerIndexes.has(maxOverflowingIndex)
    ) {
      paintedLayerIndexes.add(maxOverflowingIndex);
      lastPaintedLayerIndex = maxOverflowingIndex;
      if (typeof window.setLevelLayerIndex === "function") {
        window.setLevelLayerIndex(maxOverflowingIndex);
      }
      if (typeof window.paintLevelScene === "function") {
        window.paintLevelScene();
      }
    }
  };

  const onPointerMove = (e) => {
    if (!isDragging || !level) {
      return;
    }

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const nextTx = startTx + dx;
    const nextTy = startTy + dy;

    layer.style.transform = `translate(${nextTx}px, ${nextTy}px)`;
    layer.dataset.tx = String(nextTx);
    layer.dataset.ty = String(nextTy);

    // Unlock the next layer after this one has actually been dragged.
    if (!hasMovedEnough && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
      hasMovedEnough = true;
      if (
        layerNum === highestUnlockedLayer &&
        highestUnlockedLayer < draggableLayers.length
      ) {
        highestUnlockedLayer += 1;
      }
    }

    // Check overflow and update canvas
    checkOverflow();
  };

  const endDrag = () => {
    if (!isDragging) {
      return;
    }
    isDragging = false;
    layer.style.cursor = "grab";
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
  };

  layer.addEventListener("pointerdown", (e) => {
    // Allow native link interaction (click/new tab) instead of starting drag.
    if (e.target instanceof Element && e.target.closest("a[href]")) {
      return;
    }

    if (layerNum > highestUnlockedLayer) {
      return;
    }
    e.stopPropagation();
    layer.setPointerCapture(e.pointerId);
    lastPaintedLayerIndex = -1;
    isDragging = true;
    hasMovedEnough = false;
    startX = e.clientX;
    startY = e.clientY;
    startTx = Number(layer.dataset.tx || 0);
    startTy = Number(layer.dataset.ty || 0);
    layer.style.cursor = "grabbing";

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
  });
}

draggableLayers.forEach(makeLayerDraggable);

const bodyClassObserver = new MutationObserver(() => {
  randomizeAfterLayout();
});

bodyClassObserver.observe(document.body, {
  attributes: true,
  attributeFilter: ["class"],
});

function seige() {
  setSiegeState(!siegeOn);
}

function setSiegeState(nextState) {
  if (siegeOn === nextState) {
    return;
  }

  siegeOn = nextState;
  document.body.classList.toggle("siege-on", siegeOn);

  if (siegeOn) {
    stopSiegeCountdownTimer();
    siegeStartedAtMs = Date.now();
    plannedSiegeAtMs = siegeStartedAtMs;
    if (submittedAtMs !== null) {
      submittedSiegeElapsedText = formatElapsedDuration(
        Date.now() - submittedAtMs,
      );
    } else {
      submittedSiegeElapsedText = "-";
    }
    updateSiegePanelInfo();

    // Lock map slot positions to prevent any changes during siege
    mapSlots.forEach((slot) => {
      const rect = slot.getBoundingClientRect();
      const parentRect = slot.parentElement.getBoundingClientRect();
      slot.style.left = `${rect.left - parentRect.left}px`;
      slot.style.top = `${rect.top - parentRect.top}px`;
      slot.style.position = "absolute";
    });

    isRemotePointerDown = false;
    const randomX = Math.random() * Math.max(1, remote.clientWidth);
    const randomY = Math.random() * Math.max(1, remote.clientHeight);
    updateRemoteFocusPosition(randomX, randomY);
    tooltip.classList.remove("siege-collapsed");
    tooltip.style.opacity = "1";
    requestAnimationFrame(() => {
      tooltip.classList.add("siege-collapsed");
    });
  } else {
    siegeStartedAtMs = null;
    updateSiegeCountdownDisplay();
    tooltip.classList.remove("siege-collapsed");
    if (!isRemotePointerDown) {
      tooltip.style.opacity = "0";
    }
    document.body.classList.remove("screenshot-mode");
    document.body.classList.remove("legend-hidden");
  }

  level.scrollIntoView({ block: "start" });
  randomizeAfterLayout();
  syncReportContext();
}

window.addEventListener("keydown", (event) => {
  const saveControls = document.getElementById("save-controls");
  const panelHiddenInline =
    !!saveControls && saveControls.style.display === "none";

  if (event.repeat) {
    return;
  }

  const target = event.target;
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName))
  ) {
    return;
  }

  if (
    (event.key === "x" || event.key === "X") &&
    (siegeOn ||
      document.body.classList.contains("screenshot-mode") ||
      panelHiddenInline)
  ) {
    event.preventDefault();
    toggleCapturePanel();
    return;
  }

  if (event.key === "s" || event.key === "S") {
    event.preventDefault();
    seige();
  }
});

function myFunction(e) {
  if (!isRemotePointerDown) {
    return;
  }

  const rect = remote.getBoundingClientRect();

  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  updateRemoteFocusPosition(x, y);
  tooltip.style.opacity = "1";
}

remote.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) {
    return;
  }

  isRemotePointerDown = true;
  myFunction(e);
});

window.addEventListener("pointerup", () => {
  isRemotePointerDown = false;
  if (!siegeOn) {
    tooltip.style.opacity = "0";
  }
});

remote.addEventListener("pointercancel", () => {
  isRemotePointerDown = false;
  if (!siegeOn) {
    tooltip.style.opacity = "0";
  }
});

remote.addEventListener("mouseleave", () => {
  if (!isRemotePointerDown && !siegeOn) {
    tooltip.style.opacity = "0";
  }
});
