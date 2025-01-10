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

// Create router with future flags enabled
const router = createBrowserRouter(routes, {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
});

export default router;
