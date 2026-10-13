/* Visual verification: seeds the app with real sample media via a
   synthetic file drop, then screenshots every key screen.
   Usage: vite dev on :1420, then `node scripts/shots.mjs [outdir]` */
import { chromium } from "playwright";

const BASE = "http://localhost:1420";
const OUT = process.argv[2] || "/tmp/shots";

const SAMPLES = ["red.mp4", "blue.mp4", "green.mp4", "tone.mp3"];

async function seed(page) {
  const files = [];
  for (const name of SAMPLES) {
    const res = await page.request.get(`${BASE}/samples/${name}`);
    const buf = await res.body();
    files.push({ name, bytes: Array.from(buf) });
  }
  await page.evaluate((files) => {
    const dt = new DataTransfer();
    for (const f of files) {
      dt.items.add(
        new File([new Uint8Array(f.bytes)], f.name, {
          type: f.name.endsWith(".mp3") ? "audio/mpeg" : "video/mp4",
        })
      );
    }
    const main = document.querySelector("main");
    const init = { bubbles: true, cancelable: true, dataTransfer: dt };
    main.dispatchEvent(new DragEvent("dragenter", init));
    main.dispatchEvent(new DragEvent("drop", init));
  }, files);
  // importFiles probes + generates thumbnails; give it time
  await page.waitForFunction(
    () => document.querySelectorAll("img").length >= 3,
    { timeout: 30000 }
  ).catch(() => {});
  await page.waitForTimeout(1500);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot("01-empty-home");

  await seed(page);
  await shot("02-home");

  // Library grid
  await page.getByRole("button", { name: "Library" }).first().click();
  await page.waitForTimeout(600);
  await shot("03-library-grid");

  // Library list
  await page.getByRole("button", { name: "List view" }).click();
  await page.waitForTimeout(600);
  await shot("04-library-list");
  await page.getByRole("button", { name: "Grid view" }).click();

  // Context menu on first card
  const card = page.locator("[role='button']").filter({ hasText: "red.mp4" }).first();
  await card.click({ button: "right" });
  await page.waitForTimeout(500);
  await shot("05-context-menu");
  await page.keyboard.press("Escape");

  // Command palette
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(500);
  await shot("06-palette");
  await page.keyboard.press("Escape");

  // Collapsed sidebar
  await page.getByRole("button", { name: /collapse sidebar/i }).click();
  await page.waitForTimeout(600);
  await shot("07-sidebar-collapsed");
  await page.getByRole("button", { name: /expand sidebar/i }).click();
  await page.waitForTimeout(400);

  // Streams + playlists views
  await page.getByRole("button", { name: "Streams" }).first().click();
  await page.waitForTimeout(500);
  await shot("08-streams");
  await page.getByRole("button", { name: "Playlists" }).first().click();
  await page.waitForTimeout(500);
  await shot("09-playlists");

  // Settings modal
  await page.getByRole("button", { name: "Home" }).first().click();
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(300);
  await page.keyboard.type("settings");
  await page.waitForTimeout(300);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  await shot("10-settings");

  // Player: play the red video
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const play = page.locator("[role='button']").filter({ hasText: "red.mp4" }).first();
  await play.click();
  await page.waitForTimeout(2200); // playing, controls still visible
  await shot("11-player");

  // Player: hover scrubber area for thumbnail tooltip
  const scrub = page.locator("[role='slider']").first();
  const box = await scrub.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.4, box.y, { steps: 5 });
    await page.waitForTimeout(900);
    await shot("12-player-scrubber-hover");
  }

  await browser.close();
  console.log("shots done in", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
