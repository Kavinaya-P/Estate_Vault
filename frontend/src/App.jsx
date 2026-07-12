import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute, { AdminProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login             from './pages/Login';
import Register          from './pages/Register';
import Vault             from './pages/Vault';
import Nominees          from './pages/Nominees';
import DeadmanSwitch     from './pages/DeadmanSwitch';
import ScheduledMessages from './pages/ScheduledMessages';
import AdminLogin        from './pages/AdminLogin';
import AdminPanel        from './pages/AdminPanel';
import NomineePortal     from './pages/NomineePortal';
import AcceptNomination  from './pages/AcceptNomination';

const Protected = ({ children }) => (
  <ProtectedRoute><Layout>{children}</Layout></ProtectedRoute>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/vault" replace />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/vault"    element={<Protected><Vault /></Protected>} />
          <Route path="/nominees" element={<Protected><Nominees /></Protected>} />
          <Route path="/deadman"  element={<Protected><DeadmanSwitch /></Protected>} />
          <Route path="/messages" element={<Protected><ScheduledMessages /></Protected>} />

          <Route path="/accept-nomination" element={<AcceptNomination />} />
          <Route path="/nominee-portal"    element={<NomineePortal />} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/panel" element={<AdminProtectedRoute><AdminPanel /></AdminProtectedRoute>} />
          <Route path="/admin"       element={<Navigate to="/admin/login" replace />} />

          <Route path="*" element={<Navigate to="/vault" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
