// https://editor.p5js.org/mrm029/sketches/rk8upjm9m
// https://editor.p5js.org/jeffThompson/sketches/pTeiuK7PQ

let remoteSketchInstance;

const remoteSketch = (p) => {
  let x, y, w, h;
  let base = [0, 255, "red", "blue"];
  let cnv;

  p.getRemoteSize = function () {
    const remoteContainer = document.querySelector("#remote");
    if (!remoteContainer) {
      return { width: p.windowWidth, height: p.windowHeight, container: null };
    }

    const width = Math.max(1, remoteContainer.clientWidth);
    const height = Math.max(1, remoteContainer.clientHeight);
    return { width, height, container: remoteContainer };
  };

  p.paintRemoteScene = function () {
    let totalPitCount = p.random(100, 300);
    let totalWallCount = p.random(100, 300);
    let totalShardCount = p.random(1000, 3000);
    let baselayer = p.random(base);
    p.background(baselayer);

    if (baselayer === 255) {
      p.blendMode(p.MULTIPLY);
    } else {
      p.blendMode(p.DIFFERENCE);
    }

    for (let i = 0; i < totalShardCount; i++) {
      p.drawRandomShape("shard", i + 1);
    }

    for (let i = 0; i < totalPitCount; i++) {
      p.drawRandomShape("cremation", i + 1);
    }

    for (let i = 0; i < totalWallCount; i++) {
      p.drawRandomShape("wall", i + 1);
    }
  };

  p.setup = function () {
    const { width, height, container } = p.getRemoteSize();
    cnv = p.createCanvas(width, height);
    cnv.addClass("remote-canvas");
    p.textFont("Courier New");
    if (container) {
      cnv.parent(container);

      // Tooltip has pointer-events:none, so pressing the lens area hits #remote.
      // Repaint on every press, including while siege is active.
      container.addEventListener("pointerdown", (event) => {
        if (event.button !== undefined && event.button !== 0) {
          return;
        }
        p.paintRemoteScene();
      });
    }

    p.paintRemoteScene();
  };

  p.windowResized = function () {
    const { width, height } = p.getRemoteSize();
    p.resizeCanvas(width, height);
    // Don't repaint during siege to lock the scene
    if (!window.siegeOn) {
      p.paintRemoteScene();
    }
  };

  p.draw = function () {};

  p.saveImage = function () {
    let filename = `${p.day()}${p.month()}${p.year()}${p.hour()}${p.minute()}${p.second()}`;
    p.saveCanvas(cnv, filename, "jpg");
  };

  p.drawRandomShape = function (choice, shapeNumber) {
    x = p.random(0, p.width);
    y = p.random(0, p.height);
    w = p.random(5, 120);
    h = p.random(5, 150);

    if (choice == "cremation") {
      p.drawingContext.setLineDash(
        [p.random(0, 10), p.random(0, 10)],
        [p.random(0, 10), p.random(0, 10)],
      );
      p.strokeWeight(p.random(3));
      p.stroke(p.random(200), 0, p.random(200), 255);
      p.fill(p.random(200), 0, p.random(200), p.random(100));
      p.ellipse(x, y, w);
    } else if (choice == "wall") {
      p.drawingContext.setLineDash(
        [p.random(0, 10), p.random(0, 10)],
        [p.random(0, 10), p.random(0, 10)],
      );
      p.strokeWeight(p.random(3));
      p.stroke(p.random(200), 0, p.random(200), 255);
      p.fill(p.random(200), 0, p.random(200), p.random(100));
      p.rect(x, y, w, h);
    } else if (choice == "shard") {
      p.strokeWeight(4);
      p.stroke(p.random(200), 0, p.random(200), 255);
      p.point(x, y);
    }

    p.push();
    p.blendMode(p.BLEND);
    p.noStroke();
    p.fill(255, 230);
    p.textSize(10);
    p.textAlign(p.LEFT, p.TOP);
    p.text(`${choice}${shapeNumber}`, x + 4, y + 4);
    p.pop();
  };
};

remoteSketchInstance = new p5(remoteSketch);
window.paintRemoteScene = function () {
  if (remoteSketchInstance) {
    remoteSketchInstance.paintRemoteScene();
  }
};
