# ASCII Print Studio

Turn an image into ASCII art with adjustable character sets, contours, dots, and blocks. Control the grid one column at a time, assign extracted colors to specific marks, and export a PNG with optional transparency and a label.

## Run the studio

Download the repository and open `index.html` in a browser with WebGPU enabled, such as Chrome or Edge. Load an image, adjust the controls, and select **Export PNG**. See the [customization guide](customization.md) for the controls and example settings.

## Source and build

- [`main.ts`](main.ts) contains the Figma shader source.
- [`preview.template.html`](preview.template.html) contains the standalone interface.
- Run `node build.mjs` to regenerate `index.html`. The build uses Node.js built-ins.

The demo portrait of [Sally Ride](https://www.nasa.gov/wp-content/uploads/2022/11/sally_ride.jpg) is courtesy of NASA. The shader includes public-domain VGA bitmaps from [Daniel Hepper’s font8x8](https://github.com/dhepper/font8x8).
