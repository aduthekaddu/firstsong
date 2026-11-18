import { guitarStrings, type Chord } from "../lib/chords";

const frets = [32, 59, 86, 113, 140];
const stringX = (i: number) => 27 + i * 23;

export function ChordDiagram({ chord }: { chord: Chord }) {
  const description = chord.strings.map((position, index) => {
    const string = guitarStrings[index].label;
    if (position === "x") return `${string} muted`;
    if (position === 0) return `${string} open`;
    return `${string} fret ${position[0]}, finger ${position[1]}`;
  }).join(". ");

  return (
    <svg className="fretboard" viewBox="0 0 169 166" role="img">
      <title>{`${chord.fullName}. ${description}.`}</title>
      {chord.strings.map((_, index) => (
        <line key={index} x1={stringX(index)} x2={stringX(index)} y1="32" y2="140" stroke="currentColor" strokeWidth="1.2" />
      ))}
      {frets.map((y, index) => (
        <line key={y} x1="27" x2="142" y1={y} y2={y} stroke="currentColor" strokeWidth={index === 0 ? 4 : 1.2} />
      ))}
      {chord.strings.map((position, index) => {
        const x = stringX(index);
        if (position === "x") {
          return <path key={index} d={`M ${x - 4} 13 l 8 8 m -8 0 l 8 -8`} fill="none" stroke="currentColor" strokeWidth="1.7" />;
        }
        if (position === 0) {
          return <circle key={index} cx={x} cy="17" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.7" />;
        }
        const [fret, finger] = position;
        const y = 32 + (fret - 0.5) * 27;
        return (
          <g key={index}>
            <circle cx={x} cy={y} r="9.5" className="fret-dot" />
            <text x={x} y={y} dy=".34em" textAnchor="middle" className="fret-finger">{finger}</text>
          </g>
        );
      })}
      {["E", "A", "D", "G", "B", "e"].map((string, index) => (
        <text key={string} x={stringX(index)} y="159" textAnchor="middle" fill="currentColor" fontSize="11">{string}</text>
      ))}
    </svg>
  );
}
