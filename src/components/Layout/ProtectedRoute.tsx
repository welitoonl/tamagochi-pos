import { ReactNode, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
}

const ProtectedRoute = ({ children, requiredRoles }: ProtectedRouteProps) => {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    if (requiredRoles && !requiredRoles.includes(user.role)) {
      // Redirect based on role
      switch (user.role) {
        case 'FUNCIONARIO':
          navigate('/pos');
          break;
        case 'GERENTE':
        case 'ADMIN':
          navigate('/dashboard');
          break;
        default:
          navigate('/login');
      }
      return;
    }
  }, [isAuthenticated, user, requiredRoles, navigate]);

  if (!isAuthenticated || !user) {
    return null;
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;