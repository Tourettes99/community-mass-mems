import { useEffect } from 'react';
import { UNSAFE_useScrollRestoration } from 'react-router-dom';

export function useRouterConfig() {
  // Enable scroll restoration
  UNSAFE_useScrollRestoration();

  // Set up router configuration
  useEffect(() => {
    // Enable React 18's startTransition for navigation updates
    window.__reactRouterStartTransition = true;
    // Enable new relative splat path resolution
    window.__reactRouterRelativeSplatPath = true;
  }, []);
}
