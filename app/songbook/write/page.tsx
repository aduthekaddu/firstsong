import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteFrame } from "../../../components/site-frame";
import { RecordingLink as Link } from "../../../components/recording-navigation";
import { WritingRoom } from "../../../components/writing-room";

export const metadata: Metadata = { title: "Writing room" };

export default function WritingRoomPage() {
  return (
    <SiteFrame path="/songbook/">
      <section className="shell-wrap pt-12 sm:pt-20" aria-labelledby="writing-room-title">
        <div className="max-w-2xl">
          <Link href="/songbook/#new-song" className="ui-link text-[14px]">Back to your songbook</Link>
          <h1 id="writing-room-title" className="type-h1 mt-5 text-[var(--ink)]">Writing room</h1>
          <p className="type-lead mb-8 mt-4">No lessons to finish here. Work in any order. Words and recordings stay in this browser until you download a copy.</p>
          <Suspense fallback={<p role="status" className="text-[15px]">Opening your song…</p>}>
            <WritingRoom />
          </Suspense>
        </div>
      </section>
    </SiteFrame>
  );
}
