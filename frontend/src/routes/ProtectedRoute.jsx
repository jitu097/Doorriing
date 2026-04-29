import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { SuspenseFallback } from '../components/common/SuspenseFallback';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  // Auth state has not been confirmed yet — do NOT redirect. Wait.
  if (loading) {
    return <SuspenseFallback />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
