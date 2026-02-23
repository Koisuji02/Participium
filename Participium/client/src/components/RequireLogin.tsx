import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getToken, getRole } from '../services/auth';

interface RequireLoginProps {
  children: React.ReactElement;
}

const RequireLogin: React.FC<RequireLoginProps> = ({ children }) => {
  const [authState, setAuthState] = useState({ token: getToken(), role: getRole() });
  const location = useLocation();

  useEffect(() => {
    // Update auth state when authChange event is fired
    const handleAuthChange = () => {
      setAuthState({ token: getToken(), role: getRole() });
    };

    globalThis.addEventListener('authChange', handleAuthChange);
    return () => globalThis.removeEventListener('authChange', handleAuthChange);
  }, []);

  // Require that a token exists and user is NOT an officer
  if (!authState.token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect officers to their dashboard
  if (authState.role?.includes('municipal_public_relations_officer')) {
    return <Navigate to="/officer" replace />;
  }

  return children;
};

export default RequireLogin;
