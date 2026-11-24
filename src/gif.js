export async function openGif(blob) {
  if (typeof ImageDecoder === "undefined" || !await ImageDecoder.isTypeSupported("image/gif")) return null;
  const decoder = new ImageDecoder({ type: "image/gif", data: await blob.arrayBuffer() });
  try {
    await decoder.tracks.ready;
    if (!decoder.tracks.selectedTrack) throw new Error("This GIF has no image track.");
    return decoder;
  } catch (error) {
    decoder.close();
    throw error;
  }
}

export async function fitImage(image, width, height) {
  if ((image.displayWidth ?? image.width) === width && (image.displayHeight ?? image.height) === height) return image;
  try {
    return await createImageBitmap(image, { resizeWidth: width, resizeHeight: height, resizeQuality: "high" });
  } finally {
    image.close();
  }
}

export function gifFrameDelay(image) {
  return image.duration ? image.duration / 1000 : 100;
}

export async function makeGifEncoder(repetitions) {
  const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
  const encoder = GIFEncoder();
  const repeat = repetitions === Infinity ? 0 : repetitions || -1;
  return {
    add({ data, width, height }, delay) {
      // Keep one index for transparency even on opaque frames, so the next frame starts clear.
      const colors = quantize(data, 255);
      const indices = applyPalette(data, colors);
      for (let i = 0; i < indices.length; i += 1) {
        indices[i] = data[i * 4 + 3] < 128 ? 0 : indices[i] + 1;
      }
      encoder.writeFrame(indices, width, height, {
        palette: [[0, 0, 0], ...colors], delay, repeat, transparent: true, transparentIndex: 0,
      });
    },
    finish() {
      encoder.finish();
      return new Blob([encoder.bytesView()], { type: "image/gif" });
    },
  };
}
