import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Kiosk from './pages/Kiosk';
import Display from './pages/Display';
import AdminDashboard from './pages/Admin/AdminDashboard'; 
import Registrar from './pages/Registrar';
import Accounting from './pages/Accounting';
import Login from './pages/Login';

// Higher-Order Component to protect routes
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const session = JSON.parse(localStorage.getItem('queue_user'));
  
  if (!session) return <Navigate to="/login" replace />;
  if (requireAdmin && session.role !== 'ADMIN') return <Navigate to="/registrar" replace />;
  
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Kiosk />} />
        <Route path="/display" element={<Display />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected Staff Routes */}
        <Route path="/registrar" element={
          <ProtectedRoute><Registrar /></ProtectedRoute>
        } />
        <Route path="/accounting" element={
          <ProtectedRoute><Accounting /></ProtectedRoute>
        } />
        
        {/* Protected Admin Route */}
        <Route path="/admin" element={
          <ProtectedRoute requireAdmin={true}><AdminDashboard /></ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}