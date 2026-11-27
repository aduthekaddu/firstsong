import { expect, test } from "@playwright/test";
import { guitarStrings } from "../../lib/chords";
import { detectGuitarPitch, guitarAnalyserWindow } from "../../lib/pitch";

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
