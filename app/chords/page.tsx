import type { Metadata } from "next";
import { ChordStage } from "../../components/chord-stage";
import { SiteFrame } from "../../components/site-frame";

export const metadata: Metadata = {
  title: "Ten open chords",
  description:
    "Interactive diagrams and acoustic guitar audio for ten essential beginner open chords: Em, Asus2, C, G, D, Am, A, E, Dm, and D7.",
};

export default function ChordsPage() {
  return (
    <SiteFrame path="/chords/">
      <ChordStage />
    </SiteFrame>
  );
}
