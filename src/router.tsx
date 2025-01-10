import { createBrowserRouter } from 'react-router-dom';
import TestUpload from './pages/TestUpload';
import routerConfig from './routerConfig';

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

// Create router with global configuration
const router = createBrowserRouter(routes, routerConfig);

export default router;
