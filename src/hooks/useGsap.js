import { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';

export function useStaggerReveal(containerRef, selector, deps = []) {
  useEffect(() => {
    if (!containerRef.current) return;
    const els = containerRef.current.querySelectorAll(selector);
    if (els.length === 0) return;

    gsap.fromTo(els,
      { opacity: 0, y: 20, scale: 0.95 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.4,
        stagger: 0.06,
        ease: 'back.out(1.4)',
        clearProps: 'transform,opacity',
      }
    );
  }, deps);
}

export function usePopIn(ref, deps = []) {
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current,
      { opacity: 0, scale: 0.9, y: 10 },
      { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'back.out(2)' }
    );
  }, deps);
}

export function useCompletionBounce() {
  return useCallback((element) => {
    if (!element) return;
    gsap.fromTo(element,
      { scale: 1 },
      {
        scale: 1.05,
        duration: 0.15,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out',
      }
    );

    const check = element.querySelector('[class*="rounded-full"][class*="border"]');
    if (check) {
      gsap.fromTo(check,
        { scale: 0.5, rotation: -45 },
        { scale: 1, rotation: 0, duration: 0.4, ease: 'elastic.out(1.2, 0.4)' }
      );
    }
  }, []);
}

export function useSlideTransition(ref, activeKey) {
  const prevKey = useRef(activeKey);

  useEffect(() => {
    if (!ref.current || prevKey.current === activeKey) return;
    prevKey.current = activeKey;

    gsap.fromTo(ref.current,
      { opacity: 0, x: 20 },
      { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }
    );
  }, [activeKey, ref]);
}

export { gsap };
