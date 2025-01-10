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
    // Basic router configuration
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }
  }
);

export default router;
