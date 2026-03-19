(() => {
  const REPORT_BUTTON_ID = "generate-report-btn";
  const ENABLE_SIEGE_CORRUPTION = false;
  const SYMBOLS = "!@#$%^&*(){}[]\\/<>";
  const MAX_SNIPPET_LENGTH = 180;
  const runtimeBaseUrl = new URL(
    ".",
    (document.currentScript && document.currentScript.src) ||
      window.location.href,
  );

  const COIN_FILES = [
    "artifacts/coins/Calciati_01.txt",
    "artifacts/coins/Calciati_03.txt",
    "artifacts/coins/Calciati_06.txt",
    "artifacts/coins/Calciati_08.txt",
    "artifacts/coins/Calciati_10.txt",
    "artifacts/coins/Calciati_9.txt",
    "artifacts/coins/Hoover_HGC_945.txt",
    "artifacts/coins/Jameson_667.1.txt",
    "artifacts/coins/Jameson_667.2.txt",
    "artifacts/coins/Jameson_667.txt",
    "artifacts/coins/Jenkins_74.txt",
    "artifacts/coins/Jenkins_pl_23_7.txt",
    "artifacts/coins/Manganaro_CXLIII_8.txt",
    "artifacts/coins/SNGANS_503.txt",
    "artifacts/coins/SNGANS_504.txt",
    "artifacts/coins/SNGANS_508.txt",
  ];

  function toRuntimeUrl(path) {
    const normalized = String(path || "").replace(/^\/+/, "");
    return new URL(normalized, runtimeBaseUrl).toString();
  }

  function randomPick(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return "";
    }
    return items[Math.floor(Math.random() * items.length)];
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function parsePlainLines(text) {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.replace(/^\/\/\s?/, ""));
  }

  function parseCoin2Lines(text) {
    const lines = [];
    const altRegex = /alt="([^"]*)"/g;
    let match = altRegex.exec(text);
    while (match) {
      const cleaned = (match[1] || "").replace(/\s+/g, " ").trim();
      if (cleaned) {
        lines.push(cleaned);
      }
      match = altRegex.exec(text);
    }
    return lines;
  }

  async function fetchText(path) {
    const response = await fetch(toRuntimeUrl(path), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Unable to load ${path}`);
    }
    return response.text();
  }

  async function fetchTextOrEmpty(path) {
    try {
      return await fetchText(path);
    } catch (error) {
      console.warn("[report] source unavailable", path, error);
      return "";
    }
  }

  async function loadArtifactPools() {
    const [aerialText, remoteText, coin2Text, ...coinFileTexts] =
      await Promise.all([
        fetchTextOrEmpty("artifacts/comments_aerial.txt"),
        fetchTextOrEmpty("artifacts/comments_remote.txt"),
        fetchTextOrEmpty("artifacts/coins2.txt"),
        ...COIN_FILES.map((path) => fetchTextOrEmpty(path)),
      ]);

    const aerialLines = parsePlainLines(aerialText);
    const remoteLines = parsePlainLines(remoteText);
    const coin2Lines = parseCoin2Lines(coin2Text);
    const coinLines = coinFileTexts.flatMap(parsePlainLines);

    return {
      aerialLines,
      remoteLines,
      coin2Lines,
      coinLines,
      allLines: [...aerialLines, ...remoteLines, ...coin2Lines, ...coinLines],
    };
  }

  function getReportContext() {
    const shared = window.scaviReportContext || {};

    const textById = (id) => {
      const node = document.getElementById(id);
      return node ? node.textContent.trim() : "-";
    };

    return {
      researcher: shared.researcher || textById("siege-researcher") || "-",
      researchDate: shared.researchDate || textById("siege-date") || "-",
      researchTime: shared.researchTime || textById("siege-time") || "-",
      siegeElapsed: shared.siegeElapsed || textById("siege-elapsed") || "-",
      submittedAtMs:
        typeof shared.submittedAtMs === "number" ? shared.submittedAtMs : null,
      plannedSiegeAtMs:
        typeof shared.plannedSiegeAtMs === "number"
          ? shared.plannedSiegeAtMs
          : null,
      siegeStartedAtMs:
        typeof shared.siegeStartedAtMs === "number"
          ? shared.siegeStartedAtMs
          : null,
      legendMode: shared.legendMode || "-",
      aerialMode: shared.aerialMode || "-",
      excavationMode: shared.excavationMode || "-",
      remoteMode: shared.remoteMode || "-",
      siegeOn: !!shared.siegeOn,
    };
  }

  function computeCorruptionRatio(clickMs, context, fallbackStartMs) {
    const siegeReferenceMs =
      context.siegeStartedAtMs || context.plannedSiegeAtMs || Date.now();
    const sessionStartMs = context.submittedAtMs || fallbackStartMs;

    if (!Number.isFinite(clickMs) || !Number.isFinite(sessionStartMs)) {
      return 0;
    }

    if (clickMs >= siegeReferenceMs) {
      return 0;
    }

    const totalBeforeSiegeWindowMs = Math.max(
      1,
      siegeReferenceMs - sessionStartMs,
    );
    const clickLeadMs = siegeReferenceMs - clickMs;
    const normalized = clamp(clickLeadMs / totalBeforeSiegeWindowMs, 0, 1);

    return clamp(normalized * 0.75, 0, 0.75);
  }

  function scrambleLine(input, ratio) {
    if (!input || ratio <= 0) {
      return input;
    }

    const chars = input.split("");
    const mutableIndexes = [];
    for (let i = 0; i < chars.length; i += 1) {
      if (!/\s/.test(chars[i])) {
        mutableIndexes.push(i);
      }
    }

    if (mutableIndexes.length === 0) {
      return input;
    }

    const swapCount = Math.max(1, Math.floor(mutableIndexes.length * ratio));
    for (let i = 0; i < swapCount; i += 1) {
      const pick =
        mutableIndexes[Math.floor(Math.random() * mutableIndexes.length)];
      chars[pick] = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    }

    return chars.join("");
  }

  function formatClickLine(click, index, artifacts, context, fallbackStartMs) {
    const clickMs = Date.parse(click.timestamp || "");
    const corruptionRatio = ENABLE_SIEGE_CORRUPTION
      ? computeCorruptionRatio(clickMs, context, fallbackStartMs)
      : 0;

    const sourceLine =
      randomPick(artifacts.allLines) || "[no artifact text available]";
    const scrambledSourceLine = scrambleLine(sourceLine, corruptionRatio);

    const label = [
      click.selector || "unknown",
      click.tag ? `tag=${click.tag}` : "",
      click.id ? `id=${click.id}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const snippet = (click.text || "")
      .replace(/\s+/g, " ")
      .slice(0, MAX_SNIPPET_LENGTH);

    return [
      `[${String(index + 1).padStart(3, "0")}] ${click.timestamp || "unknown-time"}`,
      `target: ${label || "unknown"}`,
      `coords: page(${click.pageX ?? "?"}, ${click.pageY ?? "?"}) client(${click.clientX ?? "?"}, ${click.clientY ?? "?"})`,
      `snippet: ${snippet || "-"}`,
      `artifact: ${scrambledSourceLine}`,
      "",
    ].join("\n");
  }

  function buildReportText(clicks, artifacts, context) {
    const firstClickMs = clicks.length
      ? Date.parse(clicks[0].timestamp || "") || Date.now()
      : Date.now();
    const fallbackStartMs = context.submittedAtMs || firstClickMs;

    const header = [
      "SCAVI REPORT",
      `Generated: ${new Date().toISOString()}`,
      "",
      "LEGEND DATA",
      `Researcher: ${context.researcher}`,
      `Date: ${context.researchDate}`,
      `Time: ${context.researchTime}`,
      `Siege Elapsed: ${context.siegeElapsed}`,
      "",
      "CAPTURE MODES",
      `Legend: ${context.legendMode}`,
      `Aerial: ${context.aerialMode}`,
      `Excavation: ${context.excavationMode}`,
      `Remote: ${context.remoteMode}`,
      `Siege Active: ${context.siegeOn ? "yes" : "no"}`,
      "",
      "ARTIFACT SOURCES",
      `comments_aerial lines: ${artifacts.aerialLines.length}`,
      `comments_remote lines: ${artifacts.remoteLines.length}`,
      `coins2 lines: ${artifacts.coin2Lines.length}`,
      `coins folder lines: ${artifacts.coinLines.length}`,
      "",
      "ARTIFACT POOL",
      `Total Clicks: ${clicks.length}`,
      "",
    ].join("\n");

    const clickLines = clicks
      .map((click, index) =>
        formatClickLine(click, index, artifacts, context, fallbackStartMs),
      )
      .join("\n");

    return `${header}${clickLines}`;
  }

  function sanitizeResearcherName(input) {
    const base = String(input || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    return base || "unknown";
  }

  function buildDateToken(context) {
    const dateText = String(context.researchDate || "").trim();
    const slashMatch = dateText.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slashMatch) {
      return `${slashMatch[1]}${slashMatch[2]}${slashMatch[3]}`;
    }

    const isoMatch = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return `${isoMatch[3]}${isoMatch[2]}${isoMatch[1]}`;
    }

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = String(now.getFullYear());
    return `${dd}${mm}${yyyy}`;
  }

  function buildTimeToken(context) {
    const timeText = String(context.researchTime || "").trim();
    const timeMatch = timeText.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (timeMatch) {
      const hours = timeMatch[1];
      const minutes = timeMatch[2];
      const seconds = timeMatch[3] || "00";
      return `${hours}${minutes}${seconds}`;
    }

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `${hh}${mm}${ss}`;
  }

  function buildReportFileName(context) {
    const researcher = sanitizeResearcherName(context.researcher);
    const dateToken = buildDateToken(context);
    const timeToken = buildTimeToken(context);
    return `scavi_${researcher}_${dateToken}_${timeToken}.txt`;
  }

  function escapeHtml(input) {
    return String(input || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function openTextInNewTab(text, fileName) {
    const opened = window.open("", "_blank");
    if (!opened) {
      // Fallback: download directly when popup is blocked.
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 10000);
      return;
    }

    const escapedText = escapeHtml(text);
    const escapedFileName = escapeHtml(fileName);
    const fileNameJson = JSON.stringify(fileName);

    opened.document.open();
    opened.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapedFileName}</title>
    <style>
      body {
        margin: 0;
        padding: 16px;
        font-family: "Courier New", Courier, monospace;
        background: #111;
        color: #f7f7f7;
      }
      .toolbar {
        position: sticky;
        top: 0;
        background: #111;
        padding-bottom: 12px;
      }
      .download-link {
        display: inline-block;
        color: #111;
        background: #f7f7f7;
        border: 1px solid #f7f7f7;
        text-decoration: none;
        padding: 6px 10px;
      }
      pre {
        white-space: pre-wrap;
        word-break: break-word;
        margin: 0;
        border: 1px solid #444;
        padding: 12px;
        background: #000;
      }
    </style>
  </head>
  <body>
    <div class="toolbar">
      <a id="download-report" class="download-link" href="#">Download ${escapedFileName}</a>
    </div>
    <pre id="report-content">${escapedText}</pre>
    <script>
      const reportText = document.getElementById("report-content").textContent;
      const reportBlob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
      const reportBlobUrl = URL.createObjectURL(reportBlob);
      const downloadLink = document.getElementById("download-report");
      downloadLink.href = reportBlobUrl;
      downloadLink.download = ${fileNameJson};
      window.addEventListener("beforeunload", () => {
        URL.revokeObjectURL(reportBlobUrl);
      });
    </script>
  </body>
</html>`);
    opened.document.close();
  }

  async function generateReport() {
    const trackingApi = window.clickTracking;
    const clicks =
      trackingApi && typeof trackingApi.getAll === "function"
        ? trackingApi.getAll()
        : [];

    const [artifacts, context] = await Promise.all([
      loadArtifactPools(),
      Promise.resolve(getReportContext()),
    ]);

    const fileName = buildReportFileName(context);
    const reportText = buildReportText(clicks, artifacts, context);
    openTextInNewTab(reportText, fileName);
  }

  function attachReportHandler() {
    const button = document.getElementById(REPORT_BUTTON_ID);
    if (!button) {
      return;
    }

    button.addEventListener("click", async () => {
      const initialLabel = button.textContent;
      button.disabled = true;
      button.textContent = "Generating...";

      try {
        await generateReport();
      } catch (error) {
        console.error("[report] generation failed", error);
      } finally {
        button.disabled = false;
        button.textContent = initialLabel;
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachReportHandler);
  } else {
    attachReportHandler();
  }
})();
