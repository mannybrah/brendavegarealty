import { createRequire } from "module";
import { readFile } from "node:fs/promises";
const require = createRequire("C:/Users/DaVinci/Desktop/4ts-kit-tools/");
const puppeteer = require("puppeteer-core");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const svg = await readFile("public/images/logo-icon.svg", "utf8");
const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();

for (const size of [192, 512]) {
  await page.setViewport({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0;width:${size}px;height:${size}px;background:#0F1D35;display:flex;align-items:center;justify-content:center">
       <div style="width:${Math.round(size * 0.55)}px">${svg.replace(/<svg /, '<svg style="width:100%;height:auto" ')}</div>
     </body>`
  );
  await page.screenshot({ path: `public/images/studio-icon-${size}.png` });
  console.log(`wrote studio-icon-${size}.png`);
}
await browser.close();
