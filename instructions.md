# Print something with asciix

**Pick an image → pick a look → change one setting → export.** Each starting look configures the same shader. You can borrow the dots from one look, the colors from another, and give the result its own alphabet.

## Three ways in

- **In the browser** · Run `npm ci` and `npm run dev`. Open Vite’s URL, then drop an image anywhere in the studio or click **Open image**. Use **Preview** and **Source** to compare.
- **In Figma** · For editable controls, copy the entire [Figma shader entry](main.ts) into the custom shader editor and apply the effect to an image layer. For a finished print, use **Copy** in the studio and paste the PNG onto your canvas.
- **In WebGL 2** · Click **↓ GLSL** in the studio header or open the [fragment shader](public/shaders/ascii.frag.glsl). The integration below draws its eight-glyph ramp in one pass.

## Six small experiments

| Make this | Try these settings | Look for |
| --- | --- | --- |
| Pocket-sized portrait | **Mixed ASCII** → **Columns** 48 → **Tone characters** ` .:oO#@` | Big, readable letters. Try 49 columns to see one step of difference. |
| Pen drawing | **Fine Wire** → **Contour emphasis** 83% → **Stroke joins** Separated | Short strokes along the outline. Raise **Blank tone cutoff** to clear the page. |
| Two-ink poster | **Print Collage** → **Palette** Custom ink and paper → ink `#172554`, paper `#FFD84D` → **Posterize levels** 4 | Four source tone levels printed in navy on yellow. |
| Transparent sticker | Open the sample icon → enable **Transparent paper** → for a white source background, set **Remove source background** to **Bright areas** | The checkerboard shows through the gaps. The PNG carries real alpha. |
| Dot-to-block gradient | Open the ramp → **Dot mix** 65% → **Block mix** 75% → **Mix by tone** Dots in light tones, blocks in heavy tones | Highlights break into dots while shadows gain solid shapes. |
| Printed fabric | Turn on **Animate** → choose **Cloth** → **Angle** 0° → **Strength** 60% → **Loop length** 3 s | The image ripples from the top edge and the fixed character grid redraws it. |

Drag numeric fields sideways, click to type an exact number, or press the up/down arrows for one step. Hold Shift for ten steps. Enter applies typed changes and Escape cancels them.

## Animate a print

Turn on **Animate** next to the image toggles, then open **Animation**. Pick an effect and adjust its **Strength** and **Loop length**.

| Effect | What it moves |
| --- | --- |
| Aura | Shadow and edge glyphs shed drifting marks that carry their ink. Choose characters, streaks, dots, or blocks. |
| Seed | Characters rotate through glyphs of similar ink density from the active character set. |
| Heatwave | Local waves warp the source image before the ASCII shader analyzes it. |
| Cloth | A wind ripple bends the source image from a pinned edge before the ASCII shader analyzes it. |

For **Aura**, **Heatwave**, and **Cloth**, drag the comet to aim the effect. The center gives zero strength and the outer ring gives 100%. Enter an exact **Angle** or **Strength** in the fields below it. Angles are clockwise from the right.

Drag in **Preview** or **Source** to pan. Scroll or pinch to zoom. With the image area focused, use **WASD** or the arrow keys to pan, **+** and **−** to zoom, and **0** to reset. Click the zoom percentage to reset by touch or mouse. Both views share the same position and zoom.

Select **GIF** in **Export Pipe** for a looping animation. A still image exports at 20 frames per second. For an uploaded GIF, export retains the source timing and loop count. With **Animate** on, whole effect cycles fit inside the source loop. **Pause GIF** pauses the uploaded source frames.

PNG, WebP, JPEG, and **Copy** capture the current preview frame. GIF export uses up to 255 visible colors per frame and on-or-off transparency. Loading a moving GIF uses the browser’s WebCodecs GIF decoder.

## Give one contour its own ink

1. In **Color & alpha**, set **Palette** to **Extract source palette**. Try three swatches.
2. Rename one swatch `Blueprint` and enter `#2457D6`. Entering the hex locks that ink for the next image.
3. In **Ink assignments**, choose **Blueprint** for the midtone contour. Leave the other cells on **Auto**.

**Quick inversion test.** Use the sample ramp. Toggle **Invert image** and watch the dense characters swap ends. Toggle it back, then try **Invert colors**. This time the characters stay put while the ink and paper change.

## Embed the GLSL shader

In a Vite app, save the [fragment file](public/shaders/ascii.frag.glsl) beside your JavaScript and import it as text:

```js
import fragmentSource from './ascii.frag.glsl?raw'
```

Compile it as a WebGL 2 fragment shader and link it with this vertex shader. It generates a fullscreen triangle from the vertex ID, so you can draw without a vertex buffer.

```glsl
#version 300 es
void main() {
    vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
```

With a linked `program` and a loaded WebGL texture named `imageTexture`, draw a navy print on cream paper:

```js
gl.useProgram(program)
const uniform = name => gl.getUniformLocation(program, name)
const w = gl.drawingBufferWidth
const h = gl.drawingBufferHeight
gl.viewport(0, 0, w, h)
gl.activeTexture(gl.TEXTURE0)
gl.bindTexture(gl.TEXTURE_2D, imageTexture)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
gl.uniform1i(uniform('uImage'), 0)
gl.uniform2f(uniform('uResolution'), w, h)
gl.uniform1f(uniform('uColumns'), 76)
gl.uniform3f(uniform('uInk'), 0.08, 0.14, 0.25)
gl.uniform3f(uniform('uPaper'), 1.0, 0.96, 0.84)
gl.drawArrays(gl.TRIANGLES, 0, 3)
```

Set `uTransparentPaper`, `uInvertImage`, or `uInvertColors` with `gl.uniform1i(uniform('uTransparentPaper'), 1)`, substituting the desired name, then draw again. For a transparent canvas use an alpha-enabled, premultiplied WebGL context. Match the drawing buffer’s aspect ratio to your source and orient the texture with its bottom row at UV y = 0.

For the studio’s complete implementation, follow `setup(device, frame)` and `render(device, frame)` in [main.ts](main.ts). The [studio host](src/studio.js) shows how to supply the input texture, output texture, persistent state, and property values.
