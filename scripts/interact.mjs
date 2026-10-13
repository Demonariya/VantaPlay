/* Interaction test: playlist flow + real ffmpeg.wasm transcode.
   Usage: vite dev on :1420, then `node scripts/interact.mjs [outdir]` */
import { chromium } from "playwright";

const BASE = "http://localhost:1420";
const OUT = process.argv[2] || "/tmp/shots2";
const SAMPLES = ["red.mp4", "blue.mp4", "green.mp4", "tone.mp3"];

async function seed(page) {
  const files = [];
  for (const name of SAMPLES) {
    const res = await page.request.get(`${BASE}/samples/${name}`);
    files.push({ name, bytes: Array.from(await res.body()) });
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
  await page.waitForFunction(() => document.querySelectorAll("img").length >= 3, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
  const results = {};

  await page.goto(BASE, { waitUntil: "networkidle" });
  await seed(page);

  // Playlist flow: right-click red.mp4 -> Add to Playlist -> New playlist
  const card = page.locator("[role='button']").filter({ hasText: "red.mp4" }).first();
  await card.click({ button: "right" });
  await page.waitForTimeout(400);
  await page.getByRole("menuitem", { name: "Add to Playlist" }).click();
  await page.waitForTimeout(300);
  await page.getByRole("menuitem", { name: /new playlist/i }).click();
  await page.waitForTimeout(500);
  await page.keyboard.type("Test Mix");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Playlists" }).first().click();
  await page.waitForTimeout(600);
  await shot("20-playlist-created");
  results.playlistVisible = await page.getByText("Test Mix").count();

  // Convert flow: right-click blue.mp4 -> Convert / Stream
  await page.getByRole("button", { name: "Library" }).first().click();
  await page.waitForTimeout(500);
  const blue = page.locator("[role='button']").filter({ hasText: "blue.mp4" }).first();
  await blue.click({ button: "right" });
  await page.waitForTimeout(400);
  await page.getByRole("menuitem", { name: "Convert / Stream" }).click();
  await page.waitForTimeout(600);
  await shot("21-convert-dialog");

  // Choose MP3, start, wait for done (ffmpeg.wasm, single thread)
  const formatSelect = page.getByLabel("Format");
  await formatSelect.selectOption("mp3");
  await page.getByRole("button", { name: /start conversion/i }).click();
  try {
    await page.getByText(/Done:/).waitFor({ timeout: 180000 });
    results.transcode = "done";
  } catch {
    results.transcode = "timeout";
  }
  await shot("22-convert-done");

  // Add converted file to library, verify it appears
  if (results.transcode === "done") {
    await page.getByRole("button", { name: /add to library/i }).click();
    await page.waitForTimeout(2500);
    // the dialog closes itself after adding
    results.convertedInLibrary = await page.getByText("blue.mp3").count();
  }
  await shot("23-after-convert");

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
