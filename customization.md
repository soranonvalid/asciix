# ASCII Print Studio customization

Start with **Mixed ASCII** or pick a look for its initial character grid and ink. Character fields, mark mixes, image settings, and custom colors can be edited together. **Edit starter set** copies the current look’s characters into the editable field.

Mixed ASCII uses terminal bitmap characters and defaults to 76 columns for more readable type. In the browser, its default palette puts pale glyphs on charcoal paper. Choose **Custom ink and paper** in **Color & alpha** to set your own colors.

Drag a numeric field sideways to adjust it or click to type an exact value. Press Enter to apply a typed value or Escape to discard it. Up and Down move one step. Hold Shift while dragging or pressing an arrow key to move in steps of ten.

## Control groups

| Group | What it changes |
| --- | --- |
| Characters | Type a general character set or override it in each tone band. Set the two band boundaries, choose how characters are assigned, and give the four directions and two turns their own glyphs. |
| Grid and marks | Set the grid and stroke sizes. Each Columns step changes the grid by one column. Dense glyphs are filtered across fractional pixel boundaries. Use Custom mix by tone to give light, middle, and heavy bands their own dot and block weights. Open Contour and cell shapes for line runs and breaks, silhouette priority, block fill threshold, and the size and layout of dots. |
| Image treatment | Adjust brightness, contrast, and midtones, then posterize, soften, sharpen, engrave, or isolate edges. Shift rows or wave the source inside its existing outline. |
| Color and transparency | Use sampled source colors, spot colors, extracted swatches, or custom ink. Use the ink assignment grid to apply a named swatch to a specific mark and tone. |
| Print finish | Set paper grain, color fringe, ordered dither, and a seed for repeatable variations. Set Color fringe to 0% for crisp single-color registration. |
| Animation | Turn on Animate to add Aura particles, Seed glyph changes, Heatwave row shifts, or a Cloth ripple. Control strength and loop length and export as GIF. |

**Invert image** reverses source tones before glyph selection. **Invert colors** complements the rendered inks and paper while keeping the glyph pattern. **Transparent paper** removes the paper under the glyphs. **Remove source background** keys out bright or dark pixels and also removes any marks in those areas.

The general tonal field accepts up to 128 characters. Each tone band accepts up to 64. Supported characters include printable ASCII, common block and line symbols, and Braille. A space makes an empty cell. Blank edge slots inherit the look. A space in an edge slot suppresses that mark.

Silhouette priority uses transparency or a background knockout to recognize the outside boundary. Interior detail controls the contribution of edges inside the source.

## Extract and assign inks

1. In **Color & alpha**, choose **Extract source palette** for 2–8 representative colors or **Extract dark, middle and light inks** for three luma bands. **Sample image colors** is the continuous per-cell mode. Palette extraction ignores transparent pixels. Use **Exclude keyed source colors** to omit pixels removed by the source background control.
2. Edit a swatch name and lock its ink to keep that value while changing the source. Typing a valid hex value locks the swatch. Use **Extract adjusted source colors** to include the source inversion, brightness, contrast, and midtone adjustments in the color samples.
3. In **Ink assignments**, pick a swatch for any intersection of tone and mark. Auto matches the source color or luma band. For example, assign a blue swatch to **Mid Contour** and charcoal to **Heavy Block**.

In the Figma source, swatch locks are entered as `Name=#RRGGBB` separated by newlines or `;`. The assignment property accepts 12 comma-separated values in light, middle, heavy order for type, contour, block, and dot. Use 0 for Auto or the swatch’s 1-based number.

## Rebuild the reference treatments from the controls

| Reference | Settings to combine |
| --- | --- |
| 1 · Plotter hatch | Put `_`, `\|`, `/`, and `\` in the four straight edge slots. Use connected strokes, a few punctuation marks for tone, and a higher blank cutoff for open areas. |
| 2 · Block terminal | Raise Block mix and cell height. Use a high ink density for connected shadows. Try `□▣▥█` as an editable tonal set. |
| 3 · Microtype | Raise Columns, reduce Glyph size and weight, and use punctuation. Add a small amount of Color fringe for the red and blue offsets. |
| 4 · Color terminal | Use fewer columns and the set ` .VANWGMB`. Choose Three inks by tone with crimson, amber, and cream inks on dark paper. Assign more marks to lighter areas. |
| 5 · Color typewriter | Use ` .,(\|P88B` for rounded forms. Choose Sample image colors and lower the color strength for muted ink over warm paper. |
| 6 · Reverse ASCII | Use pale ink, black paper, and more marks in lighter areas. Mix punctuation and capitals in the tonal field. |
| 7 · Manga line | Use sparse shading with periods and colons. Raise contour emphasis and use connected strokes and curved corner characters. |
| 8 · Fine wire | Use apostrophes, commas, and short dashes, then increase blank cutoff and reduce glyph weight. Use separated strokes to give contours breaks. |
| 9 · Print collage | Use Spot print with mustard and cyan over cream paper. Mix block shadows with characters and add grain or dither. |
| 10 · Dot matrix | Raise Dot mix and tune contour emphasis to keep hollow shapes legible. For an editable dot set, try ` ⠁⠒⠛⠿⣿`. |

## Example mix

Start with **Mixed ASCII**. Type ` .:aox#@` for tonal marks and choose **Sort by ink coverage**. Give the six edge slots an underscore, vertical bar, slash, backslash, and the two parentheses. Set **Contour emphasis** to 83% and **Edge threshold** to 35%.

Set **Dot mix** to 68% and **Block mix** to 73%, then choose **Dots in light tones, blocks in heavy tones**. Select **Three inks by mark** and use charcoal for the tonal glyphs, blue for the contours, and ochre for dots and blocks. Set **Posterize levels** to 9, **Ordered dither** to 25%, and **Color fringe** to 9%.
