#version 300 es
precision highp float;
precision highp int;

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
