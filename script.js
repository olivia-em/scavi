// https://codepen.io/paulvddool/pen/mROEGa
// https://speckyboy.com/looking-through-the-use-of-x-ray-effects/

const level = document.querySelector(".level");
const draggableLayers = Array.from(document.querySelectorAll(".level .layer"));
const siegeButton = document.getElementById("seige");
const remote = document.getElementById("remote");
const tooltip = document.getElementById("tooltip");
const groundText = document.getElementById("groundText");
const groundReveal = document.getElementById("groundReveal");
const software = document.getElementById("software");
const mapSlots = Array.from(document.querySelectorAll("#software .map-slot"));
const mapToggles = Array.from(
  document.querySelectorAll('#software input[type="checkbox"]'),
);
let toggleCount = 0;
let siegeOn = false;
let lastPaintedLayerIndex = -1; // Global tracking of which layer is currently painted on canvas
let highestUnlockedLayer = 1; // Only layer1 is draggable initially
const paintedLayerIndexes = new Set(); // Each layer can paint only once

// groundReveal.textContent = groundText.textContent;

setTimeout(() => {
  level.scrollIntoView({ block: "start" });
}, 0);

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

if (software && mapSlots.length > 0) {
  randomizeMapSlots();
  requestAnimationFrame(randomizeMapSlots);

  window.addEventListener("load", randomizeMapSlots);
  window.addEventListener("resize", randomizeMapSlots);

  mapToggles.forEach((toggle) => {
    toggle.addEventListener("change", () => {
      positionSlotRandomly(toggle.closest(".map-slot"));
      toggleCount += 1;
      if (toggleCount >= 5) {
        toggleCount = 0;
        if (typeof window.paintAerialScene === "function") {
          window.paintAerialScene();
        }
      }
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

    // Check overflow and update canvas (only paints once if state changed)
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
  console.log("Siege mode toggled");
  siegeOn = !siegeOn;
  document.body.classList.toggle("siege-on", siegeOn);
  siegeButton.textContent = siegeOn ? "Seige: ON" : "Seige: OFF";
  siegeButton.setAttribute("aria-pressed", String(siegeOn));
  level.scrollIntoView({ block: "start" });
  randomizeAfterLayout();
}

function myFunction(e) {
  const rect = remote.getBoundingClientRect();

  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  remote.style.setProperty("--mx", `${x}px`);
  remote.style.setProperty("--my", `${y}px`);

  tooltip.style.left = `${x - tooltip.offsetWidth / 2}px`;
  tooltip.style.top = `${y - tooltip.offsetHeight / 2}px`;
  tooltip.style.opacity = "1";
}

remote.addEventListener("mouseleave", () => {
  tooltip.style.opacity = "0";
});
