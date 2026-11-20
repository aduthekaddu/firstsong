import type { Metadata } from "next";
import { LessonPlayer } from "../components/lesson-player";
import { SiteFrame } from "../components/site-frame";
import { stageZero } from "../lib/lessons";

export const metadata: Metadata = {
  title: "Firstsong: Learn guitar and write your first song",
};

export default function HomePage() {
  return (
    <SiteFrame path="/">
      <LessonPlayer lesson={stageZero} home />
    </SiteFrame>
  );
}
