'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type LayoutProfile =
  | 'compact'        // < 320px
  | 'mobile'         // 320px - 599px
  | 'compact-tablet' // 600px - 767px
  | 'tablet'         // 768px - 1023px
  | 'desktop'        // 1024px - 1599px
  | 'large-desktop'; // >= 1600px

export type Orientation = 'portrait' | 'landscape';

export interface ResponsiveState {
  width: number;
  height: number;
  containerWidth: number;
  containerHeight: number;
  orientation: Orientation;
  profile: LayoutProfile;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  prefersReducedMotion: boolean;
  devicePixelRatio: number;
  isMounted: boolean;
}

const getProfile = (width: number): LayoutProfile => {
  if (width < 320) return 'compact';
  if (width < 600) return 'mobile';
  if (width < 768) return 'compact-tablet';
  if (width < 1024) return 'tablet';
  if (width < 1600) return 'desktop';
  return 'large-desktop';
};

export function useResponsiveViewport(): ResponsiveState & {
  observeContainer: (node: HTMLElement | null) => void;
} {
  const [state, setState] = useState<ResponsiveState>({
    width: 1280,
    height: 720,
    containerWidth: 1280,
    containerHeight: 720,
    orientation: 'landscape',
    profile: 'desktop',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouch: false,
    prefersReducedMotion: false,
    devicePixelRatio: 1,
    isMounted: false,
  });

  const containerRef = useRef<HTMLElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const updateDimensions = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const orientation: Orientation = w >= h ? 'landscape' : 'portrait';
      const profile = getProfile(w);
      const isMobile = w < 600;
      const isTablet = w >= 600 && w < 1024;
      const isDesktop = w >= 1024;
      const isTouch =
        'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      let cW = w;
      let cH = h;
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        cW = Math.round(rect.width);
        cH = Math.round(rect.height);
      }

      setState((prev) => {
        if (
          prev.width === w &&
          prev.height === h &&
          prev.containerWidth === cW &&
          prev.containerHeight === cH &&
          prev.orientation === orientation &&
          prev.profile === profile &&
          prev.isMounted === true
        ) {
          return prev;
        }

        return {
          width: w,
          height: h,
          containerWidth: cW,
          containerHeight: cH,
          orientation,
          profile,
          isMobile,
          isTablet,
          isDesktop,
          isTouch,
          prefersReducedMotion,
          devicePixelRatio: dpr,
          isMounted: true,
        };
      });
    });
  }, []);

  const observeContainer = useCallback((node: HTMLElement | null) => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    containerRef.current = node;

    if (node && typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        updateDimensions();
      });
      observer.observe(node);
      resizeObserverRef.current = observer;
    }

    updateDimensions();
  }, [updateDimensions]);

  useEffect(() => {
    updateDimensions();

    window.addEventListener('resize', updateDimensions, { passive: true });
    window.addEventListener('orientationchange', updateDimensions, { passive: true });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateDimensions, { passive: true });
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateDimensions);
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [updateDimensions]);

  return {
    ...state,
    observeContainer,
  };
}

export default useResponsiveViewport;
