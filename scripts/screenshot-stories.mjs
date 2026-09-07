/**
 * Regenerates the component screenshots in docs/media/ from the Storybook
 * static build, so every image in the README is a real render of the shipped
 * component rather than a hand-drawn mock.
 *
 *   npm run build:storybook && npm run screenshots
 *
 * The browser is not vendored: playwright-core drives whichever Chrome or
 * Chromium is already on the machine, which keeps `npm ci` free of a 150 MB
 * browser download in CI, where these screenshots are never regenerated.
 */
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat, mkdir } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const STATIC_DIR = join(ROOT, "storybook-static");
const OUT_DIR = join(ROOT, "docs", "media");

/**
 * One image per component (SPEC section 12). Every entry points at that
 * component's `Realistic` story — the one story kind with no `play` function,
 * so what is captured is the story's resting state. Widths are chosen per
 * component because the body is the capture target: a 900px shot of an inline
 * citation chip is mostly empty surface.
 */
const SHOTS = [
  { id: "components-citationchip--realistic", out: "citation-chip.png", width: 720 },
  { id: "components-confidencebadge--realistic", out: "confidence-badge.png", width: 560 },
  { id: "components-tokenmeter--realistic", out: "token-meter.png", width: 680 },
  { id: "components-retrievaltrace--realistic", out: "retrieval-trace.png", width: 880 },
  { id: "components-toolcalltimeline--realistic", out: "tool-call-timeline.png", width: 880 },
  { id: "components-streamingmessage--realistic", out: "streaming-message.png", width: 760 },
  { id: "components-assistantcomposer--realistic", out: "assistant-composer.png", width: 760 },
];

const MIME = {
  ".css": "text/css",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".map": "application/json",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

/** Serves storybook-static over http, because iframe.html's ES modules cannot load from file://. */
function serveStatic(dir) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
    const target = join(dir, normalize(path).replace(/^(\.\.[/\\])+/, ""));
    if (!target.startsWith(dir)) {
      res.writeHead(403).end();
      return;
    }
    stat(target)
      .then((info) => {
        const file = info.isDirectory() ? join(target, "index.html") : target;
        res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
        createReadStream(file).pipe(res);
      })
      .catch(() => res.writeHead(404).end());
  });
  return new Promise((ok) => {
    server.listen(0, "127.0.0.1", () => ok({ server, port: server.address().port }));
  });
}

/** Prefers a system Chrome; falls back to a `npx playwright install chromium` download. */
async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome" });
  } catch {
    return await chromium.launch();
  }
}

async function main() {
  if (!(await stat(STATIC_DIR).catch(() => null))) {
    throw new Error(`${STATIC_DIR} is missing — run \`npm run build:storybook\` first.`);
  }
  await mkdir(OUT_DIR, { recursive: true });

  const { server, port } = await serveStatic(STATIC_DIR);
  const browser = await launchBrowser();
  try {
    for (const shot of SHOTS) {
      const context = await browser.newContext({
        viewport: { width: shot.width, height: 900 },
        deviceScaleFactor: 2,
        reducedMotion: "reduce",
        colorScheme: "light",
      });
      const page = await context.newPage();
      const url = `http://127.0.0.1:${port}/iframe.html?id=${shot.id}&viewMode=story`;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForSelector("#storybook-root > *", { state: "attached" });
      await page.evaluate(() => document.fonts.ready);
      // The caret and the running-tool pulse are time-dependent: freeze them so
      // a rerun produces the same bytes and the diff stays meaningful.
      await page.addStyleTag({
        content: "*, *::before, *::after { animation: none !important; transition: none !important; }",
      });
      await page.locator("body").screenshot({ path: join(OUT_DIR, shot.out) });
      await context.close();
      console.log(`docs/media/${shot.out}  <-  ${shot.id}`);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

await main();
