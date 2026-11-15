// Used by tools/trace-wordmark.py: potrace a black-on-white bitmap, scale 1/4 back to 800 units, optimise with svgo.
import potrace from "potrace";
import { optimize } from "svgo";
import fs from "node:fs";
const [,, inp, out, ot="0.4", turd="12"] = process.argv;
potrace.trace(inp, { turdSize: +turd, optTolerance: +ot, alphaMax: 1, optCurve: true, threshold: 128, blackOnWhite: true, color: "#000" }, (err, svg) => {
  if (err) throw err;
  const d = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(" ");
  const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 516"><path transform="scale(.25)" fill="currentColor" fill-rule="evenodd" d="${d}"/></svg>`;
  const res = optimize(raw, { multipass: true, plugins: ["preset-default", { name: "convertPathData", params: { floatPrecision: 1, applyTransforms: true } }] });
  fs.writeFileSync(out, res.data);
  console.log(out, res.data.length, "bytes");
});
