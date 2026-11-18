export const guitarStrings = [
  { name: "E2", label: "Low E", hz: 82.41 },
  { name: "A2", label: "A", hz: 110 },
  { name: "D3", label: "D", hz: 146.83 },
  { name: "G3", label: "G", hz: 196 },
  { name: "B3", label: "B", hz: 246.94 },
  { name: "E4", label: "High E", hz: 329.63 },
] as const;

type StringPosition = "x" | 0 | readonly [fret: 1 | 2 | 3 | 4, finger: 1 | 2 | 3 | 4];

export type Chord = {
  name: string;
  fullName: string;
  strings: readonly [StringPosition, StringPosition, StringPosition, StringPosition, StringPosition, StringPosition];
};

export const em: Chord = { name: "Em", fullName: "E minor", strings: [0, [2, 2], [2, 3], 0, 0, 0] };

export const chords: readonly Chord[] = [
  em,
  { name: "Asus2", fullName: "A suspended second", strings: ["x", 0, [2, 1], [2, 2], 0, 0] },
  { name: "C", fullName: "C major", strings: ["x", [3, 3], [2, 2], 0, [1, 1], 0] },
  { name: "G", fullName: "G major", strings: [[3, 2], [2, 1], 0, 0, 0, [3, 3]] },
  { name: "D", fullName: "D major", strings: ["x", "x", 0, [2, 1], [3, 3], [2, 2]] },
  { name: "Am", fullName: "A minor", strings: ["x", 0, [2, 2], [2, 3], [1, 1], 0] },
  { name: "A", fullName: "A major", strings: ["x", 0, [2, 1], [2, 2], [2, 3], 0] },
  { name: "E", fullName: "E major", strings: [0, [2, 2], [2, 3], [1, 1], 0, 0] },
  { name: "Dm", fullName: "D minor", strings: ["x", "x", 0, [2, 2], [3, 3], [1, 1]] },
  { name: "D7", fullName: "D dominant seventh", strings: ["x", "x", 0, [2, 2], [1, 1], [2, 3]] },
];
