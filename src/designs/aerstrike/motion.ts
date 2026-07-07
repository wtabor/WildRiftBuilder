"use client";

/* Presentation-only motion helpers for the AerStrike design. Restrained by
   design: everything here degrades to "instant / visible" under
   prefers-reduced-motion, and nothing reads window during render (hydration-safe
   — hooks return their SSR default until mounted). */

import { useEffect, useRef, useState } from "react";

/** True when the user asked for reduced motion. SSR-safe: false until mount. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Tween a number toward `value` with an ease-out over `duration` ms. Animates
   from the currently-displayed value, so consecutive changes chain smoothly.
   Snaps instantly under reduced motion. */
export function useAnimatedNumber(value: number, duration = 550): number {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);

  useEffect(() => {
    if (reduced || !Number.isFinite(value)) {
      displayRef.current = value;
      setDisplay(value);
      return;
    }
    const from = displayRef.current;
    if (Math.abs(from - value) < 1e-6) return;

    let raf = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / duration);
      const current = from + (value - from) * easeOutCubic(t);
      displayRef.current = current;
      setDisplay(current);
      if (t < 1) raf = requestAnimationFrame(tick);
      else displayRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduced]);

  return reduced ? value : display;
}

/** True for a short window after `value` increases — drives a one-shot flash.
   Never fires under reduced motion. */
export function useIncreaseFlash(value: number, ms = 650): boolean {
  const reduced = usePrefersReducedMotion();
  const [flash, setFlash] = useState(false);
  const prev = useRef(value);

  useEffect(() => {
    if (!reduced && Number.isFinite(value) && value > prev.current + 1e-6) {
      setFlash(true);
      const id = setTimeout(() => setFlash(false), ms);
      prev.current = value;
      return () => clearTimeout(id);
    }
    prev.current = value;
  }, [value, ms, reduced]);

  return flash;
}

/** Fires once when the element scrolls into view. Returns [ref, shown]. Under
   reduced motion it reports shown immediately (no observer). */
export function useInView<T extends HTMLElement = HTMLDivElement>(): [
  React.RefObject<T | null>,
  boolean,
] {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (reduced) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  return [ref, shown];
}
