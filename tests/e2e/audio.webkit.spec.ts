import { expect, test, type Locator, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { unzipSync } from "fflate";
import { readFile } from "node:fs/promises";

async function installTone(page: Page, delayed = false) {
  await page.evaluate((leadIn) => {
    // Substitute the input signal only: the app still uses the real recorder,
    // storage, playback and WAV encoder in this browser.
    const getUserMedia = async () => {
      document.documentElement.dataset.testAudioState = "input requested";
      const audio = new AudioContext();
      const input = audio.createMediaStreamDestination();
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      tone.frequency.value = 440;
      gain.gain.value = leadIn ? 0 : 0.2;
      if (leadIn) gain.gain.setValueAtTime(0.2, audio.currentTime + 0.45);
      tone.connect(gain).connect(input);
      tone.start();
      document.documentElement.dataset.testAudioState = audio.state;
      await audio.resume();
      document.documentElement.dataset.testAudioState = audio.state;
      Object.defineProperty(window, "firstsongTestAudioTrack", { configurable: true, value: input.stream.getAudioTracks()[0] });
      return input.stream;
    };
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    document.documentElement.dataset.testAudioState = "test input installed";
    const start = MediaRecorder.prototype.start;
    MediaRecorder.prototype.start = function (timeslice?: number) {
      this.addEventListener("dataavailable", ({ data }) => {
        document.documentElement.dataset.testRecordedBytes = `${data.size} bytes (${data.type})`;
      });
      return start.call(this, timeslice);
    };
  }, delayed);
}

const interrupted = "The recording was interrupted. Any earlier take is unchanged.";

async function muteAndUnmute(page: Page) {
  const before = await page.evaluate(() => {
    const track: MediaStreamTrack = Object.getOwnPropertyDescriptor(window, "firstsongTestAudioTrack")?.value;
    const state = track.readyState;
    Object.defineProperty(track, "muted", { configurable: true, value: true });
    track.dispatchEvent(new Event("mute"));
    Object.defineProperty(track, "muted", { configurable: true, value: false });
    track.dispatchEvent(new Event("unmute"));
    return state;
  });
  expect(before).toBe("live");
}

function digest(player: Locator) {
  return player.evaluate(async (audio: HTMLAudioElement) => {
    const bytes = await (await fetch(audio.src)).arrayBuffer();
    return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
  });
}

test("WebKit records, reloads and exports non-silent audio", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(["microphone"]);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("week-6/");
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByRole("button", { name: "Record final song", exact: true })).toBeEnabled();
  await installTone(page);
  await page.getByRole("button", { name: "Record final song", exact: true }).click();
  try {
    await expect(page.getByText(/0:02 \/ /)).toBeVisible();
  } catch (error) {
    const status = await page.getByRole("region", { name: "Final song" }).innerText();
    const state = await page.locator("html").getAttribute("data-test-audio-state");
    throw new Error(`Could not start the WebKit recording. Audio state: ${state}. Recorder: ${status}. Page errors: ${errors.join("; ")}`, { cause: error });
  }
  await page.getByRole("button", { name: "Stop recording", exact: true }).click();
  try {
    await expect(page.getByText("Take saved on this device.")).toBeVisible();
  } catch (error) {
    const status = await page.getByRole("region", { name: "Final song" }).innerText();
    const bytes = await page.locator("html").getAttribute("data-test-recorded-bytes");
    throw new Error(`Could not save the WebKit recording. Recorded bytes: ${bytes}. Recorder: ${status}. Page errors: ${errors.join("; ")}`, { cause: error });
  }
  const playback = page.getByLabel("Final song playback");
  await expect(playback).toHaveAttribute("src", /^blob:/);
  const original = await digest(playback);
  await page.getByRole("button", { name: "Record final song again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop recording", exact: true })).toBeVisible();
  await muteAndUnmute(page);
  await expect(page.getByText(interrupted)).toBeVisible();
  await page.reload();
  await expect(playback).toHaveAttribute("src", /^blob:/);
  expect(await digest(playback)).toEqual(original);
  await expect.poll(() => playback.evaluate((element: HTMLAudioElement) => element.readyState)).toBeGreaterThan(0);

  await page.getByText("Trim the edges", { exact: true }).click();
  await page.getByLabel("Start (seconds)").fill("0.2");
  await page.getByLabel("End (seconds)").fill("1.1");
  await page.getByRole("button", { name: "Preview trim" }).click();
  await expect(page.getByText("Trimmed preview ready. Your original is unchanged.")).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download trimmed WAV" }).click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe("firstsong-final-trimmed.wav");
  const wav = await readFile((await file.path())!);
  expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
  expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
  expect(wav.readUInt32LE(40)).toBeGreaterThan(10_000);
  let peak = 0;
  for (let offset = 44; offset < wav.length; offset += 2) {
    peak = Math.max(peak, Math.abs(wav.readInt16LE(offset)));
  }
  expect(peak).toBeGreaterThan(256);

  await page.getByRole("button", { name: "Back up your song" }).click();
  await expect(page.getByText("Ready to save: your song notes and 1 original take.")).toBeVisible();
  const archiveDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save ZIP" }).click();
  const archive = await archiveDownload;
  const files = unzipSync(await readFile((await archive.path())!));
  const track = Object.keys(files).find((name) => name.startsWith("takes/final."));
  expect(track).toBeDefined();
  expect(Array.from(createHash("sha256").update(files[track!]).digest())).toEqual(original);

});


test("WebKit saves a Stage 0 hook and plays it after reload", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(["microphone"]);
  await page.goto("./#lesson");
  await page.getByRole("navigation", { name: "Session steps" }).getByRole("button", { name: /Record your hook/i }).click();
  const start = page.getByRole("button", { name: "Record Your hook", exact: true });
  await expect(start).toBeEnabled();
  await installTone(page);
  await start.click();
  await page.getByRole("button", { name: /Stop recording \(1s\)/ }).click();
  await expect(page.getByText("Take saved in this browser and ready to play back.")).toBeVisible();
  const playback = page.getByLabel("Your hook playback");
  await expect(playback).toHaveAttribute("src", /^data:audio\//);
  const original = await digest(playback);
  await page.getByRole("button", { name: "Record Your hook again", exact: true }).click();
  await expect(page.getByRole("button", { name: /Stop recording \(\d+s\)/ })).toBeVisible();
  await muteAndUnmute(page);
  await expect(page.getByText(interrupted)).toBeVisible();
  await page.reload();
  await expect(playback).toHaveAttribute("src", /^data:audio\//);
  expect(await digest(playback)).toEqual(original);
  await playback.evaluate(async (audio: HTMLAudioElement) => {
    audio.muted = true;
    await audio.play();
  });
  await expect.poll(() => playback.evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThan(0.05);
});

test("WebKit keeps a separate Writing Room take across reopening and exports it", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(["microphone"]);
  await page.goto("songbook/");
  await page.getByRole("button", { name: "New blank song" }).click();
  await expect(page.getByRole("heading", { name: "Writing room" })).toBeVisible();
  await page.getByLabel("Song title").fill("Window open");
  await page.getByLabel("Chorus").fill("Let the late light in");
  await installTone(page);
  await page.getByRole("button", { name: "Record demo take", exact: true }).click();
  await expect(page.getByText(/0:01 \/ /)).toBeVisible();
  await page.getByRole("button", { name: "Stop recording", exact: true }).click();
  await expect(page.getByText("Take saved on this device.")).toBeVisible();
  const playback = page.getByLabel("Demo take playback");
  await expect(playback).toHaveAttribute("src", /^blob:/);
  const original = await digest(playback);
  await page.getByRole("link", { name: "Back to your songbook" }).click();
  await expect(page.getByLabel("Final song playback")).toHaveCount(0);
  await page.getByRole("link", { name: "Window open" }).click();
  await expect(page.getByLabel("Chorus")).toHaveValue("Let the late light in");
  await expect(playback).toHaveAttribute("src", /^blob:/);
  expect(await digest(playback)).toEqual(original);
  await page.getByRole("button", { name: "Back up your song" }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save ZIP" }).click();
  const files = unzipSync(await readFile((await (await pending).path())!));
  const take = Object.keys(files).find((name) => name.startsWith("takes/recording."));
  expect(take).toBeDefined();
  expect(Array.from(createHash("sha256").update(files[take!]).digest())).toEqual(original);
});

test("an open Writing Room refreshes playback and invalidates its ZIP after a retake in another tab", async ({ page, context }) => {
  await context.grantPermissions(["microphone"]);
  await page.goto("songbook/");
  await page.getByRole("button", { name: "New blank song" }).click();
  await page.getByLabel("Song title").fill("Both windows");
  await installTone(page);

  async function capture(first: boolean) {
    await page.getByRole("button", { name: first ? "Record demo take" : "Record demo take again", exact: true }).click();
    await expect(page.getByText(first ? /0:01 \/ / : /0:02 \/ /)).toBeVisible();
    await page.getByRole("button", { name: "Stop recording", exact: true }).click();
    await expect(page.getByText("Take saved on this device.")).toBeVisible();
  }

  await capture(true);
  const other = await context.newPage();
  await other.goto(page.url());
  const player = other.getByLabel("Demo take playback");
  await expect(player).toHaveAttribute("src", /^blob:/);
  const before = await digest(player);
  const prepare = other.getByRole("button", { name: "Back up your song" });
  const save = other.getByRole("button", { name: "Save ZIP" });
  await prepare.click();
  await expect(save).toBeVisible();

  await capture(false);
  const writerPlayer = page.getByLabel("Demo take playback");
  await expect(writerPlayer).toHaveAttribute("src", /^blob:/);
  const updated = await digest(writerPlayer);
  expect(updated).not.toEqual(before);
  await expect(save).toHaveCount(0);
  await expect.poll(async () => {
    try { return await digest(player); } catch { return []; }
  }).toEqual(updated);

  const individual = other.waitForEvent("download");
  await other.getByRole("button", { name: "Download original" }).click();
  expect(Array.from(createHash("sha256").update(await readFile((await (await individual).path())!)).digest())).toEqual(updated);
  await prepare.click();
  const zip = other.waitForEvent("download");
  await save.click();
  const files = unzipSync(await readFile((await (await zip).path())!));
  const original = Object.keys(files).find((file) => file.startsWith("takes/recording."));
  expect(original).toBeDefined();
  expect(Array.from(createHash("sha256").update(files[original!]).digest())).toEqual(updated);
});

test("optional passes export full-length WAVs without trimming silence or replacing originals", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(["microphone"]);
  await page.goto("weeks-7-8/");
  await installTone(page, true);

  for (const [label, filename] of [
    ["Guitar pass (optional)", "firstsong-guitar.wav"],
    ["Voice pass (optional)", "firstsong-vocal.wav"],
  ]) {
    const take = page.getByRole("region", { name: label, exact: true });
    await take.getByRole("button", { name: `Record ${label.toLowerCase()}`, exact: true }).click();
    await expect(take.getByText(/0:01 \/ /)).toBeVisible();
    await take.getByRole("button", { name: "Stop recording" }).click();
    await expect(take.getByText("Take saved on this device.")).toBeVisible();
    const playback = take.getByLabel(`${label} playback`);
    await expect(playback).toHaveAttribute("src", /^blob:/);
    const hash = await digest(playback);
    const decoded = await playback.evaluate(async (element: HTMLAudioElement) => {
      const audio = new AudioContext();
      try {
        const stored = await audio.decodeAudioData(await (await fetch(element.src)).arrayBuffer());
        return { frames: stored.length, channels: stored.numberOfChannels, rate: stored.sampleRate };
      } finally {
        await audio.close();
      }
    });

    await take.getByRole("button", { name: "Prepare WAV", exact: true }).click();
    await expect(take.getByText("Full-length WAV ready. Your original is unchanged.")).toBeVisible();
    const pending = page.waitForEvent("download");
    await take.getByRole("button", { name: "Save WAV", exact: true }).click();
    const file = await pending;
    expect(file.suggestedFilename()).toBe(filename);
    const wav = await readFile((await file.path())!);
    expect(wav.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(wav.subarray(8, 12).toString("ascii")).toBe("WAVE");
    expect(wav.readUInt16LE(20)).toBe(1);
    expect(wav.readUInt16LE(22)).toBe(decoded.channels);
    expect(wav.readUInt32LE(24)).toBe(decoded.rate);
    expect(wav.readUInt16LE(34)).toBe(16);
    expect(wav.readUInt32LE(40)).toBe(decoded.frames * decoded.channels * 2);
    expect(wav.length).toBe(44 + decoded.frames * decoded.channels * 2);

    let leadingPeak = 0;
    let audiblePeak = 0;
    const first50ms = 44 + Math.floor(decoded.rate * 0.05) * decoded.channels * 2;
    for (let index = 44; index < wav.length; index += 2) {
      const level = Math.abs(wav.readInt16LE(index));
      if (index < first50ms) leadingPeak = Math.max(leadingPeak, level);
      else audiblePeak = Math.max(audiblePeak, level);
    }
    expect(leadingPeak).toBeLessThan(256);
    expect(audiblePeak).toBeGreaterThan(256);
    expect(await digest(playback)).toEqual(hash);
    const original = page.waitForEvent("download");
    await take.getByRole("button", { name: "Download original", exact: true }).click();
    expect(Array.from(createHash("sha256").update(await readFile((await (await original).path())!)).digest())).toEqual(hash);
  }
});
