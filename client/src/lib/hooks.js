import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async loader when `deps` change and tracks its state.
 * Stale responses (from a previous set of deps) are ignored.
 */
export function useFetch(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const loaderRef = useRef(loader);
  const requestId = useRef(0);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setState((previous) => ({ ...previous, loading: true, error: null }));

    try {
      const data = await loaderRef.current();
      if (id === requestId.current) setState({ data, error: null, loading: false });
    } catch (error) {
      if (id === requestId.current) setState((previous) => ({ ...previous, error, loading: false }));
    }
  }, []);

  useEffect(() => {
    reload();
    // Invalidate in-flight requests when the component unmounts.
    return () => {
      requestId.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const setData = useCallback((data) => setState((previous) => ({ ...previous, data })), []);

  return { ...state, reload, setData };
}

/** Adds `.is-visible` to every `.reveal` inside `rootRef` as it scrolls into view. */
export function useReveal(rootRef, deps = []) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const elements = root.querySelectorAll('.reveal:not(.is-visible)');
    if (!('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Returns a ref and whether that element has entered the viewport (once). */
export function useInView({ threshold = 0.3 } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || inView) return undefined;

    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [inView, threshold]);

  return [ref, inView];
}

/** Animates from 0 to `target` once `start` is true. */
export function useCountUp(target, { start = true, duration = 1400, decimals = 0 } = {}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return undefined;

    const end = Number(target) || 0;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(end);
      return undefined;
    }

    let frame;
    const startedAt = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      setValue(end * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, start, duration]);

  return decimals ? value.toFixed(decimals) : Math.round(value);
}

export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · SevaSetu` : 'SevaSetu — The bridge between need and kindness';
  }, [title]);
}

/** Subscribe to a window event for the lifetime of the component. */
export function useWindowEvent(name, handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const listener = (event) => handlerRef.current(event);
    window.addEventListener(name, listener);
    return () => window.removeEventListener(name, listener);
  }, [name]);
}

// Fired after a request is created so lists elsewhere can refresh.
export const REQUESTS_CHANGED_EVENT = 'sevasetu:requests-changed';
