import { readFile, writeFile } from "node:fs/promises";

const read = (path, encoding) => readFile(new URL(path, import.meta.url), encoding);
const [markup, source, portrait, icon, ramp] = await Promise.all([
  read("preview.template.html", "utf8"),
  read("main.ts", "utf8"),
  read("assets/portrait.jpg", "base64"),
  read("assets/icon.png", "base64"),
  read("assets/ramp.png", "base64"),
]);
const shader = source
  .replace(/^import .*"figma:shaders";\r?\n/m, "")
  .replace(/^export (default )?/gm, "");
const preview = markup
  .replace("/*__SHADER__*/", () => shader)
  .replace("__PORTRAIT__", portrait)
  .replace("__ICON__", icon)
  .replace("__RAMP__", ramp);
await writeFile(new URL("index.html", import.meta.url), preview);
