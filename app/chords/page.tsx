import type { Metadata } from "next";
import { ChordDiagram } from "../../components/chord-diagram";
import { SiteFrame } from "../../components/site-frame";
import { chords } from "../../lib/chords";

export const metadata: Metadata = { title: "Chord library" };

export default function ChordsPage() {
  return (
    <SiteFrame path="/chords/">
      <header className="section-header reference-header">
        <div>
          <p className="eyebrow"><span /> Guitar reference</p>
          <h1>Chord library</h1>
          <p>Ten open chords to look up while you play. Start with Em if this is your first session.</p>
        </div>
      </header>
      <aside className="diagram-key" aria-label="How to read chord diagrams">
        <p><strong>○</strong> Play the string open</p>
        <p><strong>×</strong> Skip the string</p>
        <p><strong>1–4</strong> Index to pinky</p>
        <p><strong>E → e</strong> Thickest to thinnest</p>
      </aside>
      <ul className="chord-grid" role="list">
        {chords.map((chord) => (
          <li key={chord.name} className="chord-card">
            <h2>{chord.name}</h2>
            <p>{chord.fullName}</p>
            <ChordDiagram chord={chord} />
          </li>
        ))}
      </ul>
    </SiteFrame>
  );
}
