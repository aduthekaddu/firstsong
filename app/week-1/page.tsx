import type { Metadata } from "next";
import { LessonPlayer } from "../../components/lesson-player";
import { SiteFrame } from "../../components/site-frame";
import { weekOne } from "../../lib/lessons";

export const metadata: Metadata = { title: weekOne.title };

export default function WeekOnePage() {
  return <SiteFrame path="/week-1/"><LessonPlayer lesson={weekOne} /></SiteFrame>;
}
