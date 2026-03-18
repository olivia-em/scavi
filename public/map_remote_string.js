let remoteStringSketchInstance;

const remoteStringSketch = (p) => {
  let cnv;
  let sourceLines = [];
  const rotations = [0, 90, 180, 270];

  p.getRemoteSize = function () {
    const remoteContainer = document.querySelector("#remote");
    if (!remoteContainer) {
      return { width: p.windowWidth, height: p.windowHeight, container: null };
    }

    const width = Math.max(1, remoteContainer.clientWidth);
    const height = Math.max(1, remoteContainer.clientHeight);
    return { width, height, container: remoteContainer };
  };

  p.getRandomLine = function () {
    if (!sourceLines.length) {
      return "no source text";
    }
    return sourceLines[p.floor(p.random(sourceLines.length))];
  };

  p.fetchSourceFile = async function (path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`failed to fetch ${path}: ${response.status}`);
    }

    const raw = await response.text();
    const normalized = raw.trimStart().toLowerCase();

    // Prevent parsing fallback HTML error pages as source text lines.
    if (normalized.startsWith("<!doctype") || normalized.startsWith("<html")) {
      throw new Error(`unexpected html response for ${path}`);
    }

    return raw;
  };

  p.loadSourceText = async function () {
    const [structureRaw, coinsRaw] = await Promise.all([
      p.fetchSourceFile("structure.txt"),
      p.fetchSourceFile("coins.txt"),
    ]);

    const structureLines = structureRaw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const coinsLines = coinsRaw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    sourceLines = [...structureLines, ...coinsLines];

    if (!sourceLines.length) {
      throw new Error("source text files are empty");
    }
  };

  p.paintRemoteStringScene = function () {
    p.background(0);
    p.textFont("Courier New");
    p.textSize(24);
    p.fill(255, 240);
    p.noStroke();

    const totalStrings = p.floor(p.random(100, 201));
    for (let i = 0; i < totalStrings; i++) {
      const textLine = p.getRandomLine();
      const x = p.random(0, p.width);
      const y = p.random(0, p.height);
      const deg = rotations[p.floor(p.random(rotations.length))];

      p.push();
      p.translate(x, y);
      p.rotate(p.radians(deg));
      p.textAlign(p.LEFT, p.TOP);
      p.text(textLine, 0, 0);
      p.pop();
    }
  };

  p.setup = function () {
    const { width, height, container } = p.getRemoteSize();
    cnv = p.createCanvas(width, height);
    cnv.addClass("remote-string-canvas");
    if (container) {
      cnv.parent(container);
    }

    p.clear();
    p.loadSourceText()
      .then(() => {
        p.paintRemoteStringScene();
      })
      .catch(() => {
        sourceLines = [
          "failed to load structure.txt",
          "failed to load coins.txt",
        ];
        p.paintRemoteStringScene();
      });
  };

  p.windowResized = function () {
    const { width, height } = p.getRemoteSize();
    p.resizeCanvas(width, height);
    // Don't repaint during siege to lock the scene
    if (!window.siegeOn) {
      p.paintRemoteStringScene();
    }
  };

  p.draw = function () {};
};

remoteStringSketchInstance = new p5(remoteStringSketch);
window.paintRemoteStringScene = function () {
  if (remoteStringSketchInstance) {
    remoteStringSketchInstance.paintRemoteStringScene();
  }
};
