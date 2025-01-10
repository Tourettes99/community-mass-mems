import { createBrowserRouter } from 'react-router-dom';
import TestUpload from './pages/TestUpload';

// Configure future flags globally
const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <TestUpload />,
    },
    {
      path: "/test-upload",
      element: <TestUpload />,
    }
  ],
  {
    // Enable v7 behavior
    future: {
      // Use React 18's startTransition for navigation updates
      startTransition: true,
      // Use new relative splat path resolution
      relativeSplatPath: true,
    },
  }
);

export default router;
