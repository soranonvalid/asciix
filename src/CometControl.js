export function createCometControl(onChange) {
  const field = document.createElement("div");
  field.className = "comet-control";

  const pad = document.createElement("div");
  pad.className = "comet-pad";
  pad.title = "Drag to aim and set strength";
  pad.setAttribute("aria-hidden", "true");
  const arm = document.createElement("div");
  arm.className = "comet-arm";
  pad.append(arm);
  field.append(pad);

  let pointer = null;
  let angle = 0;
  let strength = 0;
  function position(event) {
    const { left, top, width, height } = pad.getBoundingClientRect();
    const x = event.clientX - left - width / 2;
    const y = event.clientY - top - height / 2;
    const distance = Math.hypot(x, y);
    const radius = Math.max(1, Math.min(width, height) / 2 - 9);
    const nextStrength = distance <= 2 ? 0 : Math.min(100, Math.round(distance / radius * 100));
    const nextAngle = nextStrength === 0 ? angle : (Math.round(Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
    if (nextAngle !== angle || nextStrength !== strength) onChange(nextAngle, nextStrength);
  }

  pad.addEventListener("pointerdown", (event) => {
    if (pointer !== null || event.button !== 0) return;
    pointer = event.pointerId;
    pad.setPointerCapture(pointer);
    pad.setAttribute("data-dragging", "");
    position(event);
  });
  pad.addEventListener("pointermove", (event) => {
    if (event.pointerId === pointer) position(event);
  });
  pad.addEventListener("pointerup", (event) => {
    if (event.pointerId === pointer) position(event);
  });
  pad.addEventListener("lostpointercapture", () => {
    pointer = null;
    pad.removeAttribute("data-dragging");
  });

  return {
    field,
    sync(nextAngle, nextStrength) {
      angle = nextAngle;
      strength = nextStrength;
      arm.style.transform = "rotate(" + angle + "deg)";
      arm.style.setProperty("--comet-distance", strength + "%");
    },
  };
}
