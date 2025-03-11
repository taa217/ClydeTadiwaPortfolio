import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return <>{children}</>;
};

export default Layout; 