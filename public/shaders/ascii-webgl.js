// WebGL 2 host for ascii.frag.glsl. Property names and values match main.ts.
export const asciiDefaults = Object.freeze({
  style: 0, columns: 76, cellAspect: 100, glyphSize: 100, glyphWeight: 100,
  glyphs: "", glyphOrder: 0, edgeGlyphs: "", toneCutoff: 0, response: 0,
  lightGlyphs: "", middleGlyphs: "", heavyGlyphs: "", bandLight: 33, bandHeavy: 67,
  contour: 60, edgeThreshold: 50, joinStrokes: 0, density: 53, runLength: 1, lineBreaks: 0,
  outlinePriority: 0, interiorDetail: 100, dots: -1, blocks: -1, mixByTone: 0, blockThreshold: -1,
  lightDots: 60, middleDots: 28, heavyDots: 8, lightBlocks: 0, middleBlocks: 20, heavyBlocks: 75,
  dotSize: 100, dotAlignment: 100, dotGrid: 0,
  invertImage: false, invertColors: false, transparentPaper: false,
  brightness: 0, contrast: 0, midtones: 0, levels: 0, detail: 0, detailAmount: 72, warp: 0, warpAmount: 40,
  polarity: 0, palette: 0, colorMix: 70, swatchCount: 5, gradedPalette: false, excludeKeyed: true,
  swatches: "", inkRules: "", sourceKey: 0, keyThreshold: 86, keySoftness: 7,
  texture: 25, registration: -1, dither: 0, seed: 0,
  ink: Object.freeze({ r: 0.10, g: 0.085, b: 0.067, a: 1 }),
  paper: Object.freeze({ r: 0.985, g: 0.968, b: 0.927, a: 1 }),
  accentOne: Object.freeze({ r: 0.79, g: 0.47, b: 0.03, a: 1 }),
  accentTwo: Object.freeze({ r: 0.06, g: 0.47, b: 0.62, a: 1 }),
  labelText: "", labelX: 50, labelY: 90, labelSize: 5, labelAlign: 1, labelSwatch: 0,
  labelColor: Object.freeze({ r: 0.10, g: 0.085, b: 0.067, a: 1 }),
  labelBacking: Object.freeze({ r: 0.10, g: 0.085, b: 0.067, a: 0 }),
});

const symbols = {
  " ": 0, ".": 1, ":": 2, ",": 3, "'": 4, "-": 5, "_": 6, "|": 7, "/": 8, "\\": 9,
  "+": 10, "=": 11, "*": 12, "(": 13, ")": 14, "[": 15, "]": 16,
  "□": 17, "▣": 18, "╫": 19, "▥": 20, "█": 21, A: 22, B: 23, M: 24, N: 25, W: 26,
  "8": 27, P: 28, "0": 29, "@": 30, X: 31, V: 32, G: 33, S: 34, H: 35, "#": 36, "&": 37,
  "░": 38, "▒": 39, "▓": 40, "▀": 41, "▄": 42, "◼": 21, "■": 21, "▌": 44, "▐": 45,
  "·": 1, "•": 46, "─": 5, "│": 7, "␣": 0,
};

const symbolCoverage = [
  0, 0.018, 0.040, 0.035, 0.028, 0.083, 0.102, 0.083, 0.116, 0.116, 0.147, 0.153,
  0.174, 0.118, 0.118, 0.141, 0.141, 0.145, 0.31, 0.35, 0.83, 1, 0.38, 0.47, 0.43, 0.43,
  0.41, 0.42, 0.34, 0.42, 0.49, 0.30, 0.29, 0.42, 0.36, 0.42, 0.48, 0.39, 0.25, 0.50,
  0.75, 0.50, 0.50, 0.0, 0.50, 0.50, 0.10,
];

const asciiInkPixels = [
  0, 16, 8, 34, 22, 20, 29, 6, 14, 14, 24, 14, 6, 6, 4, 13,
  36, 19, 25, 23, 28, 25, 24, 20, 28, 24, 8, 10, 14, 12, 14, 16,
  33, 28, 33, 22, 30, 30, 26, 26, 30, 18, 22, 30, 24, 37, 34, 26,
  27, 28, 32, 25, 22, 30, 26, 34, 26, 24, 30, 18, 13, 18, 12, 8,
  6, 20, 25, 18, 25, 20, 21, 25, 27, 15, 20, 26, 17, 27, 21, 20,
  24, 24, 20, 18, 17, 21, 18, 27, 19, 24, 20, 17, 12, 17, 10,
];

function coverage(glyph) {
  if (glyph < 64) return symbolCoverage[glyph];
  if (glyph < 176) return asciiInkPixels[glyph - 64] / 64;
  let count = 0;
  for (let bits = glyph - 176; bits; bits &= bits - 1) count++;
  return count * 0.055;
}

function glyphId(character, typewriter = false) {
  const code = character.charCodeAt(0);
  if (typewriter && code >= 33 && code <= 126) return code + 32;
  if (Object.hasOwn(symbols, character)) return symbols[character];
  if (code >= 32 && code <= 126) return code + 32;
  if (code >= 0x2800 && code <= 0x28ff) return code === 0x2800 ? 0 : 176 + code - 0x2800;
  return null;
}

function encodeCharacters(values, props, style) {
  const writeBank = (text, offset, limit, tone = true) => {
    const ids = Array.from(text.slice(0, limit), char => glyphId(char, tone && style === 0))
      .filter(id => id !== null);
    if (tone && props.glyphOrder === 1) ids.sort((a, b) => coverage(a) - coverage(b) || a - b);
    values[offset] = ids.length;
    values.set(ids, offset + 1);
  };

  // Character texture layout follows the renderer's tone, edge, caption and routing slots.
  values.fill(0xffffffff);
  writeBank(props.glyphs, 0, 128);
  Array.from(props.edgeGlyphs.slice(0, 12), char => glyphId(char)).slice(0, 6).forEach((id, slot) => {
    if (id !== null) values[129 + slot] = id;
  });
  [props.lightGlyphs, props.middleGlyphs, props.heavyGlyphs].forEach((text, index) => {
    writeBank(text, 135 + 65 * index, 64);
  });
  writeBank(props.labelText, 330, 96, false);
  const rules = props.inkRules.slice(0, 48).split(",");
  for (let i = 0; i < 12; i++) values[427 + i] = /^[1-8]$/.test(rules[i] ?? "") ? Number(rules[i]) : 0;
}

function packSettings(props, motion, width, height, maxRows, style, starterCharacters) {
  const { effect = 0, phase = 0, strength = 0, particle = 0, direction = 0,
    angle = effect === 1 ? 38 : ([0, 90, 45][direction] ?? 0), secondaryAngle } = motion;
  const columns = Math.max(24, Math.min(240, Math.round(props.columns)));
  const cellWidth = width / columns;
  const aspect = [1.56, 1.62, 1.06, 1.72, 1.53, 1.58, 1.57, 1.43, 1.31, 1.26, 1.34][style];
  const cellHeight = Math.max(cellWidth * aspect * props.cellAspect * 0.01, height / maxRows);
  const rows = Math.min(maxRows, Math.ceil(height / cellHeight));

  let { ink, paper, accentOne, accentTwo } = asciiDefaults;
  let palette = 0;
  if ([2, 7, 8, 10].includes(style)) paper = { r: 0.995, g: 0.995, b: 0.99 };
  if (style === 4 || style === 6) {
    paper = { r: 0.012, g: 0.013, b: 0.017 };
    ink = { r: 0.962, g: 0.964, b: 0.948 };
  }
  if (style === 5) palette = 1;
  if (style === 4) palette = 2;
  if (style === 9) palette = 3;
  if (palette === 2 || props.palette === 3) {
    ink = { r: 1, g: 0.929, b: 0.754 };
    paper = { r: 0.018, g: 0.012, b: 0.014 };
  } else if (palette === 3) {
    ink = { r: 0.122, g: 0.106, b: 0.086 };
    paper = { r: 0.97, g: 0.919, b: 0.799 };
  }
  if (props.palette !== 0) {
    palette = props.palette - 1;
    if (palette !== 2) ({ ink, paper, accentOne, accentTwo } = props);
  }

  const luma = ({ r, g, b }) => r * 0.2126 + g * 0.7152 + b * 0.0722;
  const brightInk = props.polarity === 2 || (props.polarity === 0 && luma(ink) > luma(paper));
  const dots = props.dots < 0 ? Number(style === 10 && starterCharacters) : props.dots * 0.01;
  const blocks = props.blocks < 0 ? Number(style === 2 && starterCharacters) : props.blocks * 0.01;
  const registration = props.registration < 0 ? Number(style === 3) * props.texture * 0.0077 : props.registration * 0.01;
  const renderFlags = Number(props.invertImage) + 2 * Number(props.invertColors)
    + 4 * Number(props.blocks >= 0 || props.mixByTone === 3);
  const swatchCount = palette === 6 ? Math.max(2, Math.min(8, Math.round(props.swatchCount))) : palette === 7 ? 3 : 0;
  const lightBoundary = Math.min(props.bandLight, props.bandHeavy - 1) * 0.01;
  const rgba = (color, alpha = color.a ?? 1) => [color.r, color.g, color.b, alpha];

  return { columns, rows, swatchCount, effect, uniforms: new Float32Array([
    width, height, cellWidth, cellHeight,
    columns, rows, style, palette,
    props.contour * 0.01, props.density * 0.01, props.texture * 0.01, Number(brightInk),
    ...rgba(ink), ...rgba(paper, props.transparentPaper ? 0 : paper.a),
    ...rgba(accentOne), ...rgba(accentTwo),
    props.brightness * 0.0065, Math.pow(2.7, props.contrast * 0.01), Math.pow(2, props.midtones * -0.01), props.levels,
    props.glyphSize * 0.01, props.glyphWeight * 0.01, props.toneCutoff * 0.01,
    props.glyphOrder + 3 * props.joinStrokes + 9 * props.response,
    dots, blocks, props.mixByTone, (props.edgeThreshold - 50) * 0.006,
    props.detail, props.detailAmount * 0.01, props.warp, props.warpAmount * 0.01,
    renderFlags, props.colorMix * 0.01, registration, props.seed,
    props.sourceKey, props.keyThreshold * 0.01, Math.max(0.001, props.keySoftness * 0.01), props.dither * 0.01,
    lightBoundary, props.bandHeavy * 0.01, props.runLength, props.lineBreaks * 0.01,
    props.outlinePriority * 0.01, props.interiorDetail * 0.01, props.blockThreshold * 0.01, props.dotGrid,
    props.lightDots * 0.01, props.middleDots * 0.01, props.heavyDots * 0.01, props.dotSize * 0.01,
    props.lightBlocks * 0.01, props.middleBlocks * 0.01, props.heavyBlocks * 0.01, props.dotAlignment * 0.01,
    swatchCount, Number(props.gradedPalette), Number(props.excludeKeyed), props.labelSwatch,
    props.labelX * 0.01, props.labelY * 0.01, props.labelSize * 0.01, props.labelAlign * 0.5,
    ...rgba(props.labelColor), ...rgba(props.labelBacking, props.labelBacking.a ?? 0),
    effect, phase, strength, angle,
    particle, secondaryAngle ?? 0, Number(secondaryAngle != null), 0,
  ]) };
}

const vertexSource = `#version 300 es
void main() {
  vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

/** Create a renderer on a dedicated WebGL 2 canvas. Optionally supply the GLSL as text. */
export async function createAsciiRenderer(canvas, fragmentSource) {
  if (fragmentSource === undefined) {
    const response = await fetch(new URL("./ascii.frag.glsl", import.meta.url));
    if (!response.ok) throw new Error(`Could not load ascii.frag.glsl (${response.status}).`);
    fragmentSource = await response.text();
  }
  const version = fragmentSource.match(/^\s*#version\s+300\s+es[^\S\r\n]*\r?\n/);
  if (!version || !fragmentSource.includes("#ifdef ASCIIX_PASS")) {
    throw new Error("Expected the full asciix GLSL ES 3.00 source.");
  }

  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) throw new Error("asciix requires WebGL 2.");
  if (!gl.getContextAttributes()?.premultipliedAlpha || !gl.getContextAttributes()?.alpha) {
    throw new Error("Use an alpha-enabled, premultiplied WebGL 2 canvas.");
  }

  const parallelCompile = gl.getExtension("KHR_parallel_shader_compile");
  const textureNames = ["uImage", "uCharacters", "uSwatchSources", "uSwatchInks", "uCellColors", "uCellMarks", "uAuraEmitters"];
  const textures = new Map(textureNames.map((name, unit) => [name, { unit, texture: gl.createTexture() }]));
  const programs = [];
  const targets = [];
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const settingsBuffer = gl.createBuffer();
  const characters = new Uint32Array(439);
  let characterSignature;
  let bitmapCanvas;
  let hasSource = false;
  let paletteSize = 0;
  let disposed = false;

  function selectTexture(name) {
    const { unit, texture } = textures.get(name);
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
  }

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  }

  async function linkPass(vertex, number, name) {
    const start = version[0].length;
    const source = fragmentSource.slice(0, start) + `#define ASCIIX_PASS ${number}\n` + fragmentSource.slice(start);
    const fragment = compile(gl.FRAGMENT_SHADER, source);
    const program = gl.createProgram();
    programs.push(program);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    try {
      while (parallelCompile && !gl.getProgramParameter(program, parallelCompile.COMPLETION_STATUS_KHR)) {
        await new Promise(resolve => setTimeout(resolve, 16));
      }
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const log = [gl.getProgramInfoLog(program), gl.getShaderInfoLog(vertex), gl.getShaderInfoLog(fragment)].filter(Boolean);
        throw new Error(`Could not link ${name}: ${log.join("\n")}`);
      }
    } finally {
      gl.detachShader(program, vertex);
      gl.detachShader(program, fragment);
      gl.deleteShader(fragment);
    }
    gl.useProgram(program);
    gl.uniformBlockBinding(program, gl.getUniformBlockIndex(program, "AsciixSettings"), 0);
    textureNames.forEach((uniform, unit) => gl.uniform1i(gl.getUniformLocation(program, uniform), unit));
    return program;
  }

  function createTarget(names) {
    const target = { names, framebuffer: gl.createFramebuffer(), width: 0, height: 0 };
    targets.push(target);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    const attachments = names.map((name, index) => {
      const attachment = gl.COLOR_ATTACHMENT0 + index;
      gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, textures.get(name).texture, 0);
      return attachment;
    });
    gl.drawBuffers(attachments);
    return target;
  }

  function resizeTarget(target, width, height) {
    if (target.width === width && target.height === height) return;
    target.width = target.height = 0;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    for (const name of target.names) {
      selectTexture(name);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32UI, width, height, 0, gl.RGBA_INTEGER, gl.UNSIGNED_INT, null);
    }
    if (gl.getError() !== gl.NO_ERROR || gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Could not allocate asciix's ${width} × ${height} render target.`);
    }
    target.width = width;
    target.height = height;
  }

  function drawPass(program, target, width, height) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target?.framebuffer ?? null);
    gl.viewport(0, 0, width, height);
    gl.useProgram(program);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    gl.useProgram(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    for (const program of programs) gl.deleteProgram(program);
    for (const { texture } of textures.values()) gl.deleteTexture(texture);
    for (const { framebuffer } of targets) gl.deleteFramebuffer(framebuffer);
    gl.deleteBuffer(settingsBuffer);
    bitmapCanvas = undefined;
  }

  let extract, analyze, selectEmitters, composite, swatches, cells, emitters, lockedColors;
  try {
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    try {
      extract = await linkPass(vertex, 1, "palette extraction");
      analyze = await linkPass(vertex, 2, "cell analysis");
      selectEmitters = await linkPass(vertex, 3, "Aura emitter selection");
      composite = await linkPass(vertex, 4, "ASCII compositing");
    } finally {
      gl.deleteShader(vertex);
    }
    lockedColors = gl.getUniformLocation(extract, "uLockedColors[0]");
    gl.bindBuffer(gl.UNIFORM_BUFFER, settingsBuffer);
    gl.bufferData(gl.UNIFORM_BUFFER, 23 * 16, gl.DYNAMIC_DRAW);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, settingsBuffer);
    for (const name of textureNames) {
      selectTexture(name);
      const filter = name === "uImage" ? gl.LINEAR : gl.NEAREST;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    selectTexture("uCharacters");
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R32UI, characters.length, 1);
    swatches = createTarget(["uSwatchSources", "uSwatchInks"]);
    cells = createTarget(["uCellColors", "uCellMarks"]);
    emitters = createTarget(["uAuraEmitters"]);
    resizeTarget(swatches, 8, 1);
    resizeTarget(emitters, 1, 1);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.DITHER);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  } catch (error) {
    dispose();
    throw error;
  }

  function assertReady() {
    if (disposed) throw new Error("The asciix renderer is disposed.");
    if (gl.isContextLost()) throw new Error("The WebGL context was lost. Recreate the asciix renderer after restoration.");
  }

  function setSource(image) {
    assertReady();
    const width = image.naturalWidth ?? image.videoWidth ?? image.displayWidth ?? image.width;
    const height = image.naturalHeight ?? image.videoHeight ?? image.displayHeight ?? image.height;
    if (!(width > 0 && height > 0 && width <= maxTextureSize && height <= maxTextureSize)) {
      throw new Error(`Load an image or frame within WebGL's ${maxTextureSize} px texture limit.`);
    }
    // WebGL ignores the premultiply upload flag for ImageBitmap.
    if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) {
      bitmapCanvas ??= new OffscreenCanvas(width, height);
      if (bitmapCanvas.width !== width) bitmapCanvas.width = width;
      if (bitmapCanvas.height !== height) bitmapCanvas.height = height;
      const painter = bitmapCanvas.getContext("2d");
      painter.globalCompositeOperation = "copy";
      painter.drawImage(image, 0, 0);
      image = bitmapCanvas;
    }
    selectTexture("uImage");
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, image);
    const error = gl.getError();
    if (error !== gl.NO_ERROR) throw new Error(`Could not upload the asciix source texture (${error}).`);
    hasSource = true;
    paletteSize = 0;
  }

  function draw(params = {}, motion = {}) {
    assertReady();
    if (!hasSource) throw new Error("Call setSource before drawing asciix.");
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    if (!width || !height) throw new Error("Set a nonzero canvas size before drawing asciix.");
    const props = { ...asciiDefaults, ...params };
    const style = Math.max(0, Math.min(10, Math.round(props.style)));
    const signature = JSON.stringify([props.glyphs, props.lightGlyphs, props.middleGlyphs, props.heavyGlyphs,
      props.edgeGlyphs, props.labelText, props.inkRules, props.glyphOrder, style === 0]);
    if (signature !== characterSignature) {
      encodeCharacters(characters, props, style);
      selectTexture("uCharacters");
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, characters.length, 1, gl.RED_INTEGER, gl.UNSIGNED_INT, characters);
      characterSignature = signature;
    }
    const starterCharacters = [0, 135, 200, 265].every(offset => characters[offset] === 0);
    const frame = packSettings(props, motion, width, height, maxTextureSize, style, starterCharacters);
    if (!frame.uniforms.every(Number.isFinite) || !(frame.rows > 0 && frame.uniforms[3] > 0)) {
      throw new Error("asciix needs finite settings and a positive cell size.");
    }
    gl.bindBuffer(gl.UNIFORM_BUFFER, settingsBuffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, frame.uniforms);
    paletteSize = 0;
    if (frame.swatchCount) {
      const locks = new Float32Array(8 * 4);
      props.swatches.slice(0, 1024).split(/[\n;]/).slice(0, 8).forEach((line, index) => {
        const hex = line.match(/(?:^|=)\s*#([0-9a-f]{6})\s*$/i)?.[1];
        if (!hex) return;
        const rgb = hex.match(/../g).map(channel => parseInt(channel, 16) / 255);
        locks.set([...rgb, 1], index * 4);
      });
      gl.useProgram(extract);
      gl.uniform4fv(lockedColors, locks);
      drawPass(extract, swatches, 8, 1);
    }
    resizeTarget(cells, frame.columns, frame.rows);
    drawPass(analyze, cells, frame.columns, frame.rows);
    if (frame.effect === 1) {
      const columns = Math.ceil(frame.columns / 4);
      const rows = Math.ceil(frame.rows / 4);
      resizeTarget(emitters, columns, rows);
      drawPass(selectEmitters, emitters, columns, rows);
    }
    drawPass(composite, null, width, height);
    paletteSize = frame.swatchCount;
  }

  function readPalette() {
    assertReady();
    if (!paletteSize) return [];
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, swatches.framebuffer);
    try {
      const colors = [0, 1].map(index => {
        const data = new Uint32Array(paletteSize * 4);
        gl.readBuffer(gl.COLOR_ATTACHMENT0 + index);
        gl.readPixels(0, 0, paletteSize, 1, gl.RGBA_INTEGER, gl.UNSIGNED_INT, data);
        return new Float32Array(data.buffer);
      });
      return Array.from({ length: paletteSize }, (_, i) => ({
        sourceColor: Array.from(colors[0].subarray(4 * i, 4 * i + 4)),
        ink: Array.from(colors[1].subarray(4 * i, 4 * i + 4)),
      }));
    } finally {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    }
  }

  return { setSource, draw, readPalette, dispose };
}
