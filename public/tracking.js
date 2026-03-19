(() => {
  const CLICK_LOG_LIMIT = 500;
  const clickLog = [];
  let totalClicks = 0;

  function getSelector(element) {
    if (!(element instanceof Element)) {
      return "unknown";
    }

    if (element.id) {
      return `#${element.id}`;
    }

    const className = (element.className || "").toString().trim();
    const classSelector = className
      ? `.${className.split(/\s+/).slice(0, 3).join(".")}`
      : "";

    return `${element.tagName.toLowerCase()}${classSelector}`;
  }

  function toClickRecord(event) {
    const target = event.target instanceof Element ? event.target : null;

    return {
      timestamp: new Date().toISOString(),
      pageX: event.pageX,
      pageY: event.pageY,
      clientX: event.clientX,
      clientY: event.clientY,
      button: event.button,
      tag: target ? target.tagName.toLowerCase() : null,
      id: target ? target.id || null : null,
      classes: target && target.classList ? Array.from(target.classList) : [],
      text: target ? (target.textContent || "").trim().slice(0, 120) : null,
      selector: getSelector(target),
      path: window.location.pathname,
    };
  }

  function trackClick(event) {
    const record = toClickRecord(event);
    totalClicks += 1;
    clickLog.push(record);

    // Keep memory bounded if the page runs for a long time.
    if (clickLog.length > CLICK_LOG_LIMIT) {
      clickLog.shift();
    }

    window.dispatchEvent(
      new CustomEvent("page-click-tracked", {
        detail: record,
      }),
    );

    // console.log(`[tracking] total clicks: ${totalClicks}`);
    // console.debug("[tracking] click", record);
  }

  // Capture phase helps ensure clicks are tracked even when bubbling is stopped.
  document.addEventListener("click", trackClick, true);

  window.clickTracking = {
    getAll() {
      return clickLog.slice();
    },
    getTotal() {
      return totalClicks;
    },
    clear() {
      clickLog.length = 0;
      totalClicks = 0;
    },
  };
})();
