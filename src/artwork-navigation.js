export function createArtworkNavigation(stage, artwork, redraw) {
  const zoomLabel = stage.querySelector("[data-view-reset]");
  const pointers = new Map();
  const home = { x: 0, y: 0, zoom: 1 };
  let view = home;
  let target = home;
  let frame = 0;
  let redrawTimer = 0;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  function paint(next) {
    if (next.zoom !== view.zoom) {
      clearTimeout(redrawTimer);
      redrawTimer = setTimeout(redraw, 110);
    }
    view = next;
    artwork.style.transform = view.x || view.y || view.zoom !== 1
      ? "translate(" + view.x + "px, " + view.y + "px) scale(" + view.zoom + ")"
      : "";
    const label = Math.round(view.zoom * 100) + "%";
    if (zoomLabel.textContent !== label) zoomLabel.textContent = label;
  }

  function step() {
    frame = 0;
    if (Math.abs(target.x - view.x) + Math.abs(target.y - view.y) +
        100 * Math.abs(target.zoom - view.zoom) < 0.25) {
      paint(target);
      return;
    }
    paint({
      x: view.x + (target.x - view.x) * 0.24,
      y: view.y + (target.y - view.y) * 0.24,
      zoom: view.zoom + (target.zoom - view.zoom) * 0.24,
    });
    frame = requestAnimationFrame(step);
  }

  function move(next, smooth = false) {
    const limitX = Math.max(0, (stage.clientWidth + artwork.offsetWidth * next.zoom) / 2 - 40);
    const limitY = Math.max(0, (stage.clientHeight + artwork.offsetHeight * next.zoom) / 2 - 40);
    target = {
      x: Math.max(-limitX, Math.min(limitX, next.x)),
      y: Math.max(-limitY, Math.min(limitY, next.y)),
      zoom: next.zoom,
    };
    if (smooth && !reducedMotion.matches) {
      if (!frame) frame = requestAnimationFrame(step);
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      paint(target);
    }
  }

  function zoomBy(from, to, factor, smooth) {
    const base = smooth ? target : view;
    const zoom = Math.max(0.5, Math.min(6, base.zoom * factor));
    const ratio = zoom / base.zoom;
    const box = stage.getBoundingClientRect();
    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    move({
      x: to.x - centerX - (from.x - centerX - base.x) * ratio,
      y: to.y - centerY - (from.y - centerY - base.y) * ratio,
      zoom,
    }, smooth);
  }

  function zoomAtCenter(factor) {
    const box = stage.getBoundingClientRect();
    const center = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    zoomBy(center, center, factor, true);
  }

  stage.addEventListener("wheel", (event) => {
    if (!event.deltaY) return;
    event.preventDefault();
    const point = { x: event.clientX, y: event.clientY };
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1;
    zoomBy(point, point, Math.exp(-event.deltaY * unit * 0.002), true);
  }, { passive: false });

  stage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || pointers.size >= 2 || event.target.closest("button, a")) return;
    stage.focus({ preventScroll: true });
    move(view);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    stage.setPointerCapture(event.pointerId);
    stage.setAttribute("data-panning", "");
  });

  stage.addEventListener("pointermove", (event) => {
    const from = pointers.get(event.pointerId);
    if (!from) return;
    const to = { x: event.clientX, y: event.clientY };
    pointers.set(event.pointerId, to);
    if (pointers.size === 1) {
      move({ x: view.x + to.x - from.x, y: view.y + to.y - from.y, zoom: view.zoom });
      return;
    }
    const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)[1];
    const previousDistance = Math.hypot(from.x - other.x, from.y - other.y);
    const distance = Math.hypot(to.x - other.x, to.y - other.y);
    zoomBy({ x: (from.x + other.x) / 2, y: (from.y + other.y) / 2 },
      { x: (to.x + other.x) / 2, y: (to.y + other.y) / 2 }, distance / Math.max(1, previousDistance), false);
  });

  stage.addEventListener("lostpointercapture", (event) => {
    pointers.delete(event.pointerId);
    if (!pointers.size) stage.removeAttribute("data-panning");
  });

  stage.querySelector("[data-view-out]").addEventListener("click", () => zoomAtCenter(1 / 1.25));
  stage.querySelector("[data-view-in]").addEventListener("click", () => zoomAtCenter(1.25));
  zoomLabel.addEventListener("click", () => move(home, true));
  stage.addEventListener("keydown", (event) => {
    if (event.target.closest("button, a") || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    const direction = {
      a: [1, 0], arrowleft: [1, 0], d: [-1, 0], arrowright: [-1, 0],
      w: [0, 1], arrowup: [0, 1], s: [0, -1], arrowdown: [0, -1],
    }[key];
    if (direction) {
      move({ x: target.x + direction[0] * 28, y: target.y + direction[1] * 28, zoom: target.zoom }, true);
    } else if (key === "+" || key === "=") zoomAtCenter(1.25);
    else if (key === "-") zoomAtCenter(1 / 1.25);
    else if (key === "0") move(home, true);
    else return;
    event.preventDefault();
  });

  new ResizeObserver(() => move(view)).observe(stage);
  return {
    reset() { move(home); },
  };
}
