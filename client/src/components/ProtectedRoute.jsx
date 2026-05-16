import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

// Wraps any route that requires login
// If not logged in → redirect to home
// If still checking auth → show spinner
// If logged in → show the page

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner message="Checking authentication..." />;
  if (!user)   return <Navigate to="/" replace />;

  return children;
}