"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ticker } from "../lib/ticker";

export type ScrollSnapshot = {
  scrollY: number;
  limit: number;
  progress: number;
  velocity: number;
};

type ScrollListener = (snap: ScrollSnapshot) => void;

type MotionContextValue = {
  reducedMotion: boolean;
  scrollTo: (target: string | number | HTMLElement, options?: { offset?: number; immediate?: boolean }) => void;
  subscribeScroll: (listener: ScrollListener) => () => void;
  getScrollSnapshot: () => ScrollSnapshot;
};

const defaultSnap: ScrollSnapshot = { scrollY: 0, limit: 1, progress: 0, velocity: 0 };

const MotionContext = createContext<MotionContextValue>({
  reducedMotion: false,
  scrollTo: () => {},
  subscribeScroll: () => () => {},
  getScrollSnapshot: () => defaultSnap,
});

export function useMotionSystem() {
  return useContext(MotionContext);
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [curtainPhase, setCurtainPhase] = useState<"idle" | "enter" | "exit">("idle");
  const lenisRef = useRef<Lenis | null>(null);
  const listenersRef = useRef<Set<ScrollListener>>(new Set());
  const snapRef = useRef<ScrollSnapshot>(defaultSnap);
  const prevPathRef = useRef<string | null>(null);

  // Watch prefers-reduced-motion live
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Single Lenis instance driven by the single shared RAF ticker
  useEffect(() => {
    const notify = (snap: ScrollSnapshot) => {
      snapRef.current = snap;
      listenersRef.current.forEach((fn) => fn(snap));
    };

    if (reducedMotion) {
      lenisRef.current?.destroy();
      lenisRef.current = null;

      let cachedLimit = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const onResize = () => {
        cachedLimit = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      };
      const onScroll = () => {
        const y = window.scrollY;
        notify({ scrollY: y, limit: cachedLimit, progress: Math.min(1, Math.max(0, y / cachedLimit)), velocity: 0 });
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize, { passive: true });
      onScroll();
      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
      };
    }

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 1,
      autoRaf: false,
    });
    lenisRef.current = lenis;

    lenis.on("scroll", (instance: Lenis) => {
      notify({
        scrollY: instance.scroll,
        limit: Math.max(1, instance.limit),
        progress: Number.isFinite(instance.progress) ? Math.min(1, Math.max(0, instance.progress)) : 0,
        velocity: instance.velocity,
      });
    });

    // Wire Lenis into the ONE shared RAF ticker
    const unsubscribe = ticker.subscribe((now) => {
      lenis.raf(now);
    });

    // Initial snapshot
    const initialLimit = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    notify({
      scrollY: window.scrollY,
      limit: initialLimit,
      progress: Math.min(1, Math.max(0, window.scrollY / initialLimit)),
      velocity: 0,
    });

    return () => {
      unsubscribe();
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reducedMotion]);

  // Real route transition curtain + clean scroll reset on pathname change
  useEffect(() => {
    if (prevPathRef.current === null) {
      prevPathRef.current = pathname;
      return;
    }
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;

    // Scroll cleanly to top on route navigation
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
      lenisRef.current.resize();
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    if (reducedMotion) return;

    setCurtainPhase("enter");
    const t1 = window.setTimeout(() => setCurtainPhase("exit"), 150);
    const t2 = window.setTimeout(() => setCurtainPhase("idle"), 560);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [pathname, reducedMotion]);

  const scrollTo = useCallback(
    (target: string | number | HTMLElement, options?: { offset?: number; immediate?: boolean }) => {
      if (lenisRef.current && !reducedMotion) {
        lenisRef.current.scrollTo(target, {
          offset: options?.offset ?? -72,
          immediate: options?.immediate ?? false,
          duration: 1.05,
          easing: (t) => 1 - Math.pow(1 - t, 4), // Quart-out inertia
        });
        return;
      }
      if (typeof target === "number") {
        window.scrollTo({ top: target, behavior: "auto" });
      } else {
        const el = typeof target === "string" ? document.querySelector(target) : target;
        el?.scrollIntoView({ behavior: "auto", block: "start" });
      }
    },
    [reducedMotion]
  );

  const subscribeScroll = useCallback((listener: ScrollListener) => {
    listenersRef.current.add(listener);
    listener(snapRef.current);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const getScrollSnapshot = useCallback(() => snapRef.current, []);

  const value = useMemo(
    () => ({ reducedMotion, scrollTo, subscribeScroll, getScrollSnapshot }),
    [reducedMotion, scrollTo, subscribeScroll, getScrollSnapshot]
  );

  return (
    <MotionContext.Provider value={value}>
      {children}
      <div
        aria-hidden="true"
        className="route-curtain"
        data-phase={curtainPhase}
      />
    </MotionContext.Provider>
  );
}
