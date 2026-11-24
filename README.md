# asciix · Shader Lab

Give a photograph to a handful of punctuation marks and see how well they remember the face. In asciix, a period can be a highlight, a slash can trace a jawline, and a whole crowd of `@`s can stand in for a shadow.

**asciix is an image shader.** The studio runs the effect on the GPU and exports pixels. Zoom in and you can see the individual glyphs. Zoom out and they read as a picture. **Copy** puts a rendered PNG on your clipboard, ready to paste into Figma.

## Grab the shader

| If you want to… | Open this |
| --- | --- |
| Use the complete effect in Figma’s custom shader editor | [Standalone Figma source · main.ts](main.ts). Copy the whole file, including the property definitions at the end. |
| Study or change the production WebGPU renderer | [Shared WebGPU implementation](main.ts). Find `extractPalette` for ink selection, `userGlyph` for tone mapping, and `fs_main` for the final composite. The GPU code embedded here is **WGSL**. |
| Put a small ASCII shader into a WebGL 2 project | [Download the GLSL fragment shader](public/shaders/ascii.frag.glsl), also available from **↓ GLSL** in the studio header. This one-pass edition has eight bitmap marks, column count, two colors, independent inversions, and transparent paper. |

The full renderer adds contour analysis, editable glyph sets, layered marks, extracted inks, print treatments, and captions. The [instructions and recipes](instructions.md) cover both the studio and the GLSL example.

## Make your first print

1. Open the studio with the commands below. The Sally Ride portrait is ready to print. Click **Source** to see the photograph and **Preview** to see the shader.
2. Under **Characters**, enter ` .:oO#@` in **Tone characters**. Keep the leading space. That little pocket of nothing gives highlights somewhere to go.
3. Under **Grid & marks**, try **Columns** at **48**, then **120**. Watch what happens to the eyes. Fewer columns make every character carry more of the portrait.
4. Pick **Transparent paper** to see the studio’s checkerboard. In **Export_pipe**, select PNG or WebP and a scale, then click **Export** to save the image with its alpha channel.

## Run the studio

Use Node.js 20.19+ on the 20.x line or 22.12+ and a WebGPU-capable browser with graphics acceleration enabled.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. **Open image** loads your own artwork. The bundled icon makes a good silhouette test, and the tone ramp makes changes in glyph density easy to see.

To check the production build locally:

```sh
npm run build
npm run preview
```

Deploy the contents of `dist/` over HTTPS. Relative asset paths support subdirectory hosting.

**Export** supports PNG, WebP, and JPEG at **0.5X**, **1X**, **2X**, **3X**, or **4X**. The studio disables scales that would exceed 4096 pixels on the longest side. JPEG fills transparent areas with white. **Copy** always uses PNG at the selected scale.

## What happens to a pixel?

The compute shader samples a neighborhood for each grid cell, estimates its tone and edge direction, and chooses a glyph, dot, block, or contour. The drawing pass turns that choice into ink coverage, adds paper and an optional caption, and writes the final RGBA pixel. That division explains two handy controls. **Invert image** changes which glyphs the shader picks. **Invert colors** keeps those glyphs and flips the finished colors.

## Around the workbench

- [Instructions](instructions.md) · short recipes, Figma setup, and GLSL implementation.
- [Control reference](customization.md) · tone bands, directional glyph slots, palette assignments, and all ten reference treatments.
- [Studio host](src/studio.js) · image upload, WebGPU setup, preview, and image export.
- [Standalone fragment shader](public/shaders/ascii.frag.glsl) · readable GLSL ES 3.00 with the glyph bitmaps included.

The demo portrait is courtesy of [NASA](https://www.nasa.gov/wp-content/uploads/2022/11/sally_ride.jpg). The full shader uses public-domain VGA bitmaps from [Daniel Hepper’s font8x8](https://github.com/dhepper/font8x8). The studio controls use ScrubField, SquishSwitch, and GlideSelect from [React Bits](https://reactbits.dev/).
