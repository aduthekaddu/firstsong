import { expect, test, type Page } from "@playwright/test";
import { strFromU8, unzipSync } from "fflate";
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
  await expect(page.getByLabel(new RegExp("^" + label.replace(/ again$/, "") + " playback$", "i"))).toHaveAttribute("src", /^blob:/);
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
  await expect(page.getByText("Listen to your first hook", { exact: true })).toHaveCount(0);
  await page.getByLabel("Word to land on").fill("blue");
  await next(page);
  await page.getByLabel("Four-bar memo tempo").selectOption("90");
  await record(page, "four-bar memo", true);
  await page.goto("week-6/");
  await expect(page.getByRole("heading", { name: "Test your sound" })).toBeVisible();
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
  await page.getByLabel("Chorus", { exact: true }).fill("Leave a light on again");
  await next(page);
  await record(page, "verse and chorus");
  await page.getByRole("button", { name: "Finish Week 3" }).click();
  await expect(page.getByLabel("Verse and chorus playback", { exact: true })).toHaveAttribute("src", /^blob:/);
  await page.getByRole("link", { name: "Continue to Week 4" }).click();
  await expect(page.getByLabel("Verse 1")).toHaveValue("My coat drips by the door");
  await page.getByLabel("Song title").fill("Été / à: Goa");
  await page.getByLabel("Verse 2").fill("Morning on the windowsill");
  await next(page);
  await page.getByLabel("How it ends").fill("Let Em ring");
  await record(page, "full draft");
  await page.getByRole("button", { name: "Finish Week 4" }).click();
  await expect(page.getByLabel("Full draft playback", { exact: true })).toHaveAttribute("src", /^blob:/);
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
  expect(sheet.suggestedFilename().normalize("NFC")).toBe("été-à-goa-lyrics-and-chords.txt");
  const directSheet = await readFile((await sheet.path())!, "utf8");
  expect(directSheet).toContain("Été / à: Goa");
  expect(directSheet).toContain("Em | Asus2");
  expect(directSheet).toContain("Hook\nRain in my blue cup");
  expect(directSheet).toContain("Chorus\nLeave a light on again");
  await page.getByRole("button", { name: "Back up your song" }).click();
  const guidedZip = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save ZIP", exact: true }).press("Enter");
  const files = unzipSync(await readFile((await (await guidedZip).path())!));
  expect(strFromU8(files["lyrics-and-chords.txt"])).toEqual(directSheet);
  await page.setViewportSize({ width: 320, height: 750 });
  await page.getByRole("button", { name: "Finish Week 6" }).click();
  await expect(page.getByRole("heading", { name: "Week 6 checkpoint" })).toBeVisible();
  await expect(page.getByLabel("Final song playback")).toHaveAttribute("src", /^blob:/);
  await expect(page.getByRole("button", { name: "Review last step" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Optional: layers and mix", exact: true }).click();
  await expect(page).toHaveURL(/\/firstsong\/weeks-7-8\/$/);
  await expect(page.getByRole("heading", { name: "Record the layers" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Week 6 checkpoint" })).toBeVisible();
  await page.getByRole("link", { name: "Start your next song", exact: true }).click();
  await expect(page).toHaveURL(/\/firstsong\/songbook\/#new-song$/);
  await expect(page.getByRole("heading", { name: "Write another song" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Independent songs" })).toHaveCount(0);
  await page.getByRole("button", { name: "New blank song" }).click();
  await expect(page.getByLabel("Song title")).toBeEnabled();
  await expect(page.getByLabel("Song title")).toHaveValue("");
  await page.getByRole("link", { name: "Back to your songbook" }).click();
  await expect(page.getByRole("heading", { name: "Your songbook" })).toBeVisible();
  await expect(page.getByText("Été / à: Goa", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Final song playback", { exact: true })).toHaveAttribute("src", /^blob:/);
  await expect(page.getByLabel("Chorus A playback", { exact: true })).toHaveAttribute("src", /^blob:/);
  await expect(page.getByLabel("Chorus B playback", { exact: true })).toHaveAttribute("src", /^blob:/);
  await expect(page.getByLabel("Verse and chorus playback", { exact: true })).toHaveAttribute("src", /^blob:/);
  await expect(page.getByLabel("Full draft playback", { exact: true })).toHaveAttribute("src", /^blob:/);
  await page.getByRole("link", { name: "Firstsong", exact: true }).click();
  await page.getByRole("link", { name: "Review Week 6", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Week 6 checkpoint" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("opening a lesson does not start it, but saving a first-step chord plan does", async ({ page, context }) => {
  await page.goto("week-6/");
  await expect(page.getByRole("heading", { name: "Test your sound" })).toBeVisible();
  await page.getByRole("link", { name: "Firstsong", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start Stage 0" })).toBeVisible();
  const lesson = await context.newPage();
  await lesson.goto("week-2/");
  await lesson.getByLabel("Chords by section").fill("Verse: Em | Asus2");
  await page.getByRole("link", { name: "Resume Week 2" }).click();
  await expect(page.getByRole("heading", { name: "Change to a second chord" })).toBeVisible();
  await expect(page.getByLabel("Chords by section")).toHaveValue("Verse: Em | Asus2");
});

test("the final lyric and chord cue stays readable beside the recorder at 320px", async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await context.grantPermissions(["microphone"]);
  await page.goto("week-6/");
  await next(page);
  const summary = page.getByText("Your lyrics and chords", { exact: true });
  await expect(summary).toHaveCount(0);

  const verse = "My coat drips by the door\nThe train rolls in at four";
  const chorus = "Blue cup in the rain\nLeave a light on again";
  await page.evaluate(({ verse, chorus }) => {
    localStorage.setItem("firstsong:v1:song-project", JSON.stringify({
      title: "Blue Cup", hook: "Rain in my blue cup", verseOne: verse, chorus, verseTwo: "A".repeat(160), chords: "Verse: Em | Asus2",
      ending: "Let Em ring", arrangement: "Strum quietly\n".repeat(30),
    }));
  }, { verse, chorus });
  await page.reload();
  const cue = page.getByRole("region", { name: "Your lyrics and chords" });
  await expect(cue).toBeHidden();
  await summary.press("Enter");
  await expect(cue).toBeVisible();
  expect(await cue.locator('[data-cue="verseOne"]').textContent()).toBe(verse);
  expect(await cue.locator('[data-cue="chorus"]').textContent()).toBe(chorus);
  expect(await cue.locator('[data-cue="hook"]').textContent()).toBe("Rain in my blue cup");
  await expect(cue.locator('[data-cue="verseOne"]')).toHaveCSS("white-space", "pre-wrap");
  await expect(cue.getByText("Verse: Em | Asus2", { exact: true })).toBeVisible();
  await expect(cue.getByText("Let Em ring", { exact: true })).toBeAttached();
  expect(await cue.evaluate((el) => el.scrollHeight > el.clientHeight && el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.getByRole("button", { name: "Record final song", exact: true }).click();
  const stop = page.getByRole("button", { name: "Stop recording", exact: true });
  // Line up the cue the way a learner would before playing. Check that
  // this single view has both the cue and the stop button.
  await summary.evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
  await expect(stop).toBeInViewport();
  await expect(cue).toBeInViewport();
  await cue.focus();
  await page.keyboard.press("PageDown");
  await expect.poll(() => cue.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await expect(page.getByText(/0:01 \/ /)).toBeVisible();
  await stop.click();
  await expect(page.getByText("Take saved on this device.")).toBeVisible();
  await expect(page.getByLabel("Final song playback")).toHaveAttribute("src", /^blob:/);
  await expect(cue).toBeVisible();
});

test("chord diagrams let a learner sound unmuted strings with keys or a tap", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 750 });
  await page.goto("week-2/");
  const em = page.getByRole("group", { name: "E minor chord controls" });
  const asus = page.getByRole("group", { name: "A suspended second chord controls" });
  const lowE = em.getByRole("button", { name: "Play Low E, open", exact: true });
  const highE = em.getByRole("button", { name: "Play High E, open", exact: true });
  const a = em.getByRole("button", { name: "Play A, fret 2", exact: true });
  await expect(em.getByRole("img", { name: /guitar chord diagram/ })).toBeVisible();
  await expect(asus.getByRole("img", { name: /Low E string muted/ })).toBeVisible();
  await expect(asus.getByRole("button", { name: /^Play / })).toHaveCount(5);
  await expect(asus.getByRole("button", { name: /^Play Low E/ })).toHaveCount(0);

  await lowE.focus();
  await page.keyboard.press("Enter");
  await expect(lowE).toHaveAttribute("data-playing", "true");
  await expect(lowE).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Tab");
  await expect(a).toBeFocused();
  await page.keyboard.press("Space");
  await expect(a).toHaveAttribute("data-playing", "true");
  await highE.click();
  await expect(highE).toHaveAttribute("data-playing", "true");
  await expect(highE).not.toHaveAttribute("data-playing", "true");

  await em.getByRole("button", { name: "Strum E minor", exact: true }).press("Enter");
  await expect(highE).toHaveAttribute("data-playing", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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
  await page.getByRole("button", { name: "Finish Week 6" }).click();
  await expect(page.getByText(/No take saved yet/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Start your next song" })).toHaveAttribute("href", /\/songbook\/#new-song$/);
  await expect(page.getByRole("link", { name: "Optional: layers and mix" })).toBeVisible();
  await page.getByRole("button", { name: "Record your final take", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Record and trim a full take" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Record final song", exact: true })).toBeEnabled();
});

test("the Week 6 checkpoint does not report unreadable audio as an empty take", async ({ page }) => {
  await page.addInitScript(() => {
    const get = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (key) {
      if (this.name === "takes" && key === "final") throw new DOMException("Simulated unreadable take", "UnknownError");
      return get.call(this, key);
    };
  });
  await page.goto("week-6/");
  await next(page);
  await page.getByRole("button", { name: "Finish Week 6" }).click();
  await expect(page.getByText("Couldn’t read the saved take in this browser.")).toBeVisible();
  await expect(page.getByText(/No take saved yet/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Record your final take" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Review last step" })).toBeVisible();
});

test("leaving the tuner releases a microphone granted after the step has closed", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(["microphone"]);
  await page.goto("./#lesson");
  await page.evaluate(() => {
    const media = navigator.mediaDevices;
    const request = media.getUserMedia.bind(media);
    media.getUserMedia = async (constraints) => {
      const stream = await request(constraints);
      Object.defineProperty(window, "firstsongTestMicTrack", { value: stream.getAudioTracks()[0], configurable: true });
      await new Promise<void>((resolve) => {
        document.addEventListener("firstsong-test-grant", () => resolve(), { once: true });
        document.documentElement.dataset.testMicPending = "true";
      });
      return stream;
    };
  });
  await page.getByRole("button", { name: "Listen with mic" }).click();
  await expect(page.getByRole("button", { name: "Waiting for microphone…" })).toBeDisabled();
  await expect(page.locator("html")).toHaveAttribute("data-test-mic-pending", "true");
  const trackState = () => page.evaluate(() => Object.getOwnPropertyDescriptor(window, "firstsongTestMicTrack")?.value.readyState);
  expect(await trackState()).toBe("live");
  await next(page);
  await expect(page.getByRole("heading", { name: "Find four steady beats" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Waiting for microphone…" })).toHaveCount(0);
  await page.evaluate(() => document.dispatchEvent(new Event("firstsong-test-grant")));
  await expect.poll(trackState).toBe("ended");
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
    localStorage.setItem("firstsong:v1:take:hook", JSON.stringify({
      audio: "data:audio/mp4; codecs=opus;base64,AQIDBA==", seconds: 2, caption: "My old hook",
    }));
    localStorage.setItem("firstsong:v1:song-project", JSON.stringify({ chorus: "बारिश", chords: "Em | Asus2" }));
  });
  await page.goto("songbook/");
  const player = page.getByLabel("Final song playback");
  await expect(player).toHaveAttribute("src", /^blob:/);
  const original = await player.evaluate(async (el: HTMLAudioElement) => {
    const file = await (await fetch(el.src)).blob();
    return { type: file.type, bytes: Array.from(new Uint8Array(await file.arrayBuffer())) };
  });
  expect(original).toEqual({ type: "audio/webm", bytes: [7, 3, 9] });

  await page.getByRole("button", { name: "Back up your song" }).click();
  await expect(page.getByText("Ready to save: your song notes and 2 original takes.")).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save ZIP" }).press("Enter");
  const file = await pending;
  expect(file.suggestedFilename()).toMatch(/^firstsong-backup-\d{4}-\d{2}-\d{2}\.zip$/);
  const files = unzipSync(await readFile((await file.path())!));
  expect(Object.keys(files).sort()).toEqual([
    "lyrics-and-chords.txt", "manifest.json", "takes/final.webm", "takes/stage-0-hook.m4a",
  ]);
  expect(Array.from(files["takes/final.webm"])).toEqual(original.bytes);
  expect(Array.from(files["takes/stage-0-hook.m4a"])).toEqual([1, 2, 3, 4]);
  expect(strFromU8(files["lyrics-and-chords.txt"])).toContain("बारिश");
  expect(strFromU8(files["lyrics-and-chords.txt"])).toContain("Em | Asus2");
  const manifest = JSON.parse(strFromU8(files["manifest.json"]));
  expect(manifest).toMatchObject({
    format: "firstsong-song-backup", version: 1, song: { chorus: "बारिश" },
    recordings: [
      { id: "stage-0-hook", file: "takes/stage-0-hook.m4a", caption: "My old hook", mimeType: "audio/mp4;codecs=opus" },
      { id: "final", file: "takes/final.webm", createdAt: 1 },
    ],
  });

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


test("an empty songbook explains what to back up rather than generating an empty file", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 750 });
  await page.goto("songbook/");
  await page.getByRole("button", { name: "Back up your song" }).click();
  await expect(page.getByText("There’s nothing to back up yet. Write a line or record a take first.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save ZIP" })).toHaveCount(0);
});

test("independent songs keep their own words and audio without changing the course", async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await context.grantPermissions(["microphone"]);
  await page.goto("week-1/");
  await goStep(page, "Find a title line");
  await page.getByLabel("Title line").fill("My original guided song");
  await goStep(page, "Make a four-bar memo");
  await page.getByRole("button", { name: "Finish Week 1" }).click();
  await expect(page.getByRole("heading", { name: "Week 1 checkpoint" })).toBeVisible();

  await page.goto("weeks-7-8/");
  await next(page);
  await page.getByRole("link", { name: "Start your next song" }).click();
  await expect(page).toHaveURL(/\/songbook\/#new-song$/);
  await page.getByRole("button", { name: "New blank song" }).click();
  await expect(page).toHaveURL(/\/songbook\/write\/\?song=[a-f0-9]{32}$/);
  const first = page.url();
  const title = page.getByLabel("Song title");
  await expect(title).toBeEnabled();
  await expect(title).toHaveValue("");
  await expect(page.getByLabel("First line")).toHaveValue("");
  await title.fill("Station lights");
  await page.getByLabel("Chorus", { exact: true }).fill("The station lights stay on");
  await page.getByLabel("First line").fill("The empty train passed me");
  await page.getByLabel("Chords by section").fill("Em | Asus2");

  await page.getByRole("button", { name: "Record demo take", exact: true }).click();
  const stop = page.getByRole("button", { name: "Stop recording", exact: true });
  await expect(stop).toBeVisible();
  await page.getByRole("link", { name: "Back to your songbook" }).click();
  await expect(page.getByText("Finish the recording before leaving this lesson.")).toBeVisible();
  await expect(page).toHaveURL(first);
  await expect(page.getByText(/0:01 \/ /)).toBeVisible();
  await stop.click();
  await expect(page.getByText("Take saved on this device.")).toBeVisible();
  await page.reload();
  await expect(title).toHaveValue("Station lights");
  const player = page.getByLabel("Demo take playback");
  await expect(player).toHaveAttribute("src", /^blob:/);
  const original = await player.evaluate(async (audio: HTMLAudioElement) =>
    Array.from(new Uint8Array(await (await fetch(audio.src)).arrayBuffer())));

  await page.getByRole("button", { name: "Back up your song" }).click();
  const save = page.getByRole("button", { name: "Save ZIP" });
  await expect(save).toBeEnabled();
  // A lyric edit invalidates the prepared copy instead of exporting stale text.
  await page.getByLabel("First line").fill("The last train passed me");
  await expect(save).toHaveCount(0);
  await page.getByRole("button", { name: "Back up your song" }).click();
  const pending = page.waitForEvent("download");
  await save.click();
  const archive = await pending;
  expect(archive.suggestedFilename()).toMatch(/^firstsong-station-lights-.*\.zip$/);
  const files = unzipSync(await readFile((await archive.path())!));
  const track = Object.keys(files).find((file) => file.startsWith("takes/recording."));
  expect(track).toBeDefined();
  expect(Array.from(files[track!])).toEqual(original);
  expect(strFromU8(files["lyrics-and-chords.txt"])).toContain("First line\nThe last train passed me");
  expect(strFromU8(files["lyrics-and-chords.txt"])).toContain("Chorus\nThe station lights stay on");
  expect(strFromU8(files["manifest.json"])).not.toContain("My original guided song");

  await page.getByRole("link", { name: "Back to your songbook" }).click();
  await expect(page.getByText("My original guided song", { exact: true })).toBeVisible();
  const saved = page.getByRole("link", { name: "Station lights" });
  await expect(saved).toBeVisible();
  await page.getByRole("button", { name: "New blank song" }).click();
  await expect(title).toBeEnabled();
  await expect(title).toHaveValue("");
  expect(page.url()).not.toBe(first);
  await expect(player).toHaveCount(0);
  await title.fill("Sunday platform");
  await page.getByRole("link", { name: "Back to your songbook" }).click();
  await expect(page.getByRole("link", { name: "Sunday platform" })).toBeVisible();
  await saved.click();
  await expect(title).toHaveValue("Station lights");
  await expect(player).toHaveAttribute("src", /^blob:/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto("week-1/#lesson");
  await expect(page.getByRole("heading", { name: "Week 1 checkpoint" })).toBeVisible();
  await expect(page.getByText("My original guided song", { exact: true })).toBeVisible();
});

test("two Writing Room ZIPs use different Unicode song titles in their download names", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-28T13:00:00Z"));
  await page.goto("songbook/");
  for (const [title, fileStem] of [["बारिश", "बारिश"], ["नई धुन", "नई-धुन"]]) {
    await page.getByRole("button", { name: "New blank song" }).click();
    await page.getByLabel("Song title").fill(title);
    await page.getByRole("button", { name: "Back up your song" }).click();
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save ZIP", exact: true }).press("Enter");
    const archive = await pending;
    expect(archive.suggestedFilename().normalize("NFC")).toBe(`firstsong-${fileStem}-2026-11-28.zip`);
    const files = unzipSync(await readFile((await archive.path())!));
    expect(JSON.parse(strFromU8(files["manifest.json"])).song.title).toBe(title);
    expect(strFromU8(files["lyrics-and-chords.txt"])).toBe(`${title}\n`);
    await page.getByRole("link", { name: "Back to your songbook" }).click();
  }
});

test("an unsaved guided lyric survives the next step and a refresh from another tab", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("week-1/");
  await goStep(page, "Find a title line");
  const line = page.getByLabel("Title line");
  const warning = page.getByText("Some edits are only available in this tab. Copy them before reloading or closing.");
  await line.fill("Old saved hook");
  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem;
    document.documentElement.dataset.rejectHook = "true";
    Storage.prototype.setItem = function (key, value) {
      if (key === "firstsong:v1:song-project:hook" && document.documentElement.dataset.rejectHook === "true") {
        throw new DOMException("Simulated quota exceeded", "QuotaExceededError");
      }
      setItem.call(this, key, value);
    };
  });
  await line.fill("Rain against the window");
  await expect(warning).toBeVisible();
  await next(page);
  await expect(page.getByRole("heading", { name: "Try two or three notes" })).toBeVisible();
  await expect(line).toHaveValue("Rain against the window");
  await expect(warning).toBeVisible();

  const other = await context.newPage();
  await other.goto("week-1/");
  await expect(other.getByLabel("Title line")).toHaveValue("Old saved hook");
  await other.evaluate(() => localStorage.setItem("firstsong:v1:song-project", JSON.stringify({ keyword: "window" })));
  await expect(page.getByLabel("Word to land on")).toHaveValue("window");
  await expect(line).toHaveValue("Rain against the window");
  await expect(warning).toBeVisible();
  await other.close();

  await page.evaluate(() => delete document.documentElement.dataset.rejectHook);
  await line.fill("Rain on the window");
  await expect(warning).toHaveCount(0);
  await page.reload();
  await expect(line).toHaveValue("Rain on the window");
});

test("temporary Writing Room edits are isolated to their own draft", async ({ page }) => {
  await page.goto("songbook/");
  const create = page.getByRole("button", { name: "New blank song" });
  await create.click();
  const title = page.getByLabel("Song title");
  const line = page.getByLabel("First line");
  const warning = page.getByText("Some edits are only available in this tab. Copy them before reloading or closing.");
  await title.fill("First draft");
  await page.evaluate(() => {
    const id = new URL(location.href).searchParams.get("song");
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === `firstsong:v1:draft:${id}:field:hook`) throw new DOMException("Simulated quota exceeded", "QuotaExceededError");
      setItem.call(this, key, value);
    };
  });
  await line.fill("The last train passed me");
  await expect(warning).toBeVisible();
  await page.getByRole("link", { name: "Back to your songbook" }).click();
  await create.click();
  await expect(line).toBeEnabled();
  await expect(line).toHaveValue("");
  await expect(warning).toHaveCount(0);
  await page.getByRole("link", { name: "Back to your songbook" }).click();
  await page.getByRole("link", { name: "First draft", exact: true }).click();
  await expect(line).toHaveValue("The last train passed me");
  await expect(warning).toBeVisible();
});

test("opening a Writing Room URL on a different device does not create or share the song", async ({ page }) => {
  await page.goto("songbook/write/?song=0123456789abcdef0123456789abcdef");
  await expect(page.getByText(/This song isn’t saved in this browser/)).toBeVisible();
  await expect(page.getByLabel("Song title")).toHaveCount(0);
  await page.getByRole("link", { name: "Open your songbook", exact: true }).click();
  await expect(page.getByRole("list", { name: "Independent songs" })).toHaveCount(0);
});

test("reviewing from an older tab keeps a completed week and its checkpoint", async ({ page, context }) => {
  const older = await context.newPage();
  await Promise.all([page.goto("week-1/"), older.goto("week-1/")]);
  await expect(older.getByRole("heading", { name: "Four slow downstrokes" })).toBeVisible();
  await next(page);
  await next(page);
  await next(page);
  await page.getByRole("button", { name: "Finish Week 1" }).click();
  await expect(page.getByRole("heading", { name: "Week 1 checkpoint" })).toBeVisible();
  await expect(older.getByRole("heading", { name: "Four slow downstrokes" })).toBeVisible();
  await next(older);
  await expect(older.getByText("4 of 4 steps done", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Review last step" }).click();
  await expect(page.getByRole("heading", { name: "Make a four-bar memo" })).toBeVisible();
  await older.goto("./");
  await older.getByRole("link", { name: "Review Week 1" }).click();
  await expect(older.getByRole("heading", { name: "Week 1 checkpoint" })).toBeVisible();
  await expect(older.getByText("4 of 4 steps done", { exact: false })).toBeVisible();
});

test("an open Songbook picks up new course takes from another tab", async ({ page, context }) => {
  await context.grantPermissions(["microphone"]);
  const shelf = await context.newPage();
  await shelf.goto("songbook/");
  await expect(shelf.getByRole("button", { name: "Back up your song" })).toBeEnabled();
  const player = shelf.getByLabel("Sound check playback");
  await expect(player).toHaveCount(0);

  await page.goto("week-6/");
  await record(page, "sound check");
  await expect(player).toHaveAttribute("src", /^blob:/);
});

test("the Stage 0 mic tuner uses the chosen physical string for peg direction", async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await context.grantPermissions(["microphone"]);
  await page.addInitScript(() => {
    const createAnalyser = AudioContext.prototype.createAnalyser;
    AudioContext.prototype.createAnalyser = function () {
      const analyser = createAnalyser.call(this);
      const rate = this.sampleRate;
      analyser.getFloatTimeDomainData = (target) => {
        const hz = Number(document.documentElement.dataset.tuningTestHz ?? "98");
        for (let i = 0; i < target.length; i++) target[i] = 0.35 * Math.sin(2 * Math.PI * hz * i / rate);
      };
      return analyser;
    };
  });
  await page.goto("./#lesson");
  await page.getByRole("button", { name: "Listen with mic", exact: true }).click();
  const selector = page.getByRole("combobox", { name: "Target string" });
  await expect(selector).toHaveValue("0");
  await expect(page.getByText("Low E is sharp · loosen peg slowly", { exact: true })).toBeVisible();
  await selector.selectOption("1");
  await expect(page.getByText("A is flat · tighten peg slowly", { exact: true })).toBeVisible();
  await selector.selectOption("5");
  await expect(page.getByText(/Far from the target\. Check the string/)).toBeVisible();

  await selector.selectOption("0");
  await page.evaluate(() => { document.documentElement.dataset.tuningTestHz = String(82.41 * 2 ** (11 / 1200)); });
  await expect(page.getByText("+11¢", { exact: true })).toBeVisible();
  await expect(page.getByText("Low E is in tune", { exact: true })).toHaveCount(0);
  await page.evaluate(() => { document.documentElement.dataset.tuningTestHz = "82.41"; });
  await expect(page.getByText("Low E is in tune", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Stop mic tuner" }).click();
  await expect(selector).toHaveCount(0);
});

test("a line-only Stage 0 backup works and independent songs never include the guided lyric", async ({ page, context }) => {
  const original = "बारिश on the windowsill";
  const edited = "बारिश on the empty steps";
  const laterHook = "Clouds over the train yard";
  await page.goto("./#lesson");
  await goStep(page, "Write one line");
  await page.getByLabel("Your concrete line").fill(original);
  const book = await context.newPage();
  await book.goto("songbook/");

  const prepare = book.getByRole("button", { name: "Back up your song" });
  const save = book.getByRole("button", { name: "Save ZIP" });
  async function downloadBackup() {
    const pending = book.waitForEvent("download");
    await save.click();
    const files = unzipSync(await readFile((await (await pending).path())!));
    return {
      sheet: strFromU8(files["lyrics-and-chords.txt"]),
      manifest: JSON.parse(strFromU8(files["manifest.json"])),
    };
  }

  await prepare.click();
  const first = await downloadBackup();
  expect(first.sheet).toContain(`Stage 0 first line\n${original}`);
  expect(first.manifest.stageZero).toEqual({ firstLine: original, rhythm: null });
  expect(first.manifest.recordings).toEqual([]);

  await prepare.click();
  await expect(save).toBeVisible();
  await page.getByLabel("Your concrete line").fill(edited);
  await expect(save).toHaveCount(0);
  await page.goto("week-1/");
  await goStep(page, "Find a title line");
  await page.getByLabel("Title line").fill(laterHook);
  await expect(book.getByText(laterHook, { exact: true })).toBeVisible();
  await prepare.click();
  const guided = await downloadBackup();
  expect(guided.sheet).toContain(`Stage 0 first line\n${edited}`);
  expect(guided.sheet).toContain(`Hook\n${laterHook}`);
  expect(guided.manifest.stageZero.firstLine).toBe(edited);
  expect(guided.manifest.song.hook).toBe(laterHook);

  await book.getByRole("button", { name: "New blank song" }).click();
  await book.getByLabel("Song title").fill("Tin roof");
  await prepare.click();
  const independent = await downloadBackup();
  expect(independent.manifest).not.toHaveProperty("stageZero");
  expect(independent.sheet).not.toContain(edited);
  expect(independent.sheet).not.toContain(laterHook);
});

test("a partial ZIP keeps playable audio and Unicode lyrics when an old recording is unreadable", async ({ page, context }) => {
  await context.grantPermissions(["microphone"]);
  await page.goto("week-6/");
  await next(page);
  await record(page, "final song");
  const player = page.getByLabel("Final song playback");
  const saved = await player.evaluate(async (audio: HTMLAudioElement) => ({
    bytes: Array.from(new Uint8Array(await (await fetch(audio.src)).arrayBuffer())),
  }));
  expect(saved.bytes.length).toBeGreaterThan(1000);
  await expect.poll(() => player.evaluate((audio: HTMLAudioElement) => audio.readyState)).toBeGreaterThan(0);

  await page.evaluate(() => {
    localStorage.setItem("firstsong:v1:take:hook", "{invalid legacy audio");
    localStorage.setItem("firstsong:v1:song-project:chorus", "बारिश in the open window");
  });
  await page.goto("songbook/");
  await expect(page.getByText("बारिश in the open window", { exact: true })).toBeVisible();
  const area = page.getByRole("region", { name: "Song backup" });
  await area.getByRole("button", { name: "Back up your song" }).click();
  await expect(area.getByText("Partial backup ready. The ZIP lists what couldn’t be read.")).toBeVisible();
  await area.getByText("What couldn’t be read", { exact: true }).click();
  await expect(area.getByText("Stage 0 hook", { exact: true })).toBeVisible();
  const pending = page.waitForEvent("download");
  await area.getByRole("button", { name: "Save partial ZIP" }).click();
  const archive = await pending;
  expect(archive.suggestedFilename()).toMatch(/-partial\.zip$/);
  const files = unzipSync(await readFile((await archive.path())!));
  expect(strFromU8(files["lyrics-and-chords.txt"])).toContain("बारिश in the open window");
  expect(strFromU8(files["backup-notes.txt"])).toContain("Stage 0 hook");
  const manifest = JSON.parse(strFromU8(files["manifest.json"]));
  expect(manifest.omissions).toEqual([{ id: "stage-0-hook", label: "Stage 0 hook" }]);
  expect(manifest.recordings).toHaveLength(1);
  expect(Array.from(files[manifest.recordings[0].file])).toEqual(saved.bytes);
  expect(await page.evaluate(() => localStorage.getItem("firstsong:v1:take:hook"))).toBe("{invalid legacy audio");
});

test("blocked IndexedDB is not mistaken for an empty song and text is still downloadable", async ({ page, context }) => {
  await context.addInitScript(() => {
    IDBFactory.prototype.open = function () { throw new DOMException("blocked", "SecurityError"); };
  });
  await page.goto("songbook/");
  const area = page.getByRole("region", { name: "Song backup" });
  const prepare = area.getByRole("button", { name: "Back up your song" });
  const save = area.getByRole("button", { name: "Save partial ZIP" });
  await prepare.click();
  await expect(area.getByText("Couldn’t read enough saved work to make a ZIP. Nothing was deleted.")).toBeVisible();
  await expect(save).toHaveCount(0);
  await expect(area.getByText(/There’s nothing to back up yet/)).toHaveCount(0);
  await page.evaluate(() => localStorage.setItem("firstsong:v1:line", JSON.stringify("Original course line")));
  await page.reload();
  await prepare.click();
  const guidedPending = page.waitForEvent("download");
  await save.click();
  const guided = unzipSync(await readFile((await (await guidedPending).path())!));
  expect(strFromU8(guided["lyrics-and-chords.txt"])).toContain("Original course line");
  const guidedManifest = JSON.parse(strFromU8(guided["manifest.json"]));
  expect(guidedManifest.omissions).toContainEqual({ id: "final", label: "Final song" });
  expect(guidedManifest.recordings).toEqual([]);

  await page.getByRole("button", { name: "New blank song" }).click();
  await page.getByLabel("Song title").fill("Another morning");
  await page.getByLabel("First line").fill("खिड़की");
  await prepare.click();
  const draftPending = page.waitForEvent("download");
  await save.click();
  const draft = unzipSync(await readFile((await (await draftPending).path())!));
  expect(strFromU8(draft["lyrics-and-chords.txt"])).toContain("खिड़की");
  expect(strFromU8(draft["lyrics-and-chords.txt"])).not.toContain("Original course line");
  const draftManifest = JSON.parse(strFromU8(draft["manifest.json"]));
  expect(draftManifest.omissions).toEqual([{ id: "recording", label: "Demo take" }]);
});

for (const occupied of [false, true]) {
  test(`a refused IndexedDB write keeps the current take in this tab (${occupied ? "retake" : "empty slot"})`, async ({ page, context }) => {
    await context.grantPermissions(["microphone"]);
    await page.goto("week-6/");
    await next(page);
    const player = page.getByLabel("Final song playback");
    const temporary = page.getByText("This take is only available in this tab. Download it before closing or reloading.");
    const audioBytes = () => player.evaluate(async (audio: HTMLAudioElement) =>
      Array.from(new Uint8Array(await (await fetch(audio.src)).arrayBuffer())));

    let previous: number[] = [];
    if (occupied) {
      await record(page, "final song");
      previous = await audioBytes();
    }
    await page.evaluate(() => {
      const put = IDBObjectStore.prototype.put;
      document.documentElement.dataset.rejectTakeWrite = "true";
      IDBObjectStore.prototype.put = function (value, key) {
        const request = put.call(this, value, key);
        if (this.name === "takes" && key === "final" && document.documentElement.dataset.rejectTakeWrite === "true") {
          this.transaction.abort();
        }
        return request;
      };
    });
    await page.getByRole("button", { name: occupied ? "Record final song again" : "Record final song", exact: true }).click();
    await expect(page.getByText(/0:02 \/ /)).toBeVisible();
    await page.getByRole("button", { name: "Stop recording", exact: true }).click();
    await expect(temporary).toBeVisible();
    await expect(player).toHaveAttribute("src", /^blob:/);
    await expect.poll(audioBytes).not.toEqual(previous);
    const latest = await audioBytes();
    expect(latest.length).toBeGreaterThan(0);

    const other = await context.newPage();
    await other.goto("week-6/");
    const otherPlayer = other.getByLabel("Final song playback");
    if (occupied) {
      await expect(otherPlayer).toHaveAttribute("src", /^blob:/);
      expect(await otherPlayer.evaluate(async (audio: HTMLAudioElement) =>
        Array.from(new Uint8Array(await (await fetch(audio.src)).arrayBuffer())))).toEqual(previous);
    } else {
      await expect(other.getByRole("button", { name: "Record final song", exact: true })).toBeEnabled();
      await expect(otherPlayer).toHaveCount(0);
    }
    await other.close();

    // Returning to the recording step remounts the recorder in the same tab.
    await page.getByRole("button", { name: "Previous step" }).click();
    await next(page);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(temporary).toBeVisible();
    await expect(player).toHaveAttribute("src", /^blob:/);
    expect(await audioBytes()).toEqual(latest);
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download original" }).click();
    expect(await readFile((await (await pending).path())!)).toEqual(Buffer.from(latest));

    await page.getByRole("button", { name: "Back up your song" }).click();
    await expect(page.getByText("Ready to save: your song notes and 1 original take.")).toBeVisible();
    const archive = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save ZIP" }).press("Enter");
    const files = unzipSync(await readFile((await (await archive).path())!));
    const entry = Object.keys(files).find((name) => name.startsWith("takes/final."));
    expect(entry).toBeDefined();
    expect(Buffer.from(files[entry!])).toEqual(Buffer.from(latest));

    await page.evaluate(() => delete document.documentElement.dataset.rejectTakeWrite);
    await record(page, "final song again");
    await expect(temporary).toHaveCount(0);
    await expect.poll(audioBytes).not.toEqual(latest);
    const committed = await audioBytes();
    await page.reload();
    await expect(player).toHaveAttribute("src", /^blob:/);
    expect(await audioBytes()).toEqual(committed);
  });
}
