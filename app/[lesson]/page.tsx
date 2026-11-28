import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonPlayer } from "../../components/lesson-player";
import { SiteFrame } from "../../components/site-frame";
import { course, lessonHref } from "../../lib/lessons";

const lessons = course.slice(2);

export function generateStaticParams() {
  return lessons.map(({ id }) => ({ lesson: id }));
}
export const dynamicParams = false;

type Props = { params: Promise<{ lesson: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lesson } = await params;
  return { title: lessons.find((item) => item.id === lesson)?.title ?? "Lesson" };
}

export default async function LessonPage({ params }: Props) {
  const { lesson } = await params;
  const current = lessons.find((item) => item.id === lesson);
  if (!current) notFound();
  return <SiteFrame path={lessonHref(current.id)}><LessonPlayer lesson={current} /></SiteFrame>;
}
