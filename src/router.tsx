import { createBrowserRouter } from 'react-router-dom';
import TestUpload from './pages/TestUpload';

// Define routes
const routes = [
  {
    path: "/",
    element: <TestUpload />
  },
  {
    path: "/test-upload",
    element: <TestUpload />
  }
];

// Create router with v7 features
const router = createBrowserRouter(routes, {
  // Enable v7 features
  future: {
    // Use React 18's startTransition for navigation updates
    startTransition: true,
    // Use new relative splat path resolution
    relativeSplatPath: true
  }
});

export default router;
