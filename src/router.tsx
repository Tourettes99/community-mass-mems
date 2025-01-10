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
    // Enable v7 behavior and additional features
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true
    },
    // Enable scroll restoration
    basename: '/',
    window: typeof window === 'undefined' ? undefined : window
  }
);

export default router;
