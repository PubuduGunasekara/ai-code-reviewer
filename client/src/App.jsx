import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute  from './components/ProtectedRoute';
import Landing         from './pages/Landing';
import Dashboard       from './pages/Dashboard';
import Repositories    from './pages/Repositories';
import ReviewDetail    from './pages/ReviewDetail';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route — anyone can see */}
          <Route path="/" element={<Landing />} />

          {/* Protected routes — must be logged in */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/repositories" element={
            <ProtectedRoute><Repositories /></ProtectedRoute>
          } />
          <Route path="/reviews/:id" element={
            <ProtectedRoute><ReviewDetail /></ProtectedRoute>
          } />

          {/* Catch-all — redirect unknown URLs to home */}
          <Route path="*" element={<Landing />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}