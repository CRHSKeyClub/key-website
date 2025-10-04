import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AnimationScreen() {
  const { hideAnimation } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      hideAnimation();
    }, 2000);
    return () => clearTimeout(timer);
  }, [hideAnimation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary">
      <div className="text-center">
        <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-accent mx-auto mb-4"></div>
        <p className="text-white text-xl">Loading...</p>
      </div>
    </div>
  );
}
