import { chromium } from "playwright";
const BASE = "http://localhost:1420";
const OUT = process.argv[2] || "/tmp/shots3";
async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
  await page.goto(BASE, { waitUntil: "networkidle" });
  const res = await page.request.get(`${BASE}/samples/red.mp4`);
  const bytes = Array.from(await res.body());
  await page.evaluate((bytes) => {
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array(bytes)], "red.mp4", { type: "video/mp4" }));
    const main = document.querySelector("main");
    const init = { bubbles: true, cancelable: true, dataTransfer: dt };
    main.dispatchEvent(new DragEvent("dragenter", init));
    main.dispatchEvent(new DragEvent("drop", init));
  }, bytes);
  await page.waitForFunction(() => document.querySelectorAll("img").length >= 1, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.locator("[role='button']").filter({ hasText: "red.mp4" }).first().click();
  await page.waitForTimeout(2000);

  await page.getByRole("button", { name: "Volume" }).click();
  await page.waitForTimeout(500);
  await shot("30-volume-popover");

  // Keep controls awake: the player auto-hides them after 3s idle.
  const wake = async () => {
    await page.mouse.move(720, 830, { steps: 3 });
    await page.waitForTimeout(400);
  };

  await page.keyboard.press("Escape");
  await wake();
  await page.getByRole("button", { name: /subtitles and audio/i }).click();
  await page.waitForTimeout(500);
  await shot("31-track-menu");

  await page.keyboard.press("Escape");
  await wake();
  await page.getByRole("button", { name: /playback speed/i }).click();
  await page.waitForTimeout(500);
  await shot("32-speed-menu");

  await page.keyboard.press("Escape");
  // sidebar with new Settings item
  await page.keyboard.press("Escape"); // close player
  await page.waitForTimeout(600);
  await shot("33-sidebar-settings");
  await browser.close();
  console.log("done");
}
main().catch((e) => { console.error(e.message); process.exit(1); });
