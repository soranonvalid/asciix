import { defineProperties } from "figma:shaders";

export default function Effect() {}

export function setup(device, frame) {
  const bitmaps = [
    ["01110", "10001", "10001", "11111", "10001", "10001", "10001"], // A
    ["11110", "10001", "10001", "11110", "10001", "10001", "11110"], // B
    ["10001", "11011", "11111", "10101", "10001", "10001", "10001"], // M
    ["10001", "11001", "11001", "10101", "10011", "10011", "10001"], // N
    ["10001", "10001", "10101", "10101", "10101", "11011", "10001"], // W
    ["01110", "10001", "10001", "01110", "10001", "10001", "01110"], // 8
    ["11110", "10001", "10001", "11110", "10000", "10000", "10000"], // P
    ["01110", "10001", "10011", "10101", "11001", "10001", "01110"], // 0
    ["01110", "10001", "10111", "10101", "10111", "10000", "01111"], // @
    ["10001", "10001", "01010", "00100", "01010", "10001", "10001"], // X
    ["10001", "10001", "10001", "10001", "01010", "01010", "00100"], // V
    ["01111", "10000", "10000", "10111", "10001", "10001", "01111"], // G
    ["01111", "10000", "10000", "01110", "00001", "00001", "11110"], // S
    ["10001", "10001", "10001", "11111", "10001", "10001", "10001"], // H
    ["01010", "01010", "11111", "01010", "11111", "01010", "01010"], // #
    ["01100", "10010", "10100", "01000", "10101", "10010", "01101"], // &
  ];
  const packedBitmaps = bitmaps.map((rows) => {
    const top = Number.parseInt(rows.slice(0, 4).join(""), 2);
    const bottom = Number.parseInt(rows.slice(4).join("") + "00000", 2);
    return `vec2u(${top}u, ${bottom}u)`;
  }).join(", ");

  // Public-domain VGA bitmaps from Daniel Hepper's font8x8, packed into pairs of words.
  const ascii = [
    0x00000000, 0x00000000, 0x183c3c18, 0x00180018, 0x00003636, 0x00000000, 0x367f3636, 0x0036367f,
    0x1e033e0c, 0x000c1f30, 0x18336300, 0x0063660c, 0x6e1c361c, 0x006e333b, 0x00030606, 0x00000000,
    0x06060c18, 0x00180c06, 0x18180c06, 0x00060c18, 0xff3c6600, 0x0000663c, 0x3f0c0c00, 0x00000c0c,
    0x00000000, 0x060c0c00, 0x3f000000, 0x00000000, 0x00000000, 0x000c0c00, 0x0c183060, 0x00010306,
    0x7b73633e, 0x003e676f, 0x0c0c0e0c, 0x003f0c0c, 0x1c30331e, 0x003f3306, 0x1c30331e, 0x001e3330,
    0x33363c38, 0x0078307f, 0x301f033f, 0x001e3330, 0x1f03061c, 0x001e3333, 0x1830333f, 0x000c0c0c,
    0x1e33331e, 0x001e3333, 0x3e33331e, 0x000e1830, 0x000c0c00, 0x000c0c00, 0x000c0c00, 0x060c0c00,
    0x03060c18, 0x00180c06, 0x003f0000, 0x00003f00, 0x30180c06, 0x00060c18, 0x1830331e, 0x000c000c,
    0x7b7b633e, 0x001e037b, 0x33331e0c, 0x0033333f, 0x3e66663f, 0x003f6666, 0x0303663c, 0x003c6603,
    0x6666361f, 0x001f3666, 0x1e16467f, 0x007f4616, 0x1e16467f, 0x000f0616, 0x0303663c, 0x007c6673,
    0x3f333333, 0x00333333, 0x0c0c0c1e, 0x001e0c0c, 0x30303078, 0x001e3333, 0x1e366667, 0x00676636,
    0x0606060f, 0x007f6646, 0x7f7f7763, 0x0063636b, 0x7b6f6763, 0x00636373, 0x6363361c, 0x001c3663,
    0x3e66663f, 0x000f0606, 0x3333331e, 0x00381e3b, 0x3e66663f, 0x00676636, 0x0e07331e, 0x001e3338,
    0x0c0c2d3f, 0x001e0c0c, 0x33333333, 0x003f3333, 0x33333333, 0x000c1e33, 0x6b636363, 0x0063777f,
    0x1c366363, 0x0063361c, 0x1e333333, 0x001e0c0c, 0x1831637f, 0x007f664c, 0x0606061e, 0x001e0606,
    0x180c0603, 0x00406030, 0x1818181e, 0x001e1818, 0x63361c08, 0x00000000, 0x00000000, 0xff000000,
    0x00180c0c, 0x00000000, 0x301e0000, 0x006e333e, 0x3e060607, 0x003b6666, 0x331e0000, 0x001e3303,
    0x3e303038, 0x006e3333, 0x331e0000, 0x001e033f, 0x0f06361c, 0x000f0606, 0x336e0000, 0x1f303e33,
    0x6e360607, 0x00676666, 0x0c0e000c, 0x001e0c0c, 0x30300030, 0x1e333330, 0x36660607, 0x0067361e,
    0x0c0c0c0e, 0x001e0c0c, 0x7f330000, 0x00636b7f, 0x331f0000, 0x00333333, 0x331e0000, 0x001e3333,
    0x663b0000, 0x0f063e66, 0x336e0000, 0x78303e33, 0x6e3b0000, 0x000f0666, 0x033e0000, 0x001f301e,
    0x0c3e0c08, 0x00182c0c, 0x33330000, 0x006e3333, 0x33330000, 0x000c1e33, 0x6b630000, 0x00367f7f,
    0x36630000, 0x0063361c, 0x33330000, 0x1f303e33, 0x193f0000, 0x003f260c, 0x070c0c38, 0x00380c0c,
    0x00181818, 0x00181818, 0x380c0c07, 0x00070c0c, 0x00003b6e, 0x00000000,
  ];
  const asciiBitmaps = Array.from({ length: 95 }, (_, i) => "vec2u(" + ascii[i * 2] + "u, " + ascii[i * 2 + 1] + "u)").join(", ");
  const characters = {
    " ": 0, ".": 1, ":": 2, ",": 3, "'": 4, "-": 5, "_": 6, "|": 7, "/": 8, "\\": 9,
    "+": 10, "=": 11, "*": 12, "(": 13, ")": 14, "[": 15, "]": 16,
    "□": 17, "▣": 18, "╫": 19, "▥": 20, "█": 21, "A": 22, "B": 23, "M": 24, "N": 25, "W": 26,
    "8": 27, "P": 28, "0": 29, "@": 30, "X": 31, "V": 32, "G": 33, "S": 34, "H": 35, "#": 36, "&": 37,
    "░": 38, "▒": 39, "▓": 40, "▀": 41, "▄": 42, "◼": 21, "■": 21, "▌": 44, "▐": 45,
    "·": 1, "•": 46, "─": 5, "│": 7, "␣": 0,
  };
  const starterGlyphs = [
    " .:;=xo#@", " .:_-/\\=+", " □□╫▣▥▥██", " .,:;+*X#", " .,VANGWB", " .,(|P88B",
    " .':]XH&@", " ..::/|+*", " '.:--/|+", " .:;+X#▥█", " .,:;+*X#",
  ];
  frame.state.starterGlyphs = starterGlyphs;
  // shortcut: printable ASCII, Braille and selected symbols, add an atlas for other scripts when needed.
  frame.state.encodeGlyph = (character) => {
    const mapped = characters[character];
    if (mapped != null) return mapped;
    const code = character.charCodeAt(0);
    if (code >= 32 && code <= 126) return 64 + code - 32;
    if (code >= 0x2800 && code <= 0x28ff) return code === 0x2800 ? 0 : 176 + code - 0x2800;
    return null;
  };
  frame.state.encodeTypeGlyph = (character) => {
    const code = character.charCodeAt(0);
    return code >= 33 && code <= 126 ? 64 + code - 32 : frame.state.encodeGlyph(character);
  };
  frame.state.inkCoverage = [
    0, 0.018, 0.040, 0.035, 0.028, 0.083, 0.102, 0.083, 0.116, 0.116, 0.147, 0.153,
    0.174, 0.118, 0.118, 0.141, 0.141, 0.145, 0.31, 0.35, 0.83, 1, 0.38, 0.47, 0.43, 0.43,
    0.41, 0.42, 0.34, 0.42, 0.49, 0.30, 0.29, 0.42, 0.36, 0.42, 0.48, 0.39, 0.25, 0.50,
    0.75, 0.50, 0.50, 0.0, 0.50, 0.50, 0.10,
  ];
  frame.state.countBits = (word) => {
    let count = 0;
    for (let value = word >>> 0; value !== 0; value = (value & (value - 1)) >>> 0) count += 1;
    return count;
  };
  for (let i = 0; i < 95; i += 1) {
    frame.state.inkCoverage[64 + i] = (frame.state.countBits(ascii[i * 2]) + frame.state.countBits(ascii[i * 2 + 1])) / 64;
  }
  const starterRamps = starterGlyphs.map((text, style) =>
    Array.from(text, (char) => (style === 0 ? frame.state.encodeTypeGlyph(char) : frame.state.encodeGlyph(char)) + "u").join(", "),
  ).join(", ");
  const symbolCoverage = frame.state.inkCoverage.slice(0, 47).join(", ");

  const code = `
    diagnostic(off,derivative_uniformity);

    struct Settings {
      size: vec4f,      // Output width and height, cell width and height
      grid: vec4f,      // Columns, rows, style, palette
      controls: vec4f,  // Contour, density, texture, bright ink polarity
      ink: vec4f,
      paper: vec4f,
      accentOne: vec4f,
      accentTwo: vec4f,
      grading: vec4f,    // Brightness, contrast, gamma, posterize levels
      glyphs: vec4f,     // Size, weight, minimum tone, assignment/join/response choices
      mixMarks: vec4f,   // Dots, blocks, tone bands, contour threshold offset
      alterations: vec4f, // Detail method and amount, warp method and amount
      composite: vec4f, // Render flags, color mix, registration, seed
      alpha: vec4f,     // Source key method, threshold, softness, dither
      bands: vec4f,     // Tone boundaries, contour run length, breaks
      edges: vec4f,     // Silhouette priority, interior detail, block threshold, dot grid
      dotBands: vec4f,  // Per-band mix and dot size
      blockBands: vec4f, // Per-band mix and dot alignment
      extraction: vec4f, // Active swatch count, graded colors, exclude keyed pixels, label swatch
      caption: vec4f,   // Position, size, alignment
      captionInk: vec4f,
      captionBacking: vec4f,
      motion: vec4f, // Effect, loop phase, strength, angle in degrees
      particles: vec4f, // Aura particle shape
    }

    struct Cell {
      color: vec4f,     // Average source RGB and mapped tone
      mark: vec4f,      // Packed glyph and dot coverage, contour tangent XY, edge weight
    }
    struct AuraEmitter {
      cellIndex: u32,
      weight: f32,
    }

    @group(0) @binding(0) var<uniform> settings: Settings;
    @group(0) @binding(1) var source: texture_2d<f32>;
    @group(0) @binding(2) var sourceSampler: sampler;
    @group(0) @binding(3) var<storage, read_write> analyzedCells: array<Cell>;
    @group(0) @binding(4) var<storage, read> cells: array<Cell>;
    @group(0) @binding(5) var<storage, read> characterData: array<u32>;
    struct Swatch {
      sourceColor: vec4f,
      ink: vec4f,
    }
    @group(0) @binding(6) var<storage, read> lockedColors: array<vec4f>;
    @group(0) @binding(7) var<storage, read_write> extractedColors: array<Swatch>;
    @group(0) @binding(8) var<storage, read> swatches: array<Swatch>;
    @group(0) @binding(9) var<storage, read_write> selectedEmitters: array<AuraEmitter>;
    @group(0) @binding(10) var<storage, read> emitters: array<AuraEmitter>;

    const LUMA = vec3f(0.2126, 0.7152, 0.0722);
    const DOT = 1u;
    const COLON = 2u;
    const COMMA = 3u;
    const QUOTE = 4u;
    const DASH = 5u;
    const UNDER = 6u;
    const BAR = 7u;
    const SLASH = 8u;
    const BACKSLASH = 9u;
    const PLUS = 10u;
    const EQUALS = 11u;
    const STAR = 12u;
    const LEFT_PAREN = 13u;
    const RIGHT_PAREN = 14u;
    const LEFT_BRACKET = 15u;
    const RIGHT_BRACKET = 16u;
    const BOX = 17u;
    const THICK_BOX = 18u;
    const BARS = 19u;
    const WINDOW = 20u;
    const BLOCK = 21u;
    const A = 22u;
    const B = 23u;
    const M = 24u;
    const HASH = 36u;
    const AT = 30u;
    const DOT_MATRIX = 43u;
    const ASCII_START = 64u;
    const BRAILLE_START = 176u;
    const EDGE_START = 129u;
    const INHERIT = 0xffffffffu;
    const CAPTION_START = 330u;
    const RULE_START = 427u;
    const BITMAPS = array<vec2u, 16>(${packedBitmaps});
    const ASCII_BITMAPS = array<vec2u, 95>(${asciiBitmaps});
    const STARTER_RAMPS = array<u32, 99>(${starterRamps});
    const SYMBOL_COVERAGE = array<f32, 47>(${symbolCoverage});
    const TURN = 6.28318530718;

    fn noise(id: vec2u, salt: u32) -> f32 {
      var value = id.x * 747796405u + id.y * 2891336453u + (salt + u32(settings.composite.w)) * 277803737u;
      value = ((value >> ((value >> 28u) + 4u)) ^ value) * 277803737u;
      return f32(((value >> 22u) ^ value) & 65535u) / 65535.0;
    }

    fn sourceAt(uv: vec2f) -> vec4f {
      let bounded = clamp(uv, vec2f(0.0), vec2f(1.0));
      return textureSampleLevel(source, sourceSampler, motionSourceUV(bounded), 0.0);
    }

    fn imageInverted() -> bool {
      return (u32(settings.composite.x) & 1u) != 0u;
    }

    fn gradeImage(value: vec3f) -> vec3f {
      let rgb = select(value, 1.0 - value, imageInverted());
      let adjusted = clamp((rgb - 0.5) * settings.grading.y + 0.5 + settings.grading.x, vec3f(0.0), vec3f(1.0));
      return pow(adjusted, vec3f(settings.grading.z));
    }

    fn warpedCenter(center: vec2f, row: u32) -> vec2f {
      let warp = u32(settings.alterations.z);
      let amount = settings.alterations.w * 0.15;
      if (warp == 1u) {
        let shift = 2.0 * noise(vec2u(row / 2u, 0u), 63u) - 1.0;
        return center + vec2f(shift * amount, 0.0);
      }
      if (warp == 2u) {
        let phase = f32(u32(settings.composite.w) % 31u) * 0.21;
        return center + vec2f(sin(center.y * 19.0 + phase) * amount, cos(center.x * 12.0 + phase) * amount * 0.45);
      }
      return center;
    }

    fn rampGlyph(style: u32, tone: f32, variation: f32) -> u32 {
      let level = u32(clamp(floor(tone * 9.0 + (variation - 0.5) * 0.45), 0.0, 8.0));
      if (style == 4u && level == 7u && variation > 0.52) { return M; }
      if (style == 5u && level == 7u && variation > 0.27) { return B; }
      if (style == 6u && level == 8u && variation > 0.55) { return HASH; }
      if (style == 8u && level == 1u && variation > 0.5) { return COMMA; }
      if (style == 9u && level == 6u && variation > 0.55) { return WINDOW; }
      return STARTER_RAMPS[style * 9u + level];
    }

    fn toneBand(value: f32) -> u32 {
      return select(0u, select(1u, 2u, value >= settings.bands.y), value >= settings.bands.x);
    }

    fn userGlyph(id: vec2u, tone: f32, style: u32, variation: f32, band: u32) -> u32 {
      let bank = 135u + band * 65u;
      let start = select(0u, bank, characterData[bank] > 0u);
      let count = characterData[start];
      if (count == 0u) { return rampGlyph(style, tone, variation); }
      if (tone <= 0.015) { return 0u; }
      if (u32(settings.glyphs.w) % 3u == 2u) {
        if (variation > tone) { return 0u; }
        let index = (id.y * u32(settings.grid.x) + id.x + u32(settings.composite.w)) % count;
        return characterData[start + 1u + index];
      }
      let ends = array(0.0, settings.bands.x, settings.bands.y, 1.0);
      let level = select(tone, (tone - ends[band]) / (ends[band + 1u] - ends[band]), start != 0u);
      let index = u32(clamp(floor(level * f32(count)), 0.0, f32(count - 1u)));
      return characterData[start + 1u + index];
    }

    fn glyphCoverage(glyph: u32) -> f32 {
      if (glyph >= BRAILLE_START) { return f32(countOneBits(glyph - BRAILLE_START)) * 0.055; }
      if (glyph >= ASCII_START) {
        let bits = ASCII_BITMAPS[glyph - ASCII_START];
        return f32(countOneBits(bits.x) + countOneBits(bits.y)) / 64.0;
      }
      return SYMBOL_COVERAGE[glyph];
    }

    fn seededGlyph(id: vec2u, glyph: u32, style: u32, band: u32) -> u32 {
      if (glyph == 0u || noise(id, 106u) >= settings.motion.z) { return glyph; }
      let bank = 135u + band * 65u;
      let start = select(0u, bank, characterData[bank] > 0u);
      let customCount = characterData[start];
      let count = select(customCount, 9u, customCount == 0u);
      let tick = u32(floor(fract(settings.motion.y) * 10.0 + noise(id, 107u))) % 10u;
      let coverage = glyphCoverage(glyph);
      var nearest = 0.08 + 0.07 * settings.motion.z;
      var replacement = glyph;
      for (var attempt = 0u; attempt < 5u; attempt++) {
        let index = u32(noise(id, 111u + tick * 5u + attempt) * f32(count)) % count;
        var candidate = STARTER_RAMPS[style * 9u + index % 9u];
        if (customCount > 0u) { candidate = characterData[start + 1u + index]; }
        if (candidate == 0u || candidate == glyph) { continue; }
        let difference = abs(glyphCoverage(candidate) - coverage);
        if (difference < nearest) {
          nearest = difference;
          replacement = candidate;
        }
      }
      return replacement;
    }

    fn sourceRGB(sampleColor: vec4f) -> vec3f {
      return clamp(sampleColor.rgb / max(sampleColor.a, 0.0001), vec3f(0.0), vec3f(1.0));
    }

    fn extractionRGB(original: vec3f) -> vec3f {
      return select(original, gradeImage(original), settings.extraction.y > 0.5);
    }

    @compute @workgroup_size(1)
    fn extractPalette() {
      // shortcut: sample a fixed 48 × 48 grid, use a denser pass if small isolated colors need more weight.
      var bins: array<vec4f, 64>;
      var tonal: array<vec4f, 3>;
      var overall = vec4f(0.0);
      for (var y = 0u; y < 48u; y++) {
        for (var x = 0u; x < 48u; x++) {
          let texel = sourceAt((vec2f(f32(x), f32(y)) + 0.5) / 48.0);
          let alpha = select(texel.a, inputCoverage(texel), settings.extraction.z > 0.5);
          if (alpha < 0.02) { continue; }
          let rgb = extractionRGB(sourceRGB(texel));
          let component = min(vec3u(rgb * 4.0), vec3u(3u));
          let index = component.r * 16u + component.g * 4u + component.b;
          let band = min(2u, u32(dot(rgb, LUMA) * 3.0));
          let value = vec4f(rgb * alpha, alpha);
          bins[index] += value;
          tonal[band] += value;
          overall += value;
        }
      }
      let count = u32(settings.extraction.x);
      let fallback = select(settings.ink.rgb, overall.rgb / max(overall.a, 0.0001), overall.a > 0.0);
      var chosen: array<vec3f, 8>;
      for (var i = 0u; i < count; i++) {
        var rgb = fallback;
        if (settings.grid.w == 7.0) {
          let weighted = tonal[i];
          rgb = select(fallback, weighted.rgb / max(weighted.a, 0.0001), weighted.a > 0.0);
        } else {
          var best = 0.0;
          var bestIndex = 0u;
          for (var j = 0u; j < 64u; j++) {
            if (bins[j].a <= 0.0) { continue; }
            let candidate = bins[j].rgb / bins[j].a;
            var spread = 1.0;
            for (var k = 0u; k < i; k++) {
              spread = min(spread, distance(chosen[k], candidate));
            }
            let score = sqrt(bins[j].a) * (0.12 + spread);
            if (score > best) {
              best = score;
              bestIndex = j;
              rgb = candidate;
            }
          }
          if (best > 0.0) { bins[bestIndex] = vec4f(0.0); }
        }
        chosen[i] = rgb;
        let lockColor = lockedColors[i];
        extractedColors[i] = Swatch(vec4f(rgb, 1.0), vec4f(select(rgb, lockColor.rgb, lockColor.a > 0.5), 1.0));
      }
    }

    fn routeInk(rgb: vec3f, band: u32, kind: u32) -> vec3f {
      let count = u32(settings.extraction.x);
      let rule = characterData[RULE_START + kind * 3u + band];
      if (rule > 0u && rule <= count) { return swatches[rule - 1u].ink.rgb; }
      if (settings.grid.w == 7.0) {
        return swatches[min(2u, u32(dot(rgb, LUMA) * 3.0))].ink.rgb;
      }
      var best = 10.0;
      var index = 0u;
      for (var i = 0u; i < count; i++) {
        let delta = rgb - swatches[i].sourceColor.rgb;
        let distanceSquared = dot(delta * delta, vec3f(0.30, 0.55, 0.15));
        if (distanceSquared < best) {
          best = distanceSquared;
          index = i;
        }
      }
      return swatches[index].ink.rgb;
    }

    fn contourGlyph(style: u32, tangent: vec2f, corner: f32, variation: f32, useDefault: bool) -> u32 {
      var slot = select(2u, 3u, tangent.x * tangent.y > 0.0);
      if (abs(tangent.x) > abs(tangent.y) * 2.414) {
        slot = 0u;
      } else if (abs(tangent.y) > abs(tangent.x) * 2.414) {
        slot = 1u;
      }
      let turning = corner > 0.14;
      let edgeIndex = select(slot, select(4u, 5u, tangent.y > 0.0), turning);
      let current = characterData[EDGE_START + edgeIndex];
      let straight = characterData[EDGE_START + slot];
      if (current != INHERIT) { return current; }
      if (straight != INHERIT) { return straight; }
      if (!useDefault) { return INHERIT; }

      if (style == 2u) {
        return select(BARS, THICK_BOX, abs(tangent.x) > 0.65);
      }
      if (style == 3u && variation < 0.48) {
        return select(COLON, DASH, abs(tangent.x) > abs(tangent.y));
      }
      if (style == 8u && variation < 0.18) {
        return select(COMMA, QUOTE, tangent.y > 0.0);
      }
      if (turning && style != 1u && style != 8u) {
        if (style == 7u || style == 5u) {
          return select(LEFT_PAREN, RIGHT_PAREN, tangent.y > 0.0);
        }
        return select(LEFT_BRACKET, RIGHT_BRACKET, tangent.y > 0.0);
      }
      return array(select(DASH, UNDER, style == 1u), BAR, SLASH, BACKSLASH)[slot];
    }

    @compute @workgroup_size(8, 8)
    fn main(@builtin(global_invocation_id) id: vec3u) {
      let columns = u32(settings.grid.x);
      let rows = u32(settings.grid.y);
      if (id.x >= columns || id.y >= rows) { return; }

      let cellSize = settings.size.zw;
      let resolution = settings.size.xy;
      let extent = cellSize / resolution;
      let center = warpedCenter(min((vec2f(id.xy) + 0.5) * extent, vec2f(1.0) - 0.5 / resolution), id.y);
      let detailMode = u32(settings.alterations.x);
      let detail = settings.alterations.y;
      let offset = (0.45 + select(0.0, detail * 0.95, detailMode == 1u)) * extent;
      let nw = sourceAt(center - offset);
      let n = sourceAt(center - vec2f(0.0, offset.y));
      let ne = sourceAt(center + vec2f(offset.x, -offset.y));
      let w = sourceAt(center - vec2f(offset.x, 0.0));
      let c = sourceAt(center);
      let e = sourceAt(center + vec2f(offset.x, 0.0));
      let sw = sourceAt(center + vec2f(-offset.x, offset.y));
      let s = sourceAt(center + vec2f(0.0, offset.y));
      let se = sourceAt(center + offset);

      let total = nw + ne + sw + se + 2.0 * (n + w + e + s) + 4.0 * c;
      let dx = (ne + 2.0 * e + se - nw - 2.0 * w - sw) * 0.25;
      let dy = (sw + 2.0 * s + se - nw - 2.0 * n - ne) * 0.25 * cellSize.x / cellSize.y;
      let gx = select(dx.rgb, dx.aaa - dx.rgb, imageInverted());
      let gy = select(dy.rgb, dy.aaa - dy.rgb, imageInverted());
      let valueGradient = vec2f(dot(gx, LUMA), dot(gy, LUMA));
      var alphaGradient = 0.8 * vec2f(dx.a, dy.a);
      if (settings.edges.x > 0.0 && settings.alpha.x > 0.0) {
        alphaGradient = vec2f(inputCoverage(e) - inputCoverage(w), (inputCoverage(s) - inputCoverage(n)) * cellSize.x / cellSize.y);
      }
      alphaGradient *= 1.0 + settings.edges.x * 2.0;
      let interiorGradient = valueGradient * settings.edges.y;
      let gradient = select(interiorGradient, alphaGradient, length(alphaGradient) > length(interiorGradient));
      let contrast = length(gradient);
      let tangent = vec2f(gradient.y, -gradient.x) / max(contrast, 0.0001);
      let twist = nw + se - ne - sw;
      let corner = max(abs(dot(twist.rgb, LUMA)), 0.8 * abs(twist.a));

      var rgb = gradeImage(clamp(total.rgb / max(total.a, 0.0001), vec3f(0.0), vec3f(1.0)));
      if (detailMode == 2u) {
        let middle = gradeImage(clamp(c.rgb / max(c.a, 0.0001), vec3f(0.0), vec3f(1.0)));
        rgb += (middle - rgb) * detail * 2.4;
      } else if (detailMode == 3u) {
        let relief = 0.68 + 1.48 * dot(gradient, vec2f(0.72, -0.69));
        rgb = mix(rgb, vec3f(relief), detail);
      } else if (detailMode == 4u) {
        let edgeInk = smoothstep(0.025, 0.48, contrast);
        rgb = mix(rgb, vec3f(select(1.0 - edgeInk, edgeInk, settings.controls.w > 0.5)), detail);
      }
      rgb = clamp(rgb, vec3f(0.0), vec3f(1.0));
      var luma = dot(rgb, LUMA);
      let levels = settings.grading.w - 1.0;
      if (levels >= 1.0) { luma = round(luma * levels) / levels; }

      let style = u32(settings.grid.z);
      let brightInk = settings.controls.w > 0.5;
      let inkTarget = select(1.0 - luma, luma, brightInk);
      let density = settings.controls.y;
      var tone = pow(inkTarget, mix(1.85, 0.52, density));
      let response = u32(settings.glyphs.w) / 9u;
      if (response == 0u) {
        switch style {
          case 1u: { tone *= 0.92; }
          case 2u: { tone = pow(tone, 0.81); }
          case 4u: { tone = pow(tone, 1.25); }
          case 7u: { tone = pow(tone, 2.7) * 0.69; }
          case 8u: { tone = pow(tone, 4.4) * 0.37; }
          case 9u: { tone = pow(tone, 1.15); }
          case 10u: { tone = pow(tone, 1.4) * 0.9; }
          default: {}
        }
      } else if (response == 2u) {
        tone = pow(tone, 0.64);
      } else if (response == 3u) {
        tone = pow(tone, 2.8) * 0.75;
      } else if (response == 4u) {
        tone = smoothstep(0.35, 0.55, tone);
      }

      let contourBias = array(1.05, 1.52, 0.46, 0.62, 0.42, 0.53, 0.77, 1.46, 1.05, 0.81, 1.19)[style];
      let edge = clamp(settings.controls.x * contourBias, 0.0, 1.0) * smoothstep(0.065, 0.44, contrast * settings.grading.y);
      let variation = noise(id.xy, 7u);
      let cutoff = settings.glyphs.z;
      tone = clamp((tone - cutoff) / max(0.0001, 1.0 - cutoff), 0.0, 1.0);
      if (settings.alpha.w > 0.0 && tone > 0.0 && tone < 1.0) {
        let order = array(0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0,
          3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0)[(id.y % 4u) * 4u + id.x % 4u];
        tone = clamp(tone + ((order + 0.5) / 16.0 - 0.5) * settings.alpha.w * 0.4, 0.0, 1.0);
      }

      var dots = settings.mixMarks.x;
      var blocks = settings.mixMarks.y;
      let blendBy = u32(settings.mixMarks.z);
      let band = toneBand(tone);
      let dense = smoothstep(settings.bands.x * 0.6, mix(settings.bands.y, 1.0, 0.4), tone);
      if (blendBy == 1u) {
        dots *= 1.0 - dense;
        blocks *= dense;
      } else if (blendBy == 2u) {
        dots *= dense;
        blocks *= 1.0 - dense;
      } else if (blendBy == 3u) {
        dots = settings.dotBands[band];
        blocks = settings.blockBands[band];
      }
      let choice = noise(id.xy, 19u) * (dots + blocks + (1.0 - dots) * (1.0 - blocks));
      let tonalStyle = select(style, 0u, style == 2u);
      var glyph = userGlyph(id.xy, tone, tonalStyle, variation, band);
      let explicitBlockMix = (u32(settings.composite.x) & 4u) != 0u;
      if (style == 9u && explicitBlockMix && characterData[0] == 0u && (glyph == WINDOW || glyph == BLOCK)) {
        glyph = AT;
      }
      var markKind = 0u;
      var automatic = characterData[0] == 0u && characterData[135u + band * 65u] == 0u;
      if (choice < dots) {
        glyph = DOT_MATRIX;
        markKind = 3u;
      } else if (choice < dots + blocks) {
        glyph = rampGlyph(2u, tone, variation);
        automatic = true;
        if (settings.edges.z >= 0.0 && glyph != 0u) {
          glyph = select(select(BOX, BARS, tone > 0.35), BLOCK, tone >= settings.edges.z);
        }
        markKind = 2u;
      }

      var continuity = variation;
      if (settings.bands.z > 1.0) {
        let direction = select(-tangent, tangent, tangent.x > 0.0 || (tangent.x == 0.0 && tangent.y > 0.0));
        let parallel = dot(vec2f(id.xy), direction);
        let perpendicular = dot(vec2f(id.xy), vec2f(-direction.y, direction.x));
        let region = vec2u(floor(vec2f(parallel / settings.bands.z, perpendicular / 2.0) + 65536.0));
        continuity = noise(region, 61u);
      }
      let breakLine = settings.bands.w >= 1.0 || continuity < settings.bands.w;
      let directional = edge > max(0.015, 0.16 + 0.40 * continuity + settings.mixMarks.w) && !breakLine;
      let terminalShadow = markKind == 2u && tone > 0.79;
      if (directional) {
        let contourStyle = select(tonalStyle, 2u, markKind == 2u);
        let edgeGlyph = contourGlyph(contourStyle, tangent, corner, variation, markKind != 3u && !terminalShadow);
        if (edgeGlyph != INHERIT) {
          glyph = edgeGlyph;
          markKind = 1u;
          automatic = false;
        }
      }

      if (settings.motion.x == 2.0 && markKind == 0u) {
        glyph = seededGlyph(id.xy, glyph, tonalStyle, band);
      }
      let index = id.y * columns + id.x;
      let markCode = glyph + 512u * markKind + select(0u, 2048u, automatic && (style != 1u || markKind == 2u));
      let dropEdge = select(edge, 0.0, breakLine);
      if (settings.extraction.x > 0.0) {
        rgb = routeInk(extractionRGB(sourceRGB(total / 16.0)), band, markKind);
      }
      var mark = vec4f(f32(markCode), tangent, dropEdge);
      if (glyph == DOT_MATRIX) {
        let grid = dotGridDimensions();
        if (dotDetail(grid) < 1.0) {
          let cell = Cell(vec4f(rgb, tone), mark);
          var inkArea = 0.0;
          let variation = noise(id.xy, 11u);
          for (var y = 0u; y < grid.y; y++) {
            for (var x = 0u; x < grid.x; x++) {
              let radius = dotRadius(vec2u(x, y), grid, cell, variation);
              inkArea += min(3.141593 * radius * radius * cellSize.x / cellSize.y, 1.0 / f32(grid.x * grid.y));
            }
          }
          let size = min(1.0, settings.glyphs.x);
          mark.x += inkArea * size * size * 0.5;
        }
      }
      analyzedCells[index] = Cell(vec4f(rgb, tone), mark);
    }

    @vertex
    fn vs_main(@builtin(vertex_index) vertex: u32) -> @builtin(position) vec4f {
      let vertices = array(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
      return vec4f(vertices[vertex], 0.0, 1.0);
    }

    fn inside(distance: f32, radius: f32, aa: f32) -> f32 {
      return 1.0 - smoothstep(max(0.0, radius - aa), radius + aa, distance);
    }

    fn stroke(p: vec2f, start: vec2f, end: vec2f, width: f32, aa: f32) -> f32 {
      let direction = end - start;
      let along = clamp(dot(p - start, direction) / dot(direction, direction), 0.0, 1.0);
      return inside(length(p - start - along * direction), width, aa);
    }

    fn boxSdf(p: vec2f, size: vec2f) -> f32 {
      let distance = abs(p - 0.5) - size;
      return length(max(distance, vec2f(0.0))) + min(max(distance.x, distance.y), 0.0);
    }

    fn boxMask(p: vec2f, size: vec2f, aa: f32) -> f32 {
      return 1.0 - smoothstep(-aa, aa, boxSdf(p, size));
    }

    fn bitmapPixel(bits: vec2u, coordinate: vec2i) -> f32 {
      if (any(coordinate < vec2i(0)) || any(coordinate >= vec2i(5, 7))) { return 0.0; }
      let row = u32(coordinate.y);
      let shift = (3u - row % 4u) * 5u + 4u - u32(coordinate.x);
      return f32((bits[row / 4u] >> shift) & 1u);
    }

    fn bitmapMask(p: vec2f, glyph: u32, aa: f32) -> f32 {
      let bits = BITMAPS[glyph - A];
      let local = ((p - 0.5) / vec2f(0.88, 0.82) + 0.5) * vec2f(5.0, 7.0) - 0.5;
      let origin = vec2i(floor(local));
      let feather = clamp(aa * 4.0, 0.075, 0.48);
      let weight = smoothstep(vec2f(0.5 - feather), vec2f(0.5 + feather), fract(local));
      let top = mix(bitmapPixel(bits, origin), bitmapPixel(bits, origin + vec2i(1, 0)), weight.x);
      let bottom = mix(bitmapPixel(bits, origin + vec2i(0, 1)), bitmapPixel(bits, origin + vec2i(1, 1)), weight.x);
      return mix(top, bottom, weight.y);
    }

    fn asciiPixel(bits: vec2u, coordinate: vec2i) -> f32 {
      if (any(coordinate < vec2i(0)) || any(coordinate >= vec2i(8))) { return 0.0; }
      let row = u32(coordinate.y);
      let shift = (row % 4u) * 8u + u32(coordinate.x);
      return f32((bits[row / 4u] >> shift) & 1u);
    }

    fn asciiMask(p: vec2f, glyph: u32, aa: f32) -> f32 {
      let bits = ASCII_BITMAPS[glyph - ASCII_START];
      let local = (p - 0.5) * 8.9 + 3.8;
      let origin = vec2i(floor(local));
      let feather = clamp(aa * 5.0, 0.075, 0.49);
      let weight = smoothstep(vec2f(0.5 - feather), vec2f(0.5 + feather), fract(local));
      let top = mix(asciiPixel(bits, origin), asciiPixel(bits, origin + vec2i(1, 0)), weight.x);
      let bottom = mix(asciiPixel(bits, origin + vec2i(0, 1)), asciiPixel(bits, origin + vec2i(1, 1)), weight.x);
      return mix(top, bottom, weight.y);
    }

    fn brailleMask(p: vec2f, glyph: u32, aa: f32) -> f32 {
      let grid = vec2f(2.0, 4.0);
      let address = min(vec2u(p * grid), vec2u(1u, 3u));
      let dotBit = array(0u, 3u, 1u, 4u, 2u, 5u, 6u, 7u)[address.y * 2u + address.x];
      let present = f32(((glyph - BRAILLE_START) >> dotBit) & 1u);
      let center = (vec2f(address) + 0.5) / grid;
      let offset = (p - center) * vec2f(1.0, settings.size.w / settings.size.z);
      return present * inside(length(offset), 0.105 * settings.glyphs.y, aa);
    }

    fn glyphMask(p: vec2f, glyph: u32, style: u32, aa: f32) -> f32 {
      let compact = style == 3u || style == 8u;
      let thickness = settings.glyphs.y;
      let weight = select(0.051, 0.036, compact) * thickness;
      let join = (u32(settings.glyphs.w) / 3u) % 3u;
      let connected = select(join == 1u, style == 1u || style == 7u, join == 0u);
      let reach = select(0.14, 0.0, connected);
      let reflected = select(p, vec2f(1.0 - p.x, p.y), glyph == RIGHT_PAREN || glyph == RIGHT_BRACKET);
      if (glyph >= BRAILLE_START) { return brailleMask(p, glyph, aa); }
      switch glyph {
        case 0u: { return 0.0; }
        case DOT: { return inside(length(p - vec2f(0.50, 0.73)), weight * 1.45, aa); }
        case COLON: {
          let y = min(abs(p.y - 0.35), abs(p.y - 0.67));
          return inside(length(vec2f(p.x - 0.5, y)), weight * 1.58, aa);
        }
        case COMMA: { return stroke(p, vec2f(0.55, 0.66), vec2f(0.39, 0.83), weight, aa); }
        case QUOTE: { return stroke(p, vec2f(0.53, 0.21), vec2f(0.48, 0.34), weight, aa); }
        case DASH: { return stroke(p, vec2f(reach, 0.50), vec2f(1.0 - reach, 0.50), weight, aa); }
        case UNDER: { return inside(abs(p.y - 0.71), weight, aa); }
        case BAR: { return stroke(p, vec2f(0.50, reach), vec2f(0.50, 1.0 - reach), weight, aa); }
        case SLASH: { return stroke(p, vec2f(reach, 1.0 - reach), vec2f(1.0 - reach, reach), weight, aa); }
        case BACKSLASH: { return stroke(p, vec2f(reach), vec2f(1.0 - reach), weight, aa); }
        case PLUS: {
          let horizontal = stroke(p, vec2f(0.16, 0.50), vec2f(0.84, 0.50), weight, aa);
          let vertical = stroke(p, vec2f(0.50, 0.20), vec2f(0.50, 0.80), weight, aa);
          return max(horizontal, vertical);
        }
        case EQUALS: {
          let row = select(0.34, 0.66, p.y > 0.5);
          let reach = select(0.16, 0.03, connected);
          return stroke(p, vec2f(reach, row), vec2f(1.0 - reach, row), weight, aa);
        }
        case STAR: {
          let across = stroke(p, vec2f(0.15, 0.50), vec2f(0.85, 0.50), weight, aa);
          let slash = stroke(p, vec2f(0.24, 0.73), vec2f(0.76, 0.27), weight, aa);
          let backslash = stroke(p, vec2f(0.24, 0.27), vec2f(0.76, 0.73), weight, aa);
          return max(across, max(slash, backslash));
        }
        case LEFT_PAREN, RIGHT_PAREN: {
          let y = clamp(reflected.y, 0.10, 0.90);
          let bow = 0.31 + 1.72 * (y - 0.5) * (y - 0.5);
          return inside(length(reflected - vec2f(bow, y)), weight, aa);
        }
        case LEFT_BRACKET, RIGHT_BRACKET: {
          let upright = stroke(reflected, vec2f(0.30, 0.10), vec2f(0.30, 0.90), weight, aa);
          let y = select(0.10, 0.90, reflected.y > 0.5);
          return max(upright, stroke(reflected, vec2f(0.30, y), vec2f(0.63, y), weight, aa));
        }
        case BOX: { return inside(abs(boxSdf(p, vec2f(0.44, 0.46))), 0.038 * thickness, aa); }
        case THICK_BOX: { return inside(abs(boxSdf(p, vec2f(0.42, 0.44))), 0.079 * thickness, aa); }
        case BARS: {
          let horizontal = min(abs(p.y - 0.29), abs(p.y - 0.68));
          let upright = inside(abs(p.x - 0.50), 0.045 * thickness, aa);
          return max(upright, inside(horizontal, 0.064 * thickness, aa));
        }
        case WINDOW: {
          let face = boxMask(p, vec2f(0.50), aa);
          let hole = boxMask(p + vec2f(0.0, -0.02), vec2f(0.17, 0.25), aa);
          return face * (1.0 - hole);
        }
        case BLOCK: { return 1.0; }
        case 38u, 39u, 40u: {
          let grid = min(vec2u(p * 4.0), vec2u(3u));
          let checker = (grid.x + grid.y) % 2u == 0u;
          let sparse = grid.x % 2u == 0u && grid.y % 2u == 0u;
          return select(0.0, 1.0, select(select(!sparse, checker, glyph == 39u), sparse, glyph == 38u));
        }
        case 41u, 42u: {
          return select(smoothstep(0.5 - aa, 0.5 + aa, p.y), 1.0 - smoothstep(0.5 - aa, 0.5 + aa, p.y), glyph == 41u);
        }
        case 44u, 45u: {
          return select(smoothstep(0.5 - aa, 0.5 + aa, p.x), 1.0 - smoothstep(0.5 - aa, 0.5 + aa, p.x), glyph == 44u);
        }
        case 46u: { return inside(length(p - 0.5), 0.16 * thickness, aa); }
        default: {
          var coverage = 0.0;
          if (glyph >= ASCII_START) {
            coverage = asciiMask(p, glyph, aa);
          } else {
            coverage = bitmapMask(p, glyph, aa);
          }
          return clamp(coverage + (thickness - 1.0) * coverage * (1.0 - coverage), 0.0, 1.0);
        }
      }
    }

    fn dotGridDimensions() -> vec2u {
      return array(vec2u(3u, 4u), vec2u(2u, 3u), vec2u(2u, 4u), vec2u(4u, 5u))[u32(settings.edges.w)];
    }

    fn dotDetail(grid: vec2u) -> f32 {
      let spacing = settings.size.zw * settings.glyphs.x / vec2f(grid);
      return smoothstep(1.25, 2.35, min(spacing.x, spacing.y));
    }

    fn dotRadius(subcell: vec2u, dimensions: vec2u, cell: Cell, variation: f32) -> f32 {
      let grid = vec2f(dimensions);
      let center = (vec2f(subcell) + 0.5) / grid;
      let position = subcell.y * dimensions.x + subcell.x;
      var order = (f32((position * 7u + 1u) % (dimensions.x * dimensions.y)) + 0.5) / (grid.x * grid.y);
      if (settings.edges.w == 0.0) {
        order = array(0.15, 0.67, 0.32, 0.83, 0.03, 0.50, 0.41, 0.58, 0.25, 0.75, 0.11, 0.92)[position];
      }
      let fromCenter = center - 0.5;
      let tangentDistance = abs(fromCenter.x * cell.mark.z - fromCenter.y * cell.mark.y);
      let edgeDots = cell.mark.w * (1.0 - smoothstep(0.06, 0.35, tangentDistance)) * settings.blockBands.w;
      let coverage = max(cell.color.a, edgeDots * 1.05);
      if (coverage < max(0.026, order + (variation - 0.5) * 0.07)) { return 0.0; }
      let radius = mix(0.045, 0.122, coverage) * settings.glyphs.y * settings.dotBands.w * 3.0 / grid.x;
      return radius;
    }

    fn dotMatrixMask(p: vec2f, cell: Cell, variation: f32, aa: f32) -> f32 {
      let dimensions = dotGridDimensions();
      let detail = dotDetail(dimensions);
      // A pixel covering the entire dot pitch needs area coverage to avoid regular rows dropping out.
      let average = fract(cell.mark.x) * 2.0;
      if (detail == 0.0) { return average; }
      if (any(p < vec2f(0.0)) || any(p > vec2f(1.0))) { return average * (1.0 - detail); }
      let grid = vec2f(dimensions);
      let subcell = min(vec2u(p * grid), dimensions - 1u);
      let center = (vec2f(subcell) + 0.5) / grid;
      let offset = (p - center) * vec2f(1.0, settings.size.w / settings.size.z);
      let radius = dotRadius(subcell, dimensions, cell, variation);
      let dot = select(inside(length(offset), radius, aa), 0.0, radius == 0.0);
      return mix(average, dot, detail);
    }

    fn markMask(p: vec2f, glyph: u32, style: u32, cell: Cell, id: vec2u, variation: f32, aa: f32, automatic: bool) -> f32 {
      let local = (p - 0.5) / settings.glyphs.x + 0.5;
      let softness = aa / settings.glyphs.x;
      if (glyph == DOT_MATRIX) { return dotMatrixMask(local, cell, variation, softness); }
      if (any(local < vec2f(0.0)) || any(local > vec2f(1.0))) { return 0.0; }
      if (automatic) {
        let stagger = vec2f(noise(id, 31u) - 0.5, noise(id, 47u) - 0.5);
        if (glyph == WINDOW) {
          // Give each cutout a wrapped phase so flat shading never shares a baseline.
          return 1.0 - boxMask(fract(local - stagger), vec2f(0.17, 0.25), softness);
        }
        if (glyph == BOX || glyph == THICK_BOX || glyph == BARS) {
          let mark = local - stagger * 0.30;
          let width = select(0.038, 0.079, glyph != BOX) * settings.glyphs.y;
          return inside(abs(boxSdf(mark, vec2f(0.32, 0.34))), width, softness);
        }
        if (glyph == DOT || glyph == COLON || glyph == COMMA || glyph == QUOTE || glyph == DASH || glyph == PLUS) {
          return glyphMask(local - stagger * 0.28, glyph, style, softness);
        }
      }
      return glyphMask(local, glyph, style, softness);
    }

    fn inputCoverage(image: vec4f) -> f32 {
      let sourceAlpha = clamp(image.a, 0.0, 1.0);
      let key = u32(settings.alpha.x);
      if (key == 0u || sourceAlpha == 0.0) { return sourceAlpha; }
      let luma = dot(image.rgb, LUMA) / max(sourceAlpha, 0.0001);
      let amount = select(1.0 - luma, luma, key == 1u);
      let threshold = settings.alpha.y;
      let softness = settings.alpha.z;
      return sourceAlpha * (1.0 - smoothstep(threshold - softness, threshold + softness, amount));
    }

    fn artCellId(gridPosition: vec2f) -> vec2u {
      return min(vec2u(gridPosition), vec2u(settings.grid.xy) - vec2u(1u));
    }

    fn artCell(id: vec2u) -> Cell {
      return cells[id.y * u32(settings.grid.x) + id.x];
    }

    fn auraTiles() -> vec2u {
      return (vec2u(settings.grid.xy) + 3u) / 4u;
    }

    @compute @workgroup_size(8, 8)
    fn findAuraEmitters(@builtin(global_invocation_id) id: vec3u) {
      let tiles = auraTiles();
      if (any(id.xy >= tiles)) { return; }
      var best = AuraEmitter(0u, 0.0);
      var bestScore = 0.0;
      let extent = settings.size.zw / settings.size.xy;
      let end = vec2u(settings.grid.xy);
      for (var y = 0u; y < 4u; y++) {
        for (var x = 0u; x < 4u; x++) {
          let origin = id.xy * 4u + vec2u(x, y);
          if (any(origin >= end)) { continue; }
          let cell = artCell(origin);
          let code = u32(cell.mark.x);
          if (code % 512u == 0u) { continue; }
          let uv = (vec2f(origin) + 0.5) * extent;
          if (any(uv >= vec2f(1.0))) { continue; }
          let sourcePixel = sourceAt(uv);
          let darkness = 1.0 - dot(gradeImage(sourceRGB(sourcePixel)), LUMA);
          let shadow = smoothstep(0.48, 0.84, darkness);
          let edge = max(cell.mark.w, select(0.0, 1.0, (code / 512u) % 4u == 1u));
          let weight = max(shadow, edge) * inputCoverage(sourcePixel);
          let score = weight * (0.72 + 0.28 * noise(origin, 169u) + edge * 0.65);
          if (score > bestScore) {
            bestScore = score;
            best = AuraEmitter(origin.y * end.x + origin.x, weight);
          }
        }
      }
      selectedEmitters[id.y * tiles.x + id.x] = best;
    }

    fn markInkColor(cell: Cell, id: vec2u) -> vec4f {
      let palette = u32(settings.grid.w);
      let kind = (u32(cell.mark.x) / 512u) % 4u;
      var ink = settings.ink;

      if (palette == 1u) {
        ink = vec4f(mix(ink.rgb, cell.color.rgb, settings.composite.y), ink.a);
      } else if (palette == 2u) {
        let amber = vec3f(0.98, 0.55, 0.16);
        let red = vec3f(0.77, 0.09, 0.14);
        let low = mix(red, amber, smoothstep(0.14, 0.60, cell.color.a));
        ink = vec4f(mix(low, ink.rgb, smoothstep(0.46, 0.91, cell.color.a)), ink.a);
      } else if (palette == 3u) {
        let variation = noise(id, 11u);
        let cluster = noise(id / vec2u(3u), 23u);
        if (variation > 0.76 && cluster < 0.62) {
          ink = mix(ink, settings.accentOne, settings.composite.y);
        } else if (variation < 0.13 && cluster > 0.58) {
          ink = mix(ink, settings.accentTwo, settings.composite.y);
        }
      } else if (palette == 4u) {
        let tone = cell.color.a;
        let light = mix(ink, settings.accentOne, min(1.0, tone * 2.0));
        let heavy = mix(settings.accentOne, settings.accentTwo, max(0.0, tone * 2.0 - 1.0));
        ink = select(light, heavy, tone > 0.5);
      } else if (palette == 5u) {
        ink = select(ink, settings.accentOne, kind == 1u);
        ink = select(ink, settings.accentTwo, kind >= 2u);
      } else if (palette >= 6u) {
        ink = vec4f(mix(ink.rgb, cell.color.rgb, settings.composite.y), ink.a);
      }
      return ink;
    }

    fn drawInk(pixel: vec2f, grain: f32, antialias: f32) -> vec4f {
      let gridPosition = pixel / settings.size.zw;
      let id = artCellId(gridPosition);
      let cell = artCell(id);
      let style = u32(settings.grid.z);
      let grit = settings.controls.z;
      let variation = noise(id, 11u);
      let markCode = u32(cell.mark.x);
      let glyph = markCode % 512u;
      let automatic = markCode >= 2048u;
      let p = gridPosition - vec2f(id);
      let pixelInCell = 1.0 / min(settings.size.z, settings.size.w);
      let aa = clamp(0.43 * pixelInCell * antialias, 0.008, 0.11);
      let ink = markInkColor(cell, id);
      let print = select(1.0, 1.7, style == 9u);
      let paperRGB = clamp(settings.paper.rgb + 0.11 * grain, vec3f(0.0), vec3f(1.0));
      let inkRGB = clamp(ink.rgb + 0.16 * grain, vec3f(0.0), vec3f(1.0));
      let offset = grit * print * 0.10 * vec2f(variation - 0.5, noise(id, 5u) - 0.5);
      let continuousFill = glyph == BLOCK || (automatic && glyph == WINDOW);
      let origin = select(p + offset, p, continuousFill);
      let mark = markMask(origin, glyph, style, cell, id, variation, aa, automatic);
      var fringe = 0.0;
      var fringeRGB = vec3f(0.0);
      let separation = settings.composite.z;
      if (separation > 0.0 && glyph != 0u && !continuousFill) {
        let shift = vec2f(separation * 0.30, 0.0);
        let blue = max(0.0, markMask(origin + shift, glyph, style, cell, id, variation, aa, automatic) - mark);
        let red = max(0.0, markMask(origin - shift, glyph, style, cell, id, variation, aa, automatic) - mark);
        fringe = max(blue, red) * 0.68;
        fringeRGB = mix(vec3f(0.04, 0.23, 0.71), vec3f(0.69, 0.11, 0.13), red / max(red + blue, 0.0001));
      }

      let readable = smoothstep(1.05, 2.9, min(settings.size.z, settings.size.w));
      let inkAlpha = mix(cell.color.a * 0.62, mark, readable) * ink.a;
      let fringeAlpha = fringe * ink.a * readable;
      let paper = vec4f(paperRGB * settings.paper.a, settings.paper.a);
      let registration = vec4f(fringeRGB * fringeAlpha, fringeAlpha) + paper * (1.0 - fringeAlpha);
      return vec4f(inkRGB * inkAlpha, inkAlpha) + registration * (1.0 - inkAlpha);
    }

    fn drawArt(pixel: vec2f) -> vec4f {
      let sourceAlpha = inputCoverage(sourceAt(pixel / settings.size.xy));
      if (sourceAlpha == 0.0) { return vec4f(0.0); }

      let print = select(1.0, 1.7, settings.grid.z == 9.0);
      let grain = (noise(vec2u(pixel), 3u) - 0.5) * settings.controls.z * print;
      let blend = 1.0 - smoothstep(7.0, 10.0, min(settings.size.z, settings.size.w));
      if (blend == 0.0) { return drawInk(pixel, grain, 1.0) * sourceAlpha; }
      if (settings.grid.w >= 6.0 && settings.glyphs.x >= 1.0) {
        let cell = artCell(artCellId(pixel / settings.size.zw));
        let glyph = u32(cell.mark.x) % 512u;
        // Keep solid swatches and paper on exact palette colors.
        if (glyph == BLOCK || glyph == 0u) { return drawInk(pixel, grain, 1.0) * sourceAlpha; }
      }

      // Average dense glyphs across the pixel footprint, including adjacent cells.
      var filtered = vec4f(0.0);
      for (var y = 0u; y < 4u; y++) {
        for (var x = 0u; x < 4u; x++) {
          let offset = (vec2f(f32(x), f32(y)) - 1.5) * 0.25;
          filtered += drawInk(pixel + offset, grain, 0.5);
        }
      }
      filtered *= 0.0625;
      if (blend < 1.0) { filtered = mix(drawInk(pixel, grain, 1.0), filtered, blend); }
      return filtered * sourceAlpha;
    }

    fn motionSourceUV(uv: vec2f) -> vec2f {
      let effect = settings.motion.x;
      if (effect < 3.0) { return uv; }
      let phase = TURN * fract(settings.motion.y);
      let strength = settings.motion.z;
      let angle = TURN * settings.motion.w / 360.0;
      let direction = vec2f(cos(angle), sin(angle));
      let across = vec2f(-direction.y, direction.x);
      let edge = smoothstep(vec2f(0.0), vec2f(0.13), min(uv, 1.0 - uv));
      let boundary = mix(1.0, edge.x, abs(direction.x)) * mix(1.0, edge.y, abs(direction.y));
      let column = dot(uv, direction);
      let row = dot(uv, across);
      let cellUV = settings.size.zw / settings.size.xy;
      if (effect == 3.0) {
        let shift = sin(row * 28.0 + 5.0 * sin(column * 8.0) - phase)
          + 0.25 * cos(column * 20.0 + row * 12.0 + 2.0 * phase);
        let offset = direction * cellUV * (boundary * shift * strength * 1.45);
        return clamp(uv + offset, vec2f(0.0), vec2f(1.0));
      }
      let anchor = dot(uv, abs(across));
      let slack = smoothstep(0.01, 0.9, anchor) * strength;
      let ripple = TURN * (1.25 * column + 1.65 * row) - phase;
      let shift = sin(ripple) + 0.28 * sin(row * 8.0 + phase * 2.0);
      let offset = direction * cellUV * (boundary * shift * slack * 2.6);
      return clamp(uv + offset, vec2f(0.0), vec2f(1.0));
    }

    fn drawAura(pixel: vec2f) -> vec4f {
      let cellSize = settings.size.zw;
      let grid = pixel / cellSize;
      let tile = vec2u(grid / 4.0);
      let strength = settings.motion.z;
      let unit = min(cellSize.x, cellSize.y);
      let aa = min(0.22, 0.5 / unit);
      let angle = TURN * settings.motion.w / 360.0;
      let flow = vec2f(cos(angle), sin(angle));
      let tangent = normalize(flow * cellSize);
      let tiles = auraTiles();
      let columns = u32(settings.grid.x);
      let shape = u32(settings.particles.x);
      var aura = vec4f(0.0);
      // The diagonal stream can carry particles in from the three upstream tiles.
      for (var i = 0u; i < 4u; i++) {
        let upstream = vec2i(tile) - vec2i(i32(i % 2u), i32(i / 2u)) * vec2i(sign(flow));
        if (any(upstream < vec2i(0)) || any(upstream >= vec2i(tiles))) { continue; }
        let id = vec2u(upstream);
        let emitter = emitters[id.y * tiles.x + id.x];
        if (emitter.weight == 0.0 || noise(id, 171u) > 0.52 + 0.48 * strength) { continue; }
        let cellId = vec2u(emitter.cellIndex % columns, emitter.cellIndex / columns);
        let origin = vec2f(cellId) + 0.5;
        let age = fract(fract(settings.motion.y) + noise(id, 173u));
        let travel = age * (1.5 + 1.9 * strength);
        let local = grid - origin - flow * travel;
        let p = local * cellSize / unit;
        let radius = 0.13 + strength * (0.09 + 0.1 * noise(id, 174u));
        let tail = min(travel, 0.4 + 1.1 * strength) * length(flow * cellSize) / unit;
        let tailDistance = length(p - tangent * clamp(dot(p, tangent), -tail, 0.0));
        var mask = inside(tailDistance, radius, aa);
        if (shape == 1u) {
          mask = inside(length(p), radius, aa);
        } else if (shape == 2u) {
          mask = inside(max(abs(p.x), abs(p.y)), radius, aa);
        } else if (shape == 3u) {
          mask = mask * 0.38;
          if (all(abs(local) < vec2f(0.6))) {
            let cell = artCell(cellId);
            let code = u32(cell.mark.x);
            let echo = markMask(local / 0.86 + 0.5, code % 512u, u32(settings.grid.z),
              cell, cellId, noise(cellId, 11u), aa, code >= 2048u);
            mask = max(mask, echo);
          }
        }
        if (mask <= 0.0) { continue; }
        let ink = markInkColor(artCell(cellId), cellId);
        let life = smoothstep(0.0, 0.1, age) * (1.0 - smoothstep(0.52, 1.0, age));
        let alpha = mask * life * sqrt(emitter.weight) * min(1.0, strength * 1.7) * ink.a;
        aura = vec4f(ink.rgb * alpha, alpha) + aura * (1.0 - alpha);
      }
      return aura;
    }

    fn drawCaption(pixel: vec2f) -> vec4f {
      let count = characterData[CAPTION_START];
      if (count == 0u) { return vec4f(0.0); }
      let canvas = settings.size.xy;
      let height = min(settings.caption.z * min(canvas.x, canvas.y), canvas.x / (0.64 * f32(count)));
      let size = vec2f(height * 0.64, height);
      let origin = settings.caption.xy * canvas - vec2f(settings.caption.w * f32(count) * size.x, height * 0.5);
      let local = (pixel - origin) / size;
      var backing = vec4f(0.0);
      if (settings.captionBacking.a > 0.0) {
        let padding = vec2f(0.60, 0.18);
        let margin = min(local + padding, vec2f(f32(count), 1.0) + padding - local) * size;
        let alpha = smoothstep(-0.5, 0.5, min(margin.x, margin.y)) * settings.captionBacking.a;
        backing = vec4f(settings.captionBacking.rgb * alpha, alpha);
      }
      if (any(local < vec2f(0.0)) || local.x >= f32(count) || local.y >= 1.0) { return backing; }
      let glyph = characterData[CAPTION_START + 1u + u32(local.x)];
      let coordinate = vec2f(fract(local.x), local.y);
      let opacity = glyphMask(coordinate, glyph, 0u, clamp(0.44 / size.x, 0.008, 0.13));
      var ink = settings.captionInk;
      let index = u32(settings.extraction.w);
      if (index > 0u && f32(index) <= settings.extraction.x) { ink = vec4f(swatches[index - 1u].ink.rgb, ink.a); }
      let alpha = opacity * ink.a;
      return vec4f(ink.rgb * alpha, alpha) + backing * (1.0 - alpha);
    }

    @fragment
    fn fs_main(@builtin(position) position: vec4f) -> @location(0) vec4f {
      var art = drawArt(position.xy);
      if (settings.motion.x == 1.0) {
        let aura = drawAura(position.xy);
        art = aura + art * (1.0 - aura.a);
      }
      let caption = drawCaption(position.xy);
      let result = caption + art * (1.0 - caption.a);
      if ((u32(settings.composite.x) & 2u) != 0u) {
        return vec4f(max(vec3f(0.0), result.aaa - result.rgb), result.a);
      }
      return result;
    }
  `;

  frame.state.module = device.createShaderModule({ code });
  frame.state.sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });
  frame.state.uniforms = device.createBuffer({
    size: 368,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  frame.state.charactersBuffer = device.createBuffer({
    size: 439 * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  frame.state.characterValues = new Uint32Array(439);
  frame.state.lockedColors = device.createBuffer({ size: 8 * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  frame.state.paletteResult = device.createBuffer({ size: 8 * 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
  frame.state.auraEmitters = device.createBuffer({ size: 8, usage: GPUBufferUsage.STORAGE });
  frame.state.extractPalette = device.createComputePipeline({
    layout: "auto",
    compute: { module: frame.state.module, entryPoint: "extractPalette" },
  });
  frame.state.analyze = device.createComputePipeline({
    layout: "auto",
    compute: { module: frame.state.module, entryPoint: "main" },
  });
}

export function render(device, frame) {
  const state = frame.state;
  const output = frame.output;
  const encoder = device.createCommandEncoder();
  const colorAttachments = [{
    view: output.createView(),
    clearValue: { r: 0, g: 0, b: 0, a: 0 },
    loadOp: "clear",
    storeOp: "store",
  }];

  if (frame.input == null) {
    encoder.beginRenderPass({ colorAttachments }).end();
    device.queue.submit([encoder.finish()]);
    return;
  }

  const props = frame.params;
  const { effect = 0, phase = 0, strength = 0, particle = 0, direction = 0,
    angle = effect === 1 ? 38 : ([0, 90, 45][direction] ?? 0) } = frame.motion ?? {};
  const style = Math.max(0, Math.min(10, Math.round(props.style)));
  const columns = Math.max(24, Math.min(240, Math.round(props.columns)));
  const cellWidth = output.width / columns;
  const aspect = [1.56, 1.62, 1.06, 1.72, 1.53, 1.58, 1.57, 1.43, 1.31, 1.26, 1.34][style] * props.cellAspect * 0.01;
  const maxCells = Math.floor(Math.min(device.limits.maxBufferSize, device.limits.maxStorageBufferBindingSize) / 32);
  const maxRows = Math.min(Math.floor(maxCells / columns), device.limits.maxComputeWorkgroupsPerDimension * 8);
  const cellHeight = Math.max(cellWidth * aspect, output.height / maxRows);
  const rows = Math.min(maxRows, Math.ceil(output.height / cellHeight));
  const cells = columns * rows;

  let paper = { r: 0.985, g: 0.968, b: 0.927, a: 1 };
  let ink = { r: 0.10, g: 0.085, b: 0.067, a: 1 };
  let accentOne = { r: 0.79, g: 0.47, b: 0.03, a: 1 };
  let accentTwo = { r: 0.06, g: 0.47, b: 0.62, a: 1 };
  let palette = 0;
  if (style === 2 || style === 7 || style === 8 || style === 10) {
    paper = { r: 0.995, g: 0.995, b: 0.99, a: 1 };
  }
  if (style === 4 || style === 6) {
    paper = { r: 0.012, g: 0.013, b: 0.017, a: 1 };
    ink = { r: 0.962, g: 0.964, b: 0.948, a: 1 };
  }
  if (style === 5) palette = 1;
  if (style === 4) palette = 2;
  if (style === 9) palette = 3;

  if (palette === 2 || props.palette === 3) {
    ink = { r: 1, g: 0.929, b: 0.754, a: 1 };
    paper = { r: 0.018, g: 0.012, b: 0.014, a: 1 };
  } else if (palette === 3) {
    ink = { r: 0.122, g: 0.106, b: 0.086, a: 1 };
    paper = { r: 0.97, g: 0.919, b: 0.799, a: 1 };
  }
  if (props.palette !== 0) {
    palette = props.palette - 1;
    if (palette !== 2) {
      ink = props.ink;
      paper = props.paper;
      accentOne = props.accentOne;
      accentTwo = props.accentTwo;
    }
  }
  const autoBrightInk = ink.r * 0.2126 + ink.g * 0.7152 + ink.b * 0.0722
    > paper.r * 0.2126 + paper.g * 0.7152 + paper.b * 0.0722;
  const brightInk = props.polarity === 2 || (props.polarity === 0 && autoBrightInk);

  const glyphText = props.glyphs.slice(0, 128);
  const edgeText = props.edgeGlyphs.slice(0, 12);
  const banks = [props.lightGlyphs, props.middleGlyphs, props.heavyGlyphs].map((bank) => bank.slice(0, 64));
  const caption = props.labelText.slice(0, 96);
  const routing = props.inkRules.slice(0, 48);
  const characterSignature = JSON.stringify([glyphText, edgeText, banks, caption, routing, props.glyphOrder, style === 0]);
  if (state.characterSignature !== characterSignature) {
    const coverage = (code) => state.inkCoverage[code] ?? state.countBits(code - 176) * 0.055;
    const writeBank = (value, start, sort) => {
      const encode = sort && style === 0 ? state.encodeTypeGlyph : state.encodeGlyph;
      const glyphs = Array.from(value, encode).filter((code) => code != null);
      if (sort && props.glyphOrder === 1) glyphs.sort((left, right) => coverage(left) - coverage(right) || left - right);
      state.characterValues[start] = glyphs.length;
      state.characterValues.set(glyphs, start + 1);
    };
    state.characterValues.fill(0xffffffff);
    writeBank(glyphText, 0, true);
    banks.forEach((bank, index) => writeBank(bank, 135 + 65 * index, true));
    writeBank(caption, 330, false);
    const edges = Array.from(edgeText, state.encodeGlyph);
    for (let slot = 0; slot < 6; slot += 1) {
      if (edges[slot] != null) state.characterValues[129 + slot] = edges[slot];
    }
    const rules = routing.split(",");
    for (let index = 0; index < 12; index += 1) {
      state.characterValues[427 + index] = /^[1-8]$/.test(rules[index] ?? "") ? Number(rules[index]) : 0;
    }
    state.characterSignature = characterSignature;
    device.queue.writeBuffer(state.charactersBuffer, 0, state.characterValues);
  }
  const useStarterCharacters = [0, 135, 200, 265].every((start) => state.characterValues[start] === 0);
  const dots = props.dots < 0 ? Number(style === 10 && useStarterCharacters) : props.dots * 0.01;
  const blocks = props.blocks < 0 ? Number(style === 2 && useStarterCharacters) : props.blocks * 0.01;
  const registration = props.registration < 0 ? Number(style === 3) * props.texture * 0.0077 : props.registration * 0.01;
  const renderFlags = Number(props.invertImage) + 2 * Number(props.invertColors)
    + 4 * Number(props.blocks >= 0 || props.mixByTone === 3);
  const swatchCount = palette === 6 ? Math.max(2, Math.min(8, Math.round(props.swatchCount))) : palette === 7 ? 3 : 0;
  const lightBoundary = Math.min(props.bandLight, props.bandHeavy - 1) * 0.01;
  const heavyBoundary = props.bandHeavy * 0.01;
  if (swatchCount && state.swatchText !== props.swatches) {
    const locks = new Float32Array(8 * 4);
    props.swatches.slice(0, 1024).split(/[\n;]/).slice(0, 8).forEach((line, index) => {
      const hex = line.match(/(?:^|=)\s*#([0-9a-f]{6})\s*$/i)?.[1];
      if (!hex) return;
      const channels = hex.match(/../g).map((channel) => Number.parseInt(channel, 16) / 255);
      locks.set([...channels, 1], index * 4);
    });
    state.swatchText = props.swatches;
    device.queue.writeBuffer(state.lockedColors, 0, locks);
  }

  if (state.cellCapacity == null || state.cellCapacity < cells) {
    state.cells?.destroy();
    state.cells = device.createBuffer({ size: cells * 32, usage: GPUBufferUsage.STORAGE });
    state.cellCapacity = cells;
  }
  if (state.outputFormat !== output.format) {
    state.pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module: state.module, entryPoint: "vs_main" },
      fragment: {
        module: state.module,
        entryPoint: "fs_main",
        targets: [{ format: output.format }],
      },
    });
    state.outputFormat = output.format;
  }
  device.queue.writeBuffer(state.uniforms, 0, new Float32Array([
    output.width, output.height, cellWidth, cellHeight,
    columns, rows, style, palette,
    props.contour * 0.01, props.density * 0.01, props.texture * 0.01, Number(brightInk),
    ink.r, ink.g, ink.b, ink.a ?? 1,
    paper.r, paper.g, paper.b, props.transparentPaper ? 0 : paper.a ?? 1,
    accentOne.r, accentOne.g, accentOne.b, accentOne.a ?? 1,
    accentTwo.r, accentTwo.g, accentTwo.b, accentTwo.a ?? 1,
    props.brightness * 0.0065, Math.pow(2.7, props.contrast * 0.01), Math.pow(2, props.midtones * -0.01), props.levels,
    props.glyphSize * 0.01, props.glyphWeight * 0.01, props.toneCutoff * 0.01,
    props.glyphOrder + 3 * props.joinStrokes + 9 * props.response,
    dots, blocks, props.mixByTone, (props.edgeThreshold - 50) * 0.006,
    props.detail, props.detailAmount * 0.01, props.warp, props.warpAmount * 0.01,
    renderFlags, props.colorMix * 0.01, registration, props.seed,
    props.sourceKey, props.keyThreshold * 0.01, Math.max(0.001, props.keySoftness * 0.01), props.dither * 0.01,
    lightBoundary, heavyBoundary, props.runLength, props.lineBreaks * 0.01,
    props.outlinePriority * 0.01, props.interiorDetail * 0.01, props.blockThreshold * 0.01, props.dotGrid,
    props.lightDots * 0.01, props.middleDots * 0.01, props.heavyDots * 0.01, props.dotSize * 0.01,
    props.lightBlocks * 0.01, props.middleBlocks * 0.01, props.heavyBlocks * 0.01, props.dotAlignment * 0.01,
    swatchCount, Number(props.gradedPalette), Number(props.excludeKeyed), props.labelSwatch,
    props.labelX * 0.01, props.labelY * 0.01, props.labelSize * 0.01, props.labelAlign * 0.5,
    props.labelColor.r, props.labelColor.g, props.labelColor.b, props.labelColor.a ?? 1,
    props.labelBacking.r, props.labelBacking.g, props.labelBacking.b, props.labelBacking.a ?? 0,
    effect, phase, strength, angle,
    particle, 0, 0, 0,
  ]));
  const shared = [
    { binding: 0, resource: { buffer: state.uniforms } },
    { binding: 1, resource: frame.input.createView() },
    { binding: 2, resource: state.sampler },
  ];
  if (swatchCount) {
    const extraction = encoder.beginComputePass();
    extraction.setPipeline(state.extractPalette);
    extraction.setBindGroup(0, device.createBindGroup({
      layout: state.extractPalette.getBindGroupLayout(0),
      entries: [
        ...shared,
        { binding: 6, resource: { buffer: state.lockedColors } },
        { binding: 7, resource: { buffer: state.paletteResult } },
      ],
    }));
    extraction.dispatchWorkgroups(1);
    extraction.end();
  }
  const extracted = { binding: 8, resource: { buffer: state.paletteResult } };
  const characterBuffer = { binding: 5, resource: { buffer: state.charactersBuffer } };
  const compute = encoder.beginComputePass();
  compute.setPipeline(state.analyze);
  compute.setBindGroup(0, device.createBindGroup({
    layout: state.analyze.getBindGroupLayout(0),
    entries: [
      ...shared,
      { binding: 3, resource: { buffer: state.cells } },
      characterBuffer, extracted,
    ],
  }));
  compute.dispatchWorkgroups(Math.ceil(columns / 8), Math.ceil(rows / 8));
  compute.end();

  if (effect === 1) {
    const tileColumns = Math.ceil(columns / 4);
    const tileRows = Math.ceil(rows / 4);
    const size = tileColumns * tileRows * 8;
    if (state.auraEmitters.size < size) {
      state.auraEmitters.destroy();
      state.auraEmitters = device.createBuffer({ size, usage: GPUBufferUsage.STORAGE });
    }
    state.auraPipeline ??= device.createComputePipeline({
      layout: "auto",
      compute: { module: state.module, entryPoint: "findAuraEmitters" },
    });
    const selectEmitters = encoder.beginComputePass();
    selectEmitters.setPipeline(state.auraPipeline);
    selectEmitters.setBindGroup(0, device.createBindGroup({
      layout: state.auraPipeline.getBindGroupLayout(0),
      entries: [...shared, { binding: 4, resource: { buffer: state.cells } },
        { binding: 9, resource: { buffer: state.auraEmitters } }],
    }));
    selectEmitters.dispatchWorkgroups(Math.ceil(tileColumns / 8), Math.ceil(tileRows / 8));
    selectEmitters.end();
  }

  const pass = encoder.beginRenderPass({ colorAttachments });
  pass.setPipeline(state.pipeline);
  pass.setBindGroup(0, device.createBindGroup({
    layout: state.pipeline.getBindGroupLayout(0),
    entries: [...shared, { binding: 4, resource: { buffer: state.cells } }, characterBuffer, extracted,
      { binding: 10, resource: { buffer: state.auraEmitters } }],
  }));
  pass.draw(3);
  pass.end();
  device.queue.submit([encoder.finish()]);
  return columns;
}

defineProperties(Effect, {
  style: {
    type: "number",
    label: "Starting look",
    control: "select",
    defaultValue: 0,
    options: [
      { value: 0, label: "Mixed ASCII" },
      { value: 1, label: "Plotter Hatch" },
      { value: 2, label: "Block Terminal" },
      { value: 3, label: "Microtype" },
      { value: 4, label: "Color Terminal" },
      { value: 5, label: "Typewriter Color" },
      { value: 6, label: "Reverse ASCII" },
      { value: 7, label: "Manga Line" },
      { value: 8, label: "Fine Wire" },
      { value: 9, label: "Print Collage" },
      { value: 10, label: "Dot Matrix" },
    ],
  },
  invertImage: { type: "boolean", label: "Invert image", defaultValue: false },
  invertColors: { type: "boolean", label: "Invert colors", defaultValue: false },
  transparentPaper: { type: "boolean", label: "Transparent paper", defaultValue: false },
  glyphs: { type: "string", label: "Tone characters", defaultValue: "" },
  glyphOrder: {
    type: "number", label: "Character assignment", control: "select", defaultValue: 0,
    options: [
      { value: 0, label: "As typed (light to heavy)" },
      { value: 1, label: "Sort by ink coverage" },
      { value: 2, label: "Repeat as text" },
    ],
  },
  edgeGlyphs: { type: "string", label: "Edge characters (H V / \\ L R)", defaultValue: "" },
  toneCutoff: { type: "number", label: "Blank tone cutoff", control: "slider", min: 0, max: 100, step: 1, defaultValue: 0 },
  response: {
    type: "number", label: "Tone response", control: "select", defaultValue: 0,
    options: [
      { value: 0, label: "From starting look" },
      { value: 1, label: "Balanced" },
      { value: 2, label: "Bold shading" },
      { value: 3, label: "Sparse shading" },
      { value: 4, label: "Silhouette" },
    ],
  },
  columns: { type: "number", label: "Columns", control: "slider", min: 24, max: 240, step: 1, defaultValue: 76 },
  cellAspect: { type: "number", label: "Cell height", control: "slider", min: 55, max: 190, step: 1, defaultValue: 100 },
  glyphSize: { type: "number", label: "Glyph size", control: "slider", min: 40, max: 125, step: 1, defaultValue: 100 },
  glyphWeight: { type: "number", label: "Glyph weight", control: "slider", min: 35, max: 170, step: 1, defaultValue: 100 },
  contour: { type: "number", label: "Contour emphasis", control: "slider", min: 0, max: 100, step: 1, defaultValue: 60 },
  edgeThreshold: { type: "number", label: "Edge threshold", control: "slider", min: 0, max: 100, step: 1, defaultValue: 50 },
  joinStrokes: {
    type: "number", label: "Stroke joins", control: "select", defaultValue: 0,
    options: [
      { value: 0, label: "From starting look" },
      { value: 1, label: "Connected" },
      { value: 2, label: "Separated" },
    ],
  },
  density: { type: "number", label: "Ink density", control: "slider", min: 0, max: 100, step: 1, defaultValue: 53 },
  dots: { type: "number", label: "Dot mix", control: "slider", min: -1, max: 100, step: 1, defaultValue: -1 },
  blocks: { type: "number", label: "Block mix", control: "slider", min: -1, max: 100, step: 1, defaultValue: -1 },
  mixByTone: {
    type: "number", label: "Mix by tone", control: "select", defaultValue: 0,
    options: [
      { value: 0, label: "Across all tones" },
      { value: 1, label: "Dots in light tones, blocks in heavy tones" },
      { value: 2, label: "Blocks in light tones, dots in heavy tones" },
      { value: 3, label: "Custom mix by tone" },
    ],
  },
  brightness: { type: "number", label: "Brightness", control: "slider", min: -100, max: 100, step: 1, defaultValue: 0 },
  contrast: { type: "number", label: "Contrast", control: "slider", min: -100, max: 100, step: 1, defaultValue: 0 },
  midtones: { type: "number", label: "Midtones", control: "slider", min: -100, max: 100, step: 1, defaultValue: 0 },
  levels: { type: "number", label: "Posterize levels", control: "slider", min: 0, max: 16, step: 1, defaultValue: 0 },
  detail: {
    type: "number", label: "Image treatment", control: "select", defaultValue: 0,
    options: [
      { value: 0, label: "None" },
      { value: 1, label: "Smooth detail" },
      { value: 2, label: "Sharpen detail" },
      { value: 3, label: "Engraved relief" },
      { value: 4, label: "Isolate edges" },
    ],
  },
  detailAmount: { type: "number", label: "Treatment strength", control: "slider", min: 0, max: 100, step: 1, defaultValue: 72 },
  warp: {
    type: "number", label: "Source distortion", control: "select", defaultValue: 0,
    options: [
      { value: 0, label: "None" },
      { value: 1, label: "Shift rows" },
      { value: 2, label: "Wave" },
    ],
  },
  warpAmount: { type: "number", label: "Distortion strength", control: "slider", min: 0, max: 100, step: 1, defaultValue: 40 },
  polarity: {
    type: "number", label: "Tone polarity", control: "select", defaultValue: 0,
    options: [
      { value: 0, label: "Match ink and paper" },
      { value: 1, label: "More marks in darker areas" },
      { value: 2, label: "More marks in lighter areas" },
    ],
  },
  palette: {
    type: "number",
    label: "Palette",
    control: "select",
    defaultValue: 0,
    options: [
      { value: 0, label: "Style default" },
      { value: 1, label: "Custom ink and paper" },
      { value: 2, label: "Sample image colors" },
      { value: 3, label: "Warm terminal" },
      { value: 4, label: "Spot print" },
      { value: 5, label: "Three inks by tone" },
      { value: 6, label: "Three inks by mark" },
      { value: 7, label: "Extract source palette" },
      { value: 8, label: "Extract dark, middle and light inks" },
    ],
  },
  ink: { type: "color", label: "Ink", defaultValue: { r: 0.10, g: 0.085, b: 0.067, a: 1 } },
  accentOne: { type: "color", label: "Accent ink 1", defaultValue: { r: 0.79, g: 0.47, b: 0.03, a: 1 } },
  accentTwo: { type: "color", label: "Accent ink 2", defaultValue: { r: 0.06, g: 0.47, b: 0.62, a: 1 } },
  paper: { type: "color", label: "Paper", defaultValue: { r: 0.985, g: 0.968, b: 0.927, a: 1 } },
  colorMix: { type: "number", label: "Source and spot color strength", control: "slider", min: 0, max: 100, step: 1, defaultValue: 70 },
  sourceKey: {
    type: "number", label: "Remove source background", control: "select", defaultValue: 0,
    options: [
      { value: 0, label: "Off" },
      { value: 1, label: "Bright areas" },
      { value: 2, label: "Dark areas" },
    ],
  },
  keyThreshold: { type: "number", label: "Background cutoff", control: "slider", min: 0, max: 100, step: 1, defaultValue: 86 },
  keySoftness: { type: "number", label: "Background edge softness", control: "slider", min: 0, max: 30, step: 1, defaultValue: 7 },
  texture: { type: "number", label: "Print texture", control: "slider", min: 0, max: 100, step: 1, defaultValue: 25 },
  registration: { type: "number", label: "Color fringe", control: "slider", min: -1, max: 100, step: 1, defaultValue: -1 },
  dither: { type: "number", label: "Ordered dither", control: "slider", min: 0, max: 100, step: 1, defaultValue: 0 },
  seed: { type: "number", label: "Variation seed", control: "slider", min: 0, max: 999, step: 1, defaultValue: 0 },
  lightGlyphs: { type: "string", label: "Light tone characters", defaultValue: "" },
  middleGlyphs: { type: "string", label: "Midtone characters", defaultValue: "" },
  heavyGlyphs: { type: "string", label: "Heavy tone characters", defaultValue: "" },
  bandLight: { type: "number", label: "Light to midtone boundary", control: "slider", min: 5, max: 90, step: 1, defaultValue: 33 },
  bandHeavy: { type: "number", label: "Midtone to heavy boundary", control: "slider", min: 10, max: 95, step: 1, defaultValue: 67 },
  runLength: { type: "number", label: "Contour run length", control: "slider", min: 1, max: 12, step: 1, defaultValue: 1 },
  lineBreaks: { type: "number", label: "Contour breaks", control: "slider", min: 0, max: 100, step: 1, defaultValue: 0 },
  outlinePriority: { type: "number", label: "Silhouette priority", control: "slider", min: 0, max: 100, step: 1, defaultValue: 0 },
  interiorDetail: { type: "number", label: "Interior detail", control: "slider", min: 0, max: 100, step: 1, defaultValue: 100 },
  blockThreshold: { type: "number", label: "Solid block threshold", control: "slider", min: -1, max: 100, step: 1, defaultValue: -1 },
  dotSize: { type: "number", label: "Dot size", control: "slider", min: 30, max: 175, step: 1, defaultValue: 100 },
  dotAlignment: { type: "number", label: "Dot edge alignment", control: "slider", min: 0, max: 100, step: 1, defaultValue: 100 },
  lightDots: { type: "number", label: "Light dots", control: "slider", min: 0, max: 100, step: 1, defaultValue: 60 },
  middleDots: { type: "number", label: "Midtone dots", control: "slider", min: 0, max: 100, step: 1, defaultValue: 28 },
  heavyDots: { type: "number", label: "Heavy dots", control: "slider", min: 0, max: 100, step: 1, defaultValue: 8 },
  lightBlocks: { type: "number", label: "Light blocks", control: "slider", min: 0, max: 100, step: 1, defaultValue: 0 },
  middleBlocks: { type: "number", label: "Midtone blocks", control: "slider", min: 0, max: 100, step: 1, defaultValue: 20 },
  heavyBlocks: { type: "number", label: "Heavy blocks", control: "slider", min: 0, max: 100, step: 1, defaultValue: 75 },
  swatchCount: { type: "number", label: "Extracted swatches", control: "slider", min: 2, max: 8, step: 1, defaultValue: 5 },
  labelX: { type: "number", label: "Label horizontal position", control: "slider", min: 0, max: 100, step: 1, defaultValue: 50 },
  labelY: { type: "number", label: "Label vertical position", control: "slider", min: 0, max: 100, step: 1, defaultValue: 90 },
  labelSize: { type: "number", label: "Label size", control: "slider", min: 1, max: 20, step: 1, defaultValue: 5 },
  labelSwatch: { type: "number", label: "Label swatch (0 uses custom ink)", control: "slider", min: 0, max: 8, step: 1, defaultValue: 0 },
  dotGrid: {
    type: "number", label: "Dots per cell", control: "select", defaultValue: 0,
    options: [{ value: 0, label: "3 × 4" }, { value: 1, label: "2 × 3" }, { value: 2, label: "2 × 4" }, { value: 3, label: "4 × 5" }],
  },
  gradedPalette: { type: "boolean", label: "Extract adjusted source colors", defaultValue: false },
  excludeKeyed: { type: "boolean", label: "Exclude keyed source colors", defaultValue: true },
  swatches: { type: "string", label: "Swatch names and locks (one Name=#RRGGBB per line)", defaultValue: "" },
  inkRules: { type: "string", label: "Swatch rules (light/mid/heavy for type, contour, block, dot)", defaultValue: "" },
  labelText: { type: "string", label: "Artwork label", defaultValue: "" },
  labelAlign: {
    type: "number", label: "Label alignment", control: "select", defaultValue: 1,
    options: [{ value: 0, label: "Left" }, { value: 1, label: "Center" }, { value: 2, label: "Right" }],
  },
  labelColor: { type: "color", label: "Label ink", defaultValue: { r: 0.1, g: 0.085, b: 0.067, a: 1 } },
  labelBacking: { type: "color", label: "Label backing", defaultValue: { r: 0.1, g: 0.085, b: 0.067, a: 0 } },
});
