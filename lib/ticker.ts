/**
 * Single shared RAF ticker for the entire application.
 * Drives Lenis smooth scroll + all active visual physics (standing-wave strings,
 * chord finger morphing, live audio meters) in ONE loop with zero idle cost.
 */

export type TickerCallback = (now: number, dtSeconds: number) => void;

class SharedTicker {
  private callbacks = new Set<TickerCallback>();
  private rafId = 0;
  private lastTime = 0;
  private paused = false;

  constructor() {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          this.paused = true;
          this.stop();
        } else {
          this.paused = false;
          if (this.callbacks.size > 0) this.start();
        }
      });
    }
  }

  subscribe(cb: TickerCallback): () => void {
    this.callbacks.add(cb);
    if (!this.paused && !this.rafId) {
      this.start();
    }
    return () => {
      this.callbacks.delete(cb);
      if (this.callbacks.size === 0) {
        this.stop();
      }
    };
  }

  private start() {
    if (typeof window === "undefined" || this.rafId) return;
    this.lastTime = performance.now();
    const loop = (now: number) => {
      if (this.paused || this.callbacks.size === 0) {
        this.rafId = 0;
        return;
      }
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;
      this.callbacks.forEach((cb) => cb(now, dt));
      if (this.callbacks.size > 0 && !this.paused) {
        this.rafId = window.requestAnimationFrame(loop);
      } else {
        this.rafId = 0;
      }
    };
    this.rafId = window.requestAnimationFrame(loop);
  }

  private stop() {
    if (this.rafId && typeof window !== "undefined") {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }
}

export const ticker = new SharedTicker();
