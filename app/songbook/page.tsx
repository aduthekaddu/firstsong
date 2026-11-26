import type { Metadata } from "next";
import Link from "next/link";
import { SiteFrame } from "../../components/site-frame";
import { SongWorkbench } from "../../components/song-workbench";

export const metadata: Metadata = { title: "Your songbook" };

export default function SongbookPage() {
  return (
    <SiteFrame path="/songbook/">
      <section className="shell-wrap pt-12 sm:pt-20" aria-labelledby="songbook-title">
        <div className="max-w-2xl">
          <p className="type-meta mb-3">Practice archive</p>
          <h1 id="songbook-title" className="type-h1 text-[var(--ink)]">Your songbook</h1>
          <p className="type-lead mb-6 mt-4">From your first hum to your full song. Listen back, find your words, and back up a copy whenever you like.</p>
          <Link href="/#curriculum" className="ui-link text-[14px]">Back to the course</Link>
        </div>
        <div className="mt-10 max-w-2xl"><SongWorkbench archive lessonId="songbook" stepId="archive" /></div>
      </section>
    </SiteFrame>
  );
}
