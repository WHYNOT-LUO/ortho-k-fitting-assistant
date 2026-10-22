import { useEffect, useState } from 'react';

/**
 * Tiny hash router: URLs look like #/cases/OK-2026-0001.
 * Hash URLs work on GitHub Pages without any server setup.
 */

type Guard = () => boolean;
let guard: Guard | null = null;
let lastHash = window.location.hash;

/** A page with unsaved changes can block navigation (return false to stay). */
export function setNavigationGuard(next: Guard | null) {
  guard = next;
}

function readPath(): string[] {
  return window.location.hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent);
}

export function useHashPath(): string[] {
  const [parts, setParts] = useState<string[]>(readPath);
  useEffect(() => {
    const onChange = () => {
      if (window.location.hash === lastHash) return;
      if (guard && !guard()) {
        // Stay on the current page: put the old address back without a new history entry.
        history.replaceState(null, '', lastHash || '#/');
        return;
      }
      lastHash = window.location.hash;
      setParts(readPath());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return parts;
}

export function navigate(path: string) {
  window.location.hash = path.startsWith('/') ? path : `/${path}`;
}

export function href(path: string): string {
  return `#${path.startsWith('/') ? path : `/${path}`}`;
}
