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
import { render, setup } from '../main.ts';
import { properties } from './figma-shaders.js';
import portrait from '../assets/portrait.jpg';
import icon from '../assets/icon.png';
import ramp from '../assets/ramp.png';

const samples = { portrait, icon, ramp };
const get = (id) => document.getElementById(id);
const sourceCanvas = get("source");
const resultCanvas = get("result");
const artwork = get("artwork");
const exportFormat = get("export-format");
const exportScale = get("export-scale");
const copyButton = get("copy");
const exportButton = get("export");
const supportsImageCopy = typeof ClipboardItem !== "undefined" && typeof navigator.clipboard?.write === "function";
const before = sourceCanvas.getContext("2d");
const state = {};
const defaults = Object.fromEntries(Object.entries(properties).map(([key, spec]) => [key, spec.defaultValue]));
const settings = { ...defaults };
const terminalInk = { r: 0.98, g: 0.98, b: 0.98, a: 1 };
const terminalPaper = { r: 23 / 255, g: 23 / 255, b: 23 / 255, a: 1 };
const fields = {};
const edgeFields = [];
const controlInputs = [];
let input;
let device;
let after;
let sourceName = "portrait";
let activeSample = "portrait";
let pendingDraw = 0;
let loadNumber = 0;
let canRender = false;
let outputBusy = false;

function status(message, error = false) {
  get("status").textContent = message;
  get("status").toggleAttribute("data-error", error);
}

function renderParams() {
  if (settings.style !== 0 || settings.palette !== 0) return settings;
  return {
    ...settings,
    palette: 1,
    ink: terminalInk,
    paper: terminalPaper,
    polarity: settings.polarity || 1,
    labelColor: settings.labelColor === defaults.labelColor ? terminalInk : settings.labelColor,
  };
}

const maxRasterSide = () => Math.min(device.limits.maxTextureDimension2D, 4096);

function paint() {
  if (!input || !canRender) return;
  const size = artwork.getBoundingClientRect();
  if (!size.width || !size.height) return;
  // A matching backing grid avoids resampling the glyphs a second time.
  const pixelScale = Math.min(devicePixelRatio, maxRasterSide() / Math.max(size.width, size.height));
  const width = Math.max(1, Math.round(size.width * pixelScale));
  const height = Math.max(1, Math.round(size.height * pixelScale));
  if (resultCanvas.width !== width) resultCanvas.width = width;
  if (resultCanvas.height !== height) resultCanvas.height = height;
  const start = performance.now();
  render(device, { input, output: after.getCurrentTexture(), state, params: renderParams() });
  get("render-time").textContent = "// " + (performance.now() - start).toFixed(1) + " MS";
  refreshPalette();
}

function scheduleDraw() {
  if (pendingDraw) return;
  pendingDraw = requestAnimationFrame(() => {
    pendingDraw = 0;
    paint();
  });
}

async function loadImage(src, name, sample = "custom") {
  const request = ++loadNumber;
  let bitmap;
  let next;
  try {
    if (src instanceof Blob) {
      bitmap = await createImageBitmap(src);
    } else {
      const response = await fetch(src);
      if (!response.ok) throw new Error("Could not load the sample image.");
      bitmap = await createImageBitmap(await response.blob());
    }
    if (request !== loadNumber) return false;
    const { width: originalWidth, height: originalHeight } = bitmap;
    const factor = Math.min(1, maxRasterSide() / Math.max(originalWidth, originalHeight));
    const width = Math.max(1, Math.round(originalWidth * factor));
    const height = Math.max(1, Math.round(originalHeight * factor));
    if (factor < 1) {
      const fullSize = bitmap;
      bitmap = await createImageBitmap(fullSize, { resizeWidth: width, resizeHeight: height, resizeQuality: "high" });
      fullSize.close();
      if (request !== loadNumber) return false;
    }
    if (!canRender) return false;
    next = device.createTexture({
      size: { width, height },
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture({ source: bitmap }, { texture: next, premultipliedAlpha: true }, { width, height });
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    before.drawImage(bitmap, 0, 0);
    input?.destroy();
    input = next;
    next = undefined;
    sourceName = name;
    activeSample = sample;
    get("sample").value = activeSample;
    get("source-credit").hidden = sample !== "portrait";
    artwork.style.setProperty("--image-ratio", width / height);
    get("dimensions").textContent = originalWidth + " × " + originalHeight + " PX";
    const limit = maxRasterSide();
    for (const option of exportScale.options) {
      option.disabled = Math.max(width, height) * Number(option.value) > limit;
    }
    if (exportScale.selectedOptions[0].disabled) exportScale.value = "1";
    exportScale.title = "Scales above " + limit + " pixels on the longest side are disabled";
    syncOutputControls();
    paint();
    status(factor < 1 ? "Working image resized to " + width + " × " + height + " px." : "[LIVE_SYNC]");
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
    next?.destroy();
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
        suffix: unitlessFields.has(key) ? "" : "%",
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
addFields(get("quick"), ["invertImage", "invertColors", "transparentPaper"]);
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
for (const key of ["ink", "accentOne", "accentTwo", "paper", "labelColor", "labelBacking"]) {
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
  (key.startsWith("label") ? get("label-controls") : colors).append(swatch);
  controlInputs.push(selected);
}
addFields(get("color-controls"), ["sourceKey", "keyThreshold", "keySoftness"]);
addFields(get("print-finish"), ["texture", "registration", "dither", "seed"]);
const labelGroup = get("label-controls");
addFields(labelGroup, ["labelText", "labelX", "labelY", "labelSize", "labelAlign"]);
labelGroup.prepend(fields.labelText.field);
fields.labelText.control.maxLength = 96;
fields.labelText.control.placeholder = "Type a caption or specimen name";
const labelSwatch = element("select", { id: "caption-swatch", disabled: true });
const labelSwatchField = element("div", { className: "field" },
  element("label", { htmlFor: labelSwatch.id, textContent: "Label ink source" }), labelSwatch);
labelGroup.append(labelSwatchField);
controlInputs.push(labelSwatch);
labelSwatch.addEventListener("change", () => {
  settings.labelSwatch = Number(labelSwatch.value);
  controlsChanged();
});

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
  labelSwatchField.hidden = count === 0;
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
  for (const [index, select] of [...inkAssignments, labelSwatch].entries()) {
    if (select.dataset.options !== signature) {
      select.replaceChildren(new Option(index < 12 ? "Auto" : "Custom ink", "0"),
        ...swatches.slice(0, count).map(({ name }, i) => new Option((i + 1) + " · " + name, String(i + 1))));
      select.dataset.options = signature;
    }
    const value = index < 12 ? Number(rules[index] || 0) : settings.labelSwatch;
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
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    const destinations = {
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      ArrowRight: (index + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    if (!Object.hasOwn(destinations, event.key)) return;
    event.preventDefault();
    const tab = tabs[destinations[event.key]];
    select(tab);
    tab.focus();
  });
}

bindTabs(get("view-tabs"), (tab) => {
  const sourceVisible = tab.id === "view-source";
  get("edge-tag").hidden = get("grid-tag").hidden = sourceVisible;
  if (!sourceVisible) scheduleDraw();
});
bindTabs(get("group-menu"), () => { get("parameter-body").scrollTop = 0; });

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
    if (scrub) scrub.sync(value, undefined, key === "bandLight" ? Math.min(properties[key].max, settings.bandHeavy - 1) : undefined);
    else if (toggle) toggle.sync(value);
    else if (control.value !== String(value)) control.value = value;
  }
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
    const { r, g, b, a } = key === "labelColor" ? renderParams().labelColor : settings[key];
    swatch.selected.value = "#" + [r, g, b].map((channel) => Math.round(channel * 255).toString(16).padStart(2, "0")).join("");
    swatch.label.textContent = key.startsWith("label") ? properties[key].label : roles[index] ?? "Paper";
    swatch.opacity.sync(Math.round(a * 100), swatch.label.textContent + " opacity");
  }
  syncPalettePanel();
  syncReadouts();
}

function controlsChanged() {
  settings.bandLight = Math.min(settings.bandLight, settings.bandHeavy - 1);
  syncControls();
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
get("open").addEventListener("click", () => get("file").click());
get("file").addEventListener("change", ({ target }) => {
  const file = target.files[0];
  target.value = "";
  if (file) loadImage(file, file.name.replace(/\.[^.]+$/, "") || "image");
});

function syncOutputControls() {
  const disabled = !input || !canRender || outputBusy;
  exportFormat.disabled = exportScale.disabled = exportButton.disabled = disabled;
  copyButton.disabled = disabled || !supportsImageCopy;
  if (!supportsImageCopy) copyButton.title = "Image clipboard unavailable. Use Export to download the artwork.";
  get("export-state").textContent = !canRender ? "Offline" : outputBusy ? "Working" : input ? "Ready" : "Waiting";
  syncGlideSelects();
}

async function renderImage(scale, format) {
  const width = Math.max(1, Math.round(input.width * scale));
  const height = Math.max(1, Math.round(input.height * scale));
  const rowSize = Math.ceil(width * 4 / 256) * 256;
  const output = device.createTexture({
    size: { width, height },
    format: "rgba8unorm",
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
  });
  let buffer;
  try {
    render(device, { input, output, state, params: renderParams() });
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
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.putImageData(straight, 0, 0);
    if (format === "jpeg") {
      context.globalCompositeOperation = "destination-over";
      context.fillStyle = "#fff";
      context.fillRect(0, 0, width, height);
    }
    const mime = "image/" + format;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, 0.92));
    if (blob?.type !== mime) throw new Error("Could not encode " + format.toUpperCase() + " in this browser.");
    return blob;
  } finally {
    buffer?.destroy();
    output.destroy();
  }
}

async function outputArtwork(copy) {
  if (!input || !canRender || outputBusy || (copy && !supportsImageCopy)) return;
  const format = copy ? "png" : exportFormat.value;
  const label = copy ? "PNG" : exportFormat.selectedOptions[0].label;
  outputBusy = true;
  syncOutputControls();
  status(copy ? "Copying PNG…" : "Preparing " + label + "…");
  try {
    const name = sourceName + " - " + get("current-style").textContent + "." + (format === "jpeg" ? "jpg" : format);
    const image = renderImage(Number(exportScale.value), format);
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
  }
}

exportButton.addEventListener("click", () => outputArtwork(false));
copyButton.addEventListener("click", () => outputArtwork(true));

try {
  const adapter = await navigator.gpu?.requestAdapter();
  if (!adapter) throw new Error("WebGPU is unavailable. Open asciix in a browser with WebGPU and graphics acceleration enabled.");
  device = await adapter.requestDevice();
  device.addEventListener("uncapturederror", ({ error }) => status(error.message, true));
  device.lost.then(({ message }) => {
    canRender = false;
    for (const control of controlInputs) control.disabled = true;
    get("open").disabled = get("sample").disabled = get("reset").disabled = true;
    syncControls();
    syncOutputControls();
    status(message || "The graphics device stopped. Reload the page to try again.", true);
  });
  after = resultCanvas.getContext("webgpu");
  after.configure({ device, format: navigator.gpu.getPreferredCanvasFormat(), alphaMode: "premultiplied" });
  setup(device, { state });
  canRender = true;
  new ResizeObserver(scheduleDraw).observe(artwork);
  for (const control of controlInputs) control.disabled = false;
  get("open").disabled = get("sample").disabled = get("reset").disabled = false;
  syncControls();
  await loadImage(samples.portrait, "portrait", "portrait");
} catch (error) {
  syncOutputControls();
  status(error.message || "Could not start the preview.", true);
}
