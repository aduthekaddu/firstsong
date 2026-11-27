import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function goStep(page: Page, title: string) {
  await page.getByRole("button", { name: new RegExp(title), exact: false }).filter({ visible: true }).first().click();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
}

async function next(page: Page) {
  await page.getByRole("button", { name: "Next step" }).click();
}

async function record(page: Page, label: string, count = false) {
  await page.getByRole("button", { name: "Record " + label, exact: true }).click();
  if (count) await expect(page.getByText(/Count in · [1-4]\/4/)).toBeVisible();
  const stop = page.getByRole("button", { name: "Stop recording", exact: true });
  await expect(stop).toBeVisible({ timeout: 12_000 });
  // Wait for visible elapsed time so Chromium has produced decodable samples.
  await expect(page.getByText(/0:01 \/ /)).toBeVisible();
  await stop.click();
  await expect(page.getByText("Take saved on this device.")).toBeVisible();
  await expect(page.getByLabel(new RegExp("^" + label + " playback$", "i"))).toHaveAttribute("src", /^blob:/);
}

test("a phone learner carries a hook through the course and downloads audio and words", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(["microphone"]);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(page.getByRole("button", { name: "Start Stage 0" })).toBeVisible();
  await page.locator("#curriculum").getByRole("link", { name: "Open Week 1", exact: true }).click();
  await expect(page).toHaveURL(/\/firstsong\/week-1\//);
  await goStep(page, "Find a title line");
  await page.getByLabel("Four sensory details").fill("Blue rim\nCold handle\nCoffee smell\nSpoon rattle");
  await page.getByLabel("Title line").fill("Rain in my blue cup");
  await next(page);
  await page.getByLabel("Word to land on").fill("blue");
  await next(page);
  await page.getByLabel("Four-bar memo tempo").selectOption("90");
  await record(page, "four-bar memo", true);
  await page.getByRole("link", { name: "Firstsong", exact: true }).click();
  await page.getByRole("link", { name: "Resume Week 1" }).click();
  await expect(page.getByRole("heading", { name: "Make a four-bar memo" })).toBeVisible();
  await expect(page.getByLabel("Title line")).toHaveValue("Rain in my blue cup");
  await expect(page.getByLabel("Four-bar memo playback")).toHaveAttribute("src", /^blob:/);
  await page.getByRole("button", { name: "Finish Week 1" }).click();
  await page.getByRole("link", { name: "Firstsong", exact: true }).click();
  await page.getByRole("link", { name: "Review Week 1" }).click();
  await expect(page).toHaveURL(/\/firstsong\/week-1\/#lesson$/);
  await expect(page.getByRole("heading", { name: "Week 1 checkpoint" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Week 1 checkpoint" })).toBeVisible();
  await expect(page.getByText("Rain in my blue cup", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Four-bar memo playback")).toHaveAttribute("src", /^blob:/);
  const memo = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download take" }).click();
  expect((await memo).suggestedFilename()).toMatch(/^firstsong-memo\./);
  await page.getByRole("link", { name: "Continue to Week 2" }).click();
  await expect(page.getByRole("heading", { name: "Accompany a verse" })).toBeVisible();
  await page.getByLabel("Chords by section").fill("Em | Asus2");
  await next(page);
  await page.getByLabel("Verse 1").fill("My coat drips by the door");
  await page.getByRole("button", { name: "Finish Week 2" }).click();
  await page.getByRole("link", { name: "Continue to Week 3" }).click();
  await page.getByLabel("Chorus", { exact: true }).fill("Rain in my blue cup");
  await next(page);
  await page.getByRole("button", { name: "Finish Week 3" }).click();
  await page.getByRole("link", { name: "Continue to Week 4" }).click();
  await expect(page.getByLabel("Verse 1")).toHaveValue("My coat drips by the door");
  await page.getByLabel("Song title").fill("Blue Cup");
  await page.getByLabel("Verse 2").fill("Morning on the windowsill");
  await next(page);
  await page.getByLabel("How it ends").fill("Let Em ring");
  await page.getByRole("button", { name: "Finish Week 4" }).click();
  await page.getByRole("link", { name: "Continue to Week 5" }).click();
  await page.getByLabel("Arrangement map").fill("Verse quiet, chorus louder");
  await next(page);
  await record(page, "chorus a");
  await record(page, "chorus b");
  await page.getByLabel("One thing to keep").fill("Leave space before blue");
  await page.getByRole("button", { name: "Finish Week 5" }).click();
  await page.getByRole("link", { name: "Continue to Week 6" }).click();
  await next(page);
  await record(page, "final song");
  await page.getByText("Trim the edges", { exact: true }).click();
  await page.getByLabel("End (seconds)").fill("0.7");
  await page.getByRole("button", { name: "Preview trim" }).click();
  await expect(page.getByText("Trimmed preview ready. Your original is unchanged.")).toBeVisible();
  const wavDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download trimmed WAV" }).click();
  const wav = await wavDownload;
  expect(wav.suggestedFilename()).toBe("firstsong-final-trimmed.wav");
  const bytes = await readFile((await wav.path())!);
  expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
  expect(bytes.subarray(8, 12).toString()).toBe("WAVE");
  expect(bytes.length).toBeGreaterThan(44);
  const sheetDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download lyrics and chords" }).click();
  const sheet = await sheetDownload;
  expect(sheet.suggestedFilename()).toBe("blue-cup-lyrics-and-chords.txt");
  expect(await readFile((await sheet.path())!, "utf8")).toContain("Em | Asus2");
  await page.goto("songbook/");
  await expect(page.getByRole("heading", { name: "Your songbook" })).toBeVisible();
  await expect(page.getByText("Blue Cup", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Final song playback", { exact: true })).toHaveAttribute("src", /^blob:/);
  await expect(page.getByLabel("Chorus A playback", { exact: true })).toHaveAttribute("src", /^blob:/);
  await expect(page.getByLabel("Chorus B playback", { exact: true })).toHaveAttribute("src", /^blob:/);
  expect(errors).toEqual([]);
});

test("every exported lesson fits the smallest mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 750 });
  for (const route of ["", "week-1/", "week-2/", "week-3/", "week-4/", "week-5/", "week-6/", "weeks-7-8/", "songbook/", "chords/"]) {
    await page.goto(route || "./");
    expect(await page.locator("h1").count(), route).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), route).toBe(true);
  }
});

test("song edits in different tabs preserve each other and the earlier project", async ({ page, context }) => {
  await context.addInitScript(() => {
    const key = "firstsong:v1:song-project";
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify({ title: "Old title", verseOne: "Old verse", chorus: "Keep the chorus" }));
    }
  });
  const second = await context.newPage();
  await Promise.all([page.goto("week-4/"), second.goto("week-4/")]);
  const title = second.getByLabel("Song title");
  const verse = page.getByLabel("Verse 1");
  await expect(title).toHaveValue("Old title");
  await expect(verse).toHaveValue("Old verse");
  await verse.fill("A new verse from the first tab");
  await title.fill("New title from the second tab");
  await expect(second.getByLabel("Verse 1")).toHaveValue("A new verse from the first tab");
  await expect(page.getByLabel("Song title")).toHaveValue("New title from the second tab");
  await second.reload();
  await expect(title).toHaveValue("New title from the second tab");
  await expect(second.getByLabel("Verse 1")).toHaveValue("A new verse from the first tab");
  await title.fill("");
  await expect(page.getByLabel("Song title")).toHaveValue("");
  await page.goto("songbook/");
  await expect(page.getByText("Keep the chorus", { exact: true })).toBeVisible();
  await expect(page.getByText("A new verse from the first tab", { exact: true })).toBeVisible();
  await page.goto("week-4/");
  await expect(page.getByLabel("Song title")).toBeEnabled();
  await expect(page.getByLabel("Song title")).toHaveValue("");
});

test("mic denial does not strand the learner", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
    value: () => Promise.reject(new DOMException("denied", "NotAllowedError")),
  }));
  await page.goto("week-6/");
  await page.getByRole("button", { name: "Record sound check", exact: true }).click();
  await expect(page.getByText(/Microphone access was declined/)).toBeVisible();
  await next(page);
  await expect(page.getByRole("heading", { name: "Record and trim a full take" })).toBeVisible();
});

test("the songbook opens a take saved in the previous storage format", async ({ page }) => {
  await page.goto("./");
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("firstsong-studio", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("takes");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("takes", "readwrite");
      const blob = new Blob([new Uint8Array([7, 3, 9])], { type: "audio/webm" });
      tx.objectStore("takes").put({ blob, seconds: 1, createdAt: 1 }, "final");
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  });
  await page.goto("songbook/");
  const player = page.getByLabel("Final song playback");
  await expect(player).toHaveAttribute("src", /^blob:/);
  const original = await player.evaluate(async (el: HTMLAudioElement) => {
    const file = await (await fetch(el.src)).blob();
    return { type: file.type, bytes: Array.from(new Uint8Array(await file.arrayBuffer())) };
  });
  expect(original).toEqual({ type: "audio/webm", bytes: [7, 3, 9] });
});

test("mobile navigation and commands keep an active take on the recording page", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(["microphone"]);
  await page.goto("week-6/");
  await page.getByRole("button", { name: "Record sound check", exact: true }).click();
  const stop = page.getByRole("button", { name: "Stop recording", exact: true });
  await expect(stop).toBeVisible();
  const openMenu = page.getByRole("button", { name: "Open navigation menu" });
  const menu = page.getByRole("dialog", { name: "Mobile navigation" });
  await openMenu.click();
  await menu.getByRole("link", { name: "Songbook" }).click();
  await expect(menu).not.toBeVisible();
  const warning = page.getByText("Finish the recording before leaving this lesson.");
  await expect(warning).toBeVisible();
  await expect(page).toHaveURL(/\/firstsong\/week-6\/$/);

  await page.keyboard.press("Control+k");
  const palette = page.getByRole("dialog", { name: "Command index" });
  await palette.getByRole("button", { name: /Open Stage 0/ }).click();
  await expect(palette).not.toBeVisible();
  await expect(page).toHaveURL(/\/firstsong\/week-6\/$/);
  await stop.click();
  await expect(page.getByText("Take saved on this device.")).toBeVisible();
  await expect(warning).not.toBeVisible();
  await openMenu.click();
  await menu.getByRole("link", { name: "Songbook" }).click();
  await expect(page.getByLabel("Sound check playback")).toHaveAttribute("src", /^blob:/);
});

async function enableMicDisconnection(page: Page) {
  await page.addInitScript(() => {
    const media = navigator.mediaDevices;
    const request = media.getUserMedia.bind(media);
    media.getUserMedia = async (constraints) => {
      const stream = await request(constraints);
      document.addEventListener("firstsong-test-disconnect", () => {
        stream.getAudioTracks().forEach((track) => track.stop());
      }, { once: true });
      return stream;
    };
  });
}

test("a disconnected microphone cannot replace the last saved studio take", async ({ page, context }) => {
  await context.grantPermissions(["microphone"]);
  await enableMicDisconnection(page);
  await page.goto("week-6/");
  await record(page, "sound check");
  const player = page.getByLabel("Sound check playback");
  const bytes = () => player.evaluate(async (el: HTMLAudioElement) =>
    Array.from(new Uint8Array(await (await fetch(el.src)).arrayBuffer())));
  const original = await bytes();
  await page.getByRole("button", { name: "Record sound check again", exact: true }).click();
  await expect(page.getByText(/0:01 \/ /)).toBeVisible();
  await page.evaluate(() => document.dispatchEvent(new Event("firstsong-test-disconnect")));
  await expect(page.getByText("The recording was interrupted. Any earlier take is unchanged.")).toBeVisible();
  await page.reload();
  await expect(player).toHaveAttribute("src", /^blob:/);
  expect(await bytes()).toEqual(original);
});

test("the timed verse records past the old 20-second cap and survives a cancelled retake", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(["microphone"]);
  await page.goto("week-2/");
  await next(page);
  await page.getByLabel("Eight-bar verse tempo").selectOption("90");
  await page.getByRole("button", { name: "Record eight-bar verse", exact: true }).click();
  await expect(page.getByText(/Count in · [1-4]\/4/)).toBeVisible();
  await expect(page.getByText("Take saved on this device.")).toBeVisible({ timeout: 30_000 });
  const elapsed = await page.getByRole("region", { name: "Eight-bar verse" }).getByText(/^0:2[0-3]$/).textContent();
  expect(elapsed).toMatch(/^0:2[0-3]$/);
  await page.getByRole("button", { name: "Record eight-bar verse again", exact: true }).click();
  await page.getByRole("button", { name: "Cancel recording" }).click();
  await expect(page.getByText(/Any earlier take is unchanged/)).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Eight-bar verse playback")).toHaveAttribute("src", /^blob:/);
  await expect(page.getByRole("region", { name: "Eight-bar verse" }).getByText(elapsed!)).toBeVisible();
});

test("Stage 0 still keeps and replays a short original hook", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(["microphone"]);
  await enableMicDisconnection(page);
  await page.goto("./#lesson");
  await goStep(page, "Write one line");
  await page.getByLabel("Your concrete line").fill("I’ve got rain in my pocket");
  await goStep(page, "Record your hook");
  await page.getByRole("button", { name: "Record Your hook", exact: true }).click();
  const stop = page.getByRole("button", { name: /Stop recording \(1s\)/ });
  await stop.click();
  await expect(page.getByText(/Take saved in this browser/)).toBeVisible();
  const player = page.getByLabel("Your hook playback");
  await expect(player).toHaveAttribute("src", /^data:audio\//);
  const original = await player.getAttribute("src");
  await page.getByRole("button", { name: "Record Your hook again", exact: true }).click();
  await expect(stop).toBeVisible();
  await page.evaluate(() => document.dispatchEvent(new Event("firstsong-test-disconnect")));
  await expect(page.getByText("The recording was interrupted. Any earlier take is unchanged.")).toBeVisible();
  await page.reload();
  await expect(player).toHaveAttribute("src", original!);
  await page.getByRole("button", { name: "Finish Stage 0" }).click();
  await page.getByRole("link", { name: "Continue to Week 1" }).click();
  await goStep(page, "Find a title line");
  await page.getByRole("button", { name: "Use your Stage 0 line" }).click();
  await expect(page.getByLabel("Title line")).toHaveValue("I’ve got rain in my pocket");
  await page.goto("songbook/");
  await expect(page.getByLabel("Stage 0 hook playback")).toHaveAttribute("src", /^data:audio\//);
});
