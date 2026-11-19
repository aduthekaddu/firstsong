"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useMotionSystem } from "./motion-provider";

/**
 * Zero-React-re-render reveal hook:
 * Flips `data-revealed="true"` directly on the DOM node via mount RAF or IntersectionObserver,
 * triggering GPU-composited CSS transitions with ZERO React reconciliation during scroll.
 */
function useRevealRef(immediate = false, rootMargin = "0px 0px -4% 0px") {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (immediate || typeof IntersectionObserver === "undefined") {
      const id = window.requestAnimationFrame(() => {
        el.dataset.revealed = "true";
      });
      return () => window.cancelAnimationFrame(id);
    }

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset.revealed = "true";
          obs.disconnect();
        }
      },
      { rootMargin, threshold: 0.02 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [immediate, rootMargin]);

  return ref;
}

/**
 * Masked baseline text reveal (pure GPU transform + opacity, custom --i stagger).
 * Supports immediate orchestrated hero load or IntersectionObserver scroll entry.
 */
export function SplitReveal({
  lines,
  as: Tag = "div",
  className = "",
  delayMs = 0,
  immediate = false,
}: {
  lines: readonly ReactNode[];
  as?: "h1" | "h2" | "h3" | "div" | "p";
  className?: string;
  delayMs?: number;
  immediate?: boolean;
}) {
  const ref = useRevealRef(immediate);

  return (
    <div ref={ref} data-revealed="false">
      <Tag className={className}>
        {lines.map((line, i) => (
          <span key={i} className="split-mask">
            <span
              className="split-line"
              style={{ "--i": i, "--delay": `${delayMs}ms` } as CSSProperties}
            >
              {line}
            </span>
          </span>
        ))}
      </Tag>
    </div>
  );
}

/** Horizontal engraved stave hairline that draws cleanly left-to-right on enter */
export function StaveRule({
  className = "",
  delayMs = 0,
  immediate = false,
}: {
  className?: string;
  delayMs?: number;
  immediate?: boolean;
}) {
  const ref = useRevealRef(immediate, "0px 0px -2% 0px");

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-revealed="false"
      style={{ "--delay": `${delayMs}ms` } as CSSProperties}
      className={`stave-rule ${className}`}
    />
  );
}

/** Score plate reveal with purposeful stagger index */
export function RevealPlate({
  children,
  className = "",
  index = 0,
  delayMs = 0,
  immediate = false,
}: {
  children: ReactNode;
  className?: string;
  index?: number;
  delayMs?: number;
  immediate?: boolean;
}) {
  const ref = useRevealRef(immediate);

  return (
    <div
      ref={ref}
      data-revealed="false"
      style={{ "--i": Math.min(index, 7), "--delay": `${delayMs}ms` } as CSSProperties}
      className={`reveal-plate ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Scroll-linked GPU parallax offset driven by the single Lenis scroll bus.
 * Zero layout reads during scroll: caches vertical anchor on mount/resize and pauses offscreen.
 */
export function ParallaxLayer({
  children,
  speed = -28,
  className = "",
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const inViewRef = useRef(false);
  const anchorRef = useRef({ top: 0, height: 1, vh: 900 });
  const { reducedMotion, subscribeScroll } = useMotionSystem();

  useEffect(() => {
    const el = elRef.current;
    if (!el || reducedMotion) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      anchorRef.current = {
        top: rect.top + window.scrollY,
        height: Math.max(1, rect.height),
        vh: window.innerHeight || 900,
      };
    };
    measure();

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        inViewRef.current = visible;
        el.style.willChange = visible ? "transform" : "auto";
      },
      { rootMargin: "120px 0px 120px 0px" }
    );
    obs.observe(el);
    window.addEventListener("resize", measure, { passive: true });

    const unsub = subscribeScroll(({ scrollY }) => {
      if (!inViewRef.current) return;
      const { top, height, vh } = anchorRef.current;
      const center = top + height * 0.5 - scrollY;
      const norm = Math.max(-1, Math.min(1, (center - vh * 0.5) / (vh * 0.75)));
      const y = (norm * speed).toFixed(2);
      el.style.transform = `translate3d(0, ${y}px, 0)`;
    });

    return () => {
      unsub();
      obs.disconnect();
      window.removeEventListener("resize", measure);
      el.style.willChange = "auto";
      el.style.transform = "";
    };
  }, [reducedMotion, speed, subscribeScroll]);

  return (
    <div ref={elRef} className={className}>
      {children}
    </div>
  );
}

/**
 * Tactile subtle magnetic hover pull on desktop fine pointers.
 * Pure GPU transform, zero React re-renders, disabled on touch & reduced motion.
 */
export function Magnetic({
  children,
  strength = 7,
  className = "inline-block",
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { reducedMotion } = useMotionSystem();

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let rect: DOMRect | null = null;
    const onEnter = () => {
      rect = el.getBoundingClientRect();
      el.style.willChange = "transform";
      el.style.transition = "transform 180ms cubic-bezier(0.32, 0.72, 0, 1)";
    };
    const onMove = (e: MouseEvent) => {
      if (!rect) return;
      const dx = ((e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)) * strength;
      const dy = ((e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)) * strength;
      el.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
    };
    const onLeave = () => {
      rect = null;
      el.style.transition = "transform 420ms cubic-bezier(0.34, 1.42, 0.64, 1)";
      el.style.transform = "translate3d(0, 0, 0)";
      window.setTimeout(() => {
        if (el) el.style.willChange = "auto";
      }, 440);
    };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [reducedMotion, strength]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
