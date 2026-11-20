import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteFrame } from "../components/site-frame";

export default function NotFound() {
  return (
    <SiteFrame path="/404">
      <section className="py-20 sm:py-28">
        <div className="shell-wrap max-w-xl space-y-6">
          <p className="font-mono-num text-[14px] text-[var(--muted)]">404</p>
          <h1 className="type-h1 text-[var(--ink)]">That page is not here</h1>
          <p className="type-lead">
            Go back to Stage 0, open Week 1, or explore the ten open chords.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/" className="btn-primary">
              <span>Open Stage 0</span>
              <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
            </Link>
            <Link href="/chords/" className="btn-secondary">
              <span>Open 10 chords</span>
            </Link>
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
