import { expect, test } from "@playwright/test";
import { guitarStrings } from "../../lib/chords";
import { detectGuitarPitch, guitarAnalyserWindow, tuningFeedback } from "../../lib/pitch";

test("the tuner identifies all six open strings at standard and high audio rates", () => {
  for (const [rate, expectedSize] of [[44100, 2048], [48000, 2048], [88200, 4096], [96000, 4096]]) {
    const size = guitarAnalyserWindow(rate);
    expect(size).toBe(expectedSize);
    const scratch = new Float32Array(size / 2);
    guitarStrings.forEach(({ name, hz }, index) => {
      const wave = Float32Array.from({ length: size }, (_, i) => 0.35 * Math.sin(2 * Math.PI * i * hz / rate));
      const pitch = detectGuitarPitch(wave, rate, scratch);
      expect(pitch, `${name} at ${rate} Hz`).toMatchObject({
        noteName: name,
        nearestStringIndex: index,
        nearestStringCents: 0,
      });
    });
  }
});


test("tuning direction follows the selected string, not the nearest note", () => {
  expect(tuningFeedback(98, guitarStrings[0].hz, null)).toMatchObject({ status: "sharp" });
  expect(tuningFeedback(98, guitarStrings[1].hz, null)).toMatchObject({ status: "flat" });
  expect(tuningFeedback(98, guitarStrings[5].hz, null)).toMatchObject({ status: "check-string" });
});

test("the first valid frame starts at the actual offset and lock requires three close frames", () => {
  const target = guitarStrings[0].hz;
  const slightlySharp = target * 2 ** (11 / 1200);
  const first = tuningFeedback(slightlySharp, target, null);
  expect(first.smoothedCents).toBeCloseTo(11);
  expect(first.status).toBe("sharp");
  expect(tuningFeedback(slightlySharp, target, first).status).toBe("sharp");

  const stableOne = tuningFeedback(target, target, null);
  const stableTwo = tuningFeedback(target, target, stableOne);
  const stableThree = tuningFeedback(target, target, stableTwo);
  expect(stableOne.status).toBe("checking");
  expect(stableTwo.status).toBe("checking");
  expect(stableThree.status).toBe("locked");
  expect(tuningFeedback(slightlySharp, target, stableThree).status).toBe("sharp");
});
