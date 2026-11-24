#version 300 es
precision highp float;
precision highp int;

// The full renderer is compiled once per pass by ascii-webgl.js.
// Compile without ASCIIX_PASS for the original one-pass uniforms.
#ifdef ASCIIX_PASS

struct Settings {
  vec4 size; // Output width and height, cell width and height
  vec4 grid; // Columns, rows, style, palette
  vec4 controls; // Contour, density, texture, bright ink polarity
  vec4 ink;
  vec4 paper;
  vec4 accentOne;
  vec4 accentTwo;
  vec4 grading; // Brightness, contrast, gamma, posterize levels
  vec4 glyphs; // Size, weight, minimum tone, assignment/join/response choices
  vec4 mixMarks; // Dots, blocks, tone bands, contour threshold offset
  vec4 alterations; // Detail method and amount, warp method and amount
  vec4 composite; // Render flags, color mix, registration, seed
  vec4 alpha; // Source key method, threshold, softness, dither
  vec4 bands; // Tone boundaries, contour run length, breaks
  vec4 edges; // Silhouette priority, interior detail, block threshold, dot grid
  vec4 dotBands; // Per-band mix and dot size
  vec4 blockBands; // Per-band mix and dot alignment
  vec4 extraction; // Active swatch count, graded colors, exclude keyed pixels, label swatch
  vec4 caption; // Position, size, alignment
  vec4 captionInk;
  vec4 captionBacking;
  vec4 motion; // Effect, loop phase, strength, angle in degrees
  vec4 particles; // Aura particle shape, second wave angle, second wave enabled
};

struct Cell {
  vec4 color; // Average source RGB and tone
  vec4 mark;  // Packed glyph, direction XY and edge weight
};

struct AuraEmitter {
  uint cellIndex;
  float weight;
};

struct Swatch {
  vec4 sourceColor;
  vec4 ink;
};

layout(std140) uniform AsciixSettings { Settings settings; };
uniform highp sampler2D uImage;
uniform highp usampler2D uCharacters;
uniform highp usampler2D uSwatchSources;
uniform highp usampler2D uSwatchInks;
uniform highp usampler2D uCellColors;
uniform highp usampler2D uCellMarks;
uniform highp usampler2D uAuraEmitters;
uniform vec4 uLockedColors[8];

vec2 motionSourceUV(vec2 uv);
float inputCoverage(vec4 image);
uvec2 dotGridDimensions();
float dotDetail(uvec2 grid);
float dotRadius(uvec2 subcell, uvec2 dimensions, Cell cell, float variation);

uint characterAt(uint index) {
  return texelFetch(uCharacters, ivec2(int(index), 0), 0).r;
}

Swatch swatchAt(uint index) {
  ivec2 slot = ivec2(int(index), 0);
  return Swatch(uintBitsToFloat(texelFetch(uSwatchSources, slot, 0)),
    uintBitsToFloat(texelFetch(uSwatchInks, slot, 0)));
}

uint popcount(uint bits) {
  bits -= (bits >> 1u) & 0x55555555u;
  bits = (bits & 0x33333333u) + ((bits >> 2u) & 0x33333333u);
  bits = (bits + (bits >> 4u)) & 0x0f0f0f0fu;
  return (bits * 0x01010101u) >> 24u;
}

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
const uint DOT = 1u;
const uint COLON = 2u;
const uint COMMA = 3u;
const uint QUOTE = 4u;
const uint DASH = 5u;
const uint UNDER = 6u;
const uint BAR = 7u;
const uint SLASH = 8u;
const uint BACKSLASH = 9u;
const uint PLUS = 10u;
const uint EQUALS = 11u;
const uint STAR = 12u;
const uint LEFT_PAREN = 13u;
const uint RIGHT_PAREN = 14u;
const uint LEFT_BRACKET = 15u;
const uint RIGHT_BRACKET = 16u;
const uint BOX = 17u;
const uint THICK_BOX = 18u;
const uint BARS = 19u;
const uint WINDOW = 20u;
const uint BLOCK = 21u;
const uint A = 22u;
const uint B = 23u;
const uint M = 24u;
const uint HASH = 36u;
const uint AT = 30u;
const uint DOT_MATRIX = 43u;
const uint ASCII_START = 64u;
const uint BRAILLE_START = 176u;
const uint EDGE_START = 129u;
const uint INHERIT = 0xffffffffu;
const uint CAPTION_START = 330u;
const uint RULE_START = 427u;
const uvec2 BITMAPS[16] = uvec2[16](
  uvec2(476735u, 575008u), uvec2(1001022u, 575424u), uvec2(585717u, 575008u), uvec2(583477u, 642592u),
  uvec2(575157u, 716320u), uvec2(476718u, 574912u), uvec2(1001022u, 541184u), uvec2(476789u, 837056u),
  uvec2(476917u, 770528u), uvec2(574788u, 345632u), uvec2(575025u, 338048u), uvec2(508439u, 574944u),
  uvec2(508430u, 34752u), uvec2(575039u, 575008u), uvec2(338922u, 1026368u), uvec2(412296u, 706976u)
);
// Public-domain VGA bitmaps from Daniel Hepper's font8x8, packed into pairs of words.
const uvec2 ASCII_BITMAPS[95] = uvec2[95](
  uvec2(0u, 0u), uvec2(406600728u, 1572888u), uvec2(13878u, 0u), uvec2(914306614u, 3552895u),
  uvec2(503528972u, 794416u), uvec2(406020864u, 6514188u), uvec2(1847342620u, 7222075u), uvec2(198150u, 0u),
  uvec2(101059608u, 1575942u), uvec2(404229126u, 396312u), uvec2(4282148352u, 26172u), uvec2(1057754112u, 3084u),
  uvec2(0u, 101452800u), uvec2(1056964608u, 0u), uvec2(0u, 789504u), uvec2(202911840u, 66310u),
  uvec2(2071159614u, 4089711u), uvec2(202116620u, 4131852u), uvec2(472920862u, 4141830u), uvec2(472920862u, 1979184u),
  uvec2(859192376u, 7876735u), uvec2(807338815u, 1979184u), uvec2(520291868u, 1979187u), uvec2(405812031u, 789516u),
  uvec2(506671902u, 1979187u), uvec2(1043542814u, 923696u), uvec2(789504u, 789504u), uvec2(789504u, 101452800u),
  uvec2(50727960u, 1575942u), uvec2(4128768u, 16128u), uvec2(806882310u, 396312u), uvec2(405811998u, 786444u),
  uvec2(2071683902u, 1966971u), uvec2(858988044u, 3355455u), uvec2(1046898239u, 4154982u), uvec2(50554428u, 3958275u),
  uvec2(1717974559u, 2045542u), uvec2(504776319u, 8341014u), uvec2(504776319u, 984598u), uvec2(50554428u, 8152691u),
  uvec2(1060320051u, 3355443u), uvec2(202116126u, 1969164u), uvec2(808464504u, 1979187u), uvec2(506881639u, 6776374u),
  uvec2(101058063u, 8349254u), uvec2(2139060067u, 6513515u), uvec2(2070898531u, 6513523u), uvec2(1667446300u, 1848931u),
  uvec2(1046898239u, 984582u), uvec2(858993438u, 3677755u), uvec2(1046898239u, 6776374u), uvec2(235352862u, 1979192u),
  uvec2(202124607u, 1969164u), uvec2(858993459u, 4141875u), uvec2(858993459u, 794163u), uvec2(1801675619u, 6518655u),
  uvec2(473326435u, 6501916u), uvec2(506671923u, 1969164u), uvec2(405889919u, 8349260u), uvec2(101058078u, 1967622u),
  uvec2(403441155u, 4218928u), uvec2(404232222u, 1972248u), uvec2(1664490504u, 0u), uvec2(0u, 4278190080u),
  uvec2(1575948u, 0u), uvec2(807272448u, 7222078u), uvec2(1040582151u, 3892838u), uvec2(857604096u, 1979139u),
  uvec2(1043345464u, 7222067u), uvec2(857604096u, 1966911u), uvec2(252065308u, 984582u), uvec2(862846976u, 523255347u),
  uvec2(1849034247u, 6776422u), uvec2(202244108u, 1969164u), uvec2(808452144u, 506671920u), uvec2(912655879u, 6764062u),
  uvec2(202116110u, 1969164u), uvec2(2134048768u, 6515583u), uvec2(857669632u, 3355443u), uvec2(857604096u, 1979187u),
  uvec2(1715142656u, 252067430u), uvec2(862846976u, 2016427571u), uvec2(1849360384u, 984678u), uvec2(54394880u, 2043934u),
  uvec2(205392904u, 1584140u), uvec2(858980352u, 7222067u), uvec2(858980352u, 794163u), uvec2(1801650176u, 3571583u),
  uvec2(912457728u, 6501916u), uvec2(858980352u, 523255347u), uvec2(423559168u, 4138508u), uvec2(118230072u, 3673100u),
  uvec2(1579032u, 1579032u), uvec2(940313607u, 461836u), uvec2(15214u, 0u)
);
const uint STARTER_RAMPS[99] = uint[99](
  0u, 78u, 90u, 91u, 93u, 152u, 143u, 67u, 96u,
  0u, 1u, 2u, 6u, 5u, 8u, 9u, 11u, 10u,
  0u, 17u, 17u, 19u, 18u, 20u, 20u, 21u, 21u,
  0u, 1u, 3u, 2u, 91u, 10u, 12u, 31u, 36u,
  0u, 1u, 3u, 32u, 22u, 25u, 33u, 26u, 23u,
  0u, 1u, 3u, 13u, 7u, 28u, 27u, 27u, 23u,
  0u, 1u, 4u, 2u, 16u, 31u, 35u, 37u, 30u,
  0u, 1u, 1u, 2u, 2u, 8u, 7u, 10u, 12u,
  0u, 4u, 1u, 2u, 5u, 5u, 8u, 7u, 10u,
  0u, 1u, 2u, 91u, 10u, 31u, 36u, 20u, 21u,
  0u, 1u, 3u, 2u, 91u, 10u, 12u, 31u, 36u
);
const float SYMBOL_COVERAGE[47] = float[47](
  0.0, 0.018, 0.04, 0.035, 0.028, 0.083, 0.102, 0.083, 0.116, 0.116, 0.147, 0.153,
  0.174, 0.118, 0.118, 0.141, 0.141, 0.145, 0.31, 0.35, 0.83, 1.0, 0.38, 0.47,
  0.43, 0.43, 0.41, 0.42, 0.34, 0.42, 0.49, 0.3, 0.29, 0.42, 0.36, 0.42,
  0.48, 0.39, 0.25, 0.5, 0.75, 0.5, 0.5, 0.0, 0.5, 0.5, 0.1
);
const float TURN = 6.28318530718;

float noise(uvec2 id, uint salt) {
  uint value = id.x * 747796405u + id.y * 2891336453u + (salt + uint(settings.composite.w)) * 277803737u;
  value = ((value >> ((value >> 28u) + 4u)) ^ value) * 277803737u;
  return float(((value >> 22u) ^ value) & 65535u) / 65535.0;
}

vec4 sourceAt(vec2 uv) {
  vec2 bounded = clamp(uv, vec2(0.0), vec2(1.0));
  return textureLod(uImage, motionSourceUV(bounded), 0.0);
}

bool imageInverted() {
  return (uint(settings.composite.x) & 1u) != 0u;
}

vec3 gradeImage(vec3 value) {
  vec3 rgb = (imageInverted() ? 1.0 - value : value);
  vec3 adjusted = clamp((rgb - 0.5) * settings.grading.y + 0.5 + settings.grading.x, vec3(0.0), vec3(1.0));
  return pow(adjusted, vec3(settings.grading.z));
}

vec2 warpedCenter(vec2 center, uint row) {
  uint warp = uint(settings.alterations.z);
  float amount = settings.alterations.w * 0.15;
  if (warp == 1u) {
    float shift = 2.0 * noise(uvec2(row / 2u, 0u), 63u) - 1.0;
    return center + vec2(shift * amount, 0.0);
  }
  if (warp == 2u) {
    float phase = float(uint(settings.composite.w) % 31u) * 0.21;
    return center + vec2(sin(center.y * 19.0 + phase) * amount, cos(center.x * 12.0 + phase) * amount * 0.45);
  }
  return center;
}

uint rampGlyph(uint style, float tone, float variation) {
  uint level = uint(clamp(floor(tone * 9.0 + (variation - 0.5) * 0.45), 0.0, 8.0));
  if (style == 4u && level == 7u && variation > 0.52) { return M; }
  if (style == 5u && level == 7u && variation > 0.27) { return B; }
  if (style == 6u && level == 8u && variation > 0.55) { return HASH; }
  if (style == 8u && level == 1u && variation > 0.5) { return COMMA; }
  if (style == 9u && level == 6u && variation > 0.55) { return WINDOW; }
  return STARTER_RAMPS[style * 9u + level];
}

uint toneBand(float value) {
  return (value >= settings.bands.x ? (value >= settings.bands.y ? 2u : 1u) : 0u);
}

uint userGlyph(uvec2 id, float tone, uint style, float variation, uint band) {
  uint bank = 135u + band * 65u;
  uint start = (characterAt(bank) > 0u ? bank : 0u);
  uint count = characterAt(start);
  if (count == 0u) { return rampGlyph(style, tone, variation); }
  if (tone <= 0.015) { return 0u; }
  if (uint(settings.glyphs.w) % 3u == 2u) {
    if (variation > tone) { return 0u; }
    uint index = (id.y * uint(settings.grid.x) + id.x + uint(settings.composite.w)) % count;
    return characterAt(start + 1u + index);
  }
  float ends[4] = float[4](0.0, settings.bands.x, settings.bands.y, 1.0);
  float level = (start != 0u ? (tone - ends[band]) / (ends[band + 1u] - ends[band]) : tone);
  uint index = uint(clamp(floor(level * float(count)), 0.0, float(count - 1u)));
  return characterAt(start + 1u + index);
}

float glyphCoverage(uint glyph) {
  if (glyph >= BRAILLE_START) { return float(popcount(glyph - BRAILLE_START)) * 0.055; }
  if (glyph >= ASCII_START) {
    uvec2 bits = ASCII_BITMAPS[glyph - ASCII_START];
    return float(popcount(bits.x) + popcount(bits.y)) / 64.0;
  }
  return SYMBOL_COVERAGE[glyph];
}

uint seededGlyph(uvec2 id, uint glyph, uint style, uint band) {
  if (glyph == 0u || noise(id, 106u) >= settings.motion.z) { return glyph; }
  uint bank = 135u + band * 65u;
  uint start = (characterAt(bank) > 0u ? bank : 0u);
  uint customCount = characterAt(start);
  uint count = (customCount == 0u ? 9u : customCount);
  uint tick = uint(floor(fract(settings.motion.y) * 10.0 + noise(id, 107u))) % 10u;
  float coverage = glyphCoverage(glyph);
  float nearest = 0.08 + 0.07 * settings.motion.z;
  uint replacement = glyph;
  for (uint attempt = 0u; attempt < 5u; attempt++) {
    uint index = uint(noise(id, 111u + tick * 5u + attempt) * float(count)) % count;
    uint candidate = STARTER_RAMPS[style * 9u + index % 9u];
    if (customCount > 0u) { candidate = characterAt(start + 1u + index); }
    if (candidate == 0u || candidate == glyph) { continue; }
    float difference = abs(glyphCoverage(candidate) - coverage);
    if (difference < nearest) {
      nearest = difference;
      replacement = candidate;
    }
  }
  return replacement;
}

vec3 sourceRGB(vec4 sampleColor) {
  return clamp(sampleColor.rgb / max(sampleColor.a, 0.0001), vec3(0.0), vec3(1.0));
}

vec3 extractionRGB(vec3 original) {
  return (settings.extraction.y > 0.5 ? gradeImage(original) : original);
}

Swatch extractSwatch(uint slot) {
  // shortcut: sample a fixed 48 × 48 grid, use a denser pass if small isolated colors need more weight.
  vec4 bins[64];
  vec4 tonal[3];
  for (uint i = 0u; i < 64u; i++) { bins[i] = vec4(0.0); }
  for (uint i = 0u; i < 3u; i++) { tonal[i] = vec4(0.0); }
  vec4 overall = vec4(0.0);
  for (uint y = 0u; y < 48u; y++) {
    for (uint x = 0u; x < 48u; x++) {
      vec4 texel = sourceAt((vec2(float(x), float(y)) + 0.5) / 48.0);
      float alpha = (settings.extraction.z > 0.5 ? inputCoverage(texel) : texel.a);
      if (alpha < 0.02) { continue; }
      vec3 rgb = extractionRGB(sourceRGB(texel));
      uvec3 component = min(uvec3(rgb * 4.0), uvec3(3u));
      uint index = component.r * 16u + component.g * 4u + component.b;
      uint band = min(2u, uint(dot(rgb, LUMA) * 3.0));
      vec4 value = vec4(rgb * alpha, alpha);
      bins[index] += value;
      tonal[band] += value;
      overall += value;
    }
  }
  vec3 fallback = (overall.a > 0.0 ? overall.rgb / max(overall.a, 0.0001) : settings.ink.rgb);
  vec3 chosen[8];
  for (uint i = 0u; i <= slot; i++) {
    vec3 rgb = fallback;
    if (settings.grid.w == 7.0) {
      vec4 weighted = tonal[i];
      rgb = (weighted.a > 0.0 ? weighted.rgb / max(weighted.a, 0.0001) : fallback);
    } else {
      float best = 0.0;
      uint bestIndex = 0u;
      for (uint j = 0u; j < 64u; j++) {
        if (bins[j].a <= 0.0) { continue; }
        vec3 candidate = bins[j].rgb / bins[j].a;
        float spread = 1.0;
        for (uint k = 0u; k < i; k++) {
          spread = min(spread, distance(chosen[k], candidate));
        }
        float score = sqrt(bins[j].a) * (0.12 + spread);
        if (score > best) {
          best = score;
          bestIndex = j;
          rgb = candidate;
        }
      }
      if (best > 0.0) { bins[bestIndex] = vec4(0.0); }
    }
    chosen[i] = rgb;
  }
  vec3 rgb = chosen[slot];
  vec4 lockColor = uLockedColors[slot];
  return Swatch(vec4(rgb, 1.0), vec4((lockColor.a > 0.5 ? lockColor.rgb : rgb), 1.0));
}

vec3 routeInk(vec3 rgb, uint band, uint kind) {
  uint count = uint(settings.extraction.x);
  uint rule = characterAt(RULE_START + kind * 3u + band);
  if (rule > 0u && rule <= count) { return swatchAt(rule - 1u).ink.rgb; }
  if (settings.grid.w == 7.0) {
    return swatchAt(min(2u, uint(dot(rgb, LUMA) * 3.0))).ink.rgb;
  }
  float best = 10.0;
  uint index = 0u;
  for (uint i = 0u; i < count; i++) {
    vec3 delta = rgb - swatchAt(i).sourceColor.rgb;
    float distanceSquared = dot(delta * delta, vec3(0.30, 0.55, 0.15));
    if (distanceSquared < best) {
      best = distanceSquared;
      index = i;
    }
  }
  return swatchAt(index).ink.rgb;
}

uint contourGlyph(uint style, vec2 tangent, float corner, float variation, bool useDefault) {
  uint slot = (tangent.x * tangent.y > 0.0 ? 3u : 2u);
  if (abs(tangent.x) > abs(tangent.y) * 2.414) {
    slot = 0u;
  } else if (abs(tangent.y) > abs(tangent.x) * 2.414) {
    slot = 1u;
  }
  bool turning = corner > 0.14;
  uint edgeIndex = (turning ? (tangent.y > 0.0 ? 5u : 4u) : slot);
  uint current = characterAt(EDGE_START + edgeIndex);
  uint straight = characterAt(EDGE_START + slot);
  if (current != INHERIT) { return current; }
  if (straight != INHERIT) { return straight; }
  if (!useDefault) { return INHERIT; }

  if (style == 2u) {
    return (abs(tangent.x) > 0.65 ? THICK_BOX : BARS);
  }
  if (style == 3u && variation < 0.48) {
    return (abs(tangent.x) > abs(tangent.y) ? DASH : COLON);
  }
  if (style == 8u && variation < 0.18) {
    return (tangent.y > 0.0 ? QUOTE : COMMA);
  }
  if (turning && style != 1u && style != 8u) {
    if (style == 7u || style == 5u) {
      return (tangent.y > 0.0 ? RIGHT_PAREN : LEFT_PAREN);
    }
    return (tangent.y > 0.0 ? RIGHT_BRACKET : LEFT_BRACKET);
  }
  return uint[4]((style == 1u ? UNDER : DASH), BAR, SLASH, BACKSLASH)[slot];
}

Cell analyzeCell(uvec2 id) {
  vec2 cellSize = settings.size.zw;
  vec2 resolution = settings.size.xy;
  vec2 extent = cellSize / resolution;
  vec2 center = warpedCenter(min((vec2(id) + 0.5) * extent, vec2(1.0) - 0.5 / resolution), id.y);
  uint detailMode = uint(settings.alterations.x);
  float detail = settings.alterations.y;
  vec2 offset = (0.45 + (detailMode == 1u ? detail * 0.95 : 0.0)) * extent;
  vec4 nw = sourceAt(center - offset);
  vec4 n = sourceAt(center - vec2(0.0, offset.y));
  vec4 ne = sourceAt(center + vec2(offset.x, -offset.y));
  vec4 w = sourceAt(center - vec2(offset.x, 0.0));
  vec4 c = sourceAt(center);
  vec4 e = sourceAt(center + vec2(offset.x, 0.0));
  vec4 sw = sourceAt(center + vec2(-offset.x, offset.y));
  vec4 s = sourceAt(center + vec2(0.0, offset.y));
  vec4 se = sourceAt(center + offset);

  vec4 total = nw + ne + sw + se + 2.0 * (n + w + e + s) + 4.0 * c;
  vec4 dx = (ne + 2.0 * e + se - nw - 2.0 * w - sw) * 0.25;
  vec4 dy = (sw + 2.0 * s + se - nw - 2.0 * n - ne) * 0.25 * cellSize.x / cellSize.y;
  vec3 gx = (imageInverted() ? dx.aaa - dx.rgb : dx.rgb);
  vec3 gy = (imageInverted() ? dy.aaa - dy.rgb : dy.rgb);
  vec2 valueGradient = vec2(dot(gx, LUMA), dot(gy, LUMA));
  vec2 alphaGradient = 0.8 * vec2(dx.a, dy.a);
  if (settings.edges.x > 0.0 && settings.alpha.x > 0.0) {
    alphaGradient = vec2(inputCoverage(e) - inputCoverage(w), (inputCoverage(s) - inputCoverage(n)) * cellSize.x / cellSize.y);
  }
  alphaGradient *= 1.0 + settings.edges.x * 2.0;
  vec2 interiorGradient = valueGradient * settings.edges.y;
  vec2 gradient = (length(alphaGradient) > length(interiorGradient) ? alphaGradient : interiorGradient);
  float contrast = length(gradient);
  vec2 tangent = vec2(gradient.y, -gradient.x) / max(contrast, 0.0001);
  vec4 twist = nw + se - ne - sw;
  float corner = max(abs(dot(twist.rgb, LUMA)), 0.8 * abs(twist.a));

  vec3 rgb = gradeImage(clamp(total.rgb / max(total.a, 0.0001), vec3(0.0), vec3(1.0)));
  if (detailMode == 2u) {
    vec3 middle = gradeImage(clamp(c.rgb / max(c.a, 0.0001), vec3(0.0), vec3(1.0)));
    rgb += (middle - rgb) * detail * 2.4;
  } else if (detailMode == 3u) {
    float relief = 0.68 + 1.48 * dot(gradient, vec2(0.72, -0.69));
    rgb = mix(rgb, vec3(relief), detail);
  } else if (detailMode == 4u) {
    float edgeInk = smoothstep(0.025, 0.48, contrast);
    rgb = mix(rgb, vec3((settings.controls.w > 0.5 ? edgeInk : 1.0 - edgeInk)), detail);
  }
  rgb = clamp(rgb, vec3(0.0), vec3(1.0));
  float luma = dot(rgb, LUMA);
  float levels = settings.grading.w - 1.0;
  if (levels >= 1.0) { luma = roundEven(luma * levels) / levels; }

  uint style = uint(settings.grid.z);
  bool brightInk = settings.controls.w > 0.5;
  float inkTarget = (brightInk ? luma : 1.0 - luma);
  float density = settings.controls.y;
  float tone = pow(inkTarget, mix(1.85, 0.52, density));
  uint response = uint(settings.glyphs.w) / 9u;
  if (response == 0u) {
    switch (style) {
      case 1u: tone *= 0.92; break;
      case 2u: tone = pow(tone, 0.81); break;
      case 4u: tone = pow(tone, 1.25); break;
      case 7u: tone = pow(tone, 2.7) * 0.69; break;
      case 8u: tone = pow(tone, 4.4) * 0.37; break;
      case 9u: tone = pow(tone, 1.15); break;
      case 10u: tone = pow(tone, 1.4) * 0.9; break;
      default: break;
    }
  } else if (response == 2u) {
    tone = pow(tone, 0.64);
  } else if (response == 3u) {
    tone = pow(tone, 2.8) * 0.75;
  } else if (response == 4u) {
    tone = smoothstep(0.35, 0.55, tone);
  }

  float contourBias = float[11](1.05, 1.52, 0.46, 0.62, 0.42, 0.53, 0.77, 1.46, 1.05, 0.81, 1.19)[style];
  float edge = clamp(settings.controls.x * contourBias, 0.0, 1.0) * smoothstep(0.065, 0.44, contrast * settings.grading.y);
  float variation = noise(id, 7u);
  float cutoff = settings.glyphs.z;
  tone = clamp((tone - cutoff) / max(0.0001, 1.0 - cutoff), 0.0, 1.0);
  if (settings.alpha.w > 0.0 && tone > 0.0 && tone < 1.0) {
    float order = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0)[(id.y % 4u) * 4u + id.x % 4u];
    tone = clamp(tone + ((order + 0.5) / 16.0 - 0.5) * settings.alpha.w * 0.4, 0.0, 1.0);
  }

  float dots = settings.mixMarks.x;
  float blocks = settings.mixMarks.y;
  uint blendBy = uint(settings.mixMarks.z);
  uint band = toneBand(tone);
  float dense = smoothstep(settings.bands.x * 0.6, mix(settings.bands.y, 1.0, 0.4), tone);
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
  float choice = noise(id, 19u) * (dots + blocks + (1.0 - dots) * (1.0 - blocks));
  uint tonalStyle = (style == 2u ? 0u : style);
  uint glyph = userGlyph(id, tone, tonalStyle, variation, band);
  bool explicitBlockMix = (uint(settings.composite.x) & 4u) != 0u;
  if (style == 9u && explicitBlockMix && characterAt(0u) == 0u && (glyph == WINDOW || glyph == BLOCK)) {
    glyph = AT;
  }
  uint markKind = 0u;
  bool automatic = characterAt(0u) == 0u && characterAt(135u + band * 65u) == 0u;
  if (choice < dots) {
    glyph = DOT_MATRIX;
    markKind = 3u;
  } else if (choice < dots + blocks) {
    glyph = rampGlyph(2u, tone, variation);
    automatic = true;
    if (settings.edges.z >= 0.0 && glyph != 0u) {
      glyph = (tone >= settings.edges.z ? BLOCK : (tone > 0.35 ? BARS : BOX));
    }
    markKind = 2u;
  }

  float continuity = variation;
  if (settings.bands.z > 1.0) {
    vec2 direction = (tangent.x > 0.0 || (tangent.x == 0.0 && tangent.y > 0.0) ? tangent : -tangent);
    float parallel = dot(vec2(id), direction);
    float perpendicular = dot(vec2(id), vec2(-direction.y, direction.x));
    uvec2 region = uvec2(floor(vec2(parallel / settings.bands.z, perpendicular / 2.0) + 65536.0));
    continuity = noise(region, 61u);
  }
  bool breakLine = settings.bands.w >= 1.0 || continuity < settings.bands.w;
  bool directional = edge > max(0.015, 0.16 + 0.40 * continuity + settings.mixMarks.w) && !breakLine;
  bool terminalShadow = markKind == 2u && tone > 0.79;
  if (directional) {
    uint contourStyle = (markKind == 2u ? 2u : tonalStyle);
    uint edgeGlyph = contourGlyph(contourStyle, tangent, corner, variation, markKind != 3u && !terminalShadow);
    if (edgeGlyph != INHERIT) {
      glyph = edgeGlyph;
      markKind = 1u;
      automatic = false;
    }
  }

  if (settings.motion.x == 2.0 && markKind == 0u) {
    glyph = seededGlyph(id, glyph, tonalStyle, band);
  }
  uint markCode = glyph + 512u * markKind + (automatic && (style != 1u || markKind == 2u) ? 2048u : 0u);
  float dropEdge = (breakLine ? 0.0 : edge);
  if (settings.extraction.x > 0.0) {
    rgb = routeInk(extractionRGB(sourceRGB(total / 16.0)), band, markKind);
  }
  vec4 mark = vec4(float(markCode), tangent, dropEdge);
  if (glyph == DOT_MATRIX) {
    uvec2 grid = dotGridDimensions();
    if (dotDetail(grid) < 1.0) {
      Cell cell = Cell(vec4(rgb, tone), mark);
      float inkArea = 0.0;
      float variation = noise(id, 11u);
      for (uint y = 0u; y < grid.y; y++) {
        for (uint x = 0u; x < grid.x; x++) {
          float radius = dotRadius(uvec2(x, y), grid, cell, variation);
          inkArea += min(3.141593 * radius * radius * cellSize.x / cellSize.y, 1.0 / float(grid.x * grid.y));
        }
      }
      float size = min(1.0, settings.glyphs.x);
      mark.x += inkArea * size * size * 0.5;
    }
  }
  return Cell(vec4(rgb, tone), mark);
}

float inside(float distance, float radius, float aa) {
  return 1.0 - smoothstep(max(0.0, radius - aa), radius + aa, distance);
}

float stroke(vec2 p, vec2 start, vec2 end, float width, float aa) {
  vec2 direction = end - start;
  float along = clamp(dot(p - start, direction) / dot(direction, direction), 0.0, 1.0);
  return inside(length(p - start - along * direction), width, aa);
}

float boxSdf(vec2 p, vec2 size) {
  vec2 distance = abs(p - 0.5) - size;
  return length(max(distance, vec2(0.0))) + min(max(distance.x, distance.y), 0.0);
}

float boxMask(vec2 p, vec2 size, float aa) {
  return 1.0 - smoothstep(-aa, aa, boxSdf(p, size));
}

float bitmapPixel(uvec2 bits, ivec2 coordinate) {
  if (any(lessThan(coordinate, ivec2(0))) || any(greaterThanEqual(coordinate, ivec2(5, 7)))) { return 0.0; }
  uint row = uint(coordinate.y);
  uint shift = (3u - row % 4u) * 5u + 4u - uint(coordinate.x);
  return float((bits[row / 4u] >> shift) & 1u);
}

float bitmapMask(vec2 p, uint glyph, float aa) {
  uvec2 bits = BITMAPS[glyph - A];
  vec2 local = ((p - 0.5) / vec2(0.88, 0.82) + 0.5) * vec2(5.0, 7.0) - 0.5;
  ivec2 origin = ivec2(floor(local));
  float feather = clamp(aa * 4.0, 0.075, 0.48);
  vec2 weight = smoothstep(vec2(0.5 - feather), vec2(0.5 + feather), fract(local));
  float top = mix(bitmapPixel(bits, origin), bitmapPixel(bits, origin + ivec2(1, 0)), weight.x);
  float bottom = mix(bitmapPixel(bits, origin + ivec2(0, 1)), bitmapPixel(bits, origin + ivec2(1, 1)), weight.x);
  return mix(top, bottom, weight.y);
}

float asciiPixel(uvec2 bits, ivec2 coordinate) {
  if (any(lessThan(coordinate, ivec2(0))) || any(greaterThanEqual(coordinate, ivec2(8)))) { return 0.0; }
  uint row = uint(coordinate.y);
  uint shift = (row % 4u) * 8u + uint(coordinate.x);
  return float((bits[row / 4u] >> shift) & 1u);
}

float asciiMask(vec2 p, uint glyph, float aa) {
  uvec2 bits = ASCII_BITMAPS[glyph - ASCII_START];
  vec2 local = (p - 0.5) * 8.9 + 3.8;
  ivec2 origin = ivec2(floor(local));
  float feather = clamp(aa * 5.0, 0.075, 0.49);
  vec2 weight = smoothstep(vec2(0.5 - feather), vec2(0.5 + feather), fract(local));
  float top = mix(asciiPixel(bits, origin), asciiPixel(bits, origin + ivec2(1, 0)), weight.x);
  float bottom = mix(asciiPixel(bits, origin + ivec2(0, 1)), asciiPixel(bits, origin + ivec2(1, 1)), weight.x);
  return mix(top, bottom, weight.y);
}

float brailleMask(vec2 p, uint glyph, float aa) {
  vec2 grid = vec2(2.0, 4.0);
  uvec2 address = min(uvec2(p * grid), uvec2(1u, 3u));
  uint dotBit = uint[8](0u, 3u, 1u, 4u, 2u, 5u, 6u, 7u)[address.y * 2u + address.x];
  float present = float(((glyph - BRAILLE_START) >> dotBit) & 1u);
  vec2 center = (vec2(address) + 0.5) / grid;
  vec2 offset = (p - center) * vec2(1.0, settings.size.w / settings.size.z);
  return present * inside(length(offset), 0.105 * settings.glyphs.y, aa);
}

float glyphMask(vec2 p, uint glyph, uint style, float aa) {
  bool compact = style == 3u || style == 8u;
  float thickness = settings.glyphs.y;
  float weight = (compact ? 0.036 : 0.051) * thickness;
  uint join = (uint(settings.glyphs.w) / 3u) % 3u;
  bool connected = (join == 0u ? style == 1u || style == 7u : join == 1u);
  float reach = (connected ? 0.0 : 0.14);
  vec2 reflected = (glyph == RIGHT_PAREN || glyph == RIGHT_BRACKET ? vec2(1.0 - p.x, p.y) : p);
  if (glyph >= BRAILLE_START) { return brailleMask(p, glyph, aa); }
  switch (glyph) {
    case 0u: { return 0.0; }
    case DOT: { return inside(length(p - vec2(0.50, 0.73)), weight * 1.45, aa); }
    case COLON: {
      float y = min(abs(p.y - 0.35), abs(p.y - 0.67));
      return inside(length(vec2(p.x - 0.5, y)), weight * 1.58, aa);
    }
    case COMMA: { return stroke(p, vec2(0.55, 0.66), vec2(0.39, 0.83), weight, aa); }
    case QUOTE: { return stroke(p, vec2(0.53, 0.21), vec2(0.48, 0.34), weight, aa); }
    case DASH: { return stroke(p, vec2(reach, 0.50), vec2(1.0 - reach, 0.50), weight, aa); }
    case UNDER: { return inside(abs(p.y - 0.71), weight, aa); }
    case BAR: { return stroke(p, vec2(0.50, reach), vec2(0.50, 1.0 - reach), weight, aa); }
    case SLASH: { return stroke(p, vec2(reach, 1.0 - reach), vec2(1.0 - reach, reach), weight, aa); }
    case BACKSLASH: { return stroke(p, vec2(reach), vec2(1.0 - reach), weight, aa); }
    case PLUS: {
      float horizontal = stroke(p, vec2(0.16, 0.50), vec2(0.84, 0.50), weight, aa);
      float vertical = stroke(p, vec2(0.50, 0.20), vec2(0.50, 0.80), weight, aa);
      return max(horizontal, vertical);
    }
    case EQUALS: {
      float row = (p.y > 0.5 ? 0.66 : 0.34);
      float reach = (connected ? 0.03 : 0.16);
      return stroke(p, vec2(reach, row), vec2(1.0 - reach, row), weight, aa);
    }
    case STAR: {
      float across = stroke(p, vec2(0.15, 0.50), vec2(0.85, 0.50), weight, aa);
      float slash = stroke(p, vec2(0.24, 0.73), vec2(0.76, 0.27), weight, aa);
      float backslash = stroke(p, vec2(0.24, 0.27), vec2(0.76, 0.73), weight, aa);
      return max(across, max(slash, backslash));
    }
    case LEFT_PAREN: case RIGHT_PAREN: {
      float y = clamp(reflected.y, 0.10, 0.90);
      float bow = 0.31 + 1.72 * (y - 0.5) * (y - 0.5);
      return inside(length(reflected - vec2(bow, y)), weight, aa);
    }
    case LEFT_BRACKET: case RIGHT_BRACKET: {
      float upright = stroke(reflected, vec2(0.30, 0.10), vec2(0.30, 0.90), weight, aa);
      float y = (reflected.y > 0.5 ? 0.90 : 0.10);
      return max(upright, stroke(reflected, vec2(0.30, y), vec2(0.63, y), weight, aa));
    }
    case BOX: { return inside(abs(boxSdf(p, vec2(0.44, 0.46))), 0.038 * thickness, aa); }
    case THICK_BOX: { return inside(abs(boxSdf(p, vec2(0.42, 0.44))), 0.079 * thickness, aa); }
    case BARS: {
      float horizontal = min(abs(p.y - 0.29), abs(p.y - 0.68));
      float upright = inside(abs(p.x - 0.50), 0.045 * thickness, aa);
      return max(upright, inside(horizontal, 0.064 * thickness, aa));
    }
    case WINDOW: {
      float face = boxMask(p, vec2(0.50), aa);
      float hole = boxMask(p + vec2(0.0, -0.02), vec2(0.17, 0.25), aa);
      return face * (1.0 - hole);
    }
    case BLOCK: { return 1.0; }
    case 38u: case 39u: case 40u: {
      uvec2 grid = min(uvec2(p * 4.0), uvec2(3u));
      bool checker = (grid.x + grid.y) % 2u == 0u;
      bool sparse = grid.x % 2u == 0u && grid.y % 2u == 0u;
      return ((glyph == 38u ? sparse : (glyph == 39u ? checker : !sparse)) ? 1.0 : 0.0);
    }
    case 41u: case 42u: {
      return (glyph == 41u ? 1.0 - smoothstep(0.5 - aa, 0.5 + aa, p.y) : smoothstep(0.5 - aa, 0.5 + aa, p.y));
    }
    case 44u: case 45u: {
      return (glyph == 44u ? 1.0 - smoothstep(0.5 - aa, 0.5 + aa, p.x) : smoothstep(0.5 - aa, 0.5 + aa, p.x));
    }
    case 46u: { return inside(length(p - 0.5), 0.16 * thickness, aa); }
    default: {
      float coverage = 0.0;
      if (glyph >= ASCII_START) {
        coverage = asciiMask(p, glyph, aa);
      } else {
        coverage = bitmapMask(p, glyph, aa);
      }
      return clamp(coverage + (thickness - 1.0) * coverage * (1.0 - coverage), 0.0, 1.0);
    }
  }
}

uvec2 dotGridDimensions() {
  return uvec2[4](uvec2(3u, 4u), uvec2(2u, 3u), uvec2(2u, 4u), uvec2(4u, 5u))[uint(settings.edges.w)];
}

float dotDetail(uvec2 grid) {
  vec2 spacing = settings.size.zw * settings.glyphs.x / vec2(grid);
  return smoothstep(1.25, 2.35, min(spacing.x, spacing.y));
}

float dotRadius(uvec2 subcell, uvec2 dimensions, Cell cell, float variation) {
  vec2 grid = vec2(dimensions);
  vec2 center = (vec2(subcell) + 0.5) / grid;
  uint position = subcell.y * dimensions.x + subcell.x;
  float order = (float((position * 7u + 1u) % (dimensions.x * dimensions.y)) + 0.5) / (grid.x * grid.y);
  if (settings.edges.w == 0.0) {
    order = float[12](0.15, 0.67, 0.32, 0.83, 0.03, 0.50, 0.41, 0.58, 0.25, 0.75, 0.11, 0.92)[position];
  }
  vec2 fromCenter = center - 0.5;
  float tangentDistance = abs(fromCenter.x * cell.mark.z - fromCenter.y * cell.mark.y);
  float edgeDots = cell.mark.w * (1.0 - smoothstep(0.06, 0.35, tangentDistance)) * settings.blockBands.w;
  float coverage = max(cell.color.a, edgeDots * 1.05);
  if (coverage < max(0.026, order + (variation - 0.5) * 0.07)) { return 0.0; }
  float radius = mix(0.045, 0.122, coverage) * settings.glyphs.y * settings.dotBands.w * 3.0 / grid.x;
  return radius;
}

float dotMatrixMask(vec2 p, Cell cell, float variation, float aa) {
  uvec2 dimensions = dotGridDimensions();
  float detail = dotDetail(dimensions);
  // A pixel covering the entire dot pitch needs area coverage to avoid regular rows dropping out.
  float average = fract(cell.mark.x) * 2.0;
  if (detail == 0.0) { return average; }
  if (any(lessThan(p, vec2(0.0))) || any(greaterThan(p, vec2(1.0)))) { return average * (1.0 - detail); }
  vec2 grid = vec2(dimensions);
  uvec2 subcell = min(uvec2(p * grid), dimensions - 1u);
  vec2 center = (vec2(subcell) + 0.5) / grid;
  vec2 offset = (p - center) * vec2(1.0, settings.size.w / settings.size.z);
  float radius = dotRadius(subcell, dimensions, cell, variation);
  float dot = (radius == 0.0 ? 0.0 : inside(length(offset), radius, aa));
  return mix(average, dot, detail);
}

float markMask(vec2 p, uint glyph, uint style, Cell cell, uvec2 id, float variation, float aa, bool automatic) {
  vec2 local = (p - 0.5) / settings.glyphs.x + 0.5;
  float softness = aa / settings.glyphs.x;
  if (glyph == DOT_MATRIX) { return dotMatrixMask(local, cell, variation, softness); }
  if (any(lessThan(local, vec2(0.0))) || any(greaterThan(local, vec2(1.0)))) { return 0.0; }
  if (automatic) {
    vec2 stagger = vec2(noise(id, 31u) - 0.5, noise(id, 47u) - 0.5);
    if (glyph == WINDOW) {
      // Give each cutout a wrapped phase so flat shading never shares a baseline.
      return 1.0 - boxMask(fract(local - stagger), vec2(0.17, 0.25), softness);
    }
    if (glyph == BOX || glyph == THICK_BOX || glyph == BARS) {
      vec2 mark = local - stagger * 0.30;
      float width = (glyph != BOX ? 0.079 : 0.038) * settings.glyphs.y;
      return inside(abs(boxSdf(mark, vec2(0.32, 0.34))), width, softness);
    }
    if (glyph == DOT || glyph == COLON || glyph == COMMA || glyph == QUOTE || glyph == DASH || glyph == PLUS) {
      local -= stagger * 0.28;
    }
  }
  return glyphMask(local, glyph, style, softness);
}

float inputCoverage(vec4 image) {
  float sourceAlpha = clamp(image.a, 0.0, 1.0);
  uint key = uint(settings.alpha.x);
  if (key == 0u || sourceAlpha == 0.0) { return sourceAlpha; }
  float luma = dot(image.rgb, LUMA) / max(sourceAlpha, 0.0001);
  float amount = (key == 1u ? luma : 1.0 - luma);
  float threshold = settings.alpha.y;
  float softness = settings.alpha.z;
  return sourceAlpha * (1.0 - smoothstep(threshold - softness, threshold + softness, amount));
}

uvec2 artCellId(vec2 gridPosition) {
  return min(uvec2(gridPosition), uvec2(settings.grid) - uvec2(1u));
}

Cell artCell(uvec2 id) {
  return Cell(uintBitsToFloat(texelFetch(uCellColors, ivec2(id), 0)), uintBitsToFloat(texelFetch(uCellMarks, ivec2(id), 0)));
}

uvec2 auraTiles() {
  return (uvec2(settings.grid) + 3u) / 4u;
}

AuraEmitter findAuraEmitter(uvec2 id) {
  AuraEmitter best = AuraEmitter(0u, 0.0);
  float bestScore = 0.0;
  vec2 extent = settings.size.zw / settings.size.xy;
  uvec2 end = uvec2(settings.grid);
  for (uint y = 0u; y < 4u; y++) {
    for (uint x = 0u; x < 4u; x++) {
      uvec2 origin = id * 4u + uvec2(x, y);
      if (any(greaterThanEqual(origin, end))) { continue; }
      Cell cell = artCell(origin);
      uint code = uint(cell.mark.x);
      if (code % 512u == 0u) { continue; }
      vec2 uv = (vec2(origin) + 0.5) * extent;
      if (any(greaterThanEqual(uv, vec2(1.0)))) { continue; }
      vec4 sourcePixel = sourceAt(uv);
      float darkness = 1.0 - dot(gradeImage(sourceRGB(sourcePixel)), LUMA);
      float shadow = smoothstep(0.48, 0.84, darkness);
      float edge = max(cell.mark.w, ((code / 512u) % 4u == 1u ? 1.0 : 0.0));
      float weight = max(shadow, edge) * inputCoverage(sourcePixel);
      float score = weight * (0.72 + 0.28 * noise(origin, 169u) + edge * 0.65);
      if (score > bestScore) {
        bestScore = score;
        best = AuraEmitter(origin.y * end.x + origin.x, weight);
      }
    }
  }
  return best;
}

vec4 markInkColor(Cell cell, uvec2 id) {
  uint palette = uint(settings.grid.w);
  uint kind = (uint(cell.mark.x) / 512u) % 4u;
  vec4 ink = settings.ink;

  if (palette == 1u) {
    ink = vec4(mix(ink.rgb, cell.color.rgb, settings.composite.y), ink.a);
  } else if (palette == 2u) {
    vec3 amber = vec3(0.98, 0.55, 0.16);
    vec3 red = vec3(0.77, 0.09, 0.14);
    vec3 low = mix(red, amber, smoothstep(0.14, 0.60, cell.color.a));
    ink = vec4(mix(low, ink.rgb, smoothstep(0.46, 0.91, cell.color.a)), ink.a);
  } else if (palette == 3u) {
    float variation = noise(id, 11u);
    float cluster = noise(id / uvec2(3u), 23u);
    if (variation > 0.76 && cluster < 0.62) {
      ink = mix(ink, settings.accentOne, settings.composite.y);
    } else if (variation < 0.13 && cluster > 0.58) {
      ink = mix(ink, settings.accentTwo, settings.composite.y);
    }
  } else if (palette == 4u) {
    float tone = cell.color.a;
    vec4 light = mix(ink, settings.accentOne, min(1.0, tone * 2.0));
    vec4 heavy = mix(settings.accentOne, settings.accentTwo, max(0.0, tone * 2.0 - 1.0));
    ink = (tone > 0.5 ? heavy : light);
  } else if (palette == 5u) {
    ink = (kind == 1u ? settings.accentOne : ink);
    ink = (kind >= 2u ? settings.accentTwo : ink);
  } else if (palette >= 6u) {
    ink = vec4(mix(ink.rgb, cell.color.rgb, settings.composite.y), ink.a);
  }
  return ink;
}

vec4 drawInk(vec2 pixel, float grain, float antialias) {
  vec2 gridPosition = pixel / settings.size.zw;
  uvec2 id = artCellId(gridPosition);
  Cell cell = artCell(id);
  uint style = uint(settings.grid.z);
  float grit = settings.controls.z;
  float variation = noise(id, 11u);
  uint markCode = uint(cell.mark.x);
  uint glyph = markCode % 512u;
  bool automatic = markCode >= 2048u;
  vec2 p = gridPosition - vec2(id);
  float pixelInCell = 1.0 / min(settings.size.z, settings.size.w);
  float aa = clamp(0.43 * pixelInCell * antialias, 0.008, 0.11);
  vec4 ink = markInkColor(cell, id);
  float print = (style == 9u ? 1.7 : 1.0);
  vec3 paperRGB = clamp(settings.paper.rgb + 0.11 * grain, vec3(0.0), vec3(1.0));
  vec3 inkRGB = clamp(ink.rgb + 0.16 * grain, vec3(0.0), vec3(1.0));
  vec2 offset = grit * print * 0.10 * vec2(variation - 0.5, noise(id, 5u) - 0.5);
  bool continuousFill = glyph == BLOCK || (automatic && glyph == WINDOW);
  vec2 origin = (continuousFill ? p : p + offset);
  float separation = settings.composite.z;
  int taps = separation > 0.0 && glyph != 0u && !continuousFill ? 3 : 1;
  float mark = 0.0;
  float blue = 0.0;
  float red = 0.0;
  for (int i = 0; i < taps; i++) {
    vec2 shift = vec2(separation * 0.30 * (i == 2 ? -1.0 : float(i)), 0.0);
    float mask = markMask(origin + shift, glyph, style, cell, id, variation, aa, automatic);
    if (i == 0) {
      mark = mask;
    } else if (i == 1) {
      blue = max(0.0, mask - mark);
    } else {
      red = max(0.0, mask - mark);
    }
  }

  float fringe = max(blue, red) * 0.68;
  vec3 fringeRGB = mix(vec3(0.04, 0.23, 0.71), vec3(0.69, 0.11, 0.13), red / max(red + blue, 0.0001));
  float readable = smoothstep(1.05, 2.9, min(settings.size.z, settings.size.w));
  float inkAlpha = mix(cell.color.a * 0.62, mark, readable) * ink.a;
  float fringeAlpha = fringe * ink.a * readable;
  vec4 paper = vec4(paperRGB * settings.paper.a, settings.paper.a);
  vec4 registration = vec4(fringeRGB * fringeAlpha, fringeAlpha) + paper * (1.0 - fringeAlpha);
  return vec4(inkRGB * inkAlpha, inkAlpha) + registration * (1.0 - inkAlpha);
}

vec4 drawArt(vec2 pixel) {
  float sourceAlpha = inputCoverage(sourceAt(pixel / settings.size.xy));
  if (sourceAlpha == 0.0) { return vec4(0.0); }

  float print = (settings.grid.z == 9.0 ? 1.7 : 1.0);
  float grain = (noise(uvec2(pixel), 3u) - 0.5) * settings.controls.z * print;
  float blend = 1.0 - smoothstep(7.0, 10.0, min(settings.size.z, settings.size.w));
  if (blend > 0.0 && settings.grid.w >= 6.0 && settings.glyphs.x >= 1.0) {
    Cell cell = artCell(artCellId(pixel / settings.size.zw));
    uint glyph = uint(cell.mark.x) % 512u;
    // Keep solid swatches and paper on exact palette colors.
    if (glyph == BLOCK || glyph == 0u) { blend = 0.0; }
  }

  // Use one sampling loop so drivers can share the glyph code for both tap sizes.
  int denseTaps = blend > 0.0 ? 16 : 0;
  int taps = denseTaps + (blend < 1.0 ? 1 : 0);
  vec4 center = vec4(0.0);
  vec4 filtered = vec4(0.0);
  for (int i = 0; i < taps; i++) {
    bool centerTap = i == denseTaps;
    vec2 offset = centerTap ? vec2(0.0) : (vec2(i % 4, i / 4) - 1.5) * 0.25;
    vec4 sampleInk = drawInk(pixel + offset, grain, centerTap ? 1.0 : 0.5);
    if (centerTap) {
      center = sampleInk;
    } else {
      filtered += sampleInk;
    }
  }
  return mix(center, filtered * 0.0625, blend) * sourceAlpha;
}

vec2 waveOffset(vec2 uv, float heading, float effect, float phase) {
  float strength = settings.motion.z;
  float angle = TURN * heading / 360.0;
  vec2 direction = vec2(cos(angle), sin(angle));
  vec2 across = vec2(-direction.y, direction.x);
  vec2 edge = smoothstep(vec2(0.0), vec2(0.13), min(uv, 1.0 - uv));
  float boundary = mix(1.0, edge.x, abs(direction.x)) * mix(1.0, edge.y, abs(direction.y));
  float column = dot(uv, direction);
  float row = dot(uv, across);
  vec2 cellUV = settings.size.zw / settings.size.xy;
  if (effect == 3.0) {
    float shift = sin(row * 28.0 + 5.0 * sin(column * 8.0) - phase)
      + 0.25 * cos(column * 20.0 + row * 12.0 + 2.0 * phase);
    return direction * cellUV * (boundary * shift * strength * 1.45);
  }
  float anchor = dot(uv, abs(across));
  float slack = smoothstep(0.01, 0.9, anchor) * strength;
  float ripple = TURN * (1.25 * column + 1.65 * row) - phase;
  float shift = sin(ripple) + 0.28 * sin(row * 8.0 + phase * 2.0);
  return direction * cellUV * (boundary * shift * slack * 2.6);
}

vec2 motionSourceUV(vec2 uv) {
  float effect = settings.motion.x;
  if (effect < 3.0) { return uv; }
  float phase = TURN * fract(settings.motion.y);
  uint count = settings.particles.z > 0.5 ? 2u : 1u;
  vec2 offset = vec2(0.0);
  for (uint i = 0u; i < count; i++) {
    float heading = i == 1u ? settings.particles.y : settings.motion.w;
    offset += waveOffset(uv, heading, effect, phase);
  }
  return clamp(uv + offset / float(count), vec2(0.0), vec2(1.0));
}

vec4 drawAura(vec2 pixel) {
  vec2 cellSize = settings.size.zw;
  vec2 grid = pixel / cellSize;
  uvec2 tile = uvec2(grid / 4.0);
  float strength = settings.motion.z;
  float unit = min(cellSize.x, cellSize.y);
  float aa = min(0.22, 0.5 / unit);
  float angle = TURN * settings.motion.w / 360.0;
  vec2 flow = vec2(cos(angle), sin(angle));
  vec2 tangent = normalize(flow * cellSize);
  uvec2 tiles = auraTiles();
  uint columns = uint(settings.grid.x);
  uint shape = uint(settings.particles.x);
  vec4 aura = vec4(0.0);
  // The diagonal stream can carry particles in from the three upstream tiles.
  for (uint i = 0u; i < 4u; i++) {
    ivec2 upstream = ivec2(tile) - ivec2(int(i % 2u), int(i / 2u)) * ivec2(sign(flow));
    if (any(lessThan(upstream, ivec2(0))) || any(greaterThanEqual(upstream, ivec2(tiles)))) { continue; }
    uvec2 id = uvec2(upstream);
    uvec4 stored = texelFetch(uAuraEmitters, upstream, 0);
    AuraEmitter emitter = AuraEmitter(stored.x, uintBitsToFloat(stored.y));
    if (emitter.weight == 0.0 || noise(id, 171u) > 0.52 + 0.48 * strength) { continue; }
    uvec2 cellId = uvec2(emitter.cellIndex % columns, emitter.cellIndex / columns);
    vec2 origin = vec2(cellId) + 0.5;
    float age = fract(fract(settings.motion.y) + noise(id, 173u));
    float travel = age * (1.5 + 1.9 * strength);
    vec2 local = grid - origin - flow * travel;
    vec2 p = local * cellSize / unit;
    float radius = 0.13 + strength * (0.09 + 0.1 * noise(id, 174u));
    float tail = min(travel, 0.4 + 1.1 * strength) * length(flow * cellSize) / unit;
    float tailDistance = length(p - tangent * clamp(dot(p, tangent), -tail, 0.0));
    float mask = inside(tailDistance, radius, aa);
    if (shape == 1u) {
      mask = inside(length(p), radius, aa);
    } else if (shape == 2u) {
      mask = inside(max(abs(p.x), abs(p.y)), radius, aa);
    } else if (shape == 3u) {
      mask = mask * 0.38;
      if (all(lessThan(abs(local), vec2(0.6)))) {
        Cell cell = artCell(cellId);
        uint code = uint(cell.mark.x);
        float echo = markMask(local / 0.86 + 0.5, code % 512u, uint(settings.grid.z),
          cell, cellId, noise(cellId, 11u), aa, code >= 2048u);
        mask = max(mask, echo);
      }
    }
    if (mask <= 0.0) { continue; }
    vec4 ink = markInkColor(artCell(cellId), cellId);
    float life = smoothstep(0.0, 0.1, age) * (1.0 - smoothstep(0.52, 1.0, age));
    float alpha = mask * life * sqrt(emitter.weight) * min(1.0, strength * 1.7) * ink.a;
    aura = vec4(ink.rgb * alpha, alpha) + aura * (1.0 - alpha);
  }
  return aura;
}

vec4 drawCaption(vec2 pixel) {
  uint count = characterAt(CAPTION_START);
  if (count == 0u) { return vec4(0.0); }
  vec2 canvas = settings.size.xy;
  float height = min(settings.caption.z * min(canvas.x, canvas.y), canvas.x / (0.64 * float(count)));
  vec2 size = vec2(height * 0.64, height);
  vec2 origin = settings.caption.xy * canvas - vec2(settings.caption.w * float(count) * size.x, height * 0.5);
  vec2 local = (pixel - origin) / size;
  vec4 backing = vec4(0.0);
  if (settings.captionBacking.a > 0.0) {
    vec2 padding = vec2(0.60, 0.18);
    vec2 margin = min(local + padding, vec2(float(count), 1.0) + padding - local) * size;
    float alpha = smoothstep(-0.5, 0.5, min(margin.x, margin.y)) * settings.captionBacking.a;
    backing = vec4(settings.captionBacking.rgb * alpha, alpha);
  }
  if (any(lessThan(local, vec2(0.0))) || local.x >= float(count) || local.y >= 1.0) { return backing; }
  uint glyph = characterAt(CAPTION_START + 1u + uint(local.x));
  vec2 coordinate = vec2(fract(local.x), local.y);
  float opacity = glyphMask(coordinate, glyph, 0u, clamp(0.44 / size.x, 0.008, 0.13));
  vec4 ink = settings.captionInk;
  uint index = uint(settings.extraction.w);
  if (index > 0u && float(index) <= settings.extraction.x) { ink = vec4(swatchAt(index - 1u).ink.rgb, ink.a); }
  float alpha = opacity * ink.a;
  return vec4(ink.rgb * alpha, alpha) + backing * (1.0 - alpha);
}

vec4 composite(vec2 pixel) {
  vec4 art = drawArt(pixel);
  if (settings.motion.x == 1.0) {
    vec4 aura = drawAura(pixel);
    art = aura + art * (1.0 - aura.a);
  }
  vec4 caption = drawCaption(pixel);
  vec4 result = caption + art * (1.0 - caption.a);
  if ((uint(settings.composite.x) & 2u) != 0u) {
    return vec4(max(vec3(0.0), result.aaa - result.rgb), result.a);
  }
  return result;
}

// Intermediate values use integer attachments to preserve all float bits in core WebGL 2.
// Analysis textures store logical row zero in physical texture row zero.
#if ASCIIX_PASS == 1
layout(location = 0) out uvec4 swatchSource;
layout(location = 1) out uvec4 swatchInk;

void main() {
  uint slot = uint(gl_FragCoord.x);
  if (float(slot) >= settings.extraction.x) {
    swatchSource = uvec4(0u);
    swatchInk = uvec4(0u);
    return;
  }
  Swatch swatch = extractSwatch(slot);
  swatchSource = floatBitsToUint(swatch.sourceColor);
  swatchInk = floatBitsToUint(swatch.ink);
}

#elif ASCIIX_PASS == 2
layout(location = 0) out uvec4 cellColor;
layout(location = 1) out uvec4 cellMark;

void main() {
  Cell cell = analyzeCell(uvec2(gl_FragCoord.xy));
  cellColor = floatBitsToUint(cell.color);
  cellMark = floatBitsToUint(cell.mark);
}

#elif ASCIIX_PASS == 3
layout(location = 0) out uvec4 auraEmitter;

void main() {
  AuraEmitter emitter = findAuraEmitter(uvec2(gl_FragCoord.xy));
  auraEmitter = uvec4(emitter.cellIndex, floatBitsToUint(emitter.weight), 0u, 0u);
}

#elif ASCIIX_PASS == 4
layout(location = 0) out vec4 fragColor;

void main() {
  fragColor = composite(vec2(gl_FragCoord.x, settings.size.y - gl_FragCoord.y));
}

#endif

#else
// Draw a fullscreen triangle with a viewport matching uResolution.
// uImage uses bottom-left UVs. Orient the image during texture upload.
uniform sampler2D uImage;
uniform vec2 uResolution;
uniform float uColumns;
uniform vec3 uInk;
uniform vec3 uPaper;
uniform bool uInvertImage;
uniform bool uInvertColors;
uniform bool uTransparentPaper;
out vec4 fragColor;

// 3 by 5 bitmaps, top row first: space . : = x O # block
const int glyphs[8] = int[8](0x0, 0x2, 0x410, 0xe38, 0xaa8, 0x7b6f, 0x5f7d, 0x7fff);

void main() {
    float width = uResolution.x / max(1.0, uColumns);
    vec2 cellSize = vec2(width, width * 1.5);
    vec2 grid = gl_FragCoord.xy / cellSize;
    vec2 uv = (floor(grid) + 0.5) * cellSize / uResolution;
    vec4 sampleColor = texture(uImage, clamp(uv, 0.0, 1.0));
    float luminance = dot(sampleColor.rgb, vec3(0.2126, 0.7152, 0.0722));
    float density = clamp(uInvertImage ? luminance : 1.0 - luminance, 0.0, 1.0);
    int glyph = glyphs[int(round(density * 7.0))];
    ivec2 pixel = ivec2(fract(grid) * vec2(4.0, 6.0));
    bool mark = false;
    if (pixel.x < 3 && pixel.y < 5) {
        mark = ((glyph >> (pixel.y * 3 + 2 - pixel.x)) & 1) != 0;
    }
    vec3 ink = uInvertColors ? 1.0 - uInk : uInk;
    vec3 paper = uInvertColors ? 1.0 - uPaper : uPaper;
    float coverage = mark ? sampleColor.a : 0.0;
    fragColor = uTransparentPaper ? vec4(ink * coverage, coverage)
                                  : vec4(mix(paper, ink, coverage), 1.0);
}
#endif
