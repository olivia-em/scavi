// https://editor.p5js.org/mrm029/sketches/rk8upjm9m
// https://editor.p5js.org/jeffThompson/sketches/pTeiuK7PQ
// https://editor.p5js.org/oliviaemlee/sketches/FcMv-gpmP

let aerialSketchInstance;

const aerialSketch = (p) => {
  let x, y, w, h;
  let base = [255, "red", "blue"];
  let cnv;

  p.getAerialSize = function () {
    const aerialContainer = document.querySelector(".aerial");
    if (!aerialContainer) {
      return { width: p.windowWidth, height: p.windowHeight, container: null };
    }

    const width = Math.max(1, aerialContainer.clientWidth);
    const height = Math.max(1, aerialContainer.clientHeight);
    return { width, height, container: aerialContainer };
  };

  p.paintAerialScene = function () {
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
      p.drawRandomShape("shard");
    }

    for (let i = 0; i < totalPitCount; i++) {
      p.drawRandomShape("cremation");
    }

    for (let i = 0; i < totalWallCount; i++) {
      p.drawRandomShape("wall");
    }
  };

  p.setup = function () {
    const { width, height, container } = p.getAerialSize();
    cnv = p.createCanvas(width, height);
    if (container) {
      cnv.parent(container);
    }

    p.paintAerialScene();
  };

  p.windowResized = function () {
    const { width, height } = p.getAerialSize();
    p.resizeCanvas(width, height);
    // Don't repaint during siege to lock the scene
    if (!window.siegeOn) {
      p.paintAerialScene();
    }
  };

  p.draw = function () {};

  p.saveImage = function () {
    let filename = `${p.day()}${p.month()}${p.year()}${p.hour()}${p.minute()}${p.second()}`;
    p.saveCanvas(cnv, filename, "jpg");
  };

  p.drawRandomShape = function (choice) {
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
  };
};

aerialSketchInstance = new p5(aerialSketch);
window.paintAerialScene = function () {
  if (aerialSketchInstance) {
    aerialSketchInstance.paintAerialScene();
  }
};
