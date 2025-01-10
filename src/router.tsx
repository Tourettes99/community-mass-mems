import { createBrowserRouter } from 'react-router-dom';
import TestUpload from './pages/TestUpload';

// Create router with basic configuration
const router = createBrowserRouter([
  {
    path: "/",
    element: <TestUpload />
  },
  {
    path: "/test-upload",
    element: <TestUpload />
  }
], {
  basename: '/',
  window: typeof window === 'undefined' ? undefined : window
});

export default router;
