import { LessonPlayer } from "../components/lesson-player";
import { SiteFrame } from "../components/site-frame";
import { stageZero } from "../lib/lessons";

export default function HomePage() {
  return <SiteFrame path="/"><LessonPlayer lesson={stageZero} home /></SiteFrame>;
}
