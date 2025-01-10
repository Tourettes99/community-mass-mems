import { UNSAFE_NavigationContext } from 'react-router-dom';

// Configure global router settings
UNSAFE_NavigationContext.displayName = 'NavigationContext';

// Configure future flags
const routerConfig = {
  future: {
    startTransition: true,
    relativeSplatPath: true
  }
};

export default routerConfig;
