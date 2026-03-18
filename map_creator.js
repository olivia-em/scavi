// https://editor.p5js.org/mrm029/sketches/rk8upjm9m
// https://editor.p5js.org/jeffThompson/sketches/pTeiuK7PQ

let levelSketchInstance;

const levelSketch = (p) => {
  let x, y, w, h;
  let base = [255, "red", "blue"];
  let cnv;
  let currentLayerIndex = 0; // 0-10 for layers 1-11
  let hasUserTriggeredPaint = false;

  p.getLevelSize = function () {
    const levelContainer = document.querySelector(".level");
    if (!levelContainer) {
      return { width: p.windowWidth, height: p.windowHeight, container: null };
    }

    const width = Math.max(1, levelContainer.clientWidth);
    const height = Math.max(1, levelContainer.clientHeight);
    return { width, height, container: levelContainer };
  };

  p.getLayerType = function (layerIndex) {
    const types = ["shard", "cremation", "wall"];
    return types[p.floor(p.random(types.length))];
  };

  p.paintLayer = function (layerIndex) {
    let baselayer = base[layerIndex % base.length];
    p.background(baselayer);

    if (baselayer === 255) {
      p.blendMode(p.MULTIPLY);
    } else {
      p.blendMode(p.DIFFERENCE);
    }

    let layerType = p.getLayerType(layerIndex);

    if (layerType === "shard") {
      let totalShardCount = p.random(300, 1000);
      for (let i = 0; i < totalShardCount; i++) {
        p.drawRandomShape("shard", i + 1);
      }
    } else if (layerType === "cremation") {
      let totalPitCount = p.random(20, 40);
      for (let i = 0; i < totalPitCount; i++) {
        p.drawRandomShape("cremation", i + 1);
      }
    } else if (layerType === "wall") {
      let totalWallCount = p.random(20, 40);
      for (let i = 0; i < totalWallCount; i++) {
        p.drawRandomShape("wall", i + 1);
      }
    }
  };

  p.paintLevelScene = function () {
    hasUserTriggeredPaint = true;
    p.paintLayer(currentLayerIndex);
  };

  p.setLayerIndex = function (idx) {
    currentLayerIndex = idx;
  };

  p.setup = function () {
    const { width, height, container } = p.getLevelSize();
    cnv = p.createCanvas(width, height);
    p.textFont("Courier New");
    if (container) {
      cnv.parent(container);
    }
  };

  p.windowResized = function () {
    const { width, height } = p.getLevelSize();
    p.resizeCanvas(width, height);
    if (hasUserTriggeredPaint) {
      p.paintLevelScene();
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

levelSketchInstance = new p5(levelSketch);
window.paintLevelScene = function () {
  if (levelSketchInstance) {
    levelSketchInstance.paintLevelScene();
  }
};
window.setLevelLayerIndex = function (idx) {
  if (levelSketchInstance) {
    levelSketchInstance.setLayerIndex(idx);
  }
};
