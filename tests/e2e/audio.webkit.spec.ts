import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("WebKit records, reloads and exports non-silent audio", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(["microphone"]);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("week-6/");
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByRole("button", { name: "Record final song", exact: true })).toBeEnabled();
  await page.evaluate(() => {
    // Substitute the input signal only: the app still uses the real recorder,
    // storage, playback and WAV encoder in this browser.
    const getUserMedia = async () => {
      document.documentElement.dataset.testAudioState = "input requested";
      const audio = new AudioContext();
      const input = audio.createMediaStreamDestination();
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      tone.frequency.value = 440;
      gain.gain.value = 0.2;
      tone.connect(gain).connect(input);
      tone.start();
      document.documentElement.dataset.testAudioState = audio.state;
      await audio.resume();
      document.documentElement.dataset.testAudioState = audio.state;
      return input.stream;
    };
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    document.documentElement.dataset.testAudioState = "test input installed";
  });
  await page.getByRole("button", { name: "Record final song", exact: true }).click();
  try {
    await expect(page.getByText(/0:02 \/ /)).toBeVisible();
  } catch (error) {
    const status = await page.getByRole("region", { name: "Final song" }).innerText();
    const state = await page.locator("html").getAttribute("data-test-audio-state");
    throw new Error(`Could not start the WebKit recording. Audio state: ${state}. Recorder: ${status}. Page errors: ${errors.join("; ")}`, { cause: error });
  }
  await page.getByRole("button", { name: "Stop recording", exact: true }).click();
  await expect(page.getByText("Take saved on this device.")).toBeVisible();
  await page.reload();
  const playback = page.getByLabel("Final song playback");
  await expect(playback).toHaveAttribute("src", /^blob:/);
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
});
