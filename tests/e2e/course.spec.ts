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
  expect(strFromU8(files["lyrics-and-chords.txt"])).toContain("The last train passed me");
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
