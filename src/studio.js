import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-900.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import ScrubField from './ScrubField.jsx';
import SquishSwitch from './SquishSwitch.jsx';
import GlideSelect from './GlideSelect.jsx';
import { createCometControl } from './CometControl.js';
import { createArtworkNavigation } from './artwork-navigation.js';
import { fitImage, gifFrameDelay, makeGifEncoder, openGif } from './gif.js';
import { render, setup } from '../main.ts';
import { properties as shaderProperties } from './figma-shaders.js';
import portrait from '../assets/portrait.jpg';
import icon from '../assets/icon.png';
import ramp from '../assets/ramp.png';

const samples = { portrait, icon, ramp };
const properties = {
  ...shaderProperties,
  animate: { type: "boolean", label: "Animate", defaultValue: false },
  animationEffect: {
    type: "number", label: "Effect", control: "select", defaultValue: 1,
    options: [
      { value: 1, label: "Aura" }, { value: 2, label: "Seed" },
      { value: 3, label: "Heatwave" }, { value: 4, label: "Cloth" },
    ],
  },
  animationStrength: { type: "number", label: "Strength", control: "slider", min: 0, max: 100, step: 1, defaultValue: 65 },
  animationDuration: { type: "number", label: "Loop length", control: "slider", min: 1, max: 8, step: 1, defaultValue: 3, suffix: "s" },
  auraShape: {
    type: "number", label: "Particle shape", control: "select", defaultValue: 3,
    options: [
      { value: 3, label: "Characters" }, { value: 0, label: "Streaks" },
      { value: 1, label: "Dots" }, { value: 2, label: "Blocks" },
    ],
  },
  motionAngle: { type: "number", label: "Angle", control: "slider", min: 0, max: 359, step: 1, defaultValue: 0, suffix: "°" },
  multiDirection: { type: "boolean", label: "Multiple directions", defaultValue: false },
  secondaryAngle: { type: "number", label: "Angle 2", control: "slider", min: 0, max: 359, step: 1, defaultValue: 90, suffix: "°" },
  auraAngle: { type: "number", label: "Angle", control: "slider", min: 0, max: 359, step: 1, defaultValue: 38, suffix: "°" },
};
const motionFrameMs = 50;
const effectDescriptions = [
  "Shadow and edge characters shed drifting marks in their own ink.",
  "Nearby glyphs in the same character set trade places at similar ink density.",
  "Local waves warp the source before characters are drawn.",
  "A wind ripple bends the source from a pinned edge before characters are drawn.",
];
const get = (id) => document.getElementById(id);
const sourceCanvas = get("source");
const resultCanvas = get("result");
const artwork = get("artwork");
const navigation = createArtworkNavigation(get("view-area"), artwork, scheduleDraw);
const exportFormat = get("export-format");
const exportScale = get("export-scale");
const copyButton = get("copy");
const exportButton = get("export");
const gifButton = get("gif-playback");
const gifOption = exportFormat.querySelector('[value="gif"]');
const animationTab = get("group-animation-controls");
const supportsImageCopy = typeof ClipboardItem !== "undefined" && typeof navigator.clipboard?.write === "function";
const before = sourceCanvas.getContext("2d");
const startupLoader = get("startup-loader");
const imageLoader = get("image-loader");
const state = {};
const defaults = Object.fromEntries(Object.entries(properties).map(([key, spec]) => [key, spec.defaultValue]));
const settings = { ...defaults };
const terminalInk = { r: 0.98, g: 0.98, b: 0.98, a: 1 };
const terminalPaper = { r: 23 / 255, g: 23 / 255, b: 23 / 255, a: 1 };
const fields = {};
const edgeFields = [];
const controlInputs = [];
let input;
let animation;
let exportState;
let device;
let after;
let sourceName = "portrait";
let activeSample = "portrait";
let pendingDraw = 0;
let previewDirty = false;
let motionDrawing = false;
let motionStarted = 0;
let nextMotionFrame = 0;
let previewPhase = 0;
let wasAnimating = false;
let loadNumber = 0;
let canRender = false;
let loadingImage = false;
let outputBusy = false;

function status(message, error = false) {
  get("status").textContent = message;
  get("status").toggleAttribute("data-error", error);
}

function revealStudio() {
  startupLoader.removeAttribute("data-active");
  startupLoader.setAttribute("aria-hidden", "true");
  document.querySelector(".masthead").inert = false;
  document.querySelector(".studio").inert = false;
}

function setImageLoading(active) {
  loadingImage = active;
  imageLoader.toggleAttribute("data-active", active && !startupLoader.hasAttribute("data-active"));
  imageLoader.parentElement.setAttribute("aria-busy", String(active));
  syncOutputControls();
  if (!active && settings.animate) queuePreview();
}

function renderParams() {
  if (settings.style !== 0 || settings.palette !== 0) return settings;
  return {
    ...settings,
    palette: 1,
    ink: terminalInk,
    paper: terminalPaper,
    polarity: settings.polarity || 1,
  };
}

function motionAt(phase, params = settings) {
  if (!params.animate || params.animationStrength === 0) return undefined;
  return {
    effect: params.animationEffect, phase, strength: params.animationStrength * 0.01,
    particle: params.auraShape, angle: params.animationEffect === 1 ? params.auraAngle : params.motionAngle,
    secondaryAngle: params.multiDirection && params.animationEffect >= 3 ? params.secondaryAngle : undefined,
  };
}

const maxRasterSide = () => Math.min(device.limits.maxTextureDimension2D, 4096);

function paint(updatePalette = true) {
  if (!input || !canRender) return;
  const size = artwork.getBoundingClientRect();
  if (!size.width || !size.height) return;
  // A matching backing grid avoids resampling the glyphs a second time.
  const pixelScale = Math.min(devicePixelRatio * Math.min(1, 2 / navigation.zoom),
    maxRasterSide() / Math.max(size.width, size.height));
  const width = Math.max(1, Math.round(size.width * pixelScale));
  const height = Math.max(1, Math.round(size.height * pixelScale));
  if (resultCanvas.width !== width) resultCanvas.width = width;
  if (resultCanvas.height !== height) resultCanvas.height = height;
  const start = performance.now();
  render(device, { input, output: after.getCurrentTexture(), state, params: renderParams(), motion: motionAt(previewPhase) });
  get("render-time").textContent = "// " + (performance.now() - start).toFixed(1) + " MS";
  if (updatePalette) refreshPalette();
}

function previewVisible() {
  return input && canRender && !document.hidden && !get("preview-panel").hidden;
}

function queuePreview() {
  if (pendingDraw || motionDrawing || !previewVisible()) return;
  pendingDraw = requestAnimationFrame((now) => {
    pendingDraw = 0;
    if (!previewVisible()) return;
    const animate = settings.animate && settings.animationStrength > 0 && !outputBusy && !loadingImage;
    if (previewDirty || (animate && now >= nextMotionFrame)) {
      if (animate) {
        previewPhase = (Math.max(0, now - motionStarted) / (settings.animationDuration * 1000)) % 1;
        nextMotionFrame = now + motionFrameMs;
      }
      const updatePalette = previewDirty;
      previewDirty = false;
      paint(updatePalette);
      if (animate) {
        motionDrawing = true;
        device.queue.onSubmittedWorkDone().then(finishMotionFrame, finishMotionFrame);
        return;
      }
    }
    if (animate) queuePreview();
  });
}

function finishMotionFrame() {
  motionDrawing = false;
  queuePreview();
}

function scheduleDraw() {
  previewDirty = true;
  queuePreview();
}

function createInputTexture(width, height) {
  return device.createTexture({
    size: { width, height },
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.RENDER_ATTACHMENT,
  });
}

function uploadFrame(source, texture) {
  device.queue.copyExternalImageToTexture(
    { source }, { texture, premultipliedAlpha: true }, { width: texture.width, height: texture.height },
  );
}

function pauseGif() {
  clearTimeout(animation?.playback?.timer);
  if (animation) animation.playback = null;
  gifButton.textContent = "Play GIF";
}

function closeGif() {
  pauseGif();
  animation?.decoder.close();
  animation = undefined;
  gifButton.hidden = true;
}

function playGif() {
  const current = animation;
  if (!current || current.playback || !canRender) return;
  const texture = input;
  const playback = { deadline: performance.now() + (current.finished ? 0 : current.delay), timer: 0 };
  current.playback = playback;
  gifButton.textContent = "Pause GIF";

  function queueFrame() {
    playback.timer = setTimeout(advance, Math.max(0, playback.deadline - performance.now()));
  }

  async function advance() {
    const frame = current.finished ? 0 : current.frame + 1;
    if (frame >= current.frameCount * (current.repetitions + 1)) {
      current.finished = true;
      pauseGif();
      return;
    }
    let image;
    try {
      ({ image } = await current.decoder.decode({ frameIndex: frame % current.frameCount }));
      const delay = gifFrameDelay(image);
      image = await fitImage(image, texture.width, texture.height);
      if (current.playback !== playback) return;
      uploadFrame(image, texture);
      before.clearRect(0, 0, texture.width, texture.height);
      before.drawImage(image, 0, 0);
      current.frame = frame;
      current.delay = delay;
      current.finished = false;
      if (!get("preview-panel").hidden) scheduleDraw();
      playback.deadline = Math.max(performance.now(), playback.deadline + delay);
      queueFrame();
    } catch {
      if (current.playback === playback) {
        pauseGif();
        status("Could not decode the next GIF frame.", true);
      }
    } finally {
      image?.close();
    }
  }

  queueFrame();
}

gifButton.addEventListener("click", () => {
  if (animation?.playback) pauseGif();
  else playGif();
});

async function loadImage(src, name, sample = "custom") {
  const request = ++loadNumber;
  setImageLoading(true);
  status("Loading image…");
  let bitmap;
  let decoder;
  let next;
  try {
    let blob = src;
    if (!(blob instanceof Blob)) {
      const response = await fetch(src);
      if (!response.ok) throw new Error("Could not load the sample image.");
      blob = await response.blob();
    }
    const isGif = blob.type === "image/gif" || /\.gif$/i.test(blob.name ?? "");
    if (isGif) decoder = await openGif(blob);
    const track = decoder?.tracks.selectedTrack;
    const animated = track?.frameCount > 1;
    const gifUnavailable = isGif && !decoder;
    if (animated) ({ image: bitmap } = await decoder.decode({ frameIndex: 0 }));
    else bitmap = await createImageBitmap(blob);
    if (request !== loadNumber) return false;
    const delay = animated ? gifFrameDelay(bitmap) : 0;
    const originalWidth = bitmap.displayWidth ?? bitmap.width;
    const originalHeight = bitmap.displayHeight ?? bitmap.height;
    const factor = Math.min(1, maxRasterSide() / Math.max(originalWidth, originalHeight));
    const width = Math.max(1, Math.round(originalWidth * factor));
    const height = Math.max(1, Math.round(originalHeight * factor));
    bitmap = await fitImage(bitmap, width, height);
    if (request !== loadNumber || !canRender) return false;
    next = createInputTexture(width, height);
    uploadFrame(bitmap, next);
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    before.drawImage(bitmap, 0, 0);
    closeGif();
    input?.destroy();
    input = next;
    next = undefined;
    if (animated) {
      animation = { blob, decoder, frameCount: track.frameCount, repetitions: track.repetitionCount, frame: 0, delay, finished: false };
      decoder = undefined;
      gifButton.hidden = false;
    }
    if (animated) exportFormat.value = "gif";
    sourceName = name;
    activeSample = sample;
    get("sample").value = activeSample;
    get("source-credit").hidden = sample !== "portrait";
    artwork.style.setProperty("--image-ratio", width / height);
    navigation.reset();
    get("dimensions").textContent = originalWidth + " × " + originalHeight + " PX";
    const limit = maxRasterSide();
    for (const option of exportScale.options) {
      option.disabled = Math.max(width, height) * Number(option.value) > limit;
    }
    if (exportScale.selectedOptions[0].disabled) exportScale.value = "1";
    exportScale.title = "Scales above " + limit + " pixels on the longest side are disabled";
    syncOutputControls();
    paint();
    const installedAnimation = animation;
    await device.queue.onSubmittedWorkDone();
    if (canRender && installedAnimation && animation === installedAnimation &&
        !matchMedia("(prefers-reduced-motion: reduce)").matches) playGif();
    if (request !== loadNumber || !canRender) return false;
    if (animated) {
      status(animation.frameCount + " GIF frames" + (factor < 1 ? " · resized to " + width + " × " + height + " px" : ""));
    } else if (gifUnavailable) {
      status("GIF playback is unavailable in this browser. Showing a still frame.");
    } else {
      status(factor < 1 ? "Working image resized to " + width + " × " + height + " px." : "[LIVE_SYNC]");
    }
    return true;
  } catch (error) {
    if (request === loadNumber) {
      get("sample").value = activeSample;
      syncGlideSelects();
      status(error.message || "Could not read that image.", true);
    }
    return false;
  } finally {
    bitmap?.close();
    decoder?.close();
    next?.destroy();
    if (request === loadNumber) setImageLoading(false);
  }
}

function element(tag, props, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function mountScrubField({ id, label, min, max, step, defaultValue, suffix = "%", formatSpecial, onChange }) {
  const field = element("div", { className: "scrub-control" });
  const root = createRoot(field);
  let previous;
  return {
    field,
    sync(value, name = label, upperBound = max) {
      const disabled = !canRender;
      if (previous?.value === value && previous.disabled === disabled &&
          previous.label === name && previous.max === upperBound) return;
      previous = { value, disabled, label: name, max: upperBound };
      root.render(createElement(ScrubField, {
        id, min, step, defaultValue, suffix, formatSpecial, onChange,
        ...previous, size: "sm", fineMultiplier: 1, chipColor: "#242424", showDelta: false,
      }));
    },
  };
}

const unitlessFields = new Set(["columns", "seed", "runLength", "swatchCount", "levels"]);
const lookDefaults = new Set(["dots", "blocks", "registration", "blockThreshold"]);

function mountSwitch({ id, label, ariaLabel, onChange }) {
  const field = element("div", { className: "switch-control" });
  const root = createRoot(field);
  let previous;
  return {
    field,
    sync(checked, disabled = !canRender) {
      if (previous?.checked === checked && previous.disabled === disabled) return;
      previous = { checked, disabled };
      root.render(createElement(SquishSwitch, {
        id, label, ariaLabel, onChange, ...previous,
        width: 30, height: 18, radius: 9, trackColor: "#393939", thumbColor: "#c8c8c8",
      }));
    },
  };
}

function mountGlideSelect(select) {
  // Keep the select as the option and value model for the existing shader controls.
  const label = select.labels[0];
  const triggerId = select.id + "-trigger";
  const ariaLabel = select.getAttribute("aria-label") || label?.textContent;
  const isExportOption = select === exportFormat || select === exportScale;
  const compact = isExportOption || select.closest(".rules-grid");
  const field = element("span", { className: "glide-control" });
  const root = createRoot(field);
  let previous;
  if (label) label.htmlFor = triggerId;
  select.hidden = true;
  select.after(field);
  function sync() {
    const options = Array.from(select.options)
      .filter((option) => !option.hidden)
      .map(({ value, label, disabled }) => ({ value, label, disabled }));
    const props = {
      options, value: select.value, disabled: select.disabled,
      placeholder: select.selectedOptions[0]?.label || "Select…",
      title: select.title,
    };
    const signature = JSON.stringify(props);
    if (signature === previous) return;
    previous = signature;
    root.render(createElement(GlideSelect, {
      ...props, triggerId, ariaLabel, size: compact ? "sm" : "md",
      align: isExportOption ? "right" : "left",
      menuWidth: compact ? 128 : 176,
      radius: 4, surfaceColor: "#1d1d1d", highlightColor: "#393939",
      onChange(value) {
        select.value = value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      },
    }));
  }
  select.addEventListener("change", sync);
  return sync;
}

function addFields(container, keys) {
  for (const key of keys) {
    const spec = properties[key];
    if (spec.type === "boolean") {
      const toggle = mountSwitch({
        id: key, label: spec.label,
        onChange(checked) {
          settings[key] = checked;
          controlsChanged();
        },
      });
      fields[key] = { field: toggle.field, toggle };
      container.append(toggle.field);
      continue;
    }
    if (spec.control === "slider") {
      const scrub = mountScrubField({
        ...spec, id: key,
        suffix: spec.suffix ?? (unitlessFields.has(key) ? "" : "%"),
        formatSpecial: key === "levels" ? (value) => value < 2 ? "Off" : undefined
          : lookDefaults.has(key) ? (value) => value === -1 ? "Look default" : undefined : undefined,
        onChange(value) {
          settings[key] = value;
          controlsChanged();
        },
      });
      fields[key] = { field: scrub.field, scrub };
      container.append(scrub.field);
      continue;
    }
    const label = element("label", { htmlFor: key, textContent: spec.label });
    let field;
    let control;
    if (spec.type === "string") {
      control = element("input", { id: key, type: "text", maxLength: 128, spellcheck: false, disabled: true });
      field = element("div", { className: "field" }, label, control);
    } else {
      control = element("select", { id: key, disabled: true }, ...spec.options.map((option) => new Option(option.label, option.value)));
      field = element("div", { className: "field choice" }, label, control);
    }
    control.addEventListener(control.tagName === "SELECT" ? "change" : "input", () => {
      if (spec.type === "string") settings[key] = control.value;
      else settings[key] = Number(control.value);
      controlsChanged();
    });
    fields[key] = { field, control };
    container.append(field);
    controlInputs.push(control);
  }
}

addFields(get("look"), ["style"]);
addFields(get("quick"), ["invertImage", "invertColors", "transparentPaper", "animate"]);
fields.invertImage.field.title = "Invert pixels before choosing marks.";
fields.invertColors.field.title = "Invert the rendered inks and paper.";
fields.transparentPaper.field.title = "Remove paper. Existing image transparency is preserved.";

const characterGroup = get("characters");
addFields(characterGroup, ["glyphs"]);
const glyphHelp = element("p", { id: "glyph-help", className: "glyph-help" });
const editStarter = element("button", { id: "edit-starter", className: "quiet", type: "button", textContent: "Edit starter set", disabled: true });
editStarter.addEventListener("click", () => {
  settings.glyphs = state.starterGlyphs[settings.style];
  controlsChanged();
  get("glyphs").select();
});
controlInputs.push(editStarter);
fields.glyphs.control.setAttribute("aria-describedby", glyphHelp.id);
fields.glyphs.field.append(editStarter);
characterGroup.append(glyphHelp);
addFields(characterGroup, ["glyphOrder"]);
const edgeGroup = element("div", { className: "key-fields" });
const edgeHelp = element("p", { id: "edge-help", className: "key-help", textContent: "Blank slots inherit the look. Enter a space to hide that direction." });
for (const [index, [label, mark]] of [
  ["Horizontal", "–"], ["Vertical", "|"], ["Rising", "/"], ["Falling", "\\"], ["Turn left", "("], ["Turn right", ")"],
].entries()) {
  const control = element("input", { id: "edge-" + index, type: "text", placeholder: mark, maxLength: 1, spellcheck: false, disabled: true });
  control.setAttribute("aria-describedby", edgeHelp.id);
  control.addEventListener("input", () => {
    settings.edgeGlyphs = edgeFields.some((field) => field.value.length)
      ? edgeFields.map((field) => field.value || "–").join("")
      : "";
    controlsChanged();
  });
  edgeGroup.append(element("label", { htmlFor: control.id }, label, control));
  edgeFields.push(control);
  controlInputs.push(control);
}
const edgeSet = element("div", { className: "group-body" },
  element("h2", { textContent: "Edge characters" }), edgeGroup, edgeHelp);
characterGroup.append(edgeSet);
addFields(characterGroup, ["response", "toneCutoff"]);
const characterBanks = element("div", { className: "group-body" });
addFields(characterBanks, ["lightGlyphs", "middleGlyphs", "heavyGlyphs", "bandLight", "bandHeavy"]);
for (const key of ["lightGlyphs", "middleGlyphs", "heavyGlyphs"]) {
  fields[key].control.maxLength = 64;
  fields[key].control.placeholder = "Use the main character set";
}
characterGroup.append(element("details", { className: "advanced" },
  element("summary", { textContent: "Characters by tone" }), characterBanks));
addFields(get("grid-marks"), [
  "columns", "cellAspect", "glyphSize", "glyphWeight", "density",
  "contour", "edgeThreshold", "joinStrokes", "dots", "blocks", "mixByTone",
]);
const bandFields = element("div", { className: "group-body" });
addFields(bandFields, ["lightDots", "lightBlocks", "middleDots", "middleBlocks", "heavyDots", "heavyBlocks"]);
get("grid-marks").append(bandFields);
const shapes = element("div", { className: "group-body" });
addFields(shapes, ["runLength", "lineBreaks", "outlinePriority", "interiorDetail",
  "blockThreshold", "dotGrid", "dotSize", "dotAlignment"]);
get("grid-marks").append(element("details", { className: "advanced" },
  element("summary", { textContent: "Contour and cell shapes" }), shapes));
addFields(get("image-treatment"), [
  "brightness", "contrast", "midtones", "levels", "detail", "detailAmount", "warp", "warpAmount",
]);
addFields(get("color-controls"), ["palette", "polarity", "colorMix"]);
const colors = element("div", { id: "custom-colors", hidden: true });
const colorFields = {};
get("color-controls").append(colors);
for (const key of ["ink", "accentOne", "accentTwo", "paper"]) {
  const selected = element("input", { id: key, type: "color", disabled: true });
  const label = element("label", { htmlFor: key, textContent: properties[key].label });
  const opacity = mountScrubField({
    id: key + "-opacity", label: properties[key].label + " opacity",
    min: 0, max: 100, step: 1, defaultValue: Math.round(defaults[key].a * 100),
    onChange(value) { setColor(value / 100); },
  });
  const swatch = element("div", { className: "swatch" },
    element("div", { className: "field" }, label, selected), opacity.field);
  function setColor(alpha) {
    const [r, g, b] = selected.value.slice(1).match(/../g).map((pair) => Number.parseInt(pair, 16) / 255);
    settings[key] = { r, g, b, a: alpha };
    controlsChanged();
  }
  selected.addEventListener("input", () => setColor(settings[key].a));
  colorFields[key] = { selected, opacity, label, swatch };
  colors.append(swatch);
  controlInputs.push(selected);
}
addFields(get("color-controls"), ["sourceKey", "keyThreshold", "keySoftness"]);
addFields(get("print-finish"), ["texture", "registration", "dither", "seed"]);
const animationGroup = get("animation-controls");
addFields(animationGroup, ["animationEffect", "multiDirection"]);
const effectHelp = element("p", { id: "animation-help", className: "key-help" });
fields.animationEffect.field.after(effectHelp);
fields.multiDirection.field.title = "Add a second angle with the same strength.";

function aimDirection(key, angle, strength) {
  settings[key] = angle;
  settings.animationStrength = strength;
  controlsChanged();
}

const comet = createCometControl((angle, strength) =>
  aimDirection(settings.animationEffect === 1 ? "auraAngle" : "motionAngle", angle, strength));
const secondComet = createCometControl((angle, strength) => aimDirection("secondaryAngle", angle, strength));
const firstDirection = element("div", { className: "motion-direction" }, comet.field);
const secondDirection = element("div", { className: "motion-direction" }, secondComet.field);
addFields(firstDirection, ["motionAngle", "auraAngle"]);
addFields(secondDirection, ["secondaryAngle"]);
const directions = element("div", { className: "motion-directions" }, firstDirection, secondDirection);
animationGroup.append(directions);
addFields(animationGroup, ["animationStrength", "animationDuration", "auraShape"]);

const paletteTools = element("div", { className: "palette-tools" });
const swatchList = element("div", { className: "palette-swatches" });
const ruleGrid = element("div", { className: "rules-grid" });
addFields(paletteTools, ["swatchCount", "gradedPalette", "excludeKeyed"]);
paletteTools.append(element("h2", { textContent: "Extracted inks" }), swatchList,
  element("h2", { textContent: "Ink assignments" }), ruleGrid);
get("color-controls").insertBefore(paletteTools, fields.sourceKey.field);
const paletteRows = [];
const inkAssignments = [];
let extractedRGB = [];
let paletteReadInFlight = false;
let paletteRevision = 0;
const bands = ["Light", "Mid", "Heavy"];
const marks = ["Type", "Contour", "Block", "Dot"];
const activeSwatches = () => settings.palette === 8 ? 3 : settings.palette === 7 ? settings.swatchCount : 0;
const defaultSwatchName = (index) => settings.palette === 8 ? ["Dark ink", "Midtone ink", "Light ink"][index] : "Ink " + (index + 1);
const toHex = (color) => "#" + color.map((channel) => Math.round(channel * 255).toString(16).padStart(2, "0")).join("");
function swatchInfo() {
  const lines = settings.swatches.split("\n");
  return Array.from({ length: 8 }, (_, index) => {
    const [name, hex] = (lines[index] ?? "").split("=");
    return { name: name || defaultSwatchName(index), hex: hex || "", named: Boolean(name) };
  });
}
function saveSwatch(index, name, hex) {
  const lines = swatchInfo().map((swatch) => (swatch.named ? swatch.name : "") + "=" + swatch.hex);
  lines[index] = name.replace(/[=\r\n]/g, "").slice(0, 36) + "=" + hex;
  settings.swatches = lines.join("\n");
  controlsChanged();
}
for (let index = 0; index < 8; index += 1) {
  const name = element("input", { type: "text", maxLength: 36, disabled: true });
  const hex = element("input", { type: "text", pattern: "#[0-9a-fA-F]{6}", maxLength: 7, disabled: true });
  const lock = mountSwitch({
    id: "lock-ink-" + (index + 1), label: "Lock ink", ariaLabel: "Lock swatch " + (index + 1),
    onChange(checked) { saveSwatch(index, name.value, checked ? hex.value : ""); },
  });
  name.setAttribute("aria-label", "Name for swatch " + (index + 1));
  hex.setAttribute("aria-label", "Hex value for swatch " + (index + 1));
  const chip = element("span", { className: "palette-chip" });
  const row = element("div", { className: "palette-row", id: "swatch-" + (index + 1) },
    chip, name, hex, lock.field);
  name.addEventListener("change", () => saveSwatch(index, name.value, swatchInfo()[index].hex));
  hex.addEventListener("change", () => {
    if (/^#[0-9a-f]{6}$/i.test(hex.value)) saveSwatch(index, name.value, hex.value.toLowerCase());
    else hex.value = swatchInfo()[index].hex || (extractedRGB[index] ? toHex(extractedRGB[index]) : "");
  });
  controlInputs.push(name, hex);
  paletteRows.push({ row, chip, name, hex, lock });
  swatchList.append(row);
}
ruleGrid.append(element("span", {}), ...bands.map((band) => element("span", { textContent: band })));
for (const [kind, mark] of marks.entries()) {
  ruleGrid.append(element("span", { textContent: mark }));
  for (const [band, tone] of bands.entries()) {
    const id = kind * 3 + band;
    const select = element("select", { id: "ink-assignment-" + id, disabled: true });
    select.setAttribute("aria-label", tone + " " + mark.toLowerCase() + " ink");
    select.addEventListener("change", () => {
      const current = settings.inkRules.split(",");
      const rules = Array.from({ length: 12 }, (_, slot) => slot === id ? select.value : current[slot] || "0");
      settings.inkRules = rules.join(",");
      controlsChanged();
    });
    ruleGrid.append(select);
    inkAssignments.push(select);
    controlInputs.push(select);
  }
}

function syncPalettePanel() {
  const count = activeSwatches();
  paletteTools.hidden = count === 0;
  fields.swatchCount.field.hidden = settings.palette !== 7;
  const swatches = swatchInfo();
  for (const [index, { row, chip, name, hex, lock }] of paletteRows.entries()) {
    row.hidden = index >= count;
    const swatch = swatches[index];
    const color = swatch.hex || (extractedRGB[index] ? toHex(extractedRGB[index]) : "");
    if (document.activeElement !== name) name.value = swatch.name;
    if (document.activeElement !== hex) hex.value = color;
    hex.placeholder = "Sampling";
    chip.style.background = color;
    lock.sync(Boolean(swatch.hex), !canRender || !color);
  }
  // Refresh option text only when names or the palette size change.
  const signature = JSON.stringify(swatches.slice(0, count).map(({ name }) => name));
  const rules = settings.inkRules.split(",");
  for (const [index, select] of inkAssignments.entries()) {
    if (select.dataset.options !== signature) {
      select.replaceChildren(new Option("Auto", "0"),
        ...swatches.slice(0, count).map(({ name }, i) => new Option((i + 1) + " · " + name, String(i + 1))));
      select.dataset.options = signature;
    }
    const value = Number(rules[index] || 0);
    select.value = value <= count ? value : 0;
  }
  syncGlideSelects();
}

async function refreshPalette() {
  paletteRevision += 1;
  if (paletteReadInFlight) return;
  paletteReadInFlight = true;
  try {
    let revision;
    do {
      revision = paletteRevision;
      const count = activeSwatches();
      if (!count) break;
      const bytes = count * 32;
      const buffer = device.createBuffer({ size: bytes, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
      try {
        const encoder = device.createCommandEncoder();
        encoder.copyBufferToBuffer(state.paletteResult, 0, buffer, 0, bytes);
        device.queue.submit([encoder.finish()]);
        await buffer.mapAsync(GPUMapMode.READ);
        const data = new Float32Array(buffer.getMappedRange());
        if (revision === paletteRevision) {
          extractedRGB = Array.from({ length: count }, (_, index) => Array.from(data.subarray(index * 8 + 4, index * 8 + 7)));
          syncPalettePanel();
        }
      } finally {
        buffer.destroy();
      }
    } while (revision !== paletteRevision && canRender);
  } catch (error) {
    if (canRender) status(error.message || "Could not read the extracted inks.", true);
  } finally {
    paletteReadInFlight = false;
  }
}

function bindTabs(tabList, onSelect) {
  const tabs = [...tabList.querySelectorAll('[role="tab"]')];
  function select(tab) {
    if (tab.disabled) return;
    for (const button of tabs) {
      const selected = button === tab;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
      get(button.getAttribute("aria-controls")).hidden = !selected;
    }
    onSelect(tab);
  }
  for (const tab of tabs) tab.addEventListener("click", () => select(tab));
  tabList.addEventListener("keydown", (event) => {
    const enabled = tabs.filter((tab) => !tab.disabled);
    const index = enabled.indexOf(document.activeElement);
    if (index < 0) return;
    const destinations = {
      ArrowLeft: (index + enabled.length - 1) % enabled.length,
      ArrowRight: (index + 1) % enabled.length,
      Home: 0,
      End: enabled.length - 1,
    };
    if (!Object.hasOwn(destinations, event.key)) return;
    event.preventDefault();
    const tab = enabled[destinations[event.key]];
    select(tab);
    tab.focus();
  });
  return select;
}

bindTabs(get("view-tabs"), (tab) => {
  const sourceVisible = tab.id === "view-source";
  get("edge-tag").hidden = get("grid-tag").hidden = sourceVisible;
  if (!sourceVisible) scheduleDraw();
});
const selectGroup = bindTabs(get("group-menu"), () => { get("parameter-body").scrollTop = 0; });
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) scheduleDraw();
});

function syncReadouts() {
  get("current-style").textContent = fields.style.control.selectedOptions[0].textContent;
  get("edge-tag").textContent = "EDGE // " + settings.contour + "%";
  get("grid-tag").textContent = settings.columns + " COL // GLYPH";
  get("density-readout").textContent = settings.density + "%";
  get("contour-readout").textContent = settings.contour + "%";
  get("dither-readout").textContent = settings.dither + "%";
  get("finish-readout").textContent = settings.texture + "%";
  const preview = get("preview-panel");
  preview.toggleAttribute("data-transparent-paper", settings.transparentPaper);
  preview.classList.toggle("checkerboard", !settings.transparentPaper &&
    settings.palette !== 0 && settings.palette !== 3 && settings.paper.a < 1);
  if (!state.starterGlyphs) return;

  const encode = settings.style === 0 ? state.encodeTypeGlyph : state.encodeGlyph;
  const glyphs = Array.from(settings.glyphs, (character) => ({ character, code: encode(character) }))
    .filter(({ code }) => code != null);
  if (settings.glyphOrder === 1) {
    const coverage = ({ code }) => state.inkCoverage[code] ?? state.countBits(code - 176) * 0.055;
    glyphs.sort((left, right) => coverage(left) - coverage(right) || left.code - right.code);
  }
  const ramp = glyphs.length ? glyphs.map(({ character }) => character).join("") : state.starterGlyphs[settings.style];
  const readout = get("tone-ramp");
  if (readout.textContent === ramp) return;
  readout.textContent = ramp;
  readout.title = ramp;

  const marks = Array.from(ramp).filter((glyph) => glyph !== " ");
  if (!marks.length) marks.push("␣");
  const count = Math.min(marks.length, 8);
  get("glyph-steps").textContent = String(marks.length).padStart(2, "0") + (marks.length === 1 ? " STEP" : " STEPS");
  get("glyph-map").replaceChildren(...Array.from({ length: count }, (_, index) => {
    const progress = index / Math.max(1, count - 1);
    const glyph = marks[Math.round(progress * (marks.length - 1))];
    const light = progress >= 0.8;
    const shade = Math.round(light ? 220 + progress * 30 : 29 + progress * 20);
    const tile = element("span", { textContent: glyph, className: light ? "light" : "" });
    tile.style.setProperty("--tile-paper", "rgb(" + [shade, shade, shade].join(" ") + ")");
    return tile;
  }));
}

function syncControls() {
  const wave = settings.animationEffect >= 3;
  const multiple = wave && settings.multiDirection;
  const starters = state.starterGlyphs;
  const supported = Array.from(settings.glyphs, (character) => state.encodeGlyph?.(character));
  const skipped = supported.filter((glyph) => glyph == null).length;
  glyphHelp.textContent = skipped
    ? skipped + " unsupported character" + (skipped === 1 ? " is" : "s are") + " skipped."
    : "Printable ASCII, block symbols and Braille. Use a space for a blank cell.";
  if (starters) get("glyphs").placeholder = starters[settings.style];
  const edges = Array.from(settings.edgeGlyphs);
  edgeFields.forEach((control, index) => {
    const value = edges[index] && edges[index] !== "–" ? edges[index] : "";
    if (control.value !== value) control.value = value;
  });
  for (const [key, { control, scrub, toggle }] of Object.entries(fields)) {
    const value = settings[key];
    if (scrub) scrub.sync(value, multiple && key === "motionAngle" ? "Angle 1" : undefined,
      key === "bandLight" ? Math.min(properties[key].max, settings.bandHeavy - 1) : undefined);
    else if (toggle) toggle.sync(value);
    else if (control.value !== String(value)) control.value = value;
  }
  animationTab.disabled = !canRender || !settings.animate;
  if (animationTab.disabled && animationTab.getAttribute("aria-selected") === "true") {
    selectGroup(get("group-image-treatment"));
  }
  effectHelp.textContent = effectDescriptions[settings.animationEffect - 1];
  fields.auraShape.field.hidden = settings.animationEffect !== 1;
  directions.hidden = settings.animationEffect === 2;
  directions.toggleAttribute("data-multiple", multiple);
  fields.multiDirection.field.hidden = !wave;
  secondDirection.hidden = !multiple;
  fields.motionAngle.field.hidden = !wave;
  fields.auraAngle.field.hidden = settings.animationEffect !== 1;
  if (!directions.hidden) comet.sync(wave ? settings.motionAngle : settings.auraAngle, settings.animationStrength);
  if (multiple) secondComet.sync(settings.secondaryAngle, settings.animationStrength);
  fields.detailAmount.field.hidden = settings.detail === 0;
  fields.warpAmount.field.hidden = settings.warp === 0;
  bandFields.hidden = settings.mixByTone !== 3;
  fields.dots.field.hidden = fields.blocks.field.hidden = settings.mixByTone === 3;
  fields.keyThreshold.field.hidden = fields.keySoftness.field.hidden = settings.sourceKey === 0;
  fields.colorMix.field.hidden = !(settings.palette === 2 || settings.palette === 4 || settings.palette >= 7 ||
    (settings.palette === 0 && (settings.style === 5 || settings.style === 9)));
  colors.hidden = settings.palette === 0 || settings.palette === 3;
  const showsAccents = settings.palette >= 4 && settings.palette <= 6;
  colorFields.accentOne.swatch.hidden = colorFields.accentTwo.swatch.hidden = !showsAccents;
  const colorRoles = {
    2: ["Base tint", "Accent ink 1", "Accent ink 2"],
    4: ["Base ink", "Spot ink 1", "Spot ink 2"],
    5: ["Light tone", "Midtone", "Heavy tone"],
    6: ["Tone ink", "Contour ink", "Block and dot ink"],
  };
  const roles = colorRoles[settings.palette] ?? ["Ink", "Accent ink 1", "Accent ink 2"];
  for (const [index, [key, swatch]] of Object.entries(colorFields).entries()) {
    const { r, g, b, a } = settings[key];
    swatch.selected.value = "#" + [r, g, b].map((channel) => Math.round(channel * 255).toString(16).padStart(2, "0")).join("");
    swatch.label.textContent = roles[index] ?? "Paper";
    swatch.opacity.sync(Math.round(a * 100), swatch.label.textContent + " opacity");
  }
  syncPalettePanel();
  syncReadouts();
}

function controlsChanged() {
  settings.bandLight = Math.min(settings.bandLight, settings.bandHeavy - 1);
  if (settings.animate && !wasAnimating) {
    motionStarted = performance.now();
    previewPhase = 0;
    nextMotionFrame = 0;
    if (gifOption.hidden) exportFormat.value = "gif";
  }
  wasAnimating = settings.animate;
  syncControls();
  syncOutputControls();
  scheduleDraw();
}

get("reset").addEventListener("click", () => {
  Object.assign(settings, defaults);
  controlsChanged();
});
const glideSelects = Array.from(document.querySelectorAll("select"), mountGlideSelect);
function syncGlideSelects() {
  for (const sync of glideSelects) sync();
}
syncControls();

get("sample").addEventListener("change", ({ target }) => {
  const sample = target.value;
  if (sample !== "custom") loadImage(samples[sample], sample, sample);
});

function openImageFile(file) {
  if (file && canRender && !startupLoader.hasAttribute("data-active")) {
    loadImage(file, file.name.replace(/\.[^.]+$/, "") || "image");
  }
}

get("open").addEventListener("click", () => get("file").click());
get("file").addEventListener("change", ({ target }) => {
  const file = target.files[0];
  target.value = "";
  openImageFile(file);
});

window.addEventListener("dragover", (event) => {
  if (!event.dataTransfer?.types.includes("Files")) return;
  event.preventDefault();
  const ready = canRender && !startupLoader.hasAttribute("data-active");
  event.dataTransfer.dropEffect = ready ? "copy" : "none";
  document.body.toggleAttribute("data-file-drag", ready);
});
window.addEventListener("dragleave", (event) => {
  if (!event.relatedTarget) document.body.removeAttribute("data-file-drag");
});
window.addEventListener("drop", (event) => {
  if (!event.dataTransfer?.types.includes("Files")) return;
  event.preventDefault();
  document.body.removeAttribute("data-file-drag");
  if (!canRender || startupLoader.hasAttribute("data-active")) return;
  const { files } = event.dataTransfer;
  if (files.length !== 1) {
    status("Drop one image file at a time.", true);
    return;
  }
  openImageFile(files[0]);
});

function syncOutputControls() {
  const disabled = !input || !canRender || loadingImage || outputBusy;
  gifOption.hidden = !animation && !settings.animate;
  if (gifOption.hidden && exportFormat.value === "gif") exportFormat.value = "png";
  exportFormat.disabled = exportScale.disabled = exportButton.disabled = disabled;
  copyButton.disabled = disabled || !supportsImageCopy;
  if (!supportsImageCopy) copyButton.title = "Image clipboard unavailable. Use Export to download the artwork.";
  get("export-state").textContent = !canRender ? "Offline" : outputBusy || loadingImage ? "Working" : input ? "Ready" : "Waiting";
  syncGlideSelects();
}

async function renderPixels(texture, scale, params, motion) {
  const width = Math.max(1, Math.round(texture.width * scale));
  const height = Math.max(1, Math.round(texture.height * scale));
  const rowSize = Math.ceil(width * 4 / 256) * 256;
  if (!exportState) {
    const resources = {};
    setup(device, { state: resources });
    exportState = resources;
  }
  const output = device.createTexture({
    size: { width, height },
    format: "rgba8unorm",
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
  });
  let buffer;
  try {
    render(device, { input: texture, output, state: exportState, params, motion });
    buffer = device.createBuffer({ size: rowSize * height, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const encoder = device.createCommandEncoder();
    encoder.copyTextureToBuffer({ texture: output }, { buffer, bytesPerRow: rowSize }, { width, height });
    device.queue.submit([encoder.finish()]);
    await buffer.mapAsync(GPUMapMode.READ);
    const rgba = new Uint8Array(buffer.getMappedRange());
    const straight = new ImageData(width, height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = y * rowSize + x * 4;
        const index = (y * width + x) * 4;
        const alpha = rgba[offset + 3];
        if (alpha === 0) continue;
        straight.data[index] = rgba[offset] * 255 / alpha;
        straight.data[index + 1] = rgba[offset + 1] * 255 / alpha;
        straight.data[index + 2] = rgba[offset + 2] * 255 / alpha;
        straight.data[index + 3] = alpha;
      }
    }
    buffer.unmap();
    return straight;
  } finally {
    buffer?.destroy();
    output.destroy();
  }
}

async function renderImage(scale, format, params) {
  const pixels = await renderPixels(input, scale, params, motionAt(previewPhase, params));
  const { width, height } = pixels;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.putImageData(pixels, 0, 0);
  if (format === "jpeg") {
    context.globalCompositeOperation = "destination-over";
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
  }
  const mime = "image/" + format;
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, 0.92));
  if (blob?.type !== mime) throw new Error("Could not encode " + format.toUpperCase() + " in this browser.");
  return blob;
}

async function renderGif(scale, params) {
  const source = input;
  const sourceGif = animation;
  const { width, height } = source;
  const texture = createInputTexture(width, height);
  let decoder;
  try {
    if (!sourceGif) {
      // Snapshot the current input before yielding so an upload can replace it during export.
      const copy = device.createCommandEncoder();
      copy.copyTextureToTexture({ texture: source }, { texture }, { width, height });
      device.queue.submit([copy.finish()]);
    }
    const encoder = await makeGifEncoder(sourceGif?.repetitions ?? Infinity);
    const preferredLoop = params.animationDuration * 1000;
    async function addFrame(delay, phase) {
      if (!canRender) throw new Error("The graphics device stopped during GIF export.");
      encoder.add(await renderPixels(texture, scale, params, motionAt(phase, params)), delay);
    }

    if (!sourceGif) {
      const frames = preferredLoop / motionFrameMs;
      for (let index = 0; index < frames; index += 1) {
        status("Exporting GIF · " + (index + 1) + " / " + frames);
        await addFrame(motionFrameMs, index / frames);
      }
      return encoder.finish();
    }

    decoder = await openGif(sourceGif.blob);
    if (!decoder) throw new Error("GIF decoding is unavailable in this browser.");
    let effectLoop = preferredLoop;
    const hasMotion = Boolean(motionAt(0, params));
    if (hasMotion) {
      let duration = 0;
      for (let index = 0; index < sourceGif.frameCount; index += 1) {
        const { image } = await decoder.decode({ frameIndex: index });
        duration += gifFrameDelay(image);
        image.close();
      }
      // Fit whole effect cycles into one source cycle so both loop at the same seam.
      effectLoop = duration / Math.max(1, Math.round(duration / preferredLoop));
    }
    let elapsed = 0;
    for (let index = 0; index < sourceGif.frameCount; index += 1) {
      status("Exporting GIF · " + (index + 1) + " / " + sourceGif.frameCount);
      const { image: frame } = await decoder.decode({ frameIndex: index });
      const delay = gifFrameDelay(frame);
      const image = await fitImage(frame, width, height);
      try {
        uploadFrame(image, texture);
      } finally {
        image.close();
      }
      if (hasMotion) {
        // GIF stores delays in centiseconds. Keep the source's total delay when subdividing.
        const ticks = Math.max(1, Math.round(delay / 10));
        const steps = Math.max(1, Math.min(Math.ceil(delay / motionFrameMs), Math.floor(ticks / 2)));
        let previous = 0;
        for (let step = 1; step <= steps; step += 1) {
          const next = Math.round(step * ticks / steps) * 10;
          await addFrame(next - previous, ((elapsed + previous) % effectLoop) / effectLoop);
          previous = next;
        }
      } else {
        await addFrame(delay, 0);
      }
      elapsed += delay;
    }
    return encoder.finish();
  } finally {
    texture.destroy();
    decoder?.close();
  }
}

async function outputArtwork(copy) {
  if (!input || !canRender || loadingImage || outputBusy || (copy && !supportsImageCopy)) return;
  const format = copy ? "png" : exportFormat.value;
  const label = copy ? "PNG" : exportFormat.selectedOptions[0].label;
  outputBusy = true;
  syncOutputControls();
  status(copy ? "Copying PNG…" : "Preparing " + label + "…");
  try {
    const name = sourceName + " - " + get("current-style").textContent + "." + (format === "jpeg" ? "jpg" : format);
    const scale = Number(exportScale.value);
    const params = { ...renderParams() };
    const image = format === "gif" ? renderGif(scale, params) : renderImage(scale, format, params);
    if (copy) {
      const item = new ClipboardItem({ "image/png": image });
      await Promise.all([image, navigator.clipboard.write([item])]);
    } else {
      const url = URL.createObjectURL(await image);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    status(copy ? "PNG copied." : label + " exported.");
  } catch (error) {
    status(copy ? "Could not copy the PNG. Use Export to download the artwork." : error.message || "Could not export the artwork.", true);
  } finally {
    outputBusy = false;
    syncOutputControls();
    if (settings.animate) queuePreview();
  }
}

exportButton.addEventListener("click", () => outputArtwork(false));
copyButton.addEventListener("click", () => outputArtwork(true));

try {
  const showUntil = performance.now() + 450;
  const adapter = await navigator.gpu?.requestAdapter();
  if (!adapter) throw new Error("WebGPU is unavailable. Open asciix in a browser with WebGPU and graphics acceleration enabled.");
  device = await adapter.requestDevice();
  device.addEventListener("uncapturederror", ({ error }) => status(error.message, true));
  device.lost.then(({ message }) => {
    canRender = false;
    loadNumber += 1;
    closeGif();
    for (const control of controlInputs) control.disabled = true;
    get("open").disabled = get("sample").disabled = get("reset").disabled = true;
    syncControls();
    setImageLoading(false);
    status(message || "The graphics device stopped. Reload the page to try again.", true);
    revealStudio();
  });
  after = resultCanvas.getContext("webgpu");
  after.configure({ device, format: navigator.gpu.getPreferredCanvasFormat(), alphaMode: "premultiplied" });
  setup(device, { state });
  canRender = true;
  new ResizeObserver(scheduleDraw).observe(artwork);
  for (const control of controlInputs) control.disabled = false;
  get("open").disabled = get("sample").disabled = get("reset").disabled = false;
  syncControls();
  const [ready] = await Promise.all([loadImage(samples.portrait, "portrait", "portrait"), document.fonts.ready]);
  const remaining = showUntil - performance.now();
  if (ready && remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
} catch (error) {
  syncOutputControls();
  status(error.message || "Could not start the preview.", true);
} finally {
  revealStudio();
}
